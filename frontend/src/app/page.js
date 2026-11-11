// src/app/page.js
'use client';

import { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button } from 'react-bootstrap';
import { 
  FaSearch, 
  FaExclamationTriangle, 
  FaBullhorn, 
  FaUsers, 
  FaChartLine, 
  FaChevronRight, 
  FaHashtag, 
  FaEye, 
  FaShieldAlt, 
  FaThumbsUp,
  FaComments,
  FaCalendar,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaFileAlt,
  FaBuilding,
  FaPlay,
  FaVolumeMute,
  FaVolumeUp
} from 'react-icons/fa';
import Link from 'next/link';
import Header from '../../components/layout/Header';
import BottomNavigation from '../../components/layout/BottomNavigation';
import SearchBar from '../../components/search/SearchBar';
import Footer from '../../components/layout/Footer';
import { useAuth } from '../../lib/contexts/AuthContext';

export default function HomePage() {
  const { api, isAuthenticated, user } = useAuth();
  const videoRef = useRef(null);
  const [recentPosts, setRecentPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [quickStats, setQuickStats] = useState({
    reportsToday: 0,
    awarenessPosts: 0,
    activeUsers: 0,
    preventedLoss: 0
  });
  const [videoMuted, setVideoMuted] = useState(true);
  const [videoPlaying, setVideoPlaying] = useState(true);

  const scamCategories = [
    { name: 'Tech Support', count: 45, risk: 'High' },
    { name: 'Phishing', count: 38, risk: 'Medium' },
    { name: 'Investment Fraud', count: 52, risk: 'Critical' },
    { name: 'Romance Scam', count: 29, risk: 'High' },
  ];

  useEffect(() => {
    loadRecentPosts();
    loadQuickStats();
    
    // Setup video playback
    if (videoRef.current) {
      videoRef.current.muted = videoMuted;
      videoRef.current.loop = true;
      videoRef.current.play().catch(e => {
        console.log("Video autoplay prevented:", e);
        setVideoPlaying(false);
      });
    }

    return () => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = videoMuted;
    }
  }, [videoMuted]);

  const toggleVideoMute = () => {
    setVideoMuted(!videoMuted);
  };

  const toggleVideoPlay = () => {
    if (videoRef.current) {
      if (videoPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(e => console.log("Video play failed:", e));
      }
      setVideoPlaying(!videoPlaying);
    }
  };

  const loadRecentPosts = async () => {
    try {
      setLoading(true);
      
      if (isAuthenticated) {
        // Load user's posts if authenticated
        const response = await api.posts.getMyPosts();
        
        // Handle different response structures
        let postsArray = [];
        
        if (Array.isArray(response)) {
          postsArray = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          postsArray = response.data;
        } else if (response && response.posts && Array.isArray(response.posts)) {
          postsArray = response.posts;
        } else if (response && response.items && Array.isArray(response.items)) {
          postsArray = response.items;
        }
        
        // Filter out deleted posts and sort by creation date
        const activePosts = postsArray.filter(post => post.status !== "DELETED");
        const sortedPosts = activePosts.sort((a, b) => 
          new Date(b.createdAt) - new Date(a.createdAt)
        ).slice(0, 5); // Get top 5 most recent posts
        
        setRecentPosts(sortedPosts);
      } else {
        // Load public feed if not authenticated
        const response = await api.getFeed(1, 5);
        
        let postsArray = [];
        
        if (Array.isArray(response)) {
          postsArray = response;
        } else if (response && response.data && Array.isArray(response.data)) {
          postsArray = response.data;
        } else if (response && response.posts && Array.isArray(response.posts)) {
          postsArray = response.posts;
        }
        
        setRecentPosts(postsArray.slice(0, 5));
      }
    } catch (err) {
      console.error("Failed to load recent posts:", err);
      setError("Failed to load recent posts. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const loadQuickStats = async () => {
    try {
      // This would come from your API endpoint
      // For now, using mock data
      setQuickStats({
        reportsToday: 24,
        awarenessPosts: 156,
        activeUsers: 1200,
        preventedLoss: 42000
      });
    } catch (err) {
      console.error("Failed to load quick stats:", err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffHours = diffMs / (1000 * 60 * 60);
      
      if (diffHours < 1) {
        return `${Math.floor(diffHours * 60)}m ago`;
      } else if (diffHours < 24) {
        return `${Math.floor(diffHours)}h ago`;
      } else {
        return `${Math.floor(diffHours / 24)}d ago`;
      }
    } catch (error) {
      return "";
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <Badge 
            bg="" 
            className="py-1 px-2 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: 'white',
              fontSize: '0.7rem'
            }}
          >
            <FaCheckCircle className="me-1" size={8} />
            Published
          </Badge>
        );
      case "UNDER_REVIEW":
        return (
          <Badge 
            bg="" 
            className="py-1 px-2 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: 'white',
              fontSize: '0.7rem'
            }}
          >
            <FaClock className="me-1" size={8} />
            Under Review
          </Badge>
        );
      default:
        return (
          <Badge 
            bg="" 
            className="py-1 px-2 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
              color: 'white',
              fontSize: '0.7rem'
            }}
          >
            {status}
          </Badge>
        );
    }
  };

  const getTypeBadge = (post) => {
    const { postType, isCompanyPost } = post;
    
    let gradient = "";
    let icon = FaExclamationTriangle;
    let label = "";
    
    switch (postType) {
      case "SCAM_REPORT":
        gradient = "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)";
        icon = FaExclamationTriangle;
        label = "Report";
        break;
      case "SCAM_AWARENESS":
        gradient = "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)";
        icon = FaBullhorn;
        label = "Awareness";
        break;
      case "QUESTION":
        gradient = "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)";
        icon = FaFileAlt;
        label = "Question";
        break;
      default:
        gradient = "linear-gradient(135deg, #6B7280 0%, #4B5563 100%)";
        icon = FaFileAlt;
        label = "Post";
    }
    
    const Icon = icon;
    
    return (
      <div className="d-flex flex-column gap-1">
        <Badge 
          bg="" 
          className="py-1 px-2 rounded-pill border-0 d-flex align-items-center gap-1 fw-medium"
          style={{ 
            background: gradient,
            color: 'white',
            fontSize: '0.7rem',
            width: 'fit-content'
          }}
        >
          <Icon size={8} />
          {label}
        </Badge>
        
        {isCompanyPost && (
          <Badge 
            bg="" 
            className="py-1 px-2 rounded-pill align-self-start border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
              color: 'white',
              fontSize: '0.65rem'
            }}
          >
            <FaBuilding size={7} />
            Company
          </Badge>
        )}
      </div>
    );
  };

  const getFormattedStats = () => [
    { 
      icon: <FaExclamationTriangle />, 
      label: 'Reports Today', 
      value: quickStats.reportsToday.toString(), 
      color: 'danger' 
    },
    { 
      icon: <FaBullhorn />, 
      label: 'Awareness Posts', 
      value: quickStats.awarenessPosts.toString(), 
      color: 'warning' 
    },
    { 
      icon: <FaUsers />, 
      label: 'Active Users', 
      value: quickStats.activeUsers >= 1000 
        ? `${(quickStats.activeUsers / 1000).toFixed(1)}k` 
        : quickStats.activeUsers.toString(), 
      color: 'success' 
    },
    { 
      icon: <FaChartLine />, 
      label: 'Prevented Loss', 
      value: `$${quickStats.preventedLoss >= 1000 
        ? `${(quickStats.preventedLoss / 1000).toFixed(0)}k` 
        : quickStats.preventedLoss.toString()}`, 
      color: 'info' 
    },
  ];

  // Get CTA buttons based on auth state
  const getCTAButtons = () => {
    if (isAuthenticated) {
      return (
        <>
          <Link href="/dashboard" passHref>
            <Button 
              variant="light" 
              size="lg" 
              className="px-5 py-3 rounded-3 fw-bold"
            >
              Go to Dashboard
            </Button>
          </Link>
          <Link href="/report" passHref>
            <Button 
              variant="outline-light" 
              size="lg" 
              className="px-5 py-3 rounded-3 fw-bold"
            >
              Report a Scam
            </Button>
          </Link>
        </>
      );
    } else {
      return (
        <>
          <Link href="/auth/login" passHref>
            <Button 
              variant="light" 
              size="lg" 
              className="px-5 py-3 rounded-3 fw-bold"
            >
              Sign In
            </Button>
          </Link>

          <Link href="/dashboard/messaging/inbox">
  <Button variant="outline-primary">
    <FaComments className="me-2" />
    Messages
  </Button>
</Link>
          <Link href="/auth/signup" passHref>
            <Button 
              variant="outline-light" 
              size="lg" 
              className="px-5 py-3 rounded-3 fw-bold"
            >
              Join Now
            </Button>
          </Link>
        </>
      );
    }
  };

  return (
    <>
      {/* Header (only show if authenticated) */}
      {/* {isAuthenticated && <Header />} */}

      {/* Video Hero Section */}
      <section className="video-hero-section position-relative">
        <div className="video-container position-relative" style={{ height: '80vh', maxHeight: '600px' }}>
          {/* Video Background */}
          <video
            ref={videoRef}
            autoPlay
            muted={videoMuted}
            loop
            playsInline
            className="w-100 h-100 object-fit-cover"
            style={{ filter: 'brightness(0.7)' }}
          >
            <source src="/videos/scam-protection-hero.mp4" type="video/mp4" />
            <source src="/videos/scam-protection-hero.webm" type="video/webm" />
            {/* Fallback image if video doesn't load */}
            <img 
              src="/images/scam-protection-fallback.jpg" 
              alt="Scam Protection" 
              className="w-100 h-100 object-fit-cover"
            />
          </video>
          
          {/* Video Overlay */}
          <div className="video-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center">
            <Container>
              <Row className="justify-content-center">
                <Col lg={8} className="text-center text-white">
                  {/* Video Controls */}
                  <div className="video-controls position-absolute top-0 end-0 mt-3 me-3 d-flex gap-2">
                    <button 
                      onClick={toggleVideoPlay}
                      className="btn btn-sm btn-light rounded-circle p-2 d-flex align-items-center justify-content-center"
                      aria-label={videoPlaying ? "Pause video" : "Play video"}
                    >
                      <FaPlay size={14} className={videoPlaying ? "d-none" : ""} />
                      <span className={videoPlaying ? "" : "d-none"}>⏸</span>
                    </button>
                    <button 
                      onClick={toggleVideoMute}
                      className="btn btn-sm btn-light rounded-circle p-2 d-flex align-items-center justify-content-center"
                      aria-label={videoMuted ? "Unmute video" : "Mute video"}
                    >
                      {videoMuted ? <FaVolumeMute size={14} /> : <FaVolumeUp size={14} />}
                    </button>
                  </div>
                  
                  {/* Hero Content */}
                  <div className="hero-content">
                    <div className="hero-icon mb-4">
                      <FaShieldAlt className="text-white" size={48} />
                    </div>
                    <h1 className="display-4 fw-bold mb-3 text-shadow">
                      Stay Safe From Scams
                    </h1>
                    <p className="lead mb-4 text-white-80 fs-5">
                      Protect yourself and help others by reporting, searching, and learning about scams
                    </p>
                    
                    {/* Authentication-based greeting */}
                    {isAuthenticated && user && (
                      <div className="welcome-message mb-4">
                        <h5 className="fw-bold text-white">
                          Welcome back, {user.displayName || user.email?.split('@')[0]}!
                        </h5>
                        <p className="text-white-70">Continue your mission to fight scams.</p>
                      </div>
                    )}
                    
                    {/* CTA Buttons */}
                    <div className="d-flex gap-3 justify-content-center mb-4">
                      {getCTAButtons()}
                    </div>
                    
                    {/* Search Bar Over Video */}
                    <div className="search-overlay mt-4">
                      <div className="search-wrapper mx-auto" style={{ maxWidth: '600px' }}>
                        <SearchBar 
                          placeholder="Search phone, email, website, or wallet..." 
                          className="shadow-lg"
                        />
                      </div>
                    </div>
                    
                    {/* Quick Stats Overlay */}
                    <div className="quick-stats-overlay mt-5 pt-4 border-top border-white-20">
                      <Row className="g-3 justify-content-center">
                        {getFormattedStats().map((stat, index) => (
                          <Col xs={6} md={3} key={index}>
                            <div className="text-center text-white">
                              <div className="fs-3 fw-bold mb-1">{stat.value}</div>
                              <div className="small text-white-70">{stat.label}</div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  </div>
                </Col>
              </Row>
            </Container>
          </div>
        </div>
      </section>

      <Container className="py-3 py-md-4 bottom-nav-spacing">
        <Row className="g-3 g-md-4">
          {/* Left Column - Recent Reports */}
          <Col lg={8}>
            {/* Recent Scam Reports */}
            <Card className="reports-card mb-4 border-0">
              <Card.Header className="d-flex justify-content-between align-items-center border-0 pb-2">
                <h5 className="mb-0 fw-semibold">
                  {isAuthenticated ? 'Your Recent Reports' : 'Recent Scam Reports'}
                </h5>
                <Link href={isAuthenticated ? "/dashboard/posts" : "/feed"} className="btn btn-sm btn-outline-primary">
                  View All <FaChevronRight className="ms-1" size={10} />
                </Link>
              </Card.Header>
              <Card.Body className="pt-0">
                {loading ? (
                  <div className="text-center py-4">
                    <Spinner animation="border" variant="primary" size="sm" />
                    <p className="text-muted mt-2 small">Loading recent posts...</p>
                  </div>
                ) : error ? (
                  <Alert variant="warning" className="mb-0">
                    {error}
                  </Alert>
                ) : recentPosts.length === 0 ? (
                  <div className="text-center py-4">
                    <FaFileAlt className="text-muted mb-3" size={32} />
                    <p className="text-muted mb-0">
                      {isAuthenticated ? 'No posts yet. Create your first report!' : 'No recent posts available.'}
                    </p>
                    {isAuthenticated && (
                      <Link href="/report" className="btn btn-primary btn-sm mt-2">
                        Create First Report
                      </Link>
                    )}
                  </div>
                ) : (
                  <div className="recent-posts-container">
                    {recentPosts.map((post) => (
                      <div 
                        key={post.id} 
                        className="post-item p-3 rounded mb-3 border"
                        style={{ 
                          background: 'white',
                          borderColor: '#e9ecef',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = '#cbd5e1';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = '#e9ecef';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={() => {
                          if (isAuthenticated) {
                            window.location.href = `/dashboard/posts/view/${post.id}`;
                          } else {
                            window.location.href = `/auth/login?callbackUrl=/dashboard/posts/view/${post.id}`;
                          }
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="d-flex align-items-center gap-2">
                            {getTypeBadge(post)}
                            {post.status && getStatusBadge(post.status)}
                          </div>
                          <small className="text-muted">{formatDate(post.createdAt)}</small>
                        </div>
                        
                        <h6 className="fw-semibold mb-2" style={{ color: '#1e293b' }}>
                          {post.title || 'Untitled Post'}
                        </h6>
                        
                        {post.description && (
                          <p className="text-muted mb-2 small" style={{ lineHeight: '1.5' }}>
                            {post.description.length > 120 
                              ? `${post.description.substring(0, 120)}...` 
                              : post.description}
                          </p>
                        )}
                        
                        <div className="d-flex justify-content-between align-items-center">
                          <div className="d-flex align-items-center gap-3 text-muted small">
                            <span className="d-flex align-items-center gap-1">
                              <FaThumbsUp size={12} />
                              {post.reactionCount || 0}
                            </span>
                            <span className="d-flex align-items-center gap-1">
                              <FaComments size={12} />
                              {post.commentCount || 0}
                            </span>
                            {post.user?.displayName && (
                              <span className="d-flex align-items-center gap-1">
                                <FaUsers size={12} />
                                {post.user.displayName}
                              </span>
                            )}
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            <FaEye size={12} className="text-muted" />
                            <small className="text-muted">{post.viewCount || 0}</small>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Trending Reports */}
                {!loading && recentPosts.length > 0 && (
                  <div className="trending-reports mt-4 pt-3 border-top">
                    <h6 className="mb-3 d-flex align-items-center fw-semibold">
                      <FaHashtag className="me-2 text-primary" />
                      Trending Now
                    </h6>
                    {recentPosts.slice(0, 3).map((post, index) => (
                      <div 
                        key={index} 
                        className="trending-item d-flex align-items-center p-3 rounded mb-2"
                        style={{ 
                          background: '#f8f9fa',
                          border: '1px solid #f1f1f1',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#ffffff';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.05)';
                          e.currentTarget.style.borderColor = '#dee2e6';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#f8f9fa';
                          e.currentTarget.style.boxShadow = 'none';
                          e.currentTarget.style.borderColor = '#f1f1f1';
                        }}
                        onClick={() => {
                          if (isAuthenticated) {
                            window.location.href = `/dashboard/posts/view/${post.id}`;
                          } else {
                            window.location.href = `/auth/login?callbackUrl=/dashboard/posts/view/${post.id}`;
                          }
                        }}
                      >
                        <div className="flex-grow-1">
                          <h6 className="mb-1 fw-semibold">{post.title || 'Untitled Post'}</h6>
                          <small className="text-muted d-flex align-items-center">
                            <span className="me-3">{post.user?.displayName || 'Anonymous'}</span>
                            <span className="me-3">•</span>
                            <span>{formatDate(post.createdAt)}</span>
                          </small>
                        </div>
                        <div className="d-flex align-items-center">
                          <FaEye className="me-1 text-muted" size={12} />
                          <small className="text-muted">{post.viewCount || 0}</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card.Body>
            </Card>

            {/* Awareness Posts */}
            <Card className="awareness-card border-0">
              <Card.Header className="d-flex justify-content-between align-items-center border-0 pb-2">
                <h5 className="mb-0 fw-semibold">Latest Awareness</h5>
                <Link href="/feed/awareness" className="btn btn-sm btn-outline-primary">
                  View All <FaChevronRight className="ms-1" size={10} />
                </Link>
              </Card.Header>
              <Card.Body>
                <div 
                  className="awareness-alert p-4 rounded"
                  style={{ 
                    background: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(13, 110, 253, 0.08)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#f8f9fa';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <FaBullhorn className="text-info fs-4" />
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-2 fw-semibold">Share Your Knowledge!</h6>
                      <p className="mb-3 text-muted small">Help protect others by sharing safety tips and awareness posts.</p>
                      <Link 
                        href={isAuthenticated ? "/dashboard/posts/create" : "/auth/login?callbackUrl=/dashboard/posts/create"} 
                        className="btn btn-info btn-sm"
                      >
                        Create Awareness Post
                      </Link>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          {/* Right Column - Categories & Quick Links */}
          <Col lg={4}>
            {/* Categories Card */}
            <Card className="categories-card mb-4 border-0">
              <Card.Header className="border-0">
                <h5 className="mb-0 fw-semibold">Trending Scam Categories</h5>
              </Card.Header>
              <Card.Body>
                {scamCategories.map((category, index) => (
                  <div 
                    key={index} 
                    className="category-item d-flex justify-content-between align-items-center p-2 mb-2 rounded"
                    style={{ 
                      borderRadius: '10px !important',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#f8f9fa';
                      e.currentTarget.style.paddingLeft = '12px';
                      e.currentTarget.style.paddingRight = '12px';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.paddingLeft = '8px';
                      e.currentTarget.style.paddingRight = '8px';
                    }}
                  >
                    <span className="fw-medium">{category.name}</span>
                    <div>
                      <Badge bg={category.risk === 'Critical' ? 'danger' : 
                                category.risk === 'High' ? 'warning' : 'secondary'} 
                              className="me-2 rounded-pill">
                        {category.risk}
                      </Badge>
                      <small className="text-muted">({category.count})</small>
                    </div>
                  </div>
                ))}
                <Link href="/discover" className="btn btn-outline-primary w-100 mt-3">
                  <FaSearch className="me-2" />
                  Discover More
                </Link>
              </Card.Body>
            </Card>

            {/* Quick Report Card */}
            <Card className="report-card mb-4 border-0">
              <Card.Body className="text-center p-4">
                <div className="report-icon mb-3">
                  <FaExclamationTriangle className="text-danger" size={32} />
                </div>
                <h5 className="fw-semibold mb-2">Been Scammed?</h5>
                <p className="text-muted mb-3 small">Report it immediately to help others</p>
                <Link 
                  href={isAuthenticated ? "/report" : "/auth/login?callbackUrl=/report"} 
                  className="btn btn-danger w-100 fw-semibold"
                >
                  Report a Scam
                </Link>
              </Card.Body>
            </Card>

            {/* Quick Stats - Below Report Card */}
            <Card className="community-stats border-0">
              <Card.Header className="border-0">
                <h5 className="mb-0 fw-semibold">Community Stats</h5>
              </Card.Header>
              <Card.Body className="p-3">
                <Row className="g-2">
                  {getFormattedStats().map((stat, index) => (
                    <Col xs={6} key={index} className="mb-2">
                      <div 
                        className="stat-box p-3 rounded text-center"
                        style={{ 
                          background: '#ffffff',
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.03)',
                          border: '1px solid #f1f1f1',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-3px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.03)';
                        }}
                      >
                        <div className={`fs-4 mb-2 text-${stat.color}`}>
                          {stat.icon}
                        </div>
                        <h4 className="mb-1 fw-bold">{stat.value}</h4>
                        <p className="text-muted small mb-0">{stat.label}</p>
                      </div>
                    </Col>
                  ))}
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {isAuthenticated && <BottomNavigation />}
      <Footer />

      <style jsx>{`
        /* Video Hero Section */
        .video-hero-section {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .text-shadow {
          text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        
        .text-white-80 {
          color: rgba(255, 255, 255, 0.8);
        }
        
        .text-white-70 {
          color: rgba(255, 255, 255, 0.7);
        }
        
        .border-white-20 {
          border-color: rgba(255, 255, 255, 0.2) !important;
        }
        
        .hero-content {
          animation: fadeInUp 1s ease-out;
        }
        
        .search-overlay {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .quick-stats-overlay {
          animation: fadeIn 1.5s ease-out 0.5s both;
        }
        
        /* Soft Border Radius */
        .reports-card, 
        .awareness-card, 
        .categories-card, 
        .report-card,
        .community-stats,
        .stat-box,
        .awareness-alert,
        .trending-item,
        .category-item,
        .post-item {
          border-radius: 16px !important;
        }
        
        /* Hover Effects */
        .hover-card {
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          background: #ffffff;
          border: 1px solid #e9ecef;
        }
        
        .hover-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
          border-color: #dee2e6;
        }
        
        .report-card {
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(220, 53, 69, 0.1);
          background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
          border: 1px solid #ffe3e3;
        }
        
        .report-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(220, 53, 69, 0.15);
        }
        
        .report-icon {
          animation: gentle-pulse 2s infinite;
        }
        
        @keyframes gentle-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.05); }
        }
        
        .awareness-alert:hover {
          background: #ffffff;
          box-shadow: 0 4px 12px rgba(13, 110, 253, 0.08);
        }
        
        /* Animations */
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        
        /* Main Cards */
        .reports-card, 
        .awareness-card, 
        .categories-card,
        .community-stats {
          background: #ffffff;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
          border: 1px solid #e9ecef;
        }
        
        /* Responsive Mobile Design */
        @media (max-width: 768px) {
          .video-container {
            height: 60vh !important;
          }
          
          .hero-content h1 {
            font-size: 2rem !important;
          }
          
          .hero-content p {
            font-size: 1rem !important;
          }
          
          .container {
            padding-left: 16px;
            padding-right: 16px;
          }
          
          /* Stats Cards */
          .stat-box {
            margin-bottom: 8px;
          }
          
          .stat-box .card-body {
            padding: 1rem !important;
          }
          
          .fs-2 {
            font-size: 1.75rem !important;
          }
          
          h3 {
            font-size: 1.5rem;
          }
          
          /* Header buttons */
          .reports-card .btn,
          .awareness-card .btn {
            padding: 0.25rem 0.75rem;
            font-size: 0.875rem;
          }
          
          /* Post items */
          .post-item {
            padding: 0.75rem !important;
            margin-bottom: 0.5rem;
          }
          
          .post-item h6 {
            font-size: 0.9rem;
          }
          
          /* Categories */
          .category-item {
            padding: 0.75rem 0.5rem !important;
          }
          
          /* Report Card */
          .report-card .card-body {
            padding: 1.5rem !important;
          }
          
          /* Community Stats */
          .stat-box {
            padding: 1rem !important;
            margin-bottom: 0.5rem;
          }
          
          .stat-box h4 {
            font-size: 1.25rem;
          }
          
          /* Buttons */
          .btn {
            padding: 0.5rem 1rem;
            font-size: 0.9rem;
          }
          
          /* Video Controls */
          .video-controls {
            position: relative !important;
            top: auto !important;
            right: auto !important;
            justify-content: center;
            margin: 10px 0 !important;
          }
        }
        
        @media (max-width: 576px) {
          .video-container {
            height: 50vh !important;
          }
          
          .container {
            padding-left: 12px;
            padding-right: 12px;
          }
          
          /* Ensure proper spacing for mobile */
          .mb-3 {
            margin-bottom: 0.75rem !important;
          }
          
          .mb-4 {
            margin-bottom: 1rem !important;
          }
          
          .g-3 {
            gap: 0.75rem !important;
          }
          
          /* Make sure everything is visible */
          .card-body {
            padding: 1rem !important;
          }
          
          /* Fix for small screens */
          .row {
            margin-left: -6px;
            margin-right: -6px;
          }
          
          .col, .col-sm-6, .col-md-3, .col-lg-8, .col-lg-4 {
            padding-left: 6px;
            padding-right: 6px;
          }
          
          /* Search bar adjustments */
          .search-wrapper {
            width: 100%;
          }
        }
        
        @media (max-width: 375px) {
          /* Extra small screen adjustments */
          .video-container {
            height: 45vh !important;
          }
          
          .hero-content h1 {
            font-size: 1.75rem !important;
          }
          
          .hero-content p {
            font-size: 0.9rem !important;
          }
          
          h3 {
            font-size: 1.25rem;
          }
          
          .stat-box h4 {
            font-size: 1.1rem;
          }
          
          .btn {
            padding: 0.4rem 0.8rem;
            font-size: 0.85rem;
          }
        }
        
        /* Ensure proper touch targets */
        button, 
        .btn, 
        .category-item,
        .trending-item,
        .post-item {
          min-height: 44px;
        }
        
        /* Improve readability on mobile */
        body {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
      `}</style>
    </>
  );
}