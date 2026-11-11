'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Container, Row, Col, Card, Button, Badge, Form, Spinner, Alert, 
  Pagination, Modal 
} from 'react-bootstrap';
import { 
  FaBell, 
  FaFilter, 
  FaCheck, 
  FaCheckDouble, 
  FaTrash, 
  FaEnvelope, 
  FaEnvelopeOpen,
  FaComment,
  FaHeart,
  FaShieldAlt,
  FaUsers,
  FaSearch,
  FaCalendarAlt,
  FaSortAmountDown,
  FaSortAmountUp,
  FaArrowLeft,
  FaCheckCircle,
  FaExclamationTriangle,
  FaInfinity
} from 'react-icons/fa';
import { useNotifications } from '../../../lib/contexts/NotificationContext';
import { useAuth } from '../../../lib/contexts/AuthContext';
import NotificationItem from '../../../components/NotificationItem';
import Link from 'next/link';
import { toast } from 'react-toastify';

const NotificationsPage = () => {
  const { user } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    totalCount,
    markAllAsRead, 
    markAsRead, 
    deleteNotification,
    deleteBulkNotifications,
    isLoading, 
    refetch,
    loadMore,
    pagination
  } = useNotifications();
  
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [filters, setFilters] = useState({
    status: 'all', // all, read, unread
    type: 'all', // all, comment, like, verification, group
    sort: 'newest' // newest, oldest
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedNotifications, setSelectedNotifications] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [processing, setProcessing] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    unread: 0,
    read: 0,
    byType: {}
  });
  const [loadingMore, setLoadingMore] = useState(false);

  // Modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState(null);
  const [deletingNotification, setDeletingNotification] = useState(false);

  // Infinite scroll ref
  const bottomBoundaryRef = useRef(null);
  const notificationsPerPage = 20;

  // Initialize stats and filtered notifications
  useEffect(() => {
    if (notifications.length > 0) {
      calculateStats();
      applyFilters();
    } else {
      setFilteredNotifications([]);
      setStats({
        total: 0,
        unread: 0,
        read: 0,
        byType: {}
      });
    }
  }, [notifications, filters, searchTerm]);

  const calculateStats = () => {
    console.log('📊 Calculating stats from notifications:', notifications.length);
    
    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => !(n.read || n.isRead || n.is_read)).length,
      read: notifications.filter(n => (n.read || n.isRead || n.is_read)).length,
      byType: {}
    };

    // Count by type
    notifications.forEach(notification => {
      const type = notification.type || 'general';
      if (!stats.byType[type]) {
        stats.byType[type] = { total: 0, unread: 0 };
      }
      stats.byType[type].total++;
      if (!(notification.read || notification.isRead || notification.is_read)) {
        stats.byType[type].unread++;
      }
    });

    console.log('📊 Stats calculated:', stats);
    setStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...notifications];

    // Apply status filter
    if (filters.status === 'read') {
      filtered = filtered.filter(n => (n.read || n.isRead || n.is_read));
    } else if (filters.status === 'unread') {
      filtered = filtered.filter(n => !(n.read || n.isRead || n.is_read));
    }

    // Apply type filter
    if (filters.type !== 'all') {
      filtered = filtered.filter(n => n.type === filters.type);
    }

    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(n => 
        (n.title && n.title.toLowerCase().includes(term)) ||
        (n.message && n.message.toLowerCase().includes(term))
      );
    }

    // Apply sorting
    if (filters.sort === 'newest') {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (filters.sort === 'oldest') {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    setFilteredNotifications(filtered);
    setCurrentPage(1); // Reset to first page when filters change
    setSelectedNotifications([]); // Clear selection when filters change
  };

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        // When bottom boundary is visible and there are more notifications
        if (entries[0].isIntersecting && pagination.hasMore && !isLoading && !loadingMore) {
          console.log('📜 Loading more notifications (infinite scroll)...');
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const currentBoundary = bottomBoundaryRef.current;
    if (currentBoundary) {
      observer.observe(currentBoundary);
    }

    return () => {
      if (currentBoundary) {
        observer.unobserve(currentBoundary);
      }
    };
  }, [pagination.hasMore, isLoading, loadingMore]);

  const handleLoadMore = async () => {
    if (loadingMore || !pagination.hasMore) return;
    
    setLoadingMore(true);
    try {
      await loadMore();
      toast.success('Loaded more notifications', {
        position: "top-right",
        autoClose: 2000
      });
    } catch (error) {
      console.error('Failed to load more:', error);
      toast.error('Failed to load more notifications', {
        position: "top-right",
        autoClose: 3000
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const handleSelectNotification = (notificationId) => {
    setSelectedNotifications(prev => {
      if (prev.includes(notificationId)) {
        return prev.filter(id => id !== notificationId);
      } else {
        return [...prev, notificationId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === currentNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(currentNotifications.map(n => n.id));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedNotifications.length === 0) return;

    setProcessing(true);
    
    try {
      if (bulkAction === 'mark-read') {
        // Mark selected as read
        for (const id of selectedNotifications) {
          await markAsRead(id);
        }
        toast.success(`Marked ${selectedNotifications.length} notification(s) as read`, {
          position: "top-right",
          autoClose: 3000
        });
        
        setSelectedNotifications([]);
        setBulkAction('');
      } else if (bulkAction === 'delete') {
        // Show confirmation modal for bulk delete
        setNotificationToDelete(selectedNotifications);
        setShowDeleteModal(true);
      }
      
    } catch (error) {
      console.error('Bulk action error:', error);
      toast.error(`Failed to ${bulkAction} notifications: ${error.message}`, {
        position: "top-right",
        autoClose: 4000
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      console.log('📖 Marking notification as read:', notificationId);
      await markAsRead(notificationId);
      
      toast.success('Notification marked as read', {
        position: "top-right",
        autoClose: 2000
      });
    } catch (error) {
      console.error('Failed to mark as read:', error);
      toast.error('Failed to mark as read', {
        position: "top-right",
        autoClose: 3000
      });
    }
  };

  const handleDeleteClick = (notificationId, e) => {
    e.stopPropagation();
    setNotificationToDelete([notificationId]);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!notificationToDelete || notificationToDelete.length === 0) return;

    setDeletingNotification(true);
    
    try {
      if (notificationToDelete.length === 1) {
        // Single notification delete
        await deleteNotification(notificationToDelete[0]);
        toast.success('Notification deleted successfully', {
          position: "top-right",
          autoClose: 2000
        });
      } else {
        // Bulk delete
        await deleteBulkNotifications(notificationToDelete);
        toast.success(`Deleted ${notificationToDelete.length} notifications`, {
          position: "top-right",
          autoClose: 3000
        });
        // Clear bulk selection after successful delete
        setSelectedNotifications([]);
        setBulkAction('');
      }
      
      setShowDeleteModal(false);
      setNotificationToDelete(null);
      
    } catch (error) {
      console.error('Failed to delete:', error);
      toast.error('Failed to delete notification(s)', {
        position: "top-right",
        autoClose: 3000
      });
    } finally {
      setDeletingNotification(false);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'comment': 
      case 'COMMENT': 
      case 'NEW_COMMENT':
        return <FaComment className="text-success" />;
      case 'like': 
      case 'LIKE': 
        return <FaHeart className="text-danger" />;
      case 'verification': 
      case 'VERIFICATION': 
      case 'POST_SUBMITTED_FOR_REVIEW':
        return <FaShieldAlt className="text-warning" />;
      case 'group': 
      case 'GROUP': 
      case 'JOIN_REQUEST':
        return <FaUsers className="text-info" />;
      default: 
        return <FaBell className="text-primary" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'comment': 
      case 'COMMENT': 
      case 'NEW_COMMENT':
        return '#10b981';
      case 'like': 
      case 'LIKE': 
        return '#ef4444';
      case 'verification': 
      case 'VERIFICATION': 
      case 'POST_SUBMITTED_FOR_REVIEW':
        return '#f59e0b';
      case 'group': 
      case 'GROUP': 
      case 'JOIN_REQUEST':
        return '#3b82f6';
      default: 
        return '#667eea';
    }
  };

  const getTypeDisplay = (type) => {
    switch (type) {
      case 'POST_SUBMITTED_FOR_REVIEW': return 'Post Review';
      case 'JOIN_REQUEST': return 'Join Request';
      case 'NEW_COMMENT': return 'New Comment';
      case 'comment': 
      case 'COMMENT': return 'Comments';
      case 'like': 
      case 'LIKE': return 'Likes';
      case 'verification': 
      case 'VERIFICATION': return 'Verifications';
      case 'group': 
      case 'GROUP': return 'Groups';
      default: return type?.charAt(0).toUpperCase() + type?.slice(1).toLowerCase() || 'General';
    }
  };

  // Pagination calculations
  const indexOfLastNotification = currentPage * notificationsPerPage;
  const indexOfFirstNotification = indexOfLastNotification - notificationsPerPage;
  const currentNotifications = filteredNotifications.slice(indexOfFirstNotification, indexOfLastNotification);
  const totalPages = Math.ceil(filteredNotifications.length / notificationsPerPage);

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilters({ status: 'all', type: 'all', sort: 'newest' });
    setSelectedNotifications([]);
    setBulkAction('');
  };

  const handleNotificationClick = async (notification) => {
    console.log('🖱️ Notification clicked:', notification.id, 'Read status:', notification.read || notification.isRead);
    
    // Mark as read when clicked if not already read
    if (!(notification.read || notification.isRead || notification.is_read)) {
      console.log('📖 Marking as read...');
      await handleMarkAsRead(notification.id);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast.success('All notifications marked as read', {
        position: "top-right",
        autoClose: 3000
      });
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read', {
        position: "top-right",
        autoClose: 3000
      });
    }
  };

  if (!user) {
    return (
      <div className="min-vh-100 d-flex align-items-center justify-content-center">
        <Container>
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <FaBell className="text-muted mb-4" style={{ fontSize: '4rem', opacity: 0.3 }} />
                <h4 className="fw-bold mb-3">Sign in to view notifications</h4>
                <p className="text-muted mb-4">
                  You need to be logged in to access your notifications.
                </p>
                <Link href="/auth/login?callbackUrl=/notifications">
                  <Button
                    variant="primary"
                    className="px-4 py-3 rounded-pill shadow-sm border-0 fw-semibold"
                    style={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}
                  >
                    Sign In
                  </Button>
                </Link>
              </div>
            </Col>
          </Row>
        </Container>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      <Container className="py-4">
        {/* Back Button */}
        <div className="mb-4">
          <Link href="/" className="text-decoration-none d-inline-flex align-items-center">
            <FaArrowLeft className="me-2" />
            <span style={{ color: '#667eea' }}>Back to Home</span>
          </Link>
        </div>

        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="fw-bold display-6 mb-2" style={{ color: '#2d3748' }}>
                  Notifications
                </h1>
                <p className="text-muted mb-0">
                  {stats.total} total notifications • {stats.unread} unread
                  {pagination.hasMore && <span className="ms-2">• <FaInfinity className="text-primary" /> More available</span>}
                </p>
              </div>
              <div className="d-flex align-items-center gap-2">
                {stats.unread > 0 && (
                  <Badge
                    bg="danger"
                    pill
                    className="py-2 px-3 fw-bold"
                    style={{ fontSize: '0.9rem' }}
                  >
                    {stats.unread} unread
                  </Badge>
                )}
                <Button
                  variant="outline-primary"
                  onClick={refetch}
                  className="rounded-pill border-0"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                    border: '1px solid #e9ecef',
                    color: '#667eea'
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
          </Col>
        </Row>

        {/* Stats Cards */}
        <Row className="mb-4">
          <Col xl={3} lg={6} md={6} className="mb-3">
            <Card className="border-0 shadow-sm h-100 rounded-4">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h6 className="text-muted mb-2">Total Notifications</h6>
                    <h3 className="fw-bold mb-0" style={{ color: '#2d3748' }}>
                      {stats.total}
                    </h3>
                  </div>
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-3"
                    style={{
                      width: '56px',
                      height: '56px',
                      background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                    }}
                  >
                    <FaBell size={24} style={{ color: '#667eea' }} />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xl={3} lg={6} md={6} className="mb-3">
            <Card className="border-0 shadow-sm h-100 rounded-4">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h6 className="text-muted mb-2">Unread</h6>
                    <h3 className="fw-bold mb-0" style={{ color: '#ef4444' }}>
                      {stats.unread}
                    </h3>
                  </div>
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-3"
                    style={{
                      width: '56px',
                      height: '56px',
                      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)'
                    }}
                  >
                    <FaEnvelope size={24} style={{ color: '#ef4444' }} />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xl={3} lg={6} md={6} className="mb-3">
            <Card className="border-0 shadow-sm h-100 rounded-4">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h6 className="text-muted mb-2">Read</h6>
                    <h3 className="fw-bold mb-0" style={{ color: '#10b981' }}>
                      {stats.read}
                    </h3>
                  </div>
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-3"
                    style={{
                      width: '56px',
                      height: '56px',
                      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)'
                    }}
                  >
                    <FaEnvelopeOpen size={24} style={{ color: '#10b981' }} />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>

          <Col xl={3} lg={6} md={6} className="mb-3">
            <Card className="border-0 shadow-sm h-100 rounded-4">
              <Card.Body className="p-4">
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <h6 className="text-muted mb-2">Types</h6>
                    <h3 className="fw-bold mb-0" style={{ color: '#2d3748' }}>
                      {Object.keys(stats.byType).length}
                    </h3>
                  </div>
                  <div 
                    className="d-flex align-items-center justify-content-center rounded-3"
                    style={{
                      width: '56px',
                      height: '56px',
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.1) 100%)'
                    }}
                  >
                    <FaFilter size={24} style={{ color: '#3b82f6' }} />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Filters and Bulk Actions */}
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="p-4">
                <Row className="g-3 align-items-center">
                  {/* Search */}
                  <Col lg={4} md={6} className="mb-3 mb-md-0">
                    <div className="position-relative">
                      <FaSearch
                        className="position-absolute text-muted"
                        style={{ left: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                      />
                      <Form.Control
                        type="text"
                        placeholder="Search notifications..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="ps-5 py-3 border-0 bg-light rounded-pill"
                        style={{ paddingLeft: '50px' }}
                      />
                    </div>
                  </Col>

                  {/* Filters */}
                  <Col lg={8} md={6}>
                    <div className="d-flex flex-wrap gap-3">
                      {/* Status Filter */}
                      <Form.Select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className="rounded-pill border-0 bg-light"
                        style={{ width: '140px' }}
                      >
                        <option value="all">All Status</option>
                        <option value="unread">Unread Only</option>
                        <option value="read">Read Only</option>
                      </Form.Select>

                      {/* Type Filter */}
                      <Form.Select
                        value={filters.type}
                        onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value }))}
                        className="rounded-pill border-0 bg-light"
                        style={{ width: '140px' }}
                      >
                        <option value="all">All Types</option>
                        <option value="NEW_COMMENT">Comments</option>
                        <option value="LIKE">Likes</option>
                        <option value="verification">Verifications</option>
                        <option value="group">Groups</option>
                        <option value="POST_SUBMITTED_FOR_REVIEW">Post Reviews</option>
                        <option value="JOIN_REQUEST">Join Requests</option>
                      </Form.Select>

                      {/* Sort Filter */}
                      <Form.Select
                        value={filters.sort}
                        onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}
                        className="rounded-pill border-0 bg-light"
                        style={{ width: '140px' }}
                      >
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                      </Form.Select>

                      {/* Bulk Actions */}
                      {selectedNotifications.length > 0 && (
                        <div className="d-flex align-items-center gap-2">
                          <Form.Select
                            value={bulkAction}
                            onChange={(e) => setBulkAction(e.target.value)}
                            className="rounded-pill border-0 bg-light"
                            style={{ width: '160px' }}
                            disabled={processing}
                          >
                            <option value="">Bulk Actions</option>
                            <option value="mark-read">Mark as Read</option>
                            <option value="delete">Delete Selected</option>
                          </Form.Select>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={handleBulkAction}
                            className="rounded-pill"
                            disabled={!bulkAction || processing}
                          >
                            {processing ? <Spinner size="sm" /> : 'Apply'}
                          </Button>
                        </div>
                      )}

                      {/* Mark All as Read Button */}
                      {stats.unread > 0 && (
                        <Button
                          variant="outline-success"
                          onClick={handleMarkAllAsRead}
                          className="rounded-pill border-0"
                          style={{
                            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                            color: '#065f46',
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                          }}
                        >
                          <FaCheckDouble className="me-2" />
                          Mark All Read
                        </Button>
                      )}

                      {/* Clear Filters Button */}
                      {(searchTerm || filters.status !== 'all' || filters.type !== 'all') && (
                        <Button
                          variant="outline-secondary"
                          onClick={handleClearFilters}
                          className="rounded-pill border-0"
                          style={{
                            background: 'linear-gradient(135deg, rgba(107, 114, 128, 0.1) 0%, rgba(75, 85, 99, 0.1) 100%)',
                            color: '#6b7280',
                            border: '1px solid rgba(107, 114, 128, 0.2)'
                          }}
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Notification Type Summary */}
        {Object.keys(stats.byType).length > 0 && (
          <Row className="mb-4">
            <Col>
              <Card className="border-0 shadow-sm rounded-4">
                <Card.Body className="p-4">
                  <h6 className="fw-bold mb-3" style={{ color: '#4a5568' }}>
                    Notification Types
                  </h6>
                  <div className="d-flex flex-wrap gap-3">
                    {Object.entries(stats.byType).map(([type, data]) => (
                      <div
                        key={type}
                        className="d-flex align-items-center gap-2 px-3 py-2 rounded-3"
                        style={{
                          background: `linear-gradient(135deg, ${getTypeColor(type)}10 0%, ${getTypeColor(type)}05 100%)`,
                          border: `1px solid ${getTypeColor(type)}20`,
                          cursor: 'pointer'
                        }}
                        onClick={() => setFilters(prev => ({ ...prev, type }))}
                      >
                        <div className="d-flex align-items-center gap-2">
                          {getTypeIcon(type)}
                          <span className="fw-medium text-capitalize" style={{ color: getTypeColor(type) }}>
                            {getTypeDisplay(type)}
                          </span>
                        </div>
                        <Badge
                          bg=""
                          className="py-1 px-2 rounded-pill"
                          style={{
                            background: getTypeColor(type),
                            color: 'white',
                            fontSize: '0.75rem'
                          }}
                        >
                          {data.total}
                          {data.unread > 0 && (
                            <span className="ms-1">
                              ({data.unread} new)
                            </span>
                          )}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}

        {/* Notifications List */}
        <Row>
          <Col>
            <Card className="border-0 shadow-sm rounded-4 overflow-hidden">
              <Card.Body className="p-0">
                {/* Header with Select All */}
                {filteredNotifications.length > 0 && (
                  <div className="px-4 py-3 border-bottom d-flex align-items-center justify-content-between">
                    <div className="d-flex align-items-center gap-3">
                      <Form.Check
                        type="checkbox"
                        checked={selectedNotifications.length === currentNotifications.length && currentNotifications.length > 0}
                        onChange={handleSelectAll}
                        label={`Select ${selectedNotifications.length > 0 ? `${selectedNotifications.length} of ` : ''}${currentNotifications.length}`}
                      />
                      {selectedNotifications.length > 0 && (
                        <span className="text-muted small">
                          {selectedNotifications.length} notification(s) selected
                        </span>
                      )}
                    </div>
                    <div className="text-muted small">
                      Showing {indexOfFirstNotification + 1}-{Math.min(indexOfLastNotification, filteredNotifications.length)} of {filteredNotifications.length} notifications
                      {pagination.hasMore && <span className="ms-2 text-primary">• More available</span>}
                    </div>
                  </div>
                )}

                {/* Notifications */}
                <div style={{ maxHeight: 'none', overflowY: 'visible' }}>
                  {isLoading && notifications.length === 0 ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                      <p className="mt-3 text-muted">Loading notifications...</p>
                    </div>
                  ) : currentNotifications.length === 0 ? (
                    <div className="text-center py-5">
                      <FaBell className="text-muted mb-3" size={48} style={{ opacity: 0.3 }} />
                      <h5 className="fw-bold mb-2" style={{ color: '#4a5568' }}>
                        {searchTerm || filters.status !== 'all' || filters.type !== 'all'
                          ? 'No notifications match your filters'
                          : 'No notifications yet'}
                      </h5>
                      <p className="text-muted mb-4">
                        {searchTerm || filters.status !== 'all' || filters.type !== 'all'
                          ? 'Try changing your filters to see more notifications'
                          : "You're all caught up! You'll see notifications here when you receive them."}
                      </p>
                      {(searchTerm || filters.status !== 'all' || filters.type !== 'all') && (
                        <Button
                          variant="outline-primary"
                          onClick={handleClearFilters}
                          className="rounded-pill"
                        >
                          Clear Filters
                        </Button>
                      )}
                    </div>
                  ) : (
                    <>
                      {currentNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 border-bottom d-flex align-items-start gap-3 ${selectedNotifications.includes(notification.id) ? 'bg-light' : ''}`}
                          style={{
                            background: !(notification.read || notification.isRead || notification.is_read) ? 'rgba(102, 126, 234, 0.03)' : 'transparent',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer',
                            position: 'relative'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = selectedNotifications.includes(notification.id) 
                            ? 'rgba(102, 126, 234, 0.08)' 
                            : 'rgba(102, 126, 234, 0.05)'
                          }
                          onMouseLeave={(e) => e.currentTarget.style.background = selectedNotifications.includes(notification.id) 
                            ? 'rgba(102, 126, 234, 0.05)' 
                            : !(notification.read || notification.isRead || notification.is_read) ? 'rgba(102, 126, 234, 0.03)' : 'transparent'
                          }
                          onClick={() => handleNotificationClick(notification)}
                        >
                          {/* Checkbox for selection */}
                          <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                            <Form.Check
                              type="checkbox"
                              checked={selectedNotifications.includes(notification.id)}
                              onChange={() => handleSelectNotification(notification.id)}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>

                          {/* Notification Content */}
                          <div className="flex-grow-1">
                            <NotificationItem 
                              notification={notification}
                              showMarkAsRead={false}
                              showDelete={false}
                            />
                          </div>

                          {/* Quick Actions */}
                          <div className="d-flex flex-column gap-2 ms-2" onClick={(e) => e.stopPropagation()}>
                            {/* Mark as Read Button */}
                            {!(notification.read || notification.isRead || notification.is_read) && (
                              <Button
                                variant="outline-success"
                                size="sm"
                                className="rounded-pill border-0"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                                  color: '#065f46',
                                  width: '36px',
                                  height: '36px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                                onClick={() => handleMarkAsRead(notification.id)}
                                title="Mark as read"
                              >
                                <FaCheck size={14} />
                              </Button>
                            )}

                            {/* Marked as Read Indicator */}
                            {(notification.read || notification.isRead || notification.is_read) && (
                              <div
                                className="rounded-pill border-0 d-flex align-items-center justify-content-center"
                                style={{
                                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)',
                                  color: '#10b981',
                                  width: '36px',
                                  height: '36px',
                                  border: '1px solid rgba(16, 185, 129, 0.2)'
                                }}
                                title="Already read"
                              >
                                <FaCheckCircle size={14} />
                              </div>
                            )}

                            {/* Delete Button */}
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="rounded-pill border-0"
                              style={{
                                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)',
                                color: '#dc2626',
                                width: '36px',
                                height: '36px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              onClick={(e) => handleDeleteClick(notification.id, e)}
                              title="Delete notification"
                            >
                              <FaTrash size={14} />
                            </Button>
                          </div>

                          {/* Read Status Badge - Only show if unread */}
                          {!(notification.read || notification.isRead || notification.is_read) && (
                            <div className="position-absolute top-0 end-0 p-2">
                              <Badge
                                pill
                                className="px-2 py-1"
                                style={{
                                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                  color: 'white',
                                  fontSize: '0.7rem'
                                }}
                              >
                                NEW
                              </Badge>
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Load More Button / Infinite Scroll Trigger */}
                      {pagination.hasMore && (
                        <div 
                          ref={bottomBoundaryRef}
                          className="text-center py-4 border-top"
                        >
                          {loadingMore ? (
                            <div>
                              <Spinner animation="border" variant="primary" size="sm" />
                              <p className="mt-2 text-muted small mb-0">Loading more notifications...</p>
                            </div>
                          ) : (
                            <Button
                              variant="outline-primary"
                              onClick={handleLoadMore}
                              className="rounded-pill px-4"
                            >
                              <FaInfinity className="me-2" />
                              Load More Notifications
                            </Button>
                          )}
                        </div>
                      )}

                      {/* End of notifications indicator */}
                      {!pagination.hasMore && filteredNotifications.length > 0 && (
                        <div className="text-center py-3 border-top">
                          <p className="text-muted small mb-0">
                            <FaCheckCircle className="me-2 text-success" />
                            You've reached the end of your notifications
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Pagination */}
        {totalPages > 1 && (
          <Row className="mt-4">
            <Col>
              <div className="d-flex justify-content-center">
                <Pagination className="mb-0">
                  <Pagination.Prev
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="rounded-pill me-2 border-0"
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                      border: '1px solid #e9ecef'
                    }}
                  />
                  
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
                    const shouldShow = 
                      pageNumber === 1 ||
                      pageNumber === totalPages ||
                      (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1);
                    
                    if (!shouldShow) {
                      if (pageNumber === currentPage - 2 || pageNumber === currentPage + 2) {
                        return <Pagination.Ellipsis key={pageNumber} className="mx-1" />;
                      }
                      return null;
                    }
                    
                    return (
                      <Pagination.Item
                        key={pageNumber}
                        active={currentPage === pageNumber}
                        onClick={() => setCurrentPage(pageNumber)}
                        className="rounded-pill mx-1 border-0"
                        style={{
                          background: currentPage === pageNumber
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                          border: '1px solid #e9ecef',
                          color: currentPage === pageNumber ? 'white' : '#6b7280'
                        }}
                      >
                        {pageNumber}
                      </Pagination.Item>
                    );
                  })}
                  
                  <Pagination.Next
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="rounded-pill ms-2 border-0"
                    style={{
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                      border: '1px solid #e9ecef'
                    }}
                  />
                </Pagination>
              </div>
              <div className="text-center mt-3 text-muted small">
                Page {currentPage} of {totalPages} • {filteredNotifications.length} notifications shown
                {pagination.hasMore && <span className="ms-2 text-primary">• More available from backend</span>}
              </div>
            </Col>
          </Row>
        )}

        {/* Quick Actions Footer */}
        {filteredNotifications.length > 0 && (
          <Row className="mt-4">
            <Col>
              <Card className="border-0 shadow-sm rounded-4">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="fw-bold mb-1" style={{ color: '#4a5568' }}>
                        Quick Actions
                      </h6>
                      <p className="text-muted small mb-0">
                        Manage your notifications efficiently
                      </p>
                    </div>
                    <div className="d-flex gap-3">
                      {stats.unread > 0 && (
                        <Button
                          variant="success"
                          onClick={handleMarkAllAsRead}
                          className="rounded-pill px-4"
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            border: 'none'
                          }}
                        >
                          <FaCheckDouble className="me-2" />
                          Mark All Read
                        </Button>
                      )}
                      <Button
                        variant="outline-primary"
                        onClick={refetch}
                        className="rounded-pill px-4"
                      >
                        <FaBell className="me-2" />
                        Refresh
                      </Button>
                      {pagination.hasMore && (
                        <Button
                          variant="outline-secondary"
                          onClick={handleLoadMore}
                          disabled={loadingMore}
                          className="rounded-pill px-4"
                        >
                          {loadingMore ? (
                            <>
                              <Spinner size="sm" className="me-2" />
                              Loading...
                            </>
                          ) : (
                            <>
                              <FaInfinity className="me-2" />
                              Load More
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </Container>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaExclamationTriangle className="text-danger me-2" />
            Confirm Delete
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {notificationToDelete && notificationToDelete.length === 1 ? (
            <p>Are you sure you want to delete this notification? This action cannot be undone.</p>
          ) : (
            <p>Are you sure you want to delete {notificationToDelete?.length || 0} selected notifications? This action cannot be undone.</p>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="outline-secondary" 
            onClick={() => setShowDeleteModal(false)}
            disabled={deletingNotification}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={confirmDelete}
            disabled={deletingNotification}
          >
            {deletingNotification ? (
              <>
                <Spinner size="sm" className="me-2" />
                Deleting...
              </>
            ) : (
              'Delete'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default NotificationsPage;