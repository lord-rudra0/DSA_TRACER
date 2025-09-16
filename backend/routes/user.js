import express from 'express';
import axios from 'axios';
import User from '../models/User.js';
import Problem from '../models/Problem.js';
import Submission from '../models/Submission.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();
// Helper to compute friendship status relative to current user
function getFriendshipStatus(currentUser, targetUserId) {
  const rel = currentUser.friends.find(f => f.user.toString() === targetUserId.toString());
  if (!rel) return 'none';
  if (rel.status === 'accepted') return 'accepted';
  // Pending request exists, need to know direction
  // If current user has a pending entry for target, we mark as outgoing
  return 'pending';
}

// Sync user data with LeetCode
router.post('/sync-leetcode', auth, async (req, res) => {
  try {
    const { leetcodeUsername } = req.body;
    
    if (!leetcodeUsername) {
      return res.status(400).json({ message: 'LeetCode username is required' });
    }

    // Fetch user data from LeetCode API
    const userDataResponse = await axios.get(`${process.env.LEETCODE_API_BASE}/${leetcodeUsername}`);
    const userData = userDataResponse.data;

    if (!userData || userData.errors) {
      return res.status(404).json({ message: 'LeetCode user not found' });
    }

    // Update user profile
    const user = await User.findById(req.user._id);
    user.leetcodeUsername = leetcodeUsername;
    user.totalProblems = userData.totalSolved || 0;
    user.easySolved = userData.easySolved || 0;
    user.mediumSolved = userData.mediumSolved || 0;
    user.hardSolved = userData.hardSolved || 0;
    user.contestRating = userData.contestRating || 0;
    user.lastLeetCodeSync = new Date();
    
    // Update LeetCode specific data
    user.leetCodeData = {
      ranking: userData.ranking,
      acceptanceRate: userData.acceptanceRate,
      contributionPoints: userData.contributionPoints
    };

    // Calculate XP based on problems solved
    const newXP = Number((userData.easySolved * 10) + 
                  (userData.mediumSolved * 20) + 
                  (userData.hardSolved * 30));
    
    const prevXP = Number.isFinite(user.xp) ? Number(user.xp) : 0;
    const safeNewXP = Number.isFinite(newXP) ? newXP : 0;
    user.xp = Math.max(prevXP, safeNewXP); // Don't decrease XP
    
    // Check for level up
    const leveledUp = user.checkLevelUp();
    
    await user.save();

    // Sync recent and accepted submissions
    try {
      // Fetch both feeds
      const [submissionsResponse, acSubmissionsResponse] = await Promise.all([
        axios.get(`${process.env.LEETCODE_API_BASE}/${leetcodeUsername}/submission?limit=200`),
        axios.get(`${process.env.LEETCODE_API_BASE}/${leetcodeUsername}/acSubmission?limit=200`)
      ]);
      const recentRaw = Array.isArray(submissionsResponse.data?.submission)
        ? submissionsResponse.data.submission
        : (Array.isArray(submissionsResponse.data?.recentSubmissions)
          ? submissionsResponse.data.recentSubmissions
          : []);
      const acRaw = Array.isArray(acSubmissionsResponse.data?.acSubmission)
        ? acSubmissionsResponse.data.acSubmission
        : (Array.isArray(acSubmissionsResponse.data?.submission)
          ? acSubmissionsResponse.data.submission
          : []);

      // Normalize; tag AC feed to default status
      const normalize = (s, isAC) => {
        const id = s.id || s.submissionId || s.submission_id || null;
        const titleSlug = s.titleSlug || s.title_slug || '';
        const title = s.title || s.titleName || s.questionTitle || '';
        const statusRaw = s.statusDisplay || s.status || '';
        const status = statusRaw || (isAC ? 'Accepted' : '');
        const language = (s.lang || s.language || 'Unknown') || 'Unknown';
        const timestampNum = Number(s.timestamp || s.time || s.submitTime || 0);
        const runtime = s.runtime ?? s.runTime ?? null;
        const memory = s.memory ?? null;
        const key = id || (titleSlug && timestampNum ? `${titleSlug}-${timestampNum}` : null);
        return { id, key, titleSlug, title, status, language, timestamp: timestampNum, runtime, memory };
      };
      const normalized = [
        ...recentRaw.map(s => normalize(s, false)),
        ...acRaw.map(s => normalize(s, true))
      ].filter(n => n.titleSlug && n.timestamp);
      // Dedupe by key
      const byKey = new Map();
      for (const n of normalized) {
        const k = n.key || `${n.titleSlug}-${n.timestamp}`;
        if (!byKey.has(k)) byKey.set(k, n);
      }
      const mergedSubmissions = Array.from(byKey.values());

      for (const submission of mergedSubmissions.slice(0, 200)) { // Last 200 combined
        // Check if submission already exists
        const existingSubmission = await Submission.findOne({
          user: user._id,
          leetcodeSubmissionId: submission.id || `${submission.titleSlug}-${submission.timestamp}`
        });
        
        if (!existingSubmission) {
          // Find or create problem
          let problem = await Problem.findOne({ titleSlug: submission.titleSlug });
          
          if (!problem) {
            try {
              let difficulty = 'Easy';
              let tags = [];
              const problemResp = await axios.get(`${process.env.LEETCODE_API_BASE}/select?titleSlug=${submission.titleSlug}`);
              const p = problemResp.data || {};
              if (p.difficulty && ['Easy','Medium','Hard'].includes(p.difficulty)) {
                difficulty = p.difficulty;
              }
              if (Array.isArray(p.topicTags)) {
                tags = p.topicTags.map(t => t.name || t);
              }
              problem = new Problem({
                titleSlug: submission.titleSlug,
                title: submission.title,
                difficulty,
                tags
              });
              await problem.save();
            } catch (probSaveErr) {
              console.error('Problem save error:', probSaveErr?.message || probSaveErr);
              // As a fallback, try to load again in case of race condition
              problem = await Problem.findOne({ titleSlug: submission.titleSlug });
              if (!problem) throw probSaveErr;
            }
          } else {
            // Enrich existing problem if possible (non-blocking)
            try {
              const problemResp = await axios.get(`${process.env.LEETCODE_API_BASE}/select?titleSlug=${submission.titleSlug}`);
              const p = problemResp.data || {};
              let changed = false;
              if (p.difficulty && ['Easy','Medium','Hard'].includes(p.difficulty) && problem.difficulty !== p.difficulty) {
                problem.difficulty = p.difficulty; changed = true;
              }
              if (Array.isArray(p.topicTags)) {
                const newTags = p.topicTags.map(t => t.name || t);
                if (JSON.stringify(newTags) !== JSON.stringify(problem.tags)) { problem.tags = newTags; changed = true; }
              }
              if (changed) await problem.save();
            } catch (_) { /* ignore enrichment failures */ }
          }

          // Create submission record with validation-safe defaults
          try {
            const newSubmission = new Submission({
              user: user._id,
              problem: problem._id,
              problemTitle: submission.title,
              problemDifficulty: problem.difficulty,
              language: submission.language || 'Unknown',
              status: submission.status || 'Accepted',
              runtime: submission.runtime,
              memory: submission.memory,
              leetcodeSubmissionId: submission.id || `${submission.titleSlug}-${submission.timestamp}`,
              timestamp: submission.timestamp,
              firstAccepted: (submission.status || 'Accepted') === 'Accepted'
            });
            await newSubmission.save();
          } catch (saveErr) {
            console.error('Submission save error:', saveErr?.message || saveErr);
          }
        }
      }
      // After syncing submissions, check if there is at least one accepted submission for today
      try {
        const isSameLocalDay = (a, b) => (
          a.getFullYear() === b.getFullYear() &&
          a.getMonth() === b.getMonth() &&
          a.getDate() === b.getDate()
        );
        const now = new Date();
        const hasAcceptedTodayFromAPI = mergedSubmissions.some(s => {
          if ((s.status || s.statusDisplay) !== 'Accepted') return false;
          const ts = Number(s.timestamp || s.time);
          if (!Number.isFinite(ts)) return false;
          const ms = ts > 1e12 ? ts : ts * 1000; // handle sec vs ms epochs
          const d = new Date(ms);
          return isSameLocalDay(d, now);
        });
        // DB fallback: check saved submissions for today
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const endOfToday = new Date(startOfToday);
        endOfToday.setDate(endOfToday.getDate() + 1);
        const hasAcceptedTodayFromDB = await Submission.exists({
          user: user._id,
          status: 'Accepted',
          createdAt: { $gte: startOfToday, $lt: endOfToday }
        });
        if (hasAcceptedTodayFromAPI || hasAcceptedTodayFromDB) {
          user.updateStreak();
          await user.save();
        }
      } catch (_) {
        // ignore streak update errors to avoid blocking sync
      }
    } catch (submissionError) {
      console.error('Error syncing submissions:', submissionError);
      // Continue even if submissions sync fails
    }

    // If profile counters look zero, recompute from our submissions as a fallback
    try {
      const needRecount = (user.totalProblems ?? 0) === 0 && (user.easySolved ?? 0) === 0 && (user.mediumSolved ?? 0) === 0 && (user.hardSolved ?? 0) === 0;
      if (needRecount) {
        const matchStage = { $match: { user: user._id, status: 'Accepted' } };
        const agg = await Submission.aggregate([
          matchStage,
          { $group: { _id: '$problemDifficulty', count: { $sum: 1 } } }
        ]);
        const totalAgg = await Submission.aggregate([
          matchStage,
          { $count: 'total' }
        ]);
        const map = Object.fromEntries(agg.map(a => [a._id || 'Unknown', a.count]));
        const easyC = map.Easy || 0;
        const medC = map.Medium || 0;
        const hardC = map.Hard || 0;
        const totalAccepted = (totalAgg[0]?.total) || 0;
        user.easySolved = easyC;
        user.mediumSolved = medC;
        user.hardSolved = hardC;
        // If difficulties unknown, ensure totalProblems reflects accepted count at least
        const sumKnown = easyC + medC + hardC;
        user.totalProblems = sumKnown > 0 ? sumKnown : totalAccepted;
        const prevXP2 = Number.isFinite(user.xp) ? Number(user.xp) : 0;
        const newXP2 = Number((user.easySolved * 10) + (user.mediumSolved * 20) + (user.hardSolved * 30));
        user.xp = Math.max(prevXP2, Number.isFinite(newXP2) ? newXP2 : 0);
        user.checkLevelUp();
        await user.save();
      }
    } catch (recountErr) {
      console.error('Error recomputing totals from submissions:', recountErr);
    }

    res.json({
      message: 'LeetCode data synced successfully',
      user: {
        ...user.toObject(),
        xpGained: user.xp - prevXP,
        leveledUp
      }
    });
  } catch (error) {
    console.error('Sync LeetCode error:', error);
    if (error.response?.status === 404) {
      res.status(404).json({ message: 'LeetCode user not found' });
    } else {
      res.status(500).json({ message: 'Server error syncing LeetCode data' });
    }
  }
});

