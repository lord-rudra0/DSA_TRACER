import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import User from '../models/User.js';
import Problem from '../models/Problem.js';
import Submission from '../models/Submission.js';
import { auth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { email, password, firstName, lastName, leetcodeUsername } = req.body;

    // Validation
    if (!email || !password || !leetcodeUsername) {
      return res.status(400).json({ message: 'Please provide email, password, and LeetCode username' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ $or: [{ email }, { leetcodeUsername }] });

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.email === email ? 'Email already exists' : 'LeetCode username already exists'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user with role (admin if email matches ADMIN_EMAIL)
    const role = (process.env.ADMIN_EMAIL && email.toLowerCase() === process.env.ADMIN_EMAIL.toLowerCase())
      ? 'admin'
      : 'user';
    const user = new User({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      leetcodeUsername,
      role
    });

    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        leetcodeUsername: user.leetcodeUsername,
        role: user.role
      }
    });

    // Fire-and-forget: auto-sync LeetCode profile + recent submissions (does not block response)
    setTimeout(async () => {
      try {
        const handle = user.leetcodeUsername?.trim();
        if (!handle || !process.env.LEETCODE_API_BASE) return;

        // Fetch user profile
        try {
          const profileRes = await axios.get(`${process.env.LEETCODE_API_BASE}/${handle}`);
          const data = profileRes.data || {};
          const fresh = await User.findById(user._id);
          if (!fresh) return;
          fresh.totalProblems = data.totalSolved || 0;
          fresh.easySolved = data.easySolved || 0;
          fresh.mediumSolved = data.mediumSolved || 0;
          fresh.hardSolved = data.hardSolved || 0;
          fresh.contestRating = data.contestRating || 0;
          fresh.lastLeetCodeSync = new Date();
          fresh.leetCodeData = {
            ranking: data.ranking,
            acceptanceRate: data.acceptanceRate,
            contributionPoints: data.contributionPoints
          };
          const newXP = (fresh.easySolved * 10) + (fresh.mediumSolved * 20) + (fresh.hardSolved * 30);
          fresh.xp = Math.max(fresh.xp, newXP);
          fresh.checkLevelUp();
          await fresh.save();
        } catch (e) {
          console.warn('Post-register profile sync failed:', e?.message || e);
        }

        // Fetch recent submissions and store up to 200
        try {
          const submissionsResponse = await axios.get(`${process.env.LEETCODE_API_BASE}/${handle}/submission`);
          const recentSubmissions = submissionsResponse.data?.submission || [];
          for (const submission of recentSubmissions.slice(0, 200)) {
            const exists = await Submission.findOne({ user: user._id, leetcodeSubmissionId: submission.id });
            if (exists) continue;
            let problem = await Problem.findOne({ titleSlug: submission.titleSlug });
            if (!problem) {
              problem = new Problem({
                titleSlug: submission.titleSlug,
                title: submission.title,
                difficulty: 'Unknown',
                tags: []
              });
              await problem.save();
            }
            const newSubmission = new Submission({
              user: user._id,
              problem: problem._id,
              problemTitle: submission.title,
              problemDifficulty: problem.difficulty,
              language: submission.lang,
              status: submission.statusDisplay,
              runtime: submission.runtime,
              memory: submission.memory,
              leetcodeSubmissionId: submission.id,
              timestamp: submission.timestamp,
              firstAccepted: submission.statusDisplay === 'Accepted'
            });
            await newSubmission.save();
          }
        } catch (e) {
          console.warn('Post-register submissions sync failed:', e?.message || e);
        }
      } catch (e) {
        console.warn('Post-register sync error:', e?.message || e);
      }
    }, 0);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Update last active and ensure only ADMIN_EMAIL can be admin
    user.lastActive = new Date();
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    if (user.role === 'admin' && adminEmail && user.email?.toLowerCase() !== adminEmail) {
      user.role = 'user';
    }
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        leetcodeUsername: user.leetcodeUsername,
        xp: user.xp,
        level: user.level,
        currentStreak: user.currentStreak,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password')
      .populate('friends.user', 'leetcodeUsername avatar xp level');

    res.json({
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        avatar: user.avatar,
        bio: user.bio,
        location: user.location,
        website: user.website,
        leetcodeUsername: user.leetcodeUsername,
        xp: user.xp,
        level: user.level,
        currentStreak: user.currentStreak,
        maxStreak: user.maxStreak,
        totalProblems: user.totalProblems,
        easySolved: user.easySolved,
        mediumSolved: user.mediumSolved,
        hardSolved: user.hardSolved,
        badges: user.badges,
        contestRating: user.contestRating,
        contestsAttended: user.contestsAttended,
        preferredLanguages: user.preferredLanguages,
        focusAreas: user.focusAreas,
        friends: user.friends,
        settings: user.settings,
        lastLeetCodeSync: user.lastLeetCodeSync,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error fetching user data' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const updates = req.body || {};
    const allowedUpdates = [
      'firstName', 'lastName', 'bio', 'location', 'website',
      'preferredLanguages', 'focusAreas', 'avatar', 'email'
    ];

    // Filter allowed updates (leetcodeUsername is intentionally excluded here)
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Uniqueness check for email if it is being updated
    if (filteredUpdates.email) {
      const exists = await User.findOne({ email: filteredUpdates.email, _id: { $ne: req.user._id } });
      if (exists) {
        return res.status(400).json({ message: 'Email already exists' });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      filteredUpdates,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error updating profile' });
  }
});

// Change password
router.put('/password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please provide current and new password' });
    }

    const user = await User.findById(req.user._id);
    
    // Check current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
    
    user.password = hashedPassword;
    await user.save();

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error changing password' });
  }
});

// --- Admin utilities ---
// 1) Protected admin ping to verify auth flow
router.get('/admin/ping', auth, requireAdmin, (req, res) => {
  res.json({ ok: true, message: 'Admin OK', userId: req.user._id });
});

// 2) One-time admin bootstrap: promote a user to admin using a setup token
//    Header: X-Admin-Setup-Token: <ADMIN_SETUP_TOKEN>
//    Body: { email }
router.post('/admin/bootstrap', async (req, res) => {
  try {
    const setupToken = req.header('X-Admin-Setup-Token');
    if (!process.env.ADMIN_SETUP_TOKEN || setupToken !== process.env.ADMIN_SETUP_TOKEN) {
      return res.status(403).json({ message: 'Invalid setup token' });
    }
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const targetEmail = email.toLowerCase();
    const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
    if (!adminEmail || targetEmail !== adminEmail) {
      return res.status(403).json({ message: 'Only ADMIN_EMAIL can be promoted' });
    }
    const user = await User.findOne({ email: targetEmail });
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.role = 'admin';
    await user.save();
    return res.json({ message: 'User promoted to admin', userId: user._id });
  } catch (e) {
    console.error('Admin bootstrap error:', e);
    return res.status(500).json({ message: 'Server error' });
  }
});

export default router;