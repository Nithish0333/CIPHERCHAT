const express = require('express');
const router = express.Router();
const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');
const auth = require('../middleware/auth');

// Search users by username
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ message: 'Search query is required' });
    }
    
    // Search users by username (case-insensitive)
    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: req.user._id } // Exclude current user
    }).select('username email avatar onlineStatus');
    
    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send friend request
router.post('/request', auth, async (req, res) => {
  try {
    const { receiverId } = req.body;
    
    if (!receiverId) {
      return res.status(400).json({ message: 'Receiver ID is required' });
    }
    
    if (receiverId === req.user._id) {
      return res.status(400).json({ message: 'Cannot send friend request to yourself' });
    }
    
    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if friend request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: req.user._id, receiver: receiverId },
        { sender: receiverId, receiver: req.user._id }
      ]
    });
    
    if (existingRequest) {
      return res.status(400).json({ message: 'Friend request already exists' });
    }
    
    // Create friend request
    const friendRequest = new FriendRequest({
      sender: req.user._id,
      receiver: receiverId
    });
    
    await friendRequest.save();
    
    // Populate sender info for response
    await friendRequest.populate('sender', 'username avatar');
    
    res.status(201).json(friendRequest);
  } catch (error) {
    console.error('Send friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get received friend requests
router.get('/requests/received', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      receiver: req.user._id,
      status: 'pending'
    }).populate('sender', 'username avatar onlineStatus');
    
    res.json(requests);
  } catch (error) {
    console.error('Get received requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get sent friend requests
router.get('/requests/sent', auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      sender: req.user._id,
      status: 'pending'
    }).populate('receiver', 'username avatar onlineStatus');
    
    res.json(requests);
  } catch (error) {
    console.error('Get sent requests error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Accept friend request
router.put('/requests/:requestId/accept', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    
    if (friendRequest.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to accept this request' });
    }
    
    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Friend request already processed' });
    }
    
    // Update request status
    friendRequest.status = 'accepted';
    friendRequest.updatedAt = Date.now();
    await friendRequest.save();
    
    // Add users to each other's friends list
    await User.findByIdAndUpdate(friendRequest.sender, {
      $addToSet: { friends: friendRequest.receiver }
    });
    
    await User.findByIdAndUpdate(friendRequest.receiver, {
      $addToSet: { friends: friendRequest.sender }
    });
    
    res.json({ message: 'Friend request accepted' });
  } catch (error) {
    console.error('Accept friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reject friend request
router.put('/requests/:requestId/reject', auth, async (req, res) => {
  try {
    const { requestId } = req.params;
    
    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: 'Friend request not found' });
    }
    
    if (friendRequest.receiver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reject this request' });
    }
    
    if (friendRequest.status !== 'pending') {
      return res.status(400).json({ message: 'Friend request already processed' });
    }
    
    // Update request status
    friendRequest.status = 'rejected';
    friendRequest.updatedAt = Date.now();
    await friendRequest.save();
    
    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('Reject friend request error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get friends list
router.get('/list', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'friends',
      select: 'username email avatar onlineStatus'
    });
    
    res.json(user.friends);
  } catch (error) {
    console.error('Get friends list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove friend
router.delete('/friends/:friendId', auth, async (req, res) => {
  try {
    const { friendId } = req.params;
    
    // Remove friend from both users' friends lists
    await User.findByIdAndUpdate(req.user._id, {
      $pull: { friends: friendId }
    });
    
    await User.findByIdAndUpdate(friendId, {
      $pull: { friends: req.user._id }
    });
    
    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error('Remove friend error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
