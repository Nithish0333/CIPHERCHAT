const express = require('express');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Chat = require('../models/Chat');
const User = require('../models/User');

const router = express.Router();

// Store active calls (in production, use Redis or database)
const activeCalls = new Map();

// @route   POST /api/calls/start
// @desc    Start a voice/video call
// @access  Private
router.post('/start', auth, [
  body('chatId')
    .isMongoId()
    .withMessage('Invalid chat ID'),
  body('callType')
    .isIn(['voice', 'video'])
    .withMessage('Call type must be voice or video'),
  body('offer')
    .optional()
    .isObject()
    .withMessage('Offer must be a valid object')
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

    const { chatId, callType, offer } = req.body;

    // Verify chat exists and user is participant
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found'
      });
    }

    if (!chat.isParticipant(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Get other participants
    const otherParticipants = chat.participants
      .filter(p => p.user.toString() !== req.user._id.toString())
      .map(p => p.user.toString());

    if (otherParticipants.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No other participants in chat'
      });
    }

    // Create call record
    const callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const callData = {
      _id: callId,
      chatId,
      callType,
      callerId: req.user._id,
      participants: [req.user._id, ...otherParticipants],
      startTime: new Date(),
      status: 'ringing',
      offer: offer || null,
      answer: null,
      iceCandidates: []
    };

    activeCalls.set(callId, callData);

    // Notify other participants via socket
    const io = req.app.get('io');
    if (io) {
      otherParticipants.forEach(participantId => {
        io.to(participantId).emit('incoming_call', {
          callId,
          chatId,
          caller: {
            _id: req.user._id,
            username: req.user.username,
            avatar: req.user.avatar
          },
          callType,
          offer
        });
      });
    }

    res.status(201).json({
      success: true,
      message: 'Call initiated',
      data: { callId, callData }
    });
  } catch (error) {
    console.error('Start call error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error starting call'
    });
  }
});

// @route   POST /api/calls/:callId/answer
// @desc    Answer an incoming call
// @access  Private
router.post('/:callId/answer', auth, [
  body('answer')
    .isObject()
    .withMessage('Answer must be a valid object')
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

    const { callId } = req.params;
    const { answer } = req.body;

    const call = activeCalls.get(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Verify user is participant
    if (!call.participants.includes(req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update call with answer
    call.answer = answer;
    call.status = 'connected';
    call.connectTime = new Date();

    // Notify caller
    const io = req.app.get('io');
    if (io) {
      io.to(call.callerId).emit('call_answered', {
        callId,
        answer,
        answerer: {
          _id: req.user._id,
          username: req.user.username,
          avatar: req.user.avatar
        }
      });
    }

    res.json({
      success: true,
      message: 'Call answered',
      data: { call }
    });
  } catch (error) {
    console.error('Answer call error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error answering call'
    });
  }
});

// @route   POST /api/calls/:callId/ice-candidate
// @desc    Exchange ICE candidates
// @access  Private
router.post('/:callId/ice-candidate', auth, [
  body('candidate')
    .isObject()
    .withMessage('ICE candidate must be a valid object')
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

    const { callId } = req.params;
    const { candidate } = req.body;

    const call = activeCalls.get(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Verify user is participant
    if (!call.participants.includes(req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Add ICE candidate
    call.iceCandidates.push({
      userId: req.user._id,
      candidate,
      timestamp: new Date()
    });

    // Forward to other participants
    const io = req.app.get('io');
    if (io) {
      const otherParticipants = call.participants.filter(p => p !== req.user._id.toString());
      otherParticipants.forEach(participantId => {
        io.to(participantId).emit('ice_candidate', {
          callId,
          candidate,
          from: req.user._id
        });
      });
    }

    res.json({
      success: true,
      message: 'ICE candidate added'
    });
  } catch (error) {
    console.error('ICE candidate error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error handling ICE candidate'
    });
  }
});

// @route   POST /api/calls/end
// @desc    End a call
// @access  Private
router.post('/end', auth, [
  body('chatId')
    .isMongoId()
    .withMessage('Invalid chat ID')
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

    const { chatId } = req.body;

    // Find and end active calls for this chat
    const callsToEnd = [];
    for (const [callId, call] of activeCalls.entries()) {
      if (call.chatId === chatId && call.participants.includes(req.user._id.toString())) {
        call.status = 'ended';
        call.endTime = new Date();
        callsToEnd.push(callId);
      }
    }

    // Notify other participants
    const io = req.app.get('io');
    if (io) {
      callsToEnd.forEach(callId => {
        const call = activeCalls.get(callId);
        if (call) {
          const otherParticipants = call.participants.filter(p => p !== req.user._id.toString());
          otherParticipants.forEach(participantId => {
            io.to(participantId).emit('call_ended', {
              callId,
              chatId,
              endedBy: {
                _id: req.user._id,
                username: req.user.username
              }
            });
          });
        }
      });
    }

    // Remove from active calls
    callsToEnd.forEach(callId => {
      activeCalls.delete(callId);
    });

    res.json({
      success: true,
      message: 'Call ended'
    });
  } catch (error) {
    console.error('End call error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error ending call'
    });
  }
});

// @route   GET /api/calls/active
// @desc    Get active calls for user
// @access  Private
router.get('/active', auth, async (req, res) => {
  try {
    const userCalls = [];
    
    for (const [callId, call] of activeCalls.entries()) {
      if (call.participants.includes(req.user._id.toString())) {
        userCalls.push(call);
      }
    }

    res.json({
      success: true,
      data: { calls: userCalls }
    });
  } catch (error) {
    console.error('Get active calls error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching active calls'
    });
  }
});

// @route   POST /api/calls/:callId/reject
// @desc    Reject an incoming call
// @access  Private
router.post('/:callId/reject', auth, async (req, res) => {
  try {
    const { callId } = req.params;

    const call = activeCalls.get(callId);
    if (!call) {
      return res.status(404).json({
        success: false,
        message: 'Call not found'
      });
    }

    // Verify user is participant
    if (!call.participants.includes(req.user._id.toString())) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update call status
    call.status = 'rejected';
    call.endTime = new Date();

    // Notify caller
    const io = req.app.get('io');
    if (io) {
      io.to(call.callerId).emit('call_rejected', {
        callId,
        rejectedBy: {
          _id: req.user._id,
          username: req.user.username,
          avatar: req.user.avatar
        }
      });
    }

    // Remove from active calls
    activeCalls.delete(callId);

    res.json({
      success: true,
      message: 'Call rejected'
    });
  } catch (error) {
    console.error('Reject call error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error rejecting call'
    });
  }
});

module.exports = router;
