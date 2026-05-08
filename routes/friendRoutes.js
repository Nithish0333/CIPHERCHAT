const express = require('express');
const { sendFriendRequest, getFriendRequests, updateFriendRequest, getFriends } = require('../controllers/friendController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/request', protect, sendFriendRequest);
router.get('/requests', protect, getFriendRequests);
router.put('/request', protect, updateFriendRequest);
router.get('/', protect, getFriends);

module.exports = router;
