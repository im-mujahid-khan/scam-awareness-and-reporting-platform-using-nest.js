// Location: src/lib/api/notifications.js
import { apiClient } from './client';

export const notificationsApi = {
  // Get notifications
  getNotifications: (params = {}) => {
    const { page = 1, limit = 10000 } = params;
    return apiClient.get('/notifications', { params: { page, limit } });
  },

  // Mark as read
  markAsRead: (notificationId) => {
    return apiClient.put(`/notifications/${notificationId}/read`);
  },

  // Mark all as read
  markAllAsRead: () => {
    return apiClient.put('/notifications/read-all');
  },

  // Delete notification
  deleteNotification: (notificationId) => {
    return apiClient.delete(`/notifications/${notificationId}`);
  },

  // Get unread count
  getUnreadCount: () => {
    return apiClient.get('/notifications/unread-count');
  },

  // Send test notification
  sendTestNotification: () => {
    return apiClient.post('/notifications/test');
  },

  // Test broadcast
  sendTestBroadcast: () => {
    return apiClient.post('/notifications/test-broadcast');
  },

  // Get WebSocket status - WITH CACHING
  getWebSocketStatus: () => {
    // Use sessionStorage to prevent rapid calls
    const cacheKey = 'ws_status_cache';
    const cached = sessionStorage.getItem(cacheKey);
    
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Cache for 10 seconds
      if (Date.now() - timestamp < 10000) {
        return Promise.resolve(data);
      }
    }
    
    return apiClient.get('/notifications/ws-status')
      .then(response => {
        // Cache the response
        sessionStorage.setItem(cacheKey, JSON.stringify({
          data: response,
          timestamp: Date.now()
        }));
        return response;
      });
  }
};