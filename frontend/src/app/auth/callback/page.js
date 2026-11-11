'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../lib/contexts/AuthContext';
import { Container, Row, Col, Card, Spinner, Alert, Button } from 'react-bootstrap';
import { 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaSpinner, 
  FaHome, 
  FaSignInAlt,
  FaGoogle,
  FaExclamationCircle,
  FaUser,
  FaImage
} from 'react-icons/fa';

// Utility function to decode JWT token
const decodeJWT = (token) => {
  try {
    // JWT format: header.payload.signature
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

// S3 Bucket Configuration from environment variables
const S3_CONFIG = {
  region: process.env.NEXT_PUBLIC_S3_REGION ,
  bucket: process.env.NEXT_PUBLIC_S3_BUCKET ,
  baseUrl: process.env.NEXT_PUBLIC_S3_BASE_URL ,
  profileFolder: process.env.NEXT_PUBLIC_S3_PROFILE_FOLDER || 'profile-pictures'
};

// Generate S3 URL for profile picture
const getS3ProfileUrl = (filename) => {
  if (!filename) return null;
  return `${S3_CONFIG.baseUrl}/${S3_CONFIG.profileFolder}/${filename}`;
};

export default function OAuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { 
    api, 
    storeUserData, 
    storeProfileData, 
    setToken,
    clearLocalStorage,
    fetchUserProfile 
  } = useAuth();
  
  const [status, setStatus] = useState('processing');
  const [message, setMessage] = useState('Processing authentication...');
  const [error, setError] = useState(null);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  useEffect(() => {
    const processOAuthCallback = async () => {
      try {
        const token = searchParams.get('token');
        const provider = searchParams.get('provider') || 'google';
        const errorParam = searchParams.get('error');
        
        console.log('OAuth Callback Parameters:', {
          token: token ? 'Present' : 'Missing',
          provider,
          error: errorParam || 'None'
        });
        
        if (errorParam) {
          throw new Error(decodeURIComponent(errorParam));
        }
        
        if (!token) {
          throw new Error('No authentication token received from Google');
        }
        
        // 1. Decode JWT token to get user info
        const decodedToken = decodeJWT(token);
        console.log('Decoded JWT:', decodedToken);
        
        if (decodedToken) {
          setUserEmail(decodedToken.email || '');
          setUserName(decodedToken.displayName || decodedToken.name || '');
        }
        
        // 2. Store token using AuthContext method
        if (setToken) {
          setToken(token);
          console.log('Token stored via AuthContext');
        } else {
          localStorage.setItem('scamalert_token', token);
          console.log('Token stored directly');
        }
        
        try {
          console.log('Fetching user profile from backend...');
          
          // 3. Fetch complete user profile
          const response = await api.get('/api/v1/auth/me', {
            headers: { 
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          console.log('Complete profile response:', response.data);
          
          if (response.data) {
            const userData = await processUserData(response.data, provider, token);
            
            // Store user data
            if (storeUserData && storeProfileData) {
              storeUserData(userData);
              storeProfileData(userData);
              console.log('User data stored via AuthContext');
            } else {
              localStorage.setItem('scamalert_user', JSON.stringify(userData));
              localStorage.setItem('scamalert_profile', JSON.stringify(userData));
              console.log('User data stored directly');
            }
            
            setStatus('success');
            setMessage(`Welcome ${userData.displayName || userData.firstName || 'User'}! Authentication successful.`);
            
            // Redirect to dashboard
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 1500);
            
          } else {
            throw new Error('Empty user data from server');
          }
          
        } catch (profileError) {
          console.warn('Profile fetch failed, creating from JWT:', profileError.message);
          
          // Create user from JWT data
          const userData = await createUserFromJWT(decodedToken, provider, token);
          
          // Store fallback user data
          if (storeUserData && storeProfileData) {
            storeUserData(userData);
            storeProfileData(userData);
            console.log('Fallback user stored via AuthContext');
          } else {
            localStorage.setItem('scamalert_user', JSON.stringify(userData));
            localStorage.setItem('scamalert_profile', JSON.stringify(userData));
            console.log('Fallback user stored directly');
          }
          
          setStatus('success');
          setMessage(`Welcome ${userData.displayName || userData.firstName || 'User'}! Setting up your account...`);
          
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1500);
        }
        
      } catch (err) {
        console.error('OAuth callback error:', err);
        setStatus('error');
        setError(err.message || 'Authentication failed. Please try again.');
        setMessage('Authentication Failed');
        
        // Clear any partial data
        if (clearLocalStorage) {
          clearLocalStorage();
          console.log('Cleared local storage via AuthContext');
        } else {
          localStorage.removeItem('scamalert_token');
          localStorage.removeItem('scamalert_user');
          localStorage.removeItem('scamalert_profile');
          console.log('Cleared local storage directly');
        }
      }
    };

    // Start processing
    setTimeout(processOAuthCallback, 100);
    
  }, [searchParams, api, storeUserData, storeProfileData, setToken, clearLocalStorage, fetchUserProfile]);

  // Process user data from backend response
  const processUserData = async (backendData, provider, token) => {
    let avatarUrl = backendData.avatarUrl || backendData.picture || '';
    
    // If no avatar URL, try to get from JWT or generate default
    if (!avatarUrl && backendData.email) {
      // Check if avatar exists in S3
      const s3Filename = `${backendData.id || backendData.email.split('@')[0]}.jpg`;
      const s3Url = getS3ProfileUrl(s3Filename);
      
      
      // For now, we'll use a default avatar
      avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(backendData.displayName || backendData.email)}&background=667eea&color=fff&size=256`;
    }
    
    return {
      id: backendData.id || backendData.sub || `google_${Date.now()}`,
      email: backendData.email || '',
      displayName: backendData.displayName || backendData.name || backendData.email?.split('@')[0] || 'User',
      firstName: backendData.firstName || backendData.given_name || backendData.name?.split(' ')[0] || '',
      lastName: backendData.lastName || backendData.family_name || backendData.name?.split(' ').slice(1).join(' ') || '',
      fullName: backendData.name || backendData.displayName || '',
      role: backendData.role || 'USER',
      provider: provider,
      avatarUrl: avatarUrl,
      emailVerified: backendData.emailVerified || backendData.email_verified || true,
      oauthLogin: true,
      createdAt: backendData.createdAt || new Date().toISOString(),
      updatedAt: backendData.updatedAt || new Date().toISOString(),
      // Additional fields
      bio: backendData.bio || 'Google authenticated user',
      phone: backendData.phone || '',
      location: backendData.location || '',
      website: backendData.website || '',
      country: backendData.country || '',
      region: backendData.region || '',
      city: backendData.city || '',
      title: backendData.title || 'Scam Awareness Member',
      reportCount: backendData.reportCount || 0,
      followerCount: backendData.followerCount || 0,
      followingCount: backendData.followingCount || 0,
      credibilityScore: backendData.credibilityScore || 85,
      responseRate: backendData.responseRate || 0,
      // JWT token for API calls
      token: token
    };
  };

  // Create user from JWT data
  const createUserFromJWT = async (decodedToken, provider, token) => {
    const email = decodedToken?.email || searchParams.get('email') || '';
    const name = decodedToken?.displayName || decodedToken?.name || searchParams.get('name') || 'Google User';
    const picture = decodedToken?.picture || searchParams.get('picture') || '';
    
    // Try to get avatar from S3
    let avatarUrl = picture;
    if (!avatarUrl && email) {
      const s3Filename = `${decodedToken?.sub || email.split('@')[0]}.jpg`;
      avatarUrl = getS3ProfileUrl(s3Filename);
    }
    
    return {
      id: decodedToken?.sub || `google_${Date.now()}`,
      email: email,
      displayName: name,
      firstName: name.split(' ')[0] || '',
      lastName: name.split(' ').slice(1).join(' ') || '',
      fullName: name,
      role: decodedToken?.role || 'USER',
      provider: provider,
      avatarUrl: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&size=256`,
      emailVerified: decodedToken?.email_verified || true,
      oauthLogin: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Additional fields
      bio: 'Google authenticated user',
      phone: '',
      location: '',
      website: '',
      country: '',
      region: '',
      city: '',
      title: 'Scam Awareness Member',
      reportCount: 0,
      followerCount: 0,
      followingCount: 0,
      credibilityScore: 85,
      responseRate: 0,
      // JWT token
      token: token
    };
  };

  return (
    <Container className="py-5 min-vh-100 d-flex align-items-center justify-content-center">
      <Row className="justify-content-center w-100">
        <Col md={6} lg={4}>
          <Card className="border-0 shadow-lg text-center" style={{ borderRadius: '20px', overflow: 'hidden' }}>
            <Card.Header 
              className="border-0 py-4"
              style={{ 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white'
              }}
            >
              <div className="d-flex align-items-center justify-content-center mb-2">
                <FaGoogle size={24} className="me-3" />
                <h4 className="fw-bold mb-0">Google Sign-in</h4>
              </div>
              <p className="mb-0 opacity-75">Completing your authentication...</p>
            </Card.Header>
            
            <Card.Body className="p-5">
              {status === 'processing' && (
                <>
                  <div className="mb-4">
                    <div 
                      className="avatar-circle mx-auto mb-3"
                      style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      }}
                    >
                      <FaSpinner 
                        className="avatar-icon text-white" 
                        size={40}
                        style={{ animation: 'spin 1s linear infinite' }}
                      />
                    </div>
                  </div>
                  
                  <h4 className="fw-bold mb-3" style={{ color: '#2d3748' }}>
                    {userName ? `Welcome, ${userName}!` : 'Completing Authentication'}
                  </h4>
                  
                  {userEmail && (
                    <p className="text-muted mb-3 small">
                      <FaUser className="me-2" />
                      {userEmail}
                    </p>
                  )}
                  
                  <p className="text-muted mb-4">
                    Please wait while we verify your Google account...
                  </p>
                  
                  <div className="d-flex align-items-center justify-content-center">
                    <Spinner animation="border" variant="primary" className="me-2" />
                    <small className="text-muted fw-medium">Processing...</small>
                  </div>
                </>
              )}

              {status === 'success' && (
                <>
                  <div className="mb-4">
                    <div 
                      className="avatar-circle mx-auto mb-3 bg-success"
                      style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      <FaCheckCircle className="avatar-icon text-white" size={40} />
                    </div>
                  </div>
                  
                  <h4 className="fw-bold mb-3 text-success">Success!</h4>
                  
                  <Alert 
                    variant="success" 
                    className="border-0 mb-4"
                    style={{
                      background: 'rgba(16, 185, 129, 0.1)',
                      borderLeft: '4px solid #10b981',
                      borderRadius: '12px'
                    }}
                  >
                    <div className="d-flex align-items-center">
                      <FaCheckCircle className="me-2" style={{ color: '#10b981' }} />
                      <span className="fw-medium">{message}</span>
                    </div>
                  </Alert>
                  
                  <div className="mt-4">
                    <div className="d-flex align-items-center justify-content-center">
                      <Spinner animation="border" size="sm" variant="success" className="me-2" />
                      <small className="text-muted fw-medium">Redirecting to dashboard...</small>
                    </div>
                    <div className="progress mt-2" style={{ height: '4px' }}>
                      <div 
                        className="progress-bar bg-success" 
                        role="progressbar" 
                        style={{ width: '100%', animation: 'progress 1.5s ease-in-out' }}
                        aria-valuenow="100" 
                        aria-valuemin="0" 
                        aria-valuemax="100"
                      ></div>
                    </div>
                  </div>
                </>
              )}

              {status === 'error' && (
                <>
                  <div className="mb-4">
                    <div 
                      className="avatar-circle mx-auto mb-3 bg-danger"
                      style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                        boxShadow: '0 4px 20px rgba(239, 68, 68, 0.3)'
                      }}
                    >
                      <FaExclamationTriangle className="avatar-icon text-white" size={40} />
                    </div>
                  </div>
                  
                  <h4 className="fw-bold mb-3 text-danger">Authentication Failed</h4>
                  
                  <Alert 
                    variant="danger" 
                    className="border-0 mb-4"
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      borderLeft: '4px solid #ef4444',
                      borderRadius: '12px'
                    }}
                  >
                    <div className="d-flex align-items-center">
                      <FaExclamationTriangle className="me-2" style={{ color: '#ef4444' }} />
                      <span className="fw-medium">{error}</span>
                    </div>
                  </Alert>
                  
                  <p className="text-muted mb-4">
                    Please try again or use a different sign-in method.
                  </p>
                  
                  <div className="d-grid gap-2">
                    <Button
                      variant="primary"
                      onClick={() => router.push('/auth/login')}
                      className="py-3 fw-medium"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        border: 'none',
                        borderRadius: '12px',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <FaSignInAlt className="me-2" />
                      Back to Login
                    </Button>
                    <Button
                      variant="outline-primary"
                      onClick={() => router.push('/')}
                      className="py-3 fw-medium"
                      style={{
                        borderColor: '#667eea',
                        color: '#667eea',
                        borderRadius: '12px'
                      }}
                    >
                      <FaHome className="me-2" />
                      Return to Home
                    </Button>
                  </div>
                </>
              )}
            </Card.Body>
            
            <Card.Footer className="border-0 bg-transparent py-3">
              <small className="text-muted d-flex align-items-center justify-content-center">
                <FaImage className="me-2" />
                Profile images stored securely in S3
              </small>
            </Card.Footer>
          </Card>
        </Col>
      </Row>

      <style jsx>{`
        .min-vh-100 {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes progress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
        
        .avatar-icon {
          font-size: 2.5rem;
        }
      `}</style>
    </Container>
  );
}