import express from 'express';
import XpLog from '../models/XpLog.js';
import { auth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/xp/logs?limit=50
router.get('/logs', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
    const logs = await XpLog.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    return res.json({ logs });
  } catch (e) {
    console.error('Fetch XP logs error:', e);
    return res.status(500).json({ message: 'Server error fetching XP logs' });
  }
});

export default router;
