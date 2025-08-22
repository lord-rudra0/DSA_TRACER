import express from 'express';
import axios from 'axios';
import Problem from '../models/Problem.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import { auth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();
const SHOULD_LOG_PROXY = process.env.LOG_EXTERNAL_PROXY === 'true';

// Get all problems with filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      difficulty,
      tags,
      search,
      status, // solved, unsolved, attempted
      language // filter by user's accepted submissions language (requires auth)
    } = req.query;

    // If external API base is configured, prefer proxying external list (no local DB dependency)
    if (process.env.LEETCODE_API_BASE) {
      try {
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const extParams = new URLSearchParams();
        extParams.set('limit', parseInt(limit));
        extParams.set('skip', skip);
        if (difficulty) {
          const map = { Easy: 'EASY', Medium: 'MEDIUM', Hard: 'HARD' };
          extParams.set('difficulty', map[difficulty] || String(difficulty).toUpperCase());
        }
        if (tags) {
          const tagStr = tags.split(',').map(t => t.trim()).filter(Boolean).join('+');
          if (tagStr) extParams.set('tags', tagStr);
        }

        const url = `${process.env.LEETCODE_API_BASE}/problems?${extParams.toString()}`;
        if (SHOULD_LOG_PROXY) console.log('[Problems] Proxying to:', url);
        const extRes = await axios.get(url);
        // Alfa API may return one of several shapes. Normalize here:
        // - { problems: [...] }
        // - { problemsetQuestionList: [...] }
        // - [ ... ]
        let extItems = [];
        if (Array.isArray(extRes.data?.problems)) {
          extItems = extRes.data.problems;
        } else if (Array.isArray(extRes.data?.problemsetQuestionList)) {
          extItems = extRes.data.problemsetQuestionList;
        } else if (Array.isArray(extRes.data)) {
          extItems = extRes.data;
        }

        const mapped = extItems.map((q) => {
          const topicTags = q.topicTags || q.tags || [];
          const tagsArr = Array.isArray(topicTags)
            ? topicTags.map(t => (typeof t === 'string' ? t : (t?.name || t?.slug || '') )).filter(Boolean)
            : [];
          const diff = (q.difficulty || '').toString().toUpperCase();
          const diffPretty = diff === 'EASY' ? 'Easy' : diff === 'MEDIUM' ? 'Medium' : diff === 'HARD' ? 'Hard' : (q.difficulty || '');
          return {
            title: q.title || q.questionTitle || q.titleSlug || 'Untitled',
            titleSlug: q.titleSlug || q.slug || q.questionSlug,
            difficulty: diffPretty,
            tags: tagsArr,
            acRate: q.acRate ?? q.acceptanceRate ?? null,
            totalSubmissions: q.totalSubmissions ?? null,
            totalAccepted: q.totalAccepted ?? null,
            isPremium: q.isPaidOnly ?? q.paidOnly ?? false,
          };
        }).filter(p => p.titleSlug);

        // Apply text search locally if provided
        let results = mapped;
        if (search) {
          const s = search.toLowerCase();
          results = mapped.filter(p =>
            p.title?.toLowerCase().includes(s) ||
            p.titleSlug?.toLowerCase().includes(s) ||
            p.tags?.some(t => t.toLowerCase().includes(s))
          );
        }

        // If authenticated, compute solved set: hybrid (DB + external recent)
        let acceptedIds = null;
        let acceptedByLang = null;
        if (req.user) {
          const baseQuery = { user: req.user._id, status: 'Accepted' };
          acceptedIds = await Submission.find(baseQuery)
            .populate('problem', 'titleSlug')
            .then(rows => new Set(rows.map(r => r.problem?.titleSlug).filter(Boolean)));
          if (language) {
            acceptedByLang = await Submission.find({ ...baseQuery, language })
              .populate('problem', 'titleSlug')
              .then(rows => new Set(rows.map(r => r.problem?.titleSlug).filter(Boolean)));
          }

          // Try to augment with external recent Accepted slugs
          try {
            const userDoc = await User.findById(req.user._id).select('leetcodeUsername');
            const handle = userDoc?.leetcodeUsername?.trim();
            if (handle) {
              const extSubUrl = `${process.env.LEETCODE_API_BASE}/${handle}/submission`;
              if (SHOULD_LOG_PROXY) console.log('[Problems] Fetching external submissions for solved set:', extSubUrl);
              const subRes = await axios.get(extSubUrl);
              const subs = Array.isArray(subRes.data?.submission) ? subRes.data.submission : (subRes.data?.recentSubmissions || []);
              for (const s of subs.slice(0, 200)) {
                if ((s.statusDisplay || s.status) === 'Accepted' && s.titleSlug) {
                  acceptedIds.add(s.titleSlug);
                }
              }
            }
          } catch (extSolvedErr) {
            if (SHOULD_LOG_PROXY) console.warn('[Problems] External solved fetch failed:', extSolvedErr?.message || extSolvedErr);
          }

          results = results.map(p => ({ ...p, solved: acceptedIds.has(p.titleSlug) }));
        }

        // Apply user-specific status filter if requested
        if (status && req.user && acceptedIds) {
          if (status === 'solved') results = results.filter(p => p.solved);
          if (status === 'unsolved') results = results.filter(p => !p.solved);
        }

        // Apply language filter (requires auth)
        if (language && req.user && acceptedIds) {
          // If we computed acceptedByLang, use it to filter results
          if (acceptedByLang) {
            results = results.filter(p => acceptedByLang.has(p.titleSlug));
          } else {
            // Fallback: keep results (cannot filter without data)
          }
        }

        const hasNext = results.length === parseInt(limit);
        return res.json({
          problems: results,
          pagination: {
            current: parseInt(page),
            total: hasNext ? parseInt(page) + 1 : parseInt(page),
            hasNext,
            hasPrev: parseInt(page) > 1
          },
          total: (parseInt(page) - 1) * parseInt(limit) + results.length + (hasNext ? parseInt(limit) : 0)
        });
      } catch (e) {
        if (SHOULD_LOG_PROXY) console.error('External problems proxy error:', e?.message || e);
        // falls back to local DB path below
      }
    }

    let query = {};
    
    // Apply filters
    if (difficulty) {
      query.difficulty = difficulty;
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { titleSlug: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let problems = await Problem.find(query)
      .select('title titleSlug difficulty tags acRate totalSubmissions totalAccepted isPremium')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // If user is authenticated, add solve status
    if (req.user) {
      const baseAcceptedQuery = {
        user: req.user._id,
        status: 'Accepted'
      };
      const userSubmissions = await Submission.find(baseAcceptedQuery).distinct('problem');
      let acceptedProblemIdsByLang = null;
      if (language) {
        acceptedProblemIdsByLang = new Set(
          await Submission.find({ ...baseAcceptedQuery, language }).distinct('problem')
        );
      }

      problems = problems.map(problem => ({
        ...problem.toObject(),
        solved: userSubmissions.some(submissionProblemId => 
          submissionProblemId.toString() === problem._id.toString()
        )
      }));

      // Apply status filter if provided
      if (status === 'solved') {
        problems = problems.filter(p => p.solved);
      } else if (status === 'unsolved') {
        problems = problems.filter(p => !p.solved);
      }

      // Apply language filter if provided (only keep problems accepted in that language)
      if (language && acceptedProblemIdsByLang) {
        problems = problems.filter(p => acceptedProblemIdsByLang.has(p._id));
      }
    }

    let total = await Problem.countDocuments(query);
    let totalPages = Math.ceil(total / parseInt(limit));

    // External API fallback if no local results
    if (total === 0) {
      try {
        const base = process.env.LEETCODE_API_BASE;
        if (!base) throw new Error('LEETCODE_API_BASE not configured');

        // Build external query
        const extParams = new URLSearchParams();
        extParams.set('limit', parseInt(limit));
        extParams.set('skip', skip);
        // External difficulty expects uppercase EASY|MEDIUM|HARD
        if (difficulty) {
          const map = { Easy: 'EASY', Medium: 'MEDIUM', Hard: 'HARD' };
          extParams.set('difficulty', map[difficulty] || String(difficulty).toUpperCase());
        }
        if (tags) {
          // Our UI sends comma-separated; external expects plus-separated
          const tagStr = tags.split(',').map(t => t.trim()).filter(Boolean).join('+');
          if (tagStr) extParams.set('tags', tagStr);
        }
        // External API doesn't support free-text search reliably; we will filter client-side after fetch

        const url = `${base}/problems?${extParams.toString()}`;
        if (SHOULD_LOG_PROXY) console.log('[Problems] Fallback proxy to:', url);
        const extRes = await axios.get(url);
        const extItems = Array.isArray(extRes.data?.problems) ? extRes.data.problems : (Array.isArray(extRes.data) ? extRes.data : []);

        const mapped = extItems.map((q) => {
          // Defensive mapping across possible shapes
          const topicTags = q.topicTags || q.tags || [];
          const tagsArr = Array.isArray(topicTags)
            ? topicTags.map(t => (typeof t === 'string' ? t : (t?.name || t?.slug || '') )).filter(Boolean)
            : [];
          const diff = (q.difficulty || '').toString().toUpperCase();
          const diffPretty = diff === 'EASY' ? 'Easy' : diff === 'MEDIUM' ? 'Medium' : diff === 'HARD' ? 'Hard' : (q.difficulty || '');
          return {
            title: q.title || q.questionTitle || q.titleSlug || 'Untitled',
            titleSlug: q.titleSlug || q.slug || q.questionSlug,
            difficulty: diffPretty,
            tags: tagsArr,
            acRate: q.acRate ?? q.acceptanceRate ?? null,
            totalSubmissions: q.totalSubmissions ?? null,
            totalAccepted: q.totalAccepted ?? null,
            isPremium: q.isPaidOnly ?? q.paidOnly ?? false,
          };
        }).filter(p => p.titleSlug);

        // Apply text search locally if provided
        const filtered = search
          ? mapped.filter(p =>
              p.title?.toLowerCase().includes(search.toLowerCase()) ||
              p.titleSlug?.toLowerCase().includes(search.toLowerCase()) ||
              p.tags?.some(t => t.toLowerCase().includes(search.toLowerCase()))
            )
          : mapped;

        const hasNext = filtered.length === parseInt(limit);
      
        return res.json({
          problems: filtered,
          pagination: {
            current: parseInt(page),
            total: hasNext ? parseInt(page) + 1 : parseInt(page), // best-effort when total unknown
            hasNext,
            hasPrev: parseInt(page) > 1,
          },
          total: skip + filtered.length + (hasNext ? parseInt(limit) : 0), // approximate total
        });
      } catch (extErr) {
        if (SHOULD_LOG_PROXY) console.error('External problems fallback error:', extErr?.message || extErr);
        // Continue to return empty local result
      }
    }

    return res.json({
      problems,
      pagination: {
        current: parseInt(page),
        total: totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      total
    });
  } catch (error) {
    console.error('Get problems error:', error);
    res.status(500).json({ message: 'Server error fetching problems' });
  }
});

