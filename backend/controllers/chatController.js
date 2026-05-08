const Chat = require('../models/Chat');
const User = require('../models/User');

const accessChat = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ status: 'error', message: 'UserId param not sent with request' });
  }

  var isChat = await Chat.find({
    type: 'private',
    $and: [
      { participants: { $elemMatch: { $eq: req.user._id } } },
      { participants: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate('participants', '-password')
    .populate('lastMessage');

  isChat = await User.populate(isChat, {
    path: 'lastMessage.sender',
    select: 'username avatar email',
  });

  if (isChat.length > 0) {
    res.send({ status: 'success', data: { chat: isChat[0] } });
  } else {
    var chatData = {
      name: 'sender',
      type: 'private',
      participants: [req.user._id, userId],
      createdBy: req.user._id,
    };

    try {
      const createdChat = await Chat.create(chatData);
      const fullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        'participants',
        '-password'
      );
      res.status(200).json({ status: 'success', data: { chat: fullChat } });
    } catch (error) {
      res.status(400).json({ status: 'error', message: error.message });
    }
  }
};

const fetchChats = async (req, res) => {
  try {
    Chat.find({ participants: { $elemMatch: { $eq: req.user._id } } })
      .populate('participants', '-password')
      .populate('createdBy', '-password')
      .populate('lastMessage')
      .sort({ updatedAt: -1 })
      .then(async (results) => {
        results = await User.populate(results, {
          path: 'lastMessage.sender',
          select: 'username avatar email',
        });
        res.status(200).send({ status: 'success', data: { chats: results } });
      });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

const createGroupChat = async (req, res) => {
  if (!req.body.users || !req.body.name) {
    return res.status(400).send({ status: 'error', message: 'Please fill all the fields' });
  }

  var users = JSON.parse(req.body.users);

  if (users.length < 2) {
    return res
      .status(400)
      .send({ status: 'error', message: 'More than 2 users are required to form a group chat' });
  }

  users.push(req.user);

  try {
    const groupChat = await Chat.create({
      name: req.body.name,
      participants: users,
      type: 'group',
      createdBy: req.user,
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate('participants', '-password')
      .populate('createdBy', '-password');

    res.status(200).json({ status: 'success', data: { chat: fullGroupChat } });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

module.exports = { accessChat, fetchChats, createGroupChat };
