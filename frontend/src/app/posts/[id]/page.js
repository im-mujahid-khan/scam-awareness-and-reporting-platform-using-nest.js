// app/posts/[id]/page.js - UPDATED VERSION WITH VIDEO PLAYER
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
  Carousel,
  ListGroup,
  Modal,
  Form,
  OverlayTrigger,
  Tooltip,
  Dropdown,
} from "react-bootstrap";
import {
  FaGlobe,
  FaNewspaper,
  FaComment,
  FaShare,
  FaHeart,
  FaCalendar,
  FaUser,
  FaTag,
  FaRegBookmark,
  FaArrowLeft,
  FaExternalLinkAlt,
  FaDownload,
  FaCopy,
  FaExclamationTriangle,
  FaFileAlt,
  FaBookmark as FaSolidBookmark,
  FaHeart as FaSolidHeart,
  FaChartBar,
  FaUsers,
  FaCheck,
  FaTimes,
  FaFlag,
  FaEye,
  FaStar,
  FaThumbsUp,
  FaThumbsDown,
  FaFile,
  FaLink,
  FaMapMarkerAlt,
  FaMoneyBillWave,
  FaBuilding,
  FaClock,
  FaEyeSlash,
  FaShieldAlt,
  FaExpand,
  FaChevronLeft,
  FaChevronRight,
  FaImages,
  FaCheckCircle,
  FaVideo,
  FaPlay,
  FaPause,
  FaVolumeUp,
  FaVolumeMute,
  FaPlayCircle,
  FaReply,
  FaEdit,
  FaTrash,
  FaEllipsisV,
  FaUserFriends,
  FaPlus,
  FaFilter,
  FaHashtag,
  FaArrowUp,
  FaArrowDown,
  FaMinus,
  FaArrowRight,
  FaBookmark,
  FaRegHeart,
  FaRegComment,
} from "react-icons/fa";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../../../../lib/contexts/AuthContext";
import { toast } from "react-toastify";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import ReactMarkdown from 'react-markdown';

