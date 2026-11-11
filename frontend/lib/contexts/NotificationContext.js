'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../api';
import { useAuth } from './AuthContext';
import notificationService from '../services/notificationService';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10000,
    totalPages: 1,
    hasMore: true
  });
  
  const isInitialLoad = useRef(true);
  const hasSetupWebSocket = useRef(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async (page = 1, append = false) => {
    if (!user) return;

    try {
      setIsLoading(true);
      
      const response = await api.notifications.getNotifications({
        page,
        limit: pagination.limit
      });

      let fetchedNotifications = [];
      let backendTotal = 0;
      let totalPages = 1;

      if (Array.isArray(response)) {
        fetchedNotifications = response;
        backendTotal = response.length;
      } else {
        if (response.notifications && Array.isArray(response.notifications)) {
          fetchedNotifications = response.notifications;
        } else if (response.data && Array.isArray(response.data)) {
          fetchedNotifications = response.data;
        }
        backendTotal = response.total || response.totalCount || fetchedNotifications.length;
        totalPages = response.totalPages || Math.ceil(backendTotal / pagination.limit);
      }

      setTotalCount(backendTotal);

      setNotifications(prev => {
        if (append) {
          const existingIds = new Set(prev.map(n => n.id));
          const newNotifications = fetchedNotifications.filter(n => !existingIds.has(n.id));
          return [...prev, ...newNotifications];
        }
        return fetchedNotifications;
      });

      const unread = fetchedNotifications.filter(n => !(n.read || n.isRead || n.is_read)).length;
      setUnreadCount(unread);

      setPagination(prev => ({
        ...prev,
        page,
        totalPages,
        hasMore: page < totalPages
      }));

      return fetchedNotifications;
    } catch (error) {
      console.error('❌ Failed to fetch notifications:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [user, pagination.limit]);

  const loadMore = useCallback(async () => {
    if (!pagination.hasMore || isLoading) return;
    await fetchNotifications(pagination.page + 1, true);
  }, [pagination.hasMore, pagination.page, isLoading, fetchNotifications]);

  const refetch = useCallback(async () => {
    await fetchNotifications(1, false);
  }, [fetchNotifications]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      console.log('📖 Marking as read:', notificationId);
      
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read: true, isRead: true, is_read: true, readAt: new Date().toISOString() }
            : n
        )
      );

      // Immediately recalculate unread count
      setNotifications(current => {
        const unread = current.filter(n => !(n.read || n.isRead || n.is_read)).length;
        setUnreadCount(unread);
        return current;
      });

      await api.notifications.markAsRead(notificationId);
    } catch (error) {
      console.error('❌ Failed to mark as read:', error);
      await refetch();
      throw error;
    }
  }, [refetch]);

  const markAllAsRead = useCallback(async () => {
    try {
      setNotifications(prev => 
        prev.map(n => ({ 
          ...n, 
          read: true, 
          isRead: true, 
          is_read: true, 
          readAt: new Date().toISOString() 
        }))
      );
      setUnreadCount(0);

      await api.notifications.markAllAsRead();
    } catch (error) {
      console.error('❌ Failed to mark all as read:', error);
      await refetch();
      throw error;
    }
  }, [refetch]);

  const deleteNotification = useCallback(async (notificationId) => {
    try {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setTotalCount(prev => Math.max(0, prev - 1));
      
      // Recalculate unread
      setNotifications(current => {
        const unread = current.filter(n => !(n.read || n.isRead || n.is_read)).length;
        setUnreadCount(unread);
        return current;
      });

      await api.notifications.deleteNotification(notificationId);
    } catch (error) {
      console.error('❌ Failed to delete:', error);
      await refetch();
      throw error;
    }
  }, [refetch]);

  const deleteBulkNotifications = useCallback(async (notificationIds) => {
    try {
      const deleteCount = notificationIds.length;
      setNotifications(prev => prev.filter(n => !notificationIds.includes(n.id)));
      setTotalCount(prev => Math.max(0, prev - deleteCount));
      
      // Recalculate unread
      setNotifications(current => {
        const unread = current.filter(n => !(n.read || n.isRead || n.is_read)).length;
        setUnreadCount(unread);
        return current;
      });

      await api.notifications.deleteBulk(notificationIds);
    } catch (error) {
      console.error('❌ Failed to delete bulk:', error);
      await refetch();
      throw error;
    }
  }, [refetch]);

  const getConnectionStatus = useCallback(() => {
    return notificationService.getStatus();
  }, []);

  // WebSocket setup - ONLY ONCE
  useEffect(() => {
    if (!user || hasSetupWebSocket.current) return;

    const token = localStorage.getItem('scamalert_token');
    if (!token) {
      setIsConnected(false);
      return;
    }

    console.log('🔌 Setting up WebSocket...');
    hasSetupWebSocket.current = true;

    const setupWebSocket = async () => {
      try {
        await notificationService.connect(token);
        setIsConnected(true);
        console.log('✅ WebSocket connected');

        // Setup notification listener
        const unsubscribe = notificationService.on('notification', (notification) => {
          console.log('📨 NEW NOTIFICATION:', notification);
          
          // Normalize notification
          const normalized = {
            ...notification,
            read: false,
            isRead: false,
            is_read: false,
          };

          // Add to notifications
          setNotifications(prev => {
            const exists = prev.some(n => n.id === notification.id);
            if (exists) return prev;
            console.log('✅ Adding notification to state');
            return [normalized, ...prev];
          });

          // Update counts
          setTotalCount(prev => prev + 1);
          setUnreadCount(prev => prev + 1);
          
          console.log('✅ State updated!');
        });

        return () => {
          unsubscribe();
          notificationService.disconnect();
          hasSetupWebSocket.current = false;
        };
      } catch (error) {
        console.error('❌ WebSocket setup failed:', error);
        setIsConnected(false);
        hasSetupWebSocket.current = false;
      }
    };

    setupWebSocket();
  }, [user]);

  // Initial load
  useEffect(() => {
    if (user && isInitialLoad.current) {
      isInitialLoad.current = false;
      fetchNotifications(1, false);
    }
  }, [user, fetchNotifications]);

  // Debug: Log state changes
  useEffect(() => {
    console.log('🔄 Notifications state changed:', notifications.length);
    console.log('🔄 Unread count:', unreadCount);
  }, [notifications, unreadCount]);

  const value = {
    notifications,
    unreadCount,
    totalCount,
    isLoading,
    pagination,
    isConnected,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteBulkNotifications,
    refetch,
    loadMore,
    getConnectionStatus,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};