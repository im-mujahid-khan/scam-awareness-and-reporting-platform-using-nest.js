'use client';

import { Card, Button, Badge } from 'react-bootstrap';
import { FaUser, FaHeart, FaComment, FaShare, FaFlag, FaBookOpen, FaMapMarkerAlt } from 'react-icons/fa';
import { formatDate } from '../../lib/utils';


export default function PostCard({ post }) {
  // Mock data
  const mockPost = {
    id: '1',
    title: 'How to Identify Tech Support Scams',
    content: 'Tech support scams often involve callers claiming to be from Microsoft, Apple, or other tech companies. They\'ll tell you your computer has a virus and ask for remote access or payment to "fix" it. Remember: legitimate companies will never call you out of the blue.',
    author: {
      name: 'Safety Expert',
      avatar: 'SE',
    },
    category: 'Education',
    location: 'New York, NY',
    likes: 45,
    comments: 12,
    shares: 8,
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    isLiked: false,
  };

  const postData = post || mockPost;

  return (
    <Card className="mb-3 post-card">
      <Card.Body className="p-3 p-md-4">
        {/* Header with Author Info */}
        <div className="d-flex align-items-start mb-3">
          <div className="author-avatar me-3">
            <div className="avatar-circle bg-primary">
              <span className="avatar-text">{postData.author.avatar}</span>
            </div>
          </div>
          <div className="flex-grow-1">
            <div className="d-flex align-items-center mb-1">
              <h6 className="mb-0 fw-semibold me-2">{postData.author.name}</h6>
              <Badge bg="primary-subtle" text="primary" className="verified-badge rounded-pill px-2 py-1">
                Verified
              </Badge>
            </div>
            <div className="d-flex align-items-center flex-wrap">
              <small className="text-muted me-3">
                {formatDate(postData.createdAt)}
              </small>
              {postData.location && (
                <small className="text-muted d-flex align-items-center">
                  <FaMapMarkerAlt className="me-1" size={10} />
                  {postData.location}
                </small>
              )}
            </div>
          </div>
          
          {/* Category Badge on Right */}
          <div className="ms-3">
            <Badge bg="info" className="category-badge rounded-pill px-3 py-2">
              <FaBookOpen className="me-1" />
              {postData.category}
            </Badge>
          </div>
        </div>

        {/* Post Content */}
        <h5 className="post-title mb-3 fw-semibold">{postData.title}</h5>
        <p className="post-content text-muted mb-4">{postData.content}</p>

        {/* Action Buttons */}
        <div className="d-flex justify-content-between align-items-center post-actions">
          <div className="d-flex gap-3">
            <Button variant="outline-light" className="action-btn like-btn rounded-pill px-3 py-2">
              <div className="d-flex align-items-center">
                <FaHeart className={`me-2 ${postData.isLiked ? 'text-danger' : 'text-muted'}`} />
                <span className="fw-medium text-dark">{postData.likes}</span>
              </div>
            </Button>
            <Button variant="outline-light" className="action-btn comment-btn rounded-pill px-3 py-2">
              <div className="d-flex align-items-center">
                <FaComment className="me-2 text-muted" />
                <span className="fw-medium text-dark">{postData.comments}</span>
              </div>
            </Button>
            <Button variant="outline-light" className="action-btn share-btn rounded-pill px-3 py-2">
              <div className="d-flex align-items-center">
                <FaShare className="me-2 text-muted" />
                <span className="fw-medium text-dark">{postData.shares}</span>
              </div>
            </Button>
          </div>

          {/* Read Full Details Button */}
          <Button variant="primary" className="read-btn rounded-pill px-4 py-2">
            Read full details →
          </Button>
        </div>
      </Card.Body>

      <style jsx>{`
        .post-card {
          border-radius: 16px !important;
          border: 1px solid #e9ecef;
          background: #ffffff;
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }
        
        .post-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 20px rgba(0, 0, 0, 0.1);
          border-color: #dee2e6;
        }
        
        .author-avatar .avatar-circle {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .avatar-text {
          color: white;
          font-weight: bold;
          font-size: 1rem;
        }
        
        .verified-badge {
          font-size: 0.75rem;
          font-weight: 500;
          background: rgba(13, 110, 253, 0.1) !important;
          color: #0d6efd !important;
        }
        
        .category-badge {
          font-size: 0.875rem;
          font-weight: 500;
          background: linear-gradient(135deg, #17a2b8 0%, #20c997 100%) !important;
          border: none;
        }
        
        .post-title {
          color: #2d3748;
          font-size: 1.25rem;
          line-height: 1.4;
        }
        
        .post-content {
          font-size: 1rem;
          line-height: 1.6;
          color: #4a5568;
        }
        
        /* Action Buttons - Numbers always visible */
        .action-btn {
          border: 1px solid #e9ecef;
          background: #f8f9fa;
          transition: all 0.2s ease;
        }
        
        .action-btn .text-dark {
          color: #495057 !important;
          font-weight: 500;
        }
        
        .action-btn:hover {
          background: #ffffff;
          border-color: #dee2e6;
          transform: translateY(-2px);
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
        }
        
        .like-btn:hover {
          background: #fff5f5;
          border-color: #ffc1c1;
        }
        
        .like-btn:hover .fa-heart {
          color: #dc3545 !important;
        }
        
        .comment-btn:hover {
          background: #f0f7ff;
          border-color: #b3d7ff;
        }
        
        .comment-btn:hover .fa-comment {
          color: #0d6efd !important;
        }
        
        .share-btn:hover {
          background: #f0fff4;
          border-color: #b3e6b3;
        }
        
        .share-btn:hover .fa-share {
          color: #198754 !important;
        }
        
        /* Keep numbers visible on hover */
        .action-btn:hover .text-dark {
          color: #212529 !important;
        }
        
        .like-btn:hover .text-dark {
          color: #dc3545 !important;
        }
        
        .comment-btn:hover .text-dark {
          color: #0d6efd !important;
        }
        
        .share-btn:hover .text-dark {
          color: #198754 !important;
        }
        
        .read-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border: none;
          font-weight: 500;
          transition: all 0.3s ease;
        }
        
        .read-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
          background: linear-gradient(135deg, #5a6fd8 0%, #6a4592 100%);
        }
        
        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .post-card {
            border-radius: 14px !important;
          }
          
          .post-card .card-body {
            padding: 1.25rem !important;
          }
          
          .author-avatar .avatar-circle {
            width: 40px;
            height: 40px;
          }
          
          .avatar-text {
            font-size: 0.9rem;
          }
          
          .post-title {
            font-size: 1.1rem;
          }
          
          .post-content {
            font-size: 0.95rem;
          }
          
          .category-badge {
            font-size: 0.75rem;
            padding: 0.375rem 0.75rem !important;
          }
          
          .post-actions {
            flex-direction: column;
            align-items: stretch;
            gap: 1rem;
          }
          
          .post-actions > div:first-child {
            justify-content: center;
            width: 100%;
          }
          
          .action-btn {
            flex: 1;
            padding: 0.5rem 0.75rem !important;
            font-size: 0.875rem;
          }
          
          .action-btn .text-dark {
            font-size: 0.875rem;
          }
          
          .read-btn {
            width: 100%;
            padding: 0.75rem !important;
          }
        }
        
        @media (max-width: 576px) {
          .post-card .card-body {
            padding: 1rem !important;
          }
          
          .d-flex.align-items-start.mb-3 {
            flex-direction: column;
            align-items: flex-start !important;
          }
          
          .author-avatar {
            margin-bottom: 0.75rem;
          }
          
          .ms-3 {
            margin-left: 0 !important;
            margin-top: 0.75rem;
            align-self: flex-start;
          }
          
          .post-title {
            font-size: 1rem;
          }
          
          .post-content {
            font-size: 0.9rem;
          }
          
          .post-actions {
            gap: 0.75rem;
          }
          
          .action-btn {
            min-height: 40px;
            padding: 0.5rem 0.75rem !important;
          }
          
          .action-btn span {
            font-size: 0.875rem;
          }
          
          .read-btn {
            padding: 0.625rem !important;
            font-size: 0.875rem;
          }
        }
        
        @media (max-width: 375px) {
          .post-card .card-body {
            padding: 0.875rem !important;
          }
          
          .post-title {
            font-size: 0.95rem;
          }
          
          .post-content {
            font-size: 0.85rem;
          }
          
          .action-btn {
            padding: 0.375rem 0.5rem !important;
            font-size: 0.8125rem;
            min-width: auto;
          }
          
          .action-btn .text-dark {
            font-size: 0.8125rem;
          }
          
          .read-btn {
            font-size: 0.85rem;
            padding: 0.5rem !important;
          }
        }
        
        /* Ensure proper touch targets */
        .action-btn, 
        .read-btn,
        .category-badge {
          min-height: 40px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Smooth transitions */
        .post-card * {
          transition: all 0.2s ease;
        }
      `}</style>
    </Card>
  );
}