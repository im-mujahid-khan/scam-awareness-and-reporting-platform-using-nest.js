'use client';

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Tabs, Tab, Badge, Button, Spinner, Alert } from 'react-bootstrap';
import {
  FaInbox,
  FaPaperPlane,
  FaSync,
  FaArrowLeft,
  FaCheckCircle,
  FaTimesCircle,
  FaClock
} from 'react-icons/fa';
import DashboardLayout from '../../../../../components/layout/DashboardLayout';
import MessageRequestList from '../components/MessageRequestList';
import { useAuth } from '../../../../../lib/contexts/AuthContext';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

export default function MessagingRequestsPage() {
  const { api, user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('received');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requests, setRequests] = useState({
    received: [],
    sent: []
  });
  const [stats, setStats] = useState({
    totalReceived: 0,
    totalSent: 0,
    pendingReceived: 0,
    pendingSent: 0,
    acceptedCount: 0,
    declinedCount: 0
  });

  // Load requests data
  const loadRequests = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      
      // Load received requests
      const receivedRes = await api.messaging.getMessageRequests({ 
        type: 'received',
        page: 1,
        limit: 50 
      });
      
      // Load sent requests
      const sentRes = await api.messaging.getMessageRequests({ 
        type: 'sent',
        page: 1,
        limit: 50 
      });
      
      // Extract requests from response and normalize field names
      let receivedRequests = Array.isArray(receivedRes) ? receivedRes : 
                            receivedRes?.data || receivedRes?.requests || [];
      
      let sentRequests = Array.isArray(sentRes) ? sentRes : 
                        sentRes?.data || sentRes?.requests || [];
      
      // Normalize requests - map 'requester' to 'sender' for consistency
      receivedRequests = receivedRequests.map(req => ({
        ...req,
        sender: req.requester || req.sender,
        receiver: req.receiver
      }));
      
      sentRequests = sentRequests.map(req => ({
        ...req,
        sender: req.requester || req.sender,
        receiver: req.receiver
      }));
      
      console.log('📬 Received requests:', receivedRequests);
      console.log('📤 Sent requests:', sentRequests);
      
      setRequests({
        received: receivedRequests,
        sent: sentRequests
      });
      
      // Calculate statistics
      const pendingReceived = receivedRequests.filter(r => r.status === 'PENDING').length;
      const pendingSent = sentRequests.filter(r => r.status === 'PENDING').length;
      const acceptedCount = [...receivedRequests, ...sentRequests]
        .filter(r => r.status === 'ACCEPTED').length;
      const declinedCount = [...receivedRequests, ...sentRequests]
        .filter(r => r.status === 'DECLINED').length;
      
      setStats({
        totalReceived: receivedRequests.length,
        totalSent: sentRequests.length,
        pendingReceived,
        pendingSent,
        acceptedCount,
        declinedCount
      });
      
    } catch (error) {
      console.error('Failed to load requests:', error);
      toast.error('Failed to load message requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api]);

  useEffect(() => {
    loadRequests();
    
    // Set up polling for real-time updates (every 60 seconds)
    const pollInterval = setInterval(() => {
      loadRequests(false);
    }, 60000);
    
    return () => clearInterval(pollInterval);
  }, [loadRequests]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadRequests(false);
  };

  // Handle request action (accept/decline/block)
  const handleRequestAction = async (requestId, action, reason = null) => {
    try {
      console.log('🎯 Request action:', { requestId, action, reason });
      
      // Call API with requestId, action, and optional reason
      await api.messaging.handleMessageRequest(requestId, action, reason);
      
      // Show success message
      if (action === 'ACCEPTED') {
        toast.success('Message request accepted! You can now chat.');
      } else if (action === 'DECLINED') {
        toast.success('Message request declined');
      } else if (action === 'BLOCKED') {
        toast.success('User blocked successfully');
      }
      
      // Reload requests
      await loadRequests(false);
      
      // If accepted, redirect to conversation
      if (action === 'ACCEPTED') {
        const acceptedRequest = requests.received.find(r => r.id === requestId);
        if (acceptedRequest?.conversationId) {
          setTimeout(() => {
            router.push(`/dashboard/messaging/chat/${acceptedRequest.conversationId}`);
          }, 1000);
        }
      }
      
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
      
      // Handle specific error messages
      const errorMessage = error.response?.data?.message || error.message;
      
      if (Array.isArray(errorMessage)) {
        toast.error(errorMessage.join(', '));
      } else if (errorMessage?.includes('already accepted')) {
        toast.info('This request has already been accepted');
      } else if (errorMessage?.includes('already declined')) {
        toast.info('This request has already been declined');
      } else {
        toast.error(`Failed to ${action.toLowerCase()} request`);
      }
      
      // Reload to sync state
      await loadRequests(false);
    }
  };

  // Cancel sent request
  const handleCancelRequest = async (requestId) => {
    try {
      console.log('🎯 Cancelling request:', requestId);
      await api.messaging.handleMessageRequest(requestId, 'CANCELLED');
      toast.success('Request cancelled');
      await loadRequests(false);
    } catch (error) {
      console.error('Failed to cancel request:', error);
      const errorMessage = error.response?.data?.message || error.message;
      
      if (Array.isArray(errorMessage)) {
        toast.error(errorMessage.join(', '));
      } else {
        toast.error('Failed to cancel request');
      }
    }
  };

  // Get empty state based on tab
  const getEmptyState = () => {
    if (activeTab === 'received') {
      return {
        icon: <FaInbox className="text-muted" size={48} />,
        title: 'No message requests',
        message: 'When someone sends you a message request, it will appear here',
        action: null
      };
    } else {
      return {
        icon: <FaPaperPlane className="text-muted" size={48} />,
        title: 'No sent requests',
        message: 'Message requests you send will appear here',
        action: 'Find Users',
        actionLink: '/dashboard/messaging/new'
      };
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading message requests...</p>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container fluid className="py-4">
        <Row className="justify-content-center">
          <Col xl={10}>
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex align-items-center gap-3">
                <Button
                  variant="outline-secondary"
                  onClick={() => router.push('/dashboard/messaging/inbox')}
                  className="d-flex align-items-center gap-2"
                >
                  <FaArrowLeft />
                  Back to Inbox
                </Button>
                
                <div>
                  <h1 className="fw-bold mb-1" style={{ color: '#2d3748' }}>
                    Message Requests
                  </h1>
                  <p className="text-muted mb-0">
                    Manage your message requests
                  </p>
                </div>
              </div>
              
              <Button
                variant="outline-primary"
                onClick={handleRefresh}
                disabled={refreshing}
                className="d-flex align-items-center gap-2"
              >
                {refreshing ? (
                  <Spinner animation="border" size="sm" />
                ) : (
                  <FaSync />
                )}
                Refresh
              </Button>
            </div>

            {/* Statistics Cards */}
            <Row className="g-3 mb-4">
              <Col md={3}>
                <Card className="border-0 shadow-sm rounded-3">
                  <Card.Body className="p-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                        <FaInbox className="text-primary" size={20} />
                      </div>
                      <div>
                        <h6 className="fw-bold mb-0">{stats.pendingReceived}</h6>
                        <small className="text-muted">Pending Requests</small>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={3}>
                <Card className="border-0 shadow-sm rounded-3">
                  <Card.Body className="p-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-success bg-opacity-10 rounded-circle p-3">
                        <FaCheckCircle className="text-success" size={20} />
                      </div>
                      <div>
                        <h6 className="fw-bold mb-0">{stats.acceptedCount}</h6>
                        <small className="text-muted">Accepted</small>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={3}>
                <Card className="border-0 shadow-sm rounded-3">
                  <Card.Body className="p-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-danger bg-opacity-10 rounded-circle p-3">
                        <FaTimesCircle className="text-danger" size={20} />
                      </div>
                      <div>
                        <h6 className="fw-bold mb-0">{stats.declinedCount}</h6>
                        <small className="text-muted">Declined</small>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={3}>
                <Card className="border-0 shadow-sm rounded-3">
                  <Card.Body className="p-3">
                    <div className="d-flex align-items-center gap-3">
                      <div className="bg-warning bg-opacity-10 rounded-circle p-3">
                        <FaPaperPlane className="text-warning" size={20} />
                      </div>
                      <div>
                        <h6 className="fw-bold mb-0">{stats.pendingSent}</h6>
                        <small className="text-muted">Sent Pending</small>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Main Content with Tabs */}
            <Card className="border-0 shadow-sm rounded-3">
              <Card.Body className="p-0">
                <Tabs
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k)}
                  className="border-bottom px-4 pt-3"
                >
                  {/* Received Requests Tab */}
                  <Tab
                    eventKey="received"
                    title={
                      <div className="d-flex align-items-center gap-2">
                        <FaInbox size={14} />
                        <span>Received</span>
                        {stats.pendingReceived > 0 && (
                          <Badge bg="warning" pill className="fs-7">
                            {stats.pendingReceived}
                          </Badge>
                        )}
                      </div>
                    }
                  >
                    <div className="p-4">
                      {stats.pendingReceived > 0 && (
                        <Alert variant="info" className="mb-4">
                          <FaClock className="me-2" />
                          You have <strong>{stats.pendingReceived}</strong> pending message 
                          request{stats.pendingReceived !== 1 ? 's' : ''} waiting for your response
                        </Alert>
                      )}
                      
                      <MessageRequestList
                        requests={requests.received}
                        type="received"
                        loading={refreshing}
                        emptyState={getEmptyState()}
                        onRequestAction={handleRequestAction}
                      />
                    </div>
                  </Tab>
                  
                  {/* Sent Requests Tab */}
                  <Tab
                    eventKey="sent"
                    title={
                      <div className="d-flex align-items-center gap-2">
                        <FaPaperPlane size={14} />
                        <span>Sent</span>
                        {stats.pendingSent > 0 && (
                          <Badge bg="warning" pill className="fs-7">
                            {stats.pendingSent}
                          </Badge>
                        )}
                      </div>
                    }
                  >
                    <div className="p-4">
                      {stats.pendingSent > 0 && (
                        <Alert variant="info" className="mb-4">
                          <FaClock className="me-2" />
                          You have <strong>{stats.pendingSent}</strong> pending message 
                          request{stats.pendingSent !== 1 ? 's' : ''} awaiting response
                        </Alert>
                      )}
                      
                      <MessageRequestList
                        requests={requests.sent}
                        type="sent"
                        loading={refreshing}
                        emptyState={getEmptyState()}
                        onRequestAction={handleCancelRequest}
                      />
                    </div>
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>

            {/* Quick Actions Footer */}
            <div className="mt-4 pt-3 border-top">
              <Row className="g-3">
                <Col md={6}>
                  <div className="d-flex align-items-center gap-2 text-muted small">
                    <FaInbox />
                    <span>{stats.totalReceived} total received requests</span>
                  </div>
                </Col>
                <Col md={6}>
                  <div className="d-flex align-items-center gap-2 text-muted small">
                    <FaPaperPlane />
                    <span>{stats.totalSent} total sent requests</span>
                  </div>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>
      </Container>

      <style jsx>{`
        .fs-7 {
          font-size: 0.75rem;
        }
        
        .nav-tabs .nav-link {
          border: none;
          color: #6c757d;
          font-weight: 500;
          padding: 0.75rem 1.5rem;
          transition: all 0.3s ease;
        }
        
        .nav-tabs .nav-link:hover {
          color: #495057;
          background-color: #f8f9fa;
          border-radius: 8px 8px 0 0;
        }
        
        .nav-tabs .nav-link.active {
          color: #0d6efd;
          background-color: #fff;
          border-bottom: 3px solid #0d6efd;
        }
      `}</style>
    </DashboardLayout>
  );
}