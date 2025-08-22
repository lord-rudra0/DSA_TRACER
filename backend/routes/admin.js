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

// Act on a request (approve/reject). Optionally grant admin on approve if grantRole=true
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

    // Optional role grant if explicitly requested
    const grantRole = (req.query.grantRole === 'true');
    if (grantRole && action === 'approve') {
      const targetUser = await User.findById(r.user);
      if (!targetUser) return res.status(404).json({ message: 'User not found' });
      if (targetUser.role !== 'admin') {
        targetUser.role = 'admin';
        await targetUser.save();
      }
      roleUpdate = { promoted: true, userId: String(targetUser._id) };
    }

    return res.json({ message: `Request ${r.status}`, request: r, roleUpdate });
  } catch (e) {
    console.error('Admin request action error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Explicit controlled promotion endpoint (principal admin only)
// Accepts either userId or email
router.post('/promote', auth, requirePrincipalAdmin, async (req, res) => {
  try {
    const { userId, email } = req.body || {};
    let targetUser = null;
    if (userId) targetUser = await User.findById(userId);
    else if (email) targetUser = await User.findOne({ email });
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if (targetUser.role !== 'admin') {
      targetUser.role = 'admin';
      await targetUser.save();
    }
    return res.json({ message: 'User promoted to admin', user: { id: targetUser._id, email: targetUser.email, role: targetUser.role } });
  } catch (e) {
    console.error('Promote user error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

// Demote endpoint (principal admin only). Cannot demote the principal admin (ADMIN_EMAIL)
router.post('/demote', auth, requirePrincipalAdmin, async (req, res) => {
  try {
    const { userId, email } = req.body || {};
    let targetUser = null;
    if (userId) targetUser = await User.findById(userId);
    else if (email) targetUser = await User.findOne({ email });
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    const principal = (process.env.ADMIN_EMAIL || '').toLowerCase();
    if (targetUser.email?.toLowerCase() === principal) {
      return res.status(400).json({ message: 'Cannot demote the principal admin' });
    }
    if (targetUser.role !== 'user') {
      targetUser.role = 'user';
      await targetUser.save();
    }
    return res.json({ message: 'User demoted to normal user', user: { id: targetUser._id, email: targetUser.email, role: targetUser.role } });
  } catch (e) {
    console.error('Demote user error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
