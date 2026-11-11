'use client';

import { useState } from 'react';
import { Card, Spinner, Button, Badge, Dropdown, Modal, Form, Alert, ListGroup } from 'react-bootstrap';
import {
  FaUserCircle,
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaEllipsisV,
  FaPaperPlane,
  FaUserCheck,
  FaUserTimes,
  FaBan,
  FaArrowRight,
  FaUndo,
  FaExclamationTriangle,
  FaTimes,
  FaFlag
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

export default function MessageRequestList({ 
  requests, 
  type, 
  onRequestAction, 
  emptyState,
  loading = false
}) {
  const [processing, setProcessing] = useState(null);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'PENDING': {
        bg: 'warning',
        icon: FaClock,
        text: 'Pending'
      },
      'ACCEPTED': {
        bg: 'success',
        icon: FaCheckCircle,
        text: 'Accepted'
      },
      'DECLINED': {
        bg: 'danger',
        icon: FaTimesCircle,
        text: 'Declined'
      },
      'BLOCKED': {
        bg: 'dark',
        icon: FaBan,
        text: 'Blocked'
      },
      'CANCELLED': {
        bg: 'secondary',
        icon: FaUndo,
        text: 'Cancelled'
      }
    };

    const badge = badges[status] || badges['PENDING'];
    const Icon = badge.icon;

    return (
      <Badge bg={badge.bg} className="d-flex align-items-center gap-1">
        <Icon size={10} />
        {badge.text}
      </Badge>
    );
  };

  const handleAction = async (requestId, action) => {
    if (!onRequestAction) return;
    
    setProcessing(requestId);
    try {
      await onRequestAction(requestId, action);
    } finally {
      setProcessing(null);
    }
  };

  const openBlockModal = (request) => {
    setSelectedRequest(request);
    setShowBlockModal(true);
  };

  const openRejectModal = (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  const handleBlock = async () => {
    if (!selectedRequest) return;
    
    await handleAction(selectedRequest.id, 'BLOCKED');
    setShowBlockModal(false);
    setSelectedRequest(null);
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    // Pass reason if provided
    if (onRequestAction) {
      setProcessing(selectedRequest.id);
      try {
        await onRequestAction(selectedRequest.id, 'DECLINED', rejectReason || null);
      } finally {
        setProcessing(null);
      }
    }
    
    setShowRejectModal(false);
    setSelectedRequest(null);
    setRejectReason('');
  };

  const renderRequestItem = (request) => {
    const user = type === 'received' ? request.sender : request.receiver;
    const isProcessing = processing === request.id;
    const isPending = request.status === 'PENDING';

    return (
      <Card key={request.id} className="border-0 shadow-sm mb-3 hover-card">
        <Card.Body className="p-4">
          <div className="d-flex align-items-start gap-3">
            {/* User Avatar */}
            <div className="position-relative flex-shrink-0">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.displayName}
                  className="rounded-circle"
                  style={{ width: '56px', height: '56px', objectFit: 'cover' }}
                />
              ) : (
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                  style={{ width: '56px', height: '56px' }}>
                  <FaUserCircle size={28} className="text-secondary" />
                </div>
              )}
            </div>

            {/* Request Details */}
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h6 className="fw-bold mb-1">
                    {user?.displayName || user?.email || 'Unknown User'}
                  </h6>
                  {type === 'sent' ? (
                    <p className="text-muted small mb-0">
                      Sent to: {request.receiver?.displayName || request.receiver?.email}
                    </p>
                  ) : (
                    <p className="text-muted small mb-0">
                      {user?.email}
                    </p>
                  )}
                </div>
                
                <div className="d-flex flex-column align-items-end gap-1">
                  {getStatusBadge(request.status)}
                  <small className="text-muted">{formatTime(request.createdAt)}</small>
                </div>
              </div>

              {/* Message Preview */}
              {request.message && (
                <Card className="border-0 bg-light mt-3 mb-3">
                  <Card.Body className="p-3">
                    <p className="mb-0 small" style={{ whiteSpace: 'pre-wrap' }}>
                      "{request.message}"
                    </p>
                  </Card.Body>
                </Card>
              )}

              {/* Action Buttons for Received Requests */}
              {type === 'received' && isPending && (
                <div className="d-flex gap-2 mt-3">
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => handleAction(request.id, 'ACCEPTED')}
                    disabled={isProcessing}
                    className="d-flex align-items-center gap-2 flex-grow-1"
                  >
                    {isProcessing ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <>
                        <FaUserCheck size={14} />
                        Accept
                      </>
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={() => openRejectModal(request)}
                    disabled={isProcessing}
                    className="d-flex align-items-center gap-2 flex-grow-1"
                  >
                    <FaUserTimes size={14} />
                    Decline
                  </Button>
                  
                  <Dropdown>
                    <Dropdown.Toggle
                      size="sm"
                      variant="outline-secondary"
                      className="d-flex align-items-center"
                    >
                      <FaEllipsisV size={12} />
                    </Dropdown.Toggle>
                    <Dropdown.Menu>
                      <Dropdown.Item
                        onClick={() => openBlockModal(request)}
                        className="text-danger"
                      >
                        <FaBan className="me-2" />
                        Block User
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </div>
              )}

              {/* Action Buttons for Sent Requests */}
              {type === 'sent' && isPending && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    onClick={() => handleAction(request.id, 'CANCELLED')}
                    disabled={isProcessing}
                    className="d-flex align-items-center gap-2"
                  >
                    {isProcessing ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      <>
                        <FaTimes size={14} />
                        Cancel Request
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* View Conversation for Accepted Requests */}
              {request.status === 'ACCEPTED' && request.conversationId && (
                <div className="mt-3">
                  <Button
                    size="sm"
                    variant="primary"
                    href={`/dashboard/messaging/chat/${request.conversationId}`}
                    className="d-flex align-items-center gap-2"
                  >
                    <FaArrowRight size={14} />
                    View Conversation
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <Card className="border-0 text-center py-5">
      <Card.Body>
        <div className="mb-4">
          {emptyState.icon}
        </div>
        <h5 className="fw-bold mb-2" style={{ color: '#2d3748' }}>
          {emptyState.title}
        </h5>
        <p className="text-muted mb-4">
          {emptyState.message}
        </p>
        {emptyState.action && (
          <Button
            variant="primary"
            href={emptyState.actionLink || '/dashboard/messaging/new'}
            className="d-inline-flex align-items-center gap-2"
          >
            <FaPaperPlane />
            {emptyState.action}
          </Button>
        )}
      </Card.Body>
    </Card>
  );

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading requests...</p>
      </div>
    );
  }

  if (!requests || requests.length === 0) {
    return renderEmptyState();
  }

  return (
    <>
      <div>
        <div className="mb-3">
          <span className="text-muted small">
            Showing {requests.length} {type === 'received' ? 'received' : 'sent'} request{requests.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        {requests.map(renderRequestItem)}
      </div>

      {/* Block User Modal */}
      <Modal 
        show={showBlockModal} 
        onHide={() => setShowBlockModal(false)}
        centered
      >
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">
            <FaBan className="me-2 text-danger" />
            Block User
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body>
          <Alert variant="danger" className="d-flex align-items-center gap-2">
            <FaExclamationTriangle />
            <div>
              <h6 className="fw-semibold mb-1">Warning</h6>
              <p className="mb-0 small">This will block the user and decline their request.</p>
            </div>
          </Alert>
          
          <div className="bg-light rounded-3 p-3">
            <h6 className="fw-semibold mb-3">What happens when you block?</h6>
            <ListGroup variant="flush" className="bg-light">
              <ListGroup.Item className="border-0 px-0 bg-light">
                <div className="d-flex align-items-start gap-3">
                  <FaBan className="text-danger mt-1" />
                  <div>
                    <p className="mb-0 small">They won't be able to send you messages or requests</p>
                  </div>
                </div>
              </ListGroup.Item>
              <ListGroup.Item className="border-0 px-0 bg-light">
                <div className="d-flex align-items-start gap-3">
                  <FaFlag className="text-danger mt-1" />
                  <div>
                    <p className="mb-0 small">The user will be reported to moderators</p>
                  </div>
                </div>
              </ListGroup.Item>
            </ListGroup>
          </div>
        </Modal.Body>
        
        <Modal.Footer className="border-0">
          <Button
            variant="outline-secondary"
            onClick={() => setShowBlockModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleBlock}
            className="d-flex align-items-center gap-2"
          >
            <FaBan />
            Block User
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject/Decline Modal */}
      <Modal 
        show={showRejectModal} 
        onHide={() => setShowRejectModal(false)}
        centered
      >
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">
            Decline Request
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body>
          <p className="text-muted">
            Are you sure you want to decline this message request?
          </p>
          
          <Form.Group className="mt-3">
            <Form.Label className="fw-semibold">Reason (optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Why are you declining this request?"
              className="border-2 rounded-3"
            />
          </Form.Group>
        </Modal.Body>
        
        <Modal.Footer className="border-0">
          <Button
            variant="outline-secondary"
            onClick={() => setShowRejectModal(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleReject}
            className="d-flex align-items-center gap-2"
          >
            <FaTimesCircle />
            Decline Request
          </Button>
        </Modal.Footer>
      </Modal>
      
      <style jsx>{`
        .hover-card {
          transition: all 0.3s ease;
        }
        
        .hover-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
        }
      `}</style>
    </>
  );
}