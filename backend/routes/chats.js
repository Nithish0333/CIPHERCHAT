const express = require('express');
const { body, validationResult } = require('express-validator');
const Chat = require('../models/Chat');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/chats
// @desc    Create a new chat
// @access  Private
router.post('/', auth, [
  body('type')
    .isIn(['private', 'group'])
    .withMessage('Chat type must be private or group'),
  body('participants')
    .isArray({ min: 1 })
    .withMessage('At least one participant is required'),
  body('name')
    .if(body('type').equals('group'))
    .notEmpty()
    .withMessage('Group chat name is required')
    .isLength({ max: 50 })
    .withMessage('Chat name cannot exceed 50 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { type, participants, name, description, avatar } = req.body;

    // Add current user to participants
    const allParticipants = [...new Set([req.user._id, ...participants])];

    // For private chats, ensure only 2 participants
    if (type === 'private' && allParticipants.length !== 2) {
      return res.status(400).json({
        success: false,
        message: 'Private chats can only have 2 participants'
      });
    }

    // Check if private chat already exists between these users
    if (type === 'private') {
      const existingChat = await Chat.findOne({
        type: 'private',
        'participants.user': { $all: allParticipants }
      });

      if (existingChat) {
        return res.status(400).json({
          success: false,
          message: 'Private chat already exists',
          data: { chat: existingChat }
        });
      }
    }

    // Verify all participants exist
    const participantUsers = await User.find({ _id: { $in: allParticipants } });
    if (participantUsers.length !== allParticipants.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more participants not found'
      });
    }

    // Create chat participants array
    const chatParticipants = allParticipants.map(userId => ({
      user: userId,
      role: userId === req.user._id ? 'admin' : 'member'
    }));

    const chat = new Chat({
      type,
      participants: chatParticipants,
      name,
      description,
      avatar,
      createdBy: req.user._id
    });

    await chat.save();
    await chat.populate('participants.user', 'username avatar status');

    res.status(201).json({
      success: true,
      message: 'Chat created successfully',
      data: { chat }
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating chat'
    });
  }
});

// @route   GET /api/chats
// @desc    Get user's chats
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const chats = await Chat.find({
      'participants.user': req.user._id,
      isActive: true
    })
    .populate('participants.user', 'username avatar status')
    .populate('lastMessage')
    .populate('createdBy', 'username')
    .sort({ lastActivity: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Chat.countDocuments({
      'participants.user': req.user._id,
      isActive: true
    });

    res.json({
      success: true,
      data: {
        chats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching chats'
    });
  }
});

// @route   GET /api/chats/:id
// @desc    Get chat by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id)
      .populate('participants.user', 'username avatar status')
      .populate('lastMessage')
      .populate('createdBy', 'username');

    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { chat }
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching chat'
    });
  }
});

// @route   PUT /api/chats/:id
// @desc    Update chat (for group chats)
// @access  Private
router.put('/:id', auth, [
  body('name')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Chat name must be between 1 and 50 characters'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is participant and has admin role
    const participant = chat.getParticipant(req.user._id);
    if (!participant || (chat.type === 'group' && participant.role !== 'admin')) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can update group chats.'
      });
    }

    const { name, description, avatar } = req.body;
    const updateData = { lastActivity: new Date() };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (avatar !== undefined) updateData.avatar = avatar;

    const updatedChat = await Chat.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('participants.user', 'username avatar status');

    res.json({
      success: true,
      message: 'Chat updated successfully',
      data: { chat: updatedChat }
    });
  } catch (error) {
    console.error('Update chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating chat'
    });
  }
});

// @route   POST /api/chats/:id/participants
// @desc    Add participant to group chat
// @access  Private
router.post('/:id/participants', auth, [
  body('userId')
    .isMongoId()
    .withMessage('Invalid user ID')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Only allow adding participants to group chats
    if (chat.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Can only add participants to group chats'
      });
    }

    // Check if user is admin
    const participant = chat.getParticipant(req.user._id);
    if (!participant || participant.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can add participants.'
      });
    }

    const { userId } = req.body;

    // Check if user is already a participant
    if (chat.isParticipant(userId)) {
      return res.status(400).json({
        success: false,
        message: 'User is already a participant'
      });
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Add participant
    chat.participants.push({ user: userId, role: 'member' });
    chat.lastActivity = new Date();
    await chat.save();

    await chat.populate('participants.user', 'username avatar status');

    res.json({
      success: true,
      message: 'Participant added successfully',
      data: { chat }
    });
  } catch (error) {
    console.error('Add participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding participant'
    });
  }
});

// @route   DELETE /api/chats/:id/participants/:userId
// @desc    Remove participant from group chat
// @access  Private
router.delete('/:id/participants/:userId', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Only allow removing participants from group chats
    if (chat.type !== 'group') {
      return res.status(400).json({
        success: false,
        message: 'Can only remove participants from group chats'
      });
    }

    const { userId } = req.params;
    const requestingUser = req.user._id;
    const targetUser = userId;

    // Check if user is admin or removing themselves
    const participant = chat.getParticipant(requestingUser);
    const isAdmin = participant && participant.role === 'admin';
    const isSelf = requestingUser.toString() === targetUser;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only admins can remove other participants.'
      });
    }

    // Check if target user is participant
    if (!chat.isParticipant(targetUser)) {
      return res.status(404).json({
        success: false,
        message: 'User is not a participant'
      });
    }

    // Remove participant
    chat.participants = chat.participants.filter(
      p => p.user.toString() !== targetUser
    );
    chat.lastActivity = new Date();
    await chat.save();

    await chat.populate('participants.user', 'username avatar status');

    res.json({
      success: true,
      message: 'Participant removed successfully',
      data: { chat }
    });
  } catch (error) {
    console.error('Remove participant error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing participant'
    });
  }
});

// @route   PUT /api/chats/:id/read
// @desc    Mark chat messages as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Mark as read
    chat.markAsRead(req.user._id);
    await chat.save();

    res.json({
      success: true,
      message: 'Chat marked as read'
    });
  } catch (error) {
    console.error('Mark chat read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking chat as read'
    });
  }
});

// @route   DELETE /api/chats/:id
// @desc    Delete chat (leave for private, delete for group admin)
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    // Check if user is participant
    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (chat.type === 'private') {
      // For private chats, remove user from participants
      chat.participants = chat.participants.filter(
        p => p.user.toString() !== req.user._id.toString()
      );
      
      // If no participants left, deactivate chat
      if (chat.participants.length === 0) {
        chat.isActive = false;
      }
    } else {
      // For group chats, only admin can delete
      const participant = chat.getParticipant(req.user._id);
      if (!participant || participant.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied. Only admins can delete group chats.'
        });
      }
      
      chat.isActive = false;
    }

    await chat.save();

    res.json({
      success: true,
      message: chat.type === 'private' ? 'Left chat successfully' : 'Chat deleted successfully'
    });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting chat'
    });
  }
});

module.exports = router;
