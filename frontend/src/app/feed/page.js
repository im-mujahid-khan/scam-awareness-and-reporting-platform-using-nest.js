"use client";

import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Spinner,
  Alert,
  Image,
  Modal,
  Form,
  OverlayTrigger,
  Tooltip,
  Dropdown,
  ListGroup,
} from "react-bootstrap";
import {
  FaGlobe,
  FaNewspaper,
  FaComment,
  FaShare,
  FaThumbsUp,
  FaThumbsDown,
  FaChartLine,
  FaShieldAlt,
  FaFilter,
  FaChevronRight,
  FaChartBar,
  FaExclamationTriangle,
  FaCheckCircle,
  FaStar,
  FaPlus,
  FaHeart,
  FaBookmark,
  FaEyeSlash,
  FaHashtag,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  FaArrowRight,
  FaUsers,
  FaUserFriends,
  FaExternalLinkAlt,
  FaMapMarkerAlt,
  FaImages,
  FaPlay,
  FaFile,
  FaTimes,
  FaReply,
  FaEdit,
  FaTrash,
  FaCheck,
  FaVideo,
  FaPlayCircle,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaExpand,
  FaEllipsisV,
  FaFlag,
  FaSort,
  FaExclamationTriangle as FaExclamationTriangleIcon,
  FaInfoCircle,
  FaEye,
  FaEyeSlash as FaEyeSlashIcon,
  FaChevronUp,
  FaChevronDown,
} from "react-icons/fa";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../../lib/contexts/AuthContext";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import Link from 'next/link';
import DashboardLayout from "../../../components/layout/DashboardLayout";

// Custom Image Component with better loading
const EnhancedImage = ({ src, alt, className = "", onClick, onLoad }) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`image-wrapper ${className}`}>
      <Image
        src={src}
        alt={alt}
        fluid
        className={`enhanced-image ${loaded ? 'loaded' : 'loading'}`}
        onClick={onClick}
        onLoad={() => {
          setLoaded(true);
          if (onLoad) onLoad();
        }}
        onError={() => setError(true)}
        style={{
          width: '100%',
          height: 'auto',
          objectFit: 'contain',
          maxHeight: '500px',
          backgroundColor: '#f8f9fa',
        }}
        loading="lazy"
      />
      {!loaded && !error && (
        <div className="image-loading">
          <Spinner animation="border" size="sm" variant="primary" />
        </div>
      )}
      {error && (
        <div className="image-error">
          <FaImages className="text-muted" size={24} />
          <small className="text-muted d-block mt-1">Image failed to load</small>
        </div>
      )}
    </div>
  );
};

// Video Player Component with optimized auto-play on scroll
const VideoPlayer = ({ 
  src, 
  poster, 
  alt, 
  controls = true,
  muted = true,
  loop = true,
  playsInline = true,
}) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(muted);
  const [showControls, setShowControls] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleError = () => setHasError(true);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('error', handleError);

    // Optimized IntersectionObserver for video autoplay
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          setIsInView(entry.isIntersecting);
          
          if (entry.isIntersecting) {
            // Video is visible in viewport
            if (video.paused && !hasError && entry.intersectionRatio > 0.7) {
              // Only play if at least 70% of the video is visible
              video.play().catch(e => {
                console.log("Autoplay failed:", e);
                // If autoplay fails, show play button
                setIsPlaying(false);
              });
            }
          } else {
            // Video is out of viewport
            if (!video.paused) {
              video.pause();
              // Don't reset time, just pause
            }
          }
        });
      },
      {
        threshold: [0.3, 0.7, 1.0], // Multiple thresholds for better control
        rootMargin: '50px' // Start checking 50px before entering viewport
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('error', handleError);
      
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
      
      // Clean up video on unmount
      if (video && !video.paused) {
        video.pause();
        video.currentTime = 0;
      }
    };
  }, [hasError]);

  const togglePlay = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => {
          console.log("Play failed:", e);
        });
      }
    }
  };

  const handleSeek = (e) => {
    e.stopPropagation();
    if (videoRef.current && duration > 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * duration;
    }
  };

  const toggleMute = (e) => {
    if (e) e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e) => {
    e.stopPropagation();
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      if (newVolume > 0) {
        setIsMuted(false);
        videoRef.current.muted = false;
      }
    }
  };

  const toggleFullscreen = (e) => {
    if (e) e.stopPropagation();
    const videoContainer = containerRef.current;
    if (!videoContainer) return;

    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen().catch(err => {
        console.log(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      ref={containerRef}
      className="video-player-container position-relative rounded-3 overflow-hidden"
      onMouseEnter={() => {
        setIsHovering(true);
        setShowControls(true);
      }}
      onMouseLeave={() => {
        setIsHovering(false);
        if (!isPlaying) {
          setShowControls(false);
        }
      }}
      onMouseMove={() => setShowControls(true)}
      style={{ cursor: 'pointer' }}
      onClick={(e) => {
        e.stopPropagation();
        togglePlay(e);
      }}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-100 h-auto"
        preload="metadata"
        playsInline={playsInline}
        muted={muted}
        loop={loop}
        onClick={(e) => {
          e.stopPropagation();
          togglePlay(e);
        }}
        style={{
          width: '100%',
          height: 'auto',
          maxHeight: '500px',
          objectFit: 'contain',
          backgroundColor: '#000',
        }}
      />
      
      {/* Video overlay with play button */}
      {!isPlaying && (
        <div 
          className="position-absolute top-0 left-0 w-100 h-100 d-flex align-items-center justify-content-center video-overlay"
          onClick={(e) => {
            e.stopPropagation();
            togglePlay(e);
          }}
        >
          <div className="play-button bg-primary rounded-circle p-4 shadow-lg">
            <FaPlay size={30} className="text-white" />
          </div>
        </div>
      )}
      
      {/* Error state */}
      {hasError && (
        <div className="position-absolute top-0 left-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark">
          <div className="text-center">
            <FaVideo className="text-muted mb-2" size={48} />
            <p className="text-white mb-0">Failed to load video</p>
            <Button 
              variant="primary" 
              size="sm" 
              className="mt-2"
              onClick={(e) => {
                e.stopPropagation();
                setHasError(false);
                if (videoRef.current) {
                  videoRef.current.load();
                }
              }}
            >
              Retry
            </Button>
          </div>
        </div>
      )}
      
      {/* Custom Video Controls */}
      {(showControls || isHovering) && !hasError && (
        <div 
          className="video-controls position-absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Progress Bar */}
          <div 
            className="progress-bar mb-2 w-100"
            onClick={(e) => {
              e.stopPropagation();
              handleSeek(e);
            }}
            style={{ height: '4px', backgroundColor: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
          >
            <div 
              className="progress-fill h-100 bg-primary"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          
          <div className="d-flex align-items-center justify-content-between">
            {/* Left Controls */}
            <div className="d-flex align-items-center gap-3">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  togglePlay(e);
                }}
                className="btn btn-link p-0 text-white"
              >
                {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} />}
              </button>
              
              <span className="text-white small me-4" style={{ minWidth: '80px' }}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            
            {/* Right Controls */}
            <div className="d-flex align-items-center gap-3">
              {/* Volume Control - Added spacing */}
              <div className="d-flex align-items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleMute(e);
                  }}
                  className="btn btn-link p-0 text-white"
                >
                  {isMuted || volume === 0 ? <FaVolumeMute size={18} /> : <FaVolumeUp size={18} />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleVolumeChange(e);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="volume-slider"
                  style={{ width: '80px' }}
                />
              </div>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFullscreen(e);
                }}
                className="btn btn-link p-0 text-white"
              >
                <FaExpand size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Video info */}
      {!isPlaying && !hasError && (
        <div 
          className="position-absolute bottom-3 left-3"
          onClick={(e) => e.stopPropagation()}
        >
          <Badge bg="dark" className="px-2 py-1">
            <FaVideo className="me-1" size={12} />
            Video
          </Badge>
        </div>
      )}
    </div>
  );
};

