import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  problems: [{ titleSlug: String, title: String, difficulty: String }],
  numProblems: { type: Number, default: 0 },
  timeTakenSeconds: { type: Number, default: 0 },
  timeLimitSeconds: { type: Number, default: 0 },
  xpAwarded: { type: Number, default: 0 },
  success: { type: Boolean, default: false }
}, { timestamps: true });

challengeSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('Challenge', challengeSchema);