// Set LeetCode username and immediately sync profile + recent submissions
router.put('/leetcode-username', auth, async (req, res) => {
  try {
    const { leetcodeUsername } = req.body;
    if (!leetcodeUsername) {
      return res.status(400).json({ message: 'LeetCode username is required' });
    }

    const user = await User.findById(req.user._id);
    user.leetcodeUsername = leetcodeUsername;
    await user.save();

    // Reuse sync logic: fetch profile
    const userDataResponse = await axios.get(`${process.env.LEETCODE_API_BASE}/${leetcodeUsername}`);
    const userData = userDataResponse.data;

    if (!userData || userData.errors) {
      return res.status(404).json({ message: 'LeetCode user not found' });
    }

    user.totalProblems = userData.totalSolved || 0;
    user.easySolved = userData.easySolved || 0;
    user.mediumSolved = userData.mediumSolved || 0;
    user.hardSolved = userData.hardSolved || 0;
    user.contestRating = userData.contestRating || 0;
    user.lastLeetCodeSync = new Date();
    user.leetCodeData = {
      ranking: userData.ranking,
      acceptanceRate: userData.acceptanceRate,
      contributionPoints: userData.contributionPoints
    };

    const oldXP = Number.isFinite(user.xp) ? Number(user.xp) : 0;

// Sync recent and accepted submissions (up to 200)
try {
const [submissionsResponse, acSubmissionsResponse] = await Promise.all([
axios.get(`${process.env.LEETCODE_API_BASE}/${leetcodeUsername}/submission?limit=200`),
axios.get(`${process.env.LEETCODE_API_BASE}/${leetcodeUsername}/acSubmission?limit=200`)
]);
const recentRaw = Array.isArray(submissionsResponse.data?.submission)
? submissionsResponse.data.submission
: (Array.isArray(submissionsResponse.data?.recentSubmissions)
? submissionsResponse.data.recentSubmissions
: []);
const acRaw = Array.isArray(acSubmissionsResponse.data?.acSubmission)
? acSubmissionsResponse.data.acSubmission
: (Array.isArray(acSubmissionsResponse.data?.submission)
? acSubmissionsResponse.data.submission
: []);
const normalize = (s) => {
const id = s.id || s.submissionId || s.submission_id || null;
const titleSlug = s.titleSlug || s.title_slug || '';
const title = s.title || s.titleName || s.questionTitle || '';
const status = s.statusDisplay || s.status || '';
const language = s.lang || s.language || '';
const timestampNum = Number(s.timestamp || s.time || s.submitTime || 0);
const runtime = s.runtime ?? s.runTime ?? null;
const memory = s.memory ?? null;
const key = id || (titleSlug && timestampNum ? `${titleSlug}-${timestampNum}` : null);
return { id, key, titleSlug, title, status, language, timestamp: timestampNum, runtime, memory };
};
const normalized = [...recentRaw, ...acRaw].map(normalize).filter(n => n.titleSlug && n.timestamp);
const byKey = new Map();
for (const n of normalized) {
const k = n.key || `${n.titleSlug}-${n.timestamp}`;
if (!byKey.has(k)) byKey.set(k, n);
}
const mergedSubmissions = Array.from(byKey.values());
for (const submission of mergedSubmissions.slice(0, 200)) {
const existingSubmission = await Submission.findOne({
user: user._id,
leetcodeSubmissionId: submission.id || `${submission.titleSlug}-${submission.timestamp}`
});
if (!existingSubmission) {
let problem = await Problem.findOne({ titleSlug: submission.titleSlug });
if (!problem) {
problem = new Problem({
titleSlug: submission.titleSlug,
title: submission.title,
difficulty: 'Unknown',
tags: []
});
await problem.save();
}
// Enrich problem difficulty/tags
try {
const problemResp = await axios.get(`${process.env.LEETCODE_API_BASE}/select?titleSlug=${submission.titleSlug}`);
const p = problemResp.data || {};
if (p.difficulty && ['Easy','Medium','Hard'].includes(p.difficulty)) {
problem.difficulty = p.difficulty;
}
if (Array.isArray(p.topicTags)) {
problem.tags = p.topicTags.map(t => t.name || t);
}
await problem.save();
} catch (_) {}
const newSubmission = new Submission({
user: user._id,
problem: problem._id,
problemTitle: submission.title,
problemDifficulty: problem.difficulty,
language: submission.language,
status: submission.status,
runtime: submission.runtime,
memory: submission.memory,
leetcodeSubmissionId: submission.id || `${submission.titleSlug}-${submission.timestamp}`,
timestamp: submission.timestamp,
firstAccepted: submission.status === 'Accepted'
});
await newSubmission.save();
}
}
// After syncing submissions, check if there is at least one accepted submission for today
try {
const isSameLocalDay = (a, b) => (
a.getFullYear() === b.getFullYear() &&
a.getMonth() === b.getMonth() &&
a.getDate() === b.getDate()
);
const now = new Date();
const hasAcceptedTodayFromAPI = mergedSubmissions.some(s => {
if ((s.status || s.statusDisplay) !== 'Accepted') return false;
const ts = Number(s.timestamp || s.time);
if (!Number.isFinite(ts)) return false;
const ms = ts > 1e12 ? ts : ts * 1000; // handle sec vs ms epochs
const d = new Date(ms);
return isSameLocalDay(d, now);
});
// DB fallback: check saved submissions for today
const startOfToday = new Date();
startOfToday.setHours(0, 0, 0, 0);
const endOfToday = new Date(startOfToday);
endOfToday.setDate(endOfToday.getDate() + 1);
const hasAcceptedTodayFromDB = await Submission.exists({
user: user._id,
status: 'Accepted',
createdAt: { $gte: startOfToday, $lt: endOfToday }
});
if (hasAcceptedTodayFromAPI || hasAcceptedTodayFromDB) {
user.updateStreak();
await user.save();
}
} catch (_) {}
} catch (submissionError) {
console.error('Error syncing submissions (set username):', submissionError.message || submissionError);
}

    // Fallback recompute totals if zeros
    try {
      const needRecount = (user.totalProblems ?? 0) === 0 && (user.easySolved ?? 0) === 0 && (user.mediumSolved ?? 0) === 0 && (user.hardSolved ?? 0) === 0;
      if (needRecount) {
        const agg = await Submission.aggregate([
          { $match: { user: user._id, status: 'Accepted' } },
          { $group: { _id: '$problemDifficulty', count: { $sum: 1 } } }
        ]);
        const map = Object.fromEntries(agg.map(a => [a._id || 'Unknown', a.count]));
        user.easySolved = map.Easy || 0;
        user.mediumSolved = map.Medium || 0;
        user.hardSolved = map.Hard || 0;
        user.totalProblems = user.easySolved + user.mediumSolved + user.hardSolved;
        const prevXP2 = Number.isFinite(user.xp) ? Number(user.xp) : 0;
        const newXP2 = Number((user.easySolved * 10) + (user.mediumSolved * 20) + (user.hardSolved * 30));
        user.xp = Math.max(prevXP2, Number.isFinite(newXP2) ? newXP2 : 0);
        user.checkLevelUp();
        await user.save();
      }
    } catch (recountErr) {
      console.error('Error recomputing totals from submissions:', recountErr);
    }

    res.json({
      message: 'LeetCode username saved and data synced',
      user: {
        ...user.toObject(),
        xpGained: user.xp - oldXP,
        leveledUp
      }
    });
  } catch (error) {
    console.error('Set LeetCode username error:', error);
    res.status(500).json({ message: 'Server error saving LeetCode username' });
  }
});

