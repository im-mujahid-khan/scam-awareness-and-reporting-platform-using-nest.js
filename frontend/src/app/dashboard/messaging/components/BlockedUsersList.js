'use client';

import { useState } from 'react';
import {
  ListGroup, Button, Badge, Spinner, Alert, Modal
} from 'react-bootstrap';
import {
  FaUserCircle,
  FaCheckCircle,
  FaTrash,
  FaBan,
  FaExclamationTriangle,
  FaClock,
  FaUserSlash
} from 'react-icons/fa';

export default function BlockedUsersList({ data, loading, emptyState, onUnblock }) {
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unblocking, setUnblocking] = useState(false);

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading blocked users...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-5">
        {emptyState.icon}
        <h5 className="fw-semibold mt-3 mb-2 text-dark">{emptyState.title}</h5>
        <p className="text-muted">{emptyState.message}</p>
        {emptyState.action && (
          <Button
            variant="primary"
            href={emptyState.actionLink}
            className="mt-3"
          >
            {emptyState.action}
          </Button>
        )}
      </div>
    );
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${Math.floor(diffDays / 30)} months ago`;
    } catch {
      return '';
    }
  };

  const openUnblockModal = (user) => {
    setSelectedUser(user);
    setShowUnblockModal(true);
  };

  const closeUnblockModal = () => {
    setShowUnblockModal(false);
    setSelectedUser(null);
  };

  const handleConfirmUnblock = async () => {
    if (!selectedUser) return;
    
    try {
      setUnblocking(true);
      await onUnblock(selectedUser.id);
      closeUnblockModal();
    } catch (error) {
      console.error('Failed to unblock:', error);
    } finally {
      setUnblocking(false);
    }
  };

  const renderUserItem = (user) => {
    const timeAgo = getTimeAgo(user.blockedAt);
    
    return (
      <ListGroup.Item
        key={user.id}
        className="border-0 py-3 px-4 hover-item"
        style={{ 
          transition: 'all 0.2s ease',
          borderRadius: '12px',
          marginBottom: '4px',
          border: '1px solid #f1f3f4'
        }}
      >
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div className="position-relative">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="rounded-circle"
                  style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                />
              ) : (
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                  style={{ width: '48px', height: '48px' }}>
                  <FaUserCircle size={24} className="text-secondary" />
                </div>
              )}
              
              {/* Blocked indicator */}
              <span 
                className="position-absolute bottom-0 end-0 bg-danger rounded-circle border border-white"
                style={{ width: '12px', height: '12px' }}
                title="Blocked"
              />
            </div>
            
            <div>
              <h6 className="fw-semibold mb-1 d-flex align-items-center gap-2">
                {user.displayName || user.email?.split('@')[0]}
                {user.verifiedAt && (
                  <FaCheckCircle size={12} className="text-info" title="Verified User" />
                )}
              </h6>
              <small className="text-muted">
                {user.email}
                {user.phone && ` • ${user.phone}`}
              </small>
              
              <div className="mt-1 small">
                <div className="d-flex gap-3">
                  <span className="text-danger">
                    <FaBan size={10} className="me-1" />
                    Blocked {timeAgo && `(${timeAgo})`}
                  </span>
                  {user.expiresAt && (
                    <span className="text-muted">
                      <FaClock size={10} className="me-1" />
                      Expires: {formatDate(user.expiresAt)}
                    </span>
                  )}
                </div>
                {user.blockReason && (
                  <div className="text-muted mt-1">
                    Reason: <span className="fw-medium">{user.blockReason}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="text-end">
            <Button 
              variant="outline-success"
              size="sm"
              onClick={() => openUnblockModal(user)}
              className="d-flex align-items-center gap-1 px-3"
            >
              <FaUserSlash size={12} />
              Unblock
            </Button>
          </div>
        </div>
      </ListGroup.Item>
    );
  };

  return (
    <>
      <ListGroup className="shadow-sm rounded-3 overflow-hidden">
        {data.map(renderUserItem)}
      </ListGroup>

      {/* Unblock Confirmation Modal */}
      <Modal show={showUnblockModal} onHide={closeUnblockModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Unblock User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <div className="text-center">
              <div className="mb-4">
                {selectedUser.avatarUrl ? (
                  <img
                    src={selectedUser.avatarUrl}
                    alt={selectedUser.displayName}
                    className="rounded-circle mb-3"
                    style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                  />
                ) : (
                  <div className="rounded-circle bg-light d-flex align-items-center justify-content-center mx-auto mb-3"
                    style={{ width: '80px', height: '80px' }}>
                    <FaUserCircle size={40} className="text-secondary" />
                  </div>
                )}
                <h5 className="fw-bold mb-1">{selectedUser.displayName || selectedUser.email?.split('@')[0]}</h5>
                <p className="text-muted mb-3">{selectedUser.email}</p>
                <Badge bg="danger" className="fs-6 px-3 py-1">
                  Blocked for: {selectedUser.blockReason || 'Not specified'}
                </Badge>
              </div>
              
              <Alert variant="info">
                <h6 className="fw-semibold mb-2">What happens when you unblock?</h6>
                <ul className="mb-0 text-start">
                  <li>They can send you new messages</li>
                  <li>They can see your online status</li>
                  <li>They can start new conversations with you</li>
                  <li>Your previous conversation history remains</li>
                </ul>
              </Alert>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeUnblockModal}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleConfirmUnblock}
            disabled={unblocking}
          >
            {unblocking ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Unblocking...
              </>
            ) : (
              'Confirm Unblock'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}