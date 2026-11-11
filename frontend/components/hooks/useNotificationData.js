// hooks/useNotificationData.js
import { useState, useEffect } from 'react';
import { api } from '../lib/api';

export const useNotificationData = (notification) => {
  const [postData, setPostData] = useState(null);
  const [groupData, setGroupData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const postId = notification.postId || (notification.data && notification.data.postId);
  const groupId = (notification.data && notification.data.groupId);

  useEffect(() => {
    if (postId && shouldFetchPostData(notification.type)) {
      fetchData();
    }
  }, [postId, notification.type]);

  const shouldFetchPostData = (type) => {
    return ['NEW_COMMENT', 'LIKE', 'NEW_POST', 'POST_SUBMITTED_FOR_REVIEW'].includes(type);
  };

  const fetchData = async () => {
    if (!postId) return;
    
    setIsLoading(true);
    try {
      // Fetch post
      const post = await api.getPost(postId);
      setPostData(post);
      
      // Fetch group if post belongs to a group
      if (post.groupId || groupId) {
        const targetGroupId = post.groupId || groupId;
        try {
          const group = await api.groups.getGroupBySlug(targetGroupId);
          setGroupData(group);
        } catch (error) {
          console.warn('Group fetch error:', error);
        }
      }
    } catch (error) {
      console.error('Failed to fetch notification data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPostName = () => {
    if (isLoading) return 'Loading...';
    if (postData) return postData.title || postData.content?.substring(0, 50) + '...';
    return `Post: ${postId?.substring(0, 8)}...`;
  };

  const getPostContext = () => {
    if (isLoading) return '';
    if (groupData) return `in ${groupData.name}`;
    if (postData?.groupId) return 'in Group';
    return 'in Feed';
  };

  const getPostUrl = () => {
    if (!postId) return null;
    
    if (groupData) {
      const groupSlug = groupData.slug || groupData.id;
      return `/dashboard/groups/${groupSlug}/posts?postId=${postId}`;
    }
    
    return `/posts/${postId}`;
  };

  return {
    postData,
    groupData,
    isLoading,
    getPostName,
    getPostContext,
    getPostUrl,
    postId,
    groupId
  };
};