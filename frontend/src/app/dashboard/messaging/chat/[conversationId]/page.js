'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Container, Row, Col, Card, Spinner, Alert, Button, 
  Form, InputGroup, Dropdown, Modal 
} from 'react-bootstrap';
import {
  FaPaperPlane,
  FaPaperclip,
  FaEllipsisV,
  FaTrash,
  FaBan,
  FaFlag,
  FaCheckDouble,
  FaCheck,
  FaArrowLeft,
  FaUserCircle,
  FaBuilding,
  FaShieldAlt,
  FaRegClock,
  FaCircle,
  FaSync,
  FaExpand,
  FaDownload,
  FaPlay
} from 'react-icons/fa';
import DashboardLayout from '../../../../../../components/layout/DashboardLayout';
import MediaUpload from '../../components/MediaUpload';
import MessageActions from '../../components/MessageActions';
import { useAuth } from '../../../../../../lib/contexts/AuthContext';
import { toast } from 'react-toastify';

// REASON ENUM VALUES (from your API spec)
const REPORT_REASONS = [
  { value: 'ABUSIVE', label: 'Abusive Content' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'SENSITIVE_INFO', label: 'Sensitive Information' },
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'OTHER', label: 'Other' }
];

// Updated BLOCK_REASONS based on your original API spec
const BLOCK_REASONS = [
  { value: 'Inappropriate messages', label: 'Inappropriate Messages' },
  { value: 'Spam', label: 'Spam' },
  { value: 'Harassment', label: 'Harassment' },
  { value: 'Scam', label: 'Scam' },
  { value: 'Other', label: 'Other' }
];

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { api, user } = useAuth();
  const conversationId = params.conversationId;
  
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [otherUserOnline, setOtherUserOnline] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null);
  
  // Modal states for block and report
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [blockReason, setBlockReason] = useState('Inappropriate messages');
  const [reportReason, setReportReason] = useState('ABUSIVE');
  const [reportDescription, setReportDescription] = useState('');
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chatContainerRef = useRef(null);

  const loadConversation = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      
      console.log('📥 Loading conversation:', conversationId);
      
      // Load conversation and messages
      const [convRes, messagesRes] = await Promise.all([
        api.messaging.getConversation(conversationId),
        api.messaging.getMessages(conversationId, { limit: 50 })
      ]);
      
      const convData = convRes?.data || convRes;
      const messagesData = Array.isArray(messagesRes) ? messagesRes : 
                         messagesRes?.data || messagesRes?.messages || [];
      
      console.log('💬 Conversation data:', convData);
      console.log('📨 Messages data:', messagesData);
      
      // Check if conversation exists and user is part of it
      if (!convData) {
        throw new Error('Conversation not found');
      }
      
      // Verify user is part of this conversation
      if (user?.id && convData.user1Id !== user.id && convData.user2Id !== user.id) {
        throw new Error('You do not have access to this conversation');
      }
      
      setConversation(convData);
      setMessages(messagesData);
      
      // Update online status for other user
      const otherUser = getOtherUser(convData);
      if (otherUser && !otherUser.isCompany) {
        const isOnline = Math.random() > 0.3;
        setOtherUserOnline(isOnline);
      }
      
      // Mark messages as read
      if (messagesData.length > 0) {
        const unreadIds = messagesData
          .filter(m => m.senderId !== user?.id && m.status !== 'READ')
          .map(m => m.id);
        
        if (unreadIds.length > 0) {
          await api.messaging.markMessagesAsRead(unreadIds);
        }
      }
      
    } catch (error) {
      console.error('Failed to load conversation:', error);
      if (error.message !== 'Network error. Please check your connection.') {
        toast.error('Failed to load conversation');
      }
    } finally {
      if (showLoading) setLoading(false);
      setRefreshing(false);
    }
  }, [api, conversationId, user?.id]);

  const getOtherUser = useCallback((convData = conversation) => {
    if (!convData || !user) return null;
    
    // For company conversations
    if (convData.type === 'COMPANY_TO_USER' || convData.isCompany) {
      return {
        name: convData.company?.name || 'Company',
        avatar: convData.company?.logoUrl,
        isCompany: true,
        verified: convData.company?.verified,
        id: convData.company?.id
      };
    }
    
    // For user conversations - get the other user
    const isUser1 = convData.user1Id === user.id;
    const otherUser = isUser1 ? convData.user2 : convData.user1;
    
    return {
      id: otherUser?.id,
      name: otherUser?.displayName || otherUser?.email || 'Unknown User',
      avatar: otherUser?.avatarUrl,
      email: otherUser?.email,
      isCompany: false
    };
  }, [conversation, user]);

  useEffect(() => {
    if (conversationId) {
      loadConversation();
    }
  }, [conversationId, loadConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadConversation(false);
  };

  const handleSendMessage = async (content, type = 'TEXT', mediaUrl = null) => {
    if ((!content?.trim() && !mediaUrl) || sending) return;
    
    try {
      setSending(true);
      
      const messageData = {
        conversationId: conversationId,
        type,
        content: content?.trim() || '',
        mediaUrl: mediaUrl || null
      };
      
      console.log('📤 Sending message with data:', messageData);
      
      const response = await api.messaging.sendMessage(conversationId, messageData);
      
      const message = response?.data || response;
      
      console.log('✅ Message sent:', message);
      
      // Add to messages immediately for instant feedback
      setMessages(prev => [...prev, message]);
      
      if (type === 'TEXT') {
        setNewMessage('');
      }
      
      // Refresh conversation data once after sending
      setTimeout(() => {
        loadConversation(false);
      }, 500);
      
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message: ' + (error.message || 'Unknown error'));
    } finally {
      setSending(false);
    }
  };

  const handleMediaSelect = async (file, fileType, caption = '') => {
    try {
      setUploadingMedia(true);
      
      const formData = new FormData();
      formData.append('file', file);
      
      console.log('📤 Uploading file with caption:', { fileName: file.name, fileType, caption });
      
      // Upload based on file type
      let uploadResponse;
      if (fileType === 'IMAGE') {
        uploadResponse = await api.messaging.uploadMessageImage(formData);
      } else {
        uploadResponse = await api.messaging.uploadMessageFile(formData);
      }
      
      const mediaUrl = uploadResponse?.data?.url || uploadResponse?.url;
      
      console.log('✅ File uploaded:', mediaUrl);
      
      if (mediaUrl) {
        // Send message with caption if provided
        if (caption && caption.trim()) {
          await handleSendMessage(caption, fileType, mediaUrl);
        } else {
          await handleSendMessage('', fileType, mediaUrl);
        }
      }
      
    } catch (error) {
      console.error('Failed to upload media:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploadingMedia(false);
      setShowMediaUpload(false);
    }
  };

  const handleBlockUser = async () => {
    if (!conversation || !user) return;
    
    try {
      setBlocking(true);
      const otherUserId = conversation.user1Id === user.id ? 
                         conversation.user2Id : conversation.user1Id;
      
      // Prepare block data according to API spec
      // Only userId and reason are required, no description field
      const blockData = {
        userId: otherUserId,
        reason: blockReason
      };
      
      console.log('🚫 Blocking user with data:', blockData);
      
      await api.messaging.blockUser(blockData);
      
      toast.success('User blocked successfully');
      router.push('/dashboard/messaging/inbox');
      
    } catch (error) {
      console.error('Failed to block user:', error);
      toast.error('Failed to block user: ' + (error.response?.data?.message || error.message));
    } finally {
      setBlocking(false);
      setShowBlockModal(false);
      setBlockReason('Inappropriate messages');
    }
  };

  const handleReportMessage = async () => {
    if (!selectedMessage) return;
    
    try {
      setReporting(true);
      
      // Prepare report data according to API spec
      const reportData = {
        messageId: selectedMessage.id,
        reason: reportReason,
        ...(reportDescription && reportDescription.trim() && { description: reportDescription.trim() })
      };
      
      console.log('🚩 Reporting message with data:', reportData);
      
      await api.messaging.reportMessage(reportData);
      
      toast.success('Message reported successfully');
      
    } catch (error) {
      console.error('Failed to report message:', error);
      toast.error('Failed to report message: ' + (error.response?.data?.message || error.message));
    } finally {
      setReporting(false);
      setShowReportModal(false);
      setSelectedMessage(null);
      setReportDescription('');
      setReportReason('ABUSIVE');
    }
  };

  const handleReportConversation = async () => {
    if (!conversation) return;
    
    try {
      setReporting(true);
      
      // Since there's no conversation report endpoint in the API spec,
      // we need to use a different approach. Let's report the latest message
      // or create a generic report.
      
      if (messages.length > 0) {
        // Report the latest message as a proxy for reporting the conversation
        const latestMessage = messages[messages.length - 1];
        
        const reportData = {
          messageId: latestMessage.id,
          reason: reportReason,
          ...(reportDescription && reportDescription.trim() && { description: reportDescription.trim() })
        };
        
        console.log('🚩 Reporting conversation via latest message:', reportData);
        
        await api.messaging.reportMessage(reportData);
        
        toast.success('Conversation reported successfully');
      } else {
        // If no messages, show a different message
        toast.info('No messages in this conversation to report. Please report individual messages.');
      }
      
    } catch (error) {
      console.error('Failed to report conversation:', error);
      toast.error('Failed to report conversation: ' + (error.response?.data?.message || error.message));
    } finally {
      setReporting(false);
      setShowReportModal(false);
      setReportDescription('');
      setReportReason('ABUSIVE');
    }
  };

  const handleDeleteConversation = async () => {
    if (!conversationId) return;
    
    try {
      await api.messaging.deleteConversation(conversationId);
      toast.success('Conversation deleted');
      router.push('/dashboard/messaging/inbox');
      
    } catch (error) {
      console.error('Failed to delete conversation:', error);
      toast.error('Failed to delete conversation');
    }
  };

  const formatMessageTime = (dateString) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const openMediaPreview = (mediaUrl, type) => {
    setMediaPreview({ url: mediaUrl, type });
  };

  // Open block modal
  const openBlockModal = () => {
    setShowBlockModal(true);
  };

  // Open report modal
  const openReportModal = (message = null) => {
    setSelectedMessage(message);
    setShowReportModal(true);
  };

  const renderMessage = (message) => {
    const isOwn = message.senderId === user?.id;
    const participant = getOtherUser();
    
    return (
      <div
        key={message.id}
        className={`message-bubble mb-3 ${isOwn ? 'own-message' : 'other-message'} animate-message`}
        style={{
          maxWidth: '70%',
          minWidth: '120px',
          marginLeft: isOwn ? 'auto' : '0',
          marginRight: isOwn ? '0' : 'auto'
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setSelectedMessage(message);
        }}
      >
        <div className="d-flex gap-2">
          {!isOwn && (
            <div className="flex-shrink-0 position-relative">
              {participant?.avatar ? (
                <img
                  src={participant.avatar}
                  alt={participant.name}
                  className="rounded-circle"
                  style={{ width: '32px', height: '32px', objectFit: 'cover' }}
                />
              ) : (
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                  style={{ width: '32px', height: '32px' }}>
                  {participant?.isCompany ? (
                    <FaBuilding size={16} className="text-secondary" />
                  ) : (
                    <FaUserCircle size={16} className="text-secondary" />
                  )}
                </div>
              )}
            </div>
          )}
          
          <div className="flex-grow-1">
            {!isOwn && (
              <small className="text-muted mb-1 d-block ps-2" style={{ fontSize: '0.75rem', fontWeight: '500' }}>
                {participant?.name}
              </small>
            )}
            
            <div className={`p-3 rounded-3 ${isOwn ? 'chat-message-own' : 'chat-message-other'}`}
              style={{ 
                borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                wordBreak: 'break-word',
                lineHeight: '1.5'
              }}>
              
              {/* Media Preview Section - Improved Layout */}
              {message.type === 'IMAGE' && message.mediaUrl ? (
                <div className="mb-3 position-relative">
                  <div className="media-preview-container rounded" 
                    style={{ 
                      position: 'relative',
                      maxWidth: '300px',
                      maxHeight: '300px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      backgroundColor: '#f8f9fa'
                    }}
                    onClick={() => openMediaPreview(message.mediaUrl, 'IMAGE')}
                  >
                    <img
                      src={message.mediaUrl}
                      alt="Attachment"
                      className="img-fluid w-100 h-100"
                      style={{ 
                        objectFit: 'cover',
                        display: 'block',
                        transition: 'transform 0.3s ease'
                      }}
                    />
                    <div className="media-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
                      style={{ 
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        opacity: 0,
                        transition: 'opacity 0.3s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                    >
                      <FaExpand size={24} className="text-white" />
                    </div>
                  </div>
                  <div className="media-actions d-flex justify-content-between align-items-center mt-2">
                    <span className="small text-muted">
                      📷 Photo
                    </span>
                    <a 
                      href={message.mediaUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-decoration-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FaDownload size={14} className="text-muted" />
                    </a>
                  </div>
                </div>
              ) : message.type === 'VIDEO' && message.mediaUrl ? (
                <div className="mb-3 position-relative">
                  <div className="video-preview-container rounded position-relative"
                    style={{ 
                      maxWidth: '300px',
                      maxHeight: '300px',
                      backgroundColor: '#000',
                      overflow: 'hidden'
                    }}
                  >
                    <video
                      src={message.mediaUrl}
                      className="img-fluid w-100"
                      style={{ maxHeight: '300px' }}
                      controls
                      preload="metadata"
                    >
                      Your browser does not support the video tag.
                    </video>
                  </div>
                  <div className="media-actions d-flex justify-content-between align-items-center mt-2">
                    <span className="small text-muted">
                      🎥 Video
                    </span>
                    <a 
                      href={message.mediaUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-decoration-none"
                    >
                      <FaDownload size={14} className="text-muted" />
                    </a>
                  </div>
                </div>
              ) : message.type === 'FILE' && message.mediaUrl ? (
                <div className="mb-3">
                  <div className="p-3 border rounded" 
                    style={{ 
                      backgroundColor: isOwn ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                      borderRadius: '10px'
                    }}>
                    <div className="d-flex align-items-center gap-3">
                      <div className="file-icon p-2 rounded" 
                        style={{ 
                          backgroundColor: isOwn ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'
                        }}>
                        <FaPaperclip size={20} className={isOwn ? 'text-white' : 'text-dark'} />
                      </div>
                      <div className="flex-grow-1">
                        <h6 className="mb-1 fw-semibold" style={{ fontSize: '0.9rem' }}>
                          {message.fileName || 'Document'}
                        </h6>
                        <p className="small mb-2">
                          {message.fileSize ? formatFileSize(message.fileSize) : 'Unknown size'}
                        </p>
                        <a 
                          href={message.mediaUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={`btn btn-sm ${isOwn ? 'btn-outline-light' : 'btn-outline-primary'}`}
                        >
                          <FaDownload className="me-1" />
                          Download
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              
              {/* Text Content (could be caption for media or standalone text) */}
              {message.content && message.content.trim() && (
                <div style={{ 
                  whiteSpace: 'pre-wrap', 
                  lineHeight: '1.5',
                  marginTop: (message.mediaUrl && message.content) ? '10px' : '0'
                }}>
                  {message.content}
                </div>
              )}
              
              {/* Timestamp and Status */}
              <div className={`d-flex justify-content-between align-items-center mt-2 ${isOwn ? 'text-white-70' : 'text-muted'}`}
                style={{ fontSize: '0.75rem' }}>
                <span>{formatMessageTime(message.createdAt)}</span>
                <span className="d-flex align-items-center gap-1">
                  {isOwn && (
                    message.status === 'READ' ? (
                      <FaCheckDouble size={12} />
                    ) : message.status === 'DELIVERED' ? (
                      <FaCheckDouble size={12} className="opacity-75" />
                    ) : (
                      <FaCheck size={12} className="opacity-75" />
                    )
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Helper function to format file size
  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading conversation...</p>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    );
  }

  if (!conversation) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <Alert variant="warning">
                <h5>Conversation not found</h5>
                <p>This conversation may have been deleted or you don't have access to it.</p>
                <div className="d-flex gap-2 justify-content-center mt-3">
                  <Button variant="primary" onClick={() => router.push('/dashboard/messaging/inbox')}>
                    Back to Inbox
                  </Button>
                  <Button variant="outline-primary" onClick={() => loadConversation()}>
                    Try Again
                  </Button>
                </div>
              </Alert>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    );
  }

  const participant = getOtherUser();

  return (
    <>
      <DashboardLayout>
        <div className="chat-page-wrapper" style={{ 
          height: '100vh', 
          overflow: 'hidden',
          backgroundColor: '#f5f7fb'
        }}>
          <Row className="g-0 h-100 m-0">
            <Col md={10} lg={8} xl={6} className="mx-auto h-100 d-flex flex-column p-0">
              {/* Chat Header */}
              <Card className="border-0 border-bottom shadow-sm chat-header" style={{ 
                backgroundColor: 'white',
                borderBottom: '1px solid #e9ecef !important',
                flexShrink: 0,
                borderRadius: '0'
              }}>
                <Card.Body className="py-3 px-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-3">
                      <Button
                        variant="link"
                        onClick={() => router.back()}
                        className="p-0 me-2 text-secondary"
                      >
                        <FaArrowLeft size={20} />
                      </Button>
                      
                      <div className="position-relative">
                        {participant?.avatar ? (
                          <img
                            src={participant.avatar}
                            alt={participant.name}
                            className="rounded-circle"
                            style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                            style={{ width: '40px', height: '40px' }}>
                            {participant?.isCompany ? (
                              <FaBuilding size={20} className="text-secondary" />
                            ) : (
                              <FaUserCircle size={20} className="text-secondary" />
                            )}
                          </div>
                        )}
                        
                        {/* Only show active status for other user */}
                        {!participant?.isCompany && otherUserOnline && (
                          <span className="position-absolute bottom-0 end-0 bg-success rounded-circle border border-white"
                            style={{ width: '10px', height: '10px' }} />
                        )}
                      </div>
                      
                      <div>
                        <h5 className="fw-semibold mb-0 d-flex align-items-center gap-2">
                          {participant?.name}
                          {participant?.isCompany && participant?.verified && (
                            <FaShieldAlt className="text-info" size={14} title="Verified Company" />
                          )}
                        </h5>
                        <small className="text-muted d-flex align-items-center gap-1">
                          {!participant?.isCompany && otherUserOnline ? (
                            <>
                              <FaCircle size={8} className="text-success" />
                              <span>Active</span>
                            </>
                          ) : (
                            participant?.isCompany ? 'Company Account' : 'Offline'
                          )}
                        </small>
                      </div>
                    </div>
                    
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={handleManualRefresh}
                        disabled={refreshing}
                        className="d-flex align-items-center gap-2"
                      >
                        {refreshing ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <FaSync />
                        )}
                      </Button>
                      
                      <Dropdown>
                        <Dropdown.Toggle variant="outline-secondary" size="sm">
                          <FaEllipsisV />
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                          <Dropdown.Item onClick={() => openReportModal()}>
                            <FaFlag className="me-2" />
                            Report Conversation
                          </Dropdown.Item>
                          <Dropdown.Item className="text-danger" onClick={openBlockModal}>
                            <FaBan className="me-2" />
                            Block User
                          </Dropdown.Item>
                          <Dropdown.Item className="text-danger" onClick={handleDeleteConversation}>
                            <FaTrash className="me-2" />
                            Delete Conversation
                          </Dropdown.Item>
                        </Dropdown.Menu>
                      </Dropdown>
                    </div>
                  </div>
                </Card.Body>
              </Card>
              
              {/* Chat Area */}
              <div 
                ref={chatContainerRef}
                className="flex-grow-1 overflow-auto p-4 custom-scrollbar" 
                style={{ 
                  backgroundColor: '#f5f7fb',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  flex: '1 1 auto',
                  minHeight: 0
                }}
              >
                {messages.length === 0 ? (
                  <div className="text-center py-5">
                    <div className="mb-3">
                      <FaRegClock className="text-muted" size={48} />
                    </div>
                    <h5 className="fw-semibold mb-2 text-dark">No messages yet</h5>
                    <p className="text-muted">Send a message to start the conversation</p>
                  </div>
                ) : (
                  <>
                    {messages.map(renderMessage)}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>
              
              {/* Message Input */}
              <Card className="border-0 border-top shadow-sm message-input-container" style={{
                flexShrink: 0,
                borderRadius: '0'
              }}>
                <Card.Body className="py-3 px-4">
                  <Form onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage(newMessage);
                  }}>
                    <InputGroup className="rounded-pill message-input">
                      <Button
                        variant="link"
                        onClick={() => setShowMediaUpload(true)}
                        disabled={uploadingMedia || sending}
                        className="text-secondary"
                      >
                        {uploadingMedia ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <FaPaperclip />
                        )}
                      </Button>
                      
                      <Form.Control
                        ref={inputRef}
                        type="text"
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage(newMessage);
                          }
                        }}
                        className="border-0 bg-transparent"
                        disabled={uploadingMedia || sending}
                        style={{ 
                          boxShadow: 'none',
                          fontSize: '0.95rem'
                        }}
                      />
                      
                      <Button
                        type="submit"
                        variant="primary"
                        disabled={(!newMessage.trim() && !uploadingMedia) || sending || uploadingMedia}
                        className="send-button"
                      >
                        {sending ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-2" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <FaPaperPlane className="me-2" />
                            Send
                          </>
                        )}
                      </Button>
                    </InputGroup>
                  </Form>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
        
        {/* Media Upload Modal */}
        <MediaUpload
          show={showMediaUpload}
          onHide={() => setShowMediaUpload(false)}
          onSelect={handleMediaSelect}
          uploading={uploadingMedia}
        />
        
        {/* Block User Modal - Simplified version */}
        <Modal show={showBlockModal} onHide={() => setShowBlockModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Block User</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="warning" className="mb-3">
              <strong>Warning:</strong> Blocking this user will prevent all future communication between you.
              This action cannot be undone.
            </Alert>
            
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Reason for blocking <span className="text-danger">*</span></Form.Label>
                <Form.Select 
                  value={blockReason} 
                  onChange={(e) => setBlockReason(e.target.value)}
                  required
                >
                  {BLOCK_REASONS.map(reason => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowBlockModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="danger" 
              onClick={handleBlockUser}
              disabled={blocking}
            >
              {blocking ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Blocking...
                </>
              ) : (
                'Block User'
              )}
            </Button>
          </Modal.Footer>
        </Modal>
        
        {/* Report Modal */}
        <Modal show={showReportModal} onHide={() => setShowReportModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>
              {selectedMessage ? 'Report Message' : 'Report Conversation'}
            </Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="info" className="mb-3">
              <strong>Note:</strong> Reports are reviewed by our moderation team.
            </Alert>
            
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Reason for reporting <span className="text-danger">*</span></Form.Label>
                <Form.Select 
                  value={reportReason} 
                  onChange={(e) => setReportReason(e.target.value)}
                  required
                >
                  {REPORT_REASONS.map(reason => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Label>Additional details (optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Provide more details about your report..."
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowReportModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={selectedMessage ? handleReportMessage : handleReportConversation}
              disabled={reporting}
            >
              {reporting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Reporting...
                </>
              ) : (
                'Submit Report'
              )}
            </Button>
          </Modal.Footer>
        </Modal>
      </DashboardLayout>
      
      {/* Media Preview Modal */}
      {mediaPreview && (
        <Modal
          show={!!mediaPreview}
          onHide={() => setMediaPreview(null)}
          centered
          size="xl"
          fullscreen="lg-down"
          className="media-preview-modal"
        >
          <Modal.Header closeButton className="border-0">
            <Modal.Title className="fw-bold small">
              Media Preview
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-0">
            <div className="d-flex align-items-center justify-content-center bg-dark" 
              style={{ minHeight: '60vh' }}>
              {mediaPreview.type === 'IMAGE' ? (
                <img
                  src={mediaPreview.url}
                  alt="Preview"
                  className="img-fluid"
                  style={{ maxHeight: '70vh', objectFit: 'contain' }}
                />
              ) : (
                <video
                  src={mediaPreview.url}
                  controls
                  className="img-fluid"
                  style={{ maxHeight: '70vh' }}
                />
              )}
            </div>
          </Modal.Body>
          <Modal.Footer className="border-0 justify-content-between">
            <a 
              href={mediaPreview.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              <FaDownload className="me-2" />
              Download
            </a>
            <Button variant="secondary" onClick={() => setMediaPreview(null)}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </>
  );
}