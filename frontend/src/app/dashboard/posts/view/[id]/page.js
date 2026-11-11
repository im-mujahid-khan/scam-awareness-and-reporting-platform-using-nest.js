"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Container, Row, Col, Card, Badge, Button, Alert, Spinner, Modal, Collapse, Form, 
  OverlayTrigger, Tooltip, Dropdown, ListGroup 
} from "react-bootstrap"
import {
  FaCalendar,
  FaUser,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaPhone,
  FaEnvelope,
  FaLink,
  FaEye,
  FaEyeSlash,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaExclamationTriangle,
  FaShieldAlt,
  FaBuilding,
  FaImages,
  FaChevronDown,
  FaChevronUp,
  FaArrowLeft,
  FaEdit,
  FaTrash,
  FaQuestionCircle,
  FaFileAlt,
  FaVideo,
  FaFilePdf,
  FaThumbsUp,
  FaBookmark,
  FaComment,
  FaFlag,
  FaInfoCircle,
  FaShareAlt,
  FaHeart,
  FaThumbsDown,
  FaReply,
  FaCheck,
  FaTimes,
  FaEllipsisV,
  FaUserFriends,
  FaSort,
  FaChevronRight,
  FaExclamationTriangle as FaExclamationTriangleIcon,
  FaInfoCircle as FaInfoCircleIcon,
  FaEye as FaEyeIcon,
  FaEyeSlash as FaEyeSlashIcon,
} from "react-icons/fa"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from '../../../../../../lib/contexts/AuthContext';
import { toast } from 'react-toastify';
import DashboardLayout from '../../../../../../components/layout/DashboardLayout';

// ==================== SENSITIVE CONTENT UTILITIES ====================

const SENSITIVE_PATTERNS = {
  phone: /(\+?\d{1,4}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}|\d{10,}/g,
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  url: /(https?:\/\/[^\s]+)|(www\.[^\s]+\.[a-zA-Z]{2,})/g,
  creditCard: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
};

const detectSensitiveInfo = (text) => {
  if (!text || typeof text !== 'string') {
    return { hasDetection: false, detections: {} };
  }

  const detections = {};
  let hasDetection = false;

  Object.keys(SENSITIVE_PATTERNS).forEach((key) => {
    const pattern = SENSITIVE_PATTERNS[key];
    const matches = text.match(pattern);
    
    if (matches && matches.length > 0) {
      detections[key] = { count: matches.length, matches: matches };
      hasDetection = true;
    }
  });

  return { hasDetection, detections };
};

const maskSensitiveInfo = (text) => {
  if (!text || typeof text !== 'string') return text;

  let maskedText = text;

  // Mask phone numbers
  maskedText = maskedText.replace(SENSITIVE_PATTERNS.phone, (match) => {
    const digits = match.replace(/\D/g, '');
    if (digits.length >= 4) {
      return `${digits.slice(0, 2)}${'*'.repeat(digits.length - 4)}${digits.slice(-2)}`;
    }
    return '[Phone Hidden]';
  });

  // Mask emails
  maskedText = maskedText.replace(SENSITIVE_PATTERNS.email, (match) => {
    const [username, domain] = match.split('@');
    if (username.length >= 2) {
      const maskedUsername = username.slice(0, 2) + '*'.repeat(Math.max(0, username.length - 2));
      return `${maskedUsername}@${domain}`;
    }
    return '[Email Hidden]';
  });

  // Mask URLs
  maskedText = maskedText.replace(SENSITIVE_PATTERNS.url, (match) => {
    try {
      const url = new URL(match.startsWith('http') ? match : `https://${match}`);
      return `[Link to ${url.hostname}]`;
    } catch (e) {
      return '[Link Hidden]';
    }
  });

  // Mask credit cards
  maskedText = maskedText.replace(SENSITIVE_PATTERNS.creditCard, (match) => {
    const digits = match.replace(/\D/g, '');
    return `****-****-****-${digits.slice(-4)}`;
  });

  // Mask SSN
  maskedText = maskedText.replace(SENSITIVE_PATTERNS.ssn, (match) => {
    const parts = match.split('-');
    return `***-**-${parts[2]}`;
  });

  return maskedText;
};

const getWarningMessages = (detections) => {
  const messages = [];
  if (!detections || !detections.hasDetection) return messages;

  const { detections: detected } = detections;

  if (detected.phone) {
    messages.push({
      type: 'phone',
      severity: 'warning',
      message: `Your comment contains ${detected.phone.count} phone number${detected.phone.count > 1 ? 's' : ''}`,
      description: 'Phone numbers will be partially masked to protect privacy.',
      icon: '📱',
    });
  }

  if (detected.email) {
    messages.push({
      type: 'email',
      severity: 'warning',
      message: `Your comment contains ${detected.email.count} email address${detected.email.count > 1 ? 'es' : ''}`,
      description: 'Email addresses will be partially masked to protect privacy.',
      icon: '📧',
    });
  }

  if (detected.url) {
    messages.push({
      type: 'url',
      severity: 'info',
      message: `Your comment contains ${detected.url.count} URL${detected.url.count > 1 ? 's' : ''}`,
      description: 'Links will be masked to show only the domain name.',
      icon: '🔗',
    });
  }

  if (detected.creditCard) {
    messages.push({
      type: 'creditCard',
      severity: 'danger',
      message: `Your comment appears to contain ${detected.creditCard.count} credit card number${detected.creditCard.count > 1 ? 's' : ''}`,
      description: 'NEVER share credit card information online. This will be heavily masked.',
      icon: '💳',
    });
  }

  if (detected.ssn) {
    messages.push({
      type: 'ssn',
      severity: 'danger',
      message: `Your comment appears to contain ${detected.ssn.count} Social Security Number${detected.ssn.count > 1 ? 's' : ''}`,
      description: 'NEVER share SSN online. This will be heavily masked.',
      icon: '🆔',
    });
  }

  return messages;
};

const formatDetectionSummary = (detections) => {
  if (!detections || !detections.hasDetection) {
    return 'No sensitive information detected';
  }

  const items = [];
  const { detections: detected } = detections;

  if (detected.phone) items.push(`${detected.phone.count} phone number(s)`);
  if (detected.email) items.push(`${detected.email.count} email(s)`);
  if (detected.url) items.push(`${detected.url.count} URL(s)`);
  if (detected.creditCard) items.push(`${detected.creditCard.count} card number(s)`);
  if (detected.ssn) items.push(`${detected.ssn.count} SSN(s)`);

  if (items.length === 0) return 'No sensitive information detected';
  if (items.length === 1) return `Detected: ${items[0]}`;

  const lastItem = items.pop();
  return `Detected: ${items.join(', ')} and ${lastItem}`;
};

// ==================== WARNING MODAL COMPONENT ====================