// Get problem by slug
// Get daily challenge (place BEFORE slug route to avoid being caught by '/:titleSlug')
router.get('/daily/challenge', async (req, res) => {
  try {
    // Try to get from LeetCode API
    try {
      const response = await axios.get(`${process.env.LEETCODE_API_BASE}/daily`);
      
      if (response.data) {
        const dailyChallenge = response.data;
        
        // Update or create in database with safe fallbacks
        let problem = await Problem.findOne({ titleSlug: dailyChallenge.titleSlug });
        
        if (!problem) {
          const rawDiff = (dailyChallenge.difficulty || '').toString();
          const diffUpper = rawDiff.toUpperCase();
          const diffPretty = diffUpper === 'EASY' ? 'Easy' : diffUpper === 'MEDIUM' ? 'Medium' : diffUpper === 'HARD' ? 'Hard' : 'Easy';
          problem = new Problem({
            titleSlug: dailyChallenge.titleSlug,
            title: dailyChallenge.title || dailyChallenge.questionTitle || dailyChallenge.titleSlug || 'Untitled',
            difficulty: diffPretty,
            tags: dailyChallenge.topicTags?.map(tag => tag.name) || [],
            leetcodeId: dailyChallenge.questionId,
            acRate: dailyChallenge.acRate,
            isPremium: dailyChallenge.isPaidOnly || false
          });
        }
        
        problem.isDailyChallenge = true;
        problem.dailyChallengeDate = new Date();
        try {
          await problem.save();
        } catch (validationErr) {
          // Do not crash daily endpoint due to validation; return external payload
          console.warn('Daily challenge save validation error:', validationErr?.message || validationErr);
        }
        
        return res.json({
          ...problem.toObject(),
          date: dailyChallenge.date,
          link: dailyChallenge.link
        });
      }
      
      return res.status(404).json({ message: 'Daily challenge not found' });
    } catch (apiError) {
      console.error('Daily challenge API error:', apiError);
      
      // Fallback to database
      const dailyProblem = await Problem.findOne({
        isDailyChallenge: true,
        dailyChallengeDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      });
      
      if (dailyProblem) {
        return res.json(dailyProblem);
      } else {
        return res.status(404).json({ message: 'Daily challenge not found' });
      }
    }
  } catch (error) {
    console.error('Get daily challenge error:', error);
    res.status(500).json({ message: 'Server error fetching daily challenge' });
  }
});

