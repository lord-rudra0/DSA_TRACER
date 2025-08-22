import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: false,
    unique: false,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId && !this.githubId;
    },
    minlength: 6
  },
  avatar: {
    type: String,
    default: ''
  },
  leetcodeUsername: {
    type: String,
    trim: true,
    required: true,
    unique: true
  },
  // OAuth fields
  googleId: String,
  githubId: String,
  
  // Profile fields
  firstName: String,
  lastName: String,
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  location: String,
  website: String,
  
  // Progress tracking
  totalProblems: {
    type: Number,
    default: 0
  },
  easySolved: {
    type: Number,
    default: 0
  },
  mediumSolved: {
    type: Number,
    default: 0
  },
  hardSolved: {
    type: Number,
    default: 0
  },
  
  // Gamification
  xp: {
    type: Number,
    default: 0
  },
  level: {
    type: Number,
    default: 1
  },
  currentStreak: {
    type: Number,
    default: 0
  },
  maxStreak: {
    type: Number,
    default: 0
  },
  lastSolvedDate: {
    type: Date,
    default: null
  },
  
  // Badges and achievements
  badges: [{
    name: String,
    description: String,
    icon: String,
    unlockedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Contest stats
  contestRating: {
    type: Number,
    default: 0
  },
  contestsAttended: {
    type: Number,
    default: 0
  },
  contestRanking: {
    type: Number,
    default: 0
  },
  
  // Language preferences
  preferredLanguages: [{
    type: String,
    enum: ['javascript', 'python', 'java', 'cpp', 'c', 'go', 'rust', 'typescript', 'swift', 'kotlin']
  }],
  
  // Problem categories focus
  focusAreas: [{
    type: String,
    enum: ['arrays', 'strings', 'linked-lists', 'trees', 'graphs', 'dynamic-programming', 
           'greedy', 'backtracking', 'sorting', 'searching', 'math', 'bit-manipulation']
  }],
  
  // Friends system
  friends: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'accepted'],
      default: 'pending'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Settings
  settings: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    notifications: {
      dailyReminder: {
        type: Boolean,
        default: true
      },
      friendActivity: {
        type: Boolean,
        default: true
      },
      contests: {
        type: Boolean,
        default: true
      }
    },
    privacy: {
      showProfile: {
        type: Boolean,
        default: true
      },
      showProgress: {
        type: Boolean,
        default: true
      },
      showStats: {
        type: Boolean,
        default: true
      }
    }
  },
  
  // API sync data
  lastLeetCodeSync: {
    type: Date,
    default: null
  },
  leetCodeData: {
    ranking: Number,
    acceptanceRate: Number,
    contributionPoints: Number
  },
  
  // Activity tracking
  lastActive: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
userSchema.index({ xp: -1 });
userSchema.index({ totalProblems: -1 });
userSchema.index({ contestRating: -1 });
userSchema.index({ lastActive: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName || ''} ${this.lastName || ''}`.trim() || this.leetcodeUsername;
});

// Method to calculate level from XP
userSchema.methods.calculateLevel = function() {
  // Level formula: level = floor(sqrt(xp / 100)) + 1
  return Math.floor(Math.sqrt(this.xp / 100)) + 1;
};

// Method to check if user leveled up
userSchema.methods.checkLevelUp = function() {
  const newLevel = this.calculateLevel();
  const leveledUp = newLevel > this.level;
  this.level = newLevel;
  return leveledUp;
};

// Method to update streak
userSchema.methods.updateStreak = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const lastSolved = this.lastSolvedDate ? new Date(this.lastSolvedDate) : null;
  if (lastSolved) {
    lastSolved.setHours(0, 0, 0, 0);
  }
  
  if (!lastSolved) {
    this.currentStreak = 1;
  } else {
    const daysDiff = Math.floor((today - lastSolved) / (1000 * 60 * 60 * 24));
    
    if (daysDiff === 1) {
      this.currentStreak += 1;
    } else if (daysDiff === 0) {
      // Same day, don't change streak
      return;
    } else {
      this.currentStreak = 1; // Reset streak
    }
  }
  
  this.maxStreak = Math.max(this.maxStreak, this.currentStreak);
  this.lastSolvedDate = new Date();
};

export default mongoose.model('User', userSchema);