import express from 'express';
import axios from 'axios';
import Problem from '../models/Problem.js';
import Submission from '../models/Submission.js';
import { auth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all problems with filters
router.get('/', optionalAuth, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      difficulty,
      tags,
      search,
      status // solved, unsolved, attempted
    } = req.query;

    let query = {};
    
    // Apply filters
    if (difficulty) {
      query.difficulty = difficulty;
    }
    
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { titleSlug: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    let problems = await Problem.find(query)
      .select('title titleSlug difficulty tags acRate totalSubmissions totalAccepted isPremium')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // If user is authenticated, add solve status
    if (req.user) {
      const userSubmissions = await Submission.find({
        user: req.user._id,
        status: 'Accepted'
      }).distinct('problem');

      problems = problems.map(problem => ({
        ...problem.toObject(),
        solved: userSubmissions.some(submissionProblemId => 
          submissionProblemId.toString() === problem._id.toString()
        )
      }));

      // Apply status filter if provided
      if (status === 'solved') {
        problems = problems.filter(p => p.solved);
      } else if (status === 'unsolved') {
        problems = problems.filter(p => !p.solved);
      }
    }

    const total = await Problem.countDocuments(query);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      problems,
      pagination: {
        current: parseInt(page),
        total: totalPages,
        hasNext: parseInt(page) < totalPages,
        hasPrev: parseInt(page) > 1
      },
      total
    });
  } catch (error) {
    console.error('Get problems error:', error);
    res.status(500).json({ message: 'Server error fetching problems' });
  }
});

// Get problem by slug
router.get('/:titleSlug', optionalAuth, async (req, res) => {
  try {
    const { titleSlug } = req.params;
    
    let problem = await Problem.findOne({ titleSlug });
    
    if (!problem) {
      // Try to fetch from LeetCode API
      try {
        const response = await axios.get(`${process.env.LEETCODE_API_BASE}/select?titleSlug=${titleSlug}`);
        
        if (response.data) {
          const leetcodeProblem = response.data;
          
          // Create new problem in database
          problem = new Problem({
            titleSlug: leetcodeProblem.titleSlug,
            title: leetcodeProblem.title,
            difficulty: leetcodeProblem.difficulty,
            tags: leetcodeProblem.topicTags?.map(tag => tag.name) || [],
            description: leetcodeProblem.content,
            leetcodeId: leetcodeProblem.questionId,
            acRate: leetcodeProblem.acRate,
            categoryTitle: leetcodeProblem.categoryTitle,
            content: leetcodeProblem.content,
            isPremium: leetcodeProblem.isPaidOnly || false
          });
          
          await problem.save();
        }
      } catch (apiError) {
        console.error('LeetCode API error:', apiError);
        return res.status(404).json({ message: 'Problem not found' });
      }
    }

    if (!problem) {
      return res.status(404).json({ message: 'Problem not found' });
    }

    // Add user-specific data if authenticated
    let problemData = problem.toObject();
    
    if (req.user) {
      const userSubmissions = await Submission.find({
        user: req.user._id,
        problem: problem._id
      }).sort({ createdAt: -1 }).limit(10);

      const acceptedSubmission = userSubmissions.find(sub => sub.status === 'Accepted');
      
      problemData.solved = !!acceptedSubmission;
      problemData.attempted = userSubmissions.length > 0;
      problemData.submissions = userSubmissions;
      problemData.lastSubmission = userSubmissions[0];
    }

    res.json(problemData);
  } catch (error) {
    console.error('Get problem error:', error);
    res.status(500).json({ message: 'Server error fetching problem' });
  }
});

// Get daily challenge
router.get('/daily/challenge', async (req, res) => {
  try {
    // Try to get from LeetCode API
    try {
      const response = await axios.get(`${process.env.LEETCODE_API_BASE}/daily`);
      
      if (response.data) {
        const dailyChallenge = response.data;
        
        // Update or create in database
        let problem = await Problem.findOne({ titleSlug: dailyChallenge.titleSlug });
        
        if (!problem) {
          problem = new Problem({
            titleSlug: dailyChallenge.titleSlug,
            title: dailyChallenge.title,
            difficulty: dailyChallenge.difficulty,
            tags: dailyChallenge.topicTags?.map(tag => tag.name) || [],
            leetcodeId: dailyChallenge.questionId,
            acRate: dailyChallenge.acRate,
            isPremium: dailyChallenge.isPaidOnly || false
          });
        }
        
        problem.isDailyChallenge = true;
        problem.dailyChallengeDate = new Date();
        await problem.save();
        
        res.json({
          ...problem.toObject(),
          date: dailyChallenge.date,
          link: dailyChallenge.link
        });
      }
    } catch (apiError) {
      console.error('Daily challenge API error:', apiError);
      
      // Fallback to database
      const dailyProblem = await Problem.findOne({
        isDailyChallenge: true,
        dailyChallengeDate: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0))
        }
      });
      
      if (dailyProblem) {
        res.json(dailyProblem);
      } else {
        res.status(404).json({ message: 'Daily challenge not found' });
      }
    }
  } catch (error) {
    console.error('Get daily challenge error:', error);
    res.status(500).json({ message: 'Server error fetching daily challenge' });
  }
});

// Get problem tags
router.get('/meta/tags', async (req, res) => {
  try {
    const tags = await Problem.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { name: '$_id', count: 1, _id: 0 } }
    ]);

    res.json(tags);
  } catch (error) {
    console.error('Get tags error:', error);
    res.status(500).json({ message: 'Server error fetching tags' });
  }
});

// Get problem statistics
router.get('/meta/stats', async (req, res) => {
  try {
    const stats = await Problem.aggregate([
      {
        $group: {
          _id: '$difficulty',
          count: { $sum: 1 },
          avgAcceptanceRate: { $avg: '$acRate' }
        }
      }
    ]);

    const total = await Problem.countDocuments();
    
    res.json({
      total,
      byDifficulty: stats,
      lastUpdated: new Date()
    });
  } catch (error) {
    console.error('Get problem stats error:', error);
    res.status(500).json({ message: 'Server error fetching problem statistics' });
  }
});

export default router;