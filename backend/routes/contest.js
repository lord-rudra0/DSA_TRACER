import express from 'express';
import axios from 'axios';
import User from '../models/User.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get contest list
router.get('/', async (req, res) => {
  try {
    const response = await axios.get(`${process.env.LEETCODE_API_BASE}/contest`);
    const contests = response.data;

    res.json({
      contests: contests || [],
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Get contests error:', error);
    res.status(500).json({ message: 'Server error fetching contests' });
  }
});

// Get user contest history
router.get('/history/:leetcodeUsername', optionalAuth, async (req, res) => {
  try {
    const { leetcodeUsername } = req.params;
    
    // Get contest history from LeetCode API
    const response = await axios.get(`${process.env.LEETCODE_API_BASE}/contest/history/${leetcodeUsername}`);
    const contestHistory = response.data;

    if (!contestHistory || contestHistory.errors) {
      return res.status(404).json({ message: 'Contest history not found' });
    }

    // Get user from database to check if it's the current user or privacy settings
    const user = await User.findOne({ leetcodeUsername });
    
    // Check privacy if not the current user
    if (user && req.user && user._id.toString() !== req.user._id.toString()) {
      if (!user.settings.privacy.showStats) {
        return res.status(403).json({ message: 'Contest history is private' });
      }
    }

    res.json({
      contestHistory: contestHistory.contestHistory || [],
      totalContests: contestHistory.totalContests || 0,
      rating: contestHistory.rating || 0,
      ranking: contestHistory.ranking || 0,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Get contest history error:', error);
    if (error.response?.status === 404) {
      res.status(404).json({ message: 'User not found or no contest history' });
    } else {
      res.status(500).json({ message: 'Server error fetching contest history' });
    }
  }
});

// Get user contest ranking info summary (specific route placed before generic id routes)
router.get('/userContestRankingInfo/:leetcodeUsername', async (req, res) => {
  try {
    const { leetcodeUsername } = req.params;
    const response = await axios.get(`${process.env.LEETCODE_API_BASE}/userContestRankingInfo/${encodeURIComponent(leetcodeUsername)}`);
    const data = response.data;
    if (!data || data.errors) {
      return res.status(404).json({ message: 'Ranking info not found' });
    }
    res.json({ rankingInfo: data, lastUpdated: new Date() });
  } catch (error) {
    console.error('Get userContestRankingInfo error:', error);
    if (error.response?.status === 404) return res.status(404).json({ message: 'User not found' });
    res.status(500).json({ message: 'Server error fetching ranking info' });
  }
});

// Alias path: '/:leetcodeUsername/contest/history' -> same as '/history/:leetcodeUsername'
router.get('/:leetcodeUsername/contest/history', optionalAuth, async (req, res) => {
  try {
    const { leetcodeUsername } = req.params;
    const response = await axios.get(`${process.env.LEETCODE_API_BASE}/contest/history/${encodeURIComponent(leetcodeUsername)}`);
    const contestHistory = response.data;
    if (!contestHistory || contestHistory.errors) {
      return res.status(404).json({ message: 'Contest history not found' });
    }

    const user = await User.findOne({ leetcodeUsername });
    if (user && req.user && user._id.toString() !== req.user._id.toString()) {
      if (!user.settings.privacy.showStats) {
        return res.status(403).json({ message: 'Contest history is private' });
      }
    }

    res.json({
      contestHistory: contestHistory.contestHistory || [],
      totalContests: contestHistory.totalContests || 0,
      rating: contestHistory.rating || 0,
      ranking: contestHistory.ranking || 0,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Alias get contest history error:', error);
    if (error.response?.status === 404) return res.status(404).json({ message: 'User not found or no contest history' });
    res.status(500).json({ message: 'Server error fetching contest history' });
  }
});

// Combined overview: '/:leetcodeUsername/contest' -> ranking info + recent history
router.get('/:leetcodeUsername/contest', async (req, res) => {
  try {
    const { leetcodeUsername } = req.params;
    const [rankingRes, historyRes] = await Promise.allSettled([
      axios.get(`${process.env.LEETCODE_API_BASE}/userContestRankingInfo/${encodeURIComponent(leetcodeUsername)}`),
      axios.get(`${process.env.LEETCODE_API_BASE}/contest/history/${encodeURIComponent(leetcodeUsername)}`)
    ]);

    const rankingInfo = rankingRes.status === 'fulfilled' ? rankingRes.value.data : null;
    const history = historyRes.status === 'fulfilled' ? historyRes.value.data : null;

    if (!rankingInfo && (!history || !history.contestHistory)) {
      return res.status(404).json({ message: 'No contest data found for user' });
    }

    res.json({
      leetcodeUsername,
      rankingInfo: rankingInfo || {},
      recentHistory: (history?.contestHistory || []).slice(0, 10),
      totals: {
        totalContests: history?.totalContests || 0,
        rating: history?.rating || rankingInfo?.rating || 0,
        ranking: history?.ranking || rankingInfo?.ranking || 0
      },
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Get user contest overview error:', error);
    res.status(500).json({ message: 'Server error fetching user contest overview' });
  }
});

// Get contest ranking
router.get('/:contestId/ranking', async (req, res) => {
  try {
    const { contestId } = req.params;
    const { page = 1, limit = 25 } = req.query;

    // Note: This endpoint might not be available in the API
    // Returning placeholder data structure
    res.json({
      ranking: [],
      pagination: {
        current: parseInt(page),
        total: 0,
        hasNext: false,
        hasPrev: false
      },
      contestInfo: {
        id: contestId,
        title: `Contest ${contestId}`,
        startTime: new Date(),
        duration: 90 * 60, // 90 minutes in seconds
        participants: 0
      }
    });
  } catch (error) {
    console.error('Get contest ranking error:', error);
    res.status(500).json({ message: 'Server error fetching contest ranking' });
  }
});

// Get contest statistics
router.get('/stats/global', async (req, res) => {
  try {
    // Calculate global contest statistics from user data
    const stats = await User.aggregate([
      { $match: { contestsAttended: { $gt: 0 } } },
      {
        $group: {
          _id: null,
          totalParticipants: { $sum: 1 },
          avgRating: { $avg: '$contestRating' },
          avgContests: { $avg: '$contestsAttended' },
          maxRating: { $max: '$contestRating' },
          totalContests: { $sum: '$contestsAttended' }
        }
      }
    ]);

    const topRated = await User.find({ contestRating: { $gt: 0 } })
      .select('leetcodeUsername avatar contestRating contestsAttended')
      .sort({ contestRating: -1 })
      .limit(10);

    const mostActive = await User.find({ contestsAttended: { $gt: 0 } })
      .select('leetcodeUsername avatar contestsAttended contestRating')
      .sort({ contestsAttended: -1 })
      .limit(10);

    res.json({
      overview: stats[0] || {
        totalParticipants: 0,
        avgRating: 0,
        avgContests: 0,
        maxRating: 0,
        totalContests: 0
      },
      topRated,
      mostActive,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Get contest stats error:', error);
    res.status(500).json({ message: 'Server error fetching contest statistics' });
  }
});

// Optional: Trending discussion topics
router.get('/trendingDiscuss', async (req, res) => {
  try {
    const first = req.query.first || 20;
    const response = await axios.get(`${process.env.LEETCODE_API_BASE}/trendingDiscuss?first=${encodeURIComponent(first)}`);
    res.json({ topics: response.data?.trendingDiscussionTopics || response.data || [], lastUpdated: new Date() });
  } catch (error) {
    console.error('Get trending discuss error:', error);
    res.status(500).json({ message: 'Server error fetching trending discussions' });
  }
});

// Optional: Discuss topic details
router.get('/discussTopic/:topicId', async (req, res) => {
  try {
    const { topicId } = req.params;
    const response = await axios.get(`${process.env.LEETCODE_API_BASE}/discussTopic/${topicId}`);
    if (!response.data) return res.status(404).json({ message: 'Topic not found' });
    res.json({ topic: response.data, lastUpdated: new Date() });
  } catch (error) {
    console.error('Get discuss topic error:', error);
    if (error.response?.status === 404) return res.status(404).json({ message: 'Topic not found' });
    res.status(500).json({ message: 'Server error fetching discuss topic' });
  }
});

// Optional: Discuss comments
router.get('/discussComments/:topicId', async (req, res) => {
  try {
    const { topicId } = req.params;
    const response = await axios.get(`${process.env.LEETCODE_API_BASE}/discussComments/${topicId}`);
    res.json({ comments: response.data?.comments || response.data || [], lastUpdated: new Date() });
  } catch (error) {
    console.error('Get discuss comments error:', error);
    res.status(500).json({ message: 'Server error fetching discuss comments' });
  }
});

export default router;