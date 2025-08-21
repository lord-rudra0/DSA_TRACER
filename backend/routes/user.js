import express from 'express';
import axios from 'axios';
import User from '../models/User.js';
import Problem from '../models/Problem.js';
import Submission from '../models/Submission.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

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
    const newXP = (userData.easySolved * 10) + 
                  (userData.mediumSolved * 20) + 
                  (userData.hardSolved * 30);
    
    const oldXP = user.xp;
    user.xp = Math.max(user.xp, newXP); // Don't decrease XP
    
    // Check for level up
    const leveledUp = user.checkLevelUp();
    
    await user.save();

    // Sync recent submissions
    try {
      const submissionsResponse = await axios.get(`${process.env.LEETCODE_API_BASE}/${leetcodeUsername}/submission`);
      const recentSubmissions = submissionsResponse.data.submission || [];
      
      for (const submission of recentSubmissions.slice(0, 20)) { // Last 20 submissions
        // Check if submission already exists
        const existingSubmission = await Submission.findOne({
          user: user._id,
          leetcodeSubmissionId: submission.id
        });
        
        if (!existingSubmission) {
          // Find or create problem
          let problem = await Problem.findOne({ titleSlug: submission.titleSlug });
          
          if (!problem) {
            // Create basic problem entry
            problem = new Problem({
              titleSlug: submission.titleSlug,
              title: submission.title,
              difficulty: 'Unknown', // Will be updated when problem is accessed
              tags: []
            });
            await problem.save();
          }
          
          // Create submission record
          const newSubmission = new Submission({
            user: user._id,
            problem: problem._id,
            problemTitle: submission.title,
            problemDifficulty: problem.difficulty,
            language: submission.lang,
            status: submission.statusDisplay,
            runtime: submission.runtime,
            memory: submission.memory,
            leetcodeSubmissionId: submission.id,
            timestamp: submission.timestamp,
            firstAccepted: submission.statusDisplay === 'Accepted'
          });
          
          await newSubmission.save();
        }
      }
    } catch (submissionError) {
      console.error('Error syncing submissions:', submissionError);
      // Continue even if submissions sync fails
    }

    res.json({
      message: 'LeetCode data synced successfully',
      user: {
        ...user.toObject(),
        xpGained: user.xp - oldXP,
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

// Get user dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    
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

// Get user profile by username
router.get('/profile/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    const user = await User.findOne({ username })
      .select('-password -email')
      .populate('friends.user', 'username avatar xp level');

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

// Add/remove friend
router.post('/friends/:action/:userId', auth, async (req, res) => {
  try {
    const { action, userId } = req.params;
    
    if (!['add', 'remove', 'accept', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const currentUser = await User.findById(req.user._id);

    switch (action) {
      case 'add':
        // Check if already friends or request exists
        const existingFriend = currentUser.friends.find(f => f.user.toString() === userId);
        if (existingFriend) {
          return res.status(400).json({ message: 'Friend request already exists or users are already friends' });
        }

        // Add to current user's friends list
        currentUser.friends.push({
          user: userId,
          status: 'pending'
        });

        // Add to target user's friends list
        targetUser.friends.push({
          user: currentUser._id,
          status: 'pending'
        });

        await currentUser.save();
        await targetUser.save();
        break;

      case 'accept':
        // Update friend status to accepted for both users
        const currentUserFriend = currentUser.friends.find(f => f.user.toString() === userId);
        const targetUserFriend = targetUser.friends.find(f => f.user.toString() === currentUser._id.toString());

        if (currentUserFriend && targetUserFriend) {
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
      .populate('friends.user', 'username avatar xp level totalProblems currentStreak lastActive');

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