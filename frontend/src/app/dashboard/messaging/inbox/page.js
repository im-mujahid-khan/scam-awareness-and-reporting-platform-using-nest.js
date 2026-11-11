'use client';

import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Badge, Spinner, Button, Tabs, Tab } from 'react-bootstrap';
import {
  FaSearch,
  FaPlus,
  FaSync,
  FaBuilding,
  FaArrowRight,
  FaInbox,
  FaComments,
  FaBan,
  FaUserSlash,
  FaUserCheck,
  FaExclamationTriangle
} from 'react-icons/fa';
import DashboardLayout from '../../../../../components/layout/DashboardLayout';
import InboxList from '../components/InboxList';
import { useAuth } from '../../../../../lib/contexts/AuthContext';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

export default function MessagingInboxPage() {
  const { api, user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('all');
  const [loading, setLoading] = useState(true);
  const [inboxData, setInboxData] = useState({
    conversations: [],
    blockedConversations: [], // New: blocked conversations
    requests: [],
    companyConversations: [],
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({
    all: 0,
    requests: 0,
    company: 0,
    blocked: 0
  });

  const loadInboxData = useCallback(async () => {
    try {
      if (!loading) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      // Load inbox data from API
      const inboxRes = await api.messaging.getInbox();
      const inbox = inboxRes?.data || inboxRes || {};
      
      console.log('📬 Inbox API response:', inbox);
      
      // Extract all conversations from inbox response
      const allConversations = Array.isArray(inbox.conversations) ? inbox.conversations : 
                               inbox?.conversations?.data || inbox?.conversations || [];
      
      // Separate blocked and non-blocked conversations
      const conversations = allConversations.filter(conv => !conv.isBlocked);
      const blockedConversations = allConversations.filter(conv => conv.isBlocked);
      
      // Extract requests and normalize the field names
      let requests = Array.isArray(inbox.pendingRequests) ? inbox.pendingRequests : 
                    inbox?.pendingRequests?.data || inbox?.pendingRequests || [];
      
      // Normalize request data
      requests = requests.map(req => ({
        ...req,
        sender: req.requester || req.sender,
        receiver: req.receiver
      }));
      
      // Filter company conversations (non-blocked)
      const companyMessages = conversations.filter(conv => 
        conv.type === 'COMPANY_TO_USER' || conv.type === 'COMPANY' || conv.isCompany === true
      );
      
      console.log('📊 Data loaded:', {
        allConversations: allConversations.length,
        conversations: conversations.length,
        blockedConversations: blockedConversations.length,
        requests: requests.length,
        company: companyMessages.length
      });
      
      // Calculate unread counts
      const allUnread = conversations.filter(c => c.unreadCount > 0).length;
      const requestUnread = requests.filter(r => r.status === 'PENDING').length;
      const companyUnread = companyMessages.filter(c => c.unreadCount > 0).length;
      
      setInboxData({
        conversations,
        blockedConversations,
        requests,
        companyMessages
      });
      
      setUnreadCounts({
        all: allUnread,
        requests: requestUnread,
        company: companyUnread,
        blocked: blockedConversations.length
      });
      
    } catch (error) {
      console.error('Failed to load inbox:', error);
      toast.error('Failed to load messages');
      
      // Set empty state on error
      setInboxData({
        conversations: [],
        blockedConversations: [],
        requests: [],
        companyMessages: [],
      });
      setUnreadCounts({
        all: 0,
        requests: 0,
        company: 0,
        blocked: 0
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [api, loading]);

  useEffect(() => {
    loadInboxData();
    
    // Set up polling for real-time updates (every 60 seconds)
    const pollInterval = setInterval(() => {
      loadInboxData();
    }, 60000);
    
    return () => clearInterval(pollInterval);
  }, [loadInboxData]);

  const handleRefresh = () => {
    loadInboxData();
  };

  const getFilteredData = () => {
    let data = [];
    
    switch(activeTab) {
      case 'all':
        data = inboxData.conversations;
        break;
      case 'requests':
        data = inboxData.requests;
        break;
      case 'company':
        data = inboxData.companyMessages;
        break;
      case 'blocked':
        data = inboxData.blockedConversations;
        break;
      default:
        data = inboxData.conversations;
    }
    
    // Apply search filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      
      switch(activeTab) {
        case 'all':
        case 'blocked':
          return data.filter(item => 
            item.otherUser?.displayName?.toLowerCase().includes(term) ||
            item.user1?.displayName?.toLowerCase().includes(term) ||
            item.user2?.displayName?.toLowerCase().includes(term) ||
            item.user1?.email?.toLowerCase().includes(term) ||
            item.user2?.email?.toLowerCase().includes(term) ||
            item.otherUser?.email?.toLowerCase().includes(term) ||
            item.lastMessage?.content?.toLowerCase().includes(term)
          );
        case 'requests':
          return data.filter(item => 
            item.sender?.displayName?.toLowerCase().includes(term) ||
            item.sender?.email?.toLowerCase().includes(term) ||
            item.sender?.username?.toLowerCase().includes(term) ||
            item.message?.toLowerCase().includes(term)
          );
        case 'company':
          return data.filter(item => 
            item.company?.name?.toLowerCase().includes(term) ||
            item.lastMessage?.content?.toLowerCase().includes(term)
          );
        default:
          return data;
      }
    }
    
    return data;
  };

  const getEmptyState = () => {
    switch(activeTab) {
      case 'all':
        return {
          icon: <FaComments className="text-muted" size={48} />,
          title: 'No conversations yet',
          message: 'Start a conversation by messaging someone',
          action: 'Start Chat',
          actionLink: '/dashboard/messaging/new'
        };
      case 'requests':
        return {
          icon: <FaInbox className="text-muted" size={48} />,
          title: 'No pending requests',
          message: 'When someone sends you a message request, it will appear here',
          action: null
        };
      case 'company':
        return {
          icon: <FaBuilding className="text-muted" size={48} />,
          title: 'No company messages',
          message: 'Messages from companies will appear here',
          action: null
        };
      case 'blocked':
        return {
          icon: <FaUserSlash className="text-muted" size={48} />,
          title: 'No blocked users',
          message: 'Users you block will appear here. You can unblock users to resume conversations.',
          action: null
        };
      default:
        return {
          icon: <FaComments className="text-muted" size={48} />,
          title: 'No messages',
          message: 'Start your first conversation',
          action: 'Start Chat',
          actionLink: '/dashboard/messaging/new'
        };
    }
  };

  const handleRequestAction = async (requestId, action, reason = null) => {
    try {
      console.log('🎯 Request action:', { requestId, action, reason });
      
      // Call API with requestId, action, and optional reason
      await api.messaging.handleMessageRequest(requestId, action, reason);
      
      if (action === 'ACCEPTED') {
        toast.success('Request accepted! Redirecting to conversation...');
        
        // Find the accepted request to get conversation ID
        const acceptedRequest = inboxData.requests.find(r => r.id === requestId);
        if (acceptedRequest?.conversationId) {
          setTimeout(() => {
            router.push(`/dashboard/messaging/chat/${acceptedRequest.conversationId}`);
          }, 1000);
        }
      } else if (action === 'DECLINED') {
        toast.success('Request declined');
      } else if (action === 'BLOCKED') {
        toast.success('User blocked successfully');
      }
      
      // Reload inbox data
      await loadInboxData();
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
      
      // Handle specific errors
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
      await loadInboxData();
    }
  };

  const handleConversationClick = (item) => {
    if (item.isBlocked) {
      toast.info('This conversation is blocked. Unblock the user to resume messaging.');
      return;
    }
    router.push(`/dashboard/messaging/chat/${item.id}`);
  };

  const handleUnblockUser = async (conversation) => {
    try {
      // For now, we'll just reload the data which should move it back to "all" tab
      // In a real implementation, you would call an unblock API
      toast.info('Unblock feature coming soon. For now, please refresh the page.');
      
      // Simulate unblock by moving conversation back to "all" tab
      setInboxData(prev => {
        const updatedBlocked = prev.blockedConversations.filter(c => c.id !== conversation.id);
        const updatedConversations = [...prev.conversations, { ...conversation, isBlocked: false }];
        
        return {
          ...prev,
          blockedConversations: updatedBlocked,
          conversations: updatedConversations
        };
      });
      
      // Update unread counts
      setUnreadCounts(prev => ({
        ...prev,
        blocked: Math.max(0, prev.blocked - 1)
      }));
      
    } catch (error) {
      console.error('Failed to unblock user:', error);
      toast.error('Failed to unblock user');
    }
  };

  // Function to extract blocked user info from conversation
  const getBlockedUserInfo = (conversation) => {
    if (!conversation) return null;
    
    // Determine who is the other user (the one that's not current user)
    const isUser1 = conversation.user1Id === user?.id;
    const otherUser = isUser1 ? conversation.user2 : conversation.user1;
    
    return {
      id: otherUser?.id,
      displayName: otherUser?.displayName || otherUser?.email || 'Unknown User',
      email: otherUser?.email,
      avatarUrl: otherUser?.avatarUrl,
      phone: otherUser?.phone,
      blockedBy: conversation.blockedBy,
      blockedAt: conversation.blockedAt,
      blockReason: conversation.blockReason
    };
  };

  // Render blocked conversation item
  const renderBlockedItem = (conversation) => {
    const blockedUser = getBlockedUserInfo(conversation);
    
    const timeAgo = (dateString) => {
      if (!dateString) return '';
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now - date;
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      return `${Math.floor(diffDays / 30)} months ago`;
    };

    const formatDate = (dateString) => {
      if (!dateString) return '';
      try {
        return new Date(dateString).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      } catch {
        return '';
      }
    };

    return (
      <div
        key={conversation.id}
        className="conversation-item p-3 border-bottom"
        style={{ 
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          backgroundColor: '#fff8f8'
        }}
      >
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <div className="position-relative">
              {blockedUser?.avatarUrl ? (
                <img
                  src={blockedUser.avatarUrl}
                  alt={blockedUser.displayName}
                  className="rounded-circle"
                  style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                />
              ) : (
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                  style={{ width: '48px', height: '48px' }}>
                  <FaUserSlash size={24} className="text-secondary" />
                </div>
              )}
              <span 
                className="position-absolute bottom-0 end-0 bg-danger rounded-circle border border-white"
                style={{ width: '12px', height: '12px' }}
                title="Blocked"
              />
            </div>
            
            <div>
              <h6 className="fw-semibold mb-1 d-flex align-items-center gap-2">
                {blockedUser?.displayName}
                <Badge bg="danger" size="sm" className="fs-7">
                  Blocked
                </Badge>
              </h6>
              <small className="text-muted">
                {blockedUser?.email}
                {blockedUser?.phone && ` • ${blockedUser.phone}`}
              </small>
              
              <div className="mt-1 small">
                <div className="d-flex gap-3">
                  <span className="text-danger">
                    <FaBan size={10} className="me-1" />
                    Blocked {conversation.blockedAt && `(${timeAgo(conversation.blockedAt)})`}
                  </span>
                </div>
                {conversation.blockReason && (
                  <div className="text-muted mt-1">
                    Reason: <span className="fw-medium">{conversation.blockReason}</span>
                  </div>
                )}
                <div className="text-muted mt-1">
                  Last message: {formatDate(conversation.lastMessageAt)}
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-end">
            <Button 
              variant="outline-success"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleUnblockUser(conversation);
              }}
              className="d-flex align-items-center gap-1 px-3"
            >
              <FaUserCheck size={12} />
              Unblock
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading your messages...</p>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    );
  }

  const filteredData = getFilteredData();
  const pendingRequestsCount = inboxData.requests.filter(r => r.status === 'PENDING').length;

  return (
    <DashboardLayout>
      <Container fluid className="py-4">
        <Row className="justify-content-center">
          <Col xl={10}>
            {/* Header with Navigation Buttons */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 className="fw-bold mb-1" style={{ color: '#2d3748' }}>Messages</h1>
                <p className="text-muted mb-0">Stay connected with your community</p>
              </div>
              
              <div className="d-flex gap-3">
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
                
                <Button
                  variant="primary"
                  onClick={() => router.push('/dashboard/messaging/new')}
                  className="d-flex align-items-center gap-2"
                >
                  <FaPlus />
                  New Message
                </Button>
              </div>
            </div>

            {/* Search Bar */}
            <Card className="border-0 shadow-sm mb-4 rounded-3">
              <Card.Body className="p-3">
                <div className="position-relative">
                  <FaSearch
                    className="position-absolute text-muted"
                    style={{ left: '20px', top: '50%', transform: 'translateY(-50%)', zIndex: 10 }}
                  />
                  <input
                    type="text"
                    placeholder={
                      activeTab === 'blocked' 
                        ? "Search blocked users..." 
                        : "Search messages..."
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-control ps-5 py-3 border-0 bg-light rounded-pill"
                    style={{ fontSize: '0.95rem' }}
                  />
                </div>
              </Card.Body>
            </Card>

            {/* Main Content with Tabs */}
            <Card className="border-0 shadow-sm rounded-3">
              <Card.Body className="p-0">
                <Tabs
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k)}
                  className="border-bottom px-4 pt-3"
                >
                  {/* All Messages Tab (Non-blocked conversations only) */}
                  <Tab
                    eventKey="all"
                    title={
                      <div className="d-flex align-items-center gap-2">
                        <FaComments size={14} />
                        <span>All Messages</span>
                        {unreadCounts.all > 0 && (
                          <Badge bg="primary" pill className="fs-7">
                            {unreadCounts.all}
                          </Badge>
                        )}
                      </div>
                    }
                  >
                    <div className="p-3">
                      <InboxList
                        data={filteredData}
                        type="conversations"
                        loading={refreshing}
                        emptyState={getEmptyState()}
                        onItemClick={handleConversationClick}
                      />
                    </div>
                  </Tab>
                  
                  {/* Requests Tab */}
                  <Tab
                    eventKey="requests"
                    title={
                      <div className="d-flex align-items-center gap-2">
                        <FaInbox size={14} />
                        <span>Requests</span>
                        {unreadCounts.requests > 0 && (
                          <Badge bg="warning" pill className="fs-7">
                            {unreadCounts.requests}
                          </Badge>
                        )}
                      </div>
                    }
                  >
                    <div className="p-3">
                      {/* Quick Access Header */}
                      <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                        <div>
                          <h6 className="fw-semibold mb-1">Message Requests</h6>
                          <small className="text-muted">
                            {pendingRequestsCount > 0 
                              ? `${pendingRequestsCount} pending request${pendingRequestsCount !== 1 ? 's' : ''}`
                              : 'No pending requests'
                            }
                            {inboxData.requests.length > pendingRequestsCount && 
                              ` • ${inboxData.requests.length} total`
                            }
                          </small>
                        </div>
                        
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => router.push('/dashboard/messaging/requests')}
                          className="d-flex align-items-center gap-2"
                        >
                          View All Requests
                          <FaArrowRight size={12} />
                        </Button>
                      </div>
                      
                      {/* Request List */}
                      <InboxList
                        data={filteredData.slice(0, 3)}
                        type="requests"
                        loading={refreshing}
                        emptyState={getEmptyState()}
                        onRequestAction={handleRequestAction}
                      />
                      
                      {/* Show "View All" button if there are more than 3 requests */}
                      {filteredData.length > 3 && (
                        <div className="text-center mt-3 pt-3 border-top">
                          <Button
                            variant="outline-primary"
                            onClick={() => router.push('/dashboard/messaging/requests')}
                            className="w-100 py-3 d-flex align-items-center justify-content-center gap-2"
                          >
                            <FaArrowRight />
                            View All {filteredData.length} Requests
                          </Button>
                        </div>
                      )}
                    </div>
                  </Tab>
                  
                  {/* Company Tab (Non-blocked company conversations only) */}
                  <Tab
                    eventKey="company"
                    title={
                      <div className="d-flex align-items-center gap-2">
                        <FaBuilding size={14} />
                        <span>Company</span>
                        {unreadCounts.company > 0 && (
                          <Badge bg="info" pill className="fs-7">
                            {unreadCounts.company}
                          </Badge>
                        )}
                      </div>
                    }
                  >
                    <div className="p-3">
                      <InboxList
                        data={filteredData}
                        type="company"
                        loading={refreshing}
                        emptyState={getEmptyState()}
                        onItemClick={handleConversationClick}
                      />
                    </div>
                  </Tab>
                  
                  {/* Blocked Users Tab (Blocked conversations only) */}
                  <Tab
                    eventKey="blocked"
                    title={
                      <div className="d-flex align-items-center gap-2">
                        <FaBan size={14} />
                        <span>Blocked Users</span>
                        {unreadCounts.blocked > 0 && (
                          <Badge bg="danger" pill className="fs-7">
                            {unreadCounts.blocked}
                          </Badge>
                        )}
                      </div>
                    }
                  >
                    <div className="p-3">
                      {/* Blocked Users Header */}
                      <div className="d-flex justify-content-between align-items-center mb-3 pb-3 border-bottom">
                        <div>
                          <h6 className="fw-semibold mb-1">Blocked Users</h6>
                          <small className="text-muted">
                            {inboxData.blockedConversations.length > 0 
                              ? `${inboxData.blockedConversations.length} user${inboxData.blockedConversations.length !== 1 ? 's' : ''} blocked`
                              : 'No users blocked'
                            }
                          </small>
                        </div>
                        
                        {inboxData.blockedConversations.length > 0 && (
                          <Button
                            variant="outline-danger"
                            size="sm"
                            className="d-flex align-items-center gap-2"
                            onClick={() => {
                              if (window.confirm('Are you sure you want to unblock all users?')) {
                                // Move all blocked conversations back to "all" tab
                                setInboxData(prev => ({
                                  ...prev,
                                  blockedConversations: [],
                                  conversations: [...prev.conversations, ...prev.blockedConversations.map(c => ({ ...c, isBlocked: false }))]
                                }));
                                setUnreadCounts(prev => ({
                                  ...prev,
                                  blocked: 0
                                }));
                                toast.success('All users unblocked');
                              }
                            }}
                          >
                            <FaUserCheck />
                            Unblock All
                          </Button>
                        )}
                      </div>
                      
                      {/* Blocked Users List */}
                      {filteredData.length > 0 ? (
                        <div className="list-group">
                          {filteredData.map(renderBlockedItem)}
                        </div>
                      ) : (
                        <div className="text-center py-5">
                          {getEmptyState().icon}
                          <h5 className="fw-semibold mt-3 mb-2 text-dark">{getEmptyState().title}</h5>
                          <p className="text-muted">{getEmptyState().message}</p>
                        </div>
                      )}
                      
                      {/* Info Alert for Blocked Users */}
                      {inboxData.blockedConversations.length > 0 && (
                        <Alert variant="info" className="mt-4">
                          <FaExclamationTriangle className="me-2" />
                          <strong>Note:</strong> Blocked users cannot send you messages or see your online status.
                          Unblocking will restore all communication permissions.
                        </Alert>
                      )}
                    </div>
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>

            {/* Quick Stats Footer */}
            <div className="mt-4 pt-3 border-top">
              <Row className="g-3">
                <Col md={3}>
                  <div className="d-flex align-items-center gap-2 text-muted small">
                    <FaComments />
                    <span>{inboxData.conversations.length} active conversations</span>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="d-flex align-items-center gap-2 text-muted small">
                    <FaInbox />
                    <span>{inboxData.requests.length} total requests ({pendingRequestsCount} pending)</span>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="d-flex align-items-center gap-2 text-muted small">
                    <FaBuilding />
                    <span>{inboxData.companyMessages.length} company messages</span>
                  </div>
                </Col>
                <Col md={3}>
                  <div className="d-flex align-items-center gap-2 text-muted small">
                    <FaBan />
                    <span>{inboxData.blockedConversations.length} blocked users</span>
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
        
        .conversation-item {
          transition: all 0.2s ease;
          border-radius: 10px;
        }
        
        .conversation-item:hover {
          background-color: #f8f9fa;
          transform: translateY(-1px);
        }
        
        .unread {
          background-color: rgba(13, 110, 253, 0.05);
        }
        
        /* Custom tab styling */
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