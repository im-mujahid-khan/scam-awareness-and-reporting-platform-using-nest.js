'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, Tabs, Tab, Badge, Modal } from 'react-bootstrap';
import { 
  FaEnvelope, FaLock, FaUser, FaArrowRight, FaGoogle, FaFacebook, FaTwitter, 
  FaKey, FaMobileAlt, FaClock, FaShieldAlt, FaCheckCircle, FaInfoCircle, FaExclamationTriangle, FaEye, FaEyeSlash,
  FaSpinner, FaExternalLinkAlt, FaExclamationCircle, FaSync, FaTimesCircle, FaUserLock, FaSignOutAlt,
  FaDeviceMobile, FaDesktop
} from 'react-icons/fa';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../../lib/contexts/AuthContext';
import SessionExpiredNotification from './../../../../components/SessionExpiredNotification';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  
  const [otpData, setOtpData] = useState({
    identifier: '',
    otp: '',
    name: '', 
  });
  
  const [activeTab, setActiveTab] = useState('password'); 
  const [errors, setErrors] = useState({});
  const [otpErrors, setOtpErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [otpExpiryTime, setOtpExpiryTime] = useState(null);
  const [isNewUser, setIsNewUser] = useState(false);
  
  // Email Verification States
  const [showVerificationAlert, setShowVerificationAlert] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  
  // Multi-Session States
  const [showSessionConflictModal, setShowSessionConflictModal] = useState(false);
  const [sessionConflictEmail, setSessionConflictEmail] = useState('');
  
  // Google OAuth States
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [googleStatus, setGoogleStatus] = useState('idle'); 
  const [showGoogleRedirectModal, setShowGoogleRedirectModal] = useState(false);
  
  // Session Expired State
  const [sessionExpiredParam, setSessionExpiredParam] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const { 
    login, 
    api, 
    sendVerificationEmail,
    sessionStatus,
    showSessionExpiredNotification
  } = useAuth();

  // Check for session expired parameter in URL
  useEffect(() => {
    const sessionParam = searchParams.get('session');
    if (sessionParam === 'expired') {
      setSessionExpiredParam(true);
      toast.info('Your session has expired. Please login again.', {
        position: 'top-center',
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Clean up URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, [searchParams]);

  // Check Google OAuth status on component mount
  useEffect(() => {
    checkGoogleOAuthStatus();
  }, []);

  const checkGoogleOAuthStatus = async () => {
    try {
      const response = await api.get('/api/v1/auth/config/status');
      if (response.data.googleOAuth === 'READY') {
        console.log(' Google OAuth is ready');
      } else {
        console.log('⚠️ Google OAuth is not configured');
      }
    } catch (error) {
      console.error('Failed to check Google OAuth status:', error);
    }
  };

  // Real Google OAuth Handler - SIMPLE VERSION
  const handleGoogleLogin = () => {
    setGoogleLoading(true);
    setGoogleError('');
    setGoogleStatus('loading');
    
    // Store current path for redirect back after OAuth
    if (typeof window !== 'undefined') {
      localStorage.setItem('preOAuthPath', window.location.pathname);
    }
    
    // Simple redirect - no popup
    window.location.href = 'http://localhost:3001/api/v1/auth/google';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('🚀 === LOGIN FORM SUBMITTED ===');
    console.log('📧 Email:', formData.email);
    console.log('🔒 Password length:', formData.password?.length);
    
    setErrors({});
    setShowVerificationAlert(false);
    setShowSessionConflictModal(false);
    setSessionExpiredParam(false);

    // Validation
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    
    if (!formData.password) newErrors.password = 'Password is required';

    if (Object.keys(newErrors).length > 0) {
      console.log(' Validation errors:', newErrors);
      setErrors(newErrors);
      return;
    }

    console.log(' Validation passed, calling login function...');
    setLoading(true);
    
    try {
      const result = await login(formData.email, formData.password);
      
      console.log('📥 Login result received:', {
        success: result.success,
        isSessionConflict: result.isSessionConflict,
        requiresVerification: result.requiresVerification,
        errorStatus: result.errorStatus,
        hasError: !!result.error,
        sessionExpired: result.sessionExpired
      });

      if (result.success) {
        console.log(' Login successful');
        
        // Check if email is verified
        if (result.user && !result.user.emailVerified) {
          console.log('⚠️ Email not verified, showing alert');
          setUnverifiedEmail(formData.email);
          setShowVerificationAlert(true);
          
          const token = localStorage.getItem('scamalert_token');
          if (token) {
            setErrors({ submit: 'Please verify your email to access all features' });
          }
        } else {
          console.log('🎉 Redirecting to feed...');
          router.push('/feed');
        }
      } else {
        console.log('❌ Login failed');
        console.log('🔍 Error details:', result.errorDetails);
        
        // Check if error is due to multi-session conflict
        if (result.isSessionConflict) {
          console.log('⚠️ Session conflict detected! Showing modal...');
          setSessionConflictEmail(formData.email);
          setShowSessionConflictModal(true);
          // Don't set inline error for session conflict - modal and toast handle it
        } 
        // Check if it's a session expired error
        else if (result.error && (result.error.toLowerCase().includes('session expired') || result.sessionExpired)) {
          console.log('⏰ Session expired error');
          
          // Show session expired notification using our new system
          showSessionExpiredNotification(
            'Your session has expired because you logged in on another device.',
            'device'
          );
          
          // Clear the form password for security
          setFormData(prev => ({ ...prev, password: '' }));
        }
        // For other errors, show inline error
        else {
          console.log('📝 Setting inline error message:', result.error);
          setErrors({ submit: result.error });
        }
      }
    } catch (err) {
      console.log('💥 Unexpected error in handleSubmit catch block:', err);
      console.error('Full error:', err);
      
      // Check if it's a session expired error from API
      if (err.message === 'SESSION_EXPIRED_CONFLICT') {
        console.log('⏰ Session conflict from API layer');
        
        // Show notification instead of inline error
        showSessionExpiredNotification(
          'Your session has expired. Please login again.',
          'device'
        );
        
        // Clear the form password for security
        setFormData(prev => ({ ...prev, password: '' }));
      }
      // Check if error is due to unverified email
      else if (err.message && err.message.includes('email not verified')) {
        console.log('⚠️ Email verification error');
        setUnverifiedEmail(formData.email);
        setShowVerificationAlert(true);
        setErrors({ submit: 'Please verify your email to login' });
      } else {
        console.log('❌ Generic error occurred');
        setErrors({ submit: 'An error occurred during login' });
      }
    } finally {
      console.log('🏁 Login attempt finished, setting loading to false');
      setLoading(false);
    }
  };

  const handleForceLogin = async () => {
    console.log('🔥 === FORCE LOGIN INITIATED ===');
    console.log('📧 Email:', formData.email);
    
    setLoading(true);
    setShowSessionConflictModal(false);
    
    try {
      console.log('⚡ Calling login with force flag...');
      // Add force flag to login request
      const result = await login(formData.email, formData.password, { force: true });
      
      console.log('📥 Force login result:', {
        success: result.success,
        hasError: !!result.error
      });
      
      if (result.success) {
        console.log(' Force login successful');
        
        if (result.user && !result.user.emailVerified) {
          console.log('⚠️ Email not verified');
          setUnverifiedEmail(formData.email);
          setShowVerificationAlert(true);
          setErrors({ submit: 'Please verify your email to access all features' });
        } else {
          console.log('🎉 Redirecting to feed...');
          router.push('/feed');
        }
      } else {
        console.log('❌ Force login failed:', result.error);
        setErrors({ submit: result.error });
      }
    } catch (err) {
      console.log('💥 Force login error:', err);
      setErrors({ submit: 'Failed to force login. Please try again.' });
    } finally {
      console.log('🏁 Force login finished');
      setLoading(false);
    }
  };

  const handleSendVerificationEmail = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    
    try {
      const result = await sendVerificationEmail();
      if (result.success) {
        setResendSuccess(true);
        setTimeout(() => {
          setResendSuccess(false);
        }, 3000);
      } else {
        setErrors({ submit: result.error });
      }
    } catch (error) {
      setErrors({ submit: 'Failed to send verification email' });
    } finally {
      setResendLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setOtpErrors({});
    setShowVerificationAlert(false);
    
    if (!otpData.identifier) {
      setOtpErrors({ identifier: 'Email is required to send OTP' });
      return;
    }
    
    if (!/\S+@\S+\.\S+/.test(otpData.identifier)) {
      setOtpErrors({ identifier: 'Please enter a valid email address' });
      return;
    }

    setOtpLoading(true);
    
    try {
      // Call backend OTP request endpoint
      const response = await api.post('/api/v1/auth/otp/request', {
        identifier: otpData.identifier.trim()
      });

      if (response.data.success) {
        const { data } = response.data;
        
        // Show success message and start countdown
        setOtpSent(true);
        const expiresIn = data.expiresIn || 300; // Default to 5 minutes if not provided
        startCountdown(60); // 60 seconds countdown for resend
        setOtpExpiryTime(Date.now() + expiresIn * 1000);
        
        // Show success message with masked email
        setOtpErrors({ 
          success: `${data.message}. Expires in ${Math.floor(expiresIn / 60)} minutes.` 
        });
        
      } else {
        throw new Error('Failed to send OTP');
      }
    } catch (err) {
      console.error('OTP send error:', err);
      
      let errorMessage = 'Failed to send OTP. Please try again.';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      } else if (err.response?.status === 409) {
        errorMessage = 'Too many OTP requests. Please wait before trying again.';
      }
      
      setOtpErrors({ submit: errorMessage });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleOtpLogin = async (e) => {
    e.preventDefault();
    setOtpErrors({});
    setShowVerificationAlert(false);
    
    const newErrors = {};
    if (!otpData.identifier) newErrors.identifier = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(otpData.identifier)) newErrors.identifier = 'Email is invalid';
    
    if (!otpData.otp) newErrors.otp = 'OTP is required';
    else if (otpData.otp.length !== 6) newErrors.otp = 'OTP must be 6 digits';

    if (Object.keys(newErrors).length > 0) {
      setOtpErrors(newErrors);
      return;
    }

    // Check if OTP has expired
    if (otpExpiryTime && Date.now() > otpExpiryTime) {
      setOtpErrors({ submit: 'OTP has expired. Please request a new one.' });
      return;
    }

    setOtpLoading(true);
    
    try {
      // Prepare verify payload
      const verifyPayload = {
        identifier: otpData.identifier.trim(),
        otp: otpData.otp.trim()
      };

      // Add name only if provided (for new users)
      if (isNewUser && otpData.name && otpData.name.trim()) {
        verifyPayload.name = otpData.name.trim();
      }

      console.log('Sending OTP verification request:', {
        endpoint: '/api/v1/auth/otp/verify',
        payload: { ...verifyPayload, otp: '***' + verifyPayload.otp.slice(-2) }
      });

      // Call backend OTP verify endpoint
      const response = await api.post('/api/v1/auth/otp/verify', verifyPayload);

      console.log('OTP verification response:', response.data);

      if (response.data.success) {
        const { data, message } = response.data;
        
        // Store the token from OTP verification
        const token = data.token;
        
        if (token) {
          // Store token in localStorage using AuthContext's method
          if (typeof window !== 'undefined') {
            localStorage.setItem('scamalert_token', token);
          }
          
          // Store user data from response
          if (data.user) {
            const userData = {
              id: data.user.id,
              email: data.user.email || otpData.identifier,
              displayName: data.user.displayName || data.user.name || otpData.identifier.split('@')[0],
              firstName: data.user.firstName,
              lastName: data.user.lastName,
              role: data.user.role || 'USER',
              avatarUrl: data.user.avatarUrl,
              phone: data.user.phone,
              emailVerified: data.user.emailVerified || false,
              createdAt: new Date().toISOString(),
            };
            
            localStorage.setItem('scamalert_user', JSON.stringify(userData));
            
            // Also store the user data from backend response
            localStorage.setItem('scamalert_otp_user', JSON.stringify(data.user));
            
            // Check if email is verified
            if (!data.user.emailVerified) {
              setUnverifiedEmail(otpData.identifier);
              setShowVerificationAlert(true);
              setOtpErrors({ 
                success: `${message || 'Login successful!'} Please verify your email.` 
              });
            } else {
              setOtpErrors({ 
                success: `${message || 'Login successful!'} Redirecting to dashboard...` 
              });
              
              // Redirect to dashboard
              setTimeout(() => {
                window.location.href = '/feed';
              }, 1500);
            }
          }
        } else {
          throw new Error('No access token received');
        }
      } else {
        throw new Error('OTP verification failed');
      }
    } catch (err) {
      console.error('OTP login error details:', {
        message: err.message,
        response: err.response?.data,
        status: err.response?.status
      });
      
      let errorMessage = 'OTP verification failed. Please try again.';
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
        
        // Check if it's a new user requiring name
        if (err.response.data.message.includes('Name is required')) {
          errorMessage = 'This email is not registered. Please provide your name to create an account.';
          setIsNewUser(true);
        }
      } else if (err.response?.data?.error) {
        errorMessage = err.response.data.error;
      } else if (err.message.includes('Network Error')) {
        errorMessage = 'Cannot connect to server. Please check your connection.';
      } else if (err.message.includes('expired') || err.response?.data?.message?.includes('expired')) {
        errorMessage = 'OTP has expired. Please request a new one.';
      } else if (err.message.includes('invalid') || err.response?.data?.message?.includes('Invalid OTP')) {
        errorMessage = `Invalid OTP. ${err.response?.data?.message || 'Please check and try again.'}`;
      } else if (err.response?.status === 400 && err.response?.data?.message?.includes('Name is required')) {
        errorMessage = 'This email is not registered. Please provide your name to create an account.';
        setIsNewUser(true);
      } else if (err.response?.status === 404) {
        errorMessage = 'OTP verification endpoint not found. Please check the backend.';
      } else if (err.response?.status === 429) {
        errorMessage = 'Too many attempts. Please wait before trying again.';
      }
      
      setOtpErrors({ submit: errorMessage });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (countdown > 0) return;
    
    // Clear previous OTP
    setOtpData(prev => ({ ...prev, otp: '' }));
    setIsNewUser(false);
    
    // Send new OTP
    await handleSendOtp();
  };

  const startCountdown = (seconds) => {
    setCountdown(seconds);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSocialLogin = (provider) => {
    if (provider === 'google') {
      handleGoogleLogin();
    } else if (provider === 'facebook') {
      console.log('Facebook OAuth - Coming soon');
    } else if (provider === 'twitter') {
      console.log('Twitter OAuth - Coming soon');
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrors({});
    setOtpErrors({});
    setOtpSent(false);
    setOtpData({ identifier: '', otp: '', name: '' });
    setCountdown(0);
    setIsNewUser(false);
    setShowVerificationAlert(false);
    setShowSessionConflictModal(false);
  };

  const handleIdentifierChange = (e) => {
    const value = e.target.value;
    setOtpData(prev => ({ ...prev, identifier: value }));
    
    // Clear OTP if email changes
    if (otpSent && prev.identifier !== value) {
      setOtpData(prev => ({ ...prev, otp: '', name: '' }));
      setOtpSent(false);
      setIsNewUser(false);
    }
  };

  // Calculate remaining OTP validity time
  const getOtpValidityTime = () => {
    if (!otpExpiryTime) return '5:00';
    
    const remaining = Math.max(0, Math.floor((otpExpiryTime - Date.now()) / 1000));
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <>
      {/* Session Expired Notification Component */}
      {sessionStatus.showNotification && (
        <SessionExpiredNotification
          message={sessionStatus.expiredMessage}
          conflictType={sessionStatus.conflictType}
          onDismiss={() => dismissSessionNotification()}
          onLoginAgain={() => handleSessionExpiredAction()}
        />
      )}
      
      <Container className="py-5 min-vh-100 d-flex align-items-center justify-content-center">
        <Row className="justify-content-center w-100">
          <Col xl={5} lg={6} md={8}>
            {/* Card Header with Gradient */}
            <div className="text-center mb-4">
              <div className="logo-container mb-3">
                <div className="avatar-circle mx-auto mb-3">
                  <FaUser className="avatar-icon" />
                </div>
              </div>
              <h1 className="fw-bold mb-2" style={{ color: '#2d3748' }}>Welcome Back</h1>
              <p className="text-muted mb-0" style={{ fontSize: '1.1rem' }}>Sign in to continue your safety journey</p>
              
              {/* Session Expired Alert */}
              {sessionExpiredParam && (
                <div className="mt-3">
                  <Alert variant="warning" className="d-inline-flex align-items-center p-2 rounded-pill">
                    <FaExclamationTriangle className="me-2" />
                    <span className="fw-medium">Your session has expired. Please login again.</span>
                  </Alert>
                </div>
              )}
              
              {/* Google OAuth Status */}
              {googleStatus === 'loading' && (
                <div className="mt-3">
                  <Alert variant="info" className="d-inline-flex align-items-center p-2 rounded-pill">
                    <FaSpinner className="spinner-border spinner-border-sm me-2" />
                    <span className="fw-medium">Redirecting to Google...</span>
                  </Alert>
                </div>
              )}
              
              {googleStatus === 'success' && (
                <div className="mt-3">
                  <Alert variant="success" className="d-inline-flex align-items-center p-2 rounded-pill">
                    <FaCheckCircle className="me-2" />
                    <span className="fw-medium">Google authentication successful! Redirecting...</span>
                  </Alert>
                </div>
              )}
              
              {googleError && (
                <div className="mt-3">
                  <Alert variant="danger" className="p-2 rounded-pill">
                    <div className="d-flex align-items-center">
                      <FaExclamationCircle className="me-2" />
                      <span className="fw-medium">{googleError}</span>
                    </div>
                  </Alert>
                </div>
              )}
            </div>

            <Card 
              className="border-0 shadow-lg" 
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              style={{ transition: 'all 0.3s ease' }}
            >
              <Card.Body className="p-4 p-md-5">
                {/* Email Verification Alert */}
                {showVerificationAlert && (
                  <Alert 
                    variant="warning" 
                    className="border-0 mb-4 rounded-3"
                    style={{ 
                      background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)',
                      border: '1px solid rgba(245, 158, 11, 0.2)'
                    }}
                  >
                    <div className="d-flex align-items-start">
                      <FaExclamationTriangle className="text-warning mt-1 me-3" size={24} />
                      <div className="flex-grow-1">
                        <h6 className="fw-bold mb-2">Email Verification Required</h6>
                        <p className="mb-3">
                          Please verify your email address <strong>{unverifiedEmail}</strong> to access all features.
                        </p>
                        
                        <div className="d-flex flex-wrap gap-2">
                          <Button
                            variant="warning"
                            size="sm"
                            className="fw-bold"
                            onClick={handleSendVerificationEmail}
                            disabled={resendLoading}
                            style={{ borderRadius: '8px' }}
                          >
                            {resendLoading ? (
                              <span className="d-flex align-items-center">
                                <FaSpinner className="spinner-border spinner-border-sm me-2" />
                                Sending...
                              </span>
                            ) : resendSuccess ? (
                              <span className="d-flex align-items-center">
                                <FaCheckCircle className="me-2" />
                                Sent!
                              </span>
                            ) : (
                              <span className="d-flex align-items-center">
                                <FaEnvelope className="me-2" />
                                Resend Verification Email
                              </span>
                            )}
                          </Button>
                          
                          <Button
                            variant="outline-warning"
                            size="sm"
                            className="fw-bold"
                            onClick={() => {
                              setShowVerificationAlert(false);
                              router.push('/auth/verify-email');
                            }}
                            style={{ borderRadius: '8px' }}
                          >
                            <FaArrowRight className="me-2" />
                            Go to Verification Page
                          </Button>
                        </div>
                      </div>
                      <Button
                        variant="link"
                        className="p-0 text-warning"
                        onClick={() => setShowVerificationAlert(false)}
                      >
                        <FaTimesCircle />
                      </Button>
                    </div>
                  </Alert>
                )}

                {/* Google OAuth Button (Top) */}
                <div className="mb-4">
                  <Button
                    variant="light"
                    className="w-100 py-3 fw-medium border-0 d-flex align-items-center justify-content-center"
                    onClick={() => handleSocialLogin('google')}
                    disabled={googleLoading}
                    style={{ 
                      borderRadius: '12px',
                      background: '#ffffff',
                      border: '1px solid #e9ecef',
                      color: '#3c4043',
                      fontSize: '1rem',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.background = '#f8f9fa';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                      e.currentTarget.style.background = '#ffffff';
                    }}
                  >
                    {googleLoading ? (
                      <>
                        <FaSpinner className="spinner-border spinner-border-sm me-2" />
                        <span>Redirecting to Google...</span>
                      </>
                    ) : (
                      <>
                        <div className="google-logo me-3">
                          <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                          </svg>
                        </div>
                        <span>Continue with Google</span>
                      </>
                    )}
                  </Button>
                  
                  <div className="text-center mt-2">
                    <small className="text-muted">
                      <FaCheckCircle className="text-success me-1" />
                      Secure OAuth 2.0 authentication
                    </small>
                  </div>
                </div>

                {/* Divider */}
                <div className="position-relative text-center my-4">
                  <hr className="w-100" style={{ borderColor: '#e9ecef' }} />
                  <span 
                    className="position-absolute top-50 start-50 translate-middle bg-white px-3"
                    style={{ color: '#6c757d', fontSize: '0.9rem' }}
                  >
                    Or sign in with
                  </span>
                </div>

                {/* Login Method Tabs */}
                <div className="mb-4">
                  <Tabs
                    activeKey={activeTab}
                    onSelect={handleTabChange}
                    className="mb-3 login-tabs"
                    fill
                  >
                    <Tab 
                      eventKey="password" 
                      title={
                        <div className="d-flex align-items-center justify-content-center">
                          <FaLock className="me-2" />
                          <span>Password</span>
                        </div>
                      }
                    >
                      {/* Password Login Form */}
                      <div className="pt-3">
                        {errors.submit && (
                          <Alert 
                            variant="danger" 
                            dismissible 
                            onClose={() => setErrors({})}
                            className="rounded-pill border-0 mb-4"
                            style={{ background: 'rgba(220, 53, 69, 0.1)', border: '1px solid rgba(220, 53, 69, 0.2)' }}
                          >
                            <div className="d-flex align-items-center">
                              <span className="fw-medium">{errors.submit}</span>
                            </div>
                          </Alert>
                        )}

                        <Form onSubmit={handleSubmit}>
                          {/* Email Input */}
                          <Form.Group className="mb-4">
                            <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                              Email Address
                            </Form.Label>
                            <div className="input-group input-group-lg">
                              <span className="input-group-text bg-transparent border-end-0">
                                <FaEnvelope className="text-muted" />
                              </span>
                              <Form.Control
                                type="email"
                                placeholder="Enter your email"
                                value={formData.email}
                                onChange={(e) => setFormData({...formData, email: e.target.value})}
                                isInvalid={!!errors.email}
                                required
                                className="border-start-0 py-3"
                                style={{ 
                                  borderRadius: '12px 0 0 12px',
                                  border: '1px solid #e9ecef',
                                  background: '#f8f9fa'
                                }}
                              />
                            </div>
                            {errors.email && (
                              <div className="text-danger mt-2 small fw-medium">
                                {errors.email}
                              </div>
                            )}
                          </Form.Group>

                          {/* Password Input */}
                          <Form.Group className="mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <Form.Label className="fw-medium mb-0" style={{ color: '#4a5568' }}>
                                Password
                              </Form.Label>
                              <Link 
                                href="/auth/forgot-password" 
                                className="text-decoration-none small fw-medium"
                                style={{ color: '#667eea' }}
                              >
                                Forgot Password?
                              </Link>
                            </div>
                            <div className="input-group input-group-lg">
                              <span className="input-group-text bg-transparent border-end-0">
                                <FaLock className="text-muted" />
                              </span>
                              <Form.Control
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Enter your password"
                                value={formData.password}
                                onChange={(e) => setFormData({...formData, password: e.target.value})}
                                isInvalid={!!errors.password}
                                required
                                className="border-start-0 py-3"
                                style={{ 
                                  borderRadius: '12px 0 0 12px',
                                  border: '1px solid #e9ecef',
                                  background: '#f8f9fa'
                                }}
                              />
                              <Button
                                variant="outline-secondary"
                                type="button"
                                onClick={() => setShowPassword((s) => !s)}
                                className="border-start-0"
                                style={{
                                  borderRadius: '0 12px 12px 0',
                                  border: '1px solid #e9ecef',
                                  borderLeft: 'none',
                                  background: '#f8f9fa',
                                  minWidth: '48px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                              </Button>
                            </div>
                            {errors.password && (
                              <div className="text-danger mt-2 small fw-medium">
                                {errors.password}
                              </div>
                            )}
                          </Form.Group>

                          {/* Remember Me Checkbox */}
                          <Form.Check
                            type="checkbox"
                            label="Remember me for 30 days"
                            checked={formData.rememberMe}
                            onChange={(e) => setFormData({...formData, rememberMe: e.target.checked})}
                            className="mb-4"
                            style={{ color: '#4a5568' }}
                          />

                          {/* Sign In Button */}
                          <Button 
                            type="submit" 
                            variant="primary" 
                            className="w-100 mb-4 py-3 fw-bold border-0"
                            disabled={loading}
                            style={{ 
                              borderRadius: '12px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              fontSize: '1.1rem',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'translateY(0)';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            {loading ? (
                              <span className="d-flex align-items-center justify-content-center">
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                Signing in...
                              </span>
                            ) : (
                              <span className="d-flex align-items-center justify-content-center">
                                Sign In with Password
                                <FaArrowRight className="ms-2" />
                              </span>
                            )}
                          </Button>
                        </Form>
                      </div>
                    </Tab>

                    <Tab 
                      eventKey="otp" 
                      title={
                        <div className="d-flex align-items-center justify-content-center">
                          <FaShieldAlt className="me-2" />
                          <span>OTP Login</span>
                          <Badge bg="info" pill className="ms-2" style={{ fontSize: '0.7rem' }}>
                            New
                          </Badge>
                        </div>
                      }
                    >
                      {/* OTP Login Form */}
                      <div className="pt-3">
                        {otpErrors.success && (
                          <Alert 
                            variant="success" 
                            dismissible 
                            onClose={() => setOtpErrors(prev => ({ ...prev, success: undefined }))}
                            className="rounded-pill border-0 mb-4"
                            style={{ background: 'rgba(40, 167, 69, 0.1)', border: '1px solid rgba(40, 167, 69, 0.2)' }}
                          >
                            <div className="d-flex align-items-center">
                              <FaCheckCircle className="me-2" />
                              <span className="fw-medium">{otpErrors.success}</span>
                            </div>
                          </Alert>
                        )}

                        {otpErrors.submit && (
                          <Alert 
                            variant="danger" 
                            dismissible 
                            onClose={() => setOtpErrors(prev => ({ ...prev, submit: undefined }))}
                            className="rounded-pill border-0 mb-4"
                            style={{ background: 'rgba(220, 53, 69, 0.1)', border: '1px solid rgba(220, 53, 69, 0.2)' }}
                          >
                            <div className="d-flex align-items-center">
                              <FaExclamationTriangle className="me-2" />
                              <span className="fw-medium">{otpErrors.submit}</span>
                            </div>
                          </Alert>
                        )}

                        <Alert variant="info" className="border-0 mb-4" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
                          <FaInfoCircle className="me-2" />
                          <span className="fw-medium">Passwordless login with One-Time Password</span>
                        </Alert>

                        <Form onSubmit={handleOtpLogin}>
                          {/* Email Input for OTP */}
                          <Form.Group className="mb-4">
                            <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                              Email Address
                            </Form.Label>
                            <div className="input-group input-group-lg">
                              <span className="input-group-text bg-transparent border-end-0">
                                <FaEnvelope className="text-muted" />
                              </span>
                              <Form.Control
                                type="email"
                                placeholder="Enter your registered email"
                                value={otpData.identifier}
                                onChange={handleIdentifierChange}
                                isInvalid={!!otpErrors.identifier}
                                required
                                disabled={otpSent && !isNewUser}
                                className="border-start-0 py-3"
                                style={{ 
                                  borderRadius: '12px 0 0 12px',
                                  border: '1px solid #e9ecef',
                                  background: otpSent && !isNewUser ? '#f8f9fa' : '#f8f9fa'
                                }}
                              />
                              <Button
                                variant={otpSent && !isNewUser ? "outline-secondary" : "outline-primary"}
                                onClick={handleSendOtp}
                                disabled={otpLoading || countdown > 0 || !otpData.identifier || (otpSent && !isNewUser)}
                                className="border-start-0"
                                style={{ 
                                  borderRadius: '0 12px 12px 0',
                                  border: '1px solid #e9ecef',
                                  borderLeft: 'none',
                                  background: otpSent && !isNewUser ? '#f8f9fa' : 'transparent'
                                }}
                              >
                                {countdown > 0 ? (
                                  <span>
                                    <FaClock className="me-2" />
                                    {countdown}s
                                  </span>
                                ) : otpLoading ? (
                                  <span className="spinner-border spinner-border-sm me-2"></span>
                                ) : otpSent && !isNewUser ? (
                                  <span>Sent ✓</span>
                                ) : (
                                  <span>Send OTP</span>
                                )}
                              </Button>
                            </div>
                            {otpErrors.identifier && (
                              <div className="text-danger mt-2 small fw-medium">
                                {otpErrors.identifier}
                              </div>
                            )}
                            <div className="small text-muted mt-2">
                              OTP will be sent to your email. Valid for 5 minutes.
                            </div>
                          </Form.Group>

                          {/* Name Input for New Users */}
                          {isNewUser && otpSent && (
                            <Form.Group className="mb-4">
                              <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                                Your Name
                                <Badge bg="warning" text="dark" className="ms-2">Required for new account</Badge>
                              </Form.Label>
                              <div className="input-group input-group-lg">
                                <span className="input-group-text bg-transparent border-end-0">
                                  <FaUser className="text-muted" />
                                </span>
                                <Form.Control
                                  type="text"
                                  placeholder="Enter your full name"
                                  value={otpData.name}
                                  onChange={(e) => setOtpData({...otpData, name: e.target.value})}
                                  required={isNewUser}
                                  className="border-start-0 py-3"
                                  style={{ 
                                    borderRadius: '12px 0 0 12px',
                                    border: '1px solid #e9ecef',
                                    background: '#f8f9fa'
                                  }}
                                />
                              </div>
                              <div className="small text-muted mt-2">
                                We'll create a new account with this email and name
                              </div>
                            </Form.Group>
                          )}

                          {/* OTP Input */}
                          {otpSent && (
                            <>
                              <Form.Group className="mb-4">
                                <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                                  6-Digit OTP Code
                                  {otpExpiryTime && (
                                    <Badge bg={Date.now() > otpExpiryTime ? "danger" : "success"} className="ms-2">
                                      {Date.now() > otpExpiryTime ? 'Expired' : `Expires in ${getOtpValidityTime()}`}
                                    </Badge>
                                  )}
                                </Form.Label>
                                <div className="input-group input-group-lg">
                                  <span className="input-group-text bg-transparent border-end-0">
                                    <FaKey className="text-muted" />
                                  </span>
                                  <Form.Control
                                    type="text"
                                    placeholder="Enter 6-digit OTP"
                                    value={otpData.otp}
                                    onChange={(e) => setOtpData({...otpData, otp: e.target.value.replace(/\D/g, '').slice(0, 6)})}
                                    isInvalid={!!otpErrors.otp}
                                    required
                                    maxLength={6}
                                    className="border-start-0 py-3"
                                    style={{ 
                                      borderRadius: '12px 0 0 12px',
                                      border: '1px solid #e9ecef',
                                      background: '#f8f9fa',
                                      letterSpacing: '3px',
                                      textAlign: 'center',
                                      fontSize: '1.2rem',
                                      fontWeight: 'bold'
                                    }}
                                  />
                                </div>
                                {otpErrors.otp && (
                                  <div className="text-danger mt-2 small fw-medium">
                                    {otpErrors.otp}
                                  </div>
                                )}
                              </Form.Group>

                              {/* Resend OTP Section */}
                              <div className="d-flex justify-content-between align-items-center mb-4">
                                <div className="small text-muted">
                                  <FaClock className="me-1" />
                                  {countdown > 0 ? `Resend available in ${countdown}s` : 'Can resend now'}
                                </div>
                                <Button
                                  variant="link"
                                  className="p-0 small text-decoration-none"
                                  onClick={handleResendOtp}
                                  disabled={countdown > 0}
                                  style={{ color: countdown > 0 ? '#6c757d' : '#667eea' }}
                                >
                                  {countdown > 0 ? 'Resend OTP' : 'Resend OTP'}
                                </Button>
                              </div>
                            </>
                          )}

                          {/* Login with OTP Button */}
                          <Button 
                            type="submit" 
                            variant="primary" 
                            className="w-100 mb-4 py-3 fw-bold border-0"
                            disabled={otpLoading || !otpSent || !otpData.otp || (otpExpiryTime && Date.now() > otpExpiryTime) || (isNewUser && !otpData.name)}
                            style={{ 
                              borderRadius: '12px',
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              fontSize: '1.1rem',
                              transition: 'all 0.3s ease',
                              opacity: (otpSent && otpData.otp && (!otpExpiryTime || Date.now() <= otpExpiryTime) && (!isNewUser || otpData.name)) ? 1 : 0.6
                            }}
                            onMouseEnter={(e) => {
                              if (otpSent && otpData.otp && (!otpExpiryTime || Date.now() <= otpExpiryTime) && (!isNewUser || otpData.name)) {
                                e.currentTarget.style.transform = 'translateY(-2px)';
                                e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (otpSent && otpData.otp && (!otpExpiryTime || Date.now() <= otpExpiryTime) && (!isNewUser || otpData.name)) {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = 'none';
                              }
                            }}
                          >
                            {otpLoading ? (
                              <span className="d-flex align-items-center justify-content-center">
                                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                                {isNewUser ? 'Creating Account...' : 'Verifying OTP...'}
                              </span>
                            ) : (
                              <span className="d-flex align-items-center justify-content-center">
                                <FaShieldAlt className="me-2" />
                                {isNewUser ? 'Create Account & Login' : 'Login with OTP'}
                              </span>
                            )}
                          </Button>
                        </Form>

                        {/* OTP Features */}
                        <div className="mt-4 pt-4 border-top">
                          <h6 className="fw-semibold mb-3" style={{ color: '#4a5568' }}>
                            <FaMobileAlt className="me-2" />
                            Benefits of OTP Login
                          </h6>
                          <ul className="list-unstyled mb-0">
                            <li className="mb-2">
                              <FaCheckCircle className="text-success me-2" />
                              <small>No password to remember</small>
                            </li>
                            <li className="mb-2">
                              <FaCheckCircle className="text-success me-2" />
                              <small>Enhanced security with one-time codes</small>
                            </li>
                            <li className="mb-2">
                              <FaCheckCircle className="text-success me-2" />
                              <small>Protection against password theft</small>
                            </li>
                            <li className="mb-2">
                              <FaCheckCircle className="text-success me-2" />
                              <small>Auto-registration for new users</small>
                            </li>
                            <li className="mb-0">
                              <FaCheckCircle className="text-success me-2" />
                              <small>Quick access without typing password</small>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </Tab>
                  </Tabs>
                </div>

                {/* Social Login Buttons */}
                <div className="row g-3 mb-4">
                  <div className="col-4">
                    <Button
                      variant="light"
                      className="w-100 py-3 border-0"
                      onClick={() => handleSocialLogin('google')}
                      style={{ 
                        borderRadius: '12px',
                        background: '#f8f9fa',
                        border: '1px solid #e9ecef'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.05)';
                        e.currentTarget.style.background = '#ffffff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.background = '#f8f9fa';
                      }}
                    >
                      <FaGoogle className="text-danger" size={20} />
                    </Button>
                  </div>
                  <div className="col-4">
                    <Button
                      variant="light"
                      className="w-100 py-3 border-0"
                      onClick={() => handleSocialLogin('facebook')}
                      disabled
                      style={{ 
                        borderRadius: '12px',
                        background: '#f8f9fa',
                        border: '1px solid #e9ecef',
                        opacity: 0.6
                      }}
                    >
                      <FaFacebook className="text-primary" size={20} />
                      <Badge bg="secondary" className="ms-1" style={{ fontSize: '0.6rem' }}>Soon</Badge>
                    </Button>
                  </div>
                  <div className="col-4">
                    <Button
                      variant="light"
                      className="w-100 py-3 border-0"
                      onClick={() => handleSocialLogin('twitter')}
                      disabled
                      style={{ 
                        borderRadius: '12px',
                        background: '#f8f9fa',
                        border: '1px solid #e9ecef',
                        opacity: 0.6
                      }}
                    >
                      <FaTwitter className="text-info" size={20} />
                      <Badge bg="secondary" className="ms-1" style={{ fontSize: '0.6rem' }}>Soon</Badge>
                    </Button>
                  </div>
                </div>

                {/* Sign Up Link */}
                <div className="text-center pt-3">
                  <p className="mb-0" style={{ color: '#6c757d' }}>
                    Don't have an account?{' '}
                    <Link 
                      href="/auth/signup" 
                      className="fw-bold text-decoration-none"
                      style={{ 
                        color: '#667eea',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      Sign up now
                    </Link>
                  </p>
                </div>
              </Card.Body>
            </Card>

            {/* Footer */}
            <div className="text-center mt-4">
              <p className="small text-muted mb-0">
                By signing in, you agree to our{' '}
                <Link href="/terms" className="text-decoration-none">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-decoration-none">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Session Conflict Modal */}
      <Modal 
        show={showSessionConflictModal} 
        onHide={() => setShowSessionConflictModal(false)} 
        centered
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton className="border-0 pb-0">
          <Modal.Title className="d-flex align-items-center">
            <div 
              className="rounded-circle p-3 me-3"
              style={{ 
                background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)'
              }}
            >
              <FaUserLock className="text-warning" size={24} />
            </div>
            <div>
              <h5 className="mb-0 fw-bold">Active Session Detected</h5>
              <small className="text-muted">Your account is logged in elsewhere</small>
            </div>
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="px-4 py-4">
          <Alert variant="warning" className="border-0 mb-4" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
            <div className="d-flex align-items-start">
              <FaExclamationTriangle className="text-warning mt-1 me-3" size={20} />
              <div>
                <h6 className="fw-bold mb-2">Multiple Login Sessions Not Allowed</h6>
                <p className="mb-0 small">
                  Your account <strong>{sessionConflictEmail}</strong> is currently logged in on another device or browser.
                </p>
              </div>
            </div>
          </Alert>

          <div className="mb-4">
            <h6 className="fw-semibold mb-3">What would you like to do?</h6>
            
            <div className="d-grid gap-3">
              <div 
                className="p-3 border rounded-3"
                style={{ background: '#f8f9fa' }}
              >
                <div className="d-flex align-items-start">
                  <FaDeviceMobile className="text-primary mt-1 me-3" size={18} />
                  <div className="flex-grow-1">
                    <h6 className="fw-semibold mb-1">Continue on This Device</h6>
                    <p className="mb-0 small text-muted">
                      Log out from your other device/browser and continue here
                    </p>
                  </div>
                </div>
              </div>

              <div 
                className="p-3 border rounded-3"
                style={{ background: '#f8f9fa' }}
              >
                <div className="d-flex align-items-start">
                  <FaDesktop className="text-secondary mt-1 me-3" size={18} />
                  <div className="flex-grow-1">
                    <h6 className="fw-semibold mb-1">Cancel Login</h6>
                    <p className="mb-0 small text-muted">
                      Keep your existing session active and stay logged out here
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Alert variant="info" className="border-0 mb-0" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
            <small>
              <FaShieldAlt className="me-2" />
              <strong>Security Tip:</strong> For your account security, we only allow one active session at a time. 
              If you don't recognize the other session, please change your password immediately.
            </small>
          </Alert>
        </Modal.Body>
        
        <Modal.Footer className="border-0 pt-0">
          <Button 
            variant="outline-secondary" 
            onClick={() => {
              setShowSessionConflictModal(false);
              setErrors({});
              setFormData({ ...formData, password: '' });
            }}
            className="px-4"
            style={{ borderRadius: '8px' }}
          >
            Cancel
          </Button>
          <Button 
            variant="warning" 
            onClick={handleForceLogin}
            disabled={loading}
            className="px-4 fw-semibold"
            style={{ borderRadius: '8px' }}
          >
            {loading ? (
              <>
                <FaSpinner className="spinner-border spinner-border-sm me-2" />
                Logging Out Other Session...
              </>
            ) : (
              <>
                <FaSignOutAlt className="me-2" />
                Continue on This Device
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Google Redirect Modal */}
      <Modal show={showGoogleRedirectModal} onHide={() => setShowGoogleRedirectModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Google Authentication</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center">
            <div className="mb-4">
              <div className="google-logo-large mb-3">
                <svg width="64" height="64" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
              </div>
              <h5 className="fw-bold">Continue with Google</h5>
              <p className="text-muted">
                The Google authentication window didn't close automatically. You can safely close it and return here.
              </p>
            </div>
            
            <div className="alert alert-info mb-4">
              <FaInfoCircle className="me-2" />
              <small>If you've successfully logged in with Google, you'll be redirected automatically.</small>
            </div>
            
            <div className="d-grid gap-2">
              <Button 
                variant="primary" 
                onClick={() => {
                  setShowGoogleRedirectModal(false);
                  // Check if user is authenticated
                  const token = localStorage.getItem('scamalert_token');
                  if (token) {
                    window.location.reload();
                  }
                }}
                className="py-3"
              >
                <FaSync className="me-2" />
                Check Authentication Status
              </Button>
              
              <Button 
                variant="outline-primary" 
                onClick={handleGoogleLogin}
                className="py-3"
              >
                <FaExternalLinkAlt className="me-2" />
                Try Google Login Again
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      <style jsx>{`
        .min-vh-100 {
          min-height: 100vh;
          max-height: 100vh;
          height: 100vh;
          overflow: hidden;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        
        .logo-container .avatar-circle {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0 auto;
        }
        
        .avatar-icon {
          color: white;
          font-size: 2rem;
        }
        
        .card {
          border-radius: 24px !important;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: #ffffff;
          transition: all 0.3s ease;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
          max-height: 95vh;
          overflow-y: auto;
        }
        
        .card-body {
          max-height: 90vh;
          overflow-y: auto;
          padding-right: 0.5rem;
        }
        
        /* Login Tabs Styling */
        .login-tabs .nav-link {
          border: none;
          color: #6c757d;
          font-weight: 500;
          padding: 0.75rem 1rem;
          border-radius: 12px 12px 0 0;
          background: transparent;
          margin-bottom: -1px;
          border-bottom: 3px solid transparent;
        }
        
        .login-tabs .nav-link:hover {
          color: #667eea;
          background: rgba(102, 126, 234, 0.05);
          border-color: transparent;
        }
        
        .login-tabs .nav-link.active {
          color: #667eea;
          background: white;
          border-bottom: 3px solid #667eea;
          font-weight: 600;
        }
        
        /* Google Logo */
        .google-logo {
          display: flex;
          align-items: center;
        }
        
        .google-logo-large {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Hide scrollbar for Chrome, Safari and Opera */
        .card-body::-webkit-scrollbar,
        .card::-webkit-scrollbar {
          display: none;
        }
        
        /* Hide scrollbar for IE, Edge and Firefox */
        .card-body,
        .card {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        
        .card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
        }
        
        .input-group:focus-within .input-group-text {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.05);
        }
        
        .input-group:focus-within .form-control {
          border-color: #667eea;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        }
        
        .form-control:focus {
          box-shadow: none;
          border-color: #667eea;
        }
        
        .form-check-input:checked {
          background-color: #667eea;
          border-color: #667eea;
        }
        
        .form-check-input:focus {
          border-color: #667eea;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.25);
        }
        
        /* OTP Input Styling */
        .otp-input {
          letter-spacing: 3px;
          text-align: center;
          font-size: 1.2rem;
          font-weight: bold;
        }
        
        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .min-vh-100 {
            padding: 1rem;
            overflow-y: auto;
          }
          
          .card {
            border-radius: 20px !important;
            max-height: 95vh;
          }
          
          .card-body {
            padding: 2rem !important;
            max-height: 90vh;
          }
          
          .avatar-circle {
            width: 70px;
            height: 70px;
          }
          
          .avatar-icon {
            font-size: 1.75rem;
          }
          
          .login-tabs .nav-link {
            padding: 0.5rem 0.75rem;
            font-size: 0.9rem;
          }
          
          .input-group-lg .form-control,
          .input-group-lg .input-group-text {
            padding: 0.875rem !important;
          }
          
          .btn {
            padding: 0.875rem !important;
          }
        }
        
        @media (max-width: 576px) {
          .min-vh-100 {
            padding: 0.75rem;
            overflow-y: auto;
          }
          
          .card {
            border-radius: 18px !important;
            max-height: 95vh;
          }
          
          .card-body {
            padding: 1.5rem !important;
            max-height: 90vh;
          }
          
          .avatar-circle {
            width: 60px;
            height: 60px;
          }
          
          .avatar-icon {
            font-size: 1.5rem;
          }
          
          .login-tabs .nav-link {
            padding: 0.5rem;
            font-size: 0.85rem;
          }
          
          .login-tabs .nav-link span {
            flex-direction: column;
          }
          
          .login-tabs .nav-link .me-2 {
            margin-right: 0 !important;
            margin-bottom: 0.25rem;
          }
          
          .input-group-lg .form-control,
          .input-group-lg .input-group-text {
            padding: 0.75rem !important;
            font-size: 1rem;
          }
          
          .btn {
            padding: 0.75rem !important;
            font-size: 1rem;
          }
          
          .social-buttons .btn {
            padding: 0.5rem !important;
          }
        }
        
        @media (max-width: 375px) {
          .card-body {
            padding: 1.25rem !important;
          }
          
          .login-tabs .nav-link {
            padding: 0.5rem;
            font-size: 0.8rem;
          }
          
          .input-group-lg .form-control,
          .input-group-lg .input-group-text {
            padding: 0.625rem !important;
            font-size: 0.95rem;
          }
          
          .btn {
            padding: 0.625rem !important;
            font-size: 0.95rem;
          }
          
          h1 {
            font-size: 1.5rem;
          }
          
          p {
            font-size: 0.9rem;
          }
        }
        
        /* Ensure proper touch targets */
        .btn, 
        .form-control,
        .form-check-input {
          min-height: 48px;
        }
        
        /* Smooth transitions */
        * {
          transition: all 0.2s ease;
        }
      `}</style>
    </>
  );
}