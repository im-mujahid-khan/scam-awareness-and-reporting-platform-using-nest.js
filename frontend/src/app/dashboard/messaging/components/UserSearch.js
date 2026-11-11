'use client';

import { useState, useCallback, useEffect } from 'react';
import { 
  Form, InputGroup, Spinner, ListGroup, Button, 
  Badge, Alert, Modal, Container, Row, Col 
} from 'react-bootstrap';
import { 
  FaSearch, FaUserCircle, FaCheckCircle, FaRegClock, 
  FaRegCommentDots, FaExclamationTriangle, FaPaperPlane, FaTimes 
} from 'react-icons/fa';
import { useAuth } from '../../../../../lib/contexts/AuthContext';
import { toast } from 'react-toastify';

export default function UserSearch({ onUserSelect }) {
  const { api } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [error, setError] = useState(null);
  
  // Modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [requestMessage, setRequestMessage] = useState('');
  const [sendingRequest, setSendingRequest] = useState(false);

  // Store user status locally
  const [userStatus, setUserStatus] = useState({});

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Perform search when debounced term changes
  useEffect(() => {
    if (debouncedSearch.trim().length < 2) {
      setSearchResults([]);
      setFilteredResults([]);
      setUserStatus({});
      return;
    }

    performSearch(debouncedSearch);
  }, [debouncedSearch]);

  // Filter results based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredResults(searchResults);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = searchResults.filter(user => {
      const displayName = (user.displayName || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const phone = (user.phone || '').toLowerCase();
      
      return displayName.includes(term) || 
             email.includes(term) || 
             phone.includes(term);
    });
    
    setFilteredResults(filtered);
  }, [searchResults, searchTerm]);

  const performSearch = useCallback(async (query) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.messaging.searchUsersForMessaging(query);
      const results = Array.isArray(response) ? response : response?.data || response?.users || [];
      setSearchResults(results);
      
      // Check status for each user
      await checkUserStatuses(results);
    } catch (error) {
      console.error('Search failed:', error);
      setError('Failed to search users');
      setSearchResults([]);
      setFilteredResults([]);
      setUserStatus({});
    } finally {
      setLoading(false);
    }
  }, [api]);

  // Check user status (existing conversation or pending request)
  const checkUserStatuses = async (users) => {
    const statusMap = {};
    
    try {
      // Get existing conversations
      const conversationsRes = await api.messaging.getConversations();
      const conversations = Array.isArray(conversationsRes) ? conversationsRes : 
                           conversationsRes?.data || [];
      
      // Get sent requests
      const requestsRes = await api.messaging.getMessageRequests({ type: 'sent' });
      const sentRequests = Array.isArray(requestsRes) ? requestsRes : 
                          requestsRes?.data || requestsRes?.requests || [];
      
      users.forEach(user => {
        // Check if conversation exists
        const existingConv = conversations.find(conv => 
          conv.participants?.some(p => p.id === user.id) ||
          conv.otherUser?.id === user.id
        );
        
        // Check if request exists
        const existingRequest = sentRequests.find(req => 
          req.receiverId === user.id || 
          req.receiver?.id === user.id
        );
        
        statusMap[user.id] = {
          hasConversation: !!existingConv,
          hasPendingRequest: existingRequest?.status === 'PENDING',
          hasAcceptedRequest: existingRequest?.status === 'ACCEPTED',
          conversationId: existingConv?.id,
          requestId: existingRequest?.id
        };
      });
      
      setUserStatus(statusMap);
    } catch (error) {
      console.error('Failed to check user statuses:', error);
    }
  };

  // Open request modal
  const openRequestModal = (user) => {
    setSelectedUser(user);
    setRequestMessage(`Hello ${user.displayName || user.email?.split('@')[0]}, I'd like to connect with you.`);
    setShowRequestModal(true);
    setError(null);
  };

  // Close request modal
  const closeRequestModal = () => {
    setShowRequestModal(false);
    setSelectedUser(null);
    setRequestMessage('');
    setSendingRequest(false);
    setError(null);
  };

  // Handle sending message request from modal
  const handleSendRequestFromModal = async () => {
    if (!selectedUser || !requestMessage.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    try {
      setSendingRequest(true);
      setError(null);

      // Send new message request
      const response = await api.messaging.sendMessageRequest({
        receiverId: selectedUser.id,
        message: requestMessage.trim()
      });

      toast.success('Message request sent successfully!');
      
      // Update user status
      setUserStatus(prev => ({
        ...prev,
        [selectedUser.id]: {
          ...prev[selectedUser.id],
          hasPendingRequest: true,
          requestId: response.id || response.data?.id
        }
      }));
      
      // Close modal
      closeRequestModal();
      
    } catch (error) {
      console.error('Failed to send request:', error);
      
      // Handle specific backend error messages
      const errorMessage = error.response?.data?.message || error.message;
      
      if (errorMessage.includes('Conversation already exists')) {
        setError('You already have a conversation with this user. Check your inbox.');
        toast.info('Conversation already exists. Check your inbox.');
      } else if (errorMessage.includes('Request already exists') || 
                 errorMessage.includes('already sent') ||
                 errorMessage.includes('pending request')) {
        setError('Message request already sent and pending approval.');
        toast.warning('Message request already sent and pending.');
      } else if (errorMessage.includes('Request already accepted')) {
        setError('Your request was already accepted. Check your conversations.');
        toast.info('Request already accepted. Check your conversations.');
      } else if (errorMessage.includes('Request was declined')) {
        setError('Your previous request was declined.');
        toast.error('Your previous request was declined.');
      } else {
        setError('Failed to send message request. Please try again.');
        toast.error('Failed to send message request');
      }
    } finally {
      setSendingRequest(false);
    }
  };

  // Handle user selection (for starting new conversation)
  const handleUserSelect = async (user) => {
    try {
      const status = userStatus[user.id];
      
      // If user has existing conversation, go to it
      if (status?.hasConversation && status.conversationId) {
        window.location.href = `/dashboard/messaging/chat/${status.conversationId}`;
        return;
      }
      
      // If request was accepted, create conversation
      if (status?.hasAcceptedRequest) {
        // Create conversation for accepted request
        const conversationData = {
          type: 'USER_TO_USER',
          otherUserId: user.id
        };
        
        const response = await api.messaging.createOrGetConversation(conversationData);
        const conversation = response?.data || response;
        
        if (conversation.id) {
          window.location.href = `/dashboard/messaging/chat/${conversation.id}`;
        }
        return;
      }
      
      // If pending request exists, show info
      if (status?.hasPendingRequest) {
        toast.info('Message request already sent and pending approval.');
        return;
      }
      
      // If can message directly (already connected) - RARE CASE
      if (user.canMessage && !status?.hasConversation) {
        onUserSelect(user);
        return;
      }
      
      // Otherwise, ALWAYS open request modal (this is the main flow)
      openRequestModal(user);
      
    } catch (error) {
      console.error('Failed to handle user selection:', error);
      
      // Check for conversation already exists error
      if (error.message?.includes('Conversation already exists') ||
          error.response?.data?.message?.includes('Conversation already exists')) {
        
        // Try to find existing conversation
        try {
          const convResponse = await api.messaging.getConversations();
          const conversations = Array.isArray(convResponse) ? convResponse : convResponse?.data || [];
          
          const existingConv = conversations.find(conv => 
            conv.participants?.some(p => p.id === user.id) ||
            conv.otherUser?.id === user.id
          );
          
          if (existingConv) {
            window.location.href = `/dashboard/messaging/chat/${existingConv.id}`;
            return;
          }
        } catch (findError) {
          console.error('Failed to find existing conversation:', findError);
        }
        
        toast.info('Conversation already exists. Check your inbox.');
      } else {
        toast.error('Failed to start conversation');
      }
    }
  };

  const renderUserItem = (user) => {
    const status = userStatus[user.id];
    
    return (
      <ListGroup.Item
        key={user.id}
        className="border-0 py-3 px-4 hover-item"
        action
        onClick={() => handleUserSelect(user)}
        style={{ 
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          borderRadius: '12px',
          marginBottom: '4px'
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
              
              {user.isActive && (
                <span 
                  className="position-absolute bottom-0 end-0 bg-success rounded-circle border border-white"
                  style={{ width: '12px', height: '12px' }}
                  title="Active"
                />
              )}
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
            </div>
          </div>
          
          <div className="text-end">
            {status?.hasConversation ? (
              <Badge bg="success" className="d-flex align-items-center gap-1">
                <FaRegCommentDots size={10} />
                Chat
              </Badge>
            ) : status?.hasPendingRequest ? (
              <Badge bg="warning" className="d-flex align-items-center gap-1">
                <FaRegClock size={10} />
                Request Pending
              </Badge>
            ) : status?.hasAcceptedRequest ? (
              <Badge bg="info" className="d-flex align-items-center gap-1">
                <FaRegCommentDots size={10} />
                Start Chat
              </Badge>
            ) : (
              <Button 
                size="sm" 
                variant="outline-primary"
                onClick={(e) => {
                  e.stopPropagation();
                  openRequestModal(user);
                }}
              >
                Send Request
              </Button>
            )}
          </div>
        </div>
      </ListGroup.Item>
    );
  };

  return (
    <>
      <div>
        <div className="position-relative mb-4">
          <InputGroup>
            <InputGroup.Text className="border-0 bg-light">
              <FaSearch className="text-muted" />
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 bg-light py-3"
              style={{ fontSize: '1rem' }}
            />
          </InputGroup>
          
          {loading && (
            <div className="position-absolute end-0 top-0 h-100 d-flex align-items-center pe-3">
              <Spinner animation="border" size="sm" />
            </div>
          )}
        </div>

        {error && (
          <Alert variant="warning" className="d-flex align-items-center gap-2 mb-3">
            <FaExclamationTriangle />
            {error}
          </Alert>
        )}

        {filteredResults.length > 0 && (
          <ListGroup className="shadow-sm rounded-3 overflow-hidden">
            {filteredResults.map(renderUserItem)}
          </ListGroup>
        )}

        {debouncedSearch.trim().length >= 2 && !loading && filteredResults.length === 0 && (
          <div className="text-center py-5">
            <FaSearch className="text-muted mb-3" size={32} />
            <h6 className="fw-semibold mb-2">No users found</h6>
            <p className="text-muted small">Try searching with a different name, email, or phone number</p>
          </div>
        )}
      </div>

      {/* Message Request Modal */}
      <Modal 
        show={showRequestModal} 
        onHide={closeRequestModal}
        centered
        size="lg"
        backdrop="static"
      >
        <Modal.Header className="border-0 pb-0">
          <Modal.Title className="fw-bold">Send Message Request</Modal.Title>
          <Button 
            variant="link" 
            onClick={closeRequestModal}
            className="p-0"
            style={{ fontSize: '1.5rem', lineHeight: '1' }}
          >
            <FaTimes />
          </Button>
        </Modal.Header>
        
        <Modal.Body className="pt-0">
          {selectedUser && (
            <Container fluid>
              {/* User Info */}
              <Row className="mb-4">
                <Col xs={12}>
                  <div className="bg-light rounded-3 p-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="position-relative">
                        {selectedUser.avatarUrl ? (
                          <img
                            src={selectedUser.avatarUrl}
                            alt={selectedUser.displayName}
                            className="rounded-circle"
                            style={{ width: '56px', height: '56px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="rounded-circle bg-white d-flex align-items-center justify-content-center"
                            style={{ width: '56px', height: '56px' }}>
                            <FaUserCircle size={28} className="text-secondary" />
                          </div>
                        )}
                        
                        {selectedUser.isActive && (
                          <span 
                            className="position-absolute bottom-0 end-0 bg-success rounded-circle border border-white"
                            style={{ width: '14px', height: '14px' }}
                            title="Active"
                          />
                        )}
                      </div>
                      
                      <div>
                        <h5 className="fw-bold mb-1 d-flex align-items-center gap-2">
                          {selectedUser.displayName || selectedUser.email?.split('@')[0]}
                          {selectedUser.verifiedAt && (
                            <FaCheckCircle size={14} className="text-info" title="Verified User" />
                          )}
                        </h5>
                        <p className="text-muted mb-0 small">
                          {selectedUser.email}
                          {selectedUser.phone && ` • ${selectedUser.phone}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </Col>
              </Row>
              
              {/* Message Input */}
              <Row className="mb-4">
                <Col xs={12}>
                  <Form.Group>
                    <Form.Label className="fw-semibold mb-2">
                      Your Message <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={5}
                      value={requestMessage}
                      onChange={(e) => setRequestMessage(e.target.value)}
                      placeholder="Introduce yourself and explain why you'd like to connect..."
                      className="border-2 rounded-3"
                      style={{ 
                        resize: 'vertical',
                        minHeight: '120px',
                        borderColor: '#e2e8f0'
                      }}
                    />
                    <Form.Text className="text-muted small">
                      This will be sent as a message request. The user needs to accept it before you can chat.
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
              
              {/* Error Display */}
              {error && (
                <Row className="mb-3">
                  <Col xs={12}>
                    <Alert variant="warning" className="d-flex align-items-center gap-2">
                      <FaExclamationTriangle />
                      {error}
                    </Alert>
                  </Col>
                </Row>
              )}
            </Container>
          )}
        </Modal.Body>
        
        <Modal.Footer className="border-0 pt-0">
          <div className="d-flex w-100 gap-3">
            <Button
              variant="outline-secondary"
              onClick={closeRequestModal}
              disabled={sendingRequest}
              className="flex-grow-1 py-2"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSendRequestFromModal}
              disabled={!requestMessage.trim() || sendingRequest}
              className="flex-grow-1 py-2 d-flex align-items-center justify-content-center gap-2"
            >
              {sendingRequest ? (
                <>
                  <Spinner animation="border" size="sm" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <FaPaperPlane />
                  <span>Send Request</span>
                </>
              )}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </>
  );
}