// Media Gallery Component
const MediaGallery = ({ media, postId, isExpanded = false, onToggleExpand }) => {
  const hasMedia = media && media.length > 0;
  if (!hasMedia) return null;

  // Separate images and videos
  const images = media.filter(item => item.evidenceType === "IMAGE" && item.fileUrl);
  const videos = media.filter(item => item.evidenceType === "VIDEO" && item.fileUrl);

  const allMedia = [...images, ...videos];
  if (allMedia.length === 0) return null;

  const maxVisibleMedia = isExpanded ? allMedia.length : 4;
  const visibleMedia = allMedia.slice(0, maxVisibleMedia);
  const hasMoreMedia = allMedia.length > maxVisibleMedia;

  const getMediaGridClass = () => {
    if (visibleMedia.length === 1) return "single-media";
    if (visibleMedia.length === 2) return "two-media";
    if (visibleMedia.length === 3) return "three-media";
    return "multiple-media";
  };

  const renderMediaItem = (item, index) => {
    if (item.evidenceType === "IMAGE") {
      return (
        <div
          key={item.id}
          className={`media-container position-relative rounded-3 overflow-hidden ${
            visibleMedia.length > 1 ? 'gallery-item' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
            window.open(item.fileUrl, '_blank');
          }}
          style={{ cursor: 'pointer' }}
        >
          <EnhancedImage
            src={item.fileUrl}
            alt={`Evidence ${index + 1}`}
            className="w-100 h-auto"
            onClick={(e) => {
              e.stopPropagation();
              window.open(item.fileUrl, '_blank');
            }}
          />
          {index === 3 && hasMoreMedia && !isExpanded && visibleMedia.length === 4 && (
            <div 
              className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-70 rounded-3 d-flex align-items-center justify-content-center"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-white fw-bold h4">+{allMedia.length - 4}</span>
            </div>
          )}
        </div>
      );
    } else if (item.evidenceType === "VIDEO") {
      return (
        <div
          key={item.id}
          className={`media-container position-relative rounded-3 overflow-hidden ${
            visibleMedia.length > 1 ? 'gallery-item' : ''
          }`}
          onClick={(e) => {
            e.stopPropagation();
          }}
        >
          <VideoPlayer
            src={item.fileUrl}
            poster={item.thumbnailUrl || "/video-thumbnail-placeholder.png"}
            alt={`Video evidence ${index + 1}`}
            muted={true}
            loop={true}
          />
          {index === 3 && hasMoreMedia && !isExpanded && visibleMedia.length === 4 && (
            <div 
              className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-70 rounded-3 d-flex align-items-center justify-content-center"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-white fw-bold h4">+{allMedia.length - 4}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="d-flex align-items-center">
          <FaImages className="me-2 text-primary" />
          <span className="fw-medium small">
            Evidence ({allMedia.length})
            {videos.length > 0 && (
              <Badge bg="danger" className="ms-2">
                <FaVideo className="me-1" size={10} />
                {videos.length} video{videos.length > 1 ? 's' : ''}
              </Badge>
            )}
          </span>
        </div>
        {hasMoreMedia && !isExpanded && (
          <Button
            variant="link"
            className="p-0 text-decoration-none post-action-button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            <small>View all {allMedia.length} items</small>
          </Button>
        )}
      </div>
      
      <div className={`media-gallery ${getMediaGridClass()} mb-2`}>
        {visibleMedia.map((item, index) => renderMediaItem(item, index))}
      </div>
      
      {isExpanded && hasMoreMedia && (
        <div className="text-center mt-2">
          <Button
            variant="outline-secondary"
            size="sm"
            className="rounded-pill post-action-button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
          >
            Show less
          </Button>
        </div>
      )}
    </div>
  );
}; // ADDED THIS CLOSING BRACKET

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
                  <FaEye className="me-1" />
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

// ==================== REPORT MODAL COMPONENT (Simpler Version) ====================

const ReportCommentModal = ({ 
  show, 
  onHide, 
  onSubmit, 
  isSubmitting = false,
  isOwnComment = false,
  alreadyReported = false
}) => {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [customReason, setCustomReason] = useState('');

  // Predefined report reasons based on the specification
  const reportReasons = [
    { value: 'ABUSIVE', label: 'Abusive/Hate Speech', description: 'Contains personal attacks, hate speech, or harassment' },
    { value: 'SPAM', label: 'Spam', description: 'Unsolicited promotional content or repetitive messages' },
    { value: 'SENSITIVE_INFO', label: 'Sensitive Information', description: 'Contains personal or sensitive information' },
    { value: 'HARASSMENT', label: 'Harassment', description: 'Bullying, intimidation, or targeted harassment' },
    { value: 'OTHER', label: 'Other', description: 'Other inappropriate content' },
  ];

  useEffect(() => {
    if (!show) {
      // Reset form when modal closes
      setReason('');
      setDescription('');
      setCustomReason('');
    }
  }, [show]);

  const handleSubmit = () => {
    if (!reason) {
      toast.error('Please select a reason for reporting');
      return;
    }

    const finalReason = reason === 'OTHER' && customReason ? customReason : reason;
    onSubmit(finalReason, description);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" size="lg">
      <Modal.Header closeButton className="border-bottom bg-light">
        <Modal.Title className="d-flex align-items-center">
          <FaFlag className="text-warning me-2" />
          Report Comment
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="pb-4">
        {isOwnComment ? (
          <Alert variant="warning" className="text-center py-5 border-0">
            <FaExclamationTriangle className="mb-3" size={48} />
            <h6 className="fw-bold mb-2">Cannot Report Your Own Comment</h6>
            <p className="text-muted mb-0">
              You cannot report comments that you have posted.
            </p>
          </Alert>
        ) : alreadyReported ? (
          <Alert variant="info" className="text-center py-5 border-0">
            <FaInfoCircle className="mb-3" size={48} />
            <h6 className="fw-bold mb-2">Already Reported</h6>
            <p className="text-muted mb-0">
              You have already reported this comment. Our moderation team will review it.
            </p>
          </Alert>
        ) : (
          <>
            <p className="mb-4">Help us understand what's wrong with this comment.</p>

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold mb-3">
                Reason for reporting <span className="text-danger">*</span>
              </Form.Label>
              <div className="d-grid gap-2">
                {reportReasons.map((reasonOption) => (
                  <div
                    key={reasonOption.value}
                    className={`p-3 rounded-3 ${reason === reasonOption.value ? 'bg-primary bg-opacity-10 border-primary border-2' : 'border border-light'}`}
                    style={{
                      transition: 'all 0.2s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => setReason(reasonOption.value)}
                  >
                    <div className="form-check mb-0">
                      <input
                        className="form-check-input"
                        type="radio"
                        name="reportReason"
                        id={`reason-${reasonOption.value}`}
                        value={reasonOption.value}
                        checked={reason === reasonOption.value}
                        onChange={() => setReason(reasonOption.value)}
                        style={{ 
                          width: '20px', 
                          height: '20px',
                          cursor: 'pointer'
                        }}
                      />
                      <label 
                        className="form-check-label d-block ms-3"
                        htmlFor={`reason-${reasonOption.value}`}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="fw-medium mb-1">{reasonOption.label}</div>
                        <div className="text-muted small">{reasonOption.description}</div>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </Form.Group>

            {reason === 'OTHER' && (
              <Form.Group className="mb-4">
                <Form.Label className="fw-bold mb-2">
                  Please specify reason
                </Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter the reason for reporting..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="py-2 px-3"
                  maxLength={100}
                />
                {customReason && (
                  <div className="text-end mt-1">
                    <small className="text-muted">
                      {customReason.length}/100 characters
                    </small>
                  </div>
                )}
              </Form.Group>
            )}

            <Form.Group className="mb-4">
              <Form.Label className="fw-bold mb-2">
                Additional details (optional)
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Provide any additional context that might help us review this report..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={handleKeyDown}
                maxLength={500}
                className="py-2 px-3"
              />
              <div className="d-flex justify-content-between align-items-center mt-1">
                <small className="text-muted">
                  Character limit: 500
                </small>
                <small className={`fw-medium ${description.length > 450 ? 'text-warning' : 'text-muted'}`}>
                  {description.length}/500
                </small>
              </div>
            </Form.Group>

            <Alert variant="info" className="mb-0">
              <div className="d-flex align-items-start">
                <FaInfoCircle className="me-2 mt-1 flex-shrink-0" />
                <div className="small">
                  <strong>Important:</strong> Reports are reviewed by our moderation team. 
                  False reports may result in account restrictions.
                </div>
              </div>
            </Alert>
          </>
        )}
      </Modal.Body>
      
      <Modal.Footer className="border-top bg-light">
        {!isOwnComment && !alreadyReported ? (
          <>
            <Button 
              variant="outline-secondary" 
              onClick={onHide}
              disabled={isSubmitting}
              className="px-4"
            >
              Cancel
            </Button>
            <Button
              variant="warning"
              onClick={handleSubmit}
              disabled={isSubmitting || !reason || (reason === 'OTHER' && !customReason.trim())}
              className="px-4 d-flex align-items-center"
            >
              {isSubmitting ? (
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
          </>
        ) : (
          <Button 
            variant="secondary" 
            onClick={onHide}
            className="px-4 w-100"
          >
            Close
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default function FeedPage() {
  const { user, api } = useAuth();
  const router = useRouter();

  const [activeFilter, setActiveFilter] = useState("all");
  const [feedLoading, setFeedLoading] = useState(true);
  const [feed, setFeed] = useState([]);
  const [sortBy, setSortBy] = useState("latest");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [groupCache, setGroupCache] = useState({});
  const [expandedPosts, setExpandedPosts] = useState({});

  // State for inline comments with pagination and sorting
  const [expandedComments, setExpandedComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [postComments, setPostComments] = useState({});
  const [loadingComments, setLoadingComments] = useState({});
  const [submittingComment, setSubmittingComment] = useState({});

  // Comment pagination state
  const [commentPages, setCommentPages] = useState({});
  const [commentHasMore, setCommentHasMore] = useState({});
  const [loadingMoreComments, setLoadingMoreComments] = useState({});

  // Comment sorting state
  const [commentSort, setCommentSort] = useState({}); // Store sort per post
  const commentRefs = useRef({}); // For infinite scroll

  // Add these new state variables
  const [showSensitiveWarningModal, setShowSensitiveWarningModal] = useState(false);
  const [pendingComment, setPendingComment] = useState(null);
  const [maskedComments, setMaskedComments] = useState(new Set());
  const [inputDetections, setInputDetections] = useState({});

  // Report modal state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCommentData, setReportCommentData] = useState(null);
  const [submittingReport, setSubmittingReport] = useState(false);

  // Track reported comments
  const [reportedComments, setReportedComments] = useState(new Set());

  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCommentData, setDeleteCommentData] = useState(null);

  const trendingTopics = [
    { tag: "#TechSupportScam", posts: "245", trend: "up", change: "+15%" },
    { tag: "#PhishingAlert", posts: "189", trend: "up", change: "+8%" },
    { tag: "#CryptoFraud", posts: "312", trend: "steady", change: "0%" },
    { tag: "#OnlineSafety", posts: "467", trend: "up", change: "+23%" },
    { tag: "#RomanceScam", posts: "156", trend: "down", change: "-5%" },
    { tag: "#InvestmentScam", posts: "89", trend: "up", change: "+12%" },
  ];

  const statsData = [
    {
      label: "Community Posts",
      value: "12,450",
      change: "+8%",
      color: "primary",
      icon: <FaChartBar />
    },
    {
      label: "Active Reports",
      value: "342",
      change: "+15%",
      color: "warning",
      icon: <FaExclamationTriangle />
    },
    {
      label: "Verified Cases",
      value: "8,923",
      change: "+5%",
      color: "success",
      icon: <FaCheckCircle />
    },
    {
      label: "Community Impact",
      value: "94%",
      change: "+3%",
      color: "info",
      icon: <FaStar />
    },
  ];

  useEffect(() => {
    loadCommunityFeed();
    
    // Cleanup video refs on unmount
    return () => {
      console.log("Cleaning up video resources...");
    };
  }, []);

  const fetchGroupDetails = async (groupId) => {
    if (groupCache[groupId]) {
      return groupCache[groupId];
    }

    try {
      const groupResponse = await api.groups.getGroupBySlug(groupId);
      if (groupResponse) {
        const groupInfo = {
          id: groupResponse.id,
          name: groupResponse.name,
          slug: groupResponse.slug || groupId,
          privacy: groupResponse.privacy,
          description: groupResponse.description,
          memberCount: groupResponse.memberCount,
          isMember: groupResponse.isMember
        };

        setGroupCache(prev => ({
          ...prev,
          [groupId]: groupInfo
        }));

        return groupInfo;
      }
    } catch (error) {
      console.warn(`Could not fetch group details for groupId: ${groupId}`, error);
      const fallbackInfo = {
        id: groupId,
        name: "Private Group",
        slug: groupId,
        privacy: "PRIVATE",
        description: "Group details not available",
        memberCount: 0,
        isMember: false
      };

      setGroupCache(prev => ({
        ...prev,
        [groupId]: fallbackInfo
      }));

      return fallbackInfo;
    }

    return null;
  };

  const fetchGroupDetailsForPosts = async (posts) => {
    const groupIds = [...new Set(posts
      .filter(post => post.groupId)
      .map(post => post.groupId)
    )];

    const groupPromises = groupIds.map(groupId => fetchGroupDetails(groupId));
    const groups = await Promise.all(groupPromises);

    const groupMap = {};
    groups.forEach((group, index) => {
      if (group) {
        groupMap[groupIds[index]] = group;
      }
    });

    return groupMap;
  };

  const loadCommunityFeed = async () => {
    try {
      setFeedLoading(true);

      console.log("Loading community feed...");
      const feedResponse = await api.getFeed(1, 20);

      let feedData = feedResponse?.data || feedResponse || [];

      const groupPosts = feedData.filter(post => post.groupId);
      if (groupPosts.length > 0) {
        console.log(`Found ${groupPosts.length} group posts, fetching group details...`);
        const groupMap = await fetchGroupDetailsForPosts(groupPosts);

        feedData = feedData.map(post => {
          if (post.groupId && groupMap[post.groupId]) {
            return {
              ...post,
              group: groupMap[post.groupId]
            };
          }
          return post;
        });
      }

      feedData = feedData.map(post => {
        if (!post.badges) {
          post.badges = [];
        }

        if (post.status === "UNDER_REVIEW") {
          const hasEvidence = post.evidences && post.evidences.length > 0;
          const hasEvidenceBadge = post.badges.some(badge =>
            badge.badgeType === "EVIDENCE_PROVIDED" || badge.badgeType === "NO_EVIDENCE"
          );

          if (!hasEvidenceBadge) {
            const evidenceBadge = {
              id: `temp-${post.id}-evidence`,
              postId: post.id,
              badgeType: hasEvidence ? "EVIDENCE_PROVIDED" : "NO_EVIDENCE",
              color: hasEvidence ? "#10B981" : "#6B7280",
              label: hasEvidence ? "Evidence Provided" : "No Evidence",
              description: null,
              createdAt: new Date().toISOString()
            };

            post.badges.push(evidenceBadge);
          }
        }

        return post;
      });
      
      console.log(`Feed loaded: ${feedData.length} posts`);
      setFeed(feedData);

    } catch (error) {
      console.error("Failed to load community feed:", error);
      toast.error("Failed to load community feed");
    } finally {
      setFeedLoading(false);
    }
  };

  // Enhanced organize comments into tree structure with sorting
  const organizeComments = useCallback((flatComments, sortType = "top") => {
    if (!Array.isArray(flatComments)) {
      console.log('organizeComments: Input is not an array:', flatComments);
      return [];
    }
    
    console.log(`Organizing ${flatComments.length} comments into tree structure...`);
    
    // Create a map for quick lookup
    const commentMap = new Map();
    const rootComments = [];

    // First pass: create map and initialize comments
    flatComments.forEach(comment => {
      if (!comment || !comment.id) {
        console.warn('Skipping invalid comment:', comment);
        return;
      }

      // Normalize userReaction to uppercase
      let userReaction = comment.userReaction || null;
      if (userReaction && typeof userReaction === 'string') {
        userReaction = userReaction.toUpperCase();
      }

      // Preserve existing replies if they exist (important for maintaining state)
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
        console.log(`User has reacted with ${userReaction} on comment ${comment.id}`);
      }

      commentMap.set(comment.id, enrichedComment);
    });
    
    console.log(`Created map with ${commentMap.size} comments`);
    
    // Second pass: build the tree
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
            console.log(`Linked comment ${comment.id} as reply to parent ${comment.parentId}`);
          }
        } else {
          // Parent not found in current batch - might be loaded separately
          console.warn(`Parent comment ${comment.parentId} not found for reply ${comment.id}. Adding as root comment.`);
          rootComments.push(currentComment);
        }
      } else if (!comment.parentId) {
        rootComments.push(currentComment);
        console.log(`Added comment ${comment.id} as root comment`);
      }
    });

    // If we didn't need tree building, it means comments already have their replies
    // In this case, just extract the root comments
    if (!needsTreeBuilding && rootComments.length === 0) {
      console.log('Comments already have tree structure, extracting root comments...');
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

    console.log(`Organized comments: ${sortedRootComments.length} root comments, ${totalCount} total (including all replies)`);

    return sortedRootComments;
  }, []);

  // Load comments for a specific post with sorting and pagination - FIXED ENDPOINT
  const loadComments = useCallback(async (postId, page = 1, sortType = "top", append = false) => {
    if (!postId) return;

    try {
      if (!append) {
        setLoadingComments(prev => ({ ...prev, [postId]: true }));
      } else {
        setLoadingMoreComments(prev => ({ ...prev, [postId]: true }));
      }

      console.log(`Loading comments for post: ${postId}, page: ${page}, sort: ${sortType}`);

      // Use the fixed endpoint from api.js
      const response = await api.comments.getPostCommentsPaginated(postId, {
        page: page,
        limit: 10,
        sortBy: sortType,
        maxDepth: 3
      });

      console.log(`API response for post ${postId}:`, response);

      let commentsArray = response.data || [];
      let hasMore = response.hasMore || false;

      console.log(`Extracted ${commentsArray.length} comments for post ${postId}`);

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
        setPostComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), ...organizedComments]
        }));
      } else {
        // Replace existing comments
        setPostComments(prev => ({
          ...prev,
          [postId]: organizedComments
        }));
      }

      // Update pagination state
      setCommentPages(prev => ({
        ...prev,
        [postId]: page
      }));

      setCommentHasMore(prev => ({
        ...prev,
        [postId]: hasMore
      }));

      // Update sort state
      setCommentSort(prev => ({
        ...prev,
        [postId]: sortType
      }));

      console.log(`Loaded ${organizedComments.length} comments for post ${postId} (page ${page}, hasMore: ${hasMore})`);

    } catch (error) {
      console.error(`Failed to load comments for post ${postId}:`, error);

      if (!append) {
        toast.error('Failed to load comments');

        // Set empty array on error
        setPostComments(prev => ({
          ...prev,
          [postId]: []
        }));

        // Try fallback endpoint as last resort
        try {
          console.log('Trying fallback endpoint for comments...');
          const fallbackResponse = await api.comments.getPostComments(postId);
          if (fallbackResponse && Array.isArray(fallbackResponse)) {
            const organizedComments = organizeComments(fallbackResponse, commentSort[postId] || "top");
            setPostComments(prev => ({
              ...prev,
              [postId]: organizedComments
            }));
            console.log(`Loaded ${organizedComments.length} comments using fallback`);
          }
        } catch (fallbackError) {
          console.error(`Fallback also failed for post ${postId}:`, fallbackError);
        }
      }
    } finally {
      if (!append) {
        setLoadingComments(prev => ({ ...prev, [postId]: false }));
      } else {
        setLoadingMoreComments(prev => ({ ...prev, [postId]: false }));
      }
    }
  }, [api, organizeComments]);

  // Handle comment sort change
  const handleCommentSortChange = useCallback(async (postId, sortType) => {
    console.log(`Changing comment sort for post ${postId} to: ${sortType}`);

    // Update sort state
    setCommentSort(prev => ({
      ...prev,
      [postId]: sortType
    }));

    // Reload comments with new sorting
    await loadComments(postId, 1, sortType, false);
  }, [loadComments]);

  // Load more comments for a post
  const loadMoreComments = useCallback(async (postId) => {
    const currentPage = commentPages[postId] || 1;
    const currentSort = commentSort[postId] || "top";

    console.log(`Loading more comments for post ${postId}, page ${currentPage + 1}`);

    await loadComments(postId, currentPage + 1, currentSort, true);
  }, [loadComments, commentPages, commentSort]);

  // Toggle comments visibility
  const toggleComments = useCallback((postId) => {
    setExpandedComments(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));

    // Load comments if not already loaded
    if (!postComments[postId] && !loadingComments[postId]) {
      loadComments(postId, 1, commentSort[postId] || "top", false);
    }
  }, [postComments, loadingComments, loadComments, commentSort]);

  // Handle comment input change
  const handleCommentInputChange = useCallback((postId, value) => {
    setCommentInputs(prev => ({ ...prev, [postId]: value }));

    // Real-time detection
    if (value && value.trim()) {
      const detections = detectSensitiveInfo(value);
      setInputDetections(prev => ({ ...prev, [postId]: detections }));
    } else {
      setInputDetections(prev => ({ ...prev, [postId]: null }));
    }
  }, []);

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

  const handlePostWithMasking = useCallback(async () => {
    if (!pendingComment) return;

    const { postId, content, parentId } = pendingComment;
    setShowSensitiveWarningModal(false);
    await submitCommentDirect(postId, content, parentId, true);
    setPendingComment(null);
  }, [pendingComment]);

  const handleEditFromWarning = useCallback(() => {
    setShowSensitiveWarningModal(false);
    setPendingComment(null);
    toast.info("Please edit your comment to remove sensitive information");
  }, []);

  // FIXED: Submit a new comment (main comment or reply) - optimistic update without immediate refresh
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
        console.log(`Submitting reply to comment ${parentId} on post ${postId}`);
      } else {
        console.log(`Submitting main comment on post ${postId}`);
        setSubmittingComment(prev => ({ ...prev, [postId]: true }));
      }

      // ADD THIS RIGHT BEFORE creating commentData:
      const finalContent = applyMasking ? maskSensitiveInfo(content) : content;
      
      const commentData = {
        content: finalContent.trim(),  // Changed from content.trim()
        postId,
        parentId: parentId || undefined,
        skipSafetyCheck: false
      };

      console.log(`Submitting ${isReply ? 'reply' : 'comment'} for post ${postId}:`, commentData);

      const response = await api.comments.createComment(commentData);
      
      console.log('Comment created successfully:', response);
      
      if (response && response.id) {
        toast.success(isReply ? "Reply posted successfully!" : "Comment posted successfully!");

        // ADD THIS after getting response:
        if (applyMasking && response && response.id) {
          setMaskedComments(prev => new Set([...prev, response.id]));
        }

        // Create a properly formatted comment object for local state
        const newComment = {
          ...response,
          id: response.id,
          content: finalContent,  // Changed from content
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
          isMasked: applyMasking,  // Add this
        };

        // FIXED: Update local state immediately for instant feedback - NO REFRESH
        if (isReply) {
          // For replies, update the parent comment's replies
          setPostComments(prev => {
            const currentComments = prev[postId] || [];

            const updateCommentWithReply = (comments) => {
              return comments.map(comment => {
                if (comment.id === parentId) {
                  return {
                    ...comment,
                    replies: [newComment, ...comment.replies] // Add new reply at the beginning
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

            const updatedComments = updateCommentWithReply(currentComments);

            console.log('Updated comments tree with new reply');

            return {
              ...prev,
              [postId]: updatedComments
            };
          });
        } else {
          // For main comments, add to the beginning of the list
          setPostComments(prev => ({
            ...prev,
            [postId]: [newComment, ...(prev[postId] || [])]
          }));
        }

        // Clear input if it's a main comment
        if (!isReply) {
          setCommentInputs(prev => ({
            ...prev,
            [postId]: ''
          }));
        }
      }

      return response;
    } catch (error) {
      console.error(`Failed to submit ${parentId ? 'reply' : 'comment'} for post ${postId}:`, error);
      toast.error(`Failed to post ${parentId ? 'reply' : 'comment'}: ` + (error.message || "Unknown error"));

      // On error, refresh to get correct state
      const currentSort = commentSort[postId] || "top";
      await loadComments(postId, 1, currentSort, false);

      throw error;
    } finally {
      if (!parentId) {
        setSubmittingComment(prev => ({ ...prev, [postId]: false }));
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

      console.log(`Updating comment ${commentId}:`, updateData);

      await api.comments.updateComment(commentId, updateData);

      toast.success("Comment updated!");

      // Refresh comments for this post
      const currentSort = commentSort[postId] || "top";
      if (postId) {
        await loadComments(postId, 1, currentSort, false);
      }

    } catch (error) {
      console.error(`Failed to update comment ${commentId}:`, error);
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
      console.log(`Deleting comment ${commentId}, hard: ${hard}`);

      await api.comments.deleteComment(commentId, hard);

      toast.success("Comment deleted!");

      // Refresh comments for this post
      const currentSort = commentSort[postId] || "top";
      if (postId) {
        await loadComments(postId, 1, currentSort, false);
      }

    } catch (error) {
      console.error(`Failed to delete comment ${commentId}:`, error);
      toast.error("Failed to delete comment: " + (error.message || "Unknown error"));
    }
  }, [user, api, loadComments, commentSort]);

  // Show delete confirmation modal
  const confirmDeleteComment = useCallback((commentId, postId) => {
    setDeleteCommentData({ commentId, postId });
    setShowDeleteModal(true);
  }, []);

  // Handle delete confirmation
  const handleDeleteConfirm = useCallback(async () => {
    if (deleteCommentData) {
      await deleteComment(deleteCommentData.commentId, deleteCommentData.postId, false);
      setShowDeleteModal(false);
      setDeleteCommentData(null);
    }
  }, [deleteCommentData, deleteComment]);

  // Handle delete cancel
  const handleDeleteCancel = useCallback(() => {
    setShowDeleteModal(false);
    setDeleteCommentData(null);
  }, []);

  // ==================== REPORT FUNCTIONS ====================

  // Report a comment
  const reportComment = useCallback(async (commentId, reason, details) => {
    if (!user) {
      toast.error("Please login to report comments");
      return false;
    }

    try {
      setSubmittingReport(true);
      console.log(`Reporting comment ${commentId}:`, { reason, details });

      const reportData = {
        reason: reason.toUpperCase(),
        description: details || undefined
      };

      await api.comments.reportComment(commentId, reportData);

      // Add to reported comments set
      setReportedComments(prev => new Set([...prev, commentId]));

      toast.success(
        <div>
          <strong>Comment reported successfully!</strong>
          <div className="small mt-1">Thank you for helping keep our community safe.</div>
        </div>
      );

      return true;
    } catch (error) {
      console.error(`Failed to report comment ${commentId}:`, error);
      
      let errorMessage = "Failed to report comment";
      if (error.message?.includes("already reported")) {
        errorMessage = "You have already reported this comment";
        // Add to reported comments even if API returns already reported error
        setReportedComments(prev => new Set([...prev, commentId]));
      } else if (error.message?.includes("own comment")) {
        errorMessage = "You cannot report your own comment";
      } else if (error.message) {
        errorMessage = `Failed to report comment: ${error.message}`;
      }
      
      toast.error(errorMessage);
      return false;
    } finally {
      setSubmittingReport(false);
    }
  }, [user, api]);

  // Show report modal
  const confirmReportComment = useCallback((commentId, postId, commentOwnerId) => {
    // Check if user is trying to report their own comment
    if (commentOwnerId === user?.id) {
      setReportCommentData({ 
        commentId, 
        postId, 
        isOwnComment: true 
      });
      setShowReportModal(true);
      return;
    }
    
    // Check if already reported
    if (reportedComments.has(commentId)) {
      setReportCommentData({ 
        commentId, 
        postId, 
        alreadyReported: true 
      });
      setShowReportModal(true);
      return;
    }
    
    setReportCommentData({ 
      commentId, 
      postId, 
      isOwnComment: false,
      alreadyReported: false 
    });
    setShowReportModal(true);
  }, [user, reportedComments]);

  // Handle report submission
  const handleReportSubmit = useCallback(async (reason, details) => {
    if (!reportCommentData) return;

    const success = await reportComment(
      reportCommentData.commentId, 
      reason, 
      details
    );

    if (success) {
      // Close modal on success
      setTimeout(() => {
        setShowReportModal(false);
        setReportCommentData(null);
      }, 1000);
    }
  }, [reportCommentData, reportComment]);

  // Handle report cancel
  const handleReportCancel = useCallback(() => {
    setShowReportModal(false);
    setReportCommentData(null);
  }, []);

  // Handle comment reactions with optimistic UI updates and rollback
  const handleCommentReaction = useCallback(async (commentId, postId, type, currentReaction) => {
    if (!user) {
      toast.error("Please login to react to comments");
      return;
    }

    // Store original state for rollback
    const originalComments = postComments[postId];

    // Determine if we're removing or adding a reaction
    // If currentReaction matches the type, we're removing it (toggle off)
    const isRemoving = currentReaction === type;

    // Convert to lowercase for API (API expects: 'like', 'upvote', 'downvote')
    const apiType = type.toLowerCase();

    console.log(`Action: ${isRemoving ? 'REMOVING' : 'ADDING'} ${type} reaction`);
    console.log(`Current reaction state:`, currentReaction);
    console.log(`Target reaction:`, type);

    // Helper function to update reaction counts in the comment tree
    const updateReactionInTree = (comments, isAdding) => {
      return comments.map(comment => {
        if (comment.id === commentId) {
          // Clone the comment to avoid mutation
          const updatedComment = { ...comment };

          // If removing, we need to decrement the current reaction type
          if (!isAdding && currentReaction) {
            if (currentReaction === 'LIKE') {
              updatedComment.likes = Math.max(0, (comment.likes || 0) - 1);
            } else if (currentReaction === 'UPVOTE') {
              updatedComment.upvotes = Math.max(0, (comment.upvotes || 0) - 1);
            } else if (currentReaction === 'DOWNVOTE') {
              updatedComment.downvotes = Math.max(0, (comment.downvotes || 0) - 1);
            }
            updatedComment.userReaction = null;
          }
          // If adding, increment the new reaction type
          else if (isAdding) {
            if (type === 'LIKE') {
              updatedComment.likes = (comment.likes || 0) + 1;
            } else if (type === 'UPVOTE') {
              updatedComment.upvotes = (comment.upvotes || 0) + 1;
            } else if (type === 'DOWNVOTE') {
              updatedComment.downvotes = (comment.downvotes || 0) + 1;
            }
            updatedComment.userReaction = type;
          }

          // Update score for sorting
          updatedComment.score = (updatedComment.upvotes || 0) - (updatedComment.downvotes || 0);

          return updatedComment;
        }

        // Recursively update replies
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
      // OPTIMISTIC UPDATE - Update UI immediately
      setPostComments(prev => ({
        ...prev,
        [postId]: updateReactionInTree(prev[postId] || [], !isRemoving)
      }));

      // Make API call in background
      if (isRemoving) {
        // Remove existing reaction
        console.log(`Removing ${apiType} reaction from comment ${commentId}`);
        await api.comments.removeReaction(commentId, apiType);
        console.log(`Reaction removed successfully`);
      } else {
        // If user had a different reaction, we need to remove it first
        if (currentReaction && currentReaction !== type) {
          const currentApiType = currentReaction.toLowerCase();
          console.log(`Removing old ${currentApiType} reaction before adding new one`);
          try {
            await api.comments.removeReaction(commentId, currentApiType);
          } catch (removeError) {
            console.warn(`Failed to remove old reaction, continuing anyway:`, removeError);
          }
        }

        // Add new reaction
        console.log(`Adding ${apiType} reaction to comment ${commentId}`);
        await api.comments.addReaction(commentId, apiType);
        console.log(`Reaction added successfully`);
      }

    } catch (error) {
      console.error(`Failed to toggle reaction on comment ${commentId}:`, error);

      // ROLLBACK - Restore original state on error
      setPostComments(prev => ({
        ...prev,
        [postId]: originalComments
      }));

      // More specific error messages
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

  // Handle infinite scroll for comments
  const handleCommentScroll = useCallback((postId, event) => {
    const element = event.target;
    const scrollThreshold = 100; // pixels from bottom

    if (element.scrollHeight - element.scrollTop - element.clientHeight < scrollThreshold) {
      if (commentHasMore[postId] && !loadingMoreComments[postId]) {
        loadMoreComments(postId);
      }
    }
  }, [commentHasMore, loadingMoreComments, loadMoreComments]);

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
                          onClick={() => confirmReportComment(comment.id, postId, comment.user?.id)}
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
                                  onClick={() => confirmReportComment(reply.id, postId, reply.user?.id)}
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

  // Render comments section for a post
  const renderCommentsSection = (post) => {
    const postId = post.id;
    const isExpanded = expandedComments[postId];
    const comments = postComments[postId] || [];
    const commentCount = post._count?.comments || post.commentCount || 0;
    const isLoading = loadingComments[postId];
    const isSubmitting = submittingComment[postId];
    const currentInput = commentInputs[postId] || '';
    const currentSort = commentSort[postId] || "top";
    const hasMore = commentHasMore[postId] || false;
    const loadingMore = loadingMoreComments[postId] || false;

    const totalComments = countTotalComments(comments);

    const currentDetection = inputDetections[postId];
    const hasDetection = currentDetection && currentDetection.hasDetection;

    return (
      <div className="comments-section mt-3 border-top pt-3">
        {/* Comments header with sorting dropdown */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="mb-0 fw-bold">
            <FaComment className="me-2" />
            Comments ({totalComments})
          </h6>

          <div className="d-flex align-items-center gap-2">
            {/* Sorting Dropdown */}
            <Dropdown className="me-2">
              <Dropdown.Toggle
                variant="light"
                size="sm"
                className="d-flex align-items-center rounded-pill px-3"
              >
                <FaSort className="me-2" size={12} />
                Sort: {currentSort === "top" ? "Top" :
                  currentSort === "newest" ? "Newest" :
                    currentSort === "oldest" ? "Oldest" : "Top"}
              </Dropdown.Toggle>

              <Dropdown.Menu>
                <Dropdown.Item
                  onClick={() => handleCommentSortChange(postId, "top")}
                  active={currentSort === "top"}
                >
                  Top Comments
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => handleCommentSortChange(postId, "newest")}
                  active={currentSort === "newest"}
                >
                  Newest First
                </Dropdown.Item>
                <Dropdown.Item
                  onClick={() => handleCommentSortChange(postId, "oldest")}
                  active={currentSort === "oldest"}
                >
                  Oldest First
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>

            <Button
              variant="link"
              className="p-0 text-decoration-none d-flex align-items-center"
              onClick={() => toggleComments(postId)}
            >
              {isExpanded ? 'Hide Comments' : 'Show Comments'}
              <FaChevronRight className={`ms-1 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Expanded comments content */}
        {isExpanded && (
          <div className="comments-content">
            {/* Loading state */}
            {isLoading ? (
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
                        value={currentInput}
                        onChange={(e) => handleCommentInputChange(postId, e.target.value)}
                        className="rounded-3"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.ctrlKey) {
                            e.preventDefault();
                            submitCommentWithMaskingCheck(postId, currentInput);
                          }
                        }}
                      />
                      
                      {hasDetection && (
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
                          {hasDetection && (
                            <span className="ms-2 text-warning">
                              <FaInfoCircle className="me-1" />
                              Masking will be applied
                            </span>
                          )}
                        </small>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => submitCommentWithMaskingCheck(postId, currentInput)}
                          disabled={isSubmitting || !currentInput.trim()}
                          className="rounded-pill px-4"
                        >
                          {isSubmitting ? (
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

                {/* Comments list with infinite scroll */}
                <div
                  className="comments-list"
                  style={{
                    maxHeight: '500px',
                    overflowY: 'auto',
                    paddingRight: '10px'
                  }}
                  onScroll={(e) => handleCommentScroll(postId, e)}
                  ref={el => commentRefs.current[postId] = el}
                >
                  {comments.length === 0 ? (
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
                          {currentSort === "top" && " (sorted by popularity)"}
                          {currentSort === "newest" && " (sorted by newest first)"}
                          {currentSort === "oldest" && " (sorted by oldest first)"}
                        </small>
                      </div>
                      {comments.map(comment => (
                        <CommentItem
                          key={comment.id}
                          comment={comment}
                          postId={postId}
                        />
                      ))}

                      {/* Load More Comments Button */}
                      {hasMore && (
                        <div className="text-center mt-4 mb-4">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            className="rounded-pill px-4 py-2"
                            onClick={() => loadMoreComments(postId)}
                            disabled={loadingMore}
                          >
                            {loadingMore ? (
                              <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Loading more comments...
                              </>
                            ) : (
                              'Load More Comments'
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Infinite scroll indicator */}
                      {hasMore && (
                        <div className="text-center py-3">
                          <small className="text-muted">
                            Scroll down to load more comments...
                          </small>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  const loadMorePosts = async () => {
    if (loadingMore || !hasMore) return;

    try {
      setLoadingMore(true);
      const nextPage = page + 1;
      const feedResponse = await api.getFeed(nextPage, 20);

      let feedData = feedResponse?.data || feedResponse || [];

      if (feedData.length === 0) {
        setHasMore(false);
        return;
      }

      const groupPosts = feedData.filter(post => post.groupId);
      if (groupPosts.length > 0) {
        const groupMap = await fetchGroupDetailsForPosts(groupPosts);

        feedData = feedData.map(post => {
          if (post.groupId && groupMap[post.groupId]) {
            return {
              ...post,
              group: groupMap[post.groupId]
            };
          }
          return post;
        });
      }

      feedData = feedData.map(post => {
        if (!post.badges) {
          post.badges = [];
        }
        return post;
      });

      setFeed(prev => [...prev, ...feedData]);
      setPage(nextPage);

    } catch (error) {
      console.error("Failed to load more posts:", error);
      toast.error("Failed to load more posts");
    } finally {
      setLoadingMore(false);
    }
  };

  const handleReaction = async (postId, type = "like") => {
    if (!user) {
      toast.error("Please login to react to posts");
      return;
    }

    try {
      await api.posts.toggleReaction(postId, type);

      setFeed(prevFeed =>
        prevFeed.map(post =>
          post.id === postId
            ? {
              ...post,
              reactions: [...(post.reactions || []), { type, userId: user?.id }],
              reactionCount: (post.reactionCount || 0) + 1
            }
            : post
        )
      );

      toast.success("Reaction added!");
    } catch (error) {
      console.error("Failed to add reaction:", error);
      toast.error("Failed to add reaction");
    }
  };

  const handleBookmark = async (postId) => {
    if (!user) {
      toast.error("Please login to bookmark posts");
      return;
    }

    try {
      await api.posts.toggleBookmark(postId);

      setFeed(prevFeed =>
        prevFeed.map(post =>
          post.id === postId
            ? { ...post, isBookmarked: !post.isBookmarked }
            : post
        )
      );

      toast.success("Bookmark updated!");
    } catch (error) {
      console.error("Failed to toggle bookmark:", error);
      toast.error("Failed to update bookmark");
    }
  };

  const toggleImageGallery = (postId) => {
    setExpandedPosts(prev => ({
      ...prev,
      [postId]: !prev[postId]
    }));
  };

  const getPostBadge = (postType) => {
    switch (postType) {
      case "SCAM_REPORT":
        return <Badge bg="danger" className="rounded-pill px-3 py-1 fw-medium">Scam Report</Badge>;
      case "SCAM_AWARENESS":
        return <Badge bg="warning" className="rounded-pill px-3 py-1 fw-medium text-dark">Awareness</Badge>;
      case "QUESTION":
        return <Badge bg="primary" className="rounded-pill px-3 py-1 fw-medium">Question</Badge>;
      default:
        return <Badge bg="secondary" className="rounded-pill px-3 py-1 fw-medium">Post</Badge>;
    }
  };

  const getPostIcon = (postType) => {
    switch (postType) {
      case "SCAM_REPORT":
        return <FaExclamationTriangle className="text-danger" size={20} />;
      case "SCAM_AWARENESS":
        return <FaShieldAlt className="text-warning" size={20} />;
      case "QUESTION":
        return <FaComment className="text-primary" size={20} />;
      default:
        return <FaNewspaper className="text-secondary" size={20} />;
    }
  };

  const getEvidenceIcon = (evidenceType) => {
    switch (evidenceType) {
      case "IMAGE":
        return <FaImages className="text-primary" />;
      case "VIDEO":
        return <FaVideo className="text-danger" />;
      case "DOCUMENT":
        return <FaFile className="text-info" />;
      default:
        return <FaFile className="text-secondary" />;
    }
  };

  const formatLocation = (post) => {
    const { country, region, city } = post;

    if (!country && !region && !city) {
      return null;
    }

    const parts = [];
    if (city) parts.push(city);
    if (region) parts.push(region);
    if (country) parts.push(country);

    return parts.join(', ');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Recently';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      return `${weeks}w ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: diffDays > 365 ? 'numeric' : undefined
      });
    }
  };

  const truncateText = (text, maxLength = 200) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const renderImageGallery = (post) => {
    const hasImages = post.evidences && post.evidences.length > 0;
    if (!hasImages) return null;

    const images = post.evidences.filter(evidence =>
      evidence.evidenceType === "IMAGE" && evidence.fileUrl
    );

    if (images.length === 0) return null;

    const isExpanded = expandedPosts[post.id];
    const maxVisibleImages = isExpanded ? images.length : 3;
    const visibleImages = images.slice(0, maxVisibleImages);
    const hasMoreImages = images.length > maxVisibleImages;

    const getImageGridClass = () => {
      if (visibleImages.length === 1) return "single-image";
      if (visibleImages.length === 2) return "two-images";
      return "multiple-images";
    };

    return (
      <div className="mt-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <div className="d-flex align-items-center">
            <FaImages className="me-2 text-primary" />
            <span className="fw-medium small">Evidence Images ({images.length})</span>
          </div>
          {hasMoreImages && !isExpanded && (
            <Button
              variant="link"
              className="p-0 text-decoration-none post-action-button"
              onClick={(e) => {
                e.stopPropagation();
                toggleImageGallery(post.id);
              }}
            >
              <small>View all {images.length} images</small>
            </Button>
          )}
        </div>

        <div className={`image-gallery ${getImageGridClass()} mb-2`}>
          {visibleImages.map((evidence, index) => (
            <div
              key={evidence.id}
              className={`image-container position-relative ${visibleImages.length > 1 ? 'gallery-item' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                window.open(evidence.fileUrl, '_blank');
              }}
              style={{ cursor: 'pointer' }}
            >
              <Image
                src={evidence.fileUrl}
                alt={`Evidence ${index + 1} for ${post.title}`}
                className="rounded-3"
                fluid
                style={{
                  width: '100%',
                  height: visibleImages.length === 1 ? '300px' : '180px',
                  objectFit: 'cover',
                  transition: 'transform 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              />
              {index === 2 && hasMoreImages && !isExpanded && visibleImages.length === 3 && (
                <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 rounded-3 d-flex align-items-center justify-content-center">
                  <span className="text-white fw-bold">+{images.length - 3}</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {isExpanded && hasMoreImages && (
          <div className="text-center mt-2">
            <Button
              variant="outline-secondary"
              size="sm"
              className="rounded-pill post-action-button"
              onClick={(e) => {
                e.stopPropagation();
                toggleImageGallery(post.id);
              }}
            >
              Show less
            </Button>
          </div>
        )}
      </div>
    );
  };

  const filteredPosts = feed.filter(post => {
    if (activeFilter === "all") return true;
    if (activeFilter === "reports") return post.postType === "SCAM_REPORT";
    if (activeFilter === "awareness") return post.postType === "SCAM_AWARENESS";
    if (activeFilter === "questions") return post.postType === "QUESTION";
    return true;
  });

  const sortedPosts = [...filteredPosts].sort((a, b) => {
    if (sortBy === "latest") {
      return new Date(b.createdAt) - new Date(a.createdAt);
    } else if (sortBy === "popular") {
      const reactionsA = b._count?.reactions || b.reactionCount || 0;
      const reactionsB = a._count?.reactions || a.reactionCount || 0;
      return reactionsA - reactionsB;
    } else if (sortBy === "trending") {
      const commentsA = b._count?.comments || b.commentCount || 0;
      const commentsB = a._count?.comments || a.commentCount || 0;
      return commentsA - commentsB;
    }
    return 0;
  });

  return (
    <DashboardLayout>
      <Container className="feed-page px-0 px-sm-3">
        <Row className="g-3 g-sm-4">
          {/* Main Feed Column */}
          <Col lg={8} className="mb-4">
            <div className="feed-header mb-4">
              <Card className="border-0">
                <Card.Body className="p-3">
                  <div className="d-flex flex-column flex-sm-row align-items-start align-items-sm-center justify-content-between gap-3">
                    <div>
                      <h4 className="mb-1">
                        <FaGlobe className="me-2 text-primary" />
                        Community Feed
                      </h4>
                      <p className="text-muted mb-0 small">
                        Posts from the community with comments and reactions
                      </p>
                    </div>
                    <div className="d-flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="rounded-pill"
                        onClick={() => router.push("/report")}
                      >
                        <FaPlus className="me-1" />
                        Create Post
                      </Button>
                    </div>
                  </div>

                  <div className="mt-3 d-flex align-items-center gap-3">
                    <div className="d-flex align-items-center">
                      <span className="me-2 fw-medium small">Sort by:</span>
                      <div className="btn-group" role="group">
                        {["latest", "popular", "trending"].map((sortType) => (
                          <Button
                            key={sortType}
                            variant={sortBy === sortType ? "primary" : "light"}
                            size="sm"
                            className="rounded-pill px-3"
                            onClick={() => setSortBy(sortType)}
                          >
                            {sortType.charAt(0).toUpperCase() + sortType.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="d-flex align-items-center">
                      <FaFilter className="me-2 text-muted" />
                      <h6 className="mb-0 me-3 fw-medium small">Filter:</h6>

                      <div className="filter-buttons d-flex flex-wrap">
                        {["all", "reports", "awareness", "questions"].map((filter) => (
                          <Button
                            key={filter}
                            variant={activeFilter === filter ? "primary" : "light"}
                            size="sm"
                            className="rounded-pill me-2 mb-1 px-3"
                            onClick={() => setActiveFilter(filter)}
                          >
                            {filter.charAt(0).toUpperCase() + filter.slice(1)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </div>

            <div className="feed-posts">
              {feedLoading ? (
                <div className="text-center py-5">
                  <Spinner animation="border" variant="primary" />
                  <p className="mt-3 text-muted">Loading community feed...</p>
                </div>
              ) : sortedPosts.length === 0 ? (
                <Alert variant="info" className="text-center py-5">
                  <div className="mb-3">
                    <FaGlobe className="text-muted" size={48} />
                  </div>
                  <h5>No community posts yet</h5>
                  <p className="mb-0">Be the first to create a post!</p>
                  <Button
                    variant="primary"
                    className="mt-3 rounded-pill"
                    onClick={() => router.push("/report")}
                  >
                    <FaPlus className="me-2" />
                    Create Post
                  </Button>
                </Alert>
              ) : (
                <>
                  <div className="post-cards-container">
                    {sortedPosts.map((post) => {
                      const isScamReport = post.postType === "SCAM_REPORT";
                      const hasEvidence = post.evidences && post.evidences.length > 0;
                      const hasVideos = post.evidences?.some(evidence => evidence.evidenceType === "VIDEO");
                      const userHasReacted = post.reactions?.some(r => r.userId === user?.id);
                      const commentCount = post._count?.comments || post.commentCount || 0;
                      const reactionCount = post._count?.reactions || post.reactionCount || 0;
                      const location = formatLocation(post);

                      return (
                        <Card
                          key={post.id}
                          className="mb-4 border-0 shadow-sm rounded-4 feed-post-card"
                          style={{
                            transition: 'all 0.3s ease',
                          }}
                        >
                          <Card.Body className="p-3 p-sm-4">
                            {/* Post Header */}
                            <div
                              className="d-flex align-items-start justify-content-between mb-3 post-header"
                              style={{ cursor: 'pointer' }}
                              onClick={() => router.push(`/posts/${post.id}`)}
                            >
                              <div className="d-flex align-items-center flex-grow-1">
                                <div className="rounded-circle bg-primary bg-opacity-10 p-2 me-3">
                                  {getPostIcon(post.postType)}
                                </div>
                                <div className="flex-grow-1">
                                  <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                                    <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>
                                      <span className="post-title-hover">
                                        {post.title}
                                      </span>
                                    </h6>
                                    {isScamReport && (
                                      <Badge
                                        className="rounded-pill d-flex align-items-center px-2 py-1 post-badge"
                                        style={{
                                          backgroundColor: hasEvidence ? "#10B981" : "#6B7280",
                                          color: '#fff',
                                          fontSize: '0.75rem'
                                        }}
                                      >
                                        {hasVideos ? (
                                          <>
                                            <FaVideo className="me-1" size={10} />
                                            <span>Video Evidence</span>
                                          </>
                                        ) : (
                                          <>
                                            <FaEyeSlash className="me-1" size={10} />
                                            <span>{hasEvidence ? "Evidence Provided" : "No Evidence"}</span>
                                          </>
                                        )}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="d-flex align-items-center flex-wrap gap-2">
                                    <small className="text-muted">
                                      By <span className="fw-medium">{post.user?.displayName || "Anonymous"}</span>
                                    </small>
                                    {location && (
                                      <>
                                        <span className="text-muted">•</span>
                                        <div className="d-flex align-items-center">
                                          <FaMapMarkerAlt className="me-1 text-success" size={12} />
                                          <span className="text-success fw-medium" style={{ fontSize: '0.875rem' }}>
                                            {location}
                                          </span>
                                        </div>
                                      </>
                                    )}
                                    <span className="text-muted">•</span>
                                    <small className="text-muted">
                                      {formatDate(post.createdAt)}
                                    </small>
                                  </div>
                                </div>
                              </div>
                              <div className="post-badge">
                                {getPostBadge(post.postType)}
                              </div>
                            </div>

                            {/* Post Content */}
                            <div
                              className="mb-4 post-content"
                              style={{ cursor: 'pointer' }}
                              onClick={() => router.push(`/posts/${post.id}`)}
                            >
                              <p className="text-muted mb-3" style={{
                                lineHeight: '1.6',
                                fontSize: '0.95rem'
                              }}>
                                {truncateText(post.description)}
                              </p>

                              {/* Render Media Gallery (Images & Videos) */}
                              {post.evidences && post.evidences.length > 0 && (
                                <MediaGallery 
                                  media={post.evidences}
                                  postId={post.id}
                                  isExpanded={expandedPosts[post.id] || false}
                                  onToggleExpand={() => toggleImageGallery(post.id)}
                                />
                              )}

                              {/* Additional Scam Report Info */}
                              {post.postType === "SCAM_REPORT" && (
                                <div className="scam-report-details mt-3 p-3 rounded-3" style={{
                                  backgroundColor: 'rgba(220, 53, 69, 0.05)',
                                  borderLeft: '3px solid #dc3545'
                                }}>
                                  <div className="row">
                                    {post.lostAmount && (
                                      <div className="col-sm-6 mb-2">
                                        <small className="text-muted d-block">Amount Lost</small>
                                        <span className="fw-bold text-danger">
                                          {post.currency} {post.lostAmount}
                                        </span>
                                      </div>
                                    )}
                                    {post.incidentDate && (
                                      <div className="col-sm-6 mb-2">
                                        <small className="text-muted d-block">Incident Date</small>
                                        <span className="fw-bold">
                                          {new Date(post.incidentDate).toLocaleDateString()}
                                        </span>
                                      </div>
                                    )}
                                    {post.companyNameManual && (
                                      <div className="col-12 mb-2">
                                        <small className="text-muted d-block">Company Involved</small>
                                        <span className="fw-bold">{post.companyNameManual}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="d-flex align-items-center text-primary fw-medium small mt-3">
                                <span>Read full post</span>
                                <FaArrowRight className="ms-2" size={12} />
                              </div>
                            </div>

                            {/* Post Stats */}
                            <div className="d-flex justify-content-between text-muted small mb-3">
                              <div className="d-flex align-items-center">
                                <FaThumbsUp className="me-1" />
                                <span>{reactionCount} reactions</span>
                              </div>
                              <div className="d-flex align-items-center">
                                <FaComment className="me-1" />
                                <span>{commentCount} comments</span>
                              </div>
                              <div className="d-flex align-items-center">
                                <FaShare className="me-1" />
                                <span>{post._count?.shares || 0} shares</span>
                              </div>
                            </div>

                            {/* Post Actions */}
                            <div className="d-flex justify-content-between align-items-center border-top pt-3">
                              <div className="d-flex gap-3">
                                <Button
                                  variant="link"
                                  className="text-decoration-none p-0 d-flex align-items-center gap-2 post-action-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleReaction(post.id, "like");
                                  }}
                                  style={{ color: userHasReacted ? '#dc3545' : '#6c757d' }}
                                >
                                  <FaHeart />
                                  <span>Like</span>
                                </Button>
                                <Button
                                  variant="link"
                                  className="text-decoration-none p-0 d-flex align-items-center gap-2 post-action-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleComments(post.id);
                                  }}
                                >
                                  <FaComment />
                                  <span>Comment</span>
                                </Button>
                                <Button
                                  variant="link"
                                  className="text-decoration-none p-0 d-flex align-items-center gap-2 post-action-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(`${window.location.origin}/posts/${post.id}`)
                                      .then(() => toast.success("Link copied!"))
                                      .catch(() => toast.error("Failed to copy"));
                                  }}
                                >
                                  <FaShare />
                                  <span>Share</span>
                                </Button>
                              </div>
                              <Button
                                variant="link"
                                className="text-decoration-none p-0 post-action-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBookmark(post.id);
                                }}
                                style={{ color: post.isBookmarked ? '#ffc107' : '#6c757d' }}
                              >
                                <FaBookmark />
                              </Button>
                            </div>

                            {/* Comments Section - Inline with Sorting and Pagination */}
                            {renderCommentsSection(post)}
                          </Card.Body>
                        </Card>
                      );
                    })}
                  </div>

                  {hasMore && sortedPosts.length > 0 && (
                    <div className="text-center mt-4">
                      <Button
                        variant="outline-primary"
                        className="rounded-pill px-4 py-2"
                        onClick={loadMorePosts}
                        disabled={loadingMore}
                      >
                        {loadingMore ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Loading...
                          </>
                        ) : (
                          <>
                            Load More
                            <FaChevronRight className="ms-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </Col>

          {/* Right Sidebar - FIXED FROM THE START */}
          <Col lg={4} className="mb-4">
            <div 
              className="sidebar-container fixed-sidebar"
              style={{
                position: 'sticky',
                top: '20px',
                maxHeight: 'calc(100vh - 40px)',
                overflowY: 'auto',
                paddingRight: '10px'
              }}
            >
              <Card className="trending-topics-card mb-4 border-0 shadow-sm rounded-4">
                <Card.Header className="border-0 pb-2 bg-light">
                  <h6 className="mb-0 fw-bold">
                    <FaHashtag className="me-2 text-primary" />
                    Trending Topics
                  </h6>
                </Card.Header>
                <Card.Body className="p-3">
                  {trendingTopics.map((topic, index) => (
                    <div
                      key={index}
                      className="d-flex align-items-center p-2 p-sm-3 rounded-3 mb-2 hover-light"
                      onClick={() => router.push(`/search?q=${encodeURIComponent(topic.tag)}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="fw-bold" style={{ fontSize: '0.95rem' }}>{topic.tag}</span>
                          <Badge 
                            bg={topic.trend === "up" ? "success" : 
                                topic.trend === "down" ? "danger" : "secondary"}
                            className="fw-medium rounded-pill px-2 py-1"
                          >
                            {topic.trend === "up" ? <FaArrowUp className="me-1" size={10} /> :
                             topic.trend === "down" ? <FaArrowDown className="me-1" size={10} /> :
                             <FaMinus className="me-1" size={10} />}
                            {topic.change}
                          </Badge>
                        </div>
                        <small className="text-muted">
                          {topic.posts} posts
                        </small>
                      </div>
                    </div>
                  ))}
                </Card.Body>
              </Card>

              <Card className="border-0 shadow-sm rounded-4 mb-4">
                <Card.Header className="border-0 bg-light">
                  <h6 className="mb-0 fw-bold">
                    <FaChartLine className="me-2 text-primary" />
                    Community Statistics
                  </h6>
                </Card.Header>
                <Card.Body className="p-3">
                  <Row className="g-3">
                    {statsData.map((stat, index) => (
                      <Col key={index} xs={6} className="mb-2">
                        <div className="stat-item p-3 rounded-3">
                          <div className={`stat-icon bg-${stat.color} bg-opacity-10 rounded-circle p-2 mb-2 d-inline-flex`}>
                            <span className={`text-${stat.color}`}>
                              {stat.icon}
                            </span>
                          </div>
                          <div className="stat-value h5 mb-0 fw-bold">{stat.value}</div>
                          <div className="stat-label small text-muted">{stat.label}</div>
                          <Badge
                            bg={`${stat.color}`}
                            className="fw-medium small rounded-pill px-2 mt-2"
                          >
                            {stat.change}
                          </Badge>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </Card.Body>
              </Card>

              {/* Group Stats Card */}
              {feed.some(post => post.group) && (
                <Card className="border-0 shadow-sm rounded-4 mb-4">
                  <Card.Header className="border-0 bg-light">
                    <h6 className="mb-0 fw-bold">
                      <FaUsers className="me-2 text-primary" />
                      Group Posts in Feed
                    </h6>
                  </Card.Header>
                  <Card.Body className="p-3">
                    <div className="group-stats">
                      {feed
                        .filter(post => post.group)
                        .reduce((groups, post) => {
                          const groupId = post.group.id;
                          if (!groups[groupId]) {
                            groups[groupId] = {
                              ...post.group,
                              count: 0
                            };
                          }
                          groups[groupId].count++;
                          return groups;
                        }, {})
                      && Object.values(
                        feed
                          .filter(post => post.group)
                          .reduce((groups, post) => {
                            const groupId = post.group.id;
                            if (!groups[groupId]) {
                              groups[groupId] = {
                                ...post.group,
                                count: 0
                              };
                            }
                            groups[groupId].count++;
                            return groups;
                          }, {})
                      ).map(group => (
                        <div 
                          key={group.id}
                          className="d-flex align-items-center justify-content-between p-2 rounded-3 mb-2 hover-light"
                          onClick={() => router.push(`/groups/${group.slug || group.id}`)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="d-flex align-items-center">
                            <FaUsers className="me-2 text-info" />
                            <div>
                              <div className="fw-medium small">{group.name}</div>
                              <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                {group.memberCount} members • {group.count} posts
                              </div>
                            </div>
                          </div>
                          <FaChevronRight size={12} className="text-muted" />
                        </div>
                      ))}
                    </div>
                  </Card.Body>
                </Card>
              )}

              {/* Share Your Experience Card - Fixed position */}
              <Card className="border-0 shadow-sm rounded-4 share-experience-card">
                <Card.Body className="p-4 text-center">
                  <div className="mb-3">
                    <FaGlobe className="text-primary" size={48} />
                  </div>
                  <h6 className="fw-bold mb-3">Share Your Experience</h6>
                  <p className="text-muted small mb-4">
                    Help others by sharing scam reports, awareness tips, or asking questions
                  </p>
                  <Button
                    variant="primary"
                    className="rounded-pill w-100"
                    onClick={() => router.push("/report")}
                  >
                    <FaPlus className="me-2" />
                    Create New Post
                  </Button>
                </Card.Body>
              </Card>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={handleDeleteCancel} centered>
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
          <Button variant="secondary" onClick={handleDeleteCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            <FaTrash className="me-2" />
            Delete Comment
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Report Comment Modal */}
      <ReportCommentModal
        show={showReportModal}
        onHide={handleReportCancel}
        onSubmit={handleReportSubmit}
        isSubmitting={submittingReport}
        isOwnComment={reportCommentData?.isOwnComment || false}
        alreadyReported={reportCommentData?.alreadyReported || false}
      />

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
          isSubmitting={submittingComment[pendingComment.postId]}
        />
      )}

      <style jsx>{`
        .feed-post-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1) !important;
        }
        
        .post-title-hover:hover {
          color: #667eea;
        }
        
        .hover-light:hover {
          background-color: rgba(0, 0, 0, 0.02);
          transform: translateY(-1px);
          transition: all 0.2s ease;
        }
        
        .post-action-button:hover {
          color: #667eea !important;
        }
        
        .stat-item {
          border-left: 3px solid transparent;
          transition: all 0.3s ease;
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
        }
        
        .stat-item:hover {
          border-left-color: var(--bs-primary);
          transform: translateX(5px);
        }
        
        .stat-icon {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .stat-value {
          color: #2d3748;
        }
        
        .scam-report-details {
          background: linear-gradient(135deg, rgba(220, 53, 69, 0.05) 0%, rgba(220, 53, 69, 0.02) 100%);
        }
        
        /* Enhanced Image Styles */
        .image-wrapper {
          position: relative;
          width: 100%;
          height: auto;
          overflow: hidden;
          background-color: #f8f9fa;
          border-radius: 12px;
        }
        
        .enhanced-image {
          width: 100% !important;
          height: auto !important;
          maxHeight: 500px;
          object-fit: contain !important;
          transition: opacity 0.3s ease;
        }
        
        .enhanced-image.loading {
          opacity: 0;
        }
        
        .enhanced-image.loaded {
          opacity: 1;
        }
        
        .image-loading {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
        
        .image-error {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }
        
        /* Media Gallery Styles */
        .media-gallery {
          display: grid;
          gap: 8px;
          grid-auto-rows: 1fr;
        }
        
        .media-gallery.single-media {
          grid-template-columns: 1fr;
        }
        
        .media-gallery.two-media {
          grid-template-columns: 1fr 1fr;
        }
        
        .media-gallery.three-media {
          grid-template-columns: repeat(2, 1fr);
        }
        
        .media-gallery.three-media .media-container:first-child {
          grid-column: span 2;
          grid-row: span 2;
        }
        
        .media-gallery.multiple-media {
          grid-template-columns: repeat(2, 1fr);
        }
        
        @media (min-width: 768px) {
          .media-gallery.three-media,
          .media-gallery.multiple-media {
            grid-template-columns: repeat(2, 1fr);
          }
          
          .media-gallery.multiple-media .media-container {
            min-height: 200px;
          }
        }
        
        .media-container {
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          background-color: #000;
        }
        
        .gallery-item {
          aspect-ratio: 1/1;
        }
        
        .gallery-item .enhanced-image,
        .gallery-item video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        /* Video Player Styles */
        .video-player-container {
          background-color: #000;
          width: 100%;
          height: auto;
          min-height: 200px;
          position: relative;
        }
        
        .video-player-container video {
          width: '100%';
          height: 'auto';
          maxHeight: 500px;
          object-fit: 'contain';
          backgroundColor: '#000';
        }
        
        .video-overlay {
          background: linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.4));
          cursor: pointer;
        }
        
        .play-button {
          cursor: pointer;
          transition: transform 0.3s ease;
        }
        
        .play-button:hover {
          transform: scale(1.1);
        }
        
        .volume-slider {
          -webkit-appearance: none;
          appearance: none;
          width: 100%;
          height: 4px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 2px;
          outline: none;
        }
        
        .volume-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          cursor: pointer;
        }
        
        .video-controls {
          opacity: 1;
          transition: opacity 0.3s ease;
        }
        
        .video-controls:not(:hover) {
          opacity: 0.9;
        }
        
        /* Fixed Sidebar Styles */
        .fixed-sidebar {
          transition: all 0.3s ease;
        }
        
        .fixed-sidebar::-webkit-scrollbar {
          width: 6px;
        }
        
        .fixed-sidebar::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        .fixed-sidebar::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        
        .fixed-sidebar::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* Comments Section Styles */
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
        
        .rotate-90 {
          transform: rotate(90deg);
          transition: transform 0.3s ease;
        }
        
        .transition-transform {
          transition: transform 0.3s ease;
        }
        
        /* Comments List Scrollbar Styling */
        .comments-list::-webkit-scrollbar {
          width: 6px;
        }
        
        .comments-list::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        .comments-list::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        
        .comments-list::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
        
        /* Enhanced Comment Reaction Button Styles */
        .comment-reaction-btn {
          position: relative;
          cursor: pointer;
          border: none;
          background: none;
          padding: 6px 10px;
          border-radius: 20px;
          transition: all 0.2s ease;
        }
        
        .comment-reaction-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
          transform: scale(1.05) !important;
        }
        
        .comment-reaction-btn.active {
          font-weight: 600;
        }
        
        .comment-reaction-btn:active {
          transform: scale(0.95) !important;
        }
        
        /* Context Menu Button Styles */
        .comment-menu-btn {
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 50%;
        }
        
        .comment-menu-btn:hover {
          background-color: rgba(0, 0, 0, 0.1) !important;
          transform: scale(1.1);
        }
        
        .comment-menu-btn:active {
          transform: scale(0.95);
        }
        
        .comment-menu-btn:focus {
          box-shadow: none !important;
          outline: none !important;
        }
        
        /* Dropdown Menu Improvements */
        .dropdown-menu {
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-radius: 8px;
          padding: 0.5rem 0;
          min-width: 200px;
        }
        
        .dropdown-item {
          padding: 0.6rem 1rem;
          transition: all 0.2s ease;
        }
        
        .dropdown-item:hover {
          background-color: rgba(0, 0, 0, 0.05);
        }
        
        .dropdown-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        /* Tooltip enhancement */
        .comment-reaction-btn[title]:hover::before {
          content: attr(title);
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background-color: #333;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 11px;
          white-space: nowrap;
          margin-bottom: 5px;
          z-index: 1000;
          opacity: 0;
          animation: tooltipFadeIn 0.2s ease forwards;
        }
        
        @keyframes tooltipFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-5px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        
        .comment-action-btn {
          cursor: pointer;
          border: none;
          background: none;
          padding: 6px 10px;
          border-radius: 20px;
        }
        
        .comment-action-btn:hover {
          background-color: rgba(0, 0, 0, 0.05);
          color: #667eea !important;
        }
        
        /* Pulse animation for active reactions */
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
        
        .comment-reaction-btn.active:active {
          animation: reactionPulse 0.3s ease;
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
      `}</style>

      <style jsx global>{`
        .media-container img {
          transition: transform 0.3s ease !important;
        }
        
        .media-container:hover img {
          transform: scale(1.02) !important;
        }
        
        .post-action-button,
        .post-badge,
        .image-container,
        .image-container * {
          cursor: pointer !important;
        }
        
        .post-header:hover,
        .post-content:hover {
          background-color: rgba(0, 0, 0, 0.01);
          border-radius: 0.5rem;
          transition: background-color 0.2s ease;
        }
        
        /* Fullscreen video styles */
        video:-webkit-full-screen {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain !important;
        }
        
        video:-moz-full-screen {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain !important;
        }
        
        video:-ms-fullscreen {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain !important;
        }
        
        video:fullscreen {
          width: 100% !important;
          height: 100% !important;
          object-fit: contain !important;
        }
        
        /* Prevent images from being blurry */
        img {
          image-rendering: -webkit-optimize-contrast;
          image-rendering: crisp-edges;
        }
        
        /* Smooth video transitions */
        video {
          will-change: transform;
          backface-visibility: hidden;
          transform: translateZ(0);
        }
        
        /* Custom scrollbar for fixed sidebar */
        .fixed-sidebar {
          scrollbar-width: thin;
          scrollbar-color: #c1c1c1 #f1f1f1;
        }
      `}</style>
    </DashboardLayout>
  );
}