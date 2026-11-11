import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../services/socket';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services/api';
import { useAuth } from '../context/AuthContext';

function formatTimeAgo(timestamp) {
  if (!timestamp) return '';
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return past.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getNotificationIcon(type) {
  switch (type) {
    case 'APPOINTMENT_BOOKED':
      return { icon: '📅', bg: 'bg-blue-100 text-blue-700' };
    case 'APPOINTMENT_CANCELLED':
      return { icon: '❌', bg: 'bg-rose-100 text-rose-700' };
    case 'APPOINTMENT_RESCHEDULED':
      return { icon: '🔄', bg: 'bg-amber-100 text-amber-700' };
    case 'DOCTOR_CHECK_IN':
      return { icon: '🩺', bg: 'bg-emerald-100 text-emerald-700' };
    case 'DOCTOR_CHECK_OUT':
      return { icon: '🚪', bg: 'bg-amber-100 text-amber-700' };
    case 'WAITLIST_ALLOCATED':
      return { icon: '⏳', bg: 'bg-indigo-100 text-indigo-700' };
    default:
      return { icon: '🔔', bg: 'bg-slate-100 text-slate-700' };
  }
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const [error, setError] = useState(null);
  const panelRef = useRef(null);

  // Fetch initial unread count
  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await getUnreadNotificationCount();
      if (res && typeof res.unreadCount === 'number') {
        setUnreadCount(res.unreadCount);
      }
    } catch (err) {
      // Fallback silently if offline
    }
  }, [user]);

  // Fetch paginated notification list
  const fetchList = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getNotifications({ limit: 15 });
      if (res && res.notifications) {
        setNotifications(res.notifications);
        if (typeof res.unreadCount === 'number') {
          setUnreadCount(res.unreadCount);
        }
      }
    } catch (err) {
      console.warn('Failed to load notifications:', err.message);
      setError('Unable to load notifications. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Listen to Socket.IO real-time events
  useEffect(() => {
    if (!user) return;

    // Join user's private room and role room on socket
    socket.emit('join_user', { userId: user.id, role: user.role });

    fetchUnreadCount();

    const handleNewNotification = (newNotif) => {
      // Prepend new notification
      setNotifications((prev) => {
        // Prevent duplicate appending
        if (prev.some((n) => n.id === newNotif.id)) return prev;
        return [newNotif, ...prev];
      });
      // Increment unread count
      setUnreadCount((prev) => prev + 1);
    };

    const handleCountUpdate = ({ unreadCount: newCount }) => {
      if (typeof newCount === 'number') {
        setUnreadCount(newCount);
      }
    };

    socket.on('notification:new', handleNewNotification);
    socket.on('notification:count', handleCountUpdate);

    return () => {
      socket.off('notification:new', handleNewNotification);
      socket.off('notification:count', handleCountUpdate);
    };
  }, [user, fetchUnreadCount]);

  // Load list when panel opens
  useEffect(() => {
    if (isOpen) {
      fetchList();
    }
  }, [isOpen, fetchList]);

  // Outside click & escape listener to close panel
  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Handle Mark Single Notification as Read
  const handleMarkRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      await markNotificationAsRead(id);
    } catch (err) {
      console.warn('Failed to mark notification read:', err.message);
    }
  };

  // Handle Mark All as Read
  const handleMarkAllRead = async () => {
    if (unreadCount === 0 || isMarkingAll) return;
    setIsMarkingAll(true);
    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      await markAllNotificationsAsRead();
    } catch (err) {
      console.warn('Failed to mark all as read:', err.message);
    } finally {
      setIsMarkingAll(false);
    }
  };

  if (!user) return null;

  return (
    <div className="relative inline-block text-left" ref={panelRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-xl border transition cursor-pointer flex items-center justify-center ${
          isOpen
            ? 'bg-blue-50 border-blue-300 text-[#0072CE]'
            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 shadow-2xs'
        }`}
        aria-label={`Notifications (${unreadCount} unread)`}
        aria-expanded={isOpen}
        title="View Notifications"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-75 duration-150"
            aria-hidden="true"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div
          role="region"
          aria-label="Notifications Panel"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200/80">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 tracking-tight">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="bg-blue-100 text-[#0072CE] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} unread
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={isMarkingAll}
                className="text-[11px] font-semibold text-[#0072CE] hover:text-blue-800 transition disabled:opacity-50 cursor-pointer"
              >
                {isMarkingAll ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Body / List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {/* Loading Skeleton */}
            {isLoading && (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-xl bg-slate-200 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-slate-200 rounded w-3/4" />
                      <div className="h-2.5 bg-slate-100 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error State */}
            {!isLoading && error && (
              <div className="p-6 text-center">
                <p className="text-xs text-rose-600 mb-2 font-medium">{error}</p>
                <button
                  type="button"
                  onClick={fetchList}
                  className="text-xs font-bold text-[#0072CE] hover:underline cursor-pointer"
                >
                  Retry Loading
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !error && notifications.length === 0 && (
              <div className="p-8 text-center">
                <div className="w-10 h-10 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center text-lg mb-2">
                  📭
                </div>
                <p className="text-xs font-bold text-slate-800">All caught up!</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  No notifications for your account right now.
                </p>
              </div>
            )}

            {/* Notifications List */}
            {!isLoading &&
              !error &&
              notifications.map((item) => {
                const badge = getNotificationIcon(item.type);
                return (
                  <div
                    key={item.id}
                    onClick={() => !item.isRead && handleMarkRead(item.id)}
                    className={`p-3.5 flex items-start gap-3 transition cursor-pointer ${
                      item.isRead
                        ? 'bg-white hover:bg-slate-50/80 opacity-80'
                        : 'bg-blue-50/40 hover:bg-blue-50/70'
                    }`}
                  >
                    {/* Icon Badge */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm flex-shrink-0 ${badge.bg}`}
                    >
                      {badge.icon}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs truncate ${
                            item.isRead
                              ? 'font-semibold text-slate-800'
                              : 'font-extrabold text-slate-900'
                          }`}
                        >
                          {item.title}
                        </p>
                        <span className="text-[10px] text-slate-400 flex-shrink-0">
                          {formatTimeAgo(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 mt-0.5 line-clamp-2 leading-relaxed">
                        {item.message}
                      </p>
                    </div>

                    {/* Unread Indicator Dot */}
                    {!item.isRead && (
                      <div
                        className="w-2 h-2 rounded-full bg-[#0072CE] mt-1.5 flex-shrink-0"
                        title="Unread"
                      />
                    )}
                  </div>
                );
              })}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50 text-center border-t border-slate-100">
            <span className="text-[10px] text-slate-400 font-medium">
              Real-time hospital alerts powered by Socket.IO
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

