// File: src/components/layout/Header.js (FIXED VERSION)
'use client';

import { Container, Navbar, Nav, Button, Dropdown, Badge } from 'react-bootstrap';
import { FaBell, FaUser, FaSearch, FaPlus, FaSignOutAlt, FaHome, FaCompass, FaUsers, FaShieldAlt, FaFire, FaCog } from 'react-icons/fa';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/contexts/AuthContext';
import { useNotifications } from '../../lib/contexts/NotificationContext';
import NotificationItem from '../NotificationItem';
import { useEffect, useState } from 'react';

export default function Header() {
  const { user, profile, logout, isAuthenticated } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    markAllAsRead, 
    isConnected,
    getConnectionStatus // ✅ Get this from context
  } = useNotifications();
  
  const pathname = usePathname();
  const [profileImage, setProfileImage] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [socketId, setSocketId] = useState(null); // ✅ State for socketId

  const isAuthPage = pathname?.includes('/auth') || false;

  // ✅ Get socketId from connection status
  useEffect(() => {
    if (isConnected) {
      const status = getConnectionStatus();
      setSocketId(status.socketId);
    } else {
      setSocketId(null);
    }
  }, [isConnected, getConnectionStatus]);

  // Load profile image only from existing data - NO API CALLS
  useEffect(() => {
    if (profile?.avatarUrl) {
      setProfileImage(profile.avatarUrl);
    } else if (user?.avatarUrl) {
      setProfileImage(user.avatarUrl);
    } else {
      setProfileImage(null);
    }
  }, [user, profile]);

  // Don't show header on auth pages
  if (isAuthPage) return null;

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.charAt(0).toUpperCase();
    }
    if (user?.name) {
      return user.name.charAt(0).toUpperCase();
    }
    if (user?.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return 'U';
  };

  const getUserName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.name) return user.name;
    if (user?.email) return user.email.split('@')[0];
    return 'User';
  };

  const getUserEmail = () => {
    return user?.email || 'No email';
  };

  return (
    <Navbar 
      bg="white" 
      expand="lg" 
      className="border-bottom shadow-sm sticky-top"
      style={{ 
        borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
        backdropFilter: 'blur(10px)',
        background: 'rgba(255, 255, 255, 0.95)'
      }}
    >
      <Container fluid="lg">
        {/* Brand Logo */}
        <Navbar.Brand as={Link} href="/" className="fw-bold me-4">
          <div className="d-flex align-items-center">
            <div className="logo-circle me-2">
              <FaShieldAlt className="logo-icon" />
            </div>
            <span style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontSize: '1.25rem',
              fontWeight: '700'
            }}>
              ScamAlert
            </span>
          </div>
        </Navbar.Brand>

        {/* Mobile Toggle */}
        <Navbar.Toggle 
          aria-controls="basic-navbar-nav" 
          className="border-0"
          style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}
        >
          <span className="navbar-toggler-icon"></span>
        </Navbar.Toggle>

        <Navbar.Collapse id="basic-navbar-nav">
          {/* Main Navigation */}
          <Nav className="mx-auto">
            {/* Show Home and Feed ONLY when authenticated */}
            {isAuthenticated && user && (
              <>
                <Nav.Link 
                  as={Link} 
                  href="/" 
                  className="fw-medium mx-2 position-relative"
                  active={pathname === '/'}
                >
                  <div className="d-flex flex-column align-items-center">
                    <FaHome className={`fs-5 mb-1 ${pathname === '/' ? 'text-primary' : 'text-muted'}`} />
                    <span style={{ fontSize: '0.8rem' }}>Home</span>
                    {pathname === '/' && (
                      <div className="nav-indicator"></div>
                    )}
                  </div>
                </Nav.Link>

                <Nav.Link 
                  as={Link} 
                  href="/feed" 
                  className="fw-medium mx-2 position-relative"
                  active={pathname?.includes('/feed')}
                >
                  <div className="d-flex flex-column align-items-center">
                    <FaFire className={`fs-5 mb-1 ${pathname?.includes('/feed') ? 'text-primary' : 'text-muted'}`} />
                    <span style={{ fontSize: '0.8rem' }}>Feed</span>
                    {pathname?.includes('/feed') && (
                      <div className="nav-indicator"></div>
                    )}
                  </div>
                </Nav.Link>
              </>
            )}

            {/* Always show Search */}
            <Nav.Link 
              as={Link} 
              href="/search" 
              className="fw-medium mx-2 position-relative"
              active={pathname === '/search'}
            >
              <div className="d-flex flex-column align-items-center">
                <FaSearch className={`fs-5 mb-1 ${pathname === '/search' ? 'text-primary' : 'text-muted'}`} />
                <span style={{ fontSize: '0.8rem' }}>Search</span>
                {pathname === '/search' && (
                  <div className="nav-indicator"></div>
                )}
              </div>
            </Nav.Link>

           

            {/* Always show Discover */}
            <Nav.Link 
              as={Link} 
              href="/dashboard/groups/discover" 
              className="fw-medium mx-2 position-relative"
              active={pathname === '/discover'}
            >
              <div className="d-flex flex-column align-items-center">
                <FaCompass className={`fs-5 mb-1 ${pathname === '/discover' ? 'text-primary' : 'text-muted'}`} />
                <span style={{ fontSize: '0.8rem' }}>Discover</span>
                {pathname === '/discover' && (
                  <div className="nav-indicator"></div>
                )}
              </div>
            </Nav.Link>

            {/* Show Groups ONLY when authenticated */}
            {isAuthenticated && user && (
              <Nav.Link 
                as={Link} 
                href="/dashboard/groups" 
                className="fw-medium mx-2 position-relative"
                active={pathname === '/groups'}
              >
                <div className="d-flex flex-column align-items-center">
                  <FaUsers className={`fs-5 mb-1 ${pathname === '/groups' ? 'text-primary' : 'text-muted'}`} />
                  <span style={{ fontSize: '0.8rem' }}>Groups</span>
                  {pathname === '/groups' && (
                    <div className="nav-indicator"></div>
                  )}
                </div>
              </Nav.Link>
            )}
          </Nav>

          {/* Right Side Actions */}
          <div className="d-flex align-items-center" style={{ gap: '1rem' }}>
            {/* Report Scam Button */}
            <Link 
              href={isAuthenticated && user ? "/report" : "/auth/login?callbackUrl=/report"} 
              style={{ textDecoration: 'none' }}
            >
              <Button 
                variant="danger" 
                className="d-flex align-items-center justify-content-center py-2 px-3 fw-bold position-relative overflow-hidden"
                style={{ 
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #ff4757 0%, #ff3838 50%, #ff1e1e 100%)',
                  border: 'none',
                  fontSize: '0.9rem',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 20px rgba(255, 71, 87, 0.35)',
                  height: '40px',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 71, 87, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 20px rgba(255, 71, 87, 0.35)';
                }}
              >
                <FaPlus className="me-2" style={{ fontSize: '0.9rem' }} />
                <span>Report Scam</span>
              </Button>
            </Link>

            {/* Show Notifications and User Dropdown ONLY when authenticated AND user exists */}
            {isAuthenticated && user ? (
              <>
                {/* Notifications Dropdown */}
                <Dropdown align="end" show={showNotifications} onToggle={setShowNotifications}>
                  <Dropdown.Toggle
                    variant="link"
                    className="p-0 border-0 notification-toggle"
                    style={{ 
                      background: 'none',
                      boxShadow: 'none',
                      textDecoration: 'none'
                    }}
                    id="notification-dropdown"
                    bsPrefix="dropdown-toggle-no-caret"
                  >
                    <div className="position-relative d-inline-block">
                      <div 
                        className="notification-bell-wrapper d-flex align-items-center justify-content-center"
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '12px',
                          background: 'rgba(102, 126, 234, 0.08)',
                          transition: 'all 0.3s ease',
                          cursor: 'pointer'
                        }}
                      >
                        <FaBell style={{ fontSize: '1.1rem', color: '#4a5568' }} />
                        
                        {/* Connection status indicator */}
                        {!isConnected && (
                          <span
                            className="position-absolute"
                            style={{
                              bottom: '2px',
                              right: '2px',
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#ffc107',
                              border: '2px solid white'
                            }}
                            title="Connecting..."
                          />
                        )}
                      </div>
                      
                      {/* Dynamic Badge Count */}
                      {unreadCount > 0 && (
                        <span 
                          className="position-absolute d-flex align-items-center justify-content-center"
                          style={{
                            top: '-2px',
                            right: '-2px',
                            minWidth: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: '#dc3545',
                            color: 'white',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            border: '2px solid white',
                            boxShadow: '0 2px 4px rgba(220, 53, 69, 0.3)',
                            padding: '0 4px'
                          }}
                        >
                          {unreadCount > 99 ? '99+' : unreadCount}
                        </span>
                      )}
                    </div>
                  </Dropdown.Toggle>
                  
                  <Dropdown.Menu 
                    className="border-0 shadow-lg"
                    style={{ 
                      borderRadius: '16px',
                      minWidth: '360px',
                      maxWidth: '400px',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      padding: 0,
                      marginTop: '0.5rem'
                    }}
                  >
                    <div className="px-3 pt-3 pb-2 d-flex justify-content-between align-items-center">
                      <h6 className="fw-bold mb-0" style={{ color: '#2d3748' }}>
                        Notifications
                      </h6>
                      {unreadCount > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAllAsRead();
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#667eea',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            fontWeight: '500'
                          }}
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      {(!notifications || notifications.length === 0) ? (
                        <div className="text-center py-5">
                          <FaBell size={48} className="text-muted mb-3" style={{ opacity: 0.3 }} />
                          <p className="text-muted mb-0">No notifications yet</p>
                          <small className="text-muted">You're all caught up!</small>
                        </div>
                      ) : (
                        notifications.slice(0, 10).map((notification, index) => (
                          <NotificationItem 
                            key={notification?.id || index} 
                            notification={notification}
                            onClose={() => setShowNotifications(false)}
                          />
                        ))
                      )}
                    </div>

                    
                    
                    {notifications && notifications.length > 0 && (
                      <div className="border-top">
                        <Dropdown.Item 
                          as={Link} 
                          href="/notifications" 
                          className="text-center py-3 fw-medium d-flex align-items-center justify-content-center"
                          style={{ color: '#667eea' }}
                          onClick={() => setShowNotifications(false)}
                        >
                          <FaBell className="me-2" />
                          View all notifications
                          {notifications.length > 10 && (
                            <Badge bg="light" text="primary" className="ms-2">
                              {notifications.length - 10}+ more
                            </Badge>
                          )}
                        </Dropdown.Item>
                      </div>
                    )}
                  </Dropdown.Menu>
                </Dropdown>

                {/* User Dropdown */}
                <Dropdown align="end">
                  <Dropdown.Toggle
                    variant="link"
                    className="p-0 border-0 text-decoration-none user-dropdown-toggle"
                    style={{ 
                      background: 'none',
                      boxShadow: 'none'
                    }}
                    id="user-dropdown"
                    bsPrefix="dropdown-toggle-no-caret"
                  >
                    <div className="d-flex align-items-center" style={{ gap: '0.5rem' }}>
                      <div 
                        className="user-avatar d-flex align-items-center justify-content-center overflow-hidden"
                        style={{ 
                          width: '40px', 
                          height: '40px',
                          borderRadius: '12px',
                          background: profileImage ? `url(${profileImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          backgroundRepeat: 'no-repeat',
                          color: 'white',
                          fontWeight: '600',
                          fontSize: '0.9rem',
                          flexShrink: 0,
                          transition: 'all 0.3s ease'
                        }}
                      >
                        {!profileImage && getInitials()}
                      </div>
                      <div className="d-none d-lg-block text-start" style={{ lineHeight: '1.3' }}>
                        <div className="fw-medium" style={{ color: '#2d3748', fontSize: '0.9rem' }}>
                          {getUserName()}
                        </div>
                      </div>
                    </div>
                  </Dropdown.Toggle>
                  
                  <Dropdown.Menu 
                    className="border-0 shadow-lg"
                    style={{ 
                      borderRadius: '16px',
                      minWidth: '240px',
                      border: '1px solid rgba(0, 0, 0, 0.05)',
                      marginTop: '0.5rem'
                    }}
                  >
                    <div className="px-3 pt-3 pb-2">
                      <div className="d-flex align-items-center">
                        <div 
                          className="d-flex align-items-center justify-content-center me-3 overflow-hidden"
                          style={{ 
                            width: '48px', 
                            height: '48px',
                            borderRadius: '12px',
                            background: profileImage ? `url(${profileImage})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            color: 'white',
                            fontWeight: '600',
                            fontSize: '1.1rem',
                            flexShrink: 0
                          }}
                        >
                          {!profileImage && getInitials()}
                        </div>
                        <div style={{ overflow: 'hidden', flex: 1 }}>
                          <div className="fw-bold text-truncate" style={{ color: '#2d3748', fontSize: '0.95rem' }}>
                            {getUserName()}
                          </div>
                          <small className="text-muted text-truncate d-block" style={{ fontSize: '0.8rem' }}>
                            {getUserEmail()}
                          </small>
                        </div>
                      </div>
                    </div>
                    <Dropdown.Divider className="my-2" />
                    <Dropdown.Item 
                      as={Link} 
                      href="/profile"
                      className="py-2 px-3 d-flex align-items-center"
                    >
                      <FaUser className="me-3" style={{ color: '#667eea', fontSize: '0.9rem' }} />
                      <span style={{ color: '#4a5568' }}>Profile</span>
                    </Dropdown.Item>
                    <Dropdown.Item 
                      as={Link} 
                      href="/profile/settings"
                      className="py-2 px-3 d-flex align-items-center"
                    >
                      <FaCog className="me-3" style={{ color: '#667eea', fontSize: '0.9rem' }} />
                      <span style={{ color: '#4a5568' }}>Settings</span>
                    </Dropdown.Item>
                    <Dropdown.Divider className="my-2" />
                    <Dropdown.Item 
                      onClick={logout}
                      className="py-2 px-3 d-flex align-items-center"
                    >
                      <FaSignOutAlt className="me-3" style={{ color: '#dc3545', fontSize: '0.9rem' }} />
                      <span style={{ color: '#dc3545' }}>Logout</span>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown>
              </>
            ) : (
              /* Show Sign In button when NOT authenticated */
              <Button 
                as={Link} 
                href="/auth/login" 
                variant="outline-primary" 
                className="fw-medium"
                style={{ 
                  borderRadius: '12px',
                  borderColor: '#667eea',
                  color: '#667eea',
                  transition: 'all 0.3s ease',
                  height: '40px',
                  padding: '0 1.5rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                  e.currentTarget.style.background = 'rgba(102, 126, 234, 0.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                Sign In
              </Button>
            )}
          </div>
        </Navbar.Collapse>
      </Container>

      <style jsx>{`
        .logo-circle {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .logo-icon {
          color: white;
          font-size: 1.25rem;
        }
        
        .nav-indicator {
          position: absolute;
          bottom: -12px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        /* Remove default dropdown toggle styling */
        .notification-toggle::after,
        .user-dropdown-toggle::after,
        .dropdown-toggle-no-caret::after {
          display: none !important;
          content: none !important;
        }
        
        .notification-toggle:focus,
        .user-dropdown-toggle:focus,
        .dropdown-toggle-no-caret:focus {
          box-shadow: none !important;
          outline: none !important;
        }
        
        /* Notification bell hover effect */
        .notification-bell-wrapper:hover {
          background: rgba(102, 126, 234, 0.12) !important;
          transform: translateY(-2px);
        }
        
        /* User avatar hover effect */
        .user-avatar:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.2);
        }
        
        .dropdown-menu {
          animation: slideDown 0.2s ease-out;
        }
          
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        /* Mobile Responsiveness */
        @media (max-width: 991.98px) {
          .navbar-collapse {
            padding: 1rem;
            background: white;
            border-radius: 16px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            margin-top: 0.5rem;
            border: 1px solid rgba(0, 0, 0, 0.05);
          }
          
          .navbar-collapse > div {
            flex-direction: column !important;
            gap: 1rem !important;
            margin-top: 1rem;
          }
          
          .nav-link {
            padding: 0.75rem 1rem;
            border-radius: 12px;
            margin: 0.25rem 0;
          }
          
          .nav-link.active {
            background: rgba(102, 126, 234, 0.1);
          }
          
          .nav-indicator {
            display: none;
          }
        }
        
        @media (max-width: 576px) {
          .container-fluid {
            padding-left: 1rem;
            padding-right: 1rem;
          }
          
          .logo-circle {
            width: 36px;
            height: 36px;
          }
          
          .logo-icon {
            font-size: 1.1rem;
          }
          
          .user-avatar {
            width: 36px !important;
            height: 36px !important;
          }
          
          .notification-bell-wrapper {
            width: 36px !important;
            height: 36px !important;
          }
          
          .dropdown-menu {
            position: fixed !important;
            top: 50% !important;
            left: 50% !important;
            transform: translate(-50%, -50%) !important;
            width: 90% !important;
            max-width: 320px !important;
          }
        }
      `}</style>
    </Navbar>
  );
}