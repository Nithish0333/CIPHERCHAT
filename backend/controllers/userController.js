const User = require('../models/User');

const getUsers = async (req, res) => {
  try {
    const keyword = req.query.search
      ? {
          $or: [
            { username: { $regex: req.query.search, $options: 'i' } },
            { email: { $regex: req.query.search, $options: 'i' } },
          ],
        }
      : {};

    const users = await User.find(keyword).find({ _id: { $ne: req.user._id } }).select('-password');
    res.json({ status: 'success', data: { users: users } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { status, lastSeen: Date.now() },
      { new: true }
    ).select('-password');

    res.json({ status: 'success', data: { user: user } });
  } catch (error) {
    res.status(500).json({ status: 'error', message: error.message });
  }
};

module.exports = { getUsers, updateUserStatus };