// Get user dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');

    // Fallback: ensure streak reflects today's accepted submissions from DB
    try {
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const endOfToday = new Date(startOfToday);
      endOfToday.setDate(endOfToday.getDate() + 1);
      const hasAcceptedTodayFromDB = await Submission.exists({
        user: user._id,
        status: 'Accepted',
        createdAt: { $gte: startOfToday, $lt: endOfToday }
      });
      const lastSolved = user.lastSolvedDate ? new Date(user.lastSolvedDate) : null;
      const needsUpdate = hasAcceptedTodayFromDB && (
        !lastSolved ||
        lastSolved.setHours(0,0,0,0) !== startOfToday.getTime() ||
        (user.currentStreak ?? 0) === 0
      );
      if (needsUpdate) {
        user.updateStreak();
        await user.save();
      }
    } catch (_) {}
    
    // Get recent submissions
    const recentSubmissions = await Submission.find({ user: user._id })
      .populate('problem', 'title difficulty titleSlug')
      .sort({ createdAt: -1 })
      .limit(10);

    // Get submission statistics
    const submissionStats = await Submission.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Get language statistics
    const languageStats = await Submission.aggregate([
      { $match: { user: user._id, status: 'Accepted' } },
      {
        $group: {
          _id: '$language',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get daily activity for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dailyActivity = await Submission.aggregate([
      { 
        $match: { 
          user: user._id,
          status: 'Accepted',
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    // Get problem difficulty breakdown
    const difficultyBreakdown = await Submission.aggregate([
      { $match: { user: user._id, status: 'Accepted' } },
      {
        $group: {
          _id: '$problemDifficulty',
          count: { $sum: 1 }
        }
      }
    ]);

    // Check for new badges
    const badges = await checkForNewBadges(user, {
      totalProblems: user.totalProblems,
      currentStreak: user.currentStreak,
      maxStreak: user.maxStreak,
      contestsAttended: user.contestsAttended,
      languageCount: languageStats.length
    });

    res.json({
      user,
      stats: {
        recentSubmissions,
        submissionStats,
        languageStats,
        dailyActivity,
        difficultyBreakdown
      },
      newBadges: badges
    });
  } catch (error) {
    console.error('Get dashboard error:', error);
    res.status(500).json({ message: 'Server error fetching dashboard data' });
  }
});

// Get badges for authenticated user
router.get('/badges', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('badges');
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.json({ badges: user.badges || [] });
  } catch (err) {
    console.error('Get badges error:', err);
    res.status(500).json({ message: 'Server error fetching badges' });
  }
});

// Add a badge for authenticated user (idempotent by name)
router.post('/badges', auth, async (req, res) => {
  try {
    const { name, description = '', icon = '' } = req.body;
    if (!name) return res.status(400).json({ message: 'Badge name is required' });

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const exists = user.badges.some(b => b.name === name);
    if (exists) {
      return res.json({ message: 'Badge already exists', badge: user.badges.find(b => b.name === name) });
    }

    const badge = { name, description, icon, unlockedAt: new Date() };
    user.badges.unshift(badge);
    await user.save();

    return res.status(201).json({ badge });
  } catch (err) {
    console.error('Add badge error:', err);
    res.status(500).json({ message: 'Server error adding badge' });
  }
});

// Get user profile by LeetCode username
router.get('/profile/:leetcodeUsername', async (req, res) => {
  try {
    const { leetcodeUsername } = req.params;
    
    const user = await User.findOne({ leetcodeUsername })
      .select('-password -email')
      .populate('friends.user', 'leetcodeUsername avatar xp level');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check privacy settings
    if (!user.settings.privacy.showProfile) {
      return res.status(403).json({ message: 'Profile is private' });
    }

    // Get public statistics if allowed
    let stats = {};
    if (user.settings.privacy.showStats) {
      // Get recent accepted submissions
      const recentSubmissions = await Submission.find({ 
        user: user._id, 
        status: 'Accepted' 
      })
        .populate('problem', 'title difficulty titleSlug')
        .sort({ createdAt: -1 })
        .limit(5);

      // Get language statistics
      const languageStats = await Submission.aggregate([
        { $match: { user: user._id, status: 'Accepted' } },
        {
          $group: {
            _id: '$language',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]);

      stats = {
        recentSubmissions,
        languageStats
      };
    }

    res.json({
      user,
      stats: user.settings.privacy.showStats ? stats : {}
    });
  } catch (error) {
    console.error('Get user profile error:', error);
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
});

// Get solved problems (titleSlugs) for current authenticated user
router.get('/solved', auth, async (req, res) => {
  try {
    // Find distinct problem IDs for accepted submissions by this user
    const solvedProblemIds = await Submission.distinct('problem', { user: req.user._id, status: 'Accepted' });

    if (!Array.isArray(solvedProblemIds) || solvedProblemIds.length === 0) {
      return res.json({ solved: [] });
    }

    // Lookup the Problem documents to get titleSlugs
    const problems = await Problem.find({ _id: { $in: solvedProblemIds } }).select('titleSlug title');
    const titleSlugs = problems.map(p => p.titleSlug).filter(Boolean);

    return res.json({ solved: Array.from(new Set(titleSlugs)) });
  } catch (error) {
    console.error('Get solved problems error:', error);
    res.status(500).json({ message: 'Server error fetching solved problems' });
  }
});

// Add/remove friend
router.post('/friends/:action/:userId', auth, async (req, res) => {
  try {
    const { action, userId } = req.params;
    
    if (!['add', 'remove', 'accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    // Prevent self friendship actions
    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot perform this action on yourself' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = await User.findById(req.user._id);

    switch (action) {
      case 'add':
        // Check if already friends or request exists
        {
          const existingInCurrent = currentUser.friends.find(f => f.user.toString() === userId);
          const existingInTarget = targetUser.friends.find(f => f.user.toString() === currentUser._id.toString());
          if (existingInCurrent || existingInTarget) {
            return res.status(400).json({ message: 'Friend request already exists or users are already friends' });
          }

          // Add symmetrical pending entries
          currentUser.friends.push({ user: userId, status: 'pending' });
          targetUser.friends.push({ user: currentUser._id, status: 'pending' });
          await currentUser.save();
          await targetUser.save();
        }
        break;

      case 'accept':
        // Update friend status to accepted for both users
        {
          const currentUserFriend = currentUser.friends.find(f => f.user.toString() === userId);
          const targetUserFriend = targetUser.friends.find(f => f.user.toString() === currentUser._id.toString());
          if (!currentUserFriend || !targetUserFriend) {
            return res.status(400).json({ message: 'No pending request to accept' });
          }
          currentUserFriend.status = 'accepted';
          targetUserFriend.status = 'accepted';
          await currentUser.save();
          await targetUser.save();
        }
        break;

      case 'remove':
      case 'reject':
        // Remove from both users' friends lists
        currentUser.friends = currentUser.friends.filter(f => f.user.toString() !== userId);
        targetUser.friends = targetUser.friends.filter(f => f.user.toString() !== currentUser._id.toString());
        await currentUser.save();
        await targetUser.save();
        break;
    }

    res.json({ message: `Friend ${action} successful` });
  } catch (error) {
    console.error('Friend action error:', error);
    res.status(500).json({ message: 'Server error processing friend request' });
  }
});

// Get user's friends
router.get('/friends', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('friends.user', 'leetcodeUsername avatar xp level totalProblems currentStreak lastActive');

    const friends = user.friends.map(friend => ({
      ...friend.user.toObject(),
      friendshipStatus: friend.status,
      addedAt: friend.addedAt
    }));

    res.json(friends);
  } catch (error) {
    console.error('Get friends error:', error);
    res.status(500).json({ message: 'Server error fetching friends' });
  }
});

// Get pending friend requests (incoming and outgoing)
router.get('/friends/requests', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('friends.user', 'leetcodeUsername avatar xp level');
    const incoming = [];
    const outgoing = [];

    for (const f of user.friends) {
      if (f.status === 'pending') {
        // If target also has me as pending, direction is unknown; we still split by comparing IDs
        // Mark as outgoing from current perspective since current has an entry for target
        // To better distinguish, check whether target has my entry (it will), but we can't know who initiated.
        outgoing.push({
          user: f.user,
          addedAt: f.addedAt,
          friendshipStatus: 'pending'
        });
      }
    }

    // Determine incoming by checking other users who have me in pending but I'm missing them (unlikely with symmetrical model)
    // With current symmetrical storage, incoming and outgoing are the same set; the UI can still allow accept/reject.

    res.json({ incoming, outgoing });
  } catch (error) {
    console.error('Get friend requests error:', error);
    res.status(500).json({ message: 'Server error fetching friend requests' });
  }
});

// Search users with friend status
router.get('/search', auth, async (req, res) => {
  try {
    const { q = '', limit = 20 } = req.query;
    const query = q.toString().trim();
    if (!query) return res.json({ users: [] });

    const filter = {
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { leetcodeUsername: { $regex: query, $options: 'i' } },
            { firstName: { $regex: query, $options: 'i' } },
            { lastName: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    };

    const projection = 'leetcodeUsername firstName lastName avatar xp level totalProblems lastActive friends';
    const results = await User.find(filter, projection).limit(parseInt(limit)).lean();

    // Build status map from current user's perspective
    const me = await User.findById(req.user._id).lean();
    const myFriends = me.friends || [];
    const statusById = new Map(myFriends.map(f => [f.user.toString(), f.status]));

    const users = results.map(u => ({
      _id: u._id,
      leetcodeUsername: u.leetcodeUsername,
      firstName: u.firstName,
      lastName: u.lastName,
      avatar: u.avatar,
      xp: u.xp,
      level: u.level,
      totalProblems: u.totalProblems,
      lastActive: u.lastActive,
      friendshipStatus: statusById.get(u._id.toString()) || 'none'
    }));

    res.json({ users });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error searching users' });
  }
});

// Helper function to check for new badges
async function checkForNewBadges(user, stats) {
  const newBadges = [];
  const existingBadges = user.badges.map(badge => badge.name);

  // Define badge criteria
  const badgeDefinitions = [
    {
      name: 'First Steps',
      description: 'Solved your first problem',
      icon: '🎯',
      criteria: stats.totalProblems >= 1
    },
    {
      name: 'Getting Warmed Up',
      description: 'Solved 10 problems',
      icon: '🔥',
      criteria: stats.totalProblems >= 10
    },
    {
      name: 'Problem Solver',
      description: 'Solved 50 problems',
      icon: '💪',
      criteria: stats.totalProblems >= 50
    },
    {
      name: 'Code Master',
      description: 'Solved 100 problems',
      icon: '👑',
      criteria: stats.totalProblems >= 100
    },
    {
      name: 'Streak Master',
      description: 'Maintained a 7-day streak',
      icon: '⚡',
      criteria: stats.maxStreak >= 7
    },
    {
      name: 'Dedication',
      description: 'Maintained a 30-day streak',
      icon: '🏆',
      criteria: stats.maxStreak >= 30
    },
    {
      name: 'Contest Warrior',
      description: 'Participated in 5 contests',
      icon: '⚔️',
      criteria: stats.contestsAttended >= 5
    },
    {
      name: 'Polyglot',
      description: 'Solved problems in 5 different languages',
      icon: '🌍',
      criteria: stats.languageCount >= 5
    }
  ];

  // Check which badges user has earned
  for (const badge of badgeDefinitions) {
    if (badge.criteria && !existingBadges.includes(badge.name)) {
      newBadges.push(badge);
      user.badges.push({
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        unlockedAt: new Date()
      });
    }
  }

  if (newBadges.length > 0) {
    await user.save();
  }

  return newBadges;
}

export default router;