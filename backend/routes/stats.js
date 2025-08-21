import express from 'express';
import User from '../models/User.js';
import Problem from '../models/Problem.js';
import Submission from '../models/Submission.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// Get user statistics
router.get('/user', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
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

    // Get monthly progress
    const monthlyProgress = await Submission.aggregate([
      { 
        $match: { 
          user: user._id,
          status: 'Accepted',
          createdAt: { 
            $gte: new Date(new Date().getFullYear(), 0, 1) // This year
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Get topic-wise performance
    const topicStats = await Submission.aggregate([
      { 
        $match: { 
          user: user._id,
          status: 'Accepted'
        }
      },
      {
        $lookup: {
          from: 'problems',
          localField: 'problem',
          foreignField: '_id',
          as: 'problemDetails'
        }
      },
      { $unwind: '$problemDetails' },
      { $unwind: '$problemDetails.tags' },
      {
        $group: {
          _id: '$problemDetails.tags',
          count: { $sum: 1 },
          difficulties: {
            $push: '$problemDetails.difficulty'
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 20 }
    ]);

    // Calculate streaks and activity
    const dailyActivity = await Submission.aggregate([
      { 
        $match: { 
          user: user._id,
          status: 'Accepted',
          createdAt: { 
            $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) // Last year
          }
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

    // Get difficulty progression over time
    const difficultyProgression = await Submission.aggregate([
      { 
        $match: { 
          user: user._id,
          status: 'Accepted'
        }
      },
      {
        $lookup: {
          from: 'problems',
          localField: 'problem',
          foreignField: '_id',
          as: 'problemDetails'
        }
      },
      { $unwind: '$problemDetails' },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            difficulty: '$problemDetails.difficulty'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    res.json({
      user: {
        username: user.username,
        xp: user.xp,
        level: user.level,
        totalProblems: user.totalProblems,
        easySolved: user.easySolved,
        mediumSolved: user.mediumSolved,
        hardSolved: user.hardSolved,
        currentStreak: user.currentStreak,
        maxStreak: user.maxStreak,
        contestRating: user.contestRating,
        contestsAttended: user.contestsAttended,
        badges: user.badges
      },
      submissions: {
        total: submissionStats.reduce((acc, stat) => acc + stat.count, 0),
        byStatus: submissionStats,
        byLanguage: languageStats
      },
      progress: {
        monthly: monthlyProgress,
        daily: dailyActivity,
        difficultyProgression
      },
      topics: topicStats,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ message: 'Server error fetching user statistics' });
  }
});

// Get platform statistics
router.get('/platform', async (req, res) => {
  try {
    // Total users
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({
      lastActive: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });

    // Total problems
    const totalProblems = await Problem.countDocuments();
    const problemsByDifficulty = await Problem.aggregate([
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 }
        }
      }
    ]);

    // Total submissions
    const totalSubmissions = await Submission.countDocuments();
    const acceptedSubmissions = await Submission.countDocuments({ status: 'Accepted' });

    // Language distribution
    const languageDistribution = await Submission.aggregate([
      { $match: { status: 'Accepted' } },
      {
        $group: {
          _id: '$language',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Popular topics
    const popularTopics = await Submission.aggregate([
      { $match: { status: 'Accepted' } },
      {
        $lookup: {
          from: 'problems',
          localField: 'problem',
          foreignField: '_id',
          as: 'problemDetails'
        }
      },
      { $unwind: '$problemDetails' },
      { $unwind: '$problemDetails.tags' },
      {
        $group: {
          _id: '$problemDetails.tags',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 15 }
    ]);

    // User growth over time
    const userGrowth = await User.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Submission trends
    const submissionTrends = await Submission.aggregate([
      {
        $match: {
          createdAt: { 
            $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            day: { $dayOfMonth: '$createdAt' }
          },
          total: { $sum: 1 },
          accepted: {
            $sum: { $cond: [{ $eq: ['$status', 'Accepted'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        growth: userGrowth
      },
      problems: {
        total: totalProblems,
        byDifficulty: problemsByDifficulty
      },
      submissions: {
        total: totalSubmissions,
        accepted: acceptedSubmissions,
        acceptanceRate: totalSubmissions > 0 ? (acceptedSubmissions / totalSubmissions * 100).toFixed(1) : 0,
        trends: submissionTrends
      },
      languages: languageDistribution,
      topics: popularTopics,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Get platform stats error:', error);
    res.status(500).json({ message: 'Server error fetching platform statistics' });
  }
});

// Get comparison between users
router.get('/compare/:user1/:user2', async (req, res) => {
  try {
    const { user1, user2 } = req.params;
    
    const users = await User.find({
      username: { $in: [user1, user2] }
    }).select('-password -email');

    if (users.length !== 2) {
      return res.status(404).json({ message: 'One or both users not found' });
    }

    // Check privacy settings
    for (const user of users) {
      if (!user.settings.privacy.showStats) {
        return res.status(403).json({ 
          message: `${user.username}'s statistics are private` 
        });
      }
    }

    // Get submission data for both users
    const submissionComparison = await Promise.all(
      users.map(async (user) => {
        const submissions = await Submission.aggregate([
          { $match: { user: user._id } },
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ]);

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

        const topicStats = await Submission.aggregate([
          { $match: { user: user._id, status: 'Accepted' } },
          {
            $lookup: {
              from: 'problems',
              localField: 'problem',
              foreignField: '_id',
              as: 'problemDetails'
            }
          },
          { $unwind: '$problemDetails' },
          { $unwind: '$problemDetails.tags' },
          {
            $group: {
              _id: '$problemDetails.tags',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]);

        return {
          user: user,
          submissions,
          languages: languageStats,
          topics: topicStats
        };
      })
    );

    res.json({
      comparison: submissionComparison,
      summary: {
        winner: {
          totalProblems: users[0].totalProblems > users[1].totalProblems ? users[0].username : users[1].username,
          xp: users[0].xp > users[1].xp ? users[0].username : users[1].username,
          streak: users[0].maxStreak > users[1].maxStreak ? users[0].username : users[1].username,
          contests: users[0].contestRating > users[1].contestRating ? users[0].username : users[1].username
        }
      },
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Get comparison error:', error);
    res.status(500).json({ message: 'Server error fetching comparison data' });
  }
});

export default router;