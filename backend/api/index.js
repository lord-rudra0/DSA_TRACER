import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';

// Reuse existing route modules
import authRoutes from '../routes/auth.js';
import userRoutes from '../routes/user.js';
import problemRoutes from '../routes/problems.js';
import leaderboardRoutes from '../routes/leaderboard.js';
import contestRoutes from '../routes/contest.js';
import statsRoutes from '../routes/stats.js';
import competitionsRoutes from '../routes/competitions.js';
import adminRoutes from '../routes/admin.js';
import seasonRoutes from '../routes/season.js';
import xpRoutes from '../routes/xp.js';

const app = express();

// Basic middleware
app.use(helmet());
// Allow only expected frontends and support Authorization header + preflight
const allowedOrigins = [
  'https://dsa-tracer-rudra.vercel.app',
  'http://localhost:5173'
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // mobile apps/curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
// Explicitly respond to preflight
app.options('*', cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Ensure Mongo connection (no envs are set here; Vercel must provide MONGODB_URI)
if (mongoose.connection.readyState === 0) {
  const uri = process.env.MONGODB_URI || '';
  if (!uri) {
    console.warn('MONGODB_URI not set; API will error on DB access.');
  } else {
    mongoose.connect(uri).catch(err => console.error('Mongo connect error:', err));
  }
}

// Mount routes under /api (same structure as server.js)
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', env: process.env.NODE_ENV || 'unknown', ts: new Date().toISOString() });
});

// Also support routes without the /api prefix (for compatibility with clients)
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/problems', problemRoutes);
app.use('/leaderboard', leaderboardRoutes);
app.use('/contest', contestRoutes);
app.use('/stats', statsRoutes);
app.use('/competitions', competitionsRoutes);
app.use('/admin', adminRoutes);
app.use('/season', seasonRoutes);
app.use('/xp', xpRoutes);
app.get('/health', (req, res) => {
  res.json({ status: 'OK', env: process.env.NODE_ENV || 'unknown', ts: new Date().toISOString() });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

export default app;
