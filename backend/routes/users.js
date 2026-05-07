const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users/search
// @desc    Search users by username
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    const users = await User.find({
      username: { $regex: q, $options: 'i' },
      _id: { $ne: req.user._id }
    }).select('username avatar status lastSeen').limit(20);

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error searching users'
    });
  }
});

// @route   POST /api/users/contacts
// @desc    Add user to contacts
// @access  Private
router.post('/contacts', auth, [
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

    const { userId } = req.body;

    // Check if user exists
    const contactUser = await User.findById(userId);
    if (!contactUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if trying to add self
    if (userId === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add yourself as a contact'
      });
    }

    // Check if already in contacts
    const currentUser = await User.findById(req.user._id);
    const existingContact = currentUser.contacts.find(
      contact => contact.user.toString() === userId
    );

    if (existingContact) {
      return res.status(400).json({
        success: false,
        message: 'User already in contacts'
      });
    }

    // Add to contacts
    currentUser.contacts.push({ user: userId });
    await currentUser.save();

    res.json({
      success: true,
      message: 'Contact added successfully',
      data: {
        contact: {
          user: {
            id: contactUser._id,
            username: contactUser.username,
            avatar: contactUser.avatar,
            status: contactUser.status,
            lastSeen: contactUser.lastSeen
          },
          addedAt: new Date()
        }
      }
    });
  } catch (error) {
    console.error('Add contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error adding contact'
    });
  }
});

// @route   DELETE /api/users/contacts/:userId
// @desc    Remove user from contacts
// @access  Private
router.delete('/contacts/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const currentUser = await User.findById(req.user._id);
    currentUser.contacts = currentUser.contacts.filter(
      contact => contact.user.toString() !== userId
    );
    await currentUser.save();

    res.json({
      success: true,
      message: 'Contact removed successfully'
    });
  } catch (error) {
    console.error('Remove contact error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error removing contact'
    });
  }
});

// @route   GET /api/users/contacts
// @desc    Get user's contacts
// @access  Private
router.get('/contacts', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('contacts.user', 'username avatar status lastSeen')
      .sort({ 'contacts.addedAt': -1 });

    res.json({
      success: true,
      data: { contacts: user.contacts }
    });
  } catch (error) {
    console.error('Get contacts error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching contacts'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('username avatar status lastSeen');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching user'
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
  body('username')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('Username must be between 3 and 20 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('Avatar must be a valid URL'),
  body('status')
    .optional()
    .isIn(['online', 'away', 'busy', 'offline'])
    .withMessage('Status must be one of: online, away, busy, offline'),
  body('bio')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Bio must be less than 500 characters')
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

    const { username, avatar, status, bio } = req.body;
    const updateData = {};

    if (username) {
      // Check if username is already taken
      const existingUser = await User.findOne({ 
        username, 
        _id: { $ne: req.user._id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already taken'
        });
      }
      
      updateData.username = username;
    }

    if (avatar) {
      updateData.avatar = avatar;
    }

    if (status) {
      updateData.onlineStatus = status;
    }

    if (bio !== undefined) {
      updateData.bio = bio;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true }
    ).select('username avatar email onlineStatus bio settings');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating profile'
    });
  }
});

// @route   PUT /api/users/status
// @desc    Update user status
// @access  Private
router.put('/status', auth, [
  body('status')
    .isIn(['online', 'offline', 'away'])
    .withMessage('Status must be online, offline, or away')
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

    const { status } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { 
        status,
        lastSeen: new Date()
      },
      { new: true }
    ).select('status lastSeen');

    res.json({
      success: true,
      message: 'Status updated successfully',
      data: { status: user.status, lastSeen: user.lastSeen }
    });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error updating status'
    });
  }
});

module.exports = router;
