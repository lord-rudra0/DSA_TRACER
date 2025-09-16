import express from 'express';
import { auth } from '../middleware/auth.js';
import Challenge from '../models/Challenge.js';
import User from '../models/User.js';
import XpLog from '../models/XpLog.js';

const router = express.Router();

// Record a challenge completion (authenticated)
// Body: { problems: [{titleSlug,title,difficulty}], numProblems, timeTakenSeconds, timeLimitSeconds, success }
router.post('/complete', auth, async (req, res) => {
  try {
    const { problems = [], numProblems = 0, timeTakenSeconds = 0, timeLimitSeconds = 0, success = false } = req.body;
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // XP awarding: sum xp by difficulty for completed problems, bonus for success
    const xpForDifficulty = (d) => d === 'Easy' ? 10 : (d === 'Medium' ? 20 : 30);
    const baseXP = problems.reduce((s, p) => s + (xpForDifficulty(p.difficulty) || 0), 0);
    const bonus = success ? Math.round(baseXP * 0.25) : 0;
    const xpAwarded = baseXP + bonus;

    // Create Challenge record
    const ch = new Challenge({ user: user._id, problems, numProblems, timeTakenSeconds, timeLimitSeconds, xpAwarded, success });
    await ch.save();

    // Award XP and create XpLog
    if (xpAwarded > 0) {
      user.xp = (user.xp || 0) + xpAwarded;
      user.seasonXP = (user.seasonXP || 0) + xpAwarded;
      const leveledUp = user.checkLevelUp();
      await user.save();
      await XpLog.create({ user: user._id, delta: xpAwarded, reason: 'challenge_complete', meta: { numProblems, success } });

      return res.status(201).json({ message: 'Challenge recorded', challenge: ch, xpAwarded, leveledUp });
    }

    return res.status(201).json({ message: 'Challenge recorded', challenge: ch, xpAwarded: 0 });
  } catch (err) {
    console.error('Challenge complete error:', err);
    res.status(500).json({ message: 'Server error recording challenge' });
  }
});

// Get authenticated user's challenge history (paginated)
router.get('/history', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(50, parseInt(req.query.limit || '20'));
    const skip = (page - 1) * limit;
    const items = await Challenge.find({ user: req.user._id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    const total = await Challenge.countDocuments({ user: req.user._id });
    res.json({ items, page, limit, total });
  } catch (err) {
    console.error('Challenge history error:', err);
    res.status(500).json({ message: 'Server error fetching challenge history' });
  }
});

// Public leaderboard: top users by total challenges completed and average time for success
router.get('/leaderboard', async (req, res) => {
  try {
    const limit = Math.min(50, parseInt(req.query.limit || '20'));
    // Aggregate by user
    const agg = await Challenge.aggregate([
      { $match: {} },
      { $group: {
        _id: '$user',
        completions: { $sum: 1 },
        successes: { $sum: { $cond: ['$success', 1, 0] } },
        avgTime: { $avg: '$timeTakenSeconds' }
      }},
      { $sort: { completions: -1, successes: -1 } },
      { $limit: limit }
    ]);

    // join with user basic info
    const userIds = agg.map(a => a._id);
    const users = await User.find({ _id: { $in: userIds } }).select('leetcodeUsername avatar xp level totalProblems').lean();
    const usersById = Object.fromEntries(users.map(u => [u._id.toString(), u]));
    const rows = agg.map(a => ({ user: usersById[a._id.toString()] || { _id: a._id }, completions: a.completions, successes: a.successes, avgTime: a.avgTime }));

    res.json({ rows });
  } catch (err) {
    console.error('Challenge leaderboard error:', err);
    res.status(500).json({ message: 'Server error fetching leaderboard' });
  }
});

export default router;
