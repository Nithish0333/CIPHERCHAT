const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const User = require('../models/User');

const router = express.Router();

// Configure multer for status image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/status');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// @route   GET /api/status
// @desc    Get all statuses
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    // Get all users with active statuses
    const usersWithStatus = await User.find({
      'status.isActive': true,
      'status.expiresAt': { $gt: new Date() }
    }).select('username avatar status');

    const statuses = [];
    const myStatuses = [];
    const viewedStatuses = [];

    usersWithStatus.forEach(user => {
      user.status.forEach(statusItem => {
        if (statusItem.isActive && new Date(statusItem.expiresAt) > new Date()) {
          const statusData = {
            _id: statusItem._id,
            user: {
              _id: user._id,
              username: user.username,
              avatar: user.avatar
            },
            text: statusItem.text,
            imageUrl: statusItem.imageUrl,
            createdAt: statusItem.createdAt,
            expiresAt: statusItem.expiresAt,
            views: statusItem.views || []
          };

          if (user._id.toString() === req.user._id.toString()) {
            myStatuses.push(statusData);
          } else {
            statuses.push(statusData);
            if (statusItem.views && statusItem.views.includes(req.user._id)) {
              viewedStatuses.push(statusData._id);
            }
          }
        }
      });
    });

    res.json({
      success: true,
      data: {
        statuses,
        myStatuses,
        viewedStatuses
      }
    });
  } catch (error) {
    console.error('Get statuses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching statuses'
    });
  }
});

// @route   POST /api/status
// @desc    Create a new status
// @access  Private
router.post('/', auth, upload.single('image'), [
  body('text')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Status text cannot exceed 500 characters'),
  body('duration')
    .optional()
    .isInt({ min: 5, max: 60 })
    .withMessage('Duration must be between 5 and 60 seconds')
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

    const { text, duration = 24 } = req.body; // duration in hours
    const imageFile = req.file;

    if (!text && !imageFile) {
      return res.status(400).json({
        success: false,
        message: 'Status must have text or image'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create status object
    const statusData = {
      text: text || '',
      imageUrl: imageFile ? `/uploads/status/${imageFile.filename}` : null,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + duration * 60 * 60 * 1000), // Convert hours to milliseconds
      isActive: true,
      views: []
    };

    // Add status to user's status array
    user.status.push(statusData);

    // Limit to 30 most recent statuses
    if (user.status.length > 30) {
      user.status = user.status.slice(-30);
    }

    await user.save();

    // Return the created status
    const createdStatus = {
      _id: user.status[user.status.length - 1]._id,
      user: {
        _id: user._id,
        username: user.username,
        avatar: user.avatar
      },
      text: statusData.text,
      imageUrl: statusData.imageUrl,
      createdAt: statusData.createdAt,
      expiresAt: statusData.expiresAt,
      views: statusData.views
    };

    res.status(201).json({
      success: true,
      message: 'Status created successfully',
      data: { status: createdStatus }
    });
  } catch (error) {
    console.error('Create status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error creating status'
    });
  }
});

// @route   PUT /api/status/:statusId/view
// @desc    Mark a status as viewed
// @access  Private
router.put('/:statusId/view', auth, async (req, res) => {
  try {
    const { statusId } = req.params;

    // Find the user who owns the status
    const statusOwner = await User.findOne({
      'status._id': statusId,
      'status.isActive': true
    });

    if (!statusOwner) {
      return res.status(404).json({
        success: false,
        message: 'Status not found'
      });
    }

    // Find the specific status
    const status = statusOwner.status.id(statusId);
    if (!status) {
      return res.status(404).json({
        success: false,
        message: 'Status not found'
      });
    }

    // Add viewer if not already added
    if (!status.views.includes(req.user._id)) {
      status.views.push(req.user._id);
      await statusOwner.save();
    }

    res.json({
      success: true,
      message: 'Status marked as viewed'
    });
  } catch (error) {
    console.error('Mark status viewed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error marking status as viewed'
    });
  }
});

// @route   DELETE /api/status/:statusId
// @desc    Delete a status
// @access  Private
router.delete('/:statusId', auth, async (req, res) => {
  try {
    const { statusId } = req.params;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find and remove the status
    const statusIndex = user.status.findIndex(s => s._id.toString() === statusId);
    if (statusIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Status not found'
      });
    }

    user.status.splice(statusIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: 'Status deleted successfully'
    });
  } catch (error) {
    console.error('Delete status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error deleting status'
    });
  }
});

// Clean up expired statuses (run periodically)
const cleanupExpiredStatuses = async () => {
  try {
    const users = await User.find({
      'status.isActive': true
    });

    for (const user of users) {
      let hasChanges = false;
      
      user.status.forEach((status, index) => {
        if (status.isActive && new Date(status.expiresAt) <= new Date()) {
          user.status[index].isActive = false;
          hasChanges = true;
        }
      });

      if (hasChanges) {
        await user.save();
      }
    }
  } catch (error) {
    console.error('Cleanup expired statuses error:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupExpiredStatuses, 60 * 60 * 1000);

module.exports = router;
