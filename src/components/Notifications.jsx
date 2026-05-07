import React, { useState, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const Notifications = () => {
  const { currentChat } = useChat();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (socket) {
      // Listen for new message notifications
      socket.on('new_message_notification', (data) => {
        if (data.senderId !== user?.id && data.chatId !== currentChat?._id) {
          addNotification({
            id: Date.now(),
            type: 'message',
            title: `New message from ${data.senderName}`,
            message: data.content,
            chatId: data.chatId,
            senderId: data.senderId,
            timestamp: new Date(),
            read: false
          });
        }
      });

      // Listen for typing notifications
      socket.on('typing_notification', (data) => {
        if (data.userId !== user?.id && data.chatId === currentChat?._id) {
          addNotification({
            id: Date.now(),
            type: 'typing',
            title: `${data.username} is typing...`,
            message: '',
            chatId: data.chatId,
            userId: data.userId,
            timestamp: new Date(),
            read: false,
            autoHide: true
          });
        }
      });

      // Listen for user online/offline
      socket.on('user_status_change', (data) => {
        addNotification({
          id: Date.now(),
          type: 'status',
          title: `${data.username} is ${data.status}`,
          message: '',
          userId: data.userId,
          timestamp: new Date(),
          read: false,
          autoHide: true
        });
      });

      return () => {
        socket.off('new_message_notification');
        socket.off('typing_notification');
        socket.off('user_status_change');
      };
    }
  }, [socket, user, currentChat]);

  useEffect(() => {
    // Auto-hide typing and status notifications after 3 seconds
    const autoHideNotifications = notifications.filter(n => n.autoHide && !n.read);
    
    autoHideNotifications.forEach(notification => {
      const timer = setTimeout(() => {
        markAsRead(notification.id);
      }, 3000);
      
      return () => clearTimeout(timer);
    });
  }, [notifications]);

  const addNotification = (notification) => {
    setNotifications(prev => [notification, ...prev]);
    setUnreadCount(prev => prev + 1);
    
    // Show browser notification if permission is granted
    if (Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }
  };

  const markAsRead = (notificationId) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  };

  const deleteNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    if (notifications.find(n => n.id === notificationId && !n.read)) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return 'bi-chat-dots';
      case 'typing':
        return 'bi-pencil';
      case 'status':
        return 'bi-circle';
      default:
        return 'bi-bell';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'message':
        return 'text-success';
      case 'typing':
        return 'text-info';
      case 'status':
        return 'text-warning';
      default:
        return 'text-muted';
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
    return date.toLocaleDateString();
  };

  // Request notification permission on component mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  return (
    <div className="notifications-container">
      {/* Notifications Button - Enhanced with clear label and indicators */}
      <div className="position-relative">
        <button
          className="btn btn-outline-success position-relative d-flex align-items-center gap-1"
          onClick={() => setShowNotifications(!showNotifications)}
          title={unreadCount > 0 ? `You have ${unreadCount} unread notifications` : "View notifications"}
          aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
        >
          <i className="bi bi-bell"></i>
          <span className="d-none d-lg-inline small">Alerts</span>
          {unreadCount > 0 && (
            <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications Dropdown */}
      {showNotifications && (
        <div className="notifications-dropdown position-absolute end-0 mt-2 bg-dark border-success rounded shadow-lg" style={{ zIndex: 1000, minWidth: '300px', maxHeight: '400px', overflow: 'auto' }}>
          <div className="p-3 border-bottom border-secondary">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="text-success mb-0">Notifications</h6>
              <div>
                {notifications.length > 0 && (
                  <>
                    <button
                      className="btn btn-sm btn-outline-success me-2"
                      onClick={markAllAsRead}
                    >
                      Mark all read
                    </button>
                    <button
                      className="btn btn-sm btn-outline-danger"
                      onClick={clearAllNotifications}
                    >
                      Clear all
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted">
              <i className="bi bi-bell-slash" style={{ fontSize: '2rem' }}></i>
              <p className="mb-0 mt-2">No notifications</p>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item p-3 border-bottom border-secondary ${
                    notification.read ? 'bg-dark' : 'bg-secondary'
                  }`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="d-flex align-items-start">
                    <div className={`me-3 ${getNotificationColor(notification.type)}`}>
                      <i className={`bi ${getNotificationIcon(notification.type)}`}></i>
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div className={`fw-bold ${notification.read ? 'text-muted' : 'text-light'}`}>
                            {notification.title}
                          </div>
                          {notification.message && (
                            <small className={`d-block ${notification.read ? 'text-muted' : 'text-light'}`}>
                              {notification.message.length > 50 
                                ? notification.message.substring(0, 50) + '...' 
                                : notification.message}
                            </small>
                          )}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          <small className="text-muted">
                            {formatTime(notification.timestamp)}
                          </small>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification.id);
                            }}
                          >
                            <i className="bi bi-x"></i>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Notifications;
