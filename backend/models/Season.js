import mongoose from 'mongoose';

const seasonSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true }, // e.g., 2025-08
  type: { type: String, enum: ['monthly', 'quarterly'], default: 'monthly' },
  startAt: { type: Date, required: true },
  endAt: { type: Date, required: true },
  status: { type: String, enum: ['active', 'closed'], default: 'active' },
}, { timestamps: true });

export default mongoose.model('Season', seasonSchema);
