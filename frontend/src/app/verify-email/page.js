'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { 
  FaCheckCircle, FaTimesCircle, FaEnvelopeOpenText, FaArrowRight, 
  FaSync, FaEnvelope, FaExclamationTriangle, FaInfoCircle, FaClock, FaSignInAlt
} from 'react-icons/fa';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../lib/contexts/AuthContext';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState('');
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [showResendModal, setShowResendModal] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  
  const { verifyEmail, sendVerificationEmail, user } = useAuth();

  useEffect(() => {
    // Get token from URL query parameter
    const tokenParam = searchParams.get('token');
    const statusParam = searchParams.get('status');
    const emailParam = searchParams.get('email');
    
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
    
    if (tokenParam) {
      setToken(tokenParam);
      handleVerifyEmail(tokenParam);
    } else if (statusParam === 'pending' && emailParam) {
      // Show pending verification page (user just signed up)
      setVerifying(false);
      setVerified(false);
      setError('');
    } else {
      setVerifying(false);
      setVerified(false);
      setError('No verification token provided. Please check your email for the verification link.');
    }
  }, [searchParams]);

  const handleVerifyEmail = async (verificationToken) => {
    setVerifying(true);
    setError('');

    try {
      const result = await verifyEmail(verificationToken);
      
      if (result.success) {
        setVerified(true);
        setError('');
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login?verified=true');
        }, 3000);
      } else {
        throw new Error(result.error || 'Verification failed');
      }
    } catch (err) {
      console.error('Email verification error:', err);
      setVerified(false);
      
      let errorMessage = 'Email verification failed. ';
      
      if (err.message.includes('expired')) {
        errorMessage += 'The verification link has expired. Please request a new one.';
      } else if (err.message.includes('invalid')) {
        errorMessage += 'The verification link is invalid. Please request a new one.';
      } else if (err.message.includes('already verified')) {
        errorMessage += 'This email has already been verified. You can login now.';
        setVerified(true);
      } else {
        errorMessage += err.message || 'Please try again.';
      }
      
      setError(errorMessage);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendVerification = async () => {
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
        setError(result.error || 'Failed to resend verification email');
      }
    } catch (err) {
      setError('Failed to resend verification email');
    } finally {
      setResendLoading(false);
    }
  };

  const handleRetry = () => {
    if (token) {
      handleVerifyEmail(token);
    }
  };

  const handleGoToLogin = () => {
    router.push('/auth/login');
  };

  return (
    <Container className="py-5 min-vh-100 d-flex align-items-center justify-content-center">
      <Row className="justify-content-center w-100">
        <Col xl={5} lg={6} md={8}>
          <Card className="border-0 shadow-lg" style={{ borderRadius: '24px' }}>
            <Card.Body className="p-5 text-center">
              {verifying ? (
                <>
                  {/* Verifying State */}
                  <div 
                    className="mx-auto mb-4 rounded-circle d-flex align-items-center justify-content-center"
                    style={{ 
                      width: '100px', 
                      height: '100px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}
                  >
                    <Spinner animation="border" variant="light" style={{ width: '50px', height: '50px' }} />
                  </div>
                  
                  <h2 className="fw-bold mb-3">Verifying Your Email</h2>
                  <p className="text-muted mb-4">
                    Please wait while we verify your email address...
                  </p>
                </>
              ) : verified ? (
                <>
                  {/* Success State - Redirecting to Login */}
                  <div 
                    className="mx-auto mb-4 rounded-circle d-flex align-items-center justify-content-center"
                    style={{ 
                      width: '100px', 
                      height: '100px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                    }}
                  >
                    <FaCheckCircle className="text-white" size={50} />
                  </div>
                  
                  <h2 className="fw-bold mb-3 text-success">Email Verified Successfully!</h2>
                  <p className="text-muted mb-4">
                    Your email has been successfully verified. You will be redirected to login page.
                  </p>
                  
                  <Alert variant="success" className="border-0 mb-4" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                    <FaCheckCircle className="me-2" />
                    <strong>Redirecting to login page in 3 seconds...</strong>
                  </Alert>
                  
                  <Button
                    variant="primary"
                    size="lg"
                    className="px-5 py-3 border-0 mb-2"
                    onClick={handleGoToLogin}
                    style={{ 
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}
                  >
                    <FaSignInAlt className="me-2" />
                    Go to Login Now
                  </Button>
                  
                  <div className="mt-3">
                    <small className="text-muted">
                      Not redirecting? <Link href="/auth/login" className="text-decoration-none fw-medium">Click here</Link>
                    </small>
                  </div>
                </>
              ) : email && !token ? (
                <>
                  {/* Pending Verification State (After Signup) */}
                  <div 
                    className="mx-auto mb-4 rounded-circle d-flex align-items-center justify-content-center"
                    style={{ 
                      width: '100px', 
                      height: '100px',
                      background: 'linear-gradient(135deg, #764ba2 0%, #764ba2 100%)'
                    }}
                  >
                    <FaEnvelopeOpenText className="text-white" size={50} />
                  </div>
                  
                  <h2 className="fw-bold mb-3">Check Your Email</h2>
                  <p className="text-muted mb-4">
                    We've sent a verification link to:
                  </p>
                  
                  <Alert variant="info" className="border-0 mb-4" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
                    <div className="d-flex align-items-center justify-content-center">
                      <FaEnvelope className="me-2" />
                      <strong>{email}</strong>
                    </div>
                  </Alert>
                  
                  <div className="text-start mb-4">
                    <h6 className="fw-semibold mb-3">What to do next:</h6>
                    <ul className="list-unstyled mb-0">
                      <li className="mb-2 d-flex align-items-start">
                        <FaCheckCircle className="text-success mt-1 me-2" />
                        <span>Check your email inbox (and spam folder)</span>
                      </li>
                      <li className="mb-2 d-flex align-items-start">
                        <FaCheckCircle className="text-success mt-1 me-2" />
                        <span>Click the verification button in the email</span>
                      </li>
                      <li className="mb-2 d-flex align-items-start">
                        <FaCheckCircle className="text-success mt-1 me-2" />
                        <span>You will be redirected to login page</span>
                      </li>
                      <li className="d-flex align-items-start">
                        <FaClock className="text-warning mt-1 me-2" />
                        <span>Link expires in 24 hours</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="d-grid gap-2">
                    {/* <Button
                      variant="warning"
                      size="lg"
                      className="px-5 py-3 border-0"
                      onClick={() => setShowResendModal(true)}
                      style={{ 
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #764ba2 0%, #764ba2 100%)'
                      }}
                    >
                      <FaEnvelope className="me-2" />
                      Resend Verification Email
                    </Button> */}
                    
                    <Button
                      variant="outline-primary"
                      size="lg"
                      className="px-5 py-3"
                      onClick={handleGoToLogin}
                      style={{ borderRadius: '12px' }}
                    >
                      <FaSignInAlt className="me-2" />
                      Go to Login
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  {/* Error State */}
                  <div 
                    className="mx-auto mb-4 rounded-circle d-flex align-items-center justify-content-center"
                    style={{ 
                      width: '100px', 
                      height: '100px',
                      background: 'linear-gradient(135deg, #764ba2 0%, #764ba2 100%)'
                    }}
                  >
                    <FaTimesCircle className="text-white" size={50} />
                  </div>
                  
                  <h2 className="fw-bold mb-3 text-danger">Verification Failed</h2>
                  
                  <Alert variant="danger" className="border-0 mb-4" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                    <p className="mb-0">{error}</p>
                  </Alert>
                  
                  <div className="d-grid gap-2">
                    {token && (
                      <Button
                        variant="outline-primary"
                        size="lg"
                        className="px-5 py-3"
                        onClick={handleRetry}
                        style={{ borderRadius: '12px' }}
                      >
                        <FaSync className="me-2" />
                        Try Again
                      </Button>
                    )}
                    
                    <Button
                      variant="primary"
                      size="lg"
                      className="px-5 py-3 border-0"
                      onClick={handleGoToLogin}
                      style={{ 
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      }}
                    >
                      <FaSignInAlt className="me-2" />
                      Go to Login
                    </Button>
                    
                    <Link href="/auth/signup" className="text-center mt-2 text-decoration-none">
                      <small className="text-muted">
                        Don't have an account? <span className="fw-bold" style={{ color: '#667eea' }}>Sign up</span>
                      </small>
                    </Link>
                  </div>
                </>
              )}
            </Card.Body>
          </Card>

          {/* Help Section */}
          <div className="text-center mt-4">
            <p className="small text-muted mb-0">
              Need help? <Link href="/support" className="text-decoration-none fw-medium" style={{ color: '#667eea' }}>Contact Support</Link>
            </p>
          </div>
        </Col>
      </Row>
      
      {/* Resend Verification Modal */}
      <div className={`modal ${showResendModal ? 'show d-block' : ''}`} tabIndex="-1" role="dialog" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog modal-dialog-centered" role="document">
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '24px' }}>
            <div className="modal-header border-0">
              <h5 className="modal-title fw-bold">Resend Verification Email</h5>
              <button 
                type="button" 
                className="btn-close" 
                onClick={() => setShowResendModal(false)}
                aria-label="Close"
              ></button>
            </div>
            <div className="modal-body">
              <div className="text-center">
                <div className="mb-4">
                  <div 
                    className="mx-auto mb-3 rounded-circle d-flex align-items-center justify-content-center"
                    style={{ 
                      width: '80px', 
                      height: '80px',
                      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    }}
                  >
                    <FaEnvelope className="text-white" size={40} />
                  </div>
                  
                  <h5 className="fw-bold mb-3">Resend Verification</h5>
                  
                  {resendSuccess ? (
                    <Alert variant="success" className="border-0">
                      <FaCheckCircle className="me-2" />
                      <strong>Verification email sent!</strong>
                      <p className="mb-0 mt-2 small">Check your email inbox and spam folder.</p>
                    </Alert>
                  ) : (
                    <>
                      <p className="text-muted mb-4">
                        We'll send a new verification link to your email address.
                      </p>
                      
                      <Alert variant="info" className="border-0 text-start mb-4">
                        <FaInfoCircle className="me-2" />
                        <small>
                          If you don't receive the email within 5 minutes, check your spam folder or contact support.
                        </small>
                      </Alert>
                      
                      <div className="d-grid gap-2">
                        <Button
                          variant="warning"
                          size="lg"
                          className="py-3 border-0"
                          onClick={handleResendVerification}
                          disabled={resendLoading}
                          style={{ 
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                          }}
                        >
                          {resendLoading ? (
                            <span className="d-flex align-items-center justify-content-center">
                              <span className="spinner-border spinner-border-sm me-2"></span>
                              Sending...
                            </span>
                          ) : (
                            <span className="d-flex align-items-center justify-content-center">
                              <FaEnvelope className="me-2" />
                              Resend Verification Email
                            </span>
                          )}
                        </Button>
                        
                        <Button
                          variant="outline-secondary"
                          size="lg"
                          className="py-3"
                          onClick={() => setShowResendModal(false)}
                          style={{ borderRadius: '12px' }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        .min-vh-100 {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        
        @media (max-width: 768px) {
          .card-body {
            padding: 2rem !important;
          }
        }
      `}</style>
    </Container>
  );
}