'use client';

import { FaBell, FaComment, FaHeart, FaShieldAlt, FaUsers, FaCheck, FaTrash, FaSpinner } from 'react-icons/fa';
import { useNotifications } from '../lib/contexts/NotificationContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

export default function NotificationItem({ 
  notification, 
  onClose, 
  compact = false, 
  showDelete = false, 
  onDelete,
  showMarkAsRead = false,
  onClick
}) {
  const { markAsRead, deleteNotification } = useNotifications();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingRead, setIsMarkingRead] = useState(false);
  const [postData, setPostData] = useState(null);
  const [groupData, setGroupData] = useState(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // ✅ FIXED: Use notification object directly, don't use local state for read status
  const isRead = notification.read || notification.isRead || notification.is_read || false;

  // Extract IDs from notification
  const postId = notification.postId || (notification.data && notification.data.postId);
  const commentId = (notification.data && notification.data.commentId);
  const groupId = (notification.data && notification.data.groupId) || 
                  (postData && postData.groupId);

  // Fetch post and group data when notification loads
  useEffect(() => {
    if (postId && (notification.type === 'NEW_COMMENT' || notification.type === 'LIKE' || notification.type === 'NEW_POST')) {
      fetchPostAndGroupData();
    }
  }, [postId, notification.type]);

  const fetchPostAndGroupData = async () => {
    if (!postId) return;
    
    setIsLoadingData(true);
    try {
      console.log('📥 Fetching post data for notification:', postId);
      
      // Fetch post details
      const post = await api.getPost(postId);
      setPostData(post);
      
      console.log('✅ Post data loaded:', post);
      
      // If post belongs to a group, fetch group data
      if (post.groupId || post.group) {
        const groupId = post.groupId || post.group.id;
        try {
          const group = await api.groups.getGroupBySlug(groupId);
          setGroupData(group);
          console.log('✅ Group data loaded:', group);
        } catch (groupError) {
          console.warn('⚠️ Could not fetch group details:', groupError);
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch post data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  // ✅ FIXED: Improved click handler
  const handleClick = async (e) => {
    // Don't trigger if clicking on action buttons
    if (e.target.closest('.notification-action')) {
      return;
    }

    console.log('🖱️ Notification clicked:', notification.id);
    
    // Check all possible read field variations
    const currentIsRead = notification.read || notification.isRead || notification.is_read;
    
    // Mark as read when clicked if not already read
    if (!currentIsRead) {
      try {
        setIsMarkingRead(true);
        await markAsRead(notification.id);
        console.log('✅ Notification marked as read');
      } catch (error) {
        console.error('❌ Failed to mark as read:', error);
      } finally {
        setIsMarkingRead(false);
      }
    }
    
    // Handle navigation
    if (onClick) {
      onClick(notification);
    } else {
      await navigateToPost(notification);
    }
    
    // Close notification panel if onClose is provided
    if (onClose) {
      onClose();
    }
  };

  const navigateToPost = async (notification) => {
    try {
      console.log('📍 Navigation for notification type:', notification.type);
      
      // Get postId from different possible locations
      const postId = notification.postId || 
                    (notification.data && notification.data.postId);
      
      const commentId = (notification.data && notification.data.commentId);
      
      if (!postId) {
        console.log('⚠️ No postId found in notification');
        return;
      }

      // Determine URL based on post/group data
      let targetUrl = await determinePostUrl(postId, commentId);
      
      if (targetUrl) {
        console.log('🎯 Navigating to:', targetUrl);
        router.push(targetUrl);
      } else {
        // Fallback to direct post detail
        router.push(`/posts/${postId}`);
      }
      
    } catch (error) {
      console.error('❌ Navigation error:', error);
    }
  };

  const determinePostUrl = async (postId, commentId) => {
    try {
      // Use cached post data if available
      let post = postData;
      if (!post) {
        post = await api.getPost(postId);
      }
      
      if (post && post.groupId) {
        // This is a group post
        let groupSlug = groupId;
        
        // If we don't have group slug, try to get it
        if (!groupSlug && post.group && post.group.slug) {
          groupSlug = post.group.slug;
        }
        
        if (!groupSlug) {
          // Try to fetch group to get slug
          try {
            const group = await api.groups.getGroupBySlug(post.groupId);
            groupSlug = group.slug || group.id;
          } catch (error) {
            console.warn('⚠️ Could not fetch group slug, using ID:', post.groupId);
            groupSlug = post.groupId;
          }
        }
        
        // Build group post URL
        const baseUrl = `/dashboard/groups/${groupSlug}/posts`;
        const queryParams = new URLSearchParams();
        queryParams.append('postId', postId);
        
        if (commentId) {
          queryParams.append('commentId', commentId);
        }
        
        return `${baseUrl}?${queryParams.toString()}`;
      } else {
        // Regular post in main feed
        const baseUrl = `/posts/${postId}`;
        return commentId ? `${baseUrl}#comment-${commentId}` : baseUrl;
      }
      
    } catch (error) {
      console.warn('⚠️ Error determining post URL:', error);
      
      // Fallback logic based on notification type
      if (notification.type === 'NEW_COMMENT' || notification.type === 'NEW_POST') {
        const hasGroupData = notification.data?.groupId;
        if (hasGroupData) {
          return `/dashboard/groups/${notification.data.groupId}/posts?postId=${postId}`;
        }
      }
      
      return `/posts/${postId}`;
    }
  };

  // ✅ FIXED: Improved mark as read handler
  const handleMarkAsRead = async (e) => {
    e.stopPropagation();
    
    // Check all possible read field variations
    const currentIsRead = notification.read || notification.isRead || notification.is_read;
    if (currentIsRead) {
      console.log('⚠️ Notification already read');
      return;
    }
    
    setIsMarkingRead(true);
    
    try {
      await markAsRead(notification.id);
      console.log('✅ Notification marked as read via button');
    } catch (error) {
      console.error('❌ Failed to mark as read:', error);
    } finally {
      setIsMarkingRead(false);
    }
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    
    if (onDelete) {
      onDelete(notification.id);
    }
  };

  // Get post name from different possible fields
  const getPostName = () => {
    if (isLoadingData) {
      return 'Loading...';
    }
    
    if (postData) {
      return postData.title || 
             postData.content?.substring(0, 50) + '...' || 
             'Untitled Post';
    }
    
    // Fallback to showing ID
    return `Post: ${postId?.substring(0, 8)}...`;
  };

  // Get context info (group name or "Feed")
  const getPostContext = () => {
    if (isLoadingData) {
      return '';
    }
    
    if (groupData) {
      return `in ${groupData.name || 'Group'}`;
    } else if (postData && postData.groupId) {
      return 'in Group';
    } else {
      return 'in Feed';
    }
  };

  const getIcon = () => {
    switch (notification.type) {
      case 'NEW_COMMENT': 
      case 'comment': 
        return <FaComment className="text-success" size={compact ? 14 : 16} />;
      case 'LIKE': 
      case 'like': 
        return <FaHeart className="text-danger" size={compact ? 14 : 16} />;
      case 'NEW_POST':
      case 'POST_SUBMITTED_FOR_REVIEW':
        return <FaShieldAlt className="text-warning" size={compact ? 14 : 16} />;
      case 'GROUP': 
      case 'JOIN_REQUEST':
        return <FaUsers className="text-info" size={compact ? 14 : 16} />;
      default: 
        return <FaBell className="text-primary" size={compact ? 14 : 16} />;
    }
  };

  const getIconBg = () => {
    switch (notification.type) {
      case 'NEW_COMMENT': 
      case 'comment': 
        return 'bg-success';
      case 'LIKE': 
      case 'like': 
        return 'bg-danger';
      case 'NEW_POST':
      case 'POST_SUBMITTED_FOR_REVIEW':
        return 'bg-warning';
      case 'GROUP': 
      case 'JOIN_REQUEST':
        return 'bg-info';
      default: 
        return 'bg-primary';
    }
  };

  const getTypeColor = () => {
    switch (notification.type) {
      case 'NEW_COMMENT': 
      case 'comment': 
        return '#10b981';
      case 'LIKE': 
      case 'like': 
        return '#ef4444';
      case 'NEW_POST':
      case 'POST_SUBMITTED_FOR_REVIEW':
        return '#f59e0b';
      case 'GROUP': 
      case 'JOIN_REQUEST':
        return '#3b82f6';
      default: 
        return '#667eea';
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Just now';
    
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;
      
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      return date.toLocaleDateString();
    } catch (error) {
      return 'Recently';
    }
  };

  const getTypeDisplay = () => {
    switch (notification.type) {
      case 'NEW_COMMENT': return 'New Comment';
      case 'LIKE': return 'New Like';
      case 'NEW_POST': return 'New Post';
      case 'POST_SUBMITTED_FOR_REVIEW': return 'Post Review';
      case 'JOIN_REQUEST': return 'Join Request';
      case 'GROUP': return 'Group';
      default: return 'Notification';
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`${compact ? 'py-2 px-3' : 'py-3 px-3'}`}
      style={{ 
        borderBottom: compact ? 'none' : '1px solid #f0f0f0',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: !isRead ? 'rgba(102, 126, 234, 0.05)' : 'white',
        position: 'relative',
        opacity: isMarkingRead ? 0.6 : 1
      }}
      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(102, 126, 234, 0.08)'}
      onMouseLeave={(e) => e.currentTarget.style.background = !isRead ? 'rgba(102, 126, 234, 0.05)' : 'white'}
    >
      {/* Read status indicator bar */}
      {!isRead && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '4px',
            background: getTypeColor(),
            transition: 'opacity 0.3s ease'
          }}
        />
      )}
      
      <div className="d-flex align-items-start">
        {/* Icon */}
        <div 
          className={`${getIconBg()} bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center me-3`}
          style={{ 
            width: compact ? '36px' : '40px', 
            height: compact ? '36px' : '40px', 
            flexShrink: 0,
            border: `1px solid ${getTypeColor()}30`,
            position: 'relative'
          }}
        >
          {getIcon()}
          {isLoadingData && (
            <div 
              className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
              style={{ 
                background: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '50%'
              }}
            >
              <FaSpinner className="fa-spin text-primary" size={14} />
            </div>
          )}
        </div>
        
        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title and type */}
          <div className="d-flex justify-content-between align-items-start mb-1">
            <p 
              className="mb-0 fw-bold text-truncate" 
              style={{ 
                fontSize: compact ? '0.8rem' : '0.85rem', 
                color: '#2d3748'
              }}
            >
              {notification.title || getTypeDisplay()}
            </p>
            <small 
              className="text-muted text-nowrap ms-2"
              style={{ fontSize: '0.75rem' }}
            >
              {formatTime(notification.createdAt)}
            </small>
          </div>
          
          {/* Message */}
          <p 
            className="mb-1" 
            style={{ 
              fontSize: compact ? '0.8rem' : '0.9rem', 
              color: '#4a5568',
              fontWeight: !isRead ? '500' : '400'
            }}
          >
            {notification.message}
          </p>
          
          {/* Post info with name */}
          {postId && (notification.type === 'NEW_COMMENT' || notification.type === 'LIKE' || notification.type === 'NEW_POST') && (
            <div className="mt-1">
              <div className="d-flex align-items-center">
                <small 
                  className="fw-medium"
                  style={{ 
                    color: getTypeColor(),
                    fontSize: '0.8rem'
                  }}
                >
                  {getPostName()}
                </small>
                <small 
                  className="text-muted ms-2"
                  style={{ fontSize: '0.75rem' }}
                >
                  {getPostContext()}
                </small>
              </div>
            </div>
          )}
          
          {/* Metadata */}
          {!compact && (
            <div className="mt-2 d-flex align-items-center">
              <span 
                className="badge rounded-pill me-2"
                style={{
                  background: `${getTypeColor()}15`,
                  color: getTypeColor(),
                  fontSize: '0.7rem',
                  padding: '2px 8px'
                }}
              >
                {getTypeDisplay()}
              </span>
              
              {isRead && notification.readAt && (
                <small className="text-muted">
                  Read {formatTime(notification.readAt)}
                </small>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        {(showMarkAsRead || showDelete) && (
          <div className="d-flex gap-2 ms-2 notification-action">
            {showMarkAsRead && !isRead && (
              <button
                onClick={handleMarkAsRead}
                disabled={isMarkingRead}
                className="btn btn-sm btn-outline-success rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '32px', height: '32px', padding: 0 }}
                title="Mark as read"
              >
                {isMarkingRead ? (
                  <FaSpinner className="fa-spin" size={12} />
                ) : (
                  <FaCheck size={12} />
                )}
              </button>
            )}
            
            {showDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="btn btn-sm btn-outline-danger rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: '32px', height: '32px', padding: 0 }}
                title="Delete"
              >
                {isDeleting ? (
                  <FaSpinner className="fa-spin" size={12} />
                ) : (
                  <FaTrash size={12} />
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}