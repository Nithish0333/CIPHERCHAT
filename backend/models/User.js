const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [20, 'Username cannot exceed 20 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  avatar: {
    type: String,
    default: function() {
      // Generate default avatar based on username
      return `https://ui-avatars.com/api/?name=${this.username}&background=0d1117&color=00ff41&bold=true`;
    }
  },
  onlineStatus: {
    type: String,
    enum: ['online', 'offline', 'away'],
    default: 'offline'
  },
  status: [{
    text: {
      type: String,
      maxlength: [500, 'Status text cannot exceed 500 characters']
    },
    imageUrl: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: false // Make optional for existing users without status
    },
    isActive: {
      type: Boolean,
      default: true
    },
    views: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isTyping: {
    type: Boolean,
    default: false
  },
  encryptionKey: {
    type: String,
    required: true,
    default: () => require('crypto').randomBytes(32).toString('hex')
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  contacts: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: [{
    text: {
      type: String,
      maxlength: [500, 'Status text cannot exceed 500 characters']
    },
    imageUrl: {
      type: String
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: false // Make optional for existing users without status
    },
    isActive: {
      type: Boolean,
      default: true
    },
    views: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }]
  }],
  settings: {
    notifications: {
      type: Boolean,
      default: true
    },
    sound: {
      type: Boolean,
      default: true
    },
    darkMode: {
      type: Boolean,
      default: true
    },
    encryptionEnabled: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS));
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive fields when converting to JSON
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.encryptionKey;
  return user;
};

module.exports = mongoose.model('User', userSchema);