const SensitiveContentWarningModal = ({
  show,
  onHide,
  onEdit,
  onPostAnyway,
  originalText,
  maskedText,
  warnings,
  detectionSummary,
  isSubmitting = false,
}) => {
  const [showPreview, setShowPreview] = useState(true);

  const getSeverityLevel = () => {
    if (!warnings || warnings.length === 0) return 'info';
    const hasDanger = warnings.some(w => w.severity === 'danger');
    if (hasDanger) return 'danger';
    const hasWarning = warnings.some(w => w.severity === 'warning');
    if (hasWarning) return 'warning';
    return 'info';
  };

  const severityLevel = getSeverityLevel();

  const getHeaderColor = () => {
    switch (severityLevel) {
      case 'danger': return 'bg-danger text-white';
      case 'warning': return 'bg-warning text-dark';
      default: return 'bg-info text-white';
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg" backdrop="static" keyboard={false}>
      <Modal.Header className={getHeaderColor()} closeButton>
        <Modal.Title className="d-flex align-items-center">
          <FaShieldAlt className="me-2" size={24} />
          Sensitive Information Detected
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4">
        <Alert variant={severityLevel} className="mb-4">
          <div className="d-flex align-items-start">
            <FaExclamationTriangleIcon className="me-3 mt-1 flex-shrink-0" size={24} />
            <div className="flex-grow-1">
              <Alert.Heading className="h6 mb-2">Privacy Protection Active</Alert.Heading>
              <p className="mb-2">{detectionSummary}</p>
              <p className="mb-0 small">
                To protect your privacy, sensitive information will be automatically masked before posting.
              </p>
            </div>
          </div>
        </Alert>

        {warnings && warnings.length > 0 && (
          <div className="mb-4">
            <h6 className="fw-bold mb-3">
              <FaExclamationTriangleIcon className="me-2 text-warning" />
              Details
            </h6>
            <ListGroup>
              {warnings.map((warning, index) => (
                <ListGroup.Item 
                  key={index}
                  className="border-start border-4"
                  style={{
                    borderColor: warning.severity === 'danger' ? '#dc3545' : 
                                warning.severity === 'warning' ? '#ffc107' : '#0dcaf0'
                  }}
                >
                  <div className="d-flex align-items-start">
                    <span className="me-3 fs-4">{warning.icon}</span>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <strong>{warning.message}</strong>
                        <Badge 
                          bg={warning.severity === 'danger' ? 'danger' : 
                             warning.severity === 'warning' ? 'warning' : 'info'}
                          className="ms-2"
                        >
                          {warning.severity === 'danger' ? 'Critical' : 
                           warning.severity === 'warning' ? 'Warning' : 'Info'}
                        </Badge>
                      </div>
                      <p className="text-muted small mb-0">{warning.description}</p>
                    </div>
                  </div>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        )}

        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="fw-bold mb-0">
              {showPreview ? 'How Your Comment Will Appear' : 'Original Comment'}
            </h6>
            <Button
              variant="link"
              size="sm"
              className="text-decoration-none d-flex align-items-center"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? (
                <>
                  <FaEyeIcon className="me-1" />
                  Show Original
                </>
              ) : (
                <>
                  <FaEyeSlashIcon className="me-1" />
                  Show Masked
                </>
              )}
            </Button>
          </div>

          <div 
            className="p-3 rounded-3 border"
            style={{
              backgroundColor: showPreview ? '#f8f9fa' : '#fff3cd',
              borderColor: showPreview ? '#dee2e6' : '#ffc107',
              fontFamily: 'monospace',
              fontSize: '0.9rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: '200px',
              overflowY: 'auto',
            }}
          >
            {showPreview ? maskedText : originalText}
          </div>

          {showPreview && (
            <div className="mt-2">
              <small className="text-muted d-flex align-items-center">
                <FaCheckCircle className="me-1 text-success" />
                Sensitive information has been masked for your protection
              </small>
            </div>
          )}
        </div>

        <Alert variant="light" className="border mb-0">
          <div className="small">
            <strong className="d-block mb-2">
              <FaShieldAlt className="me-2 text-primary" />
              Safety Tips:
            </strong>
            <ul className="mb-0 ps-3">
              <li>Never share credit card numbers, SSNs, or passwords online</li>
              <li>Be cautious about sharing phone numbers and email addresses publicly</li>
              <li>Masked information helps protect you from identity theft and spam</li>
              <li>You can always edit your comment to remove sensitive information entirely</li>
            </ul>
          </div>
        </Alert>
      </Modal.Body>

      <Modal.Footer className="bg-light">
        <div className="d-flex justify-content-between align-items-center w-100">
          <Button
            variant="outline-secondary"
            onClick={onEdit}
            disabled={isSubmitting}
            className="d-flex align-items-center"
          >
            <FaEdit className="me-2" />
            Edit Comment
          </Button>
          <div className="d-flex gap-2">
            <Button variant="secondary" onClick={onHide} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onPostAnyway}
              disabled={isSubmitting}
              className="d-flex align-items-center"
            >
              {isSubmitting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" />
                  Posting...
                </>
              ) : (
                <>
                  <FaShieldAlt className="me-2" />
                  Post with Masking
                </>
              )}
            </Button>
          </div>
        </div>
      </Modal.Footer>
    </Modal>
  );
};

const PostDetailPage = () => {
  const { id } = useParams()
  const { user, api } = useAuth()
  const router = useRouter()

  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showPii, setShowPii] = useState(false)
  const [expandedSections, setExpandedSections] = useState({
    details: true,
    media: false,
  })
  const [reactions, setReactions] = useState({ likes: 0, liked: false, bookmarked: false })
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)

  // Comment-related state
  const [expandedComments, setExpandedComments] = useState(true)
  const [commentInput, setCommentInput] = useState('')
  const [postComments, setPostComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [submittingComment, setSubmittingComment] = useState(false)

  // NEW: Comment sorting and pagination state
  const [commentSort, setCommentSort] = useState("top") // top, newest, oldest
  const [commentPage, setCommentPage] = useState(1)
  const [commentHasMore, setCommentHasMore] = useState(false)
  const [loadingMoreComments, setLoadingMoreComments] = useState(false)

  // State for delete confirmation modal
  const [showDeleteCommentModal, setShowDeleteCommentModal] = useState(false)
  const [deleteCommentData, setDeleteCommentData] = useState(null)

  // State for report modal
  const [showReportModal, setShowReportModal] = useState(false)
  const [reportCommentData, setReportCommentData] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [reportDetails, setReportDetails] = useState('')
  const [submittingReport, setSubmittingReport] = useState(false)

  // Add these new state variables for sensitive content detection
  const [showSensitiveWarningModal, setShowSensitiveWarningModal] = useState(false)
  const [pendingComment, setPendingComment] = useState(null)
  const [maskedComments, setMaskedComments] = useState(new Set())
  const [inputDetection, setInputDetection] = useState(null)

  useEffect(() => {
    if (id) {
      loadPost()
    }
  }, [id])

  useEffect(() => {
    if (post && post.editableUntil) {
      const timer = setInterval(() => {
        const now = new Date()
        const editableUntil = new Date(post.editableUntil)
        const diff = editableUntil - now
        
        if (diff <= 0) {
          clearInterval(timer)
          setTimeLeft("Expired")
        } else {
          const minutes = Math.floor(diff / 1000 / 60)
          const seconds = Math.floor((diff / 1000) % 60)
          setTimeLeft(`${minutes}m ${seconds}s`)
        }
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [post])

  const loadPost = async () => {
    try {
      setLoading(true)
      const response = await api.getPost(id)
      setPost(response)
      
      if (response) {
        const reactionsData = response.reactions || []
        const bookmarksData = response.bookmarks || []
        
        setReactions({
          likes: response._count?.reactions || 0,
          liked: reactionsData.some(r => r.type === 'like' && r.userId === user?.id),
          bookmarked: bookmarksData.some(b => b.userId === user?.id),
          comments: response._count?.comments || 0
        })

        // Load comments automatically on detail page
        loadComments(id, 1, commentSort, false)
      }
    } catch (err) {
      console.error("Failed to load post:", err)
      setError("Failed to load post. It may have been removed or you may not have permission to view it.")
    } finally {
      setLoading(false)
    }
  }

  // Enhanced organize comments into tree structure with sorting
  const organizeComments = useCallback((flatComments, sortType = "top") => {
    if (!Array.isArray(flatComments)) {
      console.log('⚠️ organizeComments: Input is not an array:', flatComments);
      return [];
    }
    
    console.log(`📊 Organizing ${flatComments.length} comments with sort: ${sortType}`);
    
    const commentMap = new Map();
    const rootComments = [];
    
    // First pass: create map and initialize comments
    flatComments.forEach(comment => {
      if (!comment || !comment.id) {
        console.warn('⚠️ Skipping invalid comment:', comment);
        return;
      }
      
      // Normalize userReaction to uppercase
      let userReaction = comment.userReaction || null;
      if (userReaction && typeof userReaction === 'string') {
        userReaction = userReaction.toUpperCase();
      }
      
      // FIXED: Preserve existing replies if they exist (important for maintaining state)
      const enrichedComment = {
        ...comment,
        replies: comment.replies && Array.isArray(comment.replies) ? comment.replies : [],
        likes: comment.likes || 0,
        upvotes: comment.upvotes || 0,
        downvotes: comment.downvotes || 0,
        userReaction: userReaction,
        user: comment.user || { 
          id: comment.userId || 'unknown',
          displayName: 'Anonymous', 
          username: 'anonymous' 
        },
        // Calculate score for sorting
        score: (comment.upvotes || 0) - (comment.downvotes || 0)
      };
      
      if (userReaction) {
        console.log(`👤 User has reacted with ${userReaction} on comment ${comment.id}`);
      }
      
      commentMap.set(comment.id, enrichedComment);
    });
    
    console.log(`📊 Created map with ${commentMap.size} comments`);
    
    // Second pass: build the tree ONLY if we don't already have a proper tree structure
    let needsTreeBuilding = false;
    
    flatComments.forEach(comment => {
      if (!comment || !comment.id) return;
      
      const currentComment = commentMap.get(comment.id);
      if (!currentComment) return;
      
      // Check if this comment already has its replies populated
      if (comment.parentId && (!comment.replies || comment.replies.length === 0)) {
        needsTreeBuilding = true;
        const parentComment = commentMap.get(comment.parentId);
        if (parentComment) {
          // Only add if not already in replies
          const alreadyExists = parentComment.replies.some(r => r.id === comment.id);
          if (!alreadyExists) {
            parentComment.replies.push(currentComment);
            console.log(`🔗 Linked comment ${comment.id} as reply to parent ${comment.parentId}`);
          }
        } else {
          console.warn(`⚠️ Parent comment ${comment.parentId} not found for reply ${comment.id}. Adding as root comment.`);
          rootComments.push(currentComment);
        }
      } else if (!comment.parentId) {
        rootComments.push(currentComment);
        console.log(`🌳 Added comment ${comment.id} as root comment`);
      }
    });
    
    // If we didn't need tree building, it means comments already have their replies
    // In this case, just extract the root comments
    if (!needsTreeBuilding && rootComments.length === 0) {
      console.log('📦 Comments already have tree structure, extracting root comments...');
      flatComments.forEach(comment => {
        if (!comment.parentId) {
          const enrichedComment = commentMap.get(comment.id);
          if (enrichedComment) {
            rootComments.push(enrichedComment);
          }
        }
      });
    }
    
    // Function to sort comments based on sortType
    const sortComments = (comments, isReplies = false) => {
      // Create a shallow copy to avoid mutating original array
      const commentsCopy = [...comments];
      
      if (sortType === "newest") {
        return commentsCopy.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        );
      } else if (sortType === "oldest") {
        return commentsCopy.sort((a, b) => 
          new Date(a.createdAt) - new Date(b.createdAt)
        );
      } else { // "top" - default
        if (isReplies) {
          // For replies, sort by date (newest first)
          return commentsCopy.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
          );
        } else {
          // For top-level comments, sort by score
          return commentsCopy.sort((a, b) => {
            const scoreA = a.score || ((a.upvotes || 0) - (a.downvotes || 0));
            const scoreB = b.score || ((b.upvotes || 0) - (b.downvotes || 0));
            if (scoreB !== scoreA) return scoreB - scoreA;
            // If scores are equal, sort by date (newest first)
            return new Date(b.createdAt) - new Date(a.createdAt);
          });
        }
      }
    };
    
    // Recursively sort all replies in the tree
    const sortRepliesRecursively = (comment) => {
      if (comment.replies && comment.replies.length > 0) {
        // Sort this level's replies
        comment.replies = sortComments(comment.replies, true);
        // Recursively sort nested replies
        comment.replies.forEach(reply => sortRepliesRecursively(reply));
      }
    };
    
    // Sort all replies in all comments
    commentMap.forEach(comment => {
      sortRepliesRecursively(comment);
    });
    
    // Sort root comments
    const sortedRootComments = sortComments(rootComments, false);
    
    // Count total comments including all nested replies
    let totalCount = 0;
    const countAll = (comment) => {
      totalCount++;
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.forEach(countAll);
      }
    };
    sortedRootComments.forEach(countAll);
    
    console.log(`✅ Organized comments: ${sortedRootComments.length} root comments, ${totalCount} total (including all replies)`);
    
    return sortedRootComments;
  }, []);

  // NEW: Load comments with pagination and sorting
  const loadComments = useCallback(async (postId, page = 1, sortType = "top", append = false) => {
    if (!postId) return;
    
    try {
      if (!append) {
        setLoadingComments(true);
      } else {
        setLoadingMoreComments(true);
      }
      
      console.log(`📥 Loading comments for post: ${postId}, page: ${page}, sort: ${sortType}`);
      
      // Use the paginated endpoint with sorting
      const response = await api.comments.getPostCommentsPaginated(postId, {
        page: page,
        limit: 10,
        sortBy: sortType,
        maxDepth: 3
      });
      
      console.log(`📦 API response for post ${postId}:`, response);
      
      let commentsArray = response.data || [];
      let hasMore = response.hasMore || false;
      
      console.log(`📊 Extracted ${commentsArray.length} comments for post ${postId}`);
      
      // Apply masking to loaded comments
      const processedComments = commentsArray.map(comment => {
        const { hasDetection } = detectSensitiveInfo(comment.content);
        
        if (hasDetection) {
          setMaskedComments(prev => new Set([...prev, comment.id]));
          return {
            ...comment,
            content: maskSensitiveInfo(comment.content),
            isMasked: true,
          };
        }
        
        return comment;
      });
      
      // Organize into tree structure with sorting
      const organizedComments = organizeComments(processedComments, sortType);
      
      if (append) {
        // Append to existing comments
        setPostComments(prev => [...prev, ...organizedComments]);
      } else {
        // Replace existing comments
        setPostComments(organizedComments);
      }
      
      // Update pagination state
      setCommentPage(page);
      setCommentHasMore(hasMore);
      
      console.log(`✅ Loaded ${organizedComments.length} comments for post ${postId} (page ${page}, hasMore: ${hasMore})`);
      
    } catch (error) {
      console.error(`❌ Failed to load comments for post ${postId}:`, error);
      
      if (!append) {
        toast.error('Failed to load comments');
        setPostComments([]);
        
        // Try fallback endpoint
        try {
          console.log('🔄 Trying fallback endpoint for comments...');
          const fallbackResponse = await api.comments.getPostComments(postId);
          if (fallbackResponse && Array.isArray(fallbackResponse)) {
            const organizedComments = organizeComments(fallbackResponse, sortType);
            setPostComments(organizedComments);
            console.log(`✅ Loaded ${organizedComments.length} comments using fallback`);
          }
        } catch (fallbackError) {
          console.error(`❌ Fallback also failed for post ${postId}:`, fallbackError);
        }
      }
    } finally {
      if (!append) {
        setLoadingComments(false);
      } else {
        setLoadingMoreComments(false);
      }
    }
  }, [api, organizeComments]);

  // NEW: Handle comment sort change
  const handleCommentSortChange = useCallback(async (sortType) => {
    console.log(`🔄 Changing comment sort to: ${sortType}`);
    setCommentSort(sortType);
    await loadComments(id, 1, sortType, false);
  }, [id, loadComments]);

  // NEW: Load more comments
  const loadMoreComments = useCallback(async () => {
    const nextPage = commentPage + 1;
    console.log(`📥 Loading more comments, page ${nextPage}`);
    await loadComments(id, nextPage, commentSort, true);
  }, [id, commentPage, commentSort, loadComments]);

  // Handle comment input change with real-time detection
  const handleCommentInputChange = useCallback((value) => {
    setCommentInput(value);

    // Real-time detection
    if (value && value.trim()) {
      const detections = detectSensitiveInfo(value);
      setInputDetection(detections);
    } else {
      setInputDetection(null);
    }
  }, []);

  // Submit a new comment with masking check
  const submitCommentWithMaskingCheck = useCallback(async (postId, content, parentId = null) => {
    if (!user) {
      toast.error("Please login to comment");
      return;
    }
    
    if (!content.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }
    
    // Check for sensitive information
    const detections = detectSensitiveInfo(content);
    
    if (detections.hasDetection) {
      // Show warning modal
      const warnings = getWarningMessages(detections);
      const maskedPreview = maskSensitiveInfo(content);
      const summary = formatDetectionSummary(detections);

      setPendingComment({
        postId,
        content,
        parentId,
        detections,
        warnings,
        maskedPreview,
        summary,
      });

      setShowSensitiveWarningModal(true);
      return;
    }

    // No sensitive info, proceed normally
    await submitCommentDirect(postId, content, parentId, false);
  }, [user]);

  // Handle posting with masking
  const handlePostWithMasking = useCallback(async () => {
    if (!pendingComment) return;

    const { postId, content, parentId } = pendingComment;
    setShowSensitiveWarningModal(false);
    await submitCommentDirect(postId, content, parentId, true);
    setPendingComment(null);
  }, [pendingComment]);

  // Handle edit from warning modal
  const handleEditFromWarning = useCallback(() => {
    setShowSensitiveWarningModal(false);
    setPendingComment(null);
    toast.info("Please edit your comment to remove sensitive information");
  }, []);

  // FIXED: Submit a new comment (main comment or reply) - optimistic update
  const submitCommentDirect = useCallback(async (postId, content, parentId = null, applyMasking = false) => {
    if (!user) {
      toast.error("Please login to comment");
      return;
    }
    
    if (!content.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }
    
    try {
      const isReply = !!parentId;
      
      if (isReply) {
        console.log(`💬 Submitting reply to comment ${parentId} on post ${postId}`);
      } else {
        console.log(`💬 Submitting main comment on post ${postId}`);
        setSubmittingComment(true);
      }
      
      // Apply masking if needed
      const finalContent = applyMasking ? maskSensitiveInfo(content) : content;
      
      const commentData = {
        content: finalContent.trim(),
        postId,
        parentId: parentId || undefined,
        skipSafetyCheck: false
      };
      
      console.log(`📤 Submitting ${isReply ? 'reply' : 'comment'} for post ${postId}:`, commentData);
      
      const response = await api.comments.createComment(commentData);
      
      console.log('✅ Comment created successfully:', response);
      
      if (response && response.id) {
        toast.success(isReply ? "Reply posted successfully!" : "Comment posted successfully!");
        
        // Add to masked comments set if masking was applied
        if (applyMasking && response && response.id) {
          setMaskedComments(prev => new Set([...prev, response.id]));
        }

        // Create a properly formatted comment object
        const newComment = {
          ...response,
          id: response.id,
          content: finalContent,
          postId: response.postId || postId,
          parentId: response.parentId || parentId || null,
          user: response.user || user,
          userId: response.userId || user?.id,
          createdAt: response.createdAt || new Date().toISOString(),
          updatedAt: response.updatedAt || new Date().toISOString(),
          replies: [],
          likes: 0,
          upvotes: 0,
          downvotes: 0,
          score: 0,
          isMasked: applyMasking,
        };
        
        // Update local state immediately
        if (isReply) {
          setPostComments(prev => {
            const updateCommentWithReply = (comments) => {
              return comments.map(comment => {
                if (comment.id === parentId) {
                  return {
                    ...comment,
                    replies: [newComment, ...comment.replies]
                  };
                }
                if (comment.replies && comment.replies.length > 0) {
                  return {
                    ...comment,
                    replies: updateCommentWithReply(comment.replies)
                  };
                }
                return comment;
              });
            };
            
            return updateCommentWithReply(prev);
          });
        } else {
          setPostComments(prev => [newComment, ...prev]);
          
          // Update comment count
          setReactions(prev => ({
            ...prev,
            comments: (prev.comments || 0) + 1
          }));
        }
        
        // Clear input if it's a main comment
        if (!isReply) {
          setCommentInput('');
          setInputDetection(null);
        }
      }
      
      return response;
    } catch (error) {
      console.error(`❌ Failed to submit ${parentId ? 'reply' : 'comment'} for post ${postId}:`, error);
      toast.error(`Failed to post ${parentId ? 'reply' : 'comment'}: ` + (error.message || "Unknown error"));
      
      // On error, refresh
      await loadComments(postId, 1, commentSort, false);
      
      throw error;
    } finally {
      if (!parentId) {
        setSubmittingComment(false);
      }
    }
  }, [user, api, commentSort, loadComments]);

  // Update a comment
  const updateComment = useCallback(async (commentId, content, postId, editReason = "Updated content") => {
    if (!user) {
      toast.error("Please login to update comments");
      return;
    }
    
    if (!content.trim()) {
      toast.error("Comment cannot be empty");
      return;
    }
    
    try {
      const updateData = {
        content: content.trim(),
        editReason: editReason
      };
      
      console.log(`✏️ Updating comment ${commentId}:`, updateData);
      
      await api.comments.updateComment(commentId, updateData);
      
      toast.success("Comment updated!");
      
      // Refresh comments
      if (postId) {
        await loadComments(postId, 1, commentSort, false);
      }
      
    } catch (error) {
      console.error(`❌ Failed to update comment ${commentId}:`, error);
      toast.error("Failed to update comment: " + (error.message || "Unknown error"));
    }
  }, [user, api, loadComments, commentSort]);

  // Delete a comment
  const deleteComment = useCallback(async (commentId, postId, hard = false) => {
    if (!user) {
      toast.error("Please login to delete comments");
      return;
    }
    
    try {
      console.log(`🗑️ Deleting comment ${commentId}, hard: ${hard}`);
      
      await api.comments.deleteComment(commentId, hard);
      
      toast.success("Comment deleted!");
      
      // Refresh comments
      if (postId) {
        await loadComments(postId, 1, commentSort, false);
        
        // Update comment count
        setReactions(prev => ({
          ...prev,
          comments: Math.max(0, (prev.comments || 0) - 1)
        }));
      }
      
    } catch (error) {
      console.error(`❌ Failed to delete comment ${commentId}:`, error);
      toast.error("Failed to delete comment: " + (error.message || "Unknown error"));
    }
  }, [user, api, loadComments, commentSort]);

  // Show delete confirmation modal
  const confirmDeleteComment = useCallback((commentId, postId) => {
    setDeleteCommentData({ commentId, postId });
    setShowDeleteCommentModal(true);
  }, []);

  // Handle delete confirmation
  const handleDeleteCommentConfirm = useCallback(async () => {
    if (deleteCommentData) {
      await deleteComment(deleteCommentData.commentId, deleteCommentData.postId, false);
      setShowDeleteCommentModal(false);
      setDeleteCommentData(null);
    }
  }, [deleteCommentData, deleteComment]);

  // Handle delete cancel
  const handleDeleteCommentCancel = useCallback(() => {
    setShowDeleteCommentModal(false);
    setDeleteCommentData(null);
  }, []);

  // Report a comment
  const reportComment = useCallback(async (commentId, reason, details) => {
    if (!user) {
      toast.error("Please login to report comments");
      return;
    }

    try {
      setSubmittingReport(true);
      console.log(`🚨 Reporting comment ${commentId}:`, { reason, details });
      
      const reportData = {
        reason,
        details: details || undefined
      };
      
      await api.comments.reportComment(commentId, reportData);
      
      toast.success("Comment reported successfully. Thank you for helping keep our community safe!");
      
      setShowReportModal(false);
      setReportCommentData(null);
      setReportReason('');
      setReportDetails('');
      
    } catch (error) {
      console.error(`❌ Failed to report comment ${commentId}:`, error);
      toast.error("Failed to report comment: " + (error.message || "Unknown error"));
    } finally {
      setSubmittingReport(false);
    }
  }, [user, api]);

  // Show report modal
  const confirmReportComment = useCallback((commentId, postId) => {
    setReportCommentData({ commentId, postId });
    setReportReason('');
    setReportDetails('');
    setShowReportModal(true);
  }, []);

  // Handle report submission
  const handleReportSubmit = useCallback(async () => {
    if (!reportReason) {
      toast.error("Please select a reason for reporting");
      return;
    }
    
    if (reportCommentData) {
      await reportComment(reportCommentData.commentId, reportReason, reportDetails);
    }
  }, [reportCommentData, reportReason, reportDetails, reportComment]);

  // Handle report cancel
  const handleReportCancel = useCallback(() => {
    setShowReportModal(false);
    setReportCommentData(null);
    setReportReason('');
    setReportDetails('');
  }, []);

  // Handle comment reactions with optimistic UI updates
  const handleCommentReaction = useCallback(async (commentId, postId, type, currentReaction) => {
    if (!user) {
      toast.error("Please login to react to comments");
      return;
    }

    const originalComments = postComments;
    const isRemoving = currentReaction === type;
    const apiType = type.toLowerCase();
    
    console.log(`👍 Action: ${isRemoving ? 'REMOVING' : 'ADDING'} ${type} reaction`);
    
    const updateReactionInTree = (comments, isAdding) => {
      return comments.map(comment => {
        if (comment.id === commentId) {
          const updatedComment = { ...comment };
          
          if (!isAdding && currentReaction) {
            if (currentReaction === 'LIKE') {
              updatedComment.likes = Math.max(0, (comment.likes || 0) - 1);
            } else if (currentReaction === 'UPVOTE') {
              updatedComment.upvotes = Math.max(0, (comment.upvotes || 0) - 1);
            } else if (currentReaction === 'DOWNVOTE') {
              updatedComment.downvotes = Math.max(0, (comment.downvotes || 0) - 1);
            }
            updatedComment.userReaction = null;
          } else if (isAdding) {
            if (type === 'LIKE') {
              updatedComment.likes = (comment.likes || 0) + 1;
            } else if (type === 'UPVOTE') {
              updatedComment.upvotes = (comment.upvotes || 0) + 1;
            } else if (type === 'DOWNVOTE') {
              updatedComment.downvotes = (comment.downvotes || 0) + 1;
            }
            updatedComment.userReaction = type;
          }
          
          updatedComment.score = (updatedComment.upvotes || 0) - (updatedComment.downvotes || 0);
          
          return updatedComment;
        }
        
        if (comment.replies && comment.replies.length > 0) {
          return {
            ...comment,
            replies: updateReactionInTree(comment.replies, isAdding)
          };
        }
        
        return comment;
      });
    };

    try {
      setPostComments(updateReactionInTree(postComments, !isRemoving));
      
      if (isRemoving) {
        console.log(`🗑️ Removing ${apiType} reaction from comment ${commentId}`);
        await api.comments.removeReaction(commentId, apiType);
        console.log(`✅ Reaction removed successfully`);
      } else {
        if (currentReaction && currentReaction !== type) {
          const currentApiType = currentReaction.toLowerCase();
          console.log(`🔄 Removing old ${currentApiType} reaction`);
          try {
            await api.comments.removeReaction(commentId, currentApiType);
          } catch (removeError) {
            console.warn(`⚠️ Failed to remove old reaction:`, removeError);
          }
        }
        
        console.log(`➕ Adding ${apiType} reaction to comment ${commentId}`);
        await api.comments.addReaction(commentId, apiType);
        console.log(`✅ Reaction added successfully`);
      }
      
    } catch (error) {
      console.error(`❌ Failed to toggle reaction on comment ${commentId}:`, error);
      setPostComments(originalComments);
      
      const errorMessage = error.message || error.toString();
      if (errorMessage.includes('already reacted')) {
        toast.error("You've already reacted with this type. Please try again.");
      } else if (errorMessage.includes('not found')) {
        toast.error("Reaction not found. It may have been already removed.");
      } else {
        toast.error("Failed to update reaction. Please try again.");
      }
    }
  }, [user, api, postComments]);

  // Render comment item component - FIXED: TRUE FACEBOOK-STYLE FLAT REPLIES
  const CommentItem = ({ comment, postId, isReply = false, showReplyTo = false, replyToUser = null }) => {
    const [showReplyForm, setShowReplyForm] = useState(false);
    const [replyText, setReplyText] = useState('');
    const [isReplying, setIsReplying] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(comment.content);
    const [showAllReplies, setShowAllReplies] = useState(true);
    
    const isOwner = comment.user?.id === user?.id;
    const hasReplies = comment.replies && comment.replies.length > 0;
    
    const canEdit = () => {
      if (!isOwner) return false;
      const commentTime = new Date(comment.createdAt);
      const now = new Date();
      const diffMinutes = (now - commentTime) / (1000 * 60);
      return diffMinutes <= 30;
    };
    
    const handleReply = async () => {
      if (!replyText.trim()) {
        toast.error("Reply cannot be empty");
        return;
      }
      
      setIsReplying(true);
      try {
        await submitCommentWithMaskingCheck(postId, replyText, comment.id);
        setReplyText('');
        setShowReplyForm(false);
        setShowAllReplies(true);
      } catch (error) {
        console.error('Failed to reply:', error);
      } finally {
        setIsReplying(false);
      }
    };
    
    const handleUpdate = async () => {
      await updateComment(comment.id, editText, postId, "Updated via UI");
      setIsEditing(false);
    };
    
    const handleDelete = async () => {
      confirmDeleteComment(comment.id, postId);
    };
    
    const startEditing = () => {
      setIsEditing(true);
      setEditText(comment.content);
    };
    
    const cancelEditing = () => {
      setIsEditing(false);
      setEditText(comment.content);
    };
    
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleUpdate();
      }
      if (e.key === 'Escape') {
        cancelEditing();
      }
    };
    
    const handleReplyKeyDown = (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        handleReply();
      }
      if (e.key === 'Escape') {
        setShowReplyForm(false);
        setReplyText('');
      }
    };
    
    return (
      <div className={`comment-item ${isReply ? 'reply-comment' : 'top-level-comment'}`}>
        
        {/* Main comment container */}
        <div className="d-flex mb-3">
          <div className="flex-shrink-0 me-3">
            <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center" 
                 style={{ 
                   width: '36px', 
                   height: '36px',
                   backgroundColor: isReply ? '#f3f4f6' : '#e5e7eb'
                 }}>
              <FaUserFriends size={14} className="text-primary" />
            </div>
          </div>
          <div className="flex-grow-1">
            {/* Comment header */}
            <div className="d-flex justify-content-between align-items-start mb-1">
              <div>
                {/* Privacy Protection Badge */}
                {(maskedComments.has(comment.id) || comment.isMasked) && (
                  <div className="mb-1">
                    <Badge 
                      bg="info" 
                      className="rounded-pill px-2 py-1 d-inline-flex align-items-center"
                      style={{ fontSize: '0.7rem' }}
                    >
                      <FaShieldAlt className="me-1" size={10} />
                      Privacy Protected
                    </Badge>
                  </div>
                )}
                
                <div className="d-flex align-items-center flex-wrap mb-1">
                  <strong className="d-block me-2" style={{ fontSize: '0.9rem' }}>
                    {comment.user?.displayName || comment.user?.username || 'Anonymous'}
                  </strong>
                  {showReplyTo && replyToUser && (
                    <span className="text-muted d-flex align-items-center" style={{ fontSize: '0.8rem' }}>
                      <FaReply size={8} className="me-1" />
                      to {replyToUser}
                    </span>
                  )}
                </div>
                
                <small className="text-muted d-block" style={{ fontSize: '0.8rem' }}>
                  {formatDate(comment.createdAt)}
                  {comment.updatedAt !== comment.createdAt && ' (edited)'}
                </small>
              </div>
              
              {!isEditing && (
                <Dropdown align="end">
                  <Dropdown.Toggle
                    as="button"
                    className="btn btn-link p-0 text-muted border-0 bg-transparent"
                    style={{ 
                      fontSize: '1rem',
                      lineHeight: '1',
                      width: '20px',
                      height: '20px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    <FaEllipsisV size={12} />
                  </Dropdown.Toggle>

                  <Dropdown.Menu className="shadow-sm">
                    {isOwner ? (
                      <>
                        <Dropdown.Item 
                          onClick={startEditing}
                          disabled={!canEdit()}
                          className="d-flex align-items-center py-2"
                        >
                          <FaEdit className="me-2 text-primary" size={12} />
                          <span>Edit Comment</span>
                          {!canEdit() && (
                            <small className="text-muted ms-2">(30 min expired)</small>
                          )}
                        </Dropdown.Item>
                        <Dropdown.Item 
                          onClick={() => confirmDeleteComment(comment.id, postId)}
                          className="d-flex align-items-center text-danger py-2"
                        >
                          <FaTrash className="me-2" size={12} />
                          <span>Delete Comment</span>
                        </Dropdown.Item>
                      </>
                    ) : (
                      <>
                        <Dropdown.Item 
                          onClick={() => confirmReportComment(comment.id, postId)}
                          className="d-flex align-items-center text-warning py-2"
                        >
                          <FaFlag className="me-2" size={12} />
                          <span>Report Comment</span>
                        </Dropdown.Item>
                      </>
                    )}
                  </Dropdown.Menu>
                </Dropdown>
              )}
            </div>
            
            {/* Comment content */}
            {isEditing ? (
              <div className="mb-2">
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="mb-2"
                  autoFocus
                  style={{ fontSize: '0.9rem' }}
                />
                <div className="d-flex justify-content-between align-items-center">
                  <small className="text-muted">
                    Press Ctrl+Enter to save, Esc to cancel
                  </small>
                  <div className="d-flex gap-2">
                    <Button 
                      variant="success" 
                      size="sm"
                      onClick={handleUpdate}
                      className="px-3 py-1"
                    >
                      <FaCheck className="me-1" size={10} />
                      Save
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={cancelEditing}
                      className="px-3 py-1"
                    >
                      <FaTimes className="me-1" size={10} />
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="mb-2" style={{ 
                whiteSpace: 'pre-wrap', 
                fontSize: '0.9rem',
                lineHeight: '1.4'
              }}>
                {comment.content}
              </p>
            )}
            
            {/* Reactions and actions */}
            {!isEditing && (
              <div className="d-flex gap-3 align-items-center mb-3">
                <button
                  className={`btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center ${
                    comment.userReaction === 'LIKE' ? 'active text-danger' : 'text-muted'
                  }`}
                  onClick={() => handleCommentReaction(comment.id, postId, 'LIKE', comment.userReaction)}
                  style={{
                    transition: 'all 0.2s ease',
                  }}
                >
                  <FaHeart 
                    size={12} 
                    className="me-1" 
                    style={{
                      fill: comment.userReaction === 'LIKE' ? '#dc3545' : 'currentColor'
                    }}
                  />
                  <span className="small">{comment.likes || 0}</span>
                </button>
                
                <button
                  className={`btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center ${
                    comment.userReaction === 'UPVOTE' ? 'active text-success' : 'text-muted'
                  }`}
                  onClick={() => handleCommentReaction(comment.id, postId, 'UPVOTE', comment.userReaction)}
                  style={{
                    transition: 'all 0.2s ease',
                  }}
                >
                  <FaThumbsUp 
                    size={12} 
                    className="me-1"
                    style={{
                      fill: comment.userReaction === 'UPVOTE' ? '#28a745' : 'currentColor'
                    }}
                  />
                  <span className="small">{comment.upvotes || 0}</span>
                </button>
                
                <button
                  className={`btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center ${
                    comment.userReaction === 'DOWNVOTE' ? 'active text-danger' : 'text-muted'
                  }`}
                  onClick={() => handleCommentReaction(comment.id, postId, 'DOWNVOTE', comment.userReaction)}
                  style={{
                    transition: 'all 0.2s ease',
                  }}
                >
                  <FaThumbsDown 
                    size={12} 
                    className="me-1"
                    style={{
                      fill: comment.userReaction === 'DOWNVOTE' ? '#dc3545' : 'currentColor'
                    }}
                  />
                  <span className="small">{comment.downvotes || 0}</span>
                </button>
                
                <button
                  className="btn btn-sm btn-link text-decoration-none p-0 text-muted d-flex align-items-center"
                  onClick={() => setShowReplyForm(!showReplyForm)}
                  style={{ transition: 'all 0.2s ease' }}
                >
                  <FaReply size={12} className="me-1" />
                  <span className="small">Reply</span>
                </button>
              </div>
            )}
            
            {/* Reply form - Always show directly below the comment */}
            {showReplyForm && (
              <div className="mb-3">
                <div className="d-flex align-items-start">
                  <div className="flex-shrink-0 me-2">
                    <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center" 
                         style={{ width: '32px', height: '32px' }}>
                      <FaUserFriends size={12} className="text-primary" />
                    </div>
                  </div>
                  <Form.Group className="flex-grow-1">
                    <Form.Control
                      as="textarea"
                      rows={2}
                      placeholder={`Reply to ${comment.user?.displayName || comment.user?.username || 'this comment'}...`}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={handleReplyKeyDown}
                      className="mb-2"
                      style={{ fontSize: '0.875rem' }}
                      autoFocus
                    />
                    <div className="d-flex justify-content-between align-items-center">
                      <small className="text-muted">
                        Press Ctrl+Enter to post, Esc to cancel
                      </small>
                      <div className="d-flex gap-2">
                        <Button 
                          variant="primary" 
                          size="sm"
                          onClick={handleReply}
                          disabled={isReplying || !replyText.trim()}
                          className="px-3 py-1"
                        >
                          {isReplying ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              Posting...
                            </>
                          ) : (
                            'Reply'
                          )}
                        </Button>
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={() => {
                            setShowReplyForm(false);
                            setReplyText('');
                          }}
                          className="px-3 py-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Form.Group>
                </div>
              </div>
            )}
            
            {/* Show/Hide replies button - Only for top-level comments */}
            {!isReply && hasReplies && (
              <div className="mb-3">
                <button
                  className="btn btn-outline-secondary btn-sm d-flex align-items-center"
                  onClick={() => setShowAllReplies(!showAllReplies)}
                  style={{ fontSize: '0.8rem', borderRadius: '20px' }}
                >
                  {showAllReplies ? (
                    <>
                      <FaChevronUp size={10} className="me-1" />
                      Hide {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                    </>
                  ) : (
                    <>
                      <FaChevronDown size={10} className="me-1" />
                      Show {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                    </>
                  )}
                </button>
              </div>
            )}
            
            {/* Replies - Render directly in same thread without additional indentation */}
            {hasReplies && showAllReplies && (
              <div className="replies-container mt-3">
                {comment.replies.map(reply => (
                  <div key={reply.id} className="reply-item mb-3">
                    <div className="d-flex">
                      <div className="flex-shrink-0 me-3">
                        <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center" 
                             style={{ 
                               width: '32px', 
                               height: '32px',
                               backgroundColor: '#f3f4f6'
                             }}>
                          <FaUserFriends size={12} className="text-primary" />
                        </div>
                      </div>
                      <div className="flex-grow-1">
                        {/* Reply header */}
                        <div className="d-flex justify-content-between align-items-start mb-1">
                          <div>
                            {/* Privacy Protection Badge for reply */}
                            {(maskedComments.has(reply.id) || reply.isMasked) && (
                              <div className="mb-1">
                                <Badge 
                                  bg="info" 
                                  className="rounded-pill px-2 py-1 d-inline-flex align-items-center"
                                  style={{ fontSize: '0.7rem' }}
                                >
                                  <FaShieldAlt className="me-1" size={10} />
                                  Privacy Protected
                                </Badge>
                              </div>
                            )}
                            
                            <div className="d-flex align-items-center flex-wrap mb-1">
                              <strong className="d-block me-2" style={{ fontSize: '0.9rem' }}>
                                {reply.user?.displayName || reply.user?.username || 'Anonymous'}
                              </strong>
                              <span className="text-muted d-flex align-items-center" style={{ fontSize: '0.8rem' }}>
                                <FaReply size={8} className="me-1" />
                                to {comment.user?.displayName || comment.user?.username || 'user'}
                              </span>
                            </div>
                            
                            <small className="text-muted d-block" style={{ fontSize: '0.8rem' }}>
                              {formatDate(reply.createdAt)}
                              {reply.updatedAt !== reply.createdAt && ' (edited)'}
                            </small>
                          </div>
                          
                          <Dropdown align="end">
                            <Dropdown.Toggle
                              as="button"
                              className="btn btn-link p-0 text-muted border-0 bg-transparent"
                              style={{ 
                                fontSize: '1rem',
                                lineHeight: '1',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              <FaEllipsisV size={12} />
                            </Dropdown.Toggle>

                            <Dropdown.Menu className="shadow-sm">
                              {reply.user?.id === user?.id ? (
                                <>
                                  <Dropdown.Item 
                                    onClick={() => {
                                      setIsEditing(false);
                                      setEditText(reply.content);
                                    }}
                                    disabled={!canEdit()}
                                    className="d-flex align-items-center py-2"
                                  >
                                    <FaEdit className="me-2 text-primary" size={12} />
                                    <span>Edit Reply</span>
                                  </Dropdown.Item>
                                  <Dropdown.Item 
                                    onClick={() => confirmDeleteComment(reply.id, postId)}
                                    className="d-flex align-items-center text-danger py-2"
                                  >
                                    <FaTrash className="me-2" size={12} />
                                    <span>Delete Reply</span>
                                  </Dropdown.Item>
                                </>
                              ) : (
                                <Dropdown.Item 
                                  onClick={() => confirmReportComment(reply.id, postId)}
                                  className="d-flex align-items-center text-warning py-2"
                                >
                                  <FaFlag className="me-2" size={12} />
                                  <span>Report Reply</span>
                                </Dropdown.Item>
                              )}
                            </Dropdown.Menu>
                          </Dropdown>
                        </div>
                        
                        {/* Reply content */}
                        <p className="mb-2" style={{ 
                          whiteSpace: 'pre-wrap', 
                          fontSize: '0.9rem',
                          lineHeight: '1.4'
                        }}>
                          {reply.content}
                        </p>
                        
                        {/* Reply reactions and actions */}
                        <div className="d-flex gap-3 align-items-center">
                          <button
                            className={`btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center ${
                              reply.userReaction === 'LIKE' ? 'active text-danger' : 'text-muted'
                            }`}
                            onClick={() => handleCommentReaction(reply.id, postId, 'LIKE', reply.userReaction)}
                            style={{ transition: 'all 0.2s ease' }}
                          >
                            <FaHeart 
                              size={12} 
                              className="me-1" 
                              style={{
                                fill: reply.userReaction === 'LIKE' ? '#dc3545' : 'currentColor'
                              }}
                            />
                            <span className="small">{reply.likes || 0}</span>
                          </button>
                          
                          <button
                            className={`btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center ${
                              reply.userReaction === 'UPVOTE' ? 'active text-success' : 'text-muted'
                            }`}
                            onClick={() => handleCommentReaction(reply.id, postId, 'UPVOTE', reply.userReaction)}
                            style={{ transition: 'all 0.2s ease' }}
                          >
                            <FaThumbsUp 
                              size={12} 
                              className="me-1"
                              style={{
                                fill: reply.userReaction === 'UPVOTE' ? '#28a745' : 'currentColor'
                              }}
                            />
                            <span className="small">{reply.upvotes || 0}</span>
                          </button>
                          
                          <button
                            className={`btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center ${
                              reply.userReaction === 'DOWNVOTE' ? 'active text-danger' : 'text-muted'
                            }`}
                            onClick={() => handleCommentReaction(reply.id, postId, 'DOWNVOTE', reply.userReaction)}
                            style={{ transition: 'all 0.2s ease' }}
                          >
                            <FaThumbsDown 
                              size={12} 
                              className="me-1"
                              style={{
                                fill: reply.userReaction === 'DOWNVOTE' ? '#dc3545' : 'currentColor'
                              }}
                            />
                            <span className="small">{reply.downvotes || 0}</span>
                          </button>
                          
                          <button
                            className="btn btn-sm btn-link text-decoration-none p-0 text-muted d-flex align-items-center"
                            onClick={() => {
                              setShowReplyForm(false);
                              setReplyText(`@${reply.user?.displayName || reply.user?.username || 'user'} `);
                              setShowReplyForm(true);
                            }}
                            style={{ transition: 'all 0.2s ease' }}
                          >
                            <FaReply size={12} className="me-1" />
                            <span className="small">Reply</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Count total comments including replies
  const countTotalComments = (commentList) => {
    let total = 0;
    const countReplies = (comment) => {
      total += 1;
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.forEach(countReplies);
      }
    };
    commentList.forEach(countReplies);
    return total;
  };

  const maskPII = (text) => {
    if (!text) return ""
    if (text.includes("@")) {
      const [username, domain] = text.split("@")
      if (username.length <= 2) return text
      const firstChar = username.charAt(0)
      const lastChar = username.charAt(username.length - 1)
      const maskedMiddle = "*".repeat(username.length - 2)
      return `${firstChar}${maskedMiddle}${lastChar}@${domain}`
    }
    if (text.replace(/\D/g, "").length >= 10) {
      const digits = text.replace(/\D/g, "")
      return `+${digits.slice(0, -4).replace(/\d/g, "*")}${digits.slice(-4)}`
    }
    return text
  }

  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "PUBLISHED":
        return { variant: "success", icon: FaCheckCircle, label: "Published" }
      case "UNDER_REVIEW":
        return { variant: "warning", icon: FaClock, label: "Under Review" }
      case "REJECTED":
        return { variant: "danger", icon: FaTimesCircle, label: "Rejected" }
      case "DELETED":
        return { variant: "secondary", icon: FaTimesCircle, label: "Deleted" }
      default:
        return { variant: "secondary", icon: FaClock, label: "Unknown" }
    }
  }

  const getPostTypeIcon = (type, badgeColor) => {
    switch (type) {
      case "SCAM_REPORT":
        return { icon: FaExclamationTriangle, color: badgeColor || "#dc3545", label: "Scam Report" }
      case "SCAM_AWARENESS":
        return { icon: FaShieldAlt, color: badgeColor || "#f59e0b", label: "Scam Awareness" }
      case "QUESTION":
        return { icon: FaQuestionCircle, color: badgeColor || "#3b82f6", label: "Question" }
      default:
        return { icon: FaExclamationTriangle, color: "#6c757d", label: "Post" }
    }
  }

  const getEvidenceIcon = (type) => {
    switch (type) {
      case "IMAGE": return <FaImages className="text-primary" />
      case "VIDEO": return <FaVideo className="text-danger" />
      case "PDF": return <FaFilePdf className="text-warning" />
      case "WEBSITE": return <FaLink className="text-info" />
      case "PHONE_NUMBER": return <FaPhone className="text-success" />
      case "EMAIL_ADDRESS": return <FaEnvelope className="text-secondary" />
      default: return <FaImages className="text-primary" />
    }
  }

  const getEvidenceLabel = (type) => {
    switch (type) {
      case "IMAGE": return "Image"
      case "VIDEO": return "Video"
      case "PDF": return "PDF Document"
      case "WEBSITE": return "Website"
      case "PHONE_NUMBER": return "Phone Number"
      case "EMAIL_ADDRESS": return "Email Address"
      default: return type
    }
  }

  const canEditPost = (post) => {
    if (!post || !user) return false
    
    if (post.status === "DELETED") return false
    
    const now = new Date()
    const editableUntil = post.editableUntil ? new Date(post.editableUntil) : null
    
    if (!editableUntil || now > editableUntil) {
      return false
    }
    
    if (post.userId === user.id) {
      return true
    }
    
    if (post.isCompanyPost && post.companyStaff) {
      const allowedPostTypes = ['SCAM_AWARENESS', 'QUESTION']
      
      if (post.postType === 'SCAM_REPORT') {
        return true
      }
      
      return allowedPostTypes.includes(post.postType)
    }
    
    return false
  }

  const canDeletePost = (post) => {
    if (!post || !user) return false
    
    if (post.status === "DELETED") return false
    
    if (post.userId === user.id) {
      return true
    }
    
    if (post.isCompanyPost && post.companyStaff) {
      const allowedPostTypes = ['SCAM_AWARENESS', 'QUESTION']
      
      if (post.postType === 'SCAM_REPORT') {
        return true
      }
      
      return allowedPostTypes.includes(post.postType)
    }
    
    return false
  }

  const handleToggleReaction = async () => {
    if (!user) {
      toast.error("Please login to like posts")
      return
    }
    
    try {
      await api.posts.toggleReaction(id)
      setReactions(prev => ({
        ...prev,
        liked: !prev.liked,
        likes: prev.liked ? prev.likes - 1 : prev.likes + 1
      }))
    } catch (error) {
      console.error("Failed to toggle reaction:", error)
      toast.error("Failed to update reaction")
    }
  }

  const handleToggleBookmark = async () => {
    if (!user) {
      toast.error("Please login to bookmark posts")
      return
    }
    
    try {
      await api.posts.toggleBookmark(id)
      setReactions(prev => ({
        ...prev,
        bookmarked: !prev.bookmarked
      }))
    } catch (error) {
      console.error("Failed to toggle bookmark:", error)
      toast.error("Failed to update bookmark")
    }
  }

  const handleEdit = () => {
    if (!canEditPost(post)) {
      if (post.status === "DELETED") {
        toast.error("Deleted posts cannot be edited")
      } else if (post.editableUntil && new Date() > new Date(post.editableUntil)) {
        toast.error("Edit window has expired (30 minutes after creation)")
      } else {
        toast.error("You don't have permission to edit this post")
      }
      return
    }
    
    router.push(`/dashboard/posts/edit/${id}`)
  }

  const handleDelete = async () => {
    if (!canDeletePost(post)) {
      if (post.status === "DELETED") {
        toast.error("This post has already been deleted")
      } else {
        toast.error("You don't have permission to delete this post")
      }
      return
    }

    setDeleting(true)
    try {
      await api.posts.deletePost(id)
      toast.success("Post deleted successfully!")
      router.push("/dashboard/posts")
    } catch (error) {
      console.error("Delete error:", error)
      toast.error(error.message || "Failed to delete post")
    } finally {
      setDeleting(false)
      setShowDeleteModal(false)
    }
  }

  const totalComments = countTotalComments(postComments);

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <Spinner animation="border" variant="primary" style={{ width: "3rem", height: "3rem" }} />
              <p className="mt-4 text-muted fw-medium">Loading post details...</p>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    )
  }

  if (error || !post) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8}>
              <Alert variant="danger" className="rounded-4 border-0 shadow-sm">
                <FaExclamationTriangle className="me-2" />
                {error || "Post not found"}
              </Alert>
              <Button variant="primary" className="rounded-pill px-4" onClick={() => router.push("/dashboard/posts")}>
                Back to My Posts
              </Button>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    )
  }

  const statusBadge = getStatusBadge(post.status)
  const StatusIcon = statusBadge.icon
  
  const primaryBadge = post.badges && post.badges.length > 0 ? post.badges[0] : null
  const badgeColor = primaryBadge ? primaryBadge.color : null
  const postTypeIcon = getPostTypeIcon(post.postType, badgeColor)
  const PostTypeIcon = postTypeIcon.icon

  const editable = canEditPost(post)
  const deletable = canDeletePost(post)
  const editableUntil = post.editableUntil ? new Date(post.editableUntil) : null
  const now = new Date()
  const canEdit = editable && editableUntil && now < editableUntil

  const evidence = post.evidences || []

  return (
    <DashboardLayout>
      <Container fluid className="py-4" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
        <div className="mb-4">
          <Button
            variant="outline-secondary"
            onClick={() => router.push("/dashboard/posts")}
            className="mb-3 d-flex align-items-center gap-2 px-4 py-2 rounded-pill"
            style={{ 
              background: '#ffffff',
              borderColor: '#e9ecef'
            }}
          >
            <FaArrowLeft />
            <span>Back to My Posts</span>
          </Button>
          
          {post.status === "UNDER_REVIEW" && (
            <Alert variant="light" className="border rounded-pill mb-3">
              <FaClock className="me-2" />
              This post is under review. You can edit it within 30 minutes of creation.
            </Alert>
          )}
          
          {editableUntil && now < editableUntil && !canEdit && (
            <Alert variant="light" className="border rounded-pill mb-3">
              <FaClock className="me-2" />
              Edit window available until: {formatDate(post.editableUntil)} (You don't have edit permission)
            </Alert>
          )}
          
          {timeLeft && timeLeft !== "Expired" && canEdit && (
            <Alert variant="light" className="border rounded-pill mb-3">
              <FaClock className="me-2" />
              Edit window closes in: {timeLeft}
            </Alert>
          )}
        </div>

        <Row className="justify-content-center">
          <Col xl={10} lg={12}>
            <div className="text-center mb-4">
              <h1 className="fw-bold mb-2" style={{ color: '#2d3748' }}>Post Details</h1>
              <p className="text-muted mb-0" style={{ fontSize: '1.1rem' }}>
                View and manage your post information
              </p>
            </div>

            <Card className="border-0 shadow-lg rounded-4 mb-4">
              <Card.Body className="p-4 p-md-5">
                {/* Post Header */}
                <div className="mb-4 pb-4 border-bottom">
                  <div className="d-flex align-items-start gap-3">
                    <div 
                      className="p-3 rounded-3"
                      style={{ 
                        background: `rgba(${postTypeIcon.color === '#dc3545' ? '220, 53, 69' : postTypeIcon.color === '#f59e0b' ? '245, 158, 11' : '59, 130, 246'}, 0.1)`,
                        border: `2px solid ${postTypeIcon.color}`
                      }}
                    >
                      <PostTypeIcon size={24} style={{ color: postTypeIcon.color }} />
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <h2 className="fw-bold mb-0" style={{ color: '#2d3748' }}>
                          {post.title}
                        </h2>
                        <Badge bg={statusBadge.variant} className="py-2 px-3 rounded-pill">
                          <StatusIcon className="me-1" />
                          {statusBadge.label}
                        </Badge>
                      </div>
                      <div className="d-flex align-items-center flex-wrap gap-2">
                        <Badge bg="light" text="dark" className="py-1 px-2 rounded-pill">
                          <FaUser className="me-1" size={12} />
                          <small>{post.user?.displayName || "Anonymous User"}</small>
                        </Badge>
                        <Badge bg="light" text="dark" className="py-1 px-2 rounded-pill">
                          <FaCalendar className="me-1" size={12} />
                          <small>{formatDate(post.createdAt)}</small>
                        </Badge>
                        {post.isCompanyPost && (
                          <Badge bg="info" className="py-1 px-2 rounded-pill">
                            <FaBuilding className="me-1" size={12} />
                            <small>Company Post</small>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Badges */}
                {post.badges && post.badges.length > 0 && (
                  <div className="mb-4">
                    <div className="d-flex flex-wrap gap-2">
                      {post.badges.map((badge) => (
                        <Badge 
                          key={badge.id}
                          className="py-2 px-3 rounded-pill"
                          style={{ 
                            backgroundColor: badge.color || '#e9ecef',
                            color: '#fcfcfcff'
                          }}
                        >
                          {badge.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="mb-4">
                  <h5 className="fw-medium mb-3" style={{ color: '#4a5568' }}>
                    Description
                  </h5>
                  <div className="p-4 rounded-3" style={{ background: '#f8f9fa', border: '1px solid #e9ecef' }}>
                    <p className="mb-0" style={{ lineHeight: '1.7', color: '#4a5568' }}>
                      {post.description}
                    </p>
                  </div>
                </div>

                {/* Post Details - Collapsible */}
                {(post.scamType || post.lostAmount || post.country || post.incidentDate) && (
                  <div className="mb-4">
                    <Button
                      variant="link"
                      className="text-decoration-none p-0 mb-3 d-flex align-items-center"
                      onClick={() => setExpandedSections({ ...expandedSections, details: !expandedSections.details })}
                      style={{ color: '#4a5568' }}
                    >
                      <h5 className="fw-medium mb-0 me-2">Post Details</h5>
                      {expandedSections.details ? <FaChevronUp /> : <FaChevronDown />}
                    </Button>

                    <Collapse in={expandedSections.details}>
                      <div>
                        <Row className="g-3">
                          {post.scamType && (
                            <Col md={6}>
                              <Card className="border">
                                <Card.Body className="p-3">
                                  <div className="d-flex align-items-center mb-2">
                                    <div className="p-2 rounded-3 me-3" style={{ background: 'rgba(220, 53, 69, 0.1)' }}>
                                      <FaExclamationTriangle className="text-danger" />
                                    </div>
                                    <div>
                                      <h6 className="fw-medium mb-0" style={{ color: '#4a5568' }}>Scam Type</h6>
                                      <p className="mb-0 fw-medium" style={{ color: '#2d3748' }}>
                                        {post.scamType.name}
                                      </p>
                                    </div>
                                  </div>
                                </Card.Body>
                              </Card>
                            </Col>
                          )}

                          {post.lostAmount && (
                            <Col md={6}>
                              <Card className="border">
                                <Card.Body className="p-3">
                                  <div className="d-flex align-items-center mb-2">
                                    <div className="p-2 rounded-3 me-3" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                                      <FaMoneyBillWave className="text-success" />
                                    </div>
                                    <div>
                                      <h6 className="fw-medium mb-0" style={{ color: '#4a5568' }}>Financial Loss</h6>
                                      <p className="mb-0 fw-medium" style={{ color: '#2d3748' }}>
                                        ${Number.parseFloat(post.lostAmount).toLocaleString()} {post.currency}
                                      </p>
                                    </div>
                                  </div>
                                </Card.Body>
                              </Card>
                            </Col>
                          )}

                          {post.country && (
                            <Col md={6}>
                              <Card className="border">
                                <Card.Body className="p-3">
                                  <div className="d-flex align-items-center mb-2">
                                    <div className="p-2 rounded-3 me-3" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                                      <FaMapMarkerAlt className="text-primary" />
                                    </div>
                                    <div>
                                      <h6 className="fw-medium mb-0" style={{ color: '#4a5568' }}>Location</h6>
                                      <p className="mb-0 fw-medium" style={{ color: '#2d3748' }}>
                                        {[post.city, post.region, post.country].filter(Boolean).join(", ")}
                                      </p>
                                    </div>
                                  </div>
                                </Card.Body>
                              </Card>
                            </Col>
                          )}

                          {post.incidentDate && (
                            <Col md={6}>
                              <Card className="border">
                                <Card.Body className="p-3">
                                  <div className="d-flex align-items-center mb-2">
                                    <div className="p-2 rounded-3 me-3" style={{ background: 'rgba(156, 163, 175, 0.1)' }}>
                                      <FaCalendar className="text-secondary" />
                                    </div>
                                    <div>
                                      <h6 className="fw-medium mb-0" style={{ color: '#4a5568' }}>Incident Date</h6>
                                      <p className="mb-0 fw-medium" style={{ color: '#2d3748' }}>
                                        {formatDate(post.incidentDate)}
                                      </p>
                                    </div>
                                  </div>
                                </Card.Body>
                              </Card>
                            </Col>
                          )}
                        </Row>
                      </div>
                    </Collapse>
                  </div>
                )}

                {/* Evidence Section */}
                {evidence.length > 0 && (
                  <div className="mb-4">
                    <Button
                      variant="link"
                      className="text-decoration-none p-0 mb-3 d-flex align-items-center"
                      onClick={() => setExpandedSections({ ...expandedSections, media: !expandedSections.media })}
                      style={{ color: '#4a5568' }}
                    >
                      <h5 className="fw-medium mb-0 me-2">
                        <FaImages className="me-2" />
                        Evidence ({evidence.length})
                      </h5>
                      {expandedSections.media ? <FaChevronUp /> : <FaChevronDown />}
                    </Button>

                    <Collapse in={expandedSections.media}>
                      <div>
                        <Row className="g-2">
                          {evidence.map((item) => (
                            <div key={item.id} className="col-12">
                              <Card className="border">
                                <Card.Body className="py-2 px-3 d-flex align-items-center justify-content-between">
                                  <div className="d-flex align-items-center">
                                    <div className="me-3">
                                      {getEvidenceIcon(item.evidenceType)}
                                    </div>
                                    <div>
                                      <h6 className="mb-0">{getEvidenceLabel(item.evidenceType)}</h6>
                                      {(item.evidenceType === "PHONE_NUMBER" || item.evidenceType === "EMAIL_ADDRESS") && (
                                        <small className="text-muted">
                                          {showPii ? item.phoneNumber || item.emailAddress : (item.maskedContent || maskPII(item.phoneNumber || item.emailAddress))}
                                        </small>
                                      )}
                                      {item.evidenceType === "WEBSITE" && (
                                        <small className="text-muted">{item.websiteUrl}</small>
                                      )}
                                      {item.fileName && (
                                        <small className="text-muted">{item.fileName}</small>
                                      )}
                                    </div>
                                  </div>
                                </Card.Body>
                              </Card>
                            </div>
                          ))}
                        </Row>
                      </div>
                    </Collapse>
                    
                    {(evidence.some(e => e.evidenceType === "PHONE_NUMBER" || e.evidenceType === "EMAIL_ADDRESS")) && (
                      <div className="mt-3">
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => setShowPii(!showPii)}
                          className="rounded-pill"
                        >
                          {showPii ? <FaEyeSlash className="me-1" /> : <FaEye className="me-1" />}
                          {showPii ? "Hide PII" : "Show PII"}
                        </Button>
                        <small className="text-muted ms-2">
                          Toggle to view/hide personal information
                        </small>
                      </div>
                    )}
                  </div>
                )}

                {/* Reaction Stats */}
                <div className="mb-4">
                  <div className="d-flex align-items-center gap-2 flex-wrap">
                    <Button
                      variant={reactions.liked ? "primary" : "outline-primary"}
                      onClick={handleToggleReaction}
                      className="rounded-pill px-3"
                      size="sm"
                    >
                      <FaThumbsUp className="me-2" />
                      {reactions.liked ? "Liked" : "Like"} ({reactions.likes})
                    </Button>
                    
                    <Button
                      variant={reactions.bookmarked ? "warning" : "outline-warning"}
                      onClick={handleToggleBookmark}
                      className="rounded-pill px-3"
                      size="sm"
                    >
                      <FaBookmark className="me-2" />
                      {reactions.bookmarked ? "Bookmarked" : "Bookmark"}
                    </Button>
                    
                    <Button
                      variant="outline-secondary"
                      className="rounded-pill px-3"
                      onClick={() => setExpandedComments(!expandedComments)}
                      size="sm"
                    >
                      <FaComment className="me-2" />
                      Comments ({totalComments})
                    </Button>
                    
                    <Button
                      variant="outline-secondary"
                      className="rounded-pill px-3"
                      size="sm"
                    >
                      <FaShareAlt className="me-2" />
                      Share
                    </Button>
                  </div>
                </div>

                {/* Comments Section with Sorting */}
                {expandedComments && (
                  <div className="comments-section border-top pt-4">
                    <div className="mb-4">
                      {/* Comments Header with Sorting */}
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-medium mb-0">
                          <FaComment className="me-2" />
                          Comments ({totalComments})
                        </h5>
                        
                        {/* Sorting Dropdown */}
                        <Dropdown className="me-2">
                          <Dropdown.Toggle
                            variant="light"
                            size="sm"
                            className="d-flex align-items-center rounded-pill px-3"
                          >
                            <FaSort className="me-2" size={12} />
                            Sort: {commentSort === "top" ? "Top" : 
                                  commentSort === "newest" ? "Newest" : 
                                  commentSort === "oldest" ? "Oldest" : "Top"}
                          </Dropdown.Toggle>
                          
                          <Dropdown.Menu>
                            <Dropdown.Item 
                              onClick={() => handleCommentSortChange("top")}
                              active={commentSort === "top"}
                            >
                              Top Comments
                            </Dropdown.Item>
                            <Dropdown.Item 
                              onClick={() => handleCommentSortChange("newest")}
                              active={commentSort === "newest"}
                            >
                              Newest First
                            </Dropdown.Item>
                            <Dropdown.Item 
                              onClick={() => handleCommentSortChange("oldest")}
                              active={commentSort === "oldest"}
                            >
                              Oldest First
                            </Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
                      </div>
                      
                      {loadingComments ? (
                        <div className="text-center py-4">
                          <Spinner animation="border" variant="primary" />
                          <p className="text-muted mt-2 small">Loading comments...</p>
                        </div>
                      ) : (
                        <>
                          {/* Comment input form */}
                          <div className="comment-form mb-4">
                            <div className="d-flex align-items-start mb-2">
                              <div className="flex-shrink-0 me-3">
                                <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center" 
                                     style={{ width: '40px', height: '40px' }}>
                                  <FaUserFriends size={16} className="text-primary" />
                                </div>
                              </div>
                              <Form.Group className="flex-grow-1">
                                <Form.Control
                                  as="textarea"
                                  rows={3}
                                  placeholder="Write a comment..."
                                  value={commentInput}
                                  onChange={(e) => handleCommentInputChange(e.target.value)}
                                  className="rounded-3"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.ctrlKey) {
                                      e.preventDefault();
                                      submitCommentWithMaskingCheck(id, commentInput);
                                    }
                                  }}
                                />
                                
                                {/* Sensitive content detection alert */}
                                {inputDetection && inputDetection.hasDetection && (
                                  <Alert variant="warning" className="mt-2 mb-0 py-2 px-3">
                                    <div className="d-flex align-items-center">
                                      <FaShieldAlt className="me-2" />
                                      <small>
                                        <strong>Sensitive information detected.</strong> 
                                        {' '}It will be masked to protect your privacy when you post.
                                      </small>
                                    </div>
                                  </Alert>
                                )}
                                
                                <div className="d-flex justify-content-between align-items-center mt-2">
                                  <small className="text-muted">
                                    Press Ctrl+Enter to post
                                    {inputDetection && inputDetection.hasDetection && (
                                      <span className="ms-2 text-warning">
                                        <FaInfoCircleIcon className="me-1" />
                                        Masking will be applied
                                      </span>
                                    )}
                                  </small>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => submitCommentWithMaskingCheck(id, commentInput)}
                                    disabled={submittingComment || !commentInput.trim()}
                                    className="rounded-pill px-4"
                                  >
                                    {submittingComment ? (
                                      <>
                                        <Spinner animation="border" size="sm" className="me-2" />
                                        Posting...
                                      </>
                                    ) : (
                                      'Post Comment'
                                    )}
                                  </Button>
                                </div>
                              </Form.Group>
                            </div>
                          </div>
                          
                          {/* Comments list */}
                          <div className="comments-list">
                            {postComments.length === 0 ? (
                              <div className="text-center py-5">
                                <FaComment className="text-muted mb-3" size={40} />
                                <p className="text-muted mb-2">No comments yet</p>
                                <p className="text-muted small mb-0">Be the first to comment!</p>
                              </div>
                            ) : (
                              <>
                                <div className="mb-3">
                                  <small className="text-muted">
                                    Showing {totalComments} {totalComments === 1 ? 'comment' : 'comments'}
                                    {commentSort === "top" && " (sorted by popularity)"}
                                    {commentSort === "newest" && " (sorted by newest first)"}
                                    {commentSort === "oldest" && " (sorted by oldest first)"}
                                  </small>
                                </div>
                                {postComments.map(comment => (
                                  <CommentItem
                                    key={comment.id}
                                    comment={comment}
                                    postId={id}
                                  />
                                ))}
                                
                                {/* Load More Comments Button */}
                                {commentHasMore && (
                                  <div className="text-center mt-4 mb-4">
                                    <Button 
                                      variant="outline-primary" 
                                      size="sm"
                                      className="rounded-pill px-4 py-2"
                                      onClick={loadMoreComments}
                                      disabled={loadingMoreComments}
                                    >
                                      {loadingMoreComments ? (
                                        <>
                                          <Spinner animation="border" size="sm" className="me-2" />
                                          Loading more comments...
                                        </>
                                      ) : (
                                        <>
                                          Load More Comments
                                          <FaChevronRight className="ms-2" />
                                        </>
                                      )}
                                    </Button>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {(canEdit || deletable) && (
                  <div className="d-flex gap-2 pt-4 border-top">
                    {canEdit && (
                      <Button
                        variant="warning"
                        onClick={handleEdit}
                        className="rounded-pill px-4"
                      >
                        <FaEdit className="me-2" />
                        Edit Post
                      </Button>
                    )}
                    
                    {deletable && (
                      <Button
                        variant="danger"
                        onClick={() => setShowDeleteModal(true)}
                        disabled={deleting}
                        className="rounded-pill px-4"
                      >
                        {deleting ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <FaTrash className="me-2" />
                            Delete
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Delete Post Confirmation Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <div className="text-center py-3">
              <div className="mb-3">
                <FaTrash className="text-danger" style={{ fontSize: "3rem", opacity: 0.8 }} />
              </div>
              <p className="mb-0">Are you sure you want to delete this post?</p>
              <p className="text-muted small mb-0 mt-2">
                This action cannot be undone. The post will be removed from the newsfeed.
              </p>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="light" onClick={() => setShowDeleteModal(false)} className="px-4 rounded-pill">
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 rounded-pill"
            >
              {deleting ? "Deleting..." : "Delete Post"}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Delete Comment Confirmation Modal */}
        <Modal show={showDeleteCommentModal} onHide={handleDeleteCommentCancel} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              <FaExclamationTriangle className="text-warning me-2" />
              Delete Comment
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="mb-0">Are you sure you want to delete this comment?</p>
            <p className="text-muted small mt-2 mb-0">This action cannot be undone.</p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleDeleteCommentCancel}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteCommentConfirm}>
              <FaTrash className="me-2" />
              Delete Comment
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Report Comment Modal */}
        <Modal show={showReportModal} onHide={handleReportCancel} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              <FaFlag className="text-warning me-2" />
              Report Comment
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p className="mb-3">Help us understand what's wrong with this comment.</p>
            
            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Reason for reporting *</Form.Label>
              <Form.Select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                required
              >
                <option value="">Select a reason...</option>
                <option value="spam">Spam or misleading</option>
                <option value="harassment">Harassment or bullying</option>
                <option value="hate_speech">Hate speech or discrimination</option>
                <option value="violence">Violence or threats</option>
                <option value="misinformation">Misinformation</option>
                <option value="inappropriate">Inappropriate content</option>
                <option value="other">Other</option>
              </Form.Select>
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className="fw-bold">Additional details (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Provide any additional context that might help us review this report..."
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
              />
            </Form.Group>

            <Alert variant="info" className="mb-0">
              <small>
                <FaExclamationTriangle className="me-2" />
                Reports are reviewed by our moderation team. False reports may result in account restrictions.
              </small>
            </Alert>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleReportCancel} disabled={submittingReport}>
              Cancel
            </Button>
            <Button 
              variant="warning" 
              onClick={handleReportSubmit}
              disabled={!reportReason || submittingReport}
            >
              {submittingReport ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <FaFlag className="me-2" />
                  Submit Report
                </>
              )}
            </Button>
          </Modal.Footer>
        </Modal>

        {/* Sensitive Content Warning Modal */}
        {pendingComment && (
          <SensitiveContentWarningModal
            show={showSensitiveWarningModal}
            onHide={() => {
              setShowSensitiveWarningModal(false);
              setPendingComment(null);
            }}
            onEdit={handleEditFromWarning}
            onPostAnyway={handlePostWithMasking}
            originalText={pendingComment.content}
            maskedText={pendingComment.maskedPreview}
            warnings={pendingComment.warnings}
            detectionSummary={pendingComment.summary}
            isSubmitting={submittingComment}
          />
        )}
      </Container>

      <style jsx>{`
        .comments-section {
          background-color: #f8f9fa;
          border-radius: 0.5rem;
          padding: 1rem;
        }
        
        .comment-form textarea {
          resize: none;
          font-size: 0.875rem;
        }
        
        .comment-item {
          animation: fadeIn 0.3s ease;
        }
        
        .top-level-comment {
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 16px;
        }
        
        .reply-item {
          margin-top: 12px;
          padding-left: 0;
        }
        
        /* Remove the border-left styling */
        .replies-container {
          position: relative;
          margin-top: 12px;
        }
        
        /* Remove the before pseudo-element */
        .replies-container::before {
          display: none;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .rotate-180 {
          transform: rotate(180deg);
        }
        
        .comment-reaction-btn {
          position: relative;
          cursor: pointer;
          border: none;
          background: none;
          padding: 4px 8px;
          border-radius: 16px;
          transition: all 0.2s ease;
        }
        
        .comment-reaction-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
          transform: scale(1.05);
        }
        
        .comment-reaction-btn.active {
          font-weight: 600;
        }
        
        .comment-reaction-btn:active {
          transform: scale(0.95);
        }
        
        .dropdown-menu {
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-radius: 8px;
          padding: 0.25rem 0;
          min-width: 180px;
        }
        
        .dropdown-item {
          padding: 0.5rem 1rem;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }
        
        .dropdown-item:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        .dropdown-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        @keyframes reactionPulse {
          0% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.2);
          }
          100% {
            transform: scale(1.1);
          }
        }
        
        /* Smooth transitions */
        .comment-item {
          transition: all 0.3s ease;
        }
        
        /* Facebook-like hover effects */
        .comment-item:hover {
          background-color: rgba(0, 0, 0, 0.01);
        }
        
        /* All replies are now rendered directly in the replies container */
        .replies-container .reply-item {
          margin-bottom: 12px;
        }
        
        /* Remove any additional indentation */
        .replies-container .reply-item .replies-container {
          margin-left: 0;
          padding-left: 0;
        }
      `}</style>
    </DashboardLayout>
  )
}

export default PostDetailPage