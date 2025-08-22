import express from 'express';
import mongoose from 'mongoose';
import Competition from '../models/Competition.js';
import Submission from '../models/Submission.js';
import Problem from '../models/Problem.js';
import User from '../models/User.js';
import { auth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Helper to compute status based on time
function computeStatus(startAt, endAt) {
  const now = new Date();
  if (now < startAt) return 'scheduled';
  if (now > endAt) return 'finished';
  return 'ongoing';
}

// Create a competition (admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { name, description = '', problems = [], startAt, endAt, visibility = 'public', scoring } = req.body || {};
    if (!name || !Array.isArray(problems) || problems.length === 0 || !startAt || !endAt) {
      return res.status(400).json({ message: 'name, problems[], startAt, endAt are required' });
    }

    const start = new Date(startAt);
    const end = new Date(endAt);
    if (!(start < end)) return res.status(400).json({ message: 'startAt must be before endAt' });

    const comp = await Competition.create({
      name,
      description,
      problems: problems.map(String),
      startAt: start,
      endAt: end,
      visibility,
      createdBy: req.user._id,
      participants: [{ user: req.user._id }],
      scoring: {
        easy: scoring?.easy ?? 1,
        medium: scoring?.medium ?? 2,
        hard: scoring?.hard ?? 3,
      },
      status: computeStatus(start, end),
    });

    res.status(201).json({ competition: comp });
  } catch (err) {
    console.error('Create competition error:', err);
    res.status(500).json({ message: 'Server error creating competition' });
  }
});

// Update a competition (admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    const { name, description, problems, startAt, endAt, visibility, scoring } = req.body || {};

    const comp = await Competition.findById(id);
    if (!comp) return res.status(404).json({ message: 'Competition not found' });

    if (name !== undefined) comp.name = name;
    if (description !== undefined) comp.description = description;
    if (Array.isArray(problems)) comp.problems = problems.map(String);
    if (startAt) comp.startAt = new Date(startAt);
    if (endAt) comp.endAt = new Date(endAt);
    if (visibility) comp.visibility = visibility;
    if (scoring) {
      comp.scoring = {
        easy: scoring?.easy ?? comp.scoring?.easy ?? 1,
        medium: scoring?.medium ?? comp.scoring?.medium ?? 2,
        hard: scoring?.hard ?? comp.scoring?.hard ?? 3,
      };
    }

    if (!(comp.startAt < comp.endAt)) return res.status(400).json({ message: 'startAt must be before endAt' });
    comp.status = computeStatus(comp.startAt, comp.endAt);

    await comp.save();
    res.json({ competition: comp, message: 'Competition updated' });
  } catch (err) {
    console.error('Update competition error:', err);
    res.status(500).json({ message: 'Server error updating competition' });
  }
});

// Get a competition
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    const comp = await Competition.findById(id)
      .populate('createdBy', 'leetcodeUsername avatar')
      .populate('participants.user', 'leetcodeUsername avatar');
    if (!comp) return res.status(404).json({ message: 'Competition not found' });

    // Update status on read
    const status = computeStatus(comp.startAt, comp.endAt);
    if (status !== comp.status) {
      comp.status = status;
      await comp.save();
    }

    res.json({ competition: comp });
  } catch (err) {
    console.error('Get competition error:', err);
    res.status(500).json({ message: 'Server error fetching competition' });
  }
});

// Join a competition
router.post('/:id/join', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    const comp = await Competition.findById(id);
    if (!comp) return res.status(404).json({ message: 'Competition not found' });
    if (computeStatus(comp.startAt, comp.endAt) === 'finished') {
      return res.status(400).json({ message: 'Competition finished' });
    }

    // TODO: enforce visibility=friends (check friendship)
    const already = comp.participants.find((p) => p.user.toString() === req.user._id.toString());
    if (!already) comp.participants.push({ user: req.user._id });
    await comp.save();

    res.json({ message: 'Joined', competition: comp });
  } catch (err) {
    console.error('Join competition error:', err);
    res.status(500).json({ message: 'Server error joining competition' });
  }
});

// Leaderboard
router.get('/:id/leaderboard', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    const comp = await Competition.findById(id).lean();
    if (!comp) return res.status(404).json({ message: 'Competition not found' });

    const participantIds = (comp.participants || []).map((p) => p.user);

    // Aggregate first AC per user per problem within window, limited to competition problems
    const pipeline = [
      {
        $match: {
          user: { $in: participantIds },
          status: 'Accepted',
          createdAt: { $gte: new Date(comp.startAt), $lte: new Date(comp.endAt) },
        },
      },
      // Join to Problem to filter by titleSlug and get difficulty
      {
        $lookup: {
          from: 'problems',
          localField: 'problem',
          foreignField: '_id',
          as: 'problemDoc',
        },
      },
      { $unwind: '$problemDoc' },
      { $match: { 'problemDoc.titleSlug': { $in: comp.problems } } },
      // Get first AC timestamp per (user, problem)
      {
        $sort: { createdAt: 1 },
      },
      {
        $group: {
          _id: { user: '$user', problem: '$problem' },
          firstAt: { $first: '$createdAt' },
          problemDifficulty: { $first: '$problemDoc.difficulty' },
        },
      },
      // Sum user score
      {
        $group: {
          _id: '$_id.user',
          solved: { $sum: 1 },
          easy: { $sum: { $cond: [{ $eq: ['$problemDifficulty', 'Easy'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$problemDifficulty', 'Medium'] }, 1, 0] } },
          hard: { $sum: { $cond: [{ $eq: ['$problemDifficulty', 'Hard'] }, 1, 0] } },
          lastSolveAt: { $max: '$firstAt' },
        },
      },
      // Attach user info
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDoc',
        },
      },
      { $unwind: '$userDoc' },
    ];

    const rows = await Submission.aggregate(pipeline);

    const scoreWeights = comp.scoring || { easy: 1, medium: 2, hard: 3 };
    const leaderboard = rows
      .map((r) => ({
        userId: r._id,
        username: r.userDoc.leetcodeUsername,
        avatar: r.userDoc.avatar,
        solved: r.solved,
        points: r.easy * scoreWeights.easy + r.medium * scoreWeights.medium + r.hard * scoreWeights.hard,
        breakdown: { easy: r.easy, medium: r.medium, hard: r.hard },
        lastSolveAt: r.lastSolveAt,
      }))
      .sort((a, b) => b.points - a.points || (a.lastSolveAt?.getTime?.() || 0) - (b.lastSolveAt?.getTime?.() || 0));

    res.json({ leaderboard, scoring: scoreWeights, participants: participantIds.length, problems: comp.problems, window: { startAt: comp.startAt, endAt: comp.endAt } });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ message: 'Server error computing leaderboard' });
  }
});

// Placeholder sync endpoint (hook for future external sync)
router.post('/:id/sync', auth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: 'Invalid id' });

    const comp = await Competition.findById(id).populate('participants.user', 'leetcodeUsername');
    if (!comp) return res.status(404).json({ message: 'Competition not found' });

    // NOTE: To implement: fetch participants' accepted submissions within window from external API,
    // then upsert into our Submissions collection. For now, rely on existing stored submissions.

    res.status(202).json({ message: 'Sync queued (placeholder). Leaderboard uses stored submissions.' });
  } catch (err) {
    console.error('Sync error:', err);
    res.status(500).json({ message: 'Server error queuing sync' });
  }
});

export default router;
