const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    required: true
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: function() {
      return this.type === 'text';
    },
    trim: true,
    maxlength: [4000, 'Message cannot exceed 4000 characters']
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file', 'system'],
    default: 'text'
  },
  fileUrl: {
    type: String,
    required: function() {
      return this.type === 'image' || this.type === 'file';
    }
  },
  fileName: {
    type: String,
    required: function() {
      return this.type === 'image' || this.type === 'file';
    }
  },
  fileSize: {
    type: Number,
    required: function() {
      return this.type === 'image' || this.type === 'file';
    }
  },
  encryptedContent: {
    type: String
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  deliveredTo: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  encryptionKey: {
    type: String
  }
}, {
  timestamps: true
});

// Index for efficient queries
messageSchema.index({ chat: 1, createdAt: -1 });
messageSchema.index({ sender: 1 });
messageSchema.index({ isDeleted: 1 });

// Method to mark message as read by user
messageSchema.methods.markAsRead = function(userId) {
  const existingRead = this.readBy.find(read => read.user.toString() === userId.toString());
  if (!existingRead) {
    this.readBy.push({ user: userId });
  }
};

// Method to mark message as delivered to user
messageSchema.methods.markAsDelivered = function(userId) {
  const existingDelivery = this.deliveredTo.find(delivered => delivered.user.toString() === userId.toString());
  if (!existingDelivery) {
    this.deliveredTo.push({ user: userId });
  }
};

// Method to add reaction
messageSchema.methods.addReaction = function(userId, emoji) {
  // Remove existing reaction by this user
  this.reactions = this.reactions.filter(reaction => reaction.user.toString() !== userId.toString());
  // Add new reaction
  this.reactions.push({ user: userId, emoji });
};

// Method to remove reaction
messageSchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(reaction => reaction.user.toString() !== userId.toString());
};

// Pre-save middleware for encryption simulation
messageSchema.pre('save', function(next) {
  if (this.content && this.isModified('content') && !this.encryptedContent) {
    // Simulate encryption (in production, use proper encryption)
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const key = crypto.randomBytes(32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(this.content, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    this.encryptedContent = encrypted;
    this.encryptionKey = key.toString('hex') + ':' + iv.toString('hex');
  }
  next();
});

// Method to decrypt content (simulation)
messageSchema.methods.getDecryptedContent = function() {
  if (!this.encryptedContent || !this.encryptionKey) {
    return this.content;
  }
  
  try {
    const crypto = require('crypto');
    const algorithm = 'aes-256-cbc';
    const [key, iv] = this.encryptionKey.split(':').map(hex => Buffer.from(hex, 'hex'));
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(this.encryptedContent, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    return this.content; // Fallback to original content
  }
};

module.exports = mongoose.model('Message', messageSchema);
