const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User');

const sendFriendRequest = async (req, res) => {
  const { receiverId } = req.body;

  try {
    const existingRequest = await FriendRequest.findOne({
      sender: req.user._id,
      receiver: receiverId,
      status: 'pending',
    });

    if (existingRequest) {
      return res.status(400).json({ status: 'error', message: 'Friend request already sent' });
    }

    const friendRequest = await FriendRequest.create({
      sender: req.user._id,
      receiver: receiverId,
    });

    res.status(201).json({ status: 'success', data: { friendRequest: friendRequest } });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

const getFriendRequests = async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      $or: [{ sender: req.user._id }, { receiver: req.user._id }],
    })
      .populate('sender', 'username avatar')
      .populate('receiver', 'username avatar');

    res.json({ status: 'success', data: { friendRequests: requests } });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

const updateFriendRequest = async (req, res) => {
  const { requestId, status } = req.body;

  try {
    const friendRequest = await FriendRequest.findById(requestId);

    if (!friendRequest) {
      return res.status(404).json({ status: 'error', message: 'Friend request not found' });
    }

    friendRequest.status = status;
    await friendRequest.save();

    if (status === 'accepted') {
      await User.findByIdAndUpdate(friendRequest.sender, {
        $addToSet: { friends: friendRequest.receiver },
      });
      await User.findByIdAndUpdate(friendRequest.receiver, {
        $addToSet: { friends: friendRequest.sender },
      });
    }

    res.json({ status: 'success', data: { friendRequest: friendRequest } });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

const getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('friends', 'username avatar status lastSeen');
    res.json({ status: 'success', data: { friends: user.friends } });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

module.exports = { sendFriendRequest, getFriendRequests, updateFriendRequest, getFriends };
