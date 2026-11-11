'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, ProgressBar, Modal } from 'react-bootstrap';
import Select from 'react-select';
import { Country, State, City } from 'country-state-city';
import { 
  FaEnvelope, FaCheck, FaTimes, FaLock, FaUserPlus, FaArrowRight, 
  FaGoogle, FaFacebook, FaTwitter, FaUser, FaPhone, 
  FaMapMarkerAlt, FaGlobe, FaBuilding, FaCity,
  FaSpinner, FaExternalLinkAlt, FaExclamationCircle, FaSync,
  FaInfoCircle, FaShieldAlt, FaCheckCircle
} from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/contexts/AuthContext';
import { PhoneInput } from 'react-international-phone';

import 'react-international-phone/style.css';

export default function SignupPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    firstName: '',
    lastName: '',
    phone: '',
    country: '',
    region: '',
    city: '',
    agreeTerms: false,
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [passwordRules, setPasswordRules] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false,
  });
  const [step, setStep] = useState(1);
  const totalSteps = 2;
  
  // Location states
  const [countries, setCountries] = useState([]);
  const [regions, setRegions] = useState([]);
  const [cities, setCities] = useState([]);
  
  // Google OAuth States
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState('');
  const [googleStatus, setGoogleStatus] = useState('idle');
  const [showGoogleRedirectModal, setShowGoogleRedirectModal] = useState(false);
  
  const router = useRouter();
  const { signup, api } = useAuth();

  // Load all countries on component mount
  useEffect(() => {
    const allCountries = Country.getAllCountries().map(country => ({
      value: country.isoCode,
      label: country.name,
      phoneCode: country.phonecode,
      flag: country.flag
    }));
    
    setCountries(allCountries.sort((a, b) => a.label.localeCompare(b.label)));
  }, []);

  // Load regions when country changes
  useEffect(() => {
    if (formData.country) {
      const countryStates = State.getStatesOfCountry(formData.country).map(state => ({
        value: state.isoCode,
        label: state.name
      }));
      setRegions(countryStates.sort((a, b) => a.label.localeCompare(b.label)));
      
      // Reset region and city when country changes
      setFormData(prev => ({ ...prev, region: '', city: '' }));
      setCities([]);
    } else {
      setRegions([]);
      setCities([]);
    }
  }, [formData.country]);

  // Load cities when region changes
  useEffect(() => {
    if (formData.country && formData.region) {
      const stateCities = City.getCitiesOfState(formData.country, formData.region).map(city => ({
        value: city.name,
        label: city.name
      }));
      setCities(stateCities.sort((a, b) => a.label.localeCompare(b.label)));
      
      // Reset city when region changes
      setFormData(prev => ({ ...prev, city: '' }));
    } else {
      setCities([]);
    }
  }, [formData.country, formData.region]);

  // Check Google OAuth status on component mount
  useEffect(() => {
    checkGoogleOAuthStatus();
  }, []);

  const checkGoogleOAuthStatus = async () => {
    try {
      const response = await api.get('/api/v1/auth/config/status');
      if (response.data.googleOAuth === 'READY') {
        console.log(' Google OAuth is ready for signup');
      } else {
        console.log('Google OAuth is not configured');
      }
    } catch (error) {
      console.error('Failed to check Google OAuth status:', error);
    }
  };

  // Google OAuth Handler for Signup
  const handleGoogleSignup = () => {
    setGoogleLoading(true);
    setGoogleError('');
    setGoogleStatus('loading');
    
    // Store that this is for signup
    if (typeof window !== 'undefined') {
      localStorage.setItem('signupFlow', 'true');
      localStorage.setItem('preOAuthPath', '/auth/signup');
    }
    
    // Redirect to Google OAuth
    window.location.href = 'http://localhost:3001/api/v1/auth/google';
  };

  // Social login handlers
  const handleSocialSignup = (provider) => {
    if (provider === 'google') {
      handleGoogleSignup();
    } else if (provider === 'facebook') {
      console.log('Facebook OAuth - Coming soon');
    } else if (provider === 'twitter') {
      console.log('Twitter OAuth - Coming soon');
    }
  };

  // Use useEffect to update password strength when password changes
  useEffect(() => {
    if (formData.password) {
      const rules = {
        length: formData.password.length >= 8,
        uppercase: /[A-Z]/.test(formData.password),
        lowercase: /[a-z]/.test(formData.password),
        number: /\d/.test(formData.password),
        special: /[!@#$%^&*]/.test(formData.password),
      };
      
      const strength = Object.values(rules).filter(Boolean).length * 20;
      setPasswordStrength(strength);
      setPasswordRules(rules);
    } else {
      setPasswordStrength(0);
      setPasswordRules({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false,
      });
    }
  }, [formData.password]);

  const getStrengthColor = () => {
    if (passwordStrength <= 20) return '#dc3545';
    if (passwordStrength <= 40) return '#fd7e14';
    if (passwordStrength <= 60) return '#ffc107';
    if (passwordStrength <= 80) return '#20c997';
    return '#198754';
  };

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    
    if (!formData.displayName) newErrors.displayName = 'Display name is required';
    else if (formData.displayName.length < 2) newErrors.displayName = 'Display name must be at least 2 characters';
    
    if (!formData.password) newErrors.password = 'Password is required';
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    return newErrors;
  };

  const nextStep = () => {
    const stepErrors = validateStep1();
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setStep(2);
    setErrors({});
  };

  const prevStep = () => {
    setStep(1);
    setErrors({});
  };

