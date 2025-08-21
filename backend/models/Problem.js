import mongoose from 'mongoose';

const problemSchema = new mongoose.Schema({
  titleSlug: {
    type: String,
    required: true,
    unique: true
  },
  title: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard'],
    required: true
  },
  tags: [{
    type: String,
    required: true
  }],
  description: String,
  examples: [{
    input: String,
    output: String,
    explanation: String
  }],
  constraints: [String],
  hints: [String],
  
  // LeetCode specific data
  leetcodeId: Number,
  acRate: Number,
  categoryTitle: String,
  content: String,
  
  // Stats
  totalSubmissions: {
    type: Number,
    default: 0
  },
  totalAccepted: {
    type: Number,
    default: 0
  },
  
  // Company tags
  companies: [String],
  
  // External links
  externalLinks: [{
    platform: {
      type: String,
      enum: ['leetcode', 'hackerrank', 'codechef', 'codeforces', 'atcoder', 'geeksforgeeks'],
      required: true
    },
    url: {
      type: String,
      required: true
    }
  }],
  
  // Daily challenge tracking
  isDailyChallenge: {
    type: Boolean,
    default: false
  },
  dailyChallengeDate: Date,
  
  // Solution tracking
  hasSolution: {
    type: Boolean,
    default: false
  },
  solutionLanguages: [String],
  
  // Metadata
  isPremium: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  }
}, {
  timestamps: true
});

// Indexes
problemSchema.index({ titleSlug: 1 });
problemSchema.index({ difficulty: 1 });
problemSchema.index({ tags: 1 });
problemSchema.index({ isDailyChallenge: 1, dailyChallengeDate: -1 });
problemSchema.index({ createdAt: -1 });

export default mongoose.model('Problem', problemSchema);