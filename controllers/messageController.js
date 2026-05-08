const Message = require('../models/Message');
const User = require('../models/User');
const Chat = require('../models/Chat');

const sendMessage = async (req, res) => {
  const { content, chatId, type } = req.body;

  if (!content || !chatId) {
    console.log('Invalid data passed into request');
    return res.status(400).json({ status: 'error', message: 'Invalid data passed into request' });
  }

  var newMessage = {
    sender: req.user._id,
    content: content,
    chat: chatId,
    type: type || 'text',
  };

  try {
    var message = await Message.create(newMessage);

    message = await message.populate('sender', 'username avatar');
    message = await message.populate('chat');
    message = await User.populate(message, {
      path: 'chat.participants',
      select: 'username avatar email',
    });

    await Chat.findByIdAndUpdate(req.body.chatId, { lastMessage: message });

    res.json({ status: 'success', data: { message: message } });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

const allMessages = async (req, res) => {
  try {
    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender', 'username avatar email')
      .populate('chat');
    res.json({ status: 'success', data: { messages: messages } });
  } catch (error) {
    res.status(400).json({ status: 'error', message: error.message });
  }
};

module.exports = { sendMessage, allMessages };
