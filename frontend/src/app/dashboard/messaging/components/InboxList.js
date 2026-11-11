'use client';

import { Card, Spinner, Badge, Button } from 'react-bootstrap';
import { 
  FaUserCircle, 
  FaBuilding, 
  FaClock, 
  FaCheckDouble,
  FaCheck,
  FaPaperPlane,
  FaShieldAlt
} from 'react-icons/fa';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '../../../../../lib/contexts/AuthContext';

export default function InboxList({ 
  data, 
  type, 
  loading, 
  emptyState, 
  onItemClick,
  onRequestAction 
}) {
  const { user } = useAuth();

  const formatTime = (dateString) => {
    if (!dateString) return '';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return '';
    }
  };

  const getOtherUser = (conversation) => {
    if (!conversation || !user) return null;
    
    // For company conversations
    if (conversation.type === 'COMPANY_TO_USER' || conversation.type === 'COMPANY' || conversation.isCompany) {
      return {
        id: conversation.company?.id,
        name: conversation.company?.name || 'Company',
        avatar: conversation.company?.logoUrl,
        email: conversation.company?.email,
        isCompany: true,
        verified: conversation.company?.verified
      };
    }
    
    // For user-to-user conversations
    // Determine which user is "other" based on current user ID
    const isUser1 = conversation.user1Id === user.id;
    const otherUser = isUser1 ? conversation.user2 : conversation.user1;
    
    // Fallback to otherUser field if available
    const finalUser = otherUser || conversation.otherUser;
    
    return {
      id: finalUser?.id,
      name: finalUser?.displayName || finalUser?.email || 'Unknown User',
      avatar: finalUser?.avatarUrl,
      email: finalUser?.email,
      isCompany: false,
      online: finalUser?.online || finalUser?.isActive
    };
  };

  const renderConversationItem = (conversation) => {
    const otherUser = getOtherUser(conversation);
    const hasUnread = conversation.unreadCount > 0;

    return (
      <Card 
        key={conversation.id}
        className={`conversation-item border-0 mb-2 ${hasUnread ? 'unread' : ''}`}
        style={{ cursor: 'pointer' }}
        onClick={() => onItemClick?.(conversation)}
      >
        <Card.Body className="p-3">
          <div className="d-flex align-items-center gap-3">
            {/* Avatar */}
            <div className="position-relative flex-shrink-0">
              {otherUser?.avatar ? (
                <img
                  src={otherUser.avatar}
                  alt={otherUser.name}
                  className="rounded-circle"
                  style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                />
              ) : (
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                  style={{ width: '48px', height: '48px' }}>
                  {otherUser?.isCompany ? (
                    <FaBuilding size={20} className="text-secondary" />
                  ) : (
                    <FaUserCircle size={20} className="text-secondary" />
                  )}
                </div>
              )}
              
              {/* Online indicator */}
              {!otherUser?.isCompany && otherUser?.online && (
                <span className="position-absolute bottom-0 end-0 bg-success rounded-circle border border-2 border-white"
                  style={{ width: '12px', height: '12px' }} />
              )}
            </div>

            {/* Content */}
            <div className="flex-grow-1 min-w-0">
              <div className="d-flex justify-content-between align-items-start mb-1">
                <div className="d-flex align-items-center gap-2">
                  <h6 className={`mb-0 ${hasUnread ? 'fw-bold' : 'fw-semibold'}`}>
                    {otherUser?.name}
                  </h6>
                  {otherUser?.isCompany && otherUser?.verified && (
                    <FaShieldAlt className="text-info" size={12} title="Verified Company" />
                  )}
                </div>
                <div className="text-end">
                  <small className="text-muted">
                    {formatTime(conversation.lastMessageAt || conversation.createdAt)}
                  </small>
                  {hasUnread && (
                    <Badge bg="primary" pill className="ms-2">
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Last message or user email */}
              <div className="d-flex align-items-center gap-2">
                {conversation.lastMessage?.content ? (
                  <p className={`mb-0 text-truncate ${hasUnread ? 'fw-semibold' : 'text-muted'}`}
                    style={{ fontSize: '0.875rem' }}>
                    {conversation.lastMessage.senderId === user?.id && (
                      <FaCheck size={12} className="me-1" />
                    )}
                    {conversation.lastMessage.content}
                  </p>
                ) : (
                  <p className="mb-0 text-muted text-truncate" style={{ fontSize: '0.875rem' }}>
                    {otherUser?.email || 'No messages yet'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  };

  const renderRequestItem = (request) => {
    const sender = request.sender;
    const isPending = request.status === 'PENDING';

    return (
      <Card 
        key={request.id}
        className="border-0 mb-2"
      >
        <Card.Body className="p-3">
          <div className="d-flex align-items-start gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {sender?.avatarUrl ? (
                <img
                  src={sender.avatarUrl}
                  alt={sender.displayName}
                  className="rounded-circle"
                  style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                />
              ) : (
                <div className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                  style={{ width: '48px', height: '48px' }}>
                  <FaUserCircle size={20} className="text-secondary" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-start mb-2">
                <div>
                  <h6 className="fw-semibold mb-0">
                    {sender?.displayName || sender?.email || 'Unknown User'}
                  </h6>
                  <small className="text-muted">
                    Sent you a message request
                  </small>
                </div>
                <small className="text-muted">
                  {formatTime(request.createdAt)}
                </small>
              </div>

              {/* Message preview */}
              {request.message && (
                <Card className="border-0 bg-light mb-2">
                  <Card.Body className="p-2">
                    <p className="mb-0 small text-truncate">
                      "{request.message}"
                    </p>
                  </Card.Body>
                </Card>
              )}

              {/* Actions */}
              {isPending && onRequestAction && (
                <div className="d-flex gap-2">
                  <Button
                    size="sm"
                    variant="success"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestAction(request.id, 'ACCEPTED');
                    }}
                  >
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="outline-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRequestAction(request.id, 'DECLINED');
                    }}
                  >
                    Decline
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
        <p className="mt-3 text-muted">Loading...</p>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return renderEmptyState();
  }

  return (
    <div>
      {type === 'requests' ? (
        data.map(renderRequestItem)
      ) : (
        data.map(renderConversationItem)
      )}
    </div>
  );
}