const notificationService = require('../services/notificationService');

/**
 * GET /api/notifications
 * Fetch notifications for authenticated user
 */
const getNotifications = async (req, res) => {
  try {
    const { limit, offset, isRead } = req.query;
    const result = await notificationService.getUserNotifications(req.user.id, {
      limit,
      offset,
      isRead,
    });

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch notifications.',
    });
  }
};

/**
 * GET /api/notifications/unread-count
 * Fast unread count lookup for navbar badges
 */
const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await notificationService.getUnreadCount(req.user.id);
    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch unread notification count.',
    });
  }
};

/**
 * PATCH /api/notifications/:id/read
 * Mark a specific notification as read
 */
const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await notificationService.markAsRead(req.user.id, id);

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      ...result,
    });
  } catch (error) {
    const status = error.status || 500;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to mark notification as read.',
    });
  }
};

/**
 * PATCH /api/notifications/read-all
 * Mark all notifications as read for current user
 */
const markAllRead = async (req, res) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      ...result,
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read.',
    });
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
};

