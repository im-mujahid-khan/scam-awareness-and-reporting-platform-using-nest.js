'use client';

import { useState } from 'react';
import { 
  Modal, Button, Dropdown, Form, Alert, 
  Spinner, ListGroup, Badge 
} from 'react-bootstrap';
import {
  FaFlag, FaBan, FaCopy, FaReply, FaTrash,
  FaExclamationTriangle, FaClock, FaCheck,
  FaEllipsisV, FaTimes, FaPaperclip
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';

export default function MessageActions({ 
  message, 
  onClose, 
  onReport, 
  onBlock,
  isOwnMessage = false 
}) {
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const predefinedReasons = [
    'Spam or misleading content',
    'Harassment or bullying',
    'Hate speech or symbols',
    'Violence or dangerous content',
    'Nudity or sexual content',
    'Scam or fraud',
    'Intellectual property violation',
    'Other'
  ];

  const handleCopyText = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => console.error('Failed to copy:', err));
    }
    onClose();
  };

  const handleReply = () => {
    // This would typically set up a reply in the parent component
    // For now, just close the modal
    onClose();
  };

  const handleDelete = () => {
    // This would call an API to delete the message
    // For now, just close the modal
    onClose();
  };

  const handleReport = async () => {
    if (!reportReason && !customReason) {
      return;
    }

    setReporting(true);
    try {
      const reason = reportReason === 'Other' ? customReason : reportReason;
      await onReport(message.id, reason);
      setShowReportModal(false);
      onClose();
    } catch (error) {
      console.error('Failed to report:', error);
    } finally {
      setReporting(false);
    }
  };

  const handleBlockUser = async () => {
    setBlocking(true);
    try {
      await onBlock();
      setShowBlockModal(false);
      onClose();
    } catch (error) {
      console.error('Failed to block user:', error);
    } finally {
      setBlocking(false);
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const renderMessagePreview = () => (
    <div className="message-preview bg-light rounded-3 p-3 mb-3">
      <div className="d-flex justify-content-between align-items-start mb-2">
        <div>
          <Badge bg="secondary" className="mb-1">
            {message.type || 'TEXT'}
          </Badge>
          <small className="text-muted d-block">
            Sent {formatTime(message.createdAt)}
          </small>
        </div>
        <Badge bg={message.status === 'READ' ? 'success' : 'secondary'}>
          {message.status || 'SENT'}
        </Badge>
      </div>
      
      {message.content && (
        <p className="mb-2" style={{ whiteSpace: 'pre-wrap' }}>
          {message.content.length > 200 
            ? `${message.content.substring(0, 200)}...` 
            : message.content}
        </p>
      )}
      
      {message.mediaUrl && (
        <div className="d-flex align-items-center gap-2 text-muted small">
          <FaPaperclip size={12} />
          <span>Media attached</span>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Main Actions Modal */}
      <Modal show={!!message} onHide={onClose} centered size="sm">
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold small">Message Actions</Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="p-0">
          {renderMessagePreview()}
          
          <ListGroup variant="flush">
            {!isOwnMessage && (
              <>
                <ListGroup.Item 
                  action 
                  className="d-flex align-items-center gap-3 py-3 border-0"
                  onClick={() => setShowReportModal(true)}
                >
                  <div className="text-danger">
                    <FaFlag />
                  </div>
                  <div>
                    <h6 className="fw-semibold mb-0">Report Message</h6>
                    <p className="text-muted small mb-0">Report inappropriate content</p>
                  </div>
                </ListGroup.Item>
                
                <ListGroup.Item 
                  action 
                  className="d-flex align-items-center gap-3 py-3 border-0"
                  onClick={() => setShowBlockModal(true)}
                >
                  <div className="text-danger">
                    <FaBan />
                  </div>
                  <div>
                    <h6 className="fw-semibold mb-0">Block User</h6>
                    <p className="text-muted small mb-0">Block and report user</p>
                  </div>
                </ListGroup.Item>
              </>
            )}
            
            <ListGroup.Item 
              action 
              className="d-flex align-items-center gap-3 py-3 border-0"
              onClick={handleCopyText}
            >
              <div className="text-primary">
                <FaCopy />
              </div>
              <div>
                <h6 className="fw-semibold mb-0">
                  {copied ? 'Copied!' : 'Copy Text'}
                </h6>
                <p className="text-muted small mb-0">Copy message to clipboard</p>
              </div>
            </ListGroup.Item>
            
            <ListGroup.Item 
              action 
              className="d-flex align-items-center gap-3 py-3 border-0"
              onClick={handleReply}
            >
              <div className="text-info">
                <FaReply />
              </div>
              <div>
                <h6 className="fw-semibold mb-0">Reply</h6>
                <p className="text-muted small mb-0">Reply to this message</p>
              </div>
            </ListGroup.Item>
            
            {isOwnMessage && (
              <ListGroup.Item 
                action 
                className="d-flex align-items-center gap-3 py-3 border-0 text-danger"
                onClick={handleDelete}
              >
                <div>
                  <FaTrash />
                </div>
                <div>
                  <h6 className="fw-semibold mb-0">Delete</h6>
                  <p className="text-muted small mb-0">Delete this message</p>
                </div>
              </ListGroup.Item>
            )}
          </ListGroup>
        </Modal.Body>
      </Modal>

      {/* Report Modal */}
      <Modal 
        show={showReportModal} 
        onHide={() => setShowReportModal(false)}
        centered
      >
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">
            <FaFlag className="me-2 text-danger" />
            Report Message
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body>
          <Alert variant="warning" className="d-flex align-items-center gap-2">
            <FaExclamationTriangle />
            Please select a reason for reporting this message
          </Alert>
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold">Reason for Report</Form.Label>
              <Form.Select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="border-2 rounded-3"
              >
                <option value="">Select a reason...</option>
                {predefinedReasons.map((reason, index) => (
                  <option key={index} value={reason}>{reason}</option>
                ))}
              </Form.Select>
            </Form.Group>
            
            {reportReason === 'Other' && (
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Please specify</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Describe the issue..."
                  className="border-2 rounded-3"
                />
              </Form.Group>
            )}
            
            <div className="bg-light rounded-3 p-3 mb-3">
              <h6 className="fw-semibold mb-2">What happens next?</h6>
              <ul className="mb-0 small text-muted">
                <li>Our moderation team will review the report</li>
                <li>We'll take appropriate action if guidelines are violated</li>
                <li>You may not see immediate changes</li>
                <li>We'll notify you of the outcome</li>
              </ul>
            </div>
          </Form>
        </Modal.Body>
        
        <Modal.Footer className="border-0">
          <Button
            variant="outline-secondary"
            onClick={() => setShowReportModal(false)}
            disabled={reporting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleReport}
            disabled={(!reportReason && !customReason) || reporting}
            className="d-flex align-items-center gap-2"
          >
            {reporting ? (
              <>
                <Spinner animation="border" size="sm" />
                <span>Reporting...</span>
              </>
            ) : (
              <>
                <FaFlag />
                <span>Report</span>
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

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
              <h6 className="fw-semibold mb-1">Warning: This action cannot be undone</h6>
              <p className="mb-0 small">You will no longer be able to communicate with this user.</p>
            </div>
          </Alert>
          
          <div className="bg-light rounded-3 p-3">
            <h6 className="fw-semibold mb-3">What happens when you block someone?</h6>
            <ListGroup variant="flush" className="bg-light">
              <ListGroup.Item className="border-0 px-0 bg-light">
                <div className="d-flex align-items-start gap-3">
                  <div className="text-danger">
                    <FaBan />
                  </div>
                  <div>
                    <h6 className="fw-semibold mb-1">No More Messages</h6>
                    <p className="text-muted small mb-0">
                      They won't be able to send you messages or requests
                    </p>
                  </div>
                </div>
              </ListGroup.Item>
              
              <ListGroup.Item className="border-0 px-0 bg-light">
                <div className="d-flex align-items-start gap-3">
                  <div className="text-danger">
                    <FaFlag />
                  </div>
                  <div>
                    <h6 className="fw-semibold mb-1">Automatic Report</h6>
                    <p className="text-muted small mb-0">
                      The user will be reported to our moderation team
                    </p>
                  </div>
                </div>
              </ListGroup.Item>
              
              <ListGroup.Item className="border-0 px-0 bg-light">
                <div className="d-flex align-items-start gap-3">
                  <div className="text-danger">
                    <FaTimes />
                  </div>
                  <div>
                    <h6 className="fw-semibold mb-1">No Profile Access</h6>
                    <p className="text-muted small mb-0">
                      You won't see each other's profiles or posts
                    </p>
                  </div>
                </div>
              </ListGroup.Item>
            </ListGroup>
          </div>
          
          <div className="mt-3 p-3 border rounded">
            <Form.Check 
              type="checkbox"
              id="report-block"
              label="Also report this user for violating community guidelines"
              defaultChecked
              className="fw-semibold"
            />
            <p className="text-muted small mt-1 mb-0">
              Reporting helps us keep the community safe for everyone
            </p>
          </div>
        </Modal.Body>
        
        <Modal.Footer className="border-0">
          <Button
            variant="outline-secondary"
            onClick={() => setShowBlockModal(false)}
            disabled={blocking}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleBlockUser}
            disabled={blocking}
            className="d-flex align-items-center gap-2"
          >
            {blocking ? (
              <>
                <Spinner animation="border" size="sm" />
                <span>Blocking...</span>
              </>
            ) : (
              <>
                <FaBan />
                <span>Block User</span>
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
      
      <style jsx>{`
        .message-preview {
          max-height: 200px;
          overflow-y: auto;
        }
        
        .list-group-item:hover {
          background-color: #f8f9fa;
        }
        
        .list-group-item:active {
          background-color: #e9ecef;
        }
      `}</style>
    </>
  );
}