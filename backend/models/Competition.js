import mongoose from 'mongoose';

const competitionSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  problems: [{ type: String, required: true }], // LeetCode titleSlugs
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  visibility: { type: String, enum: ['public', 'friends', 'private'], default: 'public' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  participants: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      joinedAt: { type: Date, default: Date.now },
    },
  ],
  scoring: {
    easy: { type: Number, default: 1 },
    medium: { type: Number, default: 2 },
    hard: { type: Number, default: 3 },
  },
  status: { type: String, enum: ['scheduled', 'ongoing', 'finished'], default: 'scheduled' },
}, { timestamps: true });

competitionSchema.index({ startAt: 1, endAt: 1 });
competitionSchema.index({ 'participants.user': 1 });

export default mongoose.model('Competition', competitionSchema);
