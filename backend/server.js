import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import problemRoutes from './routes/problems.js';
import leaderboardRoutes from './routes/leaderboard.js';
import contestRoutes from './routes/contest.js';
import statsRoutes from './routes/stats.js';
import competitionsRoutes from './routes/competitions.js';
import adminRoutes from './routes/admin.js';
import seasonRoutes from './routes/season.js';
import xpRoutes from './routes/xp.js';
import leetcodeRoutes from './routes/leetcode.js';
import User from './models/User.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? 'https://your-domain.com' 
    : 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dsa-tracker')
  .then(() => {
    console.log('MongoDB connected successfully');
    // Start background auto-sync after DB is connected
    try {
      startAutoSyncScheduler();
    } catch (e) {
      console.warn('Failed to start auto-sync scheduler:', e?.message || e);
    }
  })
  .catch(err => console.error('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/contest', contestRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/competitions', competitionsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/season', seasonRoutes);
app.use('/api/xp', xpRoutes);
app.use('/api/leetcode', leetcodeRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// --- Auto Sync Scheduler ---
function startAutoSyncScheduler() {
  const intervalMs = 5 * 60 * 1000; // 5 minutes
  const batchSize = 10; // limit per tick
  if (!process.env.JWT_SECRET) {
    console.warn('⚠️  JWT_SECRET not set; auto-sync disabled.');
    return;
  }
  setInterval(async () => {
    try {
      const cutoff = new Date(Date.now() - intervalMs);
      const candidates = await User.find({
        leetcodeUsername: { $exists: true, $ne: '' },
        $or: [
          { lastLeetCodeSync: { $lt: cutoff } },
          { lastLeetCodeSync: { $exists: false } }
        ]
      })
        .select('_id leetcodeUsername')
        .limit(batchSize)
        .lean();

      if (!candidates.length) return;

      for (const u of candidates) {
        try {
          const token = jwt.sign({ userId: u._id }, process.env.JWT_SECRET, { expiresIn: '10m' });
          await axios.post(`http://localhost:${PORT}/api/users/sync-leetcode`,
            { leetcodeUsername: u.leetcodeUsername },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          console.log(`✅ Auto-synced ${u.leetcodeUsername}`);
        } catch (e) {
          const msg = e?.response?.data?.message || e?.message || e;
          console.warn(`⚠️  Auto-sync failed for ${u.leetcodeUsername}:`, msg);
        }
      }
    } catch (e) {
      console.warn('Auto-sync scheduler error:', e?.message || e);
    }
  }, intervalMs);
  console.log(`⏱️  Auto-sync scheduler started (every ${intervalMs / 60000} min).`);
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 API available at http://localhost:${PORT}/api`);
  if (process.env.LEETCODE_API_BASE) {
    console.log(`🌐 LEETCODE_API_BASE set to: ${process.env.LEETCODE_API_BASE}`);
  } else {
    console.warn('⚠️  LEETCODE_API_BASE is NOT set. External LeetCode proxy will be disabled.');
  }
  if (process.env.ADMIN_EMAIL) {
    console.log(`🔐 ADMIN_EMAIL configured`);
  }
});