// In your signup page, update the handleSubmit function:
const handleSubmit = async (e) => {
  e.preventDefault();
  
  const newErrors = {};
  
  if (!formData.country) {
    newErrors.country = 'Country is required';
  }
  
  if (!formData.region) {
    newErrors.region = 'Region/State is required';
  }
  
  if (!formData.city) {
    newErrors.city = 'City is required';
  }
  
  if (!formData.agreeTerms) {
    newErrors.agreeTerms = 'You must agree to terms';
  }
  
  if (Object.keys(newErrors).length > 0) {
    setErrors(newErrors);
    return;
  }

  setLoading(true);
  
  // Get country name from ISO code
  const selectedCountry = countries.find(c => c.value === formData.country);
  const selectedRegion = regions.find(r => r.value === formData.region);
  
  const userData = {
    email: formData.email.trim().toLowerCase(),
    password: formData.password,
    displayName: formData.displayName.trim(),
    country: selectedCountry?.label || formData.country,
    region: selectedRegion?.label || formData.region,
    city: formData.city.trim(),
    ...(formData.firstName?.trim() && { firstName: formData.firstName.trim() }),
    ...(formData.lastName?.trim() && { lastName: formData.lastName.trim() }),
    ...(formData.phone?.trim() && { phone: formData.phone.trim() }),
  };

  console.log('Submitting user data:', userData);

  try {
    const result = await signup(userData);

    if (result.success) {
      if (result.redirectTo) {
        // Redirect to verification page with email
        router.push(`/verify-email?status=pending&email=${encodeURIComponent(formData.email)}`);
      } else {
        router.push('/auth/login');
      }
    } else {
      setErrors({ submit: result.error });
    }
  } catch (err) {
    setErrors({ submit: 'An error occurred during signup' });
  } finally {
    setLoading(false);
  }
};

  // Custom styles for react-select to match your design
  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: '56px',
      borderRadius: '12px',
      borderColor: state.isFocused ? '#667eea' : '#e9ecef',
      boxShadow: state.isFocused ? '0 0 0 3px rgba(102, 126, 234, 0.1)' : 'none',
      backgroundColor: '#f8f9fa',
      fontSize: '1rem',
      '&:hover': {
        borderColor: state.isFocused ? '#667eea' : '#ced4da',
      },
    }),
    placeholder: (base) => ({
      ...base,
      color: '#6c757d',
      fontSize: '1rem',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected ? '#667eea' : state.isFocused ? 'rgba(102, 126, 234, 0.1)' : 'white',
      color: state.isSelected ? 'white' : '#212529',
      fontSize: '0.95rem',
      padding: '10px 16px',
      '&:active': {
        backgroundColor: '#667eea',
        color: 'white',
      },
    }),
    singleValue: (base) => ({
      ...base,
      color: '#212529',
      fontSize: '1rem',
    }),
    menu: (base) => ({
      ...base,
      borderRadius: '12px',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.1)',
      zIndex: 9999,
    }),
    dropdownIndicator: (base) => ({
      ...base,
      color: '#6c757d',
      '&:hover': {
        color: '#667eea',
      },
    }),
    indicatorSeparator: (base) => ({
      ...base,
      backgroundColor: '#e9ecef',
    }),
  };

  // Custom styles for PhoneInput to match your design
  const phoneInputStyles = {
    '--react-international-phone-border-color': '#e9ecef',
    '--react-international-phone-border-radius': '12px',
    '--react-international-phone-height': '56px',
    '--react-international-phone-font-size': '1rem',
    '--react-international-phone-background-color': '#f8f9fa',
    '--react-international-phone-country-selector-background-color': '#f8f9fa',
    '--react-international-phone-country-selector-border-color': '#e9ecef',
    '--react-international-phone-dropdown-background-color': '#ffffff',
    '--react-international-phone-dropdown-box-shadow': '0 10px 40px rgba(0, 0, 0, 0.1)',
    '--react-international-phone-flag-height': '20px',
    '--react-international-phone-flag-width': '30px',
  };

  return (
    <>
      <Container className="py-5 min-vh-100 d-flex align-items-center justify-content-center">
        <Row className="justify-content-center w-100">
          <Col xl={6} lg={8} md={10}>
            {/* Header Section */}
            <div className="text-center mb-4">
              <div className="logo-container mb-3">
                <div className="avatar-circle mx-auto mb-3">
                  <FaUserPlus className="avatar-icon" />
                </div>
              </div>
              <h1 className="fw-bold mb-2" style={{ color: '#2d3748' }}>Join Our Community</h1>
              <p className="text-muted mb-0" style={{ fontSize: '1rem' }}>Create your account to stay protected</p>
              
              {/* Email Verification Info */}
              <Alert variant="info" className="d-inline-flex align-items-center p-2 px-3 rounded-pill mt-3">
                <FaInfoCircle className="me-2" />
                <span className="fw-medium">You'll need to verify your email after signup</span>
              </Alert>

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
                    <span className="fw-medium">Google authentication successful!</span>
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

              {/* Progress Steps */}
              <div className="d-flex justify-content-center align-items-center mb-4">
                {[...Array(totalSteps)].map((_, index) => (
                  <div key={index} className="d-flex align-items-center">
                    <div 
                      className={`rounded-circle d-flex align-items-center justify-content-center ${step > index ? 'bg-primary' : step === index + 1 ? 'bg-primary' : 'bg-light'}`}
                      style={{
                        width: '40px',
                        height: '40px',
                        color: step > index || step === index + 1 ? 'white' : '#6c757d',
                        border: step === index + 1 ? '3px solid #667eea' : 'none',
                        fontWeight: 'bold'
                      }}
                    >
                      {index + 1}
                    </div>
                    {index < totalSteps - 1 && (
                      <div 
                        className={`mx-2 ${step > index + 1 ? 'bg-primary' : 'bg-light'}`}
                        style={{ height: '3px', width: '60px' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <Card 
              className="border-0 shadow-lg" 
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              style={{ transition: 'all 0.3s ease' }}
            >
              <Card.Body className="p-4 p-md-5">
                {/* Google OAuth Button (Top - Only show in step 1) */}
                {step === 1 && (
                  <div className="mb-4">
                    <Button
                      variant="light"
                      className="w-100 py-3 fw-medium border-0 d-flex align-items-center justify-content-center"
                      onClick={handleGoogleSignup}
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
                          <span>Sign up with Google</span>
                        </>
                      )}
                    </Button>
                    
                    <div className="text-center mt-2">
                      <small className="text-muted">
                        <FaShieldAlt className="text-success me-1" />
                        Quick signup with secure OAuth 2.0
                      </small>
                    </div>

                    {/* Divider */}
                    <div className="position-relative text-center my-4">
                      <hr className="w-100" style={{ borderColor: '#e9ecef' }} />
                      <span 
                        className="position-absolute top-50 start-50 translate-middle bg-white px-3"
                        style={{ color: '#6c757d', fontSize: '0.9rem' }}
                      >
                        Or create account with email
                      </span>
                    </div>
                  </div>
                )}

                {errors.submit && (
                  <Alert 
                    variant="danger" 
                    dismissible 
                    onClose={() => setErrors(prev => ({ ...prev, submit: null }))}
                    className="rounded-pill border-0 mb-4"
                    style={{ background: 'rgba(220, 53, 69, 0.1)', border: '1px solid rgba(220, 53, 69, 0.2)' }}
                  >
                    <div className="d-flex align-items-center">
                      <span className="fw-medium">{errors.submit}</span>
                    </div>
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  {step === 1 && (
                    <>
                      {/* Display Name Input */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Display Name *
                        </Form.Label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-transparent border-end-0">
                            <FaUser className="text-muted" />
                          </span>
                          <Form.Control
                            type="text"
                            placeholder="How should we call you?"
                            value={formData.displayName}
                            onChange={(e) => setFormData({...formData, displayName: e.target.value})}
                            isInvalid={!!errors.displayName}
                            required
                            className="border-start-0 py-3"
                            style={{ 
                              borderRadius: '12px 0 0 12px',
                              border: '1px solid #e9ecef',
                              background: '#f8f9fa'
                            }}
                          />
                        </div>
                        <Form.Text className="text-muted small">
                          This name will be visible to other users
                        </Form.Text>
                        {errors.displayName && (
                          <div className="text-danger mt-2 small fw-medium">
                            {errors.displayName}
                          </div>
                        )}
                      </Form.Group>

                      {/* Email Input */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Email Address *
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
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Password *
                        </Form.Label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-transparent border-end-0">
                            <FaLock className="text-muted" />
                          </span>
                          <Form.Control
                            type="password"
                            placeholder="Create a strong password"
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
                        </div>
                        
                        {formData.password && (
                          <div className="mt-3">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <small className="fw-medium" style={{ color: '#4a5568' }}>Password Strength</small>
                              <small className="fw-bold" style={{ color: getStrengthColor() }}>
                                {passwordStrength <= 20 && 'Weak'}
                                {passwordStrength > 20 && passwordStrength <= 40 && 'Fair'}
                                {passwordStrength > 40 && passwordStrength <= 60 && 'Good'}
                                {passwordStrength > 60 && passwordStrength <= 80 && 'Strong'}
                                {passwordStrength > 80 && 'Very Strong'}
                              </small>
                            </div>
                            
                            <ProgressBar 
                              now={passwordStrength} 
                              className="mb-3 rounded-pill"
                              style={{ 
                                height: '6px',
                                backgroundColor: '#e9ecef'
                              }}
                            >
                              <div 
                                className="progress-bar"
                                style={{ 
                                  backgroundColor: getStrengthColor(),
                                  borderRadius: '3px',
                                  width: `${passwordStrength}%`,
                                  transition: 'width 0.3s ease'
                                }}
                              />
                            </ProgressBar>
                            
                            <div className="row g-2">
                              {Object.entries(passwordRules).map(([rule, isValid]) => (
                                <div key={rule} className="col-6">
                                  <div className={`d-flex align-items-center ${isValid ? 'text-success' : 'text-muted'}`}>
                                    <div className={`me-2 rounded-circle d-flex align-items-center justify-content-center ${isValid ? 'bg-success' : 'bg-light'}`} 
                                         style={{ width: '20px', height: '20px' }}>
                                      {isValid ? (
                                        <FaCheck size={10} className="text-white" />
                                      ) : (
                                        <FaTimes size={10} className="text-muted" />
                                      )}
                                    </div>
                                    <small className="fw-medium">
                                      {rule === 'length' && '8+ characters'}
                                      {rule === 'uppercase' && 'Uppercase'}
                                      {rule === 'lowercase' && 'Lowercase'}
                                      {rule === 'number' && 'Number'}
                                      {rule === 'special' && 'Special'}
                                    </small>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {errors.password && !formData.password && (
                          <div className="text-danger mt-2 small fw-medium">
                            {errors.password}
                          </div>
                        )}
                      </Form.Group>

                      {/* Confirm Password Input */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Confirm Password *
                        </Form.Label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-transparent border-end-0">
                            <FaLock className="text-muted" />
                          </span>
                          <Form.Control
                            type="password"
                            placeholder="Confirm your password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                            isInvalid={!!errors.confirmPassword}
                            required
                            className="border-start-0 py-3"
                            style={{ 
                              borderRadius: '12px 0 0 12px',
                              border: '1px solid #e9ecef',
                              background: '#f8f9fa'
                            }}
                          />
                        </div>
                        {errors.confirmPassword && (
                          <div className="text-danger mt-2 small fw-medium">
                            {errors.confirmPassword}
                          </div>
                        )}
                      </Form.Group>

                      {/* Google Signup Benefits */}
                      <Alert variant="info" className="border-0 mb-4" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
                        <FaInfoCircle className="me-2" />
                        <div className="fw-medium">Why sign up with Google?</div>
                        <ul className="mb-0 mt-2 small">
                          <li>No password to remember</li>
                          <li>Automatic profile picture import</li>
                          <li>Faster signup process</li>
                          <li>Enhanced security with Google's protection</li>
                        </ul>
                      </Alert>

                      {/* Next Button */}
                      <Button 
                        type="button"
                        variant="primary" 
                        className="w-100 mb-4 py-3 fw-bold border-0"
                        onClick={nextStep}
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
                        Continue
                        <FaArrowRight className="ms-2" />
                      </Button>
                    </>
                  )}

                  {step === 2 && (
                    <>
                      {/* First Name Input */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          First Name
                        </Form.Label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-transparent border-end-0">
                            <FaUser className="text-muted" />
                          </span>
                          <Form.Control
                            type="text"
                            placeholder="Your first name"
                            value={formData.firstName}
                            onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                            className="border-start-0 py-3"
                            style={{ 
                              borderRadius: '12px 0 0 12px',
                              border: '1px solid #e9ecef',
                              background: '#f8f9fa'
                            }}
                          />
                        </div>
                        <Form.Text className="text-muted small">
                          Optional
                        </Form.Text>
                      </Form.Group>

                      {/* Last Name Input */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Last Name
                        </Form.Label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-transparent border-end-0">
                            <FaUser className="text-muted" />
                          </span>
                          <Form.Control
                            type="text"
                            placeholder="Your last name"
                            value={formData.lastName}
                            onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                            className="border-start-0 py-3"
                            style={{ 
                              borderRadius: '12px 0 0 12px',
                              border: '1px solid #e9ecef',
                              background: '#f8f9fa'
                            }}
                          />
                        </div>
                        <Form.Text className="text-muted small">
                          Optional
                        </Form.Text>
                      </Form.Group>

                      {/* Phone Input with International Phone Component */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Phone Number
                        </Form.Label>
                        <div className="phone-input-wrapper">
                          <PhoneInput
                            defaultCountry="us"
                            value={formData.phone}
                            onChange={(phone) => setFormData({...formData, phone})}
                            placeholder="Enter phone number"
                            style={phoneInputStyles}
                            className="custom-phone-input"
                          />
                        </div>
                        <Form.Text className="text-muted small">
                          Optional - International format with country code
                        </Form.Text>
                      </Form.Group>

                      {/* Location Section */}
                      <div className="mb-3">
                        <h5 className="fw-bold" style={{ color: '#2d3748' }}>
                          <FaMapMarkerAlt className="me-2" />
                          Location Information *
                        </h5>
                        <p className="text-muted small mb-0">
                          Select your location from the dropdowns below
                        </p>
                      </div>

                      {/* Country Select */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          <FaGlobe className="me-2" />
                          Country *
                        </Form.Label>
                        <Select
                          options={countries}
                          value={countries.find(c => c.value === formData.country) || null}
                          onChange={(option) => setFormData({...formData, country: option?.value || ''})}
                          placeholder="Select your country..."
                          styles={customSelectStyles}
                          isSearchable
                          formatOptionLabel={({ label, flag }) => (
                            <div className="d-flex align-items-center">
                              <span className="me-2">{flag}</span>
                              <span>{label}</span>
                            </div>
                          )}
                          noOptionsMessage={() => "Type to search countries..."}
                        />
                        {errors.country && (
                          <div className="text-danger mt-2 small fw-medium">
                            {errors.country}
                          </div>
                        )}
                      </Form.Group>

                      {/* Region/State Select */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          <FaBuilding className="me-2" />
                          Region/State *
                        </Form.Label>
                        <Select
                          options={regions}
                          value={regions.find(r => r.value === formData.region) || null}
                          onChange={(option) => setFormData({...formData, region: option?.value || ''})}
                          placeholder={formData.country ? "Select your region/state..." : "Select country first"}
                          styles={customSelectStyles}
                          isSearchable
                          isDisabled={!formData.country}
                          noOptionsMessage={() => formData.country ? "Type to search regions..." : "Select country first"}
                        />
                        {errors.region && (
                          <div className="text-danger mt-2 small fw-medium">
                            {errors.region}
                          </div>
                        )}
                        {formData.country && !formData.region && (
                          <Form.Text className="text-muted small">
                            Select your region or state
                          </Form.Text>
                        )}
                      </Form.Group>

                      {/* City Select */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          <FaCity className="me-2" />
                          City *
                        </Form.Label>
                        <Select
                          options={cities}
                          value={cities.find(c => c.value === formData.city) || null}
                          onChange={(option) => setFormData({...formData, city: option?.value || ''})}
                          placeholder={formData.region ? "Select your city..." : "Select region first"}
                          styles={customSelectStyles}
                          isSearchable
                          isDisabled={!formData.region}
                          noOptionsMessage={() => formData.region ? "Type to search cities..." : "Select region first"}
                        />
                        {errors.city && (
                          <div className="text-danger mt-2 small fw-medium">
                            {errors.city}
                          </div>
                        )}
                        {formData.region && !formData.city && (
                          <Form.Text className="text-muted small">
                            Select your city
                          </Form.Text>
                        )}
                      </Form.Group>

                      {/* Location Status Indicator */}
                      {formData.country && formData.region && formData.city && (
                        <Alert variant="success" className="border-0 mb-4 rounded-3" 
                             style={{ 
                               background: 'linear-gradient(135deg, rgba(25, 135, 84, 0.1) 0%, rgba(21, 128, 61, 0.1) 100%)',
                               border: '1px solid rgba(25, 135, 84, 0.2)'
                             }}
                        >
                          <div className="d-flex align-items-center">
                            <FaCheckCircle className="text-success me-2" size={20} />
                            <div>
                              <div className="fw-bold">Location Selected</div>
                              <small className="text-muted">
                                {countries.find(c => c.value === formData.country)?.label}, 
                                {regions.find(r => r.value === formData.region)?.label}, 
                                {formData.city}
                              </small>
                            </div>
                          </div>
                        </Alert>
                      )}

                      {/* Terms and Conditions */}
                      <Form.Group className="mb-4">
                        <div className="d-flex align-items-start">
                          <Form.Check
                            type="checkbox"
                            id="agreeTerms"
                            className="mt-1 me-2"
                            checked={formData.agreeTerms}
                            onChange={(e) => setFormData({...formData, agreeTerms: e.target.checked})}
                            isInvalid={!!errors.agreeTerms}
                            required
                          />
                          <Form.Label htmlFor="agreeTerms" className="mb-0" style={{ color: '#4a5568', lineHeight: '1.5' }}>
                            I agree to the{' '}
                            <Link 
                              href="/terms" 
                              className="text-decoration-none fw-bold"
                              style={{ 
                                color: '#667eea',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                              }}
                            >
                              Terms of Service
                            </Link>{' '}
                            and{' '}
                            <Link 
                              href="/privacy" 
                              className="text-decoration-none fw-bold"
                              style={{ 
                                color: '#667eea',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent'
                              }}
                            >
                              Privacy Policy
                            </Link>{' '}
                            *
                          </Form.Label>
                        </div>
                        {errors.agreeTerms && (
                          <div className="text-danger mt-2 small fw-medium">
                            {errors.agreeTerms}
                          </div>
                        )}
                      </Form.Group>

                      {/* Navigation Buttons */}
                      <div className="d-flex gap-3">
                        <Button 
                          type="button"
                          variant="light" 
                          className="flex-grow-1 py-3 fw-bold"
                          onClick={prevStep}
                          style={{ 
                            borderRadius: '12px',
                            border: '1px solid #e9ecef',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          Back
                        </Button>
                        
                        <Button 
                          type="submit" 
                          variant="primary" 
                          className="flex-grow-1 py-3 fw-bold border-0"
                          disabled={loading || !formData.country || !formData.region || !formData.city || !formData.agreeTerms}
                          style={{ 
                            borderRadius: '12px',
                            background: loading || !formData.country || !formData.region || !formData.city || !formData.agreeTerms
                              ? 'linear-gradient(135deg, #a0aec0 0%, #718096 100%)'
                              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            fontSize: '1.1rem',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!loading && formData.country && formData.region && formData.city && formData.agreeTerms) {
                              e.currentTarget.style.transform = 'translateY(-2px)';
                              e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                          }}
                        >
                          {loading ? (
                            <span className="d-flex align-items-center justify-content-center">
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Creating Account...
                            </span>
                          ) : (
                            <span className="d-flex align-items-center justify-content-center">
                              Create Account
                              <FaArrowRight className="ms-2" />
                            </span>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </Form>

                {/* Additional Social Options (Step 1 only) */}
                {step === 1 && (
                  <div className="text-center mt-4 pt-4 border-top">
                    <p className="text-muted small mb-3">Other signup options:</p>
                    <div className="d-flex justify-content-center gap-3">
                      <Button
                        variant="light"
                        className="rounded-circle p-3"
                        onClick={() => handleSocialSignup('facebook')}
                        style={{ 
                          width: '56px',
                          height: '56px',
                          border: '1px solid #e9ecef',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <FaFacebook className="text-primary" size={20} />
                      </Button>
                      <Button
                        variant="light"
                        className="rounded-circle p-3"
                        onClick={() => handleSocialSignup('twitter')}
                        style={{ 
                          width: '56px',
                          height: '56px',
                          border: '1px solid #e9ecef',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-2px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <FaTwitter className="text-info" size={20} />
                      </Button>
                    </div>
                  </div>
                )}

                {/* Sign In Link */}
                <div className="text-center pt-3">
                  <p className="mb-0" style={{ color: '#6c757d' }}>
                    Already have an account?{' '}
                    <Link 
                      href="/auth/login" 
                      className="fw-bold text-decoration-none"
                      style={{ 
                        color: '#667eea',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      Sign in here
                    </Link>
                  </p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Google Redirect Modal */}
      <Modal show={showGoogleRedirectModal} onHide={() => setShowGoogleRedirectModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Google Signup</Modal.Title>
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
              <small>If you've successfully signed up with Google, you'll be redirected automatically.</small>
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
                Check Signup Status
              </Button>
              
              <Button 
                variant="outline-primary" 
                onClick={handleGoogleSignup}
                className="py-3"
              >
                <FaExternalLinkAlt className="me-2" />
                Try Google Signup Again
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

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
        
        .google-logo {
          display: flex;
          align-items: center;
        }
        
        .google-logo-large {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        /* Phone Input Custom Styles */
        .phone-input-wrapper {
          width: 100%;
        }
        
        .custom-phone-input {
          width: 100% !important;
        }
        
        .custom-phone-input .react-international-phone-input-container {
          border-radius: 12px !important;
          border: 1px solid #e9ecef !important;
          background-color: #f8f9fa !important;
          transition: all 0.3s ease;
        }
        
        .custom-phone-input .react-international-phone-input-container:focus-within {
          border-color: #667eea !important;
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1) !important;
        }
        
        .custom-phone-input .react-international-phone-country-selector-button {
          border-radius: 12px 0 0 12px !important;
          background-color: #f8f9fa !important;
          border-right: 1px solid #e9ecef !important;
        }
        
        .custom-phone-input .react-international-phone-input {
          border-radius: 0 12px 12px 0 !important;
          background-color: #f8f9fa !important;
          padding: 16px !important;
          font-size: 1rem !important;
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
          
          .custom-phone-input .react-international-phone-input {
            padding: 14px !important;
          }
        }
      `}</style>
    </>
  );
}