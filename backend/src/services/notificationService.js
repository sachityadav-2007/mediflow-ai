const prisma = require('../config/db');
const { getIO } = require('../config/socket');

/**
 * Real-Time Hospital Notification Service
 * Handles persistence, query filtering, and event-driven Socket.IO broadcasts
 * for Patient, Doctor, and Administrative clinical events.
 */

/**
 * Dispatches a new notification, saves it to PostgreSQL, and emits a targeted Socket.IO event.
 */
const createNotification = async ({
  userId,
  type = 'SYSTEM_ALERT',
  title,
  message,
  metadata = null,
}) => {
  if (!userId) {
    throw new Error('userId is required to create a notification.');
  }
  if (!title || !message) {
    throw new Error('Title and message are required.');
  }

  // 1. Persist notification in PostgreSQL
  const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      metadata: metadata || undefined,
      isRead: false,
    },
  });

  // 2. Real-time push via Socket.IO
  const io = getIO();
  if (io) {
    // Deliver to user-specific private room
    io.to(`user_${userId}`).emit('notification:new', notification);

    // Also emit updated unread count to user
    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });
    io.to(`user_${userId}`).emit('notification:count', { unreadCount });
  }

  return notification;
};

/**
 * Dispatches a notification to all active hospital administrators.
 */
const notifyAdmins = async ({
  type = 'SYSTEM_ALERT',
  title,
  message,
  metadata = null,
}) => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { id: true },
  });

  if (!admins || admins.length === 0) {
    return [];
  }

  const createdNotifications = [];
  for (const admin of admins) {
    try {
      const notif = await createNotification({
        userId: admin.id,
        type,
        title,
        message,
        metadata,
      });
      createdNotifications.push(notif);
    } catch (err) {
      console.error(`Failed to notify admin ${admin.id}:`, err.message);
    }
  }

  // Also broadcast to role_admin room
  const io = getIO();
  if (io) {
    io.to('role_admin').emit('notification:admin_alert', {
      type,
      title,
      message,
      metadata,
      timestamp: new Date(),
    });
  }

  return createdNotifications;
};

/**
 * Retrieves paginated notifications for the authenticated user.
 */
const getUserNotifications = async (userId, options = {}) => {
  const { limit = 30, offset = 0, isRead } = options;

  const where = { userId };
  if (isRead !== undefined && isRead !== null && isRead !== '') {
    where.isRead = isRead === 'true' || isRead === true;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 30, 100),
      skip: Number(offset) || 0,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return {
    notifications,
    total,
    unreadCount,
    limit: Number(limit) || 30,
    offset: Number(offset) || 0,
  };
};

/**
 * Gets the current unread notification count for an authenticated user.
 */
const getUnreadCount = async (userId) => {
  return await prisma.notification.count({
    where: { userId, isRead: false },
  });
};

/**
 * Marks a single notification as read, enforcing user ownership.
 */
const markAsRead = async (userId, notificationId) => {
  if (!notificationId) {
    throw new Error('Notification ID is required.');
  }

  // 1. Verify existence and ownership
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  });

  if (!notification) {
    const error = new Error('Notification not found.');
    error.status = 404;
    throw error;
  }

  if (notification.userId !== userId) {
    const error = new Error('Access denied: You cannot modify another user\'s notification.');
    error.status = 403;
    throw error;
  }

  // 2. Update status
  const updated = await prisma.notification.update({
    where: { id: notificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  // 3. Emit updated count via Socket.IO
  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  const io = getIO();
  if (io) {
    io.to(`user_${userId}`).emit('notification:count', { unreadCount });
  }

  return { notification: updated, unreadCount };
};

/**
 * Marks all unread notifications as read for the authenticated user.
 */
const markAllAsRead = async (userId) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  const io = getIO();
  if (io) {
    io.to(`user_${userId}`).emit('notification:count', { unreadCount: 0 });
  }

  return {
    success: true,
    markedCount: result.count,
    unreadCount: 0,
  };
};

module.exports = {
  createNotification,
  notifyAdmins,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
};

