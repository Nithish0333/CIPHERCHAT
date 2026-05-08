const express = require('express');
const { getUsers, updateUserStatus } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protect, getUsers);
router.put('/status', protect, updateUserStatus);

module.exports = router;
