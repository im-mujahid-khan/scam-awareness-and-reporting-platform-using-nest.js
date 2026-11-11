'use client';

import { useState, useEffect } from 'react';
import notificationService from '../lib/services/notificationService';

export default function WebSocketDebugger() {
  const [status, setStatus] = useState(null);
  const [lastNotification, setLastNotification] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const currentStatus = notificationService.getStatus();
      setStatus(currentStatus);
    }, 1000);

    // Listen for notifications
    const unsubscribe = notificationService.on('notification', (notification) => {
      console.log('🔍 [WebSocketDebugger] Received notification:', notification);
      setLastNotification(notification);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const handleTestPing = () => {
    const success = notificationService.testConnection();
    alert(success ? 'Ping sent!' : 'Not connected');
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 20,
      right: 20,
      background: '#fff',
      border: '2px solid #667eea',
      borderRadius: 8,
      padding: 16,
      maxWidth: 400,
      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
      zIndex: 9999,
      fontSize: 12,
      fontFamily: 'monospace'
    }}>
      <h4 style={{ margin: 0, marginBottom: 12, color: '#667eea' }}>WebSocket Debug</h4>
      
      {status && (
        <>
          <div style={{ marginBottom: 8 }}>
            <strong>Status:</strong>{' '}
            <span style={{ 
              color: status.connected ? 'green' : 'red',
              fontWeight: 'bold'
            }}>
              {status.connected ? '✅ Connected' : '❌ Disconnected'}
            </span>
          </div>
          
          <div style={{ marginBottom: 8 }}>
            <strong>Socket ID:</strong> {status.socketId || 'N/A'}
          </div>
          
          <div style={{ marginBottom: 8 }}>
            <strong>Listeners:</strong> {status.listenerCount}
          </div>
          
          <div style={{ marginBottom: 8 }}>
            <strong>Reconnect Attempts:</strong> {status.reconnectAttempts}
          </div>
          
          {status.lastError && (
            <div style={{ marginBottom: 8, color: 'red' }}>
              <strong>Last Error:</strong> {status.lastError}
            </div>
          )}
        </>
      )}
      
      {lastNotification && (
        <div style={{ 
          marginTop: 12, 
          padding: 8, 
          background: '#f0f4ff',
          borderRadius: 4 
        }}>
          <strong>Last Notification:</strong>
          <div style={{ marginTop: 4 }}>
            Type: {lastNotification.type}<br />
            ID: {lastNotification.id}
          </div>
        </div>
      )}
      
      <button 
        onClick={handleTestPing}
        style={{
          marginTop: 12,
          padding: '8px 16px',
          background: '#667eea',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          cursor: 'pointer',
          width: '100%'
        }}
      >
        Send Test Ping
      </button>
    </div>
  );
}