// Get problem by slug
router.get('/:titleSlug', optionalAuth, async (req, res) => {
  try {
    const { titleSlug } = req.params;
    
    let problem = await Problem.findOne({ titleSlug });
    
    if (!problem) {
      // Try to fetch from LeetCode API
      try {
        const response = await axios.get(`${process.env.LEETCODE_API_BASE}/select?titleSlug=${titleSlug}`);
        
        if (response.data) {
          const leetcodeProblem = response.data;
          
          // Create new problem in database
          problem = new Problem({
            titleSlug: leetcodeProblem.titleSlug,
            title: leetcodeProblem.title,
            difficulty: leetcodeProblem.difficulty,
            tags: leetcodeProblem.topicTags?.map(tag => tag.name) || [],
            description: leetcodeProblem.content,
            leetcodeId: leetcodeProblem.questionId,
            acRate: leetcodeProblem.acRate,
            categoryTitle: leetcodeProblem.categoryTitle,
            content: leetcodeProblem.content,
            isPremium: leetcodeProblem.isPaidOnly || false
          });
          
          await problem.save();
        }
      } catch (apiError) {
        console.error('LeetCode API error:', apiError);
        return res.status(404).json({ message: 'Problem not found' });
      }
    }

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // Add user-specific data if authenticated
    let problemData = problem.toObject();
    
    if (req.user) {
      const userSubmissions = await Submission.find({
        user: req.user._id,
        problem: problem._id
      }).sort({ createdAt: -1 }).limit(10);

      const acceptedSubmission = userSubmissions.find(sub => sub.status === 'Accepted');
      
      problemData.solved = !!acceptedSubmission;
      problemData.attempted = userSubmissions.length > 0;
      problemData.submissions = userSubmissions;
      problemData.lastSubmission = userSubmissions[0];
    }

    res.json(problemData);
  } catch (error) {
    console.error('Get problem error:', error);
    res.status(500).json({ message: 'Server error fetching problem' });
  }
});

