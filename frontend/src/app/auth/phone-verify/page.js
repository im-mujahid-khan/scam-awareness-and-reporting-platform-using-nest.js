'use client';

import { useState, useEffect, useRef } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { FaPhone, FaArrowLeft, FaArrowRight, FaMobileAlt, FaCheckCircle } from 'react-icons/fa';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

export default function PhoneVerifyPage() {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState('enter-phone'); // 'enter-phone' or 'verify-otp'
  const [timer, setTimer] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isHovered, setIsHovered] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();
  const otpRefs = useRef([]);

  const isSignup = searchParams.get('type') === 'signup';

  useEffect(() => {
    let interval;
    if (step === 'verify-otp' && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleSendOtp = async () => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      return;
    }

    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      setStep('verify-otp');
      setTimer(60);
      setError('');
    }, 1000);
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) {
      setError('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    // Simulate verification
    setTimeout(() => {
      setLoading(false);
      if (isSignup) {
        router.push('/auth/profile-setup');
      } else {
        router.push('/');
      }
    }, 1000);
  };

  const handleResendOtp = () => {
    setTimer(60);
    // Resend OTP logic here
  };

  const formatPhoneNumber = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0,3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0,3)}) ${numbers.slice(3,6)}-${numbers.slice(6,10)}`;
  };

  return (
    <Container className="py-5 min-vh-100 d-flex align-items-center justify-content-center">
      <Row className="justify-content-center w-100">
        <Col xl={5} lg={6} md={8}>
          {/* Card Header with Gradient */}
          <div className="text-center mb-4">
            <div className="logo-container mb-3">
              <div className="avatar-circle mx-auto mb-3">
                <FaMobileAlt className="avatar-icon" />
              </div>
            </div>
            <h1 className="fw-bold mb-2" style={{ color: '#2d3748' }}>
              {step === 'enter-phone' 
                ? 'Phone Verification'
                : 'Enter Verification Code'}
            </h1>
            <p className="text-muted mb-0" style={{ fontSize: '1.1rem' }}>
              {step === 'enter-phone'
                ? isSignup ? 'Verify your phone to sign up' : 'Verify your phone to sign in'
                : `We sent a 6-digit code to ${phone}`}
            </p>
          </div>

          <Card 
            className="border-0 shadow-lg" 
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{ transition: 'all 0.3s ease' }}
          >
            <Card.Body className="p-4 p-md-5">
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

              {step === 'enter-phone' ? (
                <Form>
                  {/* Phone Number Input */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                      Phone Number
                    </Form.Label>
                    <div className="input-group input-group-lg">
                      <span className="input-group-text bg-transparent border-end-0">
                        <FaPhone className="text-muted" />
                      </span>
                      <Form.Control
                        type="tel"
                        placeholder="(123) 456-7890"
                        value={formatPhoneNumber(phone)}
                        onChange={(e) => {
                          const numbers = e.target.value.replace(/\D/g, '');
                          setPhone(numbers);
                        }}
                        className="border-start-0 py-3"
                        style={{ 
                          borderRadius: '12px 0 0 12px',
                          border: '1px solid #e9ecef',
                          background: '#f8f9fa'
                        }}
                      />
                    </div>
                  </Form.Group>

                  {/* Send Verification Code Button */}
                  <Button
                    variant="primary"
                    className="w-100 mb-4 py-3 fw-bold border-0"
                    onClick={handleSendOtp}
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
                        Sending Code...
                      </span>
                    ) : (
                      <span className="d-flex align-items-center justify-content-center">
                        Send Verification Code
                        <FaArrowRight className="ms-2" />
                      </span>
                    )}
                  </Button>

                  {/* Divider */}
                  <div className="position-relative text-center my-4">
                    <hr className="w-100" style={{ borderColor: '#e9ecef' }} />
                    <span 
                      className="position-absolute top-50 start-50 translate-middle bg-white px-3"
                      style={{ color: '#6c757d', fontSize: '0.9rem' }}
                    >
                      Or continue with
                    </span>
                  </div>

                  {/* Back to Email Option */}
                  <div className="text-center">
                    <Link 
                      href={isSignup ? '/auth/signup' : '/auth/login'} 
                      className="text-decoration-none d-inline-flex align-items-center fw-medium"
                      style={{ 
                        color: '#667eea',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      <FaArrowLeft className="me-2" />
                      Use {isSignup ? 'email instead' : 'other methods'}
                    </Link>
                  </div>
                </Form>
              ) : (
                <>
                  {/* OTP Input Fields */}
                  <div className="mb-4">
                    <Form.Label className="fw-medium mb-3" style={{ color: '#4a5568' }}>
                      Enter 6-digit code
                    </Form.Label>
                    <div className="d-flex justify-content-between mb-4">
                      {otp.map((digit, index) => (
                        <Form.Control
                          key={index}
                          ref={(el) => (otpRefs.current[index] = el)}
                          type="text"
                          maxLength="1"
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className="text-center py-3 mx-1"
                          style={{ 
                            fontSize: '1.5rem',
                            borderRadius: '12px',
                            border: '1px solid #e9ecef',
                            background: '#f8f9fa',
                            width: 'calc(16.666% - 8px)',
                            minHeight: '60px',
                            fontWeight: 'bold'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = '#667eea';
                            e.target.style.background = '#ffffff';
                            e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#e9ecef';
                            e.target.style.background = '#f8f9fa';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      ))}
                    </div>
                    
                    {/* Resend Code Timer */}
                    <div className="text-center">
                      {timer > 0 ? (
                        <small className="text-muted d-flex align-items-center justify-content-center">
                          <FaCheckCircle className="me-2 text-success" />
                          Code sent. Resend in <span className="fw-bold ms-1" style={{ color: '#667eea' }}>{timer}s</span>
                        </small>
                      ) : (
                        <Button
                          variant="link"
                          onClick={handleResendOtp}
                          className="p-0 fw-bold"
                          style={{ 
                            color: '#667eea',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          Resend verification code
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Verify OTP Button */}
                  <Button
                    variant="primary"
                    className="w-100 mb-4 py-3 fw-bold border-0"
                    onClick={handleVerifyOtp}
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
                        Verifying...
                      </span>
                    ) : (
                      <span className="d-flex align-items-center justify-content-center">
                        Verify OTP
                        <FaArrowRight className="ms-2" />
                      </span>
                    )}
                  </Button>

                  {/* Change Phone Number */}
                  <div className="text-center">
                    <Button
                      variant="link"
                      onClick={() => setStep('enter-phone')}
                      className="text-decoration-none fw-medium"
                      style={{ 
                        color: '#667eea',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      <FaArrowLeft className="me-2" />
                      Change phone number
                    </Button>
                  </div>
                </>
              )}

              {/* Footer Text */}
              {/* <div className="text-center mt-4 pt-3">
                <p className="small text-muted mb-0">
                  By continuing, you agree to our{' '}
                  <Link href="/terms" className="text-decoration-none">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-decoration-none">
                    Privacy Policy
                  </Link>
                </p>
              </div> */}
            </Card.Body>
          </Card>
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
        
        /* OTP input animations */
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); }
          100% { transform: scale(1); }
        }
        
        .form-control:focus-within {
          animation: pulse 0.3s ease;
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
          
          .input-group-lg .form-control,
          .input-group-lg .input-group-text {
            padding: 0.875rem !important;
          }
          
          .btn {
            padding: 0.875rem !important;
          }
          
          .otp-input {
            min-height: 55px !important;
            font-size: 1.25rem !important;
          }
        }
        
        @media (max-width: 576px) {
          .min-vh-100 {
            padding: 0.75rem;
          }
          
          .card {
            border-radius: 18px !important;
          }
          
          .card-body {
            padding: 1.5rem !important;
          }
          
          .avatar-circle {
            width: 60px;
            height: 60px;
          }
          
          .avatar-icon {
            font-size: 1.5rem;
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
          
          .otp-input {
            min-height: 50px !important;
            font-size: 1.1rem !important;
            width: calc(16.666% - 4px) !important;
            margin: 0 2px !important;
          }
          
          h1 {
            font-size: 1.5rem;
          }
          
          p {
            font-size: 0.9rem;
          }
        }
        
        @media (max-width: 375px) {
          .card-body {
            padding: 1.25rem !important;
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
          
          .otp-input {
            min-height: 45px !important;
            font-size: 1rem !important;
            width: calc(16.666% - 2px) !important;
            margin: 0 1px !important;
          }
        }
        
        /* Ensure proper touch targets */
        .btn, 
        .form-control {
          min-height: 48px;
        }
        
        .otp-input {
          min-height: 60px;
        }
        
        /* Smooth transitions */
        * {
          transition: all 0.2s ease;
        }
      `}</style>
    </Container>
  );
}