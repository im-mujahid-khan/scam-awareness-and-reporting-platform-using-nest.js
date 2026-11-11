'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Container, Row, Col, Card, Spinner, Alert, Button, Form, InputGroup } from 'react-bootstrap';
import {
  FaSearch,
  FaUserPlus,
  FaUsers,
  FaBuilding,
  FaArrowLeft,
  FaPaperPlane,
  FaUserCircle,
  FaShieldAlt,
  FaExclamationCircle
} from 'react-icons/fa';
import DashboardLayout from '../../../../../components/layout/DashboardLayout';
import UserSearch from '../components/UserSearch';
import { useAuth } from '../../../../../lib/contexts/AuthContext';
import { toast } from 'react-toastify';

export default function NewConversationPage() {
  const router = useRouter();
  const { api, user } = useAuth();
  
  const [step, setStep] = useState('search'); // search, request, direct
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedUsers, setSuggestedUsers] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadSuggestedUsers();
  }, []);

  const loadSuggestedUsers = async () => {
    try {
      const response = await api.messaging.getSuggestedUsers();
      const users = Array.isArray(response) ? response : 
                   response?.data || response?.users || [];
      setSuggestedUsers(users.slice(0, 6));
    } catch (error) {
      console.error('Failed to load suggested users:', error);
    }
  };

  const handleUserSelect = async (selectedUser) => {
    setSelectedUser(selectedUser);
    setLoading(true);
    setError(null);
    
    try {
      // Check if user can be messaged directly
      if (selectedUser.canMessage) {
        // User can be messaged directly (already connected)
        try {
          // Try to get existing conversation
          const response = await api.messaging.getConversations();
          const conversations = Array.isArray(response) ? response : response?.data || [];
          
          const existingConv = conversations.find(conv => 
            conv.participants?.some(p => p.id === selectedUser.id) ||
            conv.otherUser?.id === selectedUser.id
          );
          
          if (existingConv) {
            // Go directly to existing conversation
            router.push(`/dashboard/messaging/chat/${existingConv.id}`);
          } else {
            // Create new direct conversation
            setStep('direct');
          }
        } catch (error) {
          console.error('Error checking conversations:', error);
          setStep('direct');
        }
      } else {
        // Need to send message request first
        setStep('request');
      }
      
    } catch (error) {
      console.error('Failed to check user status:', error);
      toast.error('Failed to check user status');
    } finally {
      setLoading(false);
    }
  };

  const handleSendRequest = async () => {
    if (!selectedUser || !message.trim()) {
      toast.error('Please enter a message');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Sending message request:', {
        receiverId: selectedUser.id,
        message: message.trim()
      });
      
      const response = await api.messaging.sendMessageRequest({
        receiverId: selectedUser.id,
        message: message.trim()
      });
      
      console.log('Message request response:', response);
      
      toast.success('Message request sent! The user will need to accept it before you can chat.');
      router.push('/dashboard/messaging/requests');
      
    } catch (error) {
      console.error('Failed to send request:', error);
      
      if (error.message?.includes('Conversation already exists')) {
        setError('You already have an existing conversation with this user. Check your inbox.');
        toast.info('Conversation already exists. Check your inbox.');
      } else if (error.response?.data?.message === 'Conversation already exists') {
        setError('You already have an existing conversation with this user. Check your inbox.');
        toast.info('Conversation already exists. Check your inbox.');
      } else {
        setError(error.response?.data?.message || error.message || 'Failed to send message request');
        toast.error('Failed to send message request');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStartDirectChat = async () => {
    if (!selectedUser) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Create direct conversation for already connected users
      const conversationData = {
        type: 'USER_TO_USER',
        otherUserId: selectedUser.id
      };
      
      console.log('Creating direct conversation:', conversationData);
      
      const response = await api.messaging.createOrGetConversation(conversationData);
      const conversation = response?.data || response;
      
      console.log('Conversation created:', conversation);
      
      if (conversation.id) {
        router.push(`/dashboard/messaging/chat/${conversation.id}`);
      } else {
        throw new Error('Failed to create conversation');
      }
      
    } catch (error) {
      console.error('Failed to start direct chat:', error);
      
      if (error.message?.includes('Conversation already exists') || 
          error.response?.data?.message === 'Conversation already exists') {
        
        // Try to find existing conversation
        try {
          const convResponse = await api.messaging.getConversations();
          const conversations = Array.isArray(convResponse) ? convResponse : convResponse?.data || [];
          
          const existingConv = conversations.find(conv => 
            conv.participants?.some(p => p.id === selectedUser.id) ||
            conv.otherUser?.id === selectedUser.id
          );
          
          if (existingConv) {
            router.push(`/dashboard/messaging/chat/${existingConv.id}`);
            return;
          }
        } catch (findError) {
          console.error('Failed to find existing conversation:', findError);
        }
        
        setError('You already have a conversation with this user. Check your inbox.');
        toast.info('Check your inbox for existing conversation.');
      } else {
        setError(error.response?.data?.message || error.message || 'Failed to start chat');
        toast.error('Failed to start chat');
      }
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'search':
        return (
          <>
            <div className="mb-4">
              <h4 className="fw-bold mb-3">Start New Conversation</h4>
              <p className="text-muted">Search for users or select from suggestions</p>
            </div>
            
            {/* Search Component */}
            <UserSearch onUserSelect={handleUserSelect} />
            
            {/* Suggested Users */}
            {suggestedUsers.length > 0 && (
              <div className="mt-4">
                <h6 className="fw-semibold mb-3 d-flex align-items-center">
                  <FaUsers className="me-2" />
                  Suggested Users
                </h6>
                <Row className="g-3">
                  {suggestedUsers.map((suggestedUser) => (
                    <Col md={4} key={suggestedUser.id}>
                      <Card
                        className="border-0 shadow-sm h-100 text-center"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleUserSelect(suggestedUser)}
                      >
                        <Card.Body className="p-3">
                          <div className="mb-2">
                            {suggestedUser.avatarUrl ? (
                              <img
                                src={suggestedUser.avatarUrl}
                                alt={suggestedUser.displayName}
                                className="rounded-circle"
                                style={{ width: '64px', height: '64px', objectFit: 'cover' }}
                              />
                            ) : (
                              <div className="mx-auto rounded-circle bg-light d-flex align-items-center justify-content-center"
                                style={{ width: '64px', height: '64px' }}>
                                <FaUserCircle size={32} className="text-secondary" />
                              </div>
                            )}
                          </div>
                          <h6 className="fw-semibold mb-1">{suggestedUser.displayName}</h6>
                          <small className="text-muted d-block">{suggestedUser.email}</small>
                          <Button
                            size="sm"
                            variant="outline-primary"
                            className="mt-2"
                          >
                            <FaUserPlus size={12} className="me-1" />
                            {suggestedUser.canMessage ? 'Chat' : 'Request'}
                          </Button>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            )}
          </>
        );
        
      case 'request':
        return (
          <>
            <div className="mb-4">
              <Button
                variant="link"
                onClick={() => setStep('search')}
                className="p-0 mb-3 text-secondary d-flex align-items-center"
              >
                <FaArrowLeft className="me-2" />
                Back to Search
              </Button>
              <h4 className="fw-bold mb-3">Send Message Request</h4>
              <p className="text-muted">You need to send a request before chatting</p>
            </div>
            
            {/* Error Display */}
            {error && (
              <Alert variant="warning" className="d-flex align-items-center gap-2 mb-4">
                <FaExclamationCircle />
                {error}
              </Alert>
            )}
            
            {/* Selected User Info */}
            <Card className="border-0 shadow-sm mb-4">
              <Card.Body className="p-3">
                <div className="d-flex align-items-center gap-3">
                  <div>
                    {selectedUser.avatarUrl ? (
                      <img
                        src={selectedUser.avatarUrl}
                        alt={selectedUser.displayName}
                        className="rounded-circle"
                        style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                      />
                    ) : (
                      <div className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                        style={{ width: '48px', height: '48px' }}>
                        <FaUserCircle size={24} className="text-secondary" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h6 className="fw-semibold mb-0">{selectedUser.displayName}</h6>
                    <small className="text-muted">{selectedUser.email}</small>
                    <div className="mt-1">
                      <span className="badge bg-warning">Request Required</span>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
            
            {/* Message Form */}
            <Form onSubmit={(e) => {
              e.preventDefault();
              handleSendRequest();
            }}>
              <Form.Group className="mb-4">
                <Form.Label>Your Message Request</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Hi, I'd like to chat with you about..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="border-0 bg-light"
                  style={{ borderRadius: '12px' }}
                  required
                />
                <Form.Text className="text-muted">
                  This will be sent as a message request. The user needs to accept it before you can chat.
                </Form.Text>
              </Form.Group>
              
              <div className="d-flex gap-3">
                <Button
                  variant="outline-secondary"
                  onClick={() => setStep('search')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={!message.trim() || loading}
                  className="d-flex align-items-center gap-2"
                >
                  {loading ? (
                    <Spinner animation="border" size="sm" />
                  ) : (
                    <FaPaperPlane />
                  )}
                  Send Request
                </Button>
              </div>
            </Form>
          </>
        );
        
      case 'direct':
        return (
          <>
            <div className="mb-4">
              <Button
                variant="link"
                onClick={() => setStep('search')}
                className="p-0 mb-3 text-secondary d-flex align-items-center"
              >
                <FaArrowLeft className="me-2" />
                Back to Search
              </Button>
              <h4 className="fw-bold mb-3">Start Direct Chat</h4>
              <p className="text-muted">You can message this user directly</p>
            </div>
            
            {/* Error Display */}
            {error && (
              <Alert variant="warning" className="d-flex align-items-center gap-2 mb-4">
                <FaExclamationCircle />
                {error}
              </Alert>
            )}
            
            {/* Selected User Info */}
            <Card className="border-0 shadow-sm mb-4">
              <Card.Body className="p-3">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-3">
                    <div>
                      {selectedUser.avatarUrl ? (
                        <img
                          src={selectedUser.avatarUrl}
                          alt={selectedUser.displayName}
                          className="rounded-circle"
                          style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                          style={{ width: '48px', height: '48px' }}>
                          <FaUserCircle size={24} className="text-secondary" />
                        </div>
                      )}
                    </div>
                    <div>
                      <h6 className="fw-semibold mb-0">{selectedUser.displayName}</h6>
                      <small className="text-muted">{selectedUser.email}</small>
                    </div>
                  </div>
                  
                  <div className="text-end">
                    <div className="badge bg-success rounded-pill">
                      Direct Chat Available
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
            
            <div className="d-flex gap-3">
              <Button
                variant="outline-secondary"
                onClick={() => setStep('search')}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleStartDirectChat}
                disabled={loading}
                className="d-flex align-items-center gap-2"
              >
                {loading ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <FaPaperPlane />
                )}
                Start Chat
              </Button>
            </div>
          </>
        );
    }
  };

  return (
    <DashboardLayout>
      <Container fluid className="py-4">
        <Row className="justify-content-center">
          <Col xl={8} lg={10}>
            <Card className="border-0 shadow-sm rounded-3">
              <Card.Body className="p-4">
                {loading && step === 'search' ? (
                  <div className="text-center py-5">
                    <Spinner animation="border" variant="primary" />
                    <p className="mt-3 text-muted">Loading...</p>
                  </div>
                ) : (
                  renderStep()
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </DashboardLayout>
  );
}