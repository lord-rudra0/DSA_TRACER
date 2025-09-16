import express from 'express';
import { auth } from '../middleware/auth.js';
import Submission from '../models/Submission.js';
import User from '../models/User.js';
import Challenge from '../models/Challenge.js';

const router = express.Router();

// GET /api/analytics/me - returns small insights for current user
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Difficulty breakdown from accepted submissions
    const difficultyAgg = await Submission.aggregate([
      { $match: { user: userId, status: 'Accepted' } },
      { $group: { _id: '$problemDifficulty', count: { $sum: 1 } } }
    ]);

    const difficulty = Object.fromEntries((difficultyAgg || []).map(d => [d._id || 'Unknown', d.count]));

    // XP timeline (last 30 days) via challenges
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const xpAgg = await Challenge.aggregate([
      { $match: { user: userId, createdAt: { $gte: since } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, xp: { $sum: '$xpAwarded' } } },
      { $sort: { _id: 1 } }
    ]);
    const xpTimeline = xpAgg.map(a => ({ date: a._id, xp: a.xp }));

    // Top tags from user's accepted submissions (requires Problem tags in Submission or Problem lookup)
    const tagAgg = await Submission.aggregate([
      { $match: { user: userId, status: 'Accepted' } },
      { $lookup: { from: 'problems', localField: 'problem', foreignField: '_id', as: 'p' } },
      { $unwind: '$p' },
      { $unwind: { path: '$p.tags', preserveNullAndEmptyArrays: true } },
      { $group: { _id: '$p.tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);
    const topTags = tagAgg.filter(t => t._id).map(t => ({ tag: t._id, count: t.count }));

    // Rank by xp among users (cheap approximation)
    const higher = await User.countDocuments({ xp: { $gt: req.user.xp || 0 } });
    const totalUsers = await User.countDocuments();
    const rank = higher + 1;

    // Streaks and best streak
    const streak = { current: req.user.currentStreak || 0, best: req.user.maxStreak || 0 };

    res.json({ difficulty, xpTimeline, topTags, rank, totalUsers, streak });
  } catch (err) {
    console.error('Analytics /me error:', err);
    res.status(500).json({ message: 'Server error computing analytics' });
  }
});

export default router;
