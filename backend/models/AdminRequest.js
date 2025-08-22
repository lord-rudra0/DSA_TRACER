import mongoose from 'mongoose';

const adminRequestSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  note: { type: String, maxlength: 500, default: '' },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

adminRequestSchema.index({ createdAt: -1 });

export default mongoose.model('AdminRequest', adminRequestSchema);
