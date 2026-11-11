import React, { useState, useEffect } from 'react';
import { MessageCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Alert, Button, Spinner, Card } from 'react-bootstrap';
import { api } from '../../lib/api';
import CommentItem from './CommentItem';
import CommentForm from './CommentForm';

const Comments = ({ postId, groupPostId = null, skipSafetyCheck = false }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    console.log(' Comments component mounted with props:', { 
      postId, 
      groupPostId, 
      skipSafetyCheck,
      postIdType: typeof postId
    });
    
    if (postId) {
      loadComments();
    } else {
      setError('No post ID provided');
      setLoading(false);
    }
  }, [postId]);

  const loadComments = async () => {
    if (!postId) {
      setError('Post ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Loading comments for postId:', postId);
      
      // Debug: Check what API method is being called
      console.log('🔍 Calling api.comments.getPostComments with:', postId);
      
      // Try to fetch comments with timeout
      const response = await Promise.race([
        api.comments.getPostComments(postId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout after 10s')), 10000)
        )
      ]);
      
      console.log(' Comments API response:', response);
      console.log('📊 Response structure:', {
        isArray: Array.isArray(response),
        keys: response ? Object.keys(response) : 'no response',
        type: typeof response
      });
      
      // Handle different response structures
      let commentsArray = [];
      if (Array.isArray(response)) {
        commentsArray = response;
      } else if (response && response.comments && Array.isArray(response.comments)) {
        commentsArray = response.comments;
      } else if (response && response.data && Array.isArray(response.data)) {
        commentsArray = response.data;
      } else if (response && response.result && Array.isArray(response.result)) {
        commentsArray = response.result;
      } else if (response && typeof response === 'object') {
        // Check if it's a single comment object
        if (response.id && response.content) {
          commentsArray = [response];
        } else {
          // Try to extract array from any property
          for (const key in response) {
            if (Array.isArray(response[key])) {
              commentsArray = response[key];
              break;
            }
          }
        }
      }
      
      console.log(`📝 Extracted ${commentsArray.length} comments`);
      
      if (commentsArray.length > 0) {
        console.log('📄 Sample comment:', commentsArray[0]);
      }
      
      const organizedComments = organizeComments(commentsArray);
      setComments(organizedComments);
      
    } catch (err) {
      console.error('❌ Failed to load comments:', err);
      console.error('❌ Full error details:', {
        message: err.message,
        stack: err.stack,
        name: err.name
      });
      
      let errorMessage = 'Failed to load comments. Please try again.';
      
      // Network errors
      if (err.message?.includes('timeout')) {
        errorMessage = 'Request timed out. The server might be slow or unavailable.';
      } else if (err.message?.includes('Network Error') || err.message?.includes('Failed to fetch')) {
        errorMessage = 'Network error. Please check your internet connection and ensure the backend server is running.';
        
        // Try to ping the backend
        try {
          const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
          const ping = await fetch(`${baseUrl}/api/v1/health`);
          console.log('🏓 Backend ping status:', ping.status);
        } catch (pingErr) {
          console.error('❌ Backend ping failed:', pingErr);
        }
      }
      // HTTP errors
      else if (err.message?.includes('404')) {
        errorMessage = `Comments endpoint not found (404). Check if backend has: GET /api/v1/comments/post/${postId}`;
      } else if (err.message?.includes('401') || err.message?.includes('403')) {
        errorMessage = 'Authentication required. Please login to view comments.';
      } else if (err.message?.includes('500')) {
        errorMessage = 'Server error. Please try again later.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const organizeComments = (flatComments) => {
    if (!Array.isArray(flatComments)) return [];
    
    const commentMap = {};
    const rootComments = [];
    
    // First pass: create map of all comments
    flatComments.forEach(comment => {
      commentMap[comment.id] = { 
        ...comment, 
        replies: [],
        likes: comment.likes || 0,
        upvotes: comment.upvotes || 0,
        downvotes: comment.downvotes || 0
      };
    });
    
    // Second pass: organize hierarchy
    flatComments.forEach(comment => {
      if (comment.parentId && commentMap[comment.parentId]) {
        commentMap[comment.parentId].replies.push(commentMap[comment.id]);
      } else if (!comment.parentId) {
        rootComments.push(commentMap[comment.id]);
      }
    });
    
    // Sort replies by date (newest first)
    Object.values(commentMap).forEach(comment => {
      comment.replies.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      );
    });
    
    // Sort root comments by date (newest first)
    rootComments.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    return rootComments;
  };

  const handleCommentSubmit = async (content) => {
    try {
      setSubmitting(true);
      const commentData = {
        content,
        postId,
        groupPostId,
        parentId: null,
        skipSafetyCheck
      };
      
      console.log('📤 Submitting comment:', commentData);
      await api.comments.createComment(commentData);
      await loadComments(); // Reload comments after successful submission
      return { success: true };
    } catch (err) {
      console.error('Failed to create comment:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentUpdate = async (commentId, content) => {
    try {
      await api.comments.updateComment(commentId, { content });
      await loadComments();
    } catch (err) {
      console.error('Failed to update comment:', err);
      throw err;
    }
  };

  const handleCommentDelete = async (commentId) => {
    try {
      await api.comments.deleteComment(commentId);
      await loadComments();
    } catch (err) {
      console.error('Failed to delete comment:', err);
      throw err;
    }
  };

  const handleReactionToggle = async (commentId, reactionType) => {
    try {
      await api.comments.addReaction(commentId, reactionType);
      await loadComments();
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
      throw err;
    }
  };

  // Debug information component
  const DebugInfo = () => (
    <details className="mt-3 small">
      <summary className="cursor-pointer text-muted">
        🔧 Debug Information
      </summary>
      <pre className="mt-2 p-2 bg-light rounded small text-start mb-0" style={{ fontSize: '12px' }}>
{`Post ID: ${postId}
Post ID Type: ${typeof postId}
Group Post ID: ${groupPostId || 'none'}
API Base URL: ${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}
Comments Count: ${comments.length}
Loading: ${loading}
Error: ${error || 'none'}

Endpoint Tested: GET /api/v1/comments/post/${postId}
Expected Response: Array of comments or { comments: [] }`}
      </pre>
    </details>
  );

  if (loading) {
    return (
      <div className="py-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="text-muted mt-3">Loading comments...</p>
        <DebugInfo />
      </div>
    );
  }

  if (error) {
    return (
      <>
        <Alert variant="danger" className="mb-4">
          <div className="d-flex align-items-start">
            <AlertCircle className="me-3 flex-shrink-0 mt-1" size={20} />
            <div className="flex-grow-1">
              <h6 className="alert-heading mb-2">Failed to load comments</h6>
              <p className="mb-3">{error}</p>
              <div className="d-flex gap-2">
                <Button 
                  variant="outline-danger" 
                  size="sm"
                  onClick={loadComments}
                >
                  <RefreshCw size={14} className="me-2" />
                  Try Again
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => {
                    // Open network tab for debugging
                    if (typeof window !== 'undefined') {
                      window.open('chrome://inspect/#devices', '_blank');
                    }
                  }}
                >
                  Open DevTools
                </Button>
              </div>
            </div>
          </div>
        </Alert>
        <DebugInfo />
      </>
    );
  }

  return (
    <div className="comments-section">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div className="d-flex align-items-center">
          <MessageCircle className="me-2" size={24} />
          <h4 className="mb-0">
            Comments {comments.length > 0 && `(${comments.length})`}
          </h4>
        </div>
        <Button 
          variant="link" 
          size="sm" 
          className="text-muted"
          onClick={loadComments}
          title="Refresh comments"
        >
          <RefreshCw size={16} />
        </Button>
      </div>

      {/* Comment Form */}
      <Card className="border mb-4">
        <Card.Body>
          <CommentForm
            onSubmit={handleCommentSubmit}
            placeholder="Share your thoughts..."
            submitLabel="Post Comment"
            disabled={submitting}
          />
        </Card.Body>
      </Card>

      {/* Comments List */}
      {comments.length === 0 ? (
        <Card className="border text-center py-5">
          <Card.Body>
            <MessageCircle size={48} className="text-muted mb-3 opacity-50" />
            <h5 className="text-muted mb-2">No comments yet</h5>
            <p className="text-muted mb-0">Be the first to share your thoughts!</p>
          </Card.Body>
        </Card>
      ) : (
        <div className="comments-list">
          {comments.map(comment => (
            <CommentItem
              key={comment.id}
              comment={comment}
              onUpdate={handleCommentUpdate}
              onDelete={handleCommentDelete}
              onReactionToggle={handleReactionToggle}
              onReply={loadComments}
              postId={postId}
              groupPostId={groupPostId}
              skipSafetyCheck={skipSafetyCheck}
            />
          ))}
        </div>
      )}

      {/* Debug info for developers */}
      {process.env.NODE_ENV === 'development' && (
        <DebugInfo />
      )}
    </div>
  );
};

export default Comments;