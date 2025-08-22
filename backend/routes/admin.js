import express from 'express';
import AdminRequest from '../models/AdminRequest.js';
import User from '../models/User.js';
import { auth, requirePrincipalAdmin } from '../middleware/auth.js';

const router = express.Router();

// Create a request to contact/prioritize admin (any logged-in user)
router.post('/requests', auth, async (req, res) => {
  try {
    const { note = '' } = req.body || {};
    const existing = await AdminRequest.findOne({ user: req.user._id, status: 'pending' });
    if (existing) return res.status(400).json({ message: 'You already have a pending request' });
    const r = await AdminRequest.create({ user: req.user._id, note });
    return res.status(201).json({ message: 'Request submitted', request: r });
  } catch (e) {
    console.error('Create admin request error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Get current user's requests
router.get('/requests/mine', auth, async (req, res) => {
  try {
    const requests = await AdminRequest.find({ user: req.user._id }).sort({ createdAt: -1 });
    return res.json({ requests });
  } catch (e) {
    console.error('My admin requests error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// List requests (principal admin only)
router.get('/requests', auth, requirePrincipalAdmin, async (req, res) => {
  try {
    const requests = await AdminRequest.find({}).sort({ createdAt: -1 }).populate('user', 'email leetcodeUsername avatar role');
    return res.json({ requests });
  } catch (e) {
    console.error('List admin requests error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Pending count (principal admin only)
router.get('/requests/pending/count', auth, requirePrincipalAdmin, async (req, res) => {
  try {
    const count = await AdminRequest.countDocuments({ status: 'pending' });
    return res.json({ count });
  } catch (e) {
    console.error('Pending count error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Act on a request (approve/reject) — does NOT grant admin; only marks status
router.post('/requests/:id/:action', auth, requirePrincipalAdmin, async (req, res) => {
  try {
    const { id, action } = req.params;
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'Invalid action' });
    }
    const r = await AdminRequest.findById(id);
    if (!r) return res.status(404).json({ message: 'Request not found' });
    if (r.status !== 'pending') return res.status(400).json({ message: 'Request already resolved' });
    r.status = action === 'approve' ? 'approved' : 'rejected';
    await r.save();
    let roleUpdate = null;

    // Optional role grant if explicitly requested and policy allows
    const grantRole = (req.query.grantRole === 'true');
    if (grantRole && action === 'approve') {
      const targetUser = await User.findById(r.user);
      if (!targetUser) return res.status(404).json({ message: 'User not found' });
      // Policy: only ADMIN_EMAIL may be an admin
      if (targetUser.email === process.env.ADMIN_EMAIL) {
        if (targetUser.role !== 'admin') {
          targetUser.role = 'admin';
          await targetUser.save();
        }
        roleUpdate = { promoted: true, userId: String(targetUser._id) };
      } else {
        roleUpdate = { promoted: false, reason: 'Only principal admin (ADMIN_EMAIL) can have admin role per policy.' };
      }
    }

    return res.json({ message: `Request ${r.status}`, request: r, roleUpdate });
  } catch (e) {
    console.error('Admin request action error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Explicit controlled promotion endpoint (principal admin only)
// Note: Policy enforcement — only ADMIN_EMAIL can be admin. Others will be rejected.
router.post('/promote', auth, requirePrincipalAdmin, async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    const targetUser = await User.findById(userId);
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if (targetUser.email !== process.env.ADMIN_EMAIL) {
      return res.status(400).json({ message: 'Only the principal admin (ADMIN_EMAIL) can have admin role per policy' });
    }
    if (targetUser.role !== 'admin') {
      targetUser.role = 'admin';
      await targetUser.save();
    }
    return res.json({ message: 'User granted admin (principal admin)', user: { id: targetUser._id, email: targetUser.email, role: targetUser.role } });
  } catch (e) {
    console.error('Promote user error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
