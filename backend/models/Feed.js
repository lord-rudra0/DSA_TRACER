import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  text: String,
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const feedSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['text','share_problem','share_challenge'], default: 'text' },
  text: { type: String, default: '' },
  meta: { type: Object }, // e.g., { titleSlug, title, difficulty } or challenge id
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [commentSchema]
}, { timestamps: true });

feedSchema.index({ createdAt: -1 });

export default mongoose.model('Feed', feedSchema);
