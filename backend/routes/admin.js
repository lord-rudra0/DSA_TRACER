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
    return res.json({ message: `Request ${r.status}`, request: r });
  } catch (e) {
    console.error('Admin request action error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;
