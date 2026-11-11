'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { FaLock, FaCheckCircle, FaEye, FaEyeSlash, FaArrowLeft, FaKey } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from './../../../lib/contexts/AuthContext'; // Adjust import path as needed

export default function ResetPasswordPage() {
  const [formData, setFormData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState({
    newPassword: false,
    confirmPassword: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { resetPassword } = useAuth(); // Use auth context

  // Check for token on mount
  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  // Check password strength
  useEffect(() => {
    const calculateStrength = (password) => {
      let strength = 0;
      
      if (password.length >= 8) strength += 25;
      if (/[A-Z]/.test(password)) strength += 25;
      if (/[0-9]/.test(password)) strength += 25;
      if (/[^A-Za-z0-9]/.test(password)) strength += 25;
      
      setPasswordStrength(strength);
    };
    
    calculateStrength(formData.newPassword);
  }, [formData.newPassword]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateForm = () => {
    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Please fill in all fields');
      return false;
    }

    if (formData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');

    try {
      // Use the auth context resetPassword function
      const result = await resetPassword(
        token,
        formData.newPassword,
        formData.confirmPassword
      );

      if (result.success) {
        setSuccess(true);
        // Auto-redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login');
        }, 3000);
      } else {
        setError(result.error || 'Failed to reset password. The token may be invalid or expired.');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      console.error('Reset password error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Password strength color
  const getStrengthColor = () => {
    if (passwordStrength >= 75) return '#28a745';
    if (passwordStrength >= 50) return '#ffc107';
    if (passwordStrength >= 25) return '#fd7e14';
    return '#dc3545';
  };

  if (success) {
    return (
      <Container className="py-5 min-vh-100 d-flex align-items-center justify-content-center">
        <Row className="justify-content-center w-100">
          <Col xl={5} lg={6} md={8}>
            <div className="text-center mb-4">
              <div className="avatar-circle mx-auto mb-3">
                <FaCheckCircle className="avatar-icon" />
              </div>
              <h1 className="fw-bold mb-2" style={{ color: '#2d3748' }}>
                Password Reset Successful!
              </h1>
              <p className="text-muted mb-0" style={{ fontSize: '1.1rem' }}>
                Your password has been successfully reset
              </p>
            </div>

            <Card className="border-0 shadow-lg">
              <Card.Body className="p-5 text-center">
                <div className="success-circle mx-auto mb-4">
                  <FaCheckCircle className="success-icon" />
                </div>
                
                <h4 className="fw-bold mb-3" style={{ color: '#2d3748' }}>
                  All Set!
                </h4>
                
                <p className="text-muted mb-4">
                  You can now log in with your new password.
                  <br />
                  Redirecting to login page in 3 seconds...
                </p>
                
                <div className="d-grid gap-3">
                  <Button
                    variant="primary"
                    onClick={() => router.push('/auth/login')}
                    className="py-3 fw-bold border-0"
                    style={{ 
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      fontSize: '1rem'
                    }}
                  >
                    Go to Login Now
                  </Button>
                  
                  <Button
                    variant="outline-primary"
                    onClick={() => router.push('/')}
                    className="py-3 fw-bold"
                    style={{ 
                      borderRadius: '12px',
                      borderColor: '#667eea',
                      color: '#667eea'
                    }}
                  >
                    Go to Homepage
                  </Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
        
        <style jsx>{`
          /* Use existing styles from forgot password page */
        `}</style>
      </Container>
    );
  }

  return (
    <Container className="py-5 min-vh-100 d-flex align-items-center justify-content-center">
      <Row className="justify-content-center w-100">
        <Col xl={5} lg={6} md={8}>
          {/* Card Header with Gradient */}
          <div className="text-center mb-4">
            <div className="logo-container mb-3">
              <div className="avatar-circle mx-auto mb-3">
                <FaKey className="avatar-icon" />
              </div>
            </div>
            <h1 className="fw-bold mb-2" style={{ color: '#2d3748' }}>
              Set New Password
            </h1>
            <p className="text-muted mb-0" style={{ fontSize: '1.1rem' }}>
              Create a new secure password for your account
            </p>
          </div>

          <Card 
            className="border-0 shadow-lg" 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ transition: 'all 0.3s ease' }}
          >
            <Card.Body className="p-4 p-md-5">
              {error && !token && (
                <Alert 
                  variant="danger" 
                  className="rounded-pill border-0 mb-4 text-center"
                  style={{ background: 'rgba(220, 53, 69, 0.1)', border: '1px solid rgba(220, 53, 69, 0.2)' }}
                >
                  <div className="d-flex align-items-center justify-content-center">
                    <span className="fw-medium">{error}</span>
                  </div>
                  <div className="mt-2">
                    <Link 
                      href="/auth/forgot-password" 
                      className="btn btn-sm btn-outline-danger"
                    >
                      Request New Reset Link
                    </Link>
                  </div>
                </Alert>
              )}

              {token ? (
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
                    {/* New Password Input */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                        New Password
                      </Form.Label>
                      <InputGroup className="input-group-lg">
                        <span className="input-group-text bg-transparent border-end-0">
                          <FaLock className="text-muted" />
                        </span>
                        <Form.Control
                          type={showPassword.newPassword ? "text" : "password"}
                          name="newPassword"
                          placeholder="Enter new password"
                          value={formData.newPassword}
                          onChange={handleChange}
                          required
                          className="border-start-0 py-3"
                          style={{ 
                            borderRadius: '0',
                            border: '1px solid #e9ecef',
                            background: '#f8f9fa'
                          }}
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => togglePasswordVisibility('newPassword')}
                          className="border-start-0 py-3"
                          style={{ 
                            borderRadius: '0 12px 12px 0',
                            borderColor: '#e9ecef',
                            background: '#f8f9fa'
                          }}
                        >
                          {showPassword.newPassword ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                      </InputGroup>
                      
                      {/* Password Strength Indicator */}
                      {formData.newPassword && (
                        <div className="mt-2">
                          <div className="d-flex justify-content-between mb-1">
                            <small className="fw-medium">Password Strength:</small>
                            <small className="fw-bold" style={{ color: getStrengthColor() }}>
                              {passwordStrength >= 75 ? 'Strong' : 
                               passwordStrength >= 50 ? 'Medium' : 
                               passwordStrength >= 25 ? 'Weak' : 'Very Weak'}
                            </small>
                          </div>
                          <div className="progress" style={{ height: '6px' }}>
                            <div 
                              className="progress-bar" 
                              role="progressbar" 
                              style={{ 
                                width: `${passwordStrength}%`,
                                backgroundColor: getStrengthColor()
                              }}
                              aria-valuenow={passwordStrength}
                              aria-valuemin="0"
                              aria-valuemax="100"
                            />
                          </div>
                          <small className="text-muted d-block mt-2">
                            Must contain at least 8 characters with uppercase, lowercase, number, and special character
                          </small>
                        </div>
                      )}
                    </Form.Group>

                    {/* Confirm Password Input */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                        Confirm New Password
                      </Form.Label>
                      <InputGroup className="input-group-lg">
                        <span className="input-group-text bg-transparent border-end-0">
                          <FaLock className="text-muted" />
                        </span>
                        <Form.Control
                          type={showPassword.confirmPassword ? "text" : "password"}
                          name="confirmPassword"
                          placeholder="Confirm new password"
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          required
                          className="border-start-0 py-3"
                          style={{ 
                            borderRadius: '0',
                            border: '1px solid #e9ecef',
                            background: '#f8f9fa'
                          }}
                        />
                        <Button
                          variant="outline-secondary"
                          onClick={() => togglePasswordVisibility('confirmPassword')}
                          className="border-start-0 py-3"
                          style={{ 
                            borderRadius: '0 12px 12px 0',
                            borderColor: '#e9ecef',
                            background: '#f8f9fa'
                          }}
                        >
                          {showPassword.confirmPassword ? <FaEyeSlash /> : <FaEye />}
                        </Button>
                      </InputGroup>
                    </Form.Group>

                    {/* Reset Password Button */}
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
                          Resetting Password...
                        </span>
                      ) : (
                        <span className="d-flex align-items-center justify-content-center">
                          Reset Password
                          <FaCheckCircle className="ms-2" />
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
                <div className="text-center py-4">
                  <p className="text-muted">
                    Please check your email for a valid reset link or request a new one.
                  </p>
                  <Button
                    variant="primary"
                    onClick={() => router.push('/auth/forgot-password')}
                    className="py-3 fw-bold border-0"
                    style={{ 
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      fontSize: '1rem'
                    }}
                  >
                    Request New Reset Link
                  </Button>
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