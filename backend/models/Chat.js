const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: function() {
      return this.type === 'group';
    }
  },
  type: {
    type: String,
    enum: ['private', 'group'],
    default: 'private'
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    lastRead: {
      type: Date,
      default: Date.now
    },
    unreadCount: {
      type: Number,
      default: 0
    }
  }],
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    maxlength: [200, 'Description cannot exceed 200 characters']
  },
  avatar: {
    type: String
  },
  settings: {
    encryptionEnabled: {
      type: Boolean,
      default: true
    },
    fileSharing: {
      type: Boolean,
      default: true
    },
    messageRetention: {
      type: Number,
      default: 0 // 0 means forever
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: function() {
      return this.type === 'group';
    }
  }
}, {
  timestamps: true
});

// Index for efficient queries
chatSchema.index({ 'participants.user': 1 });
chatSchema.index({ lastActivity: -1 });

// Method to check if user is participant
chatSchema.methods.isParticipant = function(userId) {
  return this.participants.some(p => p.user.toString() === userId.toString());
};

// Method to get participant details
chatSchema.methods.getParticipant = function(userId) {
  return this.participants.find(p => p.user.toString() === userId.toString());
};

// Method to update unread count for a participant
chatSchema.methods.updateUnreadCount = function(userId, increment = 1) {
  const participant = this.getParticipant(userId);
  if (participant) {
    participant.unreadCount += increment;
  }
};

// Method to mark messages as read for a participant
chatSchema.methods.markAsRead = function(userId) {
  const participant = this.getParticipant(userId);
  if (participant) {
    participant.lastRead = new Date();
    participant.unreadCount = 0;
  }
};

// Pre-save middleware to handle private chat naming
chatSchema.pre('save', function(next) {
  if (this.type === 'private' && this.participants.length === 2) {
    // For private chats, we don't need a name
    this.name = undefined;
  }
  next();
});

module.exports = mongoose.model('Chat', chatSchema);
