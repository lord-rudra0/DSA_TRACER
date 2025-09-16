import express from 'express';
import { auth } from '../middleware/auth.js';
import Feed from '../models/Feed.js';
import User from '../models/User.js';

const router = express.Router();

// Create a new feed post (auth)
router.post('/', auth, async (req, res) => {
  try {
    const { type = 'text', text = '', meta = {} } = req.body;
    const post = new Feed({ user: req.user._id, type, text, meta });
    await post.save();
    const populated = await post.populate('user', 'leetcodeUsername avatar xp level');
    res.status(201).json({ post: populated });
  } catch (err) {
    console.error('Create feed error:', err);
    res.status(500).json({ message: 'Server error creating post' });
  }
});

// Get feed for current user (friends + self) - paginated
router.get('/', auth, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const limit = Math.min(50, parseInt(req.query.limit || '20'));
    const skip = (page - 1) * limit;

    // Build list of user ids: self + friends
    const me = await User.findById(req.user._id).select('friends');
    const friendIds = (me.friends || []).map(f => f.user.toString());
    const ids = [req.user._id.toString(), ...friendIds];

    const posts = await Feed.find({ user: { $in: ids } })
      .sort({ createdAt: -1 })
      .skip(skip).limit(limit)
      .populate('user', 'leetcodeUsername avatar xp level')
      .lean();

    const total = await Feed.countDocuments({ user: { $in: ids } });
    res.json({ items: posts, page, limit, total });
  } catch (err) {
    console.error('Get feed error:', err);
    res.status(500).json({ message: 'Server error fetching feed' });
  }
});

// Like/unlike a post
router.post('/:id/like', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Feed.findById(id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const idx = post.likes.findIndex(u => u.toString() === req.user._id.toString());
    if (idx === -1) {
      post.likes.push(req.user._id);
    } else {
      post.likes.splice(idx, 1);
    }
    await post.save();
    res.json({ likes: post.likes.length });
  } catch (err) {
    console.error('Like post error:', err);
    res.status(500).json({ message: 'Server error liking post' });
  }
});

// Comment on a post
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { text } = req.body;
    const post = await Feed.findById(id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    post.comments.push({ user: req.user._id, text, createdAt: new Date() });
    await post.save();
    res.json({ comments: post.comments });
  } catch (err) {
    console.error('Comment error:', err);
    res.status(500).json({ message: 'Server error commenting' });
  }
});

export default router;
