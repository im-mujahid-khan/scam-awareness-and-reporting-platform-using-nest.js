'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { FaEnvelope, FaCheckCircle, FaArrowRight, FaArrowLeft, FaKey } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from './../../../../lib/contexts/AuthContext'; // Adjust import path as needed

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [step, setStep] = useState('request'); // 'request' or 'success'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  const [countdown, setCountdown] = useState(5); // For auto-redirect
  const [successMessage, setSuccessMessage] = useState('');
  
  const router = useRouter();
  const { requestPasswordReset } = useAuth(); // Use auth context

  // Auto-redirect timer effect
  useEffect(() => {
    let timer;
    if (step === 'success') {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            router.push('/auth/login');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate email
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use the auth context requestPasswordReset function
      const result = await requestPasswordReset(email);

      if (result.success) {
        // Show success with the message from API
        setSuccessMessage(result.message || "If an account exists with this email, you will receive a password reset link");
        setStep('success');
        setCountdown(5); // Reset countdown
      } else {
        // Even on error, show generic success message for security
        setSuccessMessage("If an account exists with this email, you will receive a password reset link");
        setStep('success');
        setCountdown(5);
      }
      
    } catch (err) {
      console.error('Error requesting password reset:', err);
      // Still show success for security (don't reveal if email exists)
      setSuccessMessage("If an account exists with this email, you will receive a password reset link");
      setStep('success');
      setCountdown(5);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="py-5 min-vh-100 d-flex align-items-center justify-content-center">
      <Row className="justify-content-center w-100">
        <Col xl={5} lg={6} md={8}>
          {/* Card Header with Gradient */}
          <div className="text-center mb-4">
            <div className="logo-container mb-3">
              <div className="avatar-circle mx-auto mb-3">
                {step === 'request' ? (
                  <FaKey className="avatar-icon" />
                ) : (
                  <FaCheckCircle className="avatar-icon" />
                )}
              </div>
            </div>
            <h1 className="fw-bold mb-2" style={{ color: '#2d3748' }}>
              {step === 'request' ? 'Reset Password' : 'Check Your Email'}
            </h1>
            <p className="text-muted mb-0" style={{ fontSize: '1.1rem' }}>
              {step === 'request' 
                ? "We'll send a reset link to your email"
                : successMessage}
            </p>
          </div>

          <Card 
            className="border-0 shadow-lg" 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ transition: 'all 0.3s ease' }}
          >
            <Card.Body className="p-4 p-md-5">
              {step === 'request' ? (
                <>
                  {error && (
                    <Alert 
                      variant="danger" 
                      dismissible 
                      onClose={() => setError('')}
                      className="rounded-pill border-0 mb-4"
                      style={{ background: 'rgba(220, 53, 69, 0.1)', border: '1px solid rgba(220, 53, 69, 0.2)' }}
                    >
                      <div className="d-flex align-items-center">
                        <span className="fw-medium">{error}</span>
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
                          placeholder="Enter your email address"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError('');
                          }}
                          isInvalid={!!error && error.includes('email')}
                          required
                          className="border-start-0 py-3"
                          style={{ 
                            borderRadius: '12px 0 0 12px',
                            border: '1px solid #e9ecef',
                            background: '#f8f9fa'
                          }}
                        />
                      </div>
                      {error && error.includes('email') && (
                        <div className="text-danger mt-2 small fw-medium">
                          {error}
                        </div>
                      )}
                    </Form.Group>

                    {/* Send Reset Link Button */}
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
                          Sending Reset Link...
                        </span>
                      ) : (
                        <span className="d-flex align-items-center justify-content-center">
                          Send Reset Link
                          <FaArrowRight className="ms-2" />
                        </span>
                      )}
                    </Button>

                    {/* Back to Login Link */}
                    <div className="text-center">
                      <Link 
                        href="/auth/login" 
                        className="text-decoration-none d-inline-flex align-items-center fw-medium"
                        style={{ 
                          color: '#667eea',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        <FaArrowLeft className="me-2" />
                        Back to login
                      </Link>
                    </div>
                  </Form>
                </>
              ) : (
                <div className="text-center py-2">
                  {/* Success Icon */}
                  <div className="success-circle mx-auto mb-4">
                    <FaCheckCircle className="success-icon" />
                  </div>
                  
                  {/* Success Message */}
                  <div className="mb-4">
                    <h4 className="fw-bold mb-3" style={{ color: '#2d3748' }}>
                      Request Received
                    </h4>
                    <p className="text-muted mb-3" style={{ lineHeight: '1.6' }}>
                      {successMessage}
                    </p>
                    
                    {/* Auto-redirect Countdown */}
                    <div className="countdown-alert alert alert-info border-0 p-3 mb-3" 
                         style={{ 
                           background: 'rgba(13, 110, 253, 0.05)',
                           borderRadius: '12px'
                         }}>
                      <p className="mb-0 small">
                        <span className="fw-medium">Auto-redirecting to login in {countdown} seconds...</span>
                        <br />
                        <button 
                          onClick={() => router.push('/auth/login')}
                          className="btn btn-link p-0 text-decoration-none small"
                          style={{ color: '#0d6efd' }}
                        >
                          Click here to go now
                        </button>
                      </p>
                    </div>
                    
                    <p className="text-muted mt-3 small">
                      If you don't see the email, check your spam folder.
                      <br />
                      <span className="text-muted fst-italic">The reset link expires in 1 hour.</span>
                    </p>
                  </div>

                  {/* Success Actions */}
                  <div className="d-grid gap-3">
                    <Button
                      variant="primary"
                      onClick={() => router.push('/auth/login')}
                      className="py-3 fw-bold border-0"
                      style={{ 
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        fontSize: '1rem',
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
                      Go to Login
                    </Button>
                    
                    <Button
                      variant="outline-primary"
                      onClick={() => {
                        setStep('request');
                        setEmail('');
                        setSuccessMessage('');
                      }}
                      className="py-3 fw-bold"
                      style={{ 
                        borderRadius: '12px',
                        borderColor: '#667eea',
                        color: '#667eea',
                        transition: 'all 0.3s ease'
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
                      Try another email
                    </Button>
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Footer */}
          <div className="text-center mt-4">
            <p className="small text-muted mb-0">
              Need help?{' '}
              <Link href="/support" className="text-decoration-none">
                Contact our support team
              </Link>
            </p>
          </div>
        </Col>
      </Row>

      <style jsx>{`
        .min-vh-100 {
          min-height: 100vh;
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
        }
        
        .card:hover {
          transform: translateY(-8px);
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
        }
        
        .success-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(25, 135, 84, 0.1) 0%, rgba(25, 135, 84, 0.05) 100%);
          border: 3px solid rgba(25, 135, 84, 0.2);
        }
        
        .success-icon {
          color: #198754;
          font-size: 3rem;
          animation: scaleIn 0.5s ease-out;
        }
        
        @keyframes scaleIn {
          0% {
            transform: scale(0);
            opacity: 0;
          }
          70% {
            transform: scale(1.1);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
        
        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .min-vh-100 {
            padding: 1rem;
          }
          
          .card {
            border-radius: 20px !important;
          }
          
          .card-body {
            padding: 2rem !important;
          }
          
          .avatar-circle {
            width: 70px;
            height: 70px;
          }
          
          .avatar-icon {
            font-size: 1.75rem;
          }
          
          .success-circle {
            width: 80px;
            height: 80px;
          }
          
          .success-icon {
            font-size: 2.5rem;
          }
        }
      `}</style>
    </Container>
  );
}