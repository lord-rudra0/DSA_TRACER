import express from 'express';
import User from '../models/User.js';
import { getCurrentSeasonKey } from '../utils/xp.js';

const router = express.Router();

// GET /api/season/leaderboard?key=YYYY-MM&limit=20&page=1
router.get('/leaderboard', async (req, res) => {
  try {
    const key = (req.query.key && String(req.query.key)) || getCurrentSeasonKey();
    const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      User.find({ seasonKey: key })
        .sort({ seasonXP: -1, xp: -1 })
        .skip(skip)
        .limit(limit)
        .select('leetcodeUsername email avatar seasonXP xp'),
      User.countDocuments({ seasonKey: key })
    ]);

    return res.json({
      key,
      page,
      limit,
      total,
      items: items.map((u, idx) => ({
        id: String(u._id),
        leetcodeUsername: u.leetcodeUsername,
        email: u.email,
        avatar: u.avatar,
        seasonXP: u.seasonXP || 0,
        xp: u.xp || 0,
        rank: skip + idx + 1,
      }))
    });
  } catch (e) {
    console.error('Season leaderboard error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
