'use client';

import { Card, Nav, Badge } from 'react-bootstrap';
import { 
  FaFileAlt, 
  FaUsers,
  FaChevronRight,
  FaCog,
  FaBell,
  FaSearch,
  FaComments,
  FaBuilding,
  FaPlus
} from 'react-icons/fa';
import Link from 'next/link';
import { useAuth } from '../../lib/contexts/AuthContext';
import { useState, useEffect, useCallback } from 'react';

export default function LeftSidebar({ collapsed }) {
  const { user, profile } = useAuth();
  const [activeItem, setActiveItem] = useState('/dashboard');
  const [profileImage, setProfileImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [messageCount, setMessageCount] = useState(0); // For unread message count

  const getInitials = useCallback(() => {
    if (user?.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    return 'U';
  }, [user]);

  // Load profile image only once when component mounts
  useEffect(() => {
    const loadProfileImage = () => {
      if (profile?.avatarUrl) {
        setProfileImage(profile.avatarUrl);
      } else if (user?.avatarUrl) {
        setProfileImage(user.avatarUrl);
      }
      // If no avatarUrl, profileImage remains null (will show initials)
    };

    loadProfileImage();
  }, [user, profile]);

  // Simulate loading message count (you'll replace with actual API call)
  useEffect(() => {
    const loadMessageCount = async () => {
      try {
        // This would be your actual API call
        // const response = await api.get('/api/v1/messages/unread-count');
        // setMessageCount(response.count || 0);
        
        // For now, using mock data
        setMessageCount(3); // Mock: 3 unread messages
      } catch (error) {
        console.error('Failed to load message count:', error);
      }
    };

    if (user) {
      loadMessageCount();
    }
  }, [user]);

  const mainNavItems = [
    { 
      icon: <FaComments />, 
      label: 'Messages', 
      href: '/dashboard/messaging/inbox',
      badge: messageCount // Dynamic badge count
    },
    { icon: <FaFileAlt />, label: 'My Posts', href: '/dashboard/posts' },
    { icon: <FaUsers />, label: 'Groups', href: '/dashboard/groups' },
    { icon: <FaBuilding />, label: 'My Companies', href: '/companies' },
  ];

  const discoverItems = [
    { label: 'Trending Scams', color: 'danger' },
    { label: 'Top Reporters', color: 'primary' },
    { label: 'Safety Guides', color: 'success' },
    { label: 'Company Alerts', color: 'warning' },
    { label: 'Webinars', color: 'info' },
    { label: 'Events', color: 'secondary' },
  ];

  return (
    <div className={`sidebar-content ${collapsed ? 'collapsed' : ''}`}>
      {/* User Profile Card */}
      <Card className="user-profile-card border-0 shadow-sm mb-3">
        <Card.Body className={`${collapsed ? 'p-2 text-center' : 'p-3 text-center'}`}>
          <div className={`position-relative ${collapsed ? '' : 'mb-3'}`}>
            <div className="avatar-container">
              <div 
                className={`avatar-circle ${collapsed ? 'small' : 'large'} ${
                  profileImage ? 'has-image' : 'bg-gradient-primary'
                }`}
                style={profileImage ? {
                  backgroundImage: `url(${profileImage})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                } : {}}
              >
                {!profileImage && (
                  <span className="avatar-text">
                    {getInitials()}
                  </span>
                )}
                {!collapsed && <div className="online-indicator"></div>}
              </div>
            </div>
          </div>
          
          {/* User Info - Only shows when NOT collapsed */}
          {!collapsed && (
            <>
              <h6 className="mb-1 fw-semibold mt-3">{user?.displayName || user?.name || 'User Name'}</h6>
              <p className="text-muted small mb-2">Scam Awareness Expert</p>
              <div className="stats-container d-flex justify-content-between px-2 mb-3">
                <div className="stat-item">
                  <div className="stat-value fw-bold">42</div>
                  <div className="stat-label small">Reports</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value fw-bold">256</div>
                  <div className="stat-label small">Followers</div>
                </div>
                <div className="stat-item">
                  <div className="stat-value fw-bold">89</div>
                  <div className="stat-label small">Following</div>
                </div>
              </div>
              <Link 
                href="/profile" 
                className="profile-link-btn btn btn-outline-primary btn-sm w-100 rounded-pill"
                onMouseEnter={(e) => e.currentTarget.classList.add('hover-effect')}
                onMouseLeave={(e) => e.currentTarget.classList.remove('hover-effect')}
              >
                View Profile
              </Link>
              
              {/* Add Company Button */}
              <Link 
                href="/companies/create" 
                className="btn btn-primary btn-sm w-100 rounded-pill mt-2"
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <FaPlus className="me-2" />
                Create Company
              </Link>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Quick Actions - Only shows when NOT collapsed */}
      {!collapsed && (
        <Card className="border-0 shadow-sm mb-3">
          <Card.Body className="p-2">
            <div className="quick-actions d-flex justify-content-around">
              <button className="btn btn-light btn-sm rounded-circle p-2 action-btn">
                <FaSearch className="text-primary" />
              </button>
              <button className="btn btn-light btn-sm rounded-circle p-2 action-btn">
                <FaBell className="text-warning" />
              </button>
              <button className="btn btn-light btn-sm rounded-circle p-2 action-btn">
                <FaCog className="text-secondary" />
              </button>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Main Navigation */}
      <Card className="navigation-card border-0 shadow-sm mb-3">
        <Card.Body className="p-0">
          <Nav className="flex-column">
            {mainNavItems.map((item, index) => (
              <Nav.Link 
                key={index}
                as={Link} 
                href={item.href}
                className={`nav-link-item d-flex align-items-center ${collapsed ? 'px-2 py-3 justify-content-center' : 'px-3 py-3'} ${
                  activeItem === item.href ? 'active' : ''
                }`}
                onClick={() => setActiveItem(item.href)}
                title={collapsed ? item.label : ''}
              >
                <span className={`nav-icon ${collapsed ? '' : 'me-3'} position-relative`}>
                  {item.icon}
                  {item.badge > 0 && (
                    <span 
                      className="position-absolute top-0 end-0 translate-middle badge rounded-pill bg-danger"
                      style={{ 
                        fontSize: '0.5rem',
                        minWidth: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: '2px solid white',
                        transform: collapsed ? 'translate(25%, -25%)' : 'translate(50%, -50%)'
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </span>
                {!collapsed && (
                  <>
                    <span className="nav-label flex-grow-1">{item.label}</span>
                    <FaChevronRight className="text-muted small ms-2" />
                  </>
                )}
              </Nav.Link>
            ))}
          </Nav>
        </Card.Body>
      </Card>

      {/* Discover Section - Only shows when NOT collapsed */}
      {!collapsed && (
        <Card className="discover-card border-0 shadow-sm">
          <Card.Header className="bg-transparent border-0 pb-0">
            <h6 className="mb-2 fw-semibold">Discover</h6>
          </Card.Header>
          <Card.Body className="pt-2">
            <div className="d-flex flex-wrap gap-2">
              {discoverItems.map((item, index) => (
                <Badge 
                  key={index} 
                  bg={`${item.color}-subtle`}
                  text={item.color}
                  className={`discover-tag px-3 py-2 mb-2 rounded-pill fw-medium border border-${item.color}-subtle`}
                  as={Link}
                  href={`/discover/${item.label.toLowerCase().replace(' ', '-')}`}
                >
                  {item.label}
                </Badge>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      <style jsx>{`
        .sidebar-content {
          transition: all 0.3s ease;
        }
        
        .sidebar-content.collapsed {
          padding: 0.75rem 0.25rem;
          width: 100%;
        }
        
        .avatar-container {
          position: relative;
          display: flex;
          justify-content: center;
        }
        
        .avatar-circle {
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          transition: all 0.3s ease;
          overflow: hidden;
        }
        
        .avatar-circle.has-image {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .avatar-circle.bg-gradient-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .avatar-circle.small {
          width: 40px;
          height: 40px;
        }
        
        .avatar-circle.large {
          width: 80px;
          height: 80px;
        }
        
        .avatar-text {
          color: white;
          font-weight: bold;
          transition: all 0.3s ease;
        }
        
        .avatar-circle.small .avatar-text {
          font-size: 1rem;
        }
        
        .avatar-circle.large .avatar-text {
          font-size: 1.75rem;
        }
        
        .online-indicator {
          position: absolute;
          bottom: 8px;
          right: 8px;
          width: 12px;
          height: 12px;
          background-color: #28a745;
          border: 2px solid white;
          border-radius: 50%;
        }
        
        .stats-container {
          transition: all 0.3s ease;
        }
        
        .stat-item {
          transition: transform 0.2s ease;
        }
        
        .stat-item:hover {
          transform: translateY(-2px);
        }
        
        .profile-link-btn {
          transition: all 0.3s ease;
          border-width: 2px;
          color: #667eea;
          border-color: #667eea;
        }
        
        .profile-link-btn:hover {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: #667eea;
        }
        
        .profile-link-btn.hover-effect {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }
        
        .action-btn {
          transition: all 0.2s ease;
          width: 36px;
          height: 36px;
        }
        
        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          background-color: #f8f9fa;
        }
        
        .nav-link-item {
          transition: all 0.3s ease;
          border-left: 3px solid transparent;
          color: #495057;
          position: relative;
          min-height: 44px;
        }
        
        .nav-link-item:hover {
          background-color: rgba(102, 126, 234, 0.08);
          border-left-color: #667eea;
          color: #667eea;
          padding-left: ${collapsed ? '0.5rem' : '1.25rem'};
        }
        
        .nav-link-item.active {
          background-color: rgba(102, 126, 234, 0.12);
          border-left-color: #667eea;
          color: #667eea;
          font-weight: 500;
        }
        
        .nav-icon {
          transition: transform 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: ${collapsed ? '1.1rem' : '1rem'};
          width: ${collapsed ? '24px' : 'auto'};
        }
        
        .nav-link-item:hover .nav-icon {
          transform: scale(1.1);
        }
        
        /* Tooltip for collapsed menu items */
        .nav-link-item[title]:hover::after {
          content: attr(title);
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          background: #333;
          color: white;
          padding: 0.5rem 0.75rem;
          border-radius: 4px;
          font-size: 0.875rem;
          white-space: nowrap;
          z-index: 1000;
          margin-left: 8px;
          pointer-events: none;
        }
        
        .nav-link-item[title]:hover::before {
          content: '';
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          border: 5px solid transparent;
          border-right-color: #333;
          margin-left: -2px;
          z-index: 1000;
          pointer-events: none;
        }
        
        .discover-tag {
          transition: all 0.3s ease;
          cursor: pointer;
          border-width: 1px;
        }
        
        .discover-tag:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          text-decoration: none;
        }
        
        /* Hover effects for different colors */
        .discover-tag.bg-danger-subtle:hover {
          background-color: var(--bs-danger) !important;
          color: white !important;
        }
        
        .discover-tag.bg-primary-subtle:hover {
          background-color: var(--bs-primary) !important;
          color: white !important;
        }
        
        .discover-tag.bg-success-subtle:hover {
          background-color: var(--bs-success) !important;
          color: white !important;
        }
        
        .discover-tag.bg-warning-subtle:hover {
          background-color: var(--bs-warning) !important;
          color: white !important;
        }
        
        .discover-tag.bg-info-subtle:hover {
          background-color: var(--bs-info) !important;
          color: white !important;
        }
        
        .discover-tag.bg-secondary-subtle:hover {
          background-color: var(--bs-secondary) !important;
          color: white !important;
        }
        
        /* Animation for collapse/expand */
        .sidebar-content.collapsed .user-profile-card {
          margin-bottom: 1.5rem;
        }
        
        .sidebar-content.collapsed .navigation-card {
          margin-bottom: 0;
        }
        
        /* Ensure consistent icon sizes in collapsed state */
        .sidebar-content.collapsed .nav-icon svg {
          width: 1.1rem;
          height: 1.1rem;
        }
        
        /* Make avatar match icon size in collapsed state */
        .sidebar-content.collapsed .avatar-circle.small {
          margin: 0 auto;
        }
        
        /* Responsive adjustments */
        @media (max-width: 1200px) {
          .avatar-circle.large {
            width: 70px;
            height: 70px;
          }
          
          .avatar-circle.large .avatar-text {
            font-size: 1.5rem;
          }
          
          .stats-container {
            padding: 0 0.5rem;
          }
          
          .stat-value {
            font-size: 0.9rem;
          }
          
          .stat-label {
            fontSize: 0.75rem;
          }
        }
        
        @media (max-width: 992px) {
          .sidebar-content:not(.collapsed) {
            padding: 1rem;
          }
          
          .user-profile-card {
            margin-bottom: 2rem;
          }
          
          .avatar-circle.large {
            width: 60px;
            height: 60px;
          }
          
          .avatar-circle.large .avatar-text {
            font-size: 1.25rem;
          }
          
          h6.fw-semibold {
            font-size: 0.9rem;
          }
          
          .stats-container {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .stat-item {
            text-align: center;
          }
        }
        
        /* Smooth button transitions */
        .btn {
          transition: all 0.2s ease;
        }
        
        .btn:hover {
          transform: translateY(-1px);
        }
        
        * {
          transition: all 0.2s ease;
        }
      `}</style>
    </div>
  );
}