import React, { useState, useRef, useEffect } from 'react';
import { Send, AlertCircle } from 'lucide-react';

const CommentForm = ({ 
  onSubmit, 
  onCancel, 
  placeholder = 'Add a comment...', 
  submitLabel = 'Post',
  disabled = false,
  initialValue = ''
}) => {
  const [content, setContent] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const textareaRef = useRef(null);

  const MAX_CHARS = 1000;
  const WARNING_THRESHOLD = 900;
  const charCount = content.length;
  const isNearLimit = charCount >= WARNING_THRESHOLD;
  const isOverLimit = charCount > MAX_CHARS;

  useEffect(() => {
    setContent(initialValue);
  }, [initialValue]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [content]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!content.trim() || submitting || disabled || isOverLimit) return;

    try {
      setSubmitting(true);
      await onSubmit(content);
      setContent('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to submit comment:', err);
      alert('Failed to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleKeyDown = (e) => {
    // Submit on Ctrl+Enter or Cmd+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  // Get current user for avatar
  const getCurrentUser = () => {
    try {
      const userStr = localStorage.getItem('scamalert_user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  };

  const currentUser = getCurrentUser();

  const getAvatarUrl = (user) => {
    if (user?.avatarUrl) return user.avatarUrl;
    if (user?.profileImage) return user.profileImage;
    const name = user?.displayName || user?.username || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff`;
  };

  // Get character counter color
  const getCounterColor = () => {
    if (isOverLimit) return 'text-danger';
    if (isNearLimit) return 'text-warning';
    return 'text-muted';
  };

  return (
    <form onSubmit={handleSubmit} className="comment-form">
      <div className="d-flex gap-3">
        {/* User Avatar */}
        {currentUser && (
          <div className="flex-shrink-0">
            <img
              src={getAvatarUrl(currentUser)}
              alt={currentUser.displayName || 'User'}
              className="rounded-circle"
              style={{ width: '40px', height: '40px', objectFit: 'cover' }}
            />
          </div>
        )}

        {/* Input Area */}
        <div className="flex-grow-1">
          <textarea
            ref={textareaRef}
            className={`form-control mb-2 ${isOverLimit ? 'is-invalid' : ''} ${isNearLimit && !isOverLimit ? 'border-warning' : ''}`}
            placeholder={placeholder}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled || submitting}
            rows={1}
            style={{
              minHeight: '44px',
              maxHeight: '200px',
              resize: 'none',
              overflow: 'auto'
            }}
          />

          {/* Character Counter and Warnings */}
          <div className="d-flex justify-content-between align-items-center mb-2">
            <div className="d-flex align-items-center gap-2">
              {/* Character Counter */}
              <small className={`fw-semibold ${getCounterColor()}`}>
                {charCount}/{MAX_CHARS}
              </small>

              {/* Warning Messages */}
              {isOverLimit && (
                <small className="text-danger d-flex align-items-center gap-1">
                  <AlertCircle size={14} />
                  Character limit exceeded
                </small>
              )}
              {isNearLimit && !isOverLimit && (
                <small className="text-warning d-flex align-items-center gap-1">
                  <AlertCircle size={14} />
                  Approaching character limit
                </small>
              )}
              {charCount === 0 && (
                <small className="text-muted">
                  Press Ctrl+Enter to submit
                </small>
              )}
            </div>

            <div className="d-flex gap-2">
              {onCancel && (
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={onCancel}
                  disabled={disabled || submitting}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="btn btn-sm btn-primary d-flex align-items-center gap-2"
                disabled={disabled || submitting || !content.trim() || isOverLimit}
              >
                {submitting ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                    <span>Posting...</span>
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    <span>{submitLabel}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Helper Text */}
          {!submitting && charCount === 0 && (
            <small className="text-muted d-block">
              Write a thoughtful comment. Be respectful and constructive.
            </small>
          )}
        </div>
      </div>
    </form>
  );
};

export default CommentForm;