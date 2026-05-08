const express = require('express');
const { sendMessage, allMessages } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/', protect, sendMessage);
router.get('/:chatId', protect, allMessages);

module.exports = router;