// Get daily challenge
router.get('/daily/challenge', async (req, res) => {
  try {
    // Try to get from LeetCode API
    try {
      const response = await axios.get(`${process.env.LEETCODE_API_BASE}/daily`);
      
      if (response.data) {
        const dailyChallenge = response.data;
        
        // Update or create in database
        let problem = await Problem.findOne({ titleSlug: dailyChallenge.titleSlug });
        
        if (!problem) {
          problem = new Problem({
            titleSlug: dailyChallenge.titleSlug,
            title: dailyChallenge.title,
            difficulty: dailyChallenge.difficulty,
            tags: dailyChallenge.topicTags?.map(tag => tag.name) || [],
            leetcodeId: dailyChallenge.questionId,
            acRate: dailyChallenge.acRate,
            isPremium: dailyChallenge.isPaidOnly || false
          });
        }
        
        problem.isDailyChallenge = true;
        problem.dailyChallengeDate = new Date();
        await problem.save();
        
        res.json({
          ...problem.toObject(),
          date: dailyChallenge.date,
          link: dailyChallenge.link
        });
      }
    } catch (apiError) {
      console.error('Daily challenge API error:', apiError);
      
      // Fallback to database
      const dailyProblem = await Problem.findOne({
        isDailyChallenge: true,
        dailyChallengeDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      });
      
      if (dailyProblem) {
        res.json(dailyProblem);
      } else {
        res.status(404).json({ message: 'Daily challenge not found' });
      }
    }
  } catch (error) {
    console.error('Get daily challenge error:', error);
    res.status(500).json({ message: 'Server error fetching daily challenge' });
  }
});

// Get problem tags
router.get('/meta/tags', async (req, res) => {
  try {
    const tags = await Problem.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { name: '$_id', count: 1, _id: 0 } }
    ]);

    res.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ message: 'Server error fetching tags' });
  }
});

// Get problem statistics
router.get('/meta/stats', async (req, res) => {
  try {
    const stats = await Problem.aggregate([
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 },
          avgAcceptanceRate: { $avg: '$acRate' }
        }
      }
    ]);

    const total = await Problem.countDocuments();
    
    res.json({
      total,
      byDifficulty: stats,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Get problem stats error:', error);
    res.status(500).json({ message: 'Server error fetching problem statistics' });
  }
});

export default router;