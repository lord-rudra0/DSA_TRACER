import express from 'express';
import axios from 'axios';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();
const SHOULD_LOG_PROXY = process.env.LOG_EXTERNAL_PROXY === 'true';

// GET Top Interview 150 (best-effort via Alfa API tag filter)
router.get('/top-interview-150', optionalAuth, async (req, res) => {
  try {
    const base = process.env.LEETCODE_API_BASE;
    if (!base) {
      return res.status(503).json({ message: 'External LeetCode API not configured' });
    }

    // Alfa API supports tags and limit. The closest tag is "top-interview-questions".
    const url = `${base}/problems?tags=top-interview-questions&limit=150`;
    if (SHOULD_LOG_PROXY) console.log('[LeetCode] Proxy Top Interview 150 ->', url);
    const extRes = await axios.get(url);

    // Normalize different possible shapes
    let items = [];
    if (Array.isArray(extRes.data?.problems)) items = extRes.data.problems;
    else if (Array.isArray(extRes.data?.problemsetQuestionList)) items = extRes.data.problemsetQuestionList;
    else if (Array.isArray(extRes.data)) items = extRes.data;

    const mapped = items.map((q) => {
      const topicTags = q.topicTags || q.tags || [];
      const tagsArr = Array.isArray(topicTags)
        ? topicTags.map(t => (typeof t === 'string' ? t : (t?.name || t?.slug || ''))).filter(Boolean)
        : [];
      const diff = (q.difficulty || '').toString().toUpperCase();
      const diffPretty = diff === 'EASY' ? 'Easy' : diff === 'MEDIUM' ? 'Medium' : diff === 'HARD' ? 'Hard' : (q.difficulty || '');
      return {
        title: q.title || q.questionTitle || q.titleSlug || 'Untitled',
        titleSlug: q.titleSlug || q.slug || q.questionSlug,
        difficulty: diffPretty,
        tags: tagsArr,
        acRate: q.acRate ?? q.acceptanceRate ?? null,
        isPremium: q.isPaidOnly ?? q.paidOnly ?? false,
      };
    }).filter(p => p.titleSlug);

    return res.json({ problems: mapped });
  } catch (error) {
    const msg = error?.response?.data || error?.message || 'Failed fetching Top Interview 150';
    if (SHOULD_LOG_PROXY) console.error('[LeetCode] Top Interview 150 error:', msg);
    return res.status(500).json({ message: 'Failed to fetch Top Interview 150' });
  }
});

export default router;


