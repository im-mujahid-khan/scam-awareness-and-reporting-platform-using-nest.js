import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, Reply, Edit2, Trash2, MoreVertical, ChevronDown, ChevronUp, Heart, Flag } from 'lucide-react';
import { Dropdown, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { formatDistanceToNow } from 'date-fns';
import { api } from '../../lib/api';
import CommentForm from './CommentForm';
import ReportCommentModal from "./Reportcommentmodal";
// import ReportCommentModal from './ReportCommentModal';

const CommentItem = ({ 
  comment, 
  onUpdate, 
  onDelete, 
  onReactionToggle,
  onReply,
  postId,
  groupPostId,
  skipSafetyCheck,
  depth = 0 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [editContent, setEditContent] = useState(comment.content);
  const [submitting, setSubmitting] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Optimistic UI state for reactions
  const [optimisticReactions, setOptimisticReactions] = useState({
    likes: comment.likes || 0,
    upvotes: comment.upvotes || 0,
    downvotes: comment.downvotes || 0,
    isLiked: comment.isLiked || false,
    isUpvoted: comment.isUpvoted || false,
    isDownvoted: comment.isDownvoted || false
  });

  const maxDepth = 5;
  const canNest = depth < maxDepth;

  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem('scamalert_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  const currentUser = getCurrentUser();
  const isOwnComment = currentUser && currentUser.id === comment.userId;

  // Check if edit window (30 minutes) has expired
  const canEdit = () => {
    if (!isOwnComment) return false;
    if (!comment.createdAt) return true; // Allow edit if no timestamp
    
    const createdAt = new Date(comment.createdAt);
    const now = new Date();
    const thirtyMinutes = 30 * 60 * 1000;
    return (now - createdAt) < thirtyMinutes;
  };

  const handleEdit = async () => {
    if (!editContent.trim()) return;
    
    try {
      setSubmitting(true);
      await onUpdate(comment.id, editContent);
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update comment:', err);
      alert('Failed to update comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    
    try {
      await onDelete(comment.id);
    } catch (err) {
      console.error('Failed to delete comment:', err);
      alert('Failed to delete comment. Please try again.');
    }
  };

  const handleReaction = async (type) => {
    // Store previous state for rollback
    const previousState = { ...optimisticReactions };
    
    try {
      // Optimistic UI update
      const newState = { ...optimisticReactions };
      
      // Toggle logic
      if (type === 'LIKE') {
        newState.isLiked = !newState.isLiked;
        newState.likes += newState.isLiked ? 1 : -1;
      } else if (type === 'UPVOTE') {
        newState.isUpvoted = !newState.isUpvoted;
        newState.upvotes += newState.isUpvoted ? 1 : -1;
        // Remove downvote if present
        if (newState.isDownvoted) {
          newState.isDownvoted = false;
          newState.downvotes -= 1;
        }
      } else if (type === 'DOWNVOTE') {
        newState.isDownvoted = !newState.isDownvoted;
        newState.downvotes += newState.isDownvoted ? 1 : -1;
        // Remove upvote if present
        if (newState.isUpvoted) {
          newState.isUpvoted = false;
          newState.upvotes -= 1;
        }
      }
      
      setOptimisticReactions(newState);
      
      // Make API call
      await onReactionToggle(comment.id, type);
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
      // Rollback on error
      setOptimisticReactions(previousState);
      alert('Failed to react to comment. Please try again.');
    }
  };

  const handleReplySubmit = async (content) => {
    try {
      setSubmitting(true);
      const replyData = {
        content,
        postId,
        groupPostId,
        parentId: comment.id,
        skipSafetyCheck
      };
      
      await api.comments.createComment(replyData);
      setIsReplying(false);
      if (onReply) await onReply();
    } catch (err) {
      console.error('Failed to create reply:', err);
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const handleReport = async (reportData) => {
    try {
      // Call your report API endpoint
      await api.request('/api/v1/comment-reports/comment/' + reportData.commentId, {
        method: 'POST',
        body: JSON.stringify({
          reason: reportData.reason,
          details: reportData.details
        })
      });
      
      alert('Thank you for your report. Our moderation team will review it.');
    } catch (err) {
      console.error('Failed to report comment:', err);
      throw err;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Just now';
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'Recently';
    }
  };

  const getAvatarUrl = (user) => {
    if (user?.avatarUrl) return user.avatarUrl;
    if (user?.profileImage) return user.profileImage;
    const name = user?.displayName || user?.username || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff`;
  };

  // Tooltip components
  const LikeTooltip = (props) => (
    <Tooltip id="like-tooltip" {...props}>Like this comment</Tooltip>
  );

  const UpvoteTooltip = (props) => (
    <Tooltip id="upvote-tooltip" {...props}>This comment is helpful</Tooltip>
  );

  const DownvoteTooltip = (props) => (
    <Tooltip id="downvote-tooltip" {...props}>This comment is not helpful</Tooltip>
  );

  return (
    <div 
      className="comment-item mb-3"
      style={{ 
        marginLeft: depth > 0 ? '40px' : '0',
        borderLeft: depth > 0 ? '2px solid #e9ecef' : 'none',
        paddingLeft: depth > 0 ? '16px' : '0'
      }}
    >
      <div className="d-flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <img
            src={getAvatarUrl(comment.user)}
            alt={comment.user?.displayName || 'User'}
            className="rounded-circle"
            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
          />
        </div>

        {/* Comment Content */}
        <div className="flex-grow-1">
          <div className="bg-light rounded-3 p-3 mb-2">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <strong className="d-block mb-1">
                  {comment.user?.displayName || comment.user?.username || 'Anonymous'}
                </strong>
                <small className="text-muted">
                  {formatTimestamp(comment.createdAt)}
                  {comment.isEdited && ' (edited)'}
                  {!canEdit() && isOwnComment && (
                    <span className="text-warning ms-2" title="Edit window expired">
                      🔒
                    </span>
                  )}
                </small>
              </div>

              {/* Actions Dropdown */}
              <Dropdown align="end">
                <Dropdown.Toggle
                  variant="link"
                  className="text-muted p-0 border-0"
                  style={{ boxShadow: 'none' }}
                >
                  <MoreVertical size={16} />
                </Dropdown.Toggle>

                <Dropdown.Menu>
                  {isOwnComment && canEdit() && (
                    <>
                      <Dropdown.Item onClick={() => setIsEditing(true)}>
                        <Edit2 size={14} className="me-2" />
                        Edit
                      </Dropdown.Item>
                      <Dropdown.Item onClick={handleDelete} className="text-danger">
                        <Trash2 size={14} className="me-2" />
                        Delete
                      </Dropdown.Item>
                      <Dropdown.Divider />
                    </>
                  )}
                  {isOwnComment && !canEdit() && (
                    <>
                      <Dropdown.Item onClick={handleDelete} className="text-danger">
                        <Trash2 size={14} className="me-2" />
                        Delete
                      </Dropdown.Item>
                      <Dropdown.Item disabled>
                        <Edit2 size={14} className="me-2" />
                        Edit (window expired)
                      </Dropdown.Item>
                      <Dropdown.Divider />
                    </>
                  )}
                  {!isOwnComment && (
                    <Dropdown.Item onClick={() => setShowReportModal(true)}>
                      <Flag size={14} className="me-2" />
                      Report
                    </Dropdown.Item>
                  )}
                </Dropdown.Menu>
              </Dropdown>
            </div>

            {/* Comment Text or Edit Form */}
            {isEditing ? (
              <div>
                <CommentForm
                  initialValue={editContent}
                  onSubmit={async (content) => {
                    setEditContent(content);
                    await handleEdit();
                  }}
                  onCancel={() => {
                    setIsEditing(false);
                    setEditContent(comment.content);
                  }}
                  placeholder="Edit your comment..."
                  submitLabel="Save"
                  disabled={submitting}
                />
              </div>
            ) : (
              <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                {comment.content}
              </p>
            )}
          </div>

          {/* Action Buttons */}
          {!isEditing && (
            <div className="d-flex gap-3 align-items-center">
              {/* Like Button with Tooltip */}
              <OverlayTrigger placement="top" overlay={LikeTooltip}>
                <button
                  className={`btn btn-sm btn-link text-decoration-none p-0 ${
                    optimisticReactions.isLiked ? 'text-primary' : 'text-muted'
                  }`}
                  onClick={() => handleReaction('LIKE')}
                >
                  <Heart 
                    size={16} 
                    className="me-1" 
                    fill={optimisticReactions.isLiked ? 'currentColor' : 'none'} 
                  />
                  {optimisticReactions.likes > 0 && <span>{optimisticReactions.likes}</span>}
                </button>
              </OverlayTrigger>

              {/* Upvote Button with Tooltip */}
              <OverlayTrigger placement="top" overlay={UpvoteTooltip}>
                <button
                  className={`btn btn-sm btn-link text-decoration-none p-0 ${
                    optimisticReactions.isUpvoted ? 'text-success' : 'text-muted'
                  }`}
                  onClick={() => handleReaction('UPVOTE')}
                >
                  <ThumbsUp 
                    size={16} 
                    className="me-1" 
                    fill={optimisticReactions.isUpvoted ? 'currentColor' : 'none'} 
                  />
                  {optimisticReactions.upvotes > 0 && <span>{optimisticReactions.upvotes}</span>}
                </button>
              </OverlayTrigger>

              {/* Downvote Button with Tooltip */}
              <OverlayTrigger placement="top" overlay={DownvoteTooltip}>
                <button
                  className={`btn btn-sm btn-link text-decoration-none p-0 ${
                    optimisticReactions.isDownvoted ? 'text-danger' : 'text-muted'
                  }`}
                  onClick={() => handleReaction('DOWNVOTE')}
                >
                  <ThumbsDown 
                    size={16} 
                    className="me-1" 
                    fill={optimisticReactions.isDownvoted ? 'currentColor' : 'none'} 
                  />
                  {optimisticReactions.downvotes > 0 && <span>{optimisticReactions.downvotes}</span>}
                </button>
              </OverlayTrigger>

              {/* Reply Button */}
              {canNest && (
                <button
                  className="btn btn-sm btn-link text-decoration-none text-muted p-0"
                  onClick={() => setIsReplying(!isReplying)}
                >
                  <Reply size={16} className="me-1" />
                  Reply
                </button>
              )}

              {/* Toggle Replies Button */}
              {comment.replies && comment.replies.length > 0 && (
                <button
                  className="btn btn-sm btn-link text-decoration-none text-muted p-0"
                  onClick={() => setShowReplies(!showReplies)}
                >
                  {showReplies ? (
                    <>
                      <ChevronUp size={16} className="me-1" />
                      Hide {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                    </>
                  ) : (
                    <>
                      <ChevronDown size={16} className="me-1" />
                      Show {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Reply Form */}
          {isReplying && (
            <div className="mt-3">
              <CommentForm
                onSubmit={handleReplySubmit}
                onCancel={() => setIsReplying(false)}
                placeholder="Write a reply..."
                submitLabel="Reply"
                disabled={submitting}
              />
            </div>
          )}

          {/* Nested Replies */}
          {showReplies && comment.replies && comment.replies.length > 0 && (
            <div className="mt-3">
              {comment.replies.map(reply => (
                <CommentItem
                  key={reply.id}
                  comment={reply}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  onReactionToggle={onReactionToggle}
                  onReply={onReply}
                  postId={postId}
                  groupPostId={groupPostId}
                  skipSafetyCheck={skipSafetyCheck}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Report Modal */}
      <ReportCommentModal
        show={showReportModal}
        onHide={() => setShowReportModal(false)}
        onSubmit={handleReport}
        commentId={comment.id}
      />
    </div>
  );
};

export default CommentItem;