const express = require('express');
const { body, validationResult } = require('express-validator');
const Message = require('../models/Message');
const Chat = require('../models/Chat');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/messages/chat/:chatId
// @desc    Get messages for a chat
// @access  Private
router.get('/chat/:chatId', auth, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const { chatId } = req.params;

    // Check if user is participant in the chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const messages = await Message.find({
      chat: chatId,
      isDeleted: false
    })
    .populate('sender', 'username avatar')
    .populate('replyTo', 'content sender')
    .populate('readBy.user', 'username')
    .populate('reactions.user', 'username')
    .sort({ createdAt: -1 })
    .limit(limit * 1)
    .skip((page - 1) * limit);

    const total = await Message.countDocuments({
      chat: chatId,
      isDeleted: false
    });

    // Reverse order for correct chronological display
    const reversedMessages = messages.reverse();

    res.json({
      success: true,
      data: {
        messages: reversedMessages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching messages'
    });
  }
});

// @route   POST /api/messages
// @desc    Send a message
// @access  Private
router.post('/', auth, [
  body('chatId')
    .isMongoId()
    .withMessage('Invalid chat ID'),
  body('content')
    .if(body('type').equals('text'))
    .trim()
    .isLength({ min: 1, max: 4000 })
    .withMessage('Message must be between 1 and 4000 characters'),
  body('type')
    .optional()
    .isIn(['text', 'image', 'file'])
    .withMessage('Message type must be text, image, or file'),
  body('replyTo')
    .optional()
    .isMongoId()
    .withMessage('Invalid reply to message ID')
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

    const { chatId, content, type = 'text', replyTo, fileUrl, fileName, fileSize } = req.body;

    // Check if user is participant in the chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // For file/image messages, validate file data
    if ((type === 'image' || type === 'file') && (!fileUrl || !fileName || !fileSize)) {
      return res.status(400).json({
        success: false,
        message: 'File URL, name, and size are required for file messages'
      });
    }

    // Check reply message exists if provided
    if (replyTo) {
      const replyMessage = await Message.findById(replyTo);
      if (!replyMessage || replyMessage.chat.toString() !== chatId) {
        return res.status(400).json({
          success: false,
          message: 'Invalid reply message'
        });
      }
    }

    // Create message
    const message = new Message({
      chat: chatId,
      sender: req.user._id,
      content,
      type,
      replyTo,
      fileUrl,
      fileName,
      fileSize
    });

    await message.save();

    // Populate sender info
    await message.populate('sender', 'username avatar');
    if (replyTo) {
      await message.populate('replyTo', 'content sender');
    }

    // Update chat's last message and activity
    chat.lastMessage = message._id;
    chat.lastActivity = new Date();
    
    // Update unread counts for all participants except sender
    chat.participants.forEach(participant => {
      if (participant.user.toString() !== req.user._id.toString()) {
        participant.unreadCount += 1;
      }
    });
    
    await chat.save();

    // Mark message as delivered to all participants
    chat.participants.forEach(participant => {
      if (participant.user.toString() !== req.user._id.toString()) {
        message.markAsDelivered(participant.user);
      }
    });
    await message.save();

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message }
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error sending message'
    });
  }
});

// @route   PUT /api/messages/:id
// @desc    Edit a message
// @access  Private
router.put('/:id', auth, [
  body('content')
    .trim()
    .isLength({ min: 1, max: 4000 })
    .withMessage('Message must be between 1 and 4000 characters')
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

    const { content } = req.body;
    const messageId = req.params.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only edit your own messages.'
      });
    }

    // Check if message type is text
    if (message.type !== 'text') {
      return res.status(400).json({
        success: false,
        message: 'Only text messages can be edited'
      });
    }

    // Check if message is deleted
    if (message.isDeleted) {
      return res.status(400).json({
        success: false,
        message: 'Cannot edit deleted message'
      });
    }

    // Add to edit history
    message.editHistory.push({
      content: message.content,
      editedAt: new Date()
    });

    // Update message
    message.content = content;
    message.isEdited = true;
    await message.save();

    await message.populate('sender', 'username avatar');

    res.json({
      success: true,
      message: 'Message edited successfully',
      data: { message }
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error editing message'
    });
  }
});

// @route   DELETE /api/messages/:id
// @desc    Delete a message
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only delete your own messages.'
      });
    }

    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    message.deletedBy = req.user._id;
    await message.save();

    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting message'
    });
  }
});

// @route   POST /api/messages/:id/react
// @desc    Add reaction to message
// @access  Private
router.post('/:id/react', auth, [
  body('emoji')
    .notEmpty()
    .withMessage('Emoji is required')
    .isLength({ max: 10 })
    .withMessage('Emoji too long')
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

    const { emoji } = req.body;
    const messageId = req.params.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is participant in the chat
    const chat = await Chat.findById(message.chat);
    if (!chat || !chat.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Add reaction
    message.addReaction(req.user._id, emoji);
    await message.save();

    await message.populate('reactions.user', 'username');

    res.json({
      success: true,
      message: 'Reaction added successfully',
      data: { reactions: message.reactions }
    });
  } catch (error) {
    console.error('Add reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding reaction'
    });
  }
});

// @route   DELETE /api/messages/:id/react
// @desc    Remove reaction from message
// @access  Private
router.delete('/:id/react', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is participant in the chat
    const chat = await Chat.findById(message.chat);
    if (!chat || !chat.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Remove reaction
    message.removeReaction(req.user._id);
    await message.save();

    res.json({
      success: true,
      message: 'Reaction removed successfully'
    });
  } catch (error) {
    console.error('Remove reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing reaction'
    });
  }
});

// @route   PUT /api/messages/:id/read
// @desc    Mark message as read
// @access  Private
router.put('/:id/read', auth, async (req, res) => {
  try {
    const message = await Message.findById(req.params.id);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    // Check if user is participant in the chat
    const chat = await Chat.findById(message.chat);
    if (!chat || !chat.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Mark as read
    message.markAsRead(req.user._id);
    await message.save();

    res.json({
      success: true,
      message: 'Message marked as read'
    });
  } catch (error) {
    console.error('Mark message read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking message as read'
    });
  }
});

// @route   GET /api/messages/search/:chatId
// @desc    Search messages in a chat
// @access  Private
router.get('/search/:chatId', auth, async (req, res) => {
  try {
    const { q } = req.query;
    const { chatId } = req.params;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    // Check if user is participant in the chat
    const chat = await Chat.findById(chatId);
    if (!chat || !chat.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const messages = await Message.find({
      chat: chatId,
      content: { $regex: q, $options: 'i' },
      isDeleted: false,
      type: 'text'
    })
    .populate('sender', 'username avatar')
    .sort({ createdAt: -1 })
    .limit(50);

    res.json({
      success: true,
      data: { messages }
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error searching messages'
    });
  }
});

module.exports = router;
