import express from 'express';
import User from '../models/User.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get global leaderboard
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 50, 
      sortBy = 'xp', // xp, totalProblems, currentStreak, contestRating
      timeframe = 'all' // all, week, month
    } = req.query;

    let sortField = {};
    let matchStage = {};

    // Set sort field
    switch (sortBy) {
      case 'totalProblems':
        sortField = { totalProblems: -1, xp: -1 };
        break;
      case 'currentStreak':
        sortField = { currentStreak: -1, totalProblems: -1 };
        break;
      case 'contestRating':
        sortField = { contestRating: -1, totalProblems: -1 };
        matchStage.contestRating = { $gt: 0 }; // Only users with contest participation
        break;
      default:
        sortField = { xp: -1, totalProblems: -1 };
    }

    // Apply timeframe filter
    if (timeframe !== 'all') {
      const now = new Date();
      let startDate;
      
      if (timeframe === 'week') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (timeframe === 'month') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      
      matchStage.lastActive = { $gte: startDate };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const pipeline = [
      { $match: matchStage },
      {
        $project: {
          leetcodeUsername: 1,
          firstName: 1,
          lastName: 1,
          avatar: 1,
          xp: 1,
          level: 1,
          totalProblems: 1,
          easySolved: 1,
          mediumSolved: 1,
          hardSolved: 1,
          currentStreak: 1,
          maxStreak: 1,
          contestRating: 1,
          contestsAttended: 1,
          lastActive: 1,
          badges: { $size: '$badges' }
        }
      },
      { $sort: sortField },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ];

    const leaderboard = await User.aggregate(pipeline);
    const total = await User.countDocuments(matchStage);

    // Add rank to each user
    const rankedLeaderboard = leaderboard.map((user, index) => ({
      ...user,
      rank: skip + index + 1,
      fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.leetcodeUsername,
      isCurrentUser: req.user ? user._id.toString() === req.user._id.toString() : false
    }));

    // Get current user's rank if authenticated
    let currentUserRank = null;
    if (req.user) {
      const userRankPipeline = [
        { $match: matchStage },
        {
          $project: {
            _id: 1,
            xp: 1,
            totalProblems: 1,
            currentStreak: 1,
            contestRating: 1
          }
        },
        { $sort: sortField }
      ];

      const allUsers = await User.aggregate(userRankPipeline);
      currentUserRank = allUsers.findIndex(user => 
        user._id.toString() === req.user._id.toString()
      ) + 1;
    }

    res.json({
      leaderboard: rankedLeaderboard,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      },
      total,
      currentUserRank,
      sortBy,
      timeframe
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ message: 'Server error fetching leaderboard' });
  }
});

// Get friends leaderboard
router.get('/friends', optionalAuth, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const user = await User.findById(req.user._id).populate({
      path: 'friends.user',
      select: 'leetcodeUsername firstName lastName avatar xp level totalProblems easySolved mediumSolved hardSolved currentStreak maxStreak contestRating badges',
      match: { 'friends.status': 'accepted' }
    });

    const friends = user.friends
      .filter(friend => friend.status === 'accepted')
      .map(friend => ({
        ...friend.user.toObject(),
        badgeCount: friend.user.badges.length
      }));

    // Add current user to the list
    friends.push({
      _id: user._id,
      leetcodeUsername: user.leetcodeUsername,
      firstName: user.firstName,
      lastName: user.lastName,
      avatar: user.avatar,
      xp: user.xp,
      level: user.level,
      totalProblems: user.totalProblems,
      easySolved: user.easySolved,
      mediumSolved: user.mediumSolved,
      hardSolved: user.hardSolved,
      currentStreak: user.currentStreak,
      maxStreak: user.maxStreak,
      contestRating: user.contestRating,
      badgeCount: user.badges.length,
      isCurrentUser: true
    });

    // Sort by XP
    friends.sort((a, b) => b.xp - a.xp);

    // Add ranks
    const rankedFriends = friends.map((friend, index) => ({
      ...friend,
      rank: index + 1,
      fullName: `${friend.firstName || ''} ${friend.lastName || ''}`.trim() || friend.leetcodeUsername
    }));

    res.json({
      leaderboard: rankedFriends,
      total: rankedFriends.length
    });
  } catch (error) {
    console.error('Get friends leaderboard error:', error);
    res.status(500).json({ message: 'Server error fetching friends leaderboard' });
  }
});

// Get leaderboard statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalUsers: { $sum: 1 },
          totalProblems: { $sum: '$totalProblems' },
          totalXP: { $sum: '$xp' },
          avgLevel: { $avg: '$level' },
          maxStreak: { $max: '$maxStreak' },
          activeUsers: {
            $sum: {
              $cond: [
                { $gte: ['$lastActive', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          }
        }
      }
    ]);

    const topPerformers = await User.aggregate([
      { $sort: { xp: -1 } },
      { $limit: 3 },
      {
        $project: {
          leetcodeUsername: 1,
          avatar: 1,
          xp: 1,
          totalProblems: 1
        }
      }
    ]);

    const difficultyStats = await User.aggregate([
      {
        $group: {
          _id: null,
          totalEasy: { $sum: '$easySolved' },
          totalMedium: { $sum: '$mediumSolved' },
          totalHard: { $sum: '$hardSolved' }
        }
      }
    ]);

    res.json({
      overall: stats[0] || {},
      topPerformers,
      difficultyDistribution: difficultyStats[0] || {},
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Get leaderboard stats error:', error);
    res.status(500).json({ message: 'Server error fetching leaderboard statistics' });
  }
});

// List all users (paginated, optional search and sort)
router.get('/all', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      search = '',
      sortBy = 'leetcodeUsername', // leetcodeUsername, xp, totalProblems, contestRating, lastActive
      order = 'asc' // asc | desc
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (search) {
      const s = search.trim();
      filter.$or = [
        { leetcodeUsername: { $regex: s, $options: 'i' } },
        { firstName: { $regex: s, $options: 'i' } },
        { lastName: { $regex: s, $options: 'i' } }
      ];
    }

    const sort = {};
    const dir = order === 'desc' ? -1 : 1;
    if (['xp', 'totalProblems', 'contestRating', 'lastActive'].includes(sortBy)) {
      sort[sortBy] = dir;
    } else {
      sort.leetcodeUsername = dir;
    }

    const projection = {
      leetcodeUsername: 1,
      firstName: 1,
      lastName: 1,
      avatar: 1,
      xp: 1,
      level: 1,
      totalProblems: 1,
      easySolved: 1,
      mediumSolved: 1,
      hardSolved: 1,
      currentStreak: 1,
      maxStreak: 1,
      contestRating: 1,
      lastActive: 1,
    };

    const [users, total] = await Promise.all([
      User.find(filter, projection).sort(sort).skip(skip).limit(parseInt(limit)).lean(),
      User.countDocuments(filter)
    ]);

    const rows = users.map(u => ({
      ...u,
      fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.leetcodeUsername,
      isCurrentUser: req.user ? u._id.toString() === req.user._id.toString() : false
    }));

    return res.json({
      users: rows,
      pagination: {
        current: parseInt(page),
        total: Math.ceil(total / parseInt(limit)),
        hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
        hasPrev: parseInt(page) > 1
      },
      total,
      sortBy,
      order,
      search
    });
  } catch (error) {
    console.error('List all users error:', error);
    res.status(500).json({ message: 'Server error fetching users' });
  }
});

export default router;