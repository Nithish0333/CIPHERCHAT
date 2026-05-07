const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Chat = require('./models/Chat');
const Message = require('./models/Message');
require('dotenv').config();

const seedUsers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data
    await User.deleteMany({});
    await Chat.deleteMany({});
    await Message.deleteMany({});
    console.log('Cleared existing data');

    // Sample users data
    const users = [
      {
        username: 'alice',
        email: 'alice@example.com',
        password: 'Password123',
        status: 'online'
      },
      {
        username: 'bob',
        email: 'bob@example.com',
        password: 'Password123',
        status: 'online'
      },
      {
        username: 'charlie',
        email: 'charlie@example.com',
        password: 'Password123',
        status: 'away'
      },
      {
        username: 'diana',
        email: 'diana@example.com',
        password: 'Password123',
        status: 'offline'
      },
      {
        username: 'eve',
        email: 'eve@example.com',
        password: 'Password123',
        status: 'online'
      }
    ];

    // Create users
    const createdUsers = [];
    for (const userData of users) {
      const user = new User(userData);
      await user.save();
      createdUsers.push(user);
      console.log(`Created user: ${user.username}`);
    }

    // Create private chats
    const privateChats = [
      { participants: [createdUsers[0]._id, createdUsers[1]._id], createdBy: createdUsers[0]._id }, // alice and bob
      { participants: [createdUsers[0]._id, createdUsers[2]._id], createdBy: createdUsers[0]._id }, // alice and charlie
      { participants: [createdUsers[1]._id, createdUsers[3]._id], createdBy: createdUsers[1]._id }, // bob and diana
    ];

    const createdChats = [];
    for (const chatData of privateChats) {
      const chat = new Chat({
        type: 'private',
        participants: chatData.participants.map(id => ({ user: id })),
        createdBy: chatData.createdBy
      });
      await chat.save();
      createdChats.push(chat);
      console.log(`Created private chat between users`);
    }

    // Create a group chat
    const groupChat = new Chat({
      name: 'Cybersecurity Team',
      type: 'group',
      participants: createdUsers.slice(0, 4).map(user => ({ user: user._id, role: user.username === 'alice' ? 'admin' : 'member' })),
      createdBy: createdUsers[0]._id // alice creates the group
    });
    await groupChat.save();
    createdChats.push(groupChat);
    console.log(`Created group chat: ${groupChat.name}`);

    // Create sample messages
    const messages = [
      {
        chat: createdChats[0]._id,
        sender: createdUsers[0]._id,
        content: 'Hey Bob! How are you?',
        type: 'text'
      },
      {
        chat: createdChats[0]._id,
        sender: createdUsers[1]._id,
        content: 'Hi Alice! I\'m good, thanks. How about you?',
        type: 'text'
      },
      {
        chat: createdChats[0]._id,
        sender: createdUsers[0]._id,
        content: 'Great! Working on some encryption stuff.',
        type: 'text'
      },
      {
        chat: createdChats[3]._id, // group chat
        sender: createdUsers[0]._id,
        content: 'Welcome to the Cybersecurity Team chat!',
        type: 'text'
      },
      {
        chat: createdChats[3]._id,
        sender: createdUsers[1]._id,
        content: 'Thanks Alice! Excited to be here.',
        type: 'text'
      },
      {
        chat: createdChats[3]._id,
        sender: createdUsers[2]._id,
        content: 'Let\'s discuss the latest security protocols.',
        type: 'text'
      }
    ];

    for (const messageData of messages) {
      const message = new Message(messageData);
      await message.save();
    }
    console.log('Created sample messages');

    console.log('Demo data seeded successfully!');
    console.log('Demo users: alice, bob, charlie, diana, eve (password: Password123)');
  } catch (error) {
    console.error('Error seeding data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seed function
seedUsers();