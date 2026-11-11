const express = require('express');
const {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
} = require('../controllers/notification.controller');
const { authenticateUser } = require('../middleware/authMiddleware');

const router = express.Router();

// All notification endpoints require authenticated user session
router.use(authenticateUser);

// 1. Fetch user notifications (with optional pagination & filter)
router.get('/', getNotifications);

// 2. Fetch unread count badge
router.get('/unread-count', getUnreadCount);

// 3. Mark all notifications as read
router.patch('/read-all', markAllRead);

// 4. Mark single notification as read
router.patch('/:id/read', markRead);

module.exports = router;

