import mongoose from 'mongoose';

const xpLogSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  delta: { type: Number, required: true },
  reason: { type: String, required: true }, // e.g., 'competition_create', 'admin_approve', 'solve_easy'
  meta: { type: Object },
}, { timestamps: true });

xpLogSchema.index({ user: 1, createdAt: -1 });

export default mongoose.model('XpLog', xpLogSchema);
