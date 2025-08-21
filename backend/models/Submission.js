import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  problem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Problem',
    required: true
  },
  problemTitle: String,
  problemDifficulty: String,
  
  // Submission details
  code: String,
  language: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Accepted', 'Wrong Answer', 'Time Limit Exceeded', 'Runtime Error', 'Compile Error', 'Memory Limit Exceeded'],
    required: true
  },
  runtime: String,
  memory: String,
  
  // LeetCode sync data
  leetcodeSubmissionId: String,
  timestamp: Number,
  
  // XP and achievements
  xpEarned: {
    type: Number,
    default: 0
  },
  firstAccepted: {
    type: Boolean,
    default: false
  },
  
  // Contest submission
  isContest: {
    type: Boolean,
    default: false
  },
  contestId: String,
  contestRank: Number
}, {
  timestamps: true
});

// Indexes
submissionSchema.index({ user: 1, createdAt: -1 });
submissionSchema.index({ problem: 1, user: 1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ createdAt: -1 });
submissionSchema.index({ leetcodeSubmissionId: 1 });

export default mongoose.model('Submission', submissionSchema);