import { io } from 'socket.io-client';

class NotificationService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 2000;
    this.pingInterval = null;
    this.hasSetupSocketListeners = false;
  }

  log(...args) {
    console.log('🔔 [NotificationService]', ...args);
  }

  async connect(token) {
    if (this.isConnected && this.socket?.connected) {
      this.log('Already connected, skipping...');
      return;
    }

    if (this.isConnecting) {
      this.log('Connection already in progress...');
      return;
    }

    this.isConnecting = true;

    try {
      this.log('═══════════════════════════════════════════');
      this.log('🔄 STARTING CONNECTION PROCESS');
      this.log('═══════════════════════════════════════════');

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const namespace = '/notifications';
      const fullUrl = `${baseUrl}${namespace}`;

      this.log('Full URL:', fullUrl);
      this.log('Path:', '/socket.io');
      this.log('Token length:', token?.length);

      if (!token) {
        throw new Error('No authentication token provided');
      }

      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        throw new Error('Invalid token format');
      }
      this.log('✅ Token format valid (3 parts)');

      try {
        const payload = JSON.parse(atob(tokenParts[1]));
        const expiresAt = new Date(payload.exp * 1000);
        const now = new Date();
        const isExpired = expiresAt < now;
        const minutesUntilExpiry = Math.floor((expiresAt - now) / 60000);

        this.log('🔐 Token info:', {
          userId: payload.userId,
          expiresAt: expiresAt.toISOString(),
          expiresIn: `${minutesUntilExpiry} minutes`,
          isExpired
        });

        if (isExpired) {
          throw new Error('Token has expired');
        }
      } catch (e) {
        this.log('⚠️ Could not validate token expiry:', e.message);
      }

      // ✅ Disconnect old socket if exists
      if (this.socket) {
        this.log('🔌 Disconnecting old socket...');
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
        this.hasSetupSocketListeners = false;
      }

      this.log('🔌 Creating new socket instance...');
      this.socket = io(fullUrl, {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        auth: { token },
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        timeout: 10000,
      });

      this.log('✅ Socket instance created');

      // ✅ Setup socket listeners ONLY ONCE
      if (!this.hasSetupSocketListeners) {
        this.setupSocketListeners();
        this.hasSetupSocketListeners = true;
        this.log('✅ Socket listeners registered (FIRST TIME)');
      } else {
        this.log('⚠️ Socket listeners already registered, skipping');
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.isConnecting = false;
          reject(new Error('Connection timeout'));
        }, 15000);

        this.socket.once('connect', () => {
          clearTimeout(timeout);
          this.isConnected = true;
          this.isConnecting = false;
          this.reconnectAttempts = 0;

          this.log('═══════════════════════════════════════════');
          this.log('✅ ✅ ✅ CONNECTION SUCCESSFUL ✅ ✅ ✅');
          this.log('═══════════════════════════════════════════');
          this.log('Socket ID:', this.socket.id);
          this.log('Connected:', this.socket.connected);
          this.log('Transport:', this.socket.io.engine.transport.name);
          this.log('═══════════════════════════════════════════');

          this.setupPingPong();
          resolve();
        });

        this.socket.once('connect_error', (error) => {
          clearTimeout(timeout);
          this.isConnecting = false;
          this.log('❌ Connection error:', error.message);
          reject(error);
        });
      });

    } catch (error) {
      this.isConnecting = false;
      this.log('❌ Connection failed:', error);
      throw error;
    }
  }

  setupSocketListeners() {
    if (!this.socket) return;

    this.log('📡 Setting up socket event listeners...');

    this.socket.on('connect', () => {
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.log('✅ Socket connected');
    });

    this.socket.on('disconnect', (reason) => {
      this.isConnected = false;
      this.log('❌ Socket disconnected:', reason);
      
      if (this.pingInterval) {
        clearInterval(this.pingInterval);
        this.pingInterval = null;
      }
    });

    this.socket.on('connect_error', (error) => {
      this.log('❌ Connection error:', error.message);
      this.reconnectAttempts++;
    });

    this.socket.on('error', (error) => {
      this.log('❌ Socket error:', error);
    });

    this.socket.on('welcome', (data) => {
      this.log('📨 Server welcome message:', data);
    });

    // ✅ CRITICAL: Single notification listener on socket
    this.socket.on('notification', (notification) => {
      this.log('🔔 RAW NOTIFICATION FROM SERVER:', notification);
      
      // Emit to all registered app listeners
      this.emit('notification', notification);
    });

    this.log('✅ All event listeners registered');
  }

  setupPingPong() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.socket?.connected) {
        this.log('🏓 Sending ping...');
        this.socket.emit('ping', { timestamp: Date.now() });
      }
    }, 30000);

    this.socket.on('pong', (data) => {
      this.log('🏓 Pong received:', data);
    });

    this.log('✅ Ping/pong setup complete');
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event).add(callback);
    this.log(`📝 Registered listener for '${event}'. Total:`, this.listeners.get(event).size);

    return () => {
      const eventListeners = this.listeners.get(event);
      if (eventListeners) {
        eventListeners.delete(callback);
        this.log(`🗑️ Removed listener for '${event}'. Remaining:`, eventListeners.size);
      }
    };
  }

  emit(event, data) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners && eventListeners.size > 0) {
      this.log(`📤 Emitting '${event}' to ${eventListeners.size} listener(s)`);
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          this.log(`❌ Error in listener for '${event}':`, error);
        }
      });
    } else {
      this.log(`⚠️ No listeners registered for '${event}'`);
    }
  }

  disconnect() {
    this.log('👋 Disconnecting...');
    
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.hasSetupSocketListeners = false;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.listeners.clear();
    
    this.log('✅ Disconnected and cleaned up');
  }

  getStatus() {
    return {
      connected: this.isConnected,
      connecting: this.isConnecting,
      socketId: this.socket?.id || null,
      reconnectAttempts: this.reconnectAttempts,
      listenerCount: Array.from(this.listeners.values()).reduce((sum, set) => sum + set.size, 0),
    };
  }
}

// ✅ CRITICAL: Default export
const notificationServiceInstance = new NotificationService();
export default notificationServiceInstance;