// =====================================================================
// 🎯 DETAIL VIDEO PLAYER COMPONENT
// =====================================================================
const DetailVideoPlayer = ({ src, poster, alt }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);
    const handleWaiting = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);

    // Handle fullscreen changes
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
    }
  };

  const handleSeek = (e) => {
    if (videoRef.current && duration) {
      const seekTime = (e.target.value / 100) * duration;
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = e.target.value / 100;
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
      if (!isMuted) {
        setVolume(0);
      } else {
        setVolume(1);
        videoRef.current.volume = 1;
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      } else if (containerRef.current.webkitRequestFullscreen) {
        containerRef.current.webkitRequestFullscreen();
      } else if (containerRef.current.msRequestFullscreen) {
        containerRef.current.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  const changePlaybackRate = (rate) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setPlaybackRate(rate);
    }
  };

  const formatTime = (time) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleVideoClick = () => {
    togglePlay();
  };

  return (
    <div 
      ref={containerRef}
      className="video-player-container rounded-3 overflow-hidden position-relative"
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => {
        if (!isFullscreen && isPlaying) {
          setTimeout(() => setShowControls(false), 2000);
        }
      }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        alt={alt}
        className="w-100 h-auto"
        onClick={handleVideoClick}
        style={{
          maxHeight: '500px',
          objectFit: 'contain',
          backgroundColor: '#000',
        }}
      />

      {/* Loading Spinner */}
      {isLoading && (
        <div className="position-absolute top-50 start-50 translate-middle">
          <Spinner animation="border" variant="light" />
        </div>
      )}

      {/* Play/Pause Overlay */}
      {!isPlaying && !isLoading && (
        <div 
          className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center video-overlay"
          onClick={togglePlay}
          style={{
            background: 'linear-gradient(to bottom, rgba(0,0,0,0.2), rgba(0,0,0,0.4))',
            cursor: 'pointer'
          }}
        >
          <div className="play-button">
            <FaPlayCircle size={64} className="text-white opacity-75" />
          </div>
        </div>
      )}

      {/* Video Controls */}
      <div 
        className={`position-absolute bottom-0 start-0 w-100 p-3 video-controls ${showControls ? 'opacity-100' : 'opacity-0'}`}
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)',
          transition: 'opacity 0.3s ease'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar */}
        <div className="mb-2">
          <input
            type="range"
            min="0"
            max="100"
            value={duration ? (currentTime / duration) * 100 : 0}
            onChange={handleSeek}
            className="w-100"
            style={{
              height: '4px',
              borderRadius: '2px',
              background: `linear-gradient(to right, #0d6efd ${(currentTime / duration) * 100}%, rgba(255,255,255,0.3) ${(currentTime / duration) * 100}%)`,
              WebkitAppearance: 'none',
              appearance: 'none',
            }}
          />
          <div className="d-flex justify-content-between text-white small mt-1">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            {/* Play/Pause */}
            <Button
              variant="light"
              size="sm"
              className="rounded-circle p-2"
              onClick={togglePlay}
            >
              {isPlaying ? <FaPause size={14} /> : <FaPlay size={14} />}
            </Button>

            {/* Volume Control */}
            <div className="d-flex align-items-center gap-2">
              <Button
                variant="light"
                size="sm"
                className="rounded-circle p-2"
                onClick={toggleMute}
              >
                {isMuted || volume === 0 ? <FaVolumeMute size={14} /> : <FaVolumeUp size={14} />}
              </Button>
              <input
                type="range"
                min="0"
                max="100"
                value={volume * 100}
                onChange={handleVolumeChange}
                className="volume-slider"
                style={{ width: '80px' }}
              />
            </div>

            {/* Playback Speed */}
            <Dropdown align="start">
              <Dropdown.Toggle
                variant="light"
                size="sm"
                className="rounded-pill px-3"
              >
                {playbackRate}x
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                  <Dropdown.Item
                    key={rate}
                    onClick={() => changePlaybackRate(rate)}
                    active={playbackRate === rate}
                  >
                    {rate}x
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          </div>

          <div className="d-flex align-items-center gap-2">
            {/* Fullscreen */}
            <Button
              variant="light"
              size="sm"
              className="rounded-circle p-2"
              onClick={toggleFullscreen}
            >
              <FaExpand size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function PostDetailPage() {
  const { user, api } = useAuth();
  const router = useRouter();
  const params = useParams();
  const postId = params?.id;

  const [loading, setLoading] = useState(true);
  const [post, setPost] = useState(null);
  const [relatedPosts, setRelatedPosts] = useState([]);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const [selectedEvidence, setSelectedEvidence] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [reactionCount, setReactionCount] = useState(0);
  const [userReaction, setUserReaction] = useState(null);
  const [loadingRelated, setLoadingRelated] = useState(false);
  const [imageEvidence, setImageEvidence] = useState([]);
  const [videoEvidence, setVideoEvidence] = useState([]);
  const [isBookmarked, setIsBookmarked] = useState(false);

  // Reaction types mapping
  const reactionTypes = {
    LIKE: { icon: <FaThumbsUp />, label: "Like", color: "primary" },
    DISLIKE: { icon: <FaThumbsDown />, label: "Dislike", color: "secondary" },
  };

  useEffect(() => {
    if (postId) {
      loadPostDetails();
      loadRelatedPosts();
    }
  }, [postId]);

  const loadPostDetails = async () => {
    try {
      setLoading(true);

      const response = await api.request(`/api/v1/posts/${postId}`);
      const postData = response;

      // Format location from post data
      const formatLocation = (data) => {
        const { country, region, city } = data;
        if (!country && !region && !city) return null;
        const parts = [];
        if (city) parts.push(city);
        if (region) parts.push(region);
        if (country) parts.push(country);
        return parts.join(', ');
      };

      const location = formatLocation(postData);

      // Extract scam type name (handle both string and object)
      const getScamTypeName = (scamType) => {
        if (!scamType) return null;
        if (typeof scamType === 'string') return scamType;
        if (typeof scamType === 'object' && scamType !== null) {
          return scamType.name || scamType.label || null;
        }
        return null;
      };

      // Extract company name (handle both string and object)
      const getCompanyName = (company) => {
        if (!company) return null;
        if (typeof company === 'string') return company;
        if (typeof company === 'object' && company !== null) {
          return company.name || company.companyName || company.companyNameManual || null;
        }
        return null;
      };

      const scamTypeName = getScamTypeName(postData.scamType);
      const companyName = getCompanyName(postData.company) || postData.companyNameManual;

      // Check if evidence exists
      const hasEvidence = postData.evidences && postData.evidences.length > 0;
      const imageEvidence = postData.evidences?.filter(evidence =>
        evidence.evidenceType === "IMAGE" && evidence.fileUrl
      ) || [];
      
      const videoEvidence = postData.evidences?.filter(evidence =>
        evidence.evidenceType === "VIDEO" && evidence.fileUrl
      ) || [];

      // Create consolidated badges array
      const consolidatedBadges = [];

      // Add post type badge
      const postType = postData.category || postData.postType || "POST";
      if (postType) {
        consolidatedBadges.push({
          id: `badge-posttype-${postData.id}`,
          type: "POST_TYPE",
          label: getPostBadgeLabel(postType),
          color: getPostBadgeColor(postType),
          icon: getPostBadgeIcon(postType)
        });
      }

      // Add evidence badge if it's a scam report
      if (postType === "SCAM_REPORT") {
        consolidatedBadges.push({
          id: `badge-evidence-${postData.id}`,
          type: "EVIDENCE",
          label: hasEvidence ? "Evidence Provided" : "No Evidence",
          color: hasEvidence ? "#10B981" : "#6B7280",
          icon: hasEvidence ? <FaCheck /> : <FaEyeSlash />
        });
      }

      // Add video badge if videos exist
      if (videoEvidence.length > 0) {
        consolidatedBadges.push({
          id: `badge-video-${postData.id}`,
          type: "VIDEO",
          label: `${videoEvidence.length} Video${videoEvidence.length > 1 ? 's' : ''}`,
          color: "#dc3545",
          icon: <FaVideo />
        });
      }

      // Add status badge
      if (postData.status) {
        consolidatedBadges.push({
          id: `badge-status-${postData.id}`,
          type: "STATUS",
          label: getStatusBadgeLabel(postData.status),
          color: getStatusBadgeColor(postData.status),
          icon: getStatusBadgeIcon(postData.status)
        });
      }

      // Add any additional badges from API
      if (postData.badges && Array.isArray(postData.badges)) {
        postData.badges.forEach(badge => {
          consolidatedBadges.push({
            id: badge.id || `badge-${Math.random()}`,
            type: badge.badgeType || "CUSTOM",
            label: badge.label || "Badge",
            color: badge.color || "#6c757d",
            icon: badge.icon || null
          });
        });
      }

      // Process the post data
      const processedPost = {
        ...postData,
        id: postData.id || postId,
        evidences: postData.evidences || [],
        imageEvidence: imageEvidence,
        videoEvidence: videoEvidence,
        tags: postData.tags || [],
        reactionCount: postData._count?.reactions || postData.reactionCount || 0,
        commentCount: postData._count?.comments || postData.commentCount || 0,
        shareCount: postData._count?.shares || postData.shareCount || 0,
        postType: postType,
        status: postData.status || "PUBLISHED",
        createdAt: postData.createdAt || new Date().toISOString(),
        updatedAt: postData.updatedAt || postData.createdAt || new Date().toISOString(),
        user: postData.user || postData.author || {
          displayName: "Anonymous",
          id: "unknown",
          avatarUrl: null
        },
        location: location,
        scamType: scamTypeName,
        lostAmount: postData.lostAmount || null,
        currency: postData.currency || null,
        incidentDate: postData.incidentDate || null,
        company: companyName,
        badges: consolidatedBadges,
        hasEvidence: hasEvidence,
        groupPostId: postData.groupPostId || null,
        isBookmarked: postData.isBookmarked || false,
      };

      console.log("Processed post data:", processedPost);

      setPost(processedPost);
      setImageEvidence(imageEvidence);
      setVideoEvidence(videoEvidence);
      setReactionCount(processedPost.reactionCount);
      setIsBookmarked(processedPost.isBookmarked || false);

      if (user) {
        checkUserReaction();
      }

    } catch (error) {
      console.error("Failed to load post details:", error);

      if (error.message?.includes("404")) {
        toast.error("Post not found or has been removed");
        setPost(null);
      } else {
        toast.error("Failed to load post details. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for badges
  const getPostBadgeLabel = (postType) => {
    switch (postType.toUpperCase()) {
      case "SCAM_REPORT": return "Scam Report";
      case "SCAM_AWARENESS": return "Scam Awareness";
      case "QUESTION": return "Question";
      default: return "Post";
    }
  };

  const getPostBadgeColor = (postType) => {
    switch (postType.toUpperCase()) {
      case "SCAM_REPORT": return "#dc3545";
      case "SCAM_AWARENESS": return "#ffc107";
      case "QUESTION": return "#0d6efd";
      default: return "#6c757d";
    }
  };

  const getPostBadgeIcon = (postType) => {
    switch (postType.toUpperCase()) {
      case "SCAM_REPORT": return <FaExclamationTriangle />;
      case "SCAM_AWARENESS": return <FaShieldAlt />;
      case "QUESTION": return <FaComment />;
      default: return <FaNewspaper />;
    }
  };

  const getStatusBadgeLabel = (status) => {
    switch (status.toUpperCase()) {
      case "PUBLISHED":
      case "ACTIVE": return "Active";
      case "UNDER_REVIEW": return "Under Review";
      case "RESOLVED": return "Resolved";
      case "CLOSED": return "Closed";
      default: return status;
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status.toUpperCase()) {
      case "PUBLISHED":
      case "ACTIVE": return "#198754";
      case "UNDER_REVIEW": return "#ffc107";
      case "RESOLVED": return "#0dcaf0";
      case "CLOSED": return "#6c757d";
      default: return "#6c757d";
    }
  };

  const getStatusBadgeIcon = (status) => {
    switch (status.toUpperCase()) {
      case "PUBLISHED":
      case "ACTIVE": return <FaCheck />;
      case "UNDER_REVIEW": return <FaClock />;
      case "RESOLVED": return <FaCheckCircle />;
      case "CLOSED": return <FaTimes />;
      default: return <FaStar />;
    }
  };

  const checkUserReaction = async () => {
    if (!user || !postId) return;

    try {
      const response = await api.request(`/api/v1/posts/${postId}/my-reaction`);
      if (response && response.type) {
        setUserReaction(response.type);
      }
    } catch (error) {
      console.log("No reaction found or endpoint not available");
    }
  };

  const loadRelatedPosts = async () => {
    try {
      setLoadingRelated(true);

      const response = await api.request(`/api/v1/posts/related/${postId}`);
      const relatedData = response || [];

      const processedRelated = relatedData.slice(0, 3).map(post => ({
        id: post.id,
        title: post.title,
        user: post.user || { displayName: "Anonymous" },
        createdAt: post.createdAt,
        _count: {
          reactions: post._count?.reactions || 0
        }
      }));

      setRelatedPosts(processedRelated);
    } catch (error) {
      console.error("Failed to load related posts:", error);
    } finally {
      setLoadingRelated(false);
    }
  };

  const handlePostReaction = async (type = "LIKE") => {
    if (!user) {
      toast.error("Please login to react to posts");
      return;
    }

    try {
      const response = await api.request(`/api/v1/posts/${postId}/reactions`, {
        method: 'POST',
        body: JSON.stringify({ type })
      });

      if (response.action === 'added') {
        setUserReaction(type);
        setReactionCount(prev => prev + 1);
        toast.success(`Reacted with ${type.toLowerCase()}`);
      } else if (response.action === 'removed') {
        setUserReaction(null);
        setReactionCount(prev => prev - 1);
        toast.info("Reaction removed");
      } else if (response.action === 'changed') {
        setUserReaction(type);
        toast.success(`Changed reaction to ${type.toLowerCase()}`);
      }

    } catch (error) {
      console.error("Failed to update reaction:", error);

      if (userReaction === type) {
        setUserReaction(null);
        setReactionCount(prev => prev - 1);
      } else if (userReaction) {
        setUserReaction(type);
      } else {
        setUserReaction(type);
        setReactionCount(prev => prev + 1);
      }

      toast.error("Failed to update reaction. Changes are local only.");
    }
  };

  const handleBookmark = async () => {
    if (!user) {
      toast.error("Please login to bookmark posts");
      return;
    }

    try {
      const response = await api.request(`/api/v1/posts/${postId}/bookmarks`, {
        method: 'POST'
      });

      if (response.action === 'added') {
        setIsBookmarked(true);
        toast.success("Post bookmarked!");
      } else if (response.action === 'removed') {
        setIsBookmarked(false);
        toast.success("Bookmark removed!");
      }
    } catch (error) {
      console.error("Failed to toggle bookmark:", error);
      setIsBookmarked(!isBookmarked);
      toast.error("Failed to update bookmark. Changes are local only.");
    }
  };

  const handleShare = () => {
    const postUrl = `${window.location.origin}/posts/${postId}`;
    navigator.clipboard.writeText(postUrl)
      .then(() => toast.success("Link copied to clipboard!"))
      .catch(() => toast.error("Failed to copy link"));
  };

  const handleReport = async (type, id, contentType = 'post') => {
    if (!user) {
      toast.error("Please login to report content");
      return;
    }

    try {
      let endpoint = '';
      if (contentType === 'post') {
        endpoint = `/api/v1/posts/${id}/reports`;
      } else if (contentType === 'comment') {
        endpoint = `/api/v1/comments/${id}/reports`;
      }

      await api.request(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          reason: type,
          details: `Reported ${contentType}`
        }),
      });

      toast.success(`${contentType.charAt(0).toUpperCase() + contentType.slice(1)} reported successfully`);
    } catch (error) {
      console.error(`Failed to report ${contentType}:`, error);
      toast.error(`Failed to report ${contentType}`);
    }
  };

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return "Unknown date";
    }
  };

  const getEvidenceIcon = (type) => {
    switch (type?.toUpperCase()) {
      case "IMAGE":
      case "SCREENSHOT":
        return <FaImages className="text-primary" size={24} />;
      case "VIDEO":
        return <FaVideo className="text-danger" size={24} />;
      case "LINK":
      case "URL":
        return <FaLink className="text-info" size={24} />;
      case "TEXT":
        return <FaFileAlt className="text-success" size={24} />;
      case "DOCUMENT":
      case "FILE":
        return <FaFile className="text-warning" size={24} />;
      default:
        return <FaFile className="text-secondary" size={24} />;
    }
  };

  const handleOpenImageGallery = (evidence, index) => {
    setSelectedEvidence(evidence);
    setSelectedImageIndex(index);
    setShowEvidenceModal(true);
  };

  const renderVideoEvidence = () => {
    if (!videoEvidence || videoEvidence.length === 0) return null;

    return (
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-light border-0">
          <h6 className="mb-0 d-flex align-items-center">
            <FaVideo className="me-2 text-danger" />
            Video Evidence ({videoEvidence.length})
          </h6>
        </Card.Header>
        <Card.Body>
          {videoEvidence.length === 1 ? (
            // Single video - large display
            <div className="text-center">
              <DetailVideoPlayer
                src={videoEvidence[0].fileUrl}
                poster={videoEvidence[0].thumbnailUrl || "/video-thumbnail-placeholder.png"}
                alt={videoEvidence[0].fileName || "Video evidence"}
              />
              <div className="mt-2 text-muted small">
                <span>{videoEvidence[0].fileName}</span>
                <span className="ms-2">
                  {(videoEvidence[0].fileSize / (1024 * 1024)).toFixed(2)} MB
                </span>
              </div>
            </div>
          ) : (
            // Multiple videos - grid layout
            <Row>
              {videoEvidence.map((evidence, index) => (
                <Col key={evidence.id || index} md={6} className="mb-3">
                  <Card className="border h-100">
                    <div className="position-relative" style={{ height: '200px', overflow: 'hidden' }}>
                      <DetailVideoPlayer
                        src={evidence.fileUrl}
                        poster={evidence.thumbnailUrl || "/video-thumbnail-placeholder.png"}
                        alt={evidence.fileName || `Video ${index + 1}`}
                      />
                    </div>
                    <Card.Body className="p-3">
                      <small className="d-block text-truncate fw-medium">
                        {evidence.fileName || `Video ${index + 1}`}
                      </small>
                      <small className="text-muted">
                        {(evidence.fileSize / (1024 * 1024)).toFixed(2)} MB
                      </small>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderEvidenceSection = () => {
    if (!imageEvidence || imageEvidence.length === 0) return null;

    return (
      <Card className="border-0 shadow-sm mb-4">
        <Card.Header className="bg-light border-0">
          <h6 className="mb-0 d-flex align-items-center">
            <FaImages className="me-2 text-primary" />
            Image Evidence ({imageEvidence.length})
          </h6>
        </Card.Header>
        <Card.Body>
          {imageEvidence.length === 1 ? (
            // Single image - large display
            <div className="text-center">
              <div
                className="position-relative cursor-pointer"
                onClick={() => handleOpenImageGallery(imageEvidence[0], 0)}
              >
                <Image
                  src={imageEvidence[0].fileUrl}
                  alt={imageEvidence[0].fileName || "Evidence image"}
                  className="rounded-3 img-fluid"
                  style={{
                    maxHeight: '500px',
                    objectFit: 'contain'
                  }}
                />
                <div className="position-absolute top-0 end-0 m-3">
                  <Button
                    variant="light"
                    size="sm"
                    className="rounded-circle shadow-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenImageGallery(imageEvidence[0], 0);
                    }}
                  >
                    <FaExpand />
                  </Button>
                </div>
              </div>
              <div className="mt-2 text-muted small">
                <span>{imageEvidence[0].fileName}</span>
                <span className="ms-2">
                  {(imageEvidence[0].fileSize / 1024).toFixed(0)} KB
                </span>
              </div>
            </div>
          ) : imageEvidence.length === 2 ? (
            // Two images - side by side
            <Row>
              {imageEvidence.map((evidence, index) => (
                <Col key={evidence.id || index} md={6}>
                  <Card
                    className="border h-100 cursor-pointer hover-shadow"
                    onClick={() => handleOpenImageGallery(evidence, index)}
                  >
                    <div className="position-relative" style={{ height: '250px', overflow: 'hidden' }}>
                      <Image
                        src={evidence.fileUrl}
                        alt={evidence.fileName || `Evidence ${index + 1}`}
                        className="img-fluid rounded-top"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      <div className="position-absolute top-0 end-0 m-2">
                        <Button
                          variant="light"
                          size="sm"
                          className="rounded-circle"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenImageGallery(evidence, index);
                          }}
                        >
                          <FaExpand size={12} />
                        </Button>
                      </div>
                    </div>
                    <Card.Body className="p-3">
                      <small className="d-block text-truncate fw-medium">
                        {evidence.fileName || `Evidence ${index + 1}`}
                      </small>
                      <small className="text-muted">
                        {(evidence.fileSize / 1024).toFixed(0)} KB
                      </small>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          ) : (
            // Multiple images - grid layout
            <Row>
              {imageEvidence.slice(0, 4).map((evidence, index) => (
                <Col key={evidence.id || index} md={index < 3 ? 4 : 12}>
                  <Card
                    className="border h-100 cursor-pointer hover-shadow"
                    onClick={() => handleOpenImageGallery(evidence, index)}
                  >
                    <div
                      className="position-relative"
                      style={{
                        height: index === 3 && imageEvidence.length > 4 ? '100px' : '180px',
                        overflow: 'hidden'
                      }}
                    >
                      <Image
                        src={evidence.fileUrl}
                        alt={evidence.fileName || `Evidence ${index + 1}`}
                        className="img-fluid rounded-top"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                      {index === 3 && imageEvidence.length > 4 && (
                        <div className="position-absolute top-0 start-0 w-100 h-100 bg-dark bg-opacity-50 d-flex align-items-center justify-content-center">
                          <span className="text-white fw-bold">+{imageEvidence.length - 4} more</span>
                        </div>
                      )}
                      <div className="position-absolute top-0 end-0 m-2">
                        <Button
                          variant="light"
                          size="sm"
                          className="rounded-circle"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenImageGallery(evidence, index);
                          }}
                        >
                          <FaExpand size={12} />
                        </Button>
                      </div>
                    </div>
                    <Card.Body className="p-2">
                      <small className="d-block text-truncate fw-medium">
                        {evidence.fileName || `Evidence ${index + 1}`}
                      </small>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}

          {/* All other evidence types */}
          {post.evidences?.filter(e => e.evidenceType !== "IMAGE" && e.evidenceType !== "VIDEO").length > 0 && (
            <div className="mt-4">
              <h6 className="mb-3">Other Evidence</h6>
              <Row>
                {post.evidences
                  .filter(e => e.evidenceType !== "IMAGE" && e.evidenceType !== "VIDEO")
                  .map((evidence, index) => (
                    <Col key={evidence.id || index} md={6} className="mb-2">
                      <Card
                        className="border cursor-pointer"
                        onClick={() => {
                          setSelectedEvidence(evidence);
                          setShowEvidenceModal(true);
                        }}
                      >
                        <Card.Body className="p-3 d-flex align-items-center">
                          <div className="me-3">
                            {getEvidenceIcon(evidence.evidenceType)}
                          </div>
                          <div className="flex-grow-1">
                            <small className="fw-medium d-block">
                              {evidence.evidenceType || "Evidence"}
                            </small>
                            <small className="text-muted">
                              {evidence.fileName || evidence.description || "View details"}
                            </small>
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
              </Row>
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderBadges = () => {
    if (!post?.badges || post.badges.length === 0) return null;

    return (
      <div className="mb-4">
        <h6 className="mb-2 fw-medium text-muted">Badges:</h6>
        <div className="d-flex flex-wrap gap-2">
          {post.badges.map((badge) => (
            <Badge
              key={badge.id}
              style={{
                backgroundColor: badge.color,
                color: '#fff'
              }}
              className="rounded-pill px-3 py-2 d-flex align-items-center"
            >
              {badge.icon && <span className="me-2">{badge.icon}</span>}
              {badge.label}
            </Badge>
          ))}
        </div>
      </div>
    );
  };

  const renderScamReportDetails = () => {
    if (post.postType !== "SCAM_REPORT") return null;

    return (
      <Card className="border-0 shadow-sm mb-4" style={{ borderLeft: '4px solid #dc3545' }}>
        <Card.Header className="bg-light border-0">
          <h6 className="mb-0 d-flex align-items-center">
            <FaExclamationTriangle className="me-2 text-danger" />
            Scam Report Details
          </h6>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            {/* Location */}
            {post.location && (
              <Col md={6}>
                <div className="d-flex align-items-start mb-3">
                  <div className="rounded-circle bg-success bg-opacity-10 p-2 me-3">
                    <FaMapMarkerAlt className="text-success" />
                  </div>
                  <div>
                    <small className="text-muted d-block">Location</small>
                    <div className="fw-medium">{post.location}</div>
                  </div>
                </div>
              </Col>
            )}

            {/* Incident Date */}
            {post.incidentDate && (
              <Col md={6}>
                <div className="d-flex align-items-start mb-3">
                  <div className="rounded-circle bg-info bg-opacity-10 p-2 me-3">
                    <FaCalendar className="text-info" />
                  </div>
                  <div>
                    <small className="text-muted d-block">Incident Date</small>
                    <div className="fw-medium">
                      {new Date(post.incidentDate).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>
              </Col>
            )}

            {/* Amount Lost */}
            {post.lostAmount && (
              <Col md={6}>
                <div className="d-flex align-items-start mb-3">
                  <div className="rounded-circle bg-danger bg-opacity-10 p-2 me-3">
                    <FaMoneyBillWave className="text-danger" />
                  </div>
                  <div>
                    <small className="text-muted d-block">Amount Lost</small>
                    <div className="fw-medium text-danger">
                      {post.currency || "USD"} {parseFloat(post.lostAmount).toLocaleString()}
                    </div>
                  </div>
                </div>
              </Col>
            )}

            {/* Company Involved */}
            {post.company && (
              <Col md={6}>
                <div className="d-flex align-items-start mb-3">
                  <div className="rounded-circle bg-warning bg-opacity-10 p-2 me-3">
                    <FaBuilding className="text-warning" />
                  </div>
                  <div>
                    <small className="text-muted d-block">Company Involved</small>
                    <div className="fw-medium">{post.company}</div>
                  </div>
                </div>
              </Col>
            )}

            {/* Scam Type */}
            {post.scamType && (
              <Col md={6}>
                <div className="d-flex align-items-start mb-3">
                  <div className="rounded-circle bg-primary bg-opacity-10 p-2 me-3">
                    <FaTag className="text-primary" />
                  </div>
                  <div>
                    <small className="text-muted d-block">Scam Type</small>
                    <div className="fw-medium">
                      <Badge bg="primary" className="rounded-pill px-3">
                        {post.scamType}
                      </Badge>
                    </div>
                  </div>
                </div>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>
    );
  };

  if (loading) {
    return (
      <Container className="py-5">
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading post details...</p>
        </div>
      </Container>
    );
  }

  if (!post) {
    return (
      <Container className="py-5">
        <Alert variant="danger">
          <h5>Post Not Found</h5>
          <p>The post you're looking for doesn't exist or has been removed.</p>
          <Button variant="primary" onClick={() => router.push("/feed")}>
            Back to Feed
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-4 post-detail-page" style={{ maxWidth: '1200px' }}>
      {/* Back Button */}
      <div className="mb-4">
        <Button
          variant="light"
          className="rounded-pill border"
          onClick={() => router.back()}
          style={{ padding: '8px 16px' }}
        >
          <FaArrowLeft className="me-2" />
          Back to Feed
        </Button>
      </div>

      <Row className="g-4">
        {/* Main Content */}
        <Col lg={8}>
          {/* Post Header Card */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Body className="p-4">
              {/* Post Title */}
              <h1 className="mb-3 fw-bold" style={{ fontSize: '2rem', lineHeight: '1.2' }}>
                {post.title}
              </h1>

              {/* Author and Metadata */}
              <div className="d-flex align-items-center mb-4">
                <div className="d-flex align-items-center me-auto">
                  <div className="rounded-circle bg-primary bg-opacity-10 p-2 me-3 d-flex align-items-center justify-content-center" style={{ width: '44px', height: '44px' }}>
                    <FaUser className="text-primary" size={20} />
                  </div>
                  <div>
                    <div className="d-flex align-items-center">
                      <strong className="me-2">{post.user?.displayName || "Anonymous"}</strong>
                      <Badge bg="primary" className="rounded-pill px-2 py-1" style={{ fontSize: '0.7rem' }}>
                        Author
                      </Badge>
                    </div>
                    <small className="text-muted d-flex align-items-center">
                      <FaCalendar className="me-1" size={12} />
                      {formatDate(post.createdAt)}
                    </small>
                  </div>
                </div>

                {/* Location Badge */}
                {post.location && (
                  <div className="d-flex align-items-center bg-success bg-opacity-10 rounded-pill px-3 py-2">
                    <FaMapMarkerAlt className="text-success me-2" />
                    <span className="fw-medium">{post.location}</span>
                  </div>
                )}
              </div>

              {/* Badges in a clean row */}
              {renderBadges()}

              {/* Tags */}
              {post.tags && post.tags.length > 0 && (
                <div className="mb-4">
                  <div className="d-flex align-items-center mb-2">
                    <FaTag className="me-2 text-muted" />
                    <small className="text-muted fw-medium">Tags</small>
                  </div>
                  <div className="d-flex flex-wrap gap-2">
                    {post.tags.map((tag, index) => (
                      <Badge key={index} bg="light" text="dark" className="rounded-pill px-3 py-1 border">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Scam Report Details */}
              {renderScamReportDetails()}

              {/* Post Content */}
              <div className="post-content mb-4">
                <div className="mb-3">
                  <h5 className="fw-bold text-muted mb-3">Description</h5>
                </div>
                <div className="bg-light p-4 rounded-3 mb-4">
                  <ReactMarkdown className="prose" style={{ fontSize: '1.05rem', lineHeight: '1.7' }}>
                    {post.description || post.content || "No content available"}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Video Evidence Section */}
              {renderVideoEvidence()}

              {/* Image Evidence Section */}
              {renderEvidenceSection()}

              {/* Stats Row */}
              <div className="d-flex justify-content-around border-top border-bottom py-3 mb-4">
                <div className="text-center">
                  <div className="h4 mb-0 fw-bold text-primary">{reactionCount}</div>
                  <small className="text-muted">Reactions</small>
                </div>
                <div className="text-center">
                  <div className="h4 mb-0 fw-bold text-success">{post.commentCount || 0}</div>
                  <small className="text-muted">Comments</small>
                </div>
                <div className="text-center">
                  <div className="h4 mb-0 fw-bold text-info">{post.shareCount || 0}</div>
                  <small className="text-muted">Shares</small>
                </div>
                <div className="text-center">
                  <div className="h4 mb-0 fw-bold text-warning">{post._count?.bookmarks || 0}</div>
                  <small className="text-muted">Bookmarks</small>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="d-flex justify-content-between border-top pt-4">
                <div className="d-flex flex-wrap gap-2">
                  {/* Reaction Buttons */}
                  <div className="btn-group" role="group">
                    {Object.entries(reactionTypes).map(([type, config]) => (
                      <Button
                        key={type}
                        variant={userReaction === type ? config.color : "outline-secondary"}
                        className="rounded-pill px-4 py-2"
                        onClick={() => handlePostReaction(type)}
                      >
                        {config.icon}
                        <span className="ms-2">{config.label}</span>
                      </Button>
                    ))}
                  </div>

                  <Button
                    variant="outline-primary"
                    className="rounded-pill px-4 py-2"
                    onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
                  >
                    <FaComment />
                    <span className="ms-2">Comment</span>
                  </Button>
                  <Button
                    variant="outline-info"
                    className="rounded-pill px-4 py-2"
                    onClick={handleShare}
                  >
                    <FaShare />
                    <span className="ms-2">Share</span>
                  </Button>
                  <Button
                    variant="outline-danger"
                    className="rounded-pill px-4 py-2"
                    onClick={() => handleReport('inappropriate', post.id, 'post')}
                  >
                    <FaFlag />
                    <span className="ms-2">Report</span>
                  </Button>
                </div>
                <Button
                  variant={isBookmarked ? "warning" : "outline-warning"}
                  className="rounded-pill px-4 py-2"
                  onClick={handleBookmark}
                >
                  {isBookmarked ? <FaSolidBookmark /> : <FaRegBookmark />}
                  <span className="ms-2">Bookmark</span>
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* =============================================================== */}
          {/* 🎯 COMMENTS SECTION - INTEGRATED INTO POST CARD 🎯            */}
          {/* =============================================================== */}
          <div id="comments-section" className="mb-5">
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-4">
                <CommentsSection postId={post.id} />
              </Card.Body>
            </Card>
          </div>
        </Col>

        {/* Sidebar */}
        <Col lg={4}>
          {/* Author Info */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-light border-0">
              <h6 className="mb-0 fw-bold d-flex align-items-center">
                <FaUser className="me-2 text-primary" />
                About the Author
              </h6>
            </Card.Header>
            <Card.Body>
              <div className="text-center">
                <div className="avatar-lg rounded-circle bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3 p-4">
                  <FaUser className="text-primary" size={40} />
                </div>
                <h5>{post.user?.displayName || "Anonymous"}</h5>
                <div className="d-flex justify-content-center gap-4 mb-3">
                  <div className="text-center">
                    <div className="h4 mb-0 fw-bold">{post.user?._count?.posts || 0}</div>
                    <small className="text-muted">Posts</small>
                  </div>
                  <div className="text-center">
                    <div className="h4 mb-0 fw-bold">{post.user?._count?.followers || 0}</div>
                    <small className="text-muted">Followers</small>
                  </div>
                  <div className="text-center">
                    <div className="h4 mb-0 fw-bold">{post.user?.trustScore || 85}%</div>
                    <small className="text-muted">Trust Score</small>
                  </div>
                </div>
                <Button variant="outline-primary" className="rounded-pill px-4">
                  <FaUsers className="me-2" />
                  Follow
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* Related Posts */}
          <Card className="border-0 shadow-sm mb-4">
            <Card.Header className="bg-light border-0">
              <h6 className="mb-0 fw-bold d-flex align-items-center">
                <FaNewspaper className="me-2 text-primary" />
                Related Posts
                {loadingRelated && <Spinner animation="border" size="sm" className="ms-2" />}
              </h6>
            </Card.Header>
            <Card.Body>
              {relatedPosts.length === 0 ? (
                <p className="text-muted small text-center mb-0">No related posts found</p>
              ) : (
                relatedPosts.map((relatedPost) => (
                  <div key={relatedPost.id} className="mb-3 pb-3 border-bottom">
                    <h6 className="mb-2">
                      <Link
                        href={`/posts/${relatedPost.id}`}
                        className="text-decoration-none text-dark hover-primary fw-medium"
                      >
                        {relatedPost.title}
                      </Link>
                    </h6>
                    <div className="d-flex justify-content-between small text-muted">
                      <span className="d-flex align-items-center">
                        <FaUser className="me-1" size={10} />
                        {relatedPost.user?.displayName || "Anonymous"}
                      </span>
                      <span className="d-flex align-items-center">
                        <FaHeart className="me-1" size={10} />
                        {relatedPost._count?.reactions || 0}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <Button
                variant="outline-primary"
                className="w-100 rounded-pill mt-3"
                onClick={() => router.push("/feed")}
              >
                View More Posts
              </Button>
            </Card.Body>
          </Card>

          {/* Post Stats */}
          <Card className="border-0 shadow-sm">
            <Card.Header className="bg-light border-0">
              <h6 className="mb-0 fw-bold d-flex align-items-center">
                <FaChartBar className="me-2 text-primary" />
                Post Statistics
              </h6>
            </Card.Header>
            <Card.Body className="p-0">
              <ListGroup variant="flush" className="rounded">
                <ListGroup.Item className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom">
                  <span className="d-flex align-items-center">
                    <FaEye className="me-3 text-primary" />
                    Views
                  </span>
                  <strong className="text-primary">{post.viewCount || 0}</strong>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom">
                  <span className="d-flex align-items-center">
                    <FaHeart className="me-3 text-danger" />
                    Reactions
                  </span>
                  <strong className="text-success">{reactionCount}</strong>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom">
                  <span className="d-flex align-items-center">
                    <FaComment className="me-3 text-info" />
                    Comments
                  </span>
                  <strong>{post.commentCount || 0}</strong>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center px-4 py-3 border-bottom">
                  <span className="d-flex align-items-center">
                    <FaShare className="me-3 text-warning" />
                    Shares
                  </span>
                  <strong>{post.shareCount || 0}</strong>
                </ListGroup.Item>
                <ListGroup.Item className="d-flex justify-content-between align-items-center px-4 py-3">
                  <span className="d-flex align-items-center">
                    <FaSolidBookmark className="me-3 text-warning" />
                    Bookmarks
                  </span>
                  <strong>{post._count?.bookmarks || 0}</strong>
                </ListGroup.Item>
              </ListGroup>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Image Gallery Modal */}
      <Modal
        show={showEvidenceModal && selectedEvidence?.evidenceType === "IMAGE"}
        onHide={() => setShowEvidenceModal(false)}
        size="xl"
        centered
        fullscreen="lg-down"
      >
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="d-flex align-items-center">
            <FaImages className="me-2 text-primary" />
            Evidence Images
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {selectedEvidence?.evidenceType === "IMAGE" && (
            <div className="image-gallery-modal">
              <Carousel
                activeIndex={selectedImageIndex}
                onSelect={(index) => setSelectedImageIndex(index)}
                interval={null}
                indicators={imageEvidence.length > 1}
                controls={imageEvidence.length > 1}
                prevIcon={<FaChevronLeft className="text-dark" size={24} />}
                nextIcon={<FaChevronRight className="text-dark" size={24} />}
              >
                {imageEvidence.map((evidence, index) => (
                  <Carousel.Item key={evidence.id || index}>
                    <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '60vh' }}>
                      <Image
                        src={evidence.fileUrl}
                        alt={evidence.fileName || `Evidence ${index + 1}`}
                        className="img-fluid"
                        style={{
                          maxHeight: '70vh',
                          maxWidth: '100%',
                          objectFit: 'contain'
                        }}
                      />
                    </div>
                  </Carousel.Item>
                ))}
              </Carousel>

              {/* Image Info */}
              <div className="p-4 border-top">
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <h6 className="fw-bold mb-1">{imageEvidence[selectedImageIndex]?.fileName}</h6>
                    <small className="text-muted">
                      Size: {(imageEvidence[selectedImageIndex]?.fileSize / 1024).toFixed(0)} KB
                    </small>
                    {imageEvidence[selectedImageIndex]?.description && (
                      <p className="mt-2 mb-0 small">{imageEvidence[selectedImageIndex].description}</p>
                    )}
                  </div>
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = imageEvidence[selectedImageIndex].fileUrl;
                        link.download = imageEvidence[selectedImageIndex].fileName || 'evidence.jpg';
                        link.click();
                      }}
                    >
                      <FaDownload className="me-2" />
                      Download
                    </Button>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(imageEvidence[selectedImageIndex].fileUrl);
                        toast.success("Image URL copied to clipboard");
                      }}
                    >
                      <FaCopy className="me-2" />
                      Copy URL
                    </Button>
                  </div>
                </div>

                {/* Image Counter */}
                {imageEvidence.length > 1 && (
                  <div className="text-center mt-3">
                    <small className="text-muted">
                      {selectedImageIndex + 1} of {imageEvidence.length}
                    </small>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Other Evidence Modal */}
      <Modal show={showEvidenceModal && selectedEvidence?.evidenceType !== "IMAGE"} onHide={() => setShowEvidenceModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Evidence Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedEvidence && selectedEvidence.evidenceType !== "IMAGE" && (
            <>
              <p><strong>Type:</strong> {selectedEvidence.evidenceType || "Unknown"}</p>
              <p><strong>Description:</strong> {selectedEvidence.description || 'No description'}</p>
              <p><strong>Date:</strong> {formatDate(selectedEvidence.createdAt)}</p>

              {selectedEvidence.evidenceType === "LINK" && selectedEvidence.fileUrl && (
                <div className="mt-3">
                  <p><strong>URL:</strong></p>
                  <Alert variant="warning">
                    <FaExclamationTriangle className="me-2" />
                    Warning: This is a potentially malicious link. Do not visit unless you are investigating.
                  </Alert>
                  <code className="d-block p-2 bg-light rounded">
                    {selectedEvidence.fileUrl}
                  </code>
                  <div className="d-flex gap-2 mt-3">
                    <Button
                      variant="outline-primary"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedEvidence.fileUrl);
                        toast.success("Link copied to clipboard");
                      }}
                    >
                      <FaCopy className="me-2" />
                      Copy Link
                    </Button>
                  </div>
                </div>
              )}

              {(selectedEvidence.evidenceType === "TEXT" || selectedEvidence.evidenceType === "DOCUMENT") && (
                <div className="mt-3">
                  <p><strong>Content:</strong></p>
                  <Card className="bg-light">
                    <Card.Body>
                      <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                        {selectedEvidence.content || selectedEvidence.description || "No content available"}
                      </pre>
                    </Card.Body>
                  </Card>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEvidenceModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .post-detail-page {
          max-width: 1200px;
        }
        
        .prose {
          max-width: 100%;
          line-height: 1.8;
        }
        
        .prose h1, .prose h2, .prose h3 {
          margin-top: 1.5em;
          margin-bottom: 0.5em;
        }
        
        .prose p {
          margin-bottom: 1em;
        }
        
        .prose ul, .prose ol {
          margin-bottom: 1em;
          padding-left: 2em;
        }
        
        .avatar-lg {
          width: 80px;
          height: 80px;
        }
        
        .hover-shadow:hover {
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        
        .hover-primary:hover {
          color: #667eea !important;
        }
        
        .cursor-pointer {
          cursor: pointer;
        }
        
        .image-gallery-modal .carousel-control-prev,
        .image-gallery-modal .carousel-control-next {
          background-color: rgba(0,0,0,0.1);
          width: 50px;
          height: 50px;
          border-radius: 50%;
          top: 50%;
          transform: translateY(-50%);
        }
        
        .image-gallery-modal .carousel-control-prev {
          left: 20px;
        }
        
        .image-gallery-modal .carousel-control-next {
          right: 20px;
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
          width: 100%;
          height: auto;
          max-height: 500px;
          object-fit: contain;
          background-color: #000;
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
        
        @media (max-width: 768px) {
          .post-content img {
            max-width: 100%;
            height: auto;
          }
          
          .btn-group {
            flex-wrap: wrap;
          }
          
          .btn-group .btn {
            margin-bottom: 4px;
          }
          
          .d-flex.flex-wrap {
            justify-content: center;
          }
          
          .d-flex.flex-wrap .btn {
            margin: 2px;
          }
          
          .d-flex.flex-wrap.align-items-center {
            flex-direction: column;
            align-items: flex-start;
          }
          
          .d-flex.flex-wrap.align-items-center > div {
            margin-bottom: 10px;
          }
          
          .image-gallery-modal .carousel-control-prev,
          .image-gallery-modal .carousel-control-next {
            width: 40px;
            height: 40px;
          }
          
          .image-gallery-modal .carousel-control-prev {
            left: 10px;
          }
          
          .image-gallery-modal .carousel-control-next {
            right: 10px;
          }
        }
      `}</style>

      <style jsx global>{`
        .carousel-control-prev-icon,
        .carousel-control-next-icon {
          filter: invert(1);
        }
        
        .carousel-indicators [data-bs-target] {
          background-color: rgba(0,0,0,0.5);
        }
        
        .carousel-indicators .active {
          background-color: #0d6efd;
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
      `}</style>
    </Container>
  );
}

// =====================================================================
// 🎯 COMMENTS SECTION COMPONENT - Fixed Textarea Issue 🎯
// =====================================================================
function CommentsSection({ postId }) {
  const { user, api } = useAuth();
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [replyInputs, setReplyInputs] = useState({});
  const [showReplyForms, setShowReplyForms] = useState({});

  // State for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteCommentData, setDeleteCommentData] = useState(null);

  // State for report modal
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportCommentData, setReportCommentData] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [reportDetails, setReportDetails] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // State for editing
  const [editingComment, setEditingComment] = useState(null);
  const [editContent, setEditContent] = useState('');

  // Load comments
  const loadComments = useCallback(async () => {
    if (!postId) return;

    try {
      setLoadingComments(true);
      console.log(`📥 Loading comments for post: ${postId}`);

      let commentsArray = [];

      // Try the primary endpoint first
      try {
        const response = await api.comments.getPostComments(postId);
        console.log(`📦 Raw API response for post ${postId}:`, response);

        // Handle different response formats
        if (Array.isArray(response)) {
          commentsArray = response;
        } else if (response && response.comments && Array.isArray(response.comments)) {
          commentsArray = response.comments;
        } else if (response && response.data && Array.isArray(response.data)) {
          commentsArray = response.data;
        } else if (response && response.items && Array.isArray(response.items)) {
          commentsArray = response.items;
        }
      } catch (error) {
        console.warn(`⚠️ Primary endpoint failed, trying alternative...`, error);

        // Try alternative endpoint
        try {
          const altResponse = await api.request(`/api/v1/posts/${postId}/comments`);
          if (Array.isArray(altResponse)) {
            commentsArray = altResponse;
          } else if (altResponse && Array.isArray(altResponse.data)) {
            commentsArray = altResponse.data;
          }
        } catch (altError) {
          console.error(`❌ All endpoints failed for post ${postId}:`, altError);
        }
      }

      // Organize comments into tree structure
      const organizedComments = organizeComments(commentsArray);
      setComments(organizedComments);

    } catch (error) {
      console.error(`❌ Failed to load comments for post ${postId}:`, error);
      toast.error('Failed to load comments');
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [postId, api]);

  // Organize comments into tree structure
  const organizeComments = (flatComments) => {
    if (!Array.isArray(flatComments)) return [];

    const commentMap = new Map();
    const rootComments = [];

    // First pass: create map
    flatComments.forEach(comment => {
      if (!comment || !comment.id) return;

      const userReaction = comment.userReaction || null;
      const enrichedComment = {
        ...comment,
        replies: [],
        likes: comment.likes || 0,
        upvotes: comment.upvotes || 0,
        downvotes: comment.downvotes || 0,
        userReaction: userReaction,
        user: comment.user || {
          id: comment.userId || 'unknown',
          displayName: 'Anonymous',
          username: 'anonymous'
        }
      };

      commentMap.set(comment.id, enrichedComment);
    });

    // Second pass: build the tree
    flatComments.forEach(comment => {
      if (!comment || !comment.id) return;

      const currentComment = commentMap.get(comment.id);
      if (!currentComment) return;

      if (comment.parentId) {
        const parentComment = commentMap.get(comment.parentId);
        if (parentComment) {
          parentComment.replies.push(currentComment);
        } else {
          rootComments.push(currentComment);
        }
      } else {
        rootComments.push(currentComment);
      }
    });

    // Sort replies by date
    commentMap.forEach(comment => {
      if (comment.replies.length > 0) {
        comment.replies.sort((a, b) =>
          new Date(b.createdAt) - new Date(a.createdAt)
        );
      }
    });

    // Sort root comments by date
    rootComments.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    return rootComments;
  };

  // Submit comment
  const submitComment = async (content, parentId = null) => {
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

      if (!isReply) {
        setSubmittingComment(true);
      }

      const commentData = {
        content: content.trim(),
        postId,
        parentId: parentId || undefined,
        skipSafetyCheck: false
      };

      const response = await api.comments.createComment(commentData);

      if (response && response.id) {
        toast.success(isReply ? "Reply posted!" : "Comment posted!");

        const newComment = {
          ...response,
          id: response.id,
          content: response.content,
          postId: response.postId || postId,
          parentId: response.parentId || parentId || null,
          user: response.user || user,
          userId: response.userId || user?.id,
          createdAt: response.createdAt || new Date().toISOString(),
          updatedAt: response.updatedAt || new Date().toISOString(),
          replies: [],
          likes: 0,
          upvotes: 0,
          downvotes: 0
        };

        // Update local state
        if (isReply) {
          setComments(prev => {
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

          // Clear reply input
          setReplyInputs(prev => ({ ...prev, [parentId]: '' }));
          setShowReplyForms(prev => ({ ...prev, [parentId]: false }));
        } else {
          setComments(prev => [newComment, ...prev]);
          setCommentInput('');
        }
      }

      return response;
    } catch (error) {
      console.error(`❌ Failed to submit ${parentId ? 'reply' : 'comment'}:`, error);
      toast.error(`Failed to post ${parentId ? 'reply' : 'comment'}`);
      throw error;
    } finally {
      if (!parentId) {
        setSubmittingComment(false);
      }
    }
  };

  // Update comment
  const updateComment = async (commentId, content, editReason = "Updated content") => {
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

      await api.comments.updateComment(commentId, updateData);
      toast.success("Comment updated!");
      await loadComments();
      setEditingComment(null);

    } catch (error) {
      console.error(`❌ Failed to update comment ${commentId}:`, error);
      toast.error("Failed to update comment");
    }
  };

  // Delete comment
  const deleteComment = async (commentId, hard = false) => {
    if (!user) {
      toast.error("Please login to delete comments");
      return;
    }

    try {
      await api.comments.deleteComment(commentId, hard);
      toast.success("Comment deleted!");
      await loadComments();

    } catch (error) {
      console.error(`❌ Failed to delete comment ${commentId}:`, error);
      toast.error("Failed to delete comment");
    }
  };

  // Report comment
  const reportComment = async (commentId, reason, details) => {
    if (!user) {
      toast.error("Please login to report comments");
      return;
    }

    try {
      setSubmittingReport(true);
      const reportData = {
        reason,
        details: details || undefined
      };

      await api.comments.reportComment(commentId, reportData);
      toast.success("Comment reported successfully!");

      // Close modal and reset
      setShowReportModal(false);
      setReportCommentData(null);
      setReportReason('');
      setReportDetails('');

    } catch (error) {
      console.error(`❌ Failed to report comment ${commentId}:`, error);
      toast.error("Failed to report comment");
    } finally {
      setSubmittingReport(false);
    }
  };

  // Handle comment reactions
  const handleCommentReaction = async (commentId, type, currentReaction) => {
    if (!user) {
      toast.error("Please login to react to comments");
      return;
    }

    const isRemoving = currentReaction === type;
    const apiType = type.toLowerCase();

    // Store original comments for rollback
    const originalComments = [...comments];

    // Helper to update reaction counts
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
      // Optimistic update
      setComments(updateReactionInTree(comments, !isRemoving));

      // Make API call
      if (isRemoving) {
        await api.comments.removeReaction(commentId, apiType);
      } else {
        if (currentReaction && currentReaction !== type) {
          try {
            await api.comments.removeReaction(commentId, currentReaction.toLowerCase());
          } catch (removeError) {
            console.warn(`⚠️ Failed to remove old reaction:`, removeError);
          }
        }
        await api.comments.addReaction(commentId, apiType);
      }

    } catch (error) {
      console.error(`❌ Failed to toggle reaction:`, error);
      // Rollback on error
      setComments(originalComments);
      toast.error("Failed to update reaction");
    }
  };

  // Handle delete confirmation
  const confirmDeleteComment = (commentId) => {
    setDeleteCommentData({ commentId });
    setShowDeleteModal(true);
  };

  // Handle delete
  const handleDeleteConfirm = async () => {
    if (deleteCommentData) {
      await deleteComment(deleteCommentData.commentId, false);
      setShowDeleteModal(false);
      setDeleteCommentData(null);
    }
  };

  // Handle report
  const confirmReportComment = (commentId) => {
    setReportCommentData({ commentId });
    setReportReason('');
    setReportDetails('');
    setShowReportModal(true);
  };

  // Handle report submission
  const handleReportSubmit = async () => {
    if (!reportReason) {
      toast.error("Please select a reason for reporting");
      return;
    }

    if (reportCommentData) {
      await reportComment(reportCommentData.commentId, reportReason, reportDetails);
    }
  };

  // Format date for comments
  const formatCommentDate = (dateString) => {
    if (!dateString) return 'Recently';

    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffMinutes = Math.floor(diffTime / (1000 * 60));
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    else if (diffMinutes < 60) return `${diffMinutes}m ago`;
    else if (diffHours < 24) return `${diffHours}h ago`;
    else if (diffDays === 1) return 'Yesterday';
    else if (diffDays < 7) return `${diffDays}d ago`;
    else if (diffDays < 30) {
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

  // Comment item component - FIXED TEXTAREA ISSUE
  const CommentItem = ({ comment, depth = 0, parentComment = null }) => {
    const [isReplying, setIsReplying] = useState(false);
    const replyText = replyInputs[comment.id] || '';
    const showReplyForm = showReplyForms[comment.id] || false;
    const replyTextareaRef = useRef(null);

    const isOwner = comment.user?.id === user?.id;
    const maxDepth = 5;
    const canReply = depth < maxDepth;

    // Check if comment can be edited (within 30 minutes)
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
        await submitComment(replyText, comment.id);
      } catch (error) {
        console.error('Failed to reply:', error);
      } finally {
        setIsReplying(false);
      }
    };

    const startEditing = () => {
      setEditingComment(comment.id);
      setEditContent(comment.content);
    };

    const cancelEditing = () => {
      setEditingComment(null);
      setEditContent('');
    };

    const handleUpdate = async () => {
      await updateComment(comment.id, editContent, "Updated via UI");
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        if (editingComment === comment.id) {
          handleUpdate();
        }
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
        setShowReplyForms(prev => ({ ...prev, [comment.id]: false }));
        setReplyInputs(prev => ({ ...prev, [comment.id]: '' }));
      }
    };

    const toggleReplyForm = () => {
      const newShowState = !showReplyForm;
      setShowReplyForms(prev => ({
        ...prev,
        [comment.id]: newShowState
      }));

      // Focus the textarea when opening the form
      if (newShowState && replyTextareaRef.current) {
        setTimeout(() => {
          replyTextareaRef.current?.focus();
        }, 100);
      }
    };

    // Handle textarea change for reply - FIXED
    const handleReplyChange = (e) => {
      e.persist(); // Persist the synthetic event
      const value = e.target.value;
      setReplyInputs(prev => ({
        ...prev,
        [comment.id]: value
      }));
    };

    // Handle textarea change for edit - FIXED
    const handleEditChange = (e) => {
      setEditContent(e.target.value);
    };

    return (
      <div className={`comment-item mb-3 ${depth > 0 ? 'ms-4' : ''}`} style={{
        borderLeft: depth > 0 ? '3px solid #dee2e6' : 'none',
        paddingLeft: depth > 0 ? '20px' : '0',
        marginTop: '15px'
      }}>
        <div className="d-flex">
          <div className="flex-shrink-0 me-3">
            <div className="rounded-circle bg-primary bg-opacity-10 d-flex align-items-center justify-content-center"
              style={{ width: '40px', height: '40px' }}>
              <FaUserFriends size={16} className="text-primary" />
            </div>
          </div>
          <div className="flex-grow-1">
            <div className="bg-light rounded-3 p-3 mb-2">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <strong className="d-block mb-1">
                    {comment.user?.displayName || comment.user?.username || 'Anonymous'}
                    {depth > 0 && parentComment && (
                      <span className="text-muted ms-2 fw-normal">
                        <FaReply size={10} className="me-1" />
                        replying to {parentComment.user?.displayName || parentComment.user?.username || 'user'}
                      </span>
                    )}
                  </strong>
                  <small className="text-muted">
                    {formatCommentDate(comment.createdAt)}
                    {comment.updatedAt !== comment.createdAt && ' (edited)'}
                  </small>
                </div>

                {/* Context Menu */}
                {editingComment !== comment.id && (
                  <Dropdown align="end">
                    <Dropdown.Toggle
                      as="button"
                      className="btn btn-link p-0 text-muted border-0 bg-transparent comment-menu-btn"
                      style={{
                        fontSize: '1.2rem',
                        lineHeight: '1',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <FaEllipsisV size={14} />
                    </Dropdown.Toggle>

                    <Dropdown.Menu className="shadow-sm">
                      {isOwner ? (
                        <>
                          {/* Owner options: Edit and Delete */}
                          <Dropdown.Item
                            onClick={startEditing}
                            disabled={!canEdit()}
                            className="d-flex align-items-center"
                          >
                            <FaEdit className="me-2 text-primary" size={14} />
                            <span>Edit Comment</span>
                            {!canEdit() && (
                              <small className="text-muted ms-2">(30 min expired)</small>
                            )}
                          </Dropdown.Item>
                          <Dropdown.Item
                            onClick={() => confirmDeleteComment(comment.id)}
                            className="d-flex align-items-center text-danger"
                          >
                            <FaTrash className="me-2" size={14} />
                            <span>Delete Comment</span>
                          </Dropdown.Item>
                        </>
                      ) : (
                        <>
                          {/* Non-owner option: Report */}
                          <Dropdown.Item
                            onClick={() => confirmReportComment(comment.id)}
                            className="d-flex align-items-center text-warning"
                          >
                            <FaFlag className="me-2" size={14} />
                            <span>Report Comment</span>
                          </Dropdown.Item>
                        </>
                      )}
                    </Dropdown.Menu>
                  </Dropdown>
                )}
              </div>

              {editingComment === comment.id ? (
                <div className="mb-2">
                  <Form.Control
                    as="textarea"
                    rows={3}
                    value={editContent}
                    onChange={handleEditChange}
                    onKeyDown={handleKeyDown}
                    className="mb-2"
                    autoFocus
                    style={{ resize: 'vertical' }}
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
                        className="px-3"
                      >
                        <FaCheck className="me-1" size={12} />
                        Save
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={cancelEditing}
                        className="px-3"
                      >
                        <FaTimes className="me-1" size={12} />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
                  {comment.content}
                </p>
              )}
            </div>

            {/* Action buttons */}
            {editingComment !== comment.id && (
              <div className="d-flex gap-3 align-items-center mb-3">
                {/* Like Button */}
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id={`tooltip-like-${comment.id}`}>Like this comment</Tooltip>}
                >
                  <button
                    className={`btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center comment-reaction-btn ${comment.userReaction === 'LIKE' ? 'active text-danger' : 'text-muted'
                      }`}
                    onClick={() => handleCommentReaction(comment.id, 'LIKE', comment.userReaction)}
                  >
                    <FaHeart
                      size={14}
                      className="me-1"
                      style={{
                        fill: comment.userReaction === 'LIKE' ? '#dc3545' : 'currentColor'
                      }}
                    />
                    <span className="small fw-medium">{comment.likes || 0}</span>
                  </button>
                </OverlayTrigger>

                {/* Upvote Button */}
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id={`tooltip-upvote-${comment.id}`}>This comment is helpful</Tooltip>}
                >
                  <button
                    className={`btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center comment-reaction-btn ${comment.userReaction === 'UPVOTE' ? 'active text-success' : 'text-muted'
                      }`}
                    onClick={() => handleCommentReaction(comment.id, 'UPVOTE', comment.userReaction)}
                  >
                    <FaThumbsUp
                      size={14}
                      className="me-1"
                      style={{
                        fill: comment.userReaction === 'UPVOTE' ? '#28a745' : 'currentColor'
                      }}
                    />
                    <span className="small fw-medium">{comment.upvotes || 0}</span>
                  </button>
                </OverlayTrigger>

                {/* Downvote Button */}
                <OverlayTrigger
                  placement="top"
                  overlay={<Tooltip id={`tooltip-downvote-${comment.id}`}>This comment is not helpful</Tooltip>}
                >
                  <button
                    className={`btn btn-sm btn-link text-decoration-none p-0 d-flex align-items-center comment-reaction-btn ${comment.userReaction === 'DOWNVOTE' ? 'active text-danger' : 'text-muted'
                      }`}
                    onClick={() => handleCommentReaction(comment.id, 'DOWNVOTE', comment.userReaction)}
                  >
                    <FaThumbsDown
                      size={14}
                      className="me-1"
                      style={{
                        fill: comment.userReaction === 'DOWNVOTE' ? '#dc3545' : 'currentColor'
                      }}
                    />
                    <span className="small fw-medium">{comment.downvotes || 0}</span>
                  </button>
                </OverlayTrigger>

                {/* Reply Button */}
                {canReply && (
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip id={`tooltip-reply-${comment.id}`}>Reply to this comment</Tooltip>}
                  >
                    <button
                      className="btn btn-sm btn-link text-decoration-none p-0 text-muted d-flex align-items-center comment-action-btn"
                      onClick={toggleReplyForm}
                    >
                      <FaReply size={14} className="me-1" />
                      <span className="small">Reply</span>
                    </button>
                  </OverlayTrigger>
                )}
              </div>
            )}

            {/* Reply form - FIXED TEXTAREA */}
            {showReplyForm && (
              <div className="mt-3 mb-3">
                <div className="d-flex align-items-start mb-2">
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
                      onChange={handleReplyChange}
                      onKeyDown={handleReplyKeyDown}
                      className="small"
                      autoFocus
                      ref={replyTextareaRef}
                      style={{ resize: 'vertical' }}
                    />
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <small className="text-muted">
                        Press Ctrl+Enter to post, Esc to cancel
                      </small>
                      <div className="d-flex gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handleReply}
                          disabled={isReplying || !replyText.trim()}
                          className="px-3"
                        >
                          {isReplying ? (
                            <>
                              <Spinner animation="border" size="sm" className="me-2" />
                              Posting...
                            </>
                          ) : (
                            'Post Reply'
                          )}
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => {
                            setShowReplyForms(prev => ({ ...prev, [comment.id]: false }));
                            setReplyInputs(prev => ({ ...prev, [comment.id]: '' }));
                          }}
                          className="px-3"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </Form.Group>
                </div>
              </div>
            )}

            {/* Nested replies */}
            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-3">
                {comment.replies.map(reply => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    depth={depth + 1}
                    parentComment={comment}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Load comments on mount
  useEffect(() => {
    if (postId) {
      loadComments();
    }
  }, [postId]);

  // Count total comments
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

  const totalComments = countTotalComments(comments);

  // Handle main comment input change - FIXED
  const handleCommentInputChange = (e) => {
    setCommentInput(e.target.value);
  };

  return (
    <>
      <div className="comments-section">
        {/* Comments header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0 fw-bold">
            <FaComment className="me-2" />
            Comments ({totalComments})
          </h5>
        </div>

        {/* Comment input form - FIXED TEXTAREA */}
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
                onChange={handleCommentInputChange}
                className="rounded-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.ctrlKey) {
                    e.preventDefault();
                    submitComment(commentInput);
                  }
                }}
                style={{ resize: 'vertical' }}
              />
              <div className="d-flex justify-content-between align-items-center mt-2">
                <small className="text-muted">
                  Press Ctrl+Enter to post
                </small>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => submitComment(commentInput)}
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
          {loadingComments ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="text-muted mt-2 small">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-5">
              <FaComment className="text-muted mb-3" size={40} />
              <p className="text-muted mb-2">No comments yet</p>
              <p className="text-muted small mb-0">Be the first to comment!</p>
            </div>
          ) : (
            <>
              <div className="mb-3">
                <small className="text-muted">
                  Showing {totalComments} comment{totalComments !== 1 ? 's' : ''}
                </small>
              </div>
              {comments.map(comment => (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
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
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteConfirm}>
            <FaTrash className="me-2" />
            Delete Comment
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Report Comment Modal */}
      <Modal show={showReportModal} onHide={() => setShowReportModal(false)} centered>
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
              style={{ resize: 'vertical' }}
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
          <Button variant="secondary" onClick={() => setShowReportModal(false)} disabled={submittingReport}>
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

      {/* Add some CSS styles */}
      <style jsx>{`
        .comments-section {
          background-color: #f8f9fa;
          border-radius: 0.5rem;
          padding: 1rem;
        }
        
        .comment-form textarea,
        .comment-item textarea {
          resize: vertical;
          font-size: 0.875rem;
          min-height: 80px;
        }
        
        .comment-item {
          animation: fadeIn 0.3s ease;
        }
        
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
          transform: scale(1.05);
        }
        
        .comment-reaction-btn.active {
          font-weight: 600;
        }
        
        .comment-menu-btn {
          cursor: pointer;
          transition: all 0.2s ease;
          border-radius: 50%;
        }
        
        .comment-menu-btn:hover {
          background-color: rgba(0, 0, 0, 0.1);
          transform: scale(1.1);
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
    </>
  );
}