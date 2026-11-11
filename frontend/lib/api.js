// api.js - Complete API client with FIXED comment endpoints
// Location: src/lib/api.js
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.isRefreshing = false;
    this.failedQueue = [];
    this.refreshPromise = null;
  }

  // Process failed requests queue
  processQueue(error, token = null) {
    this.failedQueue.forEach(prom => {
      if (error) {
        prom.reject(error);
      } else {
        prom.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  // Token refresh function
  async refreshAccessToken() {
    // If already refreshing, return the existing promise
    if (this.isRefreshing) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = new Promise(async (resolve, reject) => {
      try {
        const refreshToken = localStorage.getItem('scamalert_refresh_token');
        
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        console.log('Attempting to refresh access token...');
        
        const response = await fetch(`${this.baseUrl}/api/v1/auth/refresh-token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ refreshToken }),
        });

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            // Refresh token is invalid or expired
            console.log('Refresh token invalid/expired, clearing auth data');
            this.clearAuthData();
            throw new Error('REFRESH_TOKEN_EXPIRED');
          }
          throw new Error(`Token refresh failed with status: ${response.status}`);
        }

        const data = await response.json();
        
        if (!data.accessToken) {
          throw new Error('No access token in refresh response');
        }

        // Store new tokens
        localStorage.setItem('scamalert_token', data.accessToken);
        if (data.refreshToken) {
          localStorage.setItem('scamalert_refresh_token', data.refreshToken);
        }

        console.log('Access token refreshed successfully');
        resolve(data.accessToken);
      } catch (error) {
        console.error('Token refresh failed:', error);
        
        // Clear auth data on refresh failure
        if (error.message === 'REFRESH_TOKEN_EXPIRED') {
          this.clearAuthData();
        }
        
        reject(error);
      } finally {
        this.isRefreshing = false;
        this.refreshPromise = null;
      }
    });

    return this.refreshPromise;
  }

  // Clear authentication data
  clearAuthData() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('scamalert_token');
      localStorage.removeItem('scamalert_refresh_token');
      localStorage.removeItem('scamalert_user');
      localStorage.removeItem('scamalert_profile');
      localStorage.removeItem('scamalert_email_verified');
    }
  }

  // Enhanced request method with token refresh
  async request(endpoint, options = {}) {
    let token = localStorage.getItem('scamalert_token');
    let isRetry = false;

    const makeRequest = async (currentToken) => {
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (currentToken) {
        headers['Authorization'] = `Bearer ${currentToken}`;
      }

      const config = {
        ...options,
        headers,
      };

      // Handle FormData (for file uploads)
      if (options.body instanceof FormData) {
        delete headers['Content-Type'];
      }

      try {
        const response = await fetch(`${this.baseUrl}${endpoint}`, config);
        
        // Check for 401 Unauthorized (token expired)
        if (response.status === 401 && token && !isRetry) {
          console.log('Access token expired, attempting refresh...');
          
          try {
            // Try to refresh token
            const newToken = await this.refreshAccessToken();
            
            // Retry the original request with new token
            isRetry = true;
            return makeRequest(newToken);
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
            
            // Check if it's a session conflict (logged in elsewhere)
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || 'Session expired';
            
            // Check for session conflict specific messages
            const sessionConflictKeywords = [
              'logged in elsewhere',
              'another device',
              'another session',
              'session conflict',
              'multiple sessions',
              'active session',
              'SESSION_CONFLICT'
            ];
            
            const isSessionConflict = sessionConflictKeywords.some(keyword => 
              errorMessage.toLowerCase().includes(keyword.toLowerCase()) ||
              errorData.code === 'SESSION_CONFLICT'
            );
            
            if (isSessionConflict) {
              // Show session expired notification instead of redirecting immediately
              this.showSessionExpiredNotification(errorMessage);
              throw new Error('SESSION_EXPIRED_CONFLICT');
            } else {
              // Regular session expired
              this.clearAuthData();
              window.location.href = '/auth/login?session=expired';
              throw new Error('Session expired. Please login again.');
            }
          }
        }
        
        // Handle other error statuses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.message || errorData.error || `HTTP error! status: ${response.status}`;
          
          // Check for session conflict in other statuses
          if (response.status === 403 || response.status === 409) {
            const sessionConflictKeywords = [
              'logged in elsewhere',
              'another device',
              'another session',
              'session conflict',
              'multiple sessions',
              'active session',
              'SESSION_CONFLICT'
            ];
            
            const isSessionConflict = sessionConflictKeywords.some(keyword => 
              errorMessage.toLowerCase().includes(keyword.toLowerCase()) ||
              errorData.code === 'SESSION_CONFLICT'
            );
            
            if (isSessionConflict) {
              this.showSessionExpiredNotification(errorMessage);
              throw new Error('SESSION_EXPIRED_CONFLICT');
            }
          }
          
          throw new Error(errorMessage);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }
        return {};
      } catch (error) {
        console.error('API request failed:', error);
        
        // Don't redirect for session conflict errors - let the notification handle it
        if (error.message === 'SESSION_EXPIRED_CONFLICT') {
          throw error;
        }
        
        // For network errors, don't redirect
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
          throw new Error('Network error. Please check your connection.');
        }
        
        throw error;
      }
    };

    return makeRequest(token);
  }

  // Show session expired notification
  showSessionExpiredNotification(message) {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') return;
    
    // Create a custom notification system
    const notification = document.createElement('div');
    notification.id = 'session-expired-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: linear-gradient(135deg, #f56565 0%, #c53030 100%);
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      z-index: 99999;
      max-width: 400px;
      animation: slideIn 0.3s ease-out;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="font-size: 24px; flex-shrink: 0;">⚠️</div>
        <div style="flex-grow: 1;">
          <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">
            Session Expired
          </div>
          <div style="font-size: 14px; opacity: 0.9; margin-bottom: 12px;">
            ${message || 'You have been logged out because you logged in on another device.'}
          </div>
          <div style="display: flex; gap: 8px; margin-top: 8px;">
            <button id="login-now-btn" style="
              background: rgba(255, 255, 255, 0.2);
              border: 1px solid rgba(255, 255, 255, 0.3);
              color: white;
              padding: 8px 16px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
              flex: 1;
            " onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'" 
            onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'">
              Login Again
            </button>
            <button id="dismiss-btn" style="
              background: transparent;
              border: 1px solid rgba(255, 255, 255, 0.3);
              color: white;
              padding: 8px 16px;
              border-radius: 6px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              transition: all 0.2s;
              flex: 1;
            " onmouseover="this.style.background='rgba(255, 255, 255, 0.1)'" 
            onmouseout="this.style.background='transparent'">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOut {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
    
    // Add event listeners
    setTimeout(() => {
      const loginBtn = document.getElementById('login-now-btn');
      const dismissBtn = document.getElementById('dismiss-btn');
      
      if (loginBtn) {
        loginBtn.onclick = () => {
          this.clearAuthData();
          notification.style.animation = 'slideOut 0.3s ease-in';
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
            window.location.href = '/auth/login';
          }, 300);
        };
      }
      
      if (dismissBtn) {
        dismissBtn.onclick = () => {
          notification.style.animation = 'slideOut 0.3s ease-in';
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        };
      }
      
      // Auto-remove after 10 seconds
      setTimeout(() => {
        if (notification.parentNode) {
          notification.style.animation = 'slideOut 0.3s ease-in';
          setTimeout(() => {
            if (notification.parentNode) {
              notification.parentNode.removeChild(notification);
            }
          }, 300);
        }
      }, 10000);
    }, 100);
  }

  // ==================== AUTH ENDPOINTS ====================

  auth = {
    login: (credentials) => this.request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

    register: (userData) => this.request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

    logout: () => this.request('/api/v1/auth/logout', {
      method: 'POST',
    }),

    getMe: () => this.request('/api/v1/auth/me'),

    updatePassword: (data) => this.request('/api/v1/auth/password', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

    sendVerificationEmail: () => this.request('/api/v1/auth/send-verification-email', {
      method: 'POST',
    }),

    verifyEmail: (token) => this.request('/api/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    }),

    checkEmailVerification: () => this.request('/api/v1/auth/check-verification'),

    requestPasswordReset: (email) => this.request('/api/v1/auth/request-password-reset', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

    resetPassword: (token, newPassword, confirmPassword) => this.request('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword, confirmPassword }),
    }),

    changePassword: (currentPassword, newPassword, confirmPassword) => this.request('/api/v1/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
    }),
  };

  // ==================== USER PROFILE ENDPOINTS ====================

  users = {
    getProfile: () => this.request('/api/v1/users/me'),

    updateProfile: (data) => this.request('/api/v1/users/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

    deleteAccount: () => this.request('/api/v1/users/me', {
      method: 'DELETE',
    }),

    updatePrivacy: (data) => this.request('/api/v1/users/me/privacy', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

    getUserById: (id) => this.request(`/api/v1/users/${id}`),

    restoreUser: (id) => this.request(`/api/v1/users/${id}/restore`, {
      method: 'POST',
    }),
  };

  // ==================== COMPANY MANAGEMENT ENDPOINTS ====================

  companies = {
    getAllCompanies: () => this.request('/api/v1/companies'),

    createCompany: (data) => this.request('/api/v1/companies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    getCompany: (id) => this.request(`/api/v1/companies/${id}`),

    updateCompany: (id, data) => this.request(`/api/v1/companies/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

    healthCheck: () => this.request('/api/v1/companies/health-check'),

    getMyCompanies: () => this.request('/api/v1/companies/me'),

    test: () => this.request('/api/v1/companies/test'),

    addStaff: (companyId, data) => this.request(`/api/v1/companies/${companyId}/staff`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    getStaff: (companyId) => this.request(`/api/v1/companies/${companyId}/staff`),

    removeStaff: (companyId, userId) => this.request(`/api/v1/companies/${companyId}/staff/${userId}`, {
      method: 'DELETE',
    }),
  };

  // ==================== MESSAGING ENDPOINTS ====================

  messaging = {
    // ==================== CONVERSATIONS ====================
    
    /**
     * Get user conversations
     * GET /api/v1/messaging/conversations
     */
    getConversations: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return this.request(`/api/v1/messaging/conversations${queryString ? `?${queryString}` : ''}`);
    },
    
    /**
     * Create or get a conversation
     * POST /api/v1/messaging/conversations
     */
    createOrGetConversation: async (data) => {
      console.log('Creating/getting conversation:', data);
      
      // Remove recipientId if it exists (backend doesn't accept it)
      const cleanData = { ...data };
      if (cleanData.recipientId) {
        delete cleanData.recipientId;
      }
      
      return this.request('/api/v1/messaging/conversations', {
        method: 'POST',
        body: JSON.stringify(cleanData),
      });
    },
    
    /**
     * Get conversation by ID
     * GET /api/v1/messaging/conversations/{id}
     */
    getConversation: async (conversationId) => {
      console.log('Getting conversation:', conversationId);
      return this.request(`/api/v1/messaging/conversations/${conversationId}`);
    },
    
    /**
     * Delete conversation for user
     * DELETE /api/v1/messaging/conversations/{id}
     */
    deleteConversation: async (conversationId) => {
      console.log('Deleting conversation:', conversationId);
      return this.request(`/api/v1/messaging/conversations/${conversationId}`, {
        method: 'DELETE',
      });
    },
    
    // ==================== MESSAGES ====================
    
    /**
     * Get conversation messages
     * GET /api/v1/messaging/conversations/{id}/messages
     */
    getMessages: async (conversationId, params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return this.request(`/api/v1/messaging/conversations/${conversationId}/messages${queryString ? `?${queryString}` : ''}`);
    },
    
    /**
     * Send a message
     * POST /api/v1/messaging/conversations/{id}/messages
     */
    sendMessage: async (conversationId, messageData) => {
      console.log('Sending message to conversation:', conversationId);
      
      // According to Swagger, we need to include conversationId in the request body
      const requestBody = {
        conversationId: conversationId,  // Add conversationId to body
        ...messageData
      };
      
      return this.request(`/api/v1/messaging/conversations/${conversationId}/messages`, {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
    },
    
    /**
     * Update message status (read/write)
     * PUT /api/v1/messaging/messages/{id}/status
     */
    updateMessageStatus: async (messageId, statusData) => {
      console.log('Updating message status:', { messageId, statusData });
      return this.request(`/api/v1/messaging/messages/${messageId}/status`, {
        method: 'PUT',
        body: JSON.stringify(statusData),
      });
    },
    
    /**
     * Mark multiple messages as read
     * PUT /api/v1/messaging/messages/read
     */
    markMessagesAsRead: async (messageIds) => {
      console.log('Marking messages as read:', messageIds);
      return this.request('/api/v1/messaging/messages/read', {
        method: 'PUT',
        body: JSON.stringify({ messageIds }),
      });
    },
    
    // ==================== INBOX ====================
    
    /**
     * Get user inbox (conversations + requests)
     * GET /api/v1/messaging/inbox
     */
    getInbox: async (params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      return this.request(`/api/v1/messaging/inbox${queryString ? `?${queryString}` : ''}`);
    },
    
    // ==================== MESSAGE REQUESTS ====================
    
    /**
     * Get message requests
     * GET /api/v1/messaging/requests
     */
    getMessageRequests: async (params = {}) => {
      const queryString = new URLSearchParams({
        type: 'received',
        ...params
      }).toString();
      return this.request(`/api/v1/messaging/requests${queryString ? `?${queryString}` : ''}`);
    },
    
    /**
     * Send a message request
     * POST /api/v1/messaging/requests
     */
    sendMessageRequest: async (requestData) => {
      console.log('Sending message request:', requestData);
      
      // Remove recipientId if it exists (backend doesn't accept it)
      const cleanData = { ...requestData };
      if (cleanData.recipientId) {
        delete cleanData.recipientId;
      }
      
      return this.request('/api/v1/messaging/requests', {
        method: 'POST',
        body: JSON.stringify(cleanData),
      });
    },
    
    /**
     * Accept/decline/block message request
     * PUT /api/v1/messaging/requests/{id}
     */
    handleMessageRequest: async (requestId, action, reason = null) => {
      console.log('Handling message request:', { requestId, action, reason });
      
      const body = {
        requestId: requestId,  // Include requestId in body
        action: action
      };
      
      // Add optional reason for decline
      if (reason && (action === 'DECLINED' || action === 'BLOCKED')) {
        body.reason = reason;
      }
      
      return this.request(`/api/v1/messaging/requests/${requestId}`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
    },
    
    // ==================== USERS & SEARCH ====================
    
    /**
     * Search users for messaging
     * GET /api/v1/messaging/users/search
     */
    searchUsersForMessaging: async (query, params = {}) => {
      const queryString = new URLSearchParams({
        q: query,
        ...params
      }).toString();
      return this.request(`/api/v1/messaging/users/search${queryString ? `?${queryString}` : ''}`);
    },
    
    /**
     * Get suggested users for messaging
     * GET /api/v1/users/suggested
     */
    getSuggestedUsers: async () => {
      return this.request('/api/v1/users/suggested');
    },
    
    // ==================== UPLOAD ====================
    
    /**
     * Upload image for messaging
     * POST /api/v1/messaging/upload/image
     */
    uploadMessageImage: async (formData) => {
      console.log('Uploading message image');
      return this.request('/api/v1/messaging/upload/image', {
        method: 'POST',
        body: formData,
      });
    },
    
    /**
     * Upload file for messaging
     * POST /api/v1/messaging/upload/file
     */
    uploadMessageFile: async (formData) => {
      console.log('Uploading message file');
      return this.request('/api/v1/messaging/upload/file', {
        method: 'POST',
        body: formData,
      });
    },
    
    // ==================== MODERATION ====================
    
    /**
     * Block a user
     * POST /api/v1/messaging/block
     */
    blockUser: async (blockData) => {
      console.log('Blocking user:', blockData);
      return this.request('/api/v1/messaging/block', {
        method: 'POST',
        body: JSON.stringify(blockData),
      });
    },
    
    /**
     * Report a message
     * POST /api/v1/messaging/report
     */
    reportMessage: async (reportData) => {
      console.log('Reporting message:', reportData);
      return this.request('/api/v1/messaging/report', {
        method: 'POST',
        body: JSON.stringify(reportData),
      });
    },
    
    // ==================== UNREAD COUNTS ====================
    
    /**
     * Get unread message count
     * GET /api/v1/messaging/unread-count
     */
    getUnreadMessageCount: async () => {
      return this.request('/api/v1/messaging/unread-count');
    },
    
    /**
     * Get unread request count
     * GET /api/v1/messaging/requests/unread-count
     */
    getUnreadRequestCount: async () => {
      return this.request('/api/v1/messaging/requests/unread-count');
    }
  };

  // ==================== UPLOAD ENDPOINTS ====================

  upload = {
    uploadUserProfile: (formData) => this.request('/api/v1/uploads/user-profile', {
      method: 'POST',
      body: formData,
    }),

    uploadCompanyLogo: (formData) => this.request('/api/v1/uploads/company-media', {
      method: 'POST',
      body: formData,
    }),

    uploadPostMedia: (formData) => this.request('/api/v1/uploads/post-media', {
      method: 'POST',
      body: formData,
    }),

    uploadFile: (formData) => this.request('/api/v1/uploads/group-image', {
      method: 'POST',
      body: formData,
    }),

    uploadReportEvidence: (formData) => this.request('/api/v1/uploads/report-evidence', {
      method: 'POST',
      body: formData,
    }),

    uploadProfileImage: (formData) => this.request('/api/v1/upload/profile-image', {
      method: 'POST',
      body: formData,
    }),
  };

  // ==================== HELPER FUNCTIONS ====================

  _filterGroupPosts(posts) {
    if (!Array.isArray(posts)) {
      console.warn('_filterGroupPosts: Input is not an array:', posts);
      return posts;
    }

    const filtered = posts.filter(post => {
      const isGroupPost = post.groupId ||
        post.group ||
        post.groupPostId ||
        (post.metadata && post.metadata.groupId);

      if (isGroupPost) {
        console.warn('Group post found in feed:', {
          id: post.id,
          title: post.title,
          groupId: post.groupId || post.group?.id || post.groupPostId,
          endpoint: 'feed/my-posts'
        });
      }

      return !isGroupPost;
    });

    const removedCount = posts.length - filtered.length;
    if (removedCount > 0) {
      console.log(`Filtered out ${removedCount} group post(s) from feed`);
    }

    return filtered;
  }

  // ==================== HELPER: Extract Pin Status ====================
  _extractPinStatus(postData) {
    // Check all possible pin property variations
    if (postData.isPinned === true || postData.isPinned === 'true') return true;
    if (postData.pinned === true || postData.pinned === 'true') return true;
    if (postData.is_pinned === true || postData.is_pinned === 'true') return true;
    if (postData.metadata?.pinned === true || postData.metadata?.isPinned === true) return true;
    if (postData._raw?.isPinned === true || postData._raw?.pinned === true) return true;
    return false;
  }

  // ==================== PUBLIC ENDPOINTS ====================

  getFeed = async (page = 1, limit = 20) => {
    try {
      const response = await this.request(`/api/v1/posts/feed?page=${page}&limit=${limit}`);

      let posts = [];
      if (Array.isArray(response)) {
        posts = response;
      } else if (response.data && Array.isArray(response.data)) {
        posts = response.data;
      } else if (response.posts && Array.isArray(response.posts)) {
        posts = response.posts;
      }

      console.log(`Raw feed loaded: ${posts.length} posts`);
      
      // CRITICAL: Filter out posts from private groups
      const postsWithGroupInfo = await Promise.all(
        posts.map(async (post) => {
          if (post.groupId) {
            try {
              // Get group details to check visibility
              const groupResponse = await this.request(`/api/v1/groups/${post.groupId}`);
              
              // If group is PRIVATE, mark it for filtering
              if (groupResponse && groupResponse.visibility === 'PRIVATE') {
                console.log(`Filtering out private group post: ${post.id} from group ${post.groupId} (${groupResponse.name})`);
                return {
                  ...post,
                  group: {
                    id: groupResponse.id,
                    name: groupResponse.name,
                    slug: groupResponse.slug,
                    privacy: groupResponse.visibility,
                    isPrivate: true // Flag for filtering
                  },
                  shouldFilterOut: true // Mark for filtering
                };
              } else {
                // Public group, include with group info
                return {
                  ...post,
                  group: {
                    id: groupResponse.id,
                    name: groupResponse.name,
                    slug: groupResponse.slug,
                    privacy: groupResponse.visibility,
                    isPrivate: false
                  }
                };
              }
            } catch (error) {
              console.warn(`Could not fetch group info for ${post.groupId}:`, error);
            }
          }
          return post;
        })
      );

      const filteredPosts = postsWithGroupInfo.filter(post => !post.shouldFilterOut);

      const removedCount = postsWithGroupInfo.length - filteredPosts.length;
      if (removedCount > 0) {
        console.log(`Filtered out ${removedCount} private group posts from feed`);
      }

      if (Array.isArray(response)) {
        return filteredPosts;
      } else if (response.data) {
        return { ...response, data: filteredPosts };
      } else if (response.posts) {
        return { ...response, posts: filteredPosts };
      }

      return filteredPosts;
    } catch (error) {
      console.error('Failed to load feed:', error);
      throw error;
    }
  };

  getPost = (id) => this.request(`/api/v1/posts/${id}`);

  getScamTypes = () => this.request('/api/v1/scam-types');

  // ==================== NOTIFICATION ENDPOINTS ====================

  notifications = {
    /**
     * Get user notifications with pagination
     * GET /api/v1/notifications
     * Query params: page, limit, readStatus, type
     */
    getNotifications: async (params = {}) => {
      const queryParams = new URLSearchParams(params).toString();
      const endpoint = `/api/v1/notifications${queryParams ? `?${queryParams}` : ''}`;
      return this.request(endpoint);
    },
    
    /**
     * Delete a specific notification
     * DELETE /api/v1/notifications/{id}
     */
    deleteNotification: (id) => this.request(`/api/v1/notifications/${id}`, {
      method: 'DELETE',
    }),
    
    /**
     * Mark a specific notification as read
     * PUT /api/v1/notifications/{id}/read
     */
    markAsRead: (id) => this.request(`/api/v1/notifications/${id}/read`, {
      method: 'PUT',
    }),
    
    /**
     * Mark all notifications as read
     * PUT /api/v1/notifications/read-all
     */
    markAllAsRead: () => this.request('/api/v1/notifications/read-all', {
      method: 'PUT',
    }),
    
    /**
     * Send test notification to current user
     * POST /api/v1/notifications/test
     */
    sendTestNotification: (data = {}) => this.request('/api/v1/notifications/test', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
    /**
     * Test broadcast to all users (admin only)
     * POST /api/v1/notifications/test-broadcast
     */
    sendTestBroadcast: (data = {}) => this.request('/api/v1/notifications/test-broadcast', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    
    /**
     * Get unread notification count
     * GET /api/v1/notifications/unread-count
     */
    getUnreadCount: () => this.request('/api/v1/notifications/unread-count'),
    
    /**
     * Get WebSocket connection status
     * GET /api/v1/notifications/ws-status
     */
    getWebSocketStatus: async () => {
      try {
        console.log('Getting WebSocket status with token...');
        
        // Debug: Check if token is available
        const token = localStorage.getItem('scamalert_token');
        console.log('Token available:', !!token);
        if (token) {
          console.log('Token length:', token.length);
          console.log('Token preview:', token.substring(0, 30) + '...');
        }
        
        // Try the endpoint with retry
        const response = await this.request('/api/v1/notifications/ws-status');
        
        console.log('WebSocket status response:', response);
        
        // Handle different response formats
        return {
          connected: response.connected !== undefined ? response.connected : true,
          message: response.message || 'WebSocket notifications are enabled',
          namespace: response.namespace || '/notifications',
          timestamp: response.timestamp || new Date().toISOString(),
          ...response
        };
      } catch (error) {
        console.error('Error getting WebSocket status:', error);
        
        // Check if it's an auth error
        if (error.response?.status === 401) {
          console.log('401 Unauthorized - token might be invalid');
          
          // Check token expiration
          const token = localStorage.getItem('scamalert_token');
          if (token) {
            try {
              const payload = JSON.parse(atob(token.split('.')[1]));
              const expiry = payload.exp * 1000;
              const now = Date.now();
              const isExpired = expiry < now;
              console.log('Token expiry check:', {
                expiry: new Date(expiry).toISOString(),
                now: new Date(now).toISOString(),
                isExpired,
                expiredSecondsAgo: isExpired ? Math.round((now - expiry) / 1000) : 0
              });
            } catch (e) {
              console.log('Could not parse token for expiry check:', e.message);
            }
          }
        }
        
        return { 
          connected: false, 
          error: error.message,
          statusCode: error.response?.status,
          message: 'Failed to fetch WebSocket status'
        };
      }
    },
    
    /**
     * Bulk delete notifications
     * DELETE /api/v1/notifications/bulk
     */
    deleteBulk: (notificationIds) => this.request('/api/v1/notifications/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ notificationIds }),
    }),
  };

  // ==================== POSTS ENDPOINTS ====================

  posts = {
    createScamReport: (data) => this.request('/api/v1/posts/scam-report', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    createPost: (data) => this.request('/api/v1/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

    updatePost: (id, data) => this.request(`/api/v1/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

    deletePost: (id) => this.request(`/api/v1/posts/${id}`, {
      method: 'DELETE',
    }),

    toggleReaction: (id, type) => this.request(`/api/v1/posts/${id}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ type }),
    }),

    toggleBookmark: (id) => this.request(`/api/v1/posts/${id}/bookmarks`, {
      method: 'POST',
    }),

    removeBookmark: (id) => this.request(`/api/v1/posts/${id}/bookmarks`, {
      method: 'DELETE',
    }),

    getMyPosts: async () => {
      try {
        const response = await this.request('/api/v1/posts/user/my-posts');

        let posts = [];
        if (Array.isArray(response)) {
          posts = response;
        } else if (response.data && Array.isArray(response.data)) {
          posts = response.data;
        } else if (response.posts && Array.isArray(response.posts)) {
          posts = response.posts;
        }

        console.log(`My Posts loaded: ${posts.length} posts`);

        const postsWithGroupInfo = await Promise.all(
          posts.map(async (post) => {
            if (post.groupId) {
              try {
                const groupResponse = await this.request(`/api/v1/groups/${post.groupId}`);
                if (groupResponse) {
                  return {
                    ...post,
                    group: {
                      id: groupResponse.id,
                      name: groupResponse.name,
                      slug: groupResponse.slug,
                      privacy: groupResponse.privacy
                    }
                  };
                }
              } catch (error) {
                console.warn(`Could not fetch group info: ${post.groupId}`, error);
              }
            }
            return post;
          })
        );

        if (Array.isArray(response)) {
          return postsWithGroupInfo;
        } else if (response.data) {
          return { ...response, data: postsWithGroupInfo };
        } else if (response.posts) {
          return { ...response, posts: postsWithGroupInfo };
        }

        return postsWithGroupInfo;
      } catch (error) {
        console.error('Failed to load my posts:', error);
        throw error;
      }
    },
  };

  // ==================== GROUP MANAGEMENT ENDPOINTS ====================

  groups = {
    createGroup: async (data) => {
      console.log('Creating group:', data);

      const response = await this.request('/api/v1/groups', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (!response.createdBy && !response.created_by && !response.creatorId) {
        console.warn('CRITICAL: Backend did not return creator field in response');

        const storedUser = localStorage.getItem('scamalert_user');
        if (storedUser) {
          try {
            const user = JSON.parse(storedUser);
            response.createdBy = user.id;
            response.isMember = true;
            response.userRole = 'ADMIN';
            console.log('Added creator info from localStorage:', user.id);
          } catch (e) {
            console.error('Failed to parse user from localStorage:', e);
          }
        }
      }

      return response;
    },

    getGroupBySlug: async (identifier) => {
      try {
        console.log('Fetching group:', identifier);
        const response = await this.request(`/api/v1/groups/${identifier}`);
        console.log('Group fetched:', response);
        return response;
      } catch (error) {
        console.error('Failed to fetch group:', error);
        throw error;
      }
    },

    updateGroup: (id, data) => this.request(`/api/v1/groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

    deleteGroup: (id) => this.request(`/api/v1/groups/${id}`, {
      method: 'DELETE',
    }),

    searchGroups: async (params = {}) => {
      try {
        const cleanParams = Object.entries(params).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            acc[key] = value;
          }
          return acc;
        }, {});

        const queryString = new URLSearchParams(cleanParams).toString();
        const endpoint = `/api/v1/groups${queryString ? `?${queryString}` : ''}`;

        console.log('Searching groups:', endpoint);
        const response = await this.request(endpoint);

        let groups = [];
        if (Array.isArray(response)) {
          groups = response;
        } else if (response.groups && Array.isArray(response.groups)) {
          groups = response.groups;
        } else if (response.data && Array.isArray(response.data)) {
          groups = response.data;
        }
        
        console.log(`Found ${groups.length} groups`);
        
        return response;
      } catch (error) {
        console.error('Failed to search groups:', error);
        throw error;
      }
    },

    getMyGroups: async () => {
      try {
        console.log('Fetching user\'s groups...');
        const response = await this.request('/api/v1/groups?myGroups=true');

        let groups = [];
        if (Array.isArray(response)) {
          groups = response;
        } else if (response.groups && Array.isArray(response.groups)) {
          groups = response.groups;
        } else if (response.data && Array.isArray(response.data)) {
          groups = response.data;
        }
        
        console.log(`User is member of ${groups.length} groups`);
        
        return response;
      } catch (error) {
        console.error('Failed to fetch user groups:', error);
        return [];
      }
    },

    joinGroup: async (id) => {
      try {
        console.log(`Attempting to join group: ${id}`);
        
        const response = await this.request(`/api/v1/groups/${id}/join`, {
          method: 'POST',
        });
        
        console.log('Join group response:', response);
        
        return response;
      } catch (error) {
        console.error('Failed to join group:', error);
        throw error;
      }
    },

    leaveGroup: (id) => this.request(`/api/v1/groups/${id}/leave`, {
      method: 'POST',
    }),

    getGroupMembers: async (id) => {
      try {
        console.log(`Fetching members for group: ${id}`);
        const response = await this.request(`/api/v1/groups/${id}/members`);

        let members = [];
        if (Array.isArray(response)) {
          members = response;
        } else if (response.members && Array.isArray(response.members)) {
          members = response.members;
        } else if (response.data && Array.isArray(response.data)) {
          members = response.data;
        }
        
        console.log(`Found ${members.length} members`);
        return response;
      } catch (error) {
        console.error('Failed to fetch group members:', error);
        throw error;
      }
    },

    followGroup: (id) => this.request(`/api/v1/groups/${id}/follow`, {
      method: 'POST',
    }),

    unfollowGroup: (id) => this.request(`/api/v1/groups/${id}/follow`, {
      method: 'DELETE',
    }),

    getJoinRequests: async (id) => {
      try {
        console.log(`Fetching join requests for group: ${id}`);
        const response = await this.request(`/api/v1/groups/${id}/join-requests`);

        let requests = [];
        if (Array.isArray(response)) {
          requests = response;
        } else if (response.requests && Array.isArray(response.requests)) {
          requests = response.requests;
        } else if (response.data && Array.isArray(response.data)) {
          requests = response.data;
        } else if (response.joinRequests && Array.isArray(response.joinRequests)) {
          requests = response.joinRequests;
        }
        
        console.log(`Found ${requests.length} requests`);
        return response;
      } catch (error) {
        console.error('Failed to fetch join requests:', error);
        throw error;
      }
    },

    handleJoinRequest: (groupId, requestId, data) =>
      this.request(`/api/v1/groups/${groupId}/join-requests/${requestId}`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    assignAdminRole: (groupId, userId) =>
      this.request(`/api/v1/groups/${groupId}/moderation/admins/${userId}`, {
        method: 'POST',
      }),

    removeMember: (groupId, userId, reason = "Violating group rules") =>
      this.request(`/api/v1/groups/${groupId}/moderation/members/${userId}`, {
        method: 'DELETE',
        body: JSON.stringify({ reason }),
      }),

    getModerationLogs: (groupId, page = 1, limit = 20) =>
      this.request(`/api/v1/groups/${groupId}/moderation/logs?page=${page}&limit=${limit}`),

    changeMemberRole: (groupId, userId, role) => {
      if (role === 'ADMIN') {
        return this.assignAdminRole(groupId, userId);
      } else {
        return Promise.reject(new Error(`Changing role to ${role} is not supported.`));
      }
    },
  };

  // ==================== GROUP POSTS ENDPOINTS ====================

  groupPosts = {
    /**
     * Create scam report in group
     */
    createScamReport: async (groupId, data) => {
      console.log('Creating scam report in group:', { groupId, data });
      
      const { 
        groupId: _, 
        shouldAppearInMainFeed, 
        visibility, 
        groupVisibility, 
        ...cleanData 
      } = data;
      
      const response = await this.request(`/api/v1/groups/${groupId}/posts/scam-report`, {
        method: 'POST',
        body: JSON.stringify(cleanData),
      });

      console.log('Group scam report created:', response);
      return response;
    },

    /**
     * Create awareness or question post in group
     */
    createAwarenessQuestion: async (groupId, data) => {
      console.log('Creating group post:', { groupId, postType: data.postType });
      
      const cleanData = { ...data };
      delete cleanData.groupId;
      delete cleanData.shouldAppearInMainFeed;
      delete cleanData.visibility;
      delete cleanData.groupVisibility;
      
      const response = await this.request(`/api/v1/groups/${groupId}/posts/awareness-question`, {
        method: 'POST',
        body: JSON.stringify(cleanData),
      });

      console.log('Group post created:', response);
      return response;
    },

    /**
     * Get group feed - approved posts only
     */
    getGroupFeed: async (groupId, params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const response = await this.request(
        `/api/v1/groups/${groupId}/posts${queryString ? `?${queryString}` : ''}`
      );

      console.log(`Group feed loaded for group ${groupId}`);
      return response;
    },

    /**
     * Get ALL group posts (including pending) - for admins/moderators
     */
    getGroupPosts: async (groupId, params = {}) => {
      const queryString = new URLSearchParams(params).toString();
      const response = await this.request(
        `/api/v1/groups/${groupId}/posts${queryString ? `?${queryString}` : ''}`
      );

      console.log(`All group posts loaded for group ${groupId} (admin view)`);
      return response;
    },

    /**
     * Get specific group post by ID
     */
    getGroupPost: async (groupId, postId) => {
      const response = await this.request(`/api/v1/groups/${groupId}/posts/${postId}`);
      console.log('Group post loaded:', response);
      return response;
    },

    // ==================== MODERATION ENDPOINTS ====================

    /**
     * Get pending posts (admin only)
     */
    getPendingPosts: (groupId) => {
      console.log(`Fetching pending posts for group ${groupId}`);
      return this.request(`/api/v1/groups/${groupId}/posts/pending`);
    },

    /**
     * Approve or reject post (admin only)
     * PUT /api/v1/groups/{groupId}/posts/{postId}/status
     */
    updatePostStatus: (groupId, postId, statusData) => {
      console.log(`Updating post ${postId} status:`, statusData);
      return this.request(`/api/v1/groups/${groupId}/posts/${postId}/status`, {
        method: 'PUT',
        body: JSON.stringify(statusData),
      });
    },

    /**
     * Approve post (admin only)
     */
    approveGroupPost: (groupId, postId, reason = "Post approved") => {
      console.log(`Approving post ${postId} in group ${groupId}`);
      return this.request(`/api/v1/groups/${groupId}/posts/${postId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: 'APPROVED',
          reason: reason 
        }),
      });
    },

    /**
     * Reject post with reason (admin only)
     */
    rejectGroupPost: (groupId, postId, reason = "Violates group rules") => {
      console.log(`Rejecting post ${postId} in group ${groupId}`);
      return this.request(`/api/v1/groups/${groupId}/posts/${postId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ 
          status: 'REJECTED', 
          reason: reason 
        }),
      });
    },

    /**
     * Pin or unpin post (admin only)
     * PUT /api/v1/groups/{groupId}/posts/{postId}/pin
     */
    pinPost: async (groupId, postId, pinned = true) => {
      console.log(`${pinned ? 'Pinning' : 'Unpinning'} post ${postId} in group ${groupId}`);
      
      try {
        const response = await this.request(`/api/v1/groups/${groupId}/posts/${postId}/pin`, {
          method: 'PUT',
          body: JSON.stringify({ 
            pinned: String(pinned).toLowerCase() === 'true' || pinned === true
          }),
        });
        
        console.log('Pin operation successful:', response);
        
        // Ensure the response contains the pinned status
        if (response && !response.hasOwnProperty('isPinned') && !response.hasOwnProperty('pinned')) {
          console.warn('API response missing pinned status, adding manually');
          response.isPinned = pinned;
          response.pinned = pinned;
        }
        
        return response;
      } catch (error) {
        console.error('Failed to pin post:', error);
        throw error;
      }
    },

    /**
     * Remove post from group (admin only)
     */
    removeGroupPost: (groupId, postId) => {
      console.log(`Removing post ${postId} from group ${groupId}`);
      return this.request(`/api/v1/groups/${groupId}/posts/${postId}`, {
        method: 'DELETE',
      });
    },

    /**
     * Create general post in group (legacy support)
     */
    createGroupPost: async (groupId, data) => {
      console.log('Creating general group post:', { groupId, data });
      
      const isPrivateGroup = data.groupVisibility === 'PRIVATE';
      const postData = {
        ...data,
        groupId: groupId,
        shouldAppearInMainFeed: !isPrivateGroup,
        visibility: isPrivateGroup ? 'GROUP_ONLY' : 'PUBLIC'
      };

      const response = await this.request(`/api/v1/groups/${groupId}/posts`, {
        method: 'POST',
        body: JSON.stringify(postData),
      });

      console.log('General group post created:', response);
      return response;
    }
  };

  // ==================== ADMIN/MODERATOR ENDPOINTS ====================

  admin = {
    getPostsUnderReview: () => this.request('/api/v1/admin/posts/under-review'),

    reviewPost: (id, data) => this.request(`/api/v1/admin/posts/${id}/review`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  };

  // ==================== SEARCH ENDPOINTS ====================

  search = {
    search: (query, filters = {}) => this.request(`/api/v1/search?q=${encodeURIComponent(query)}&${new URLSearchParams(filters)}`),
  };

  // ==================== COMMENTS ENDPOINTS - FIXED ====================

  comments = {
    createComment: (data) => {
      console.log('Creating comment:', data);
      return this.request('/api/v1/comments', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    updateComment: (id, data) => {
      console.log('Updating comment:', { id, data });
      return this.request(`/api/v1/comments/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    deleteComment: (id, hard = false) => {
      console.log('Deleting comment:', { id, hard });
      const queryString = hard ? '?hard=true' : '';
      return this.request(`/api/v1/comments/${id}${queryString}`, {
        method: 'DELETE',
      });
    },

    getComment: (id) => {
      console.log('Fetching comment:', id);
      return this.request(`/api/v1/comments/${id}`);
    },

    /**
     * Get comments for a post with pagination and sorting - FIXED
     * @param {string} postId - The post ID
     * @param {Object} options - Pagination and sorting options
     */
    getPostCommentsPaginated: async (postId, options = {}) => {
      const {
        page = 1,
        limit = 10,
        sortBy,
        includeDeleted,
        includeReported,
        userId,
        parentId,
        maxDepth = 3
      } = options;

      console.log('Fetching paginated comments for post:', { postId, page, limit, sortBy });

      try {
        // Build query parameters - only add params that are explicitly provided
        const params = new URLSearchParams();

        // Always include these
        if (page !== undefined) params.append('page', page.toString());
        if (limit !== undefined) params.append('limit', limit.toString());
        if (maxDepth !== undefined) params.append('maxDepth', maxDepth.toString());

        // Only add optional parameters if they are explicitly provided and not undefined/null/empty
        if (sortBy !== undefined && sortBy !== null && sortBy !== '') {
          params.append('sortBy', sortBy);
        }
        // CRITICAL FIX: Only send boolean parameters if explicitly true
        if (includeDeleted === true) {
          params.append('includeDeleted', 'true');
        }
        if (includeReported === true) {
          params.append('includeReported', 'true');
        }
        if (userId !== undefined && userId !== null && userId !== '') {
          params.append('userId', userId);
        }
        if (parentId !== undefined && parentId !== null && parentId !== '') {
          params.append('parentId', parentId);
        }

        const endpoint = `/api/v1/comments/post/${postId}?${params.toString()}`;
        console.log('Making request to:', endpoint);

        const response = await this.request(endpoint, {
          method: 'GET',
        });

        console.log('Paginated comments fetched successfully');

        // Format response for consistent handling
        if (Array.isArray(response)) {
          return {
            data: response,
            page: parseInt(page),
            limit: parseInt(limit),
            total: response.length,
            hasMore: response.length === parseInt(limit),
            sortBy
          };
        } else if (response && Array.isArray(response.data)) {
          return {
            data: response.data,
            page: response.page || parseInt(page),
            limit: response.limit || parseInt(limit),
            total: response.total || response.data.length,
            hasMore: response.hasMore !== undefined ? response.hasMore : response.data.length === parseInt(limit),
            sortBy
          };
        } else if (response && response.comments && Array.isArray(response.comments)) {
          return {
            data: response.comments,
            page: response.page || parseInt(page),
            limit: response.limit || parseInt(limit),
            total: response.total || response.comments.length,
            hasMore: response.hasMore !== undefined ? response.hasMore : response.comments.length === parseInt(limit),
            sortBy
          };
        } else if (response && Array.isArray(response)) {
          return {
            data: response,
            page: parseInt(page),
            limit: parseInt(limit),
            total: response.length,
            hasMore: response.length === parseInt(limit),
            sortBy
          };
        }

        // Fallback: return empty result
        return {
          data: [],
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          hasMore: false,
          sortBy
        };
      } catch (error) {
        console.error('Failed to fetch paginated comments:', error);

        // Graceful fallback - return empty result
        return {
          data: [],
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          hasMore: false,
          sortBy,
          error: error.message
        };
      }
    },

    /**
     * Get comments for a post (legacy method with backward compatibility)
     */
    getPostComments: async (postId, options = {}) => {
      console.log('Fetching comments for post:', postId);

      // If options are provided, use paginated version
      if (Object.keys(options).length > 0) {
        return this.getPostCommentsPaginated(postId, options);
      }

      // Otherwise use original endpoint for backward compatibility
      try {
        const response = await this.request(`/api/v1/comments/post/${postId}`, {
          method: 'GET',
        });
        console.log('Comments fetched successfully');
        return response;
      } catch (error) {
        console.warn('Primary endpoint failed, trying alternatives...');
        
        // Try alternative endpoints
        const endpoints = [
          `/api/v1/posts/${postId}/comments`,
          `/api/v1/comments?postId=${postId}`
        ];

        for (const endpoint of endpoints) {
          try {
            console.log(`Trying alternative endpoint: ${endpoint}`);
            const response = await this.request(endpoint, { method: 'GET' });
            console.log(`Success with alternative endpoint: ${endpoint}`);
            return response;
          } catch (altError) {
            console.log(`Failed with ${endpoint}:`, altError.message);
            continue;
          }
        }

        throw error;
      }
    },

    getUserComments: (userId, options = {}) => {
      console.log('Fetching comments by user:', userId);

      const params = new URLSearchParams();
      if (options.page !== undefined) params.append('page', options.page.toString());
      if (options.limit !== undefined) params.append('limit', options.limit.toString());
      if (options.sort !== undefined && options.sort !== '') params.append('sort', options.sort);

      const queryString = params.toString();
      const endpoint = `/api/v1/comments/user/${userId}${queryString ? `?${queryString}` : ''}`;

      return this.request(endpoint, {
        method: 'GET',
      });
    },

    addReaction: (commentId, type) => {
      console.log('Adding reaction to comment:', { commentId, type });
      return this.request(`/api/v1/comments/${commentId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ type }),
      });
    },

    getReactions: (commentId) => {
      console.log('Getting reactions for comment:', commentId);
      return this.request(`/api/v1/comments/${commentId}/reactions`, {
        method: 'GET',
      });
    },

    removeReaction: (commentId, type) => {
      console.log('Removing reaction from comment:', { commentId, type });
      return this.request(`/api/v1/comments/${commentId}/reactions/${type}`, {
        method: 'DELETE',
      });
    },

    // ==================== UPDATED REPORT COMMENT METHOD ====================
    reportComment: (commentId, data) => {
      console.log('Reporting comment:', { commentId, data });
      
      // Ensure the reason is in correct format (uppercase)
      const reportData = {
        reason: data.reason?.toUpperCase() || data.reason,
        description: data.details || data.description
      };
      
      return this.request(`/api/v1/comment-reports/comment/${commentId}`, {
        method: 'POST',
        body: JSON.stringify(reportData),
      });
    },

    getCommentReplies: async (commentId, options = {}) => {
      const { page = 1, limit = 10 } = options;

      console.log('Fetching replies for comment:', { commentId, page, limit });

      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      try {
        const response = await this.request(`/api/v1/comments/${commentId}/replies?${params}`, {
          method: 'GET',
        });

        console.log('Comment replies fetched successfully');

        if (Array.isArray(response)) {
          return {
            data: response,
            page: parseInt(page),
            limit: parseInt(limit),
            total: response.length,
            hasMore: response.length === parseInt(limit)
          };
        } else if (response && Array.isArray(response.data)) {
          return {
            data: response.data,
            page: response.page || parseInt(page),
            limit: response.limit || parseInt(limit),
            total: response.total || response.data.length,
            hasMore: response.hasMore !== undefined ? response.hasMore : response.data.length === parseInt(limit)
          };
        }

        return {
          data: [],
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          hasMore: false
        };
      } catch (error) {
        console.error('Failed to fetch comment replies:', error);
        return {
          data: [],
          page: parseInt(page),
          limit: parseInt(limit),
          total: 0,
          hasMore: false,
          error: error.message
        };
      }
    },
  };

  // ==================== COMMENT REPORTS ENDPOINTS ====================

  commentReports = {
    reportComment: async (commentId, data) => {
      console.log('Reporting comment:', { commentId, data });

      try {
        const response = await this.request(`/api/v1/comment-reports/comment/${commentId}`, {
          method: 'POST',
          body: JSON.stringify(data),
        });

        console.log('Comment reported successfully:', response);
        return response;
      } catch (error) {
        console.error('Failed to report comment:', error);
        throw error;
      }
    },

    getAllReports: async (params = {}) => {
      console.log('Fetching all comment reports with params:', params);

      try {
        const queryParams = new URLSearchParams(params).toString();
        const endpoint = `/api/v1/comment-reports${queryParams ? `?${queryParams}` : ''}`;

        const response = await this.request(endpoint);

        console.log(`Fetched comment reports successfully`);
        return response;
      } catch (error) {
        console.error('Failed to fetch comment reports:', error);
        throw error;
      }
    },

    getCommentReports: async (commentId) => {
      console.log('Fetching reports for comment:', commentId);

      try {
        const response = await this.request(`/api/v1/comment-reports/comment/${commentId}`);

        console.log(`Fetched reports for comment ${commentId}:`, response);
        return response;
      } catch (error) {
        console.error(`Failed to fetch reports for comment ${commentId}:`, error);
        throw error;
      }
    },

    deleteReport: async (reportId) => {
      console.log('Deleting comment report:', reportId);

      try {
        const response = await this.request(`/api/v1/comment-reports/${reportId}`, {
          method: 'DELETE',
        });

        console.log('Report deleted successfully:', response);
        return response;
      } catch (error) {
        console.error('Failed to delete report:', error);
        throw error;
      }
    },

    resolveReport: async (reportId) => {
      console.log('Resolving comment report:', reportId);

      try {
        const response = await this.request(`/api/v1/comment-reports/${reportId}/resolve`, {
          method: 'PUT',
        });

        console.log('Report resolved successfully:', response);
        return response;
      } catch (error) {
        console.error('Failed to resolve report:', error);
        throw error;
      }
    },

    getReportStats: async () => {
      console.log('Fetching comment report statistics');

      try {
        const response = await this.request('/api/v1/comment-reports/stats');

        console.log('Report statistics fetched:', response);
        return response;
      } catch (error) {
        console.error('Failed to fetch report statistics:', error);
        throw error;
      }
    },

    bulkResolveReports: async (reportIds) => {
      console.log('Bulk resolving comment reports:', reportIds);

      try {
        const response = await this.request('/api/v1/comment-reports/bulk-resolve', {
          method: 'POST',
          body: JSON.stringify({ reportIds }),
        });

        console.log('Reports resolved successfully:', response);
        return response;
      } catch (error) {
        console.error('Failed to bulk resolve reports:', error);
        throw error;
      }
    },
  };
}

export const api = new ApiClient();