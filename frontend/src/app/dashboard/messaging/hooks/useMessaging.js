import { useState, useCallback } from 'react';
import { useAuth } from '../../../../lib/contexts/AuthContext';

export function useMessaging() {
  const { api } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sendMessage = useCallback(async (conversationId, content, type = 'TEXT', mediaUrl = null) => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.messaging.sendMessage(conversationId, {
        content,
        type,
        mediaUrl
      });

      return response?.data || response;
    } catch (err) {
      setError(err.message || 'Failed to send message');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const markAsRead = useCallback(async (messageIds) => {
    try {
      await api.messaging.markMessagesAsRead(messageIds);
    } catch (err) {
      console.error('Failed to mark messages as read:', err);
    }
  }, [api]);

  const deleteConversation = useCallback(async (conversationId) => {
    try {
      await api.messaging.deleteConversation(conversationId);
      return true;
    } catch (err) {
      setError(err.message || 'Failed to delete conversation');
      throw err;
    }
  }, [api]);

  const reportMessage = useCallback(async (messageId, reason, conversationId) => {
    try {
      await api.messaging.reportMessage({
        messageId,
        reason,
        conversationId
      });
      return true;
    } catch (err) {
      setError(err.message || 'Failed to report message');
      throw err;
    }
  }, [api]);

  const blockUser = useCallback(async (userId, conversationId) => {
    try {
      await api.messaging.blockUser({
        userId,
        conversationId
      });
      return true;
    } catch (err) {
      setError(err.message || 'Failed to block user');
      throw err;
    }
  }, [api]);

  const handleRequest = useCallback(async (requestId, action) => {
    try {
      await api.messaging.handleMessageRequest(requestId, action);
      return true;
    } catch (err) {
      setError(err.message || `Failed to ${action} request`);
      throw err;
    }
  }, [api]);

  const uploadMedia = useCallback(async (file, type = 'IMAGE') => {
    try {
      setLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', file);

      let response;
      if (type === 'IMAGE') {
        response = await api.messaging.uploadMessageImage(formData);
      } else {
        response = await api.messaging.uploadMessageFile(formData);
      }

      return response?.data?.url || response?.url;
    } catch (err) {
      setError(err.message || 'Failed to upload media');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [api]);

  const getUnreadCount = useCallback(async () => {
    try {
      const response = await api.messaging.getUnreadMessageCount();
      return response?.count || response?.data?.count || 0;
    } catch (err) {
      console.error('Failed to get unread count:', err);
      return 0;
    }
  }, [api]);

  const getUnreadRequestCount = useCallback(async () => {
    try {
      const response = await api.messaging.getUnreadRequestCount();
      return response?.count || response?.data?.count || 0;
    } catch (err) {
      console.error('Failed to get unread request count:', err);
      return 0;
    }
  }, [api]);

  return {
    loading,
    error,
    sendMessage,
    markAsRead,
    deleteConversation,
    reportMessage,
    blockUser,
    handleRequest,
    uploadMedia,
    getUnreadCount,
    getUnreadRequestCount
  };
}