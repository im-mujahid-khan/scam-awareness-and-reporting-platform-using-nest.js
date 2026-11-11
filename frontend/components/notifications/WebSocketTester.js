    // components/notifications/WebSocketTester.jsx
'use client';

import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

/**
 * 🧪 Simple WebSocket Connection Tester
 * Use this to diagnose connection issues
 */
export function WebSocketTester() {
  const [logs, setLogs] = useState([]);
  const [socket, setSocket] = useState(null);
  const [status, setStatus] = useState('Not connected');

  const addLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { timestamp, message, type }]);
    console.log(`[${timestamp}] ${message}`);
  };

  const testConnection = () => {
    setLogs([]);
    addLog('🚀 Starting connection test...', 'info');

    // Get token
    const token = localStorage.getItem('scamalert_token');
    if (!token) {
      addLog('❌ No token found in localStorage', 'error');
      return;
    }

    addLog(`✅ Token found: ${token.substring(0, 20)}...`, 'success');

    // Check token expiration
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const expiresAt = new Date(payload.exp * 1000);
      const now = new Date();
      const isExpired = expiresAt < now;
      
      addLog(`🔐 Token expires: ${expiresAt.toLocaleString()}`, isExpired ? 'error' : 'success');
      addLog(`🔐 Token ${isExpired ? 'EXPIRED' : 'valid'}`, isExpired ? 'error' : 'success');
      
      if (isExpired) {
        addLog('❌ Token is expired! Please login again.', 'error');
        return;
      }
    } catch (e) {
      addLog(`⚠️ Could not decode token: ${e.message}`, 'warning');
    }

    // Connection config
    const url = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
    const namespace = process.env.NEXT_PUBLIC_WS_NAMESPACE || '/notifications';
    const path = process.env.NEXT_PUBLIC_WS_PATH || '/socket.io';

    addLog(`📡 Connecting to: ${url}${namespace}`, 'info');
    addLog(`🔌 Socket.IO path: ${path}`, 'info');

    setStatus('Connecting...');

    try {
      const newSocket = io(`${url}${namespace}`, {
        path: path,
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: false, // Disable for testing
        timeout: 10000,
      });

      // Log all events
      newSocket.onAny((eventName, ...args) => {
        addLog(`📨 Event: ${eventName}`, 'info');
        console.log('Socket event:', eventName, args);
      });

      newSocket.on('connect', () => {
        addLog('✅ CONNECTED!', 'success');
        addLog(`🆔 Socket ID: ${newSocket.id}`, 'success');
        addLog(`🚀 Transport: ${newSocket.io.engine.transport.name}`, 'info');
        setStatus('Connected ✅');
      });

      newSocket.on('connect_error', (error) => {
        addLog(`❌ Connection Error: ${error.message}`, 'error');
        addLog(`📋 Error details: ${JSON.stringify(error)}`, 'error');
        setStatus('Connection failed ❌');
        
        // Provide helpful hints
        if (error.message.includes('xhr poll error')) {
          addLog('💡 Hint: Backend might not be accessible. Check if backend is running.', 'warning');
        }
        if (error.message.includes('timeout')) {
          addLog('💡 Hint: Connection timeout. Check backend URL and network.', 'warning');
        }
        if (error.message.includes('cors')) {
          addLog('💡 Hint: CORS error. Check backend CORS configuration.', 'warning');
        }
      });

      newSocket.on('disconnect', (reason) => {
        addLog(`❌ Disconnected: ${reason}`, 'warning');
        setStatus('Disconnected');
      });

      newSocket.on('connected', (data) => {
        addLog(`📬 Welcome message: ${JSON.stringify(data)}`, 'success');
      });

      newSocket.on('error', (error) => {
        addLog(`🔥 Socket error: ${error}`, 'error');
      });

      setSocket(newSocket);

      // Auto-disconnect after 30 seconds
      setTimeout(() => {
        if (newSocket.connected) {
          addLog('⏰ Test complete. Disconnecting...', 'info');
          newSocket.disconnect();
        }
      }, 30000);

    } catch (error) {
      addLog(`💥 Exception: ${error.message}`, 'error');
      setStatus('Error');
    }
  };

  const disconnect = () => {
    if (socket) {
      addLog('👋 Manually disconnecting...', 'info');
      socket.disconnect();
      setSocket(null);
      setStatus('Disconnected');
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      case 'warning': return 'text-yellow-600';
      default: return 'text-gray-700';
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-t-lg">
          <h1 className="text-2xl font-bold">🧪 WebSocket Connection Tester</h1>
          <p className="text-sm mt-2 opacity-90">
            Diagnose WebSocket connection issues with your backend
          </p>
        </div>

        {/* Status */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Connection Status</p>
              <p className="text-xl font-semibold mt-1">{status}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={testConnection}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                🧪 Test Connection
              </button>
              {socket && (
                <button
                  onClick={disconnect}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  ❌ Disconnect
                </button>
              )}
              {logs.length > 0 && (
                <button
                  onClick={clearLogs}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
                >
                  🗑️ Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Connection Logs</h2>
          {logs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <p>Click "Test Connection" to start diagnostics</p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2 max-h-96 overflow-y-auto font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index} className={`${getLogColor(log.type)}`}>
                  <span className="text-gray-500">[{log.timestamp}]</span> {log.message}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <h3 className="font-semibold mb-2">📋 Instructions</h3>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Make sure your backend is running on <code className="bg-gray-200 px-1 rounded">{process.env.NEXT_PUBLIC_SOCKET_URL}</code></li>
            <li>Make sure you're logged in (JWT token exists)</li>
            <li>Click "Test Connection" button</li>
            <li>Watch the logs for connection status and errors</li>
            <li>If connection fails, check the error messages for hints</li>
          </ol>
        </div>

        {/* Environment Info */}
        <div className="p-6 border-t border-gray-200 bg-gray-50">
          <h3 className="font-semibold mb-2">⚙️ Environment Configuration</h3>
          <div className="text-sm space-y-1 font-mono">
            <div><span className="text-gray-600">URL:</span> <code className="bg-gray-200 px-1 rounded">{process.env.NEXT_PUBLIC_SOCKET_URL || 'not set'}</code></div>
            <div><span className="text-gray-600">Namespace:</span> <code className="bg-gray-200 px-1 rounded">{process.env.NEXT_PUBLIC_WS_NAMESPACE || 'not set'}</code></div>
            <div><span className="text-gray-600">Path:</span> <code className="bg-gray-200 px-1 rounded">{process.env.NEXT_PUBLIC_WS_PATH || 'not set'}</code></div>
            <div><span className="text-gray-600">Debug:</span> <code className="bg-gray-200 px-1 rounded">{process.env.NEXT_PUBLIC_DEBUG_WS || 'false'}</code></div>
            <div><span className="text-gray-600">Enabled:</span> <code className="bg-gray-200 px-1 rounded">{process.env.NEXT_PUBLIC_WS_ENABLED || 'true'}</code></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WebSocketTester;