import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../../../lib/contexts/AuthContext';

export function useWebSocket({ conversationId, onNewMessage, onTyping, onReadReceipt }) {
  const { user } = useAuth();
  const wsRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!user?.id || !conversationId) return;

    const wsUrl = `wss://your-api.com/ws?userId=${user.id}&conversationId=${conversationId}`;
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      reconnectAttemptsRef.current = 0;
    };

    wsRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      attemptReconnect();
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }, [user?.id, conversationId]);

  const handleWebSocketMessage = (data) => {
    switch (data.type) {
      case 'NEW_MESSAGE':
        onNewMessage?.(data.message);
        break;
      case 'TYPING':
        onTyping?.(data.userId);
        break;
      case 'READ_RECEIPT':
        onReadReceipt?.(data.messageIds);
        break;
      case 'MESSAGE_DELETED':
        // Handle deleted message
        break;
      case 'USER_ONLINE':
        // Handle user online status
        break;
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  };

  const attemptReconnect = () => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.log('Max reconnection attempts reached');
      return;
    }

    reconnectAttemptsRef.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);

    setTimeout(() => {
      console.log(`Reconnecting attempt ${reconnectAttemptsRef.current}`);
      connect();
    }, delay);
  };

  const sendMessage = (message) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'SEND_MESSAGE',
        message
      }));
    }
  };

  const sendTyping = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'TYPING',
        userId: user?.id
      }));
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    connect,
    disconnect,
    sendMessage,
    sendTyping,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN
  };
}