'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Form, Alert, Tab, Tabs } from 'react-bootstrap';
import { 
  FaArrowLeft, 
  FaSearch, 
  FaHeadset, 
  FaEnvelope, 
  FaPhone, 
  FaCommentDots, 
  FaFileAlt,
  FaLifeRing,
  FaQuestionCircle,
  FaClock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaPaperPlane,
  FaShieldAlt
} from 'react-icons/fa';
import { useRouter } from 'next/navigation';

export default function SupportPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('contact');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    category: 'general',
    message: '',
    urgency: 'medium'
  });
  const [submitted, setSubmitted] = useState(false);
  const [sidebarTop, setSidebarTop] = useState(20);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const newTop = Math.max(20, 20 - scrollTop * 0.1);
      setSidebarTop(newTop);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const categories = [
    { value: 'general', label: 'General Inquiry' },
    { value: 'report', label: 'Report Issue' },
    { value: 'account', label: 'Account Help' },
    { value: 'scam', label: 'Scam Reporting Help' },
    { value: 'technical', label: 'Technical Issue' },
    { value: 'safety', label: 'Safety Concern' },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Support form submitted:', formData);
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 5000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-vh-100 bg-white">
      <Container className="py-5">
        <Row className="g-5">
          {/* Left Side - Content */}
          <Col lg={8}>
            {/* Back Button */}
            <div className="mb-4">
              <Button
                variant="outline-primary"
                onClick={() => router.back()}
                className="d-flex align-items-center gap-2 px-4 py-2 rounded-pill"
                style={{ 
                  borderColor: '#764ba2',
                  color: '#764ba2',
                  background: 'rgba(118, 75, 162, 0.1)'
                }}
              >
                <FaArrowLeft />
                <span>Back</span>
              </Button>
            </div>

            {/* Search Bar - Fixed Icon */}
            <div className="mb-5">
              <div className="position-relative">
                <div className="position-absolute top-50 start-3 translate-middle-y">
                  <FaSearch className="text-muted" />
                </div>
                <input
                  type="text"
                  placeholder="Search support articles..."
                  className="form-control py-3 ps-5 rounded-pill border-0 shadow-sm w-100"
                  style={{ background: '#f8f9fa' }}
                />
              </div>
            </div>

            {/* Header */}
            <div className="mb-5">
              <h1 className="display-4 fw-bold mb-3" style={{ color: '#764ba2' }}>
                Support Center
              </h1>
              <p className="lead text-muted mb-0">
                Get help with ScamAlert, report issues, or contact our support team
              </p>
            </div>

            {/* Tabs Navigation */}
            <div className="mb-4">
              <div className="d-flex gap-3">
                <Button
                  variant={activeTab === 'contact' ? 'primary' : 'outline-primary'}
                  onClick={() => setActiveTab('contact')}
                  className="px-4 py-3 rounded-pill border-0 fw-semibold"
                  style={{ 
                    background: activeTab === 'contact' 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'rgba(118, 75, 162, 0.1)',
                    color: activeTab === 'contact' ? 'white' : '#764ba2'
                  }}
                >
                  <FaEnvelope className="me-2" />
                  Contact Support
                </Button>
                <Button
                  variant={activeTab === 'faq' ? 'primary' : 'outline-primary'}
                  onClick={() => setActiveTab('faq')}
                  className="px-4 py-3 rounded-pill border-0 fw-semibold"
                  style={{ 
                    background: activeTab === 'faq' 
                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      : 'rgba(118, 75, 162, 0.1)',
                    color: activeTab === 'faq' ? 'white' : '#764ba2'
                  }}
                >
                  <FaQuestionCircle className="me-2" />
                  FAQ
                </Button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'contact' && (
              <Card className="border-0 shadow-sm rounded-4">
                <Card.Body className="p-4 p-md-5">
                  {submitted ? (
                    <Alert variant="success" className="border-0 rounded-4">
                      <div className="d-flex align-items-center">
                        <FaCheckCircle className="me-3 fs-4" style={{ color: '#764ba2' }} />
                        <div>
                          <h5 className="alert-heading fw-bold">Message Sent Successfully!</h5>
                          <p className="mb-0">
                            Thank you for contacting us. Our support team will get back to you within 24 hours.
                          </p>
                        </div>
                      </div>
                    </Alert>
                  ) : (
                    <>
                      <h3 className="h4 fw-bold mb-4" style={{ color: '#764ba2' }}>Send us a Message</h3>
                      <Form onSubmit={handleSubmit}>
                        <Row className="g-3">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-semibold text-muted">Your Name *</Form.Label>
                              <Form.Control
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                required
                                className="rounded-3 border-0 shadow-sm"
                                style={{ background: '#f8f9fa' }}
                              />
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-semibold text-muted">Email Address *</Form.Label>
                              <Form.Control
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                                className="rounded-3 border-0 shadow-sm"
                                style={{ background: '#f8f9fa' }}
                              />
                            </Form.Group>
                          </Col>
                        </Row>

                        <Form.Group className="mt-3">
                          <Form.Label className="fw-semibold text-muted">Subject *</Form.Label>
                          <Form.Control
                            type="text"
                            name="subject"
                            value={formData.subject}
                            onChange={handleChange}
                            required
                            placeholder="Brief description of your issue"
                            className="rounded-3 border-0 shadow-sm"
                            style={{ background: '#f8f9fa' }}
                          />
                        </Form.Group>

                        <Row className="g-3 mt-3">
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-semibold text-muted">Category *</Form.Label>
                              <Form.Select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="rounded-3 border-0 shadow-sm"
                                style={{ background: '#f8f9fa' }}
                              >
                                {categories.map((cat) => (
                                  <option key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </option>
                                ))}
                              </Form.Select>
                            </Form.Group>
                          </Col>
                          <Col md={6}>
                            <Form.Group>
                              <Form.Label className="fw-semibold text-muted">Urgency *</Form.Label>
                              <Form.Select
                                name="urgency"
                                value={formData.urgency}
                                onChange={handleChange}
                                className="rounded-3 border-0 shadow-sm"
                                style={{ background: '#f8f9fa' }}
                              >
                                <option value="low">Low - General question</option>
                                <option value="medium">Medium - Need assistance</option>
                                <option value="high">High - Urgent issue</option>
                              </Form.Select>
                            </Form.Group>
                          </Col>
                        </Row>

                        <Form.Group className="mt-3">
                          <Form.Label className="fw-semibold text-muted">Message *</Form.Label>
                          <Form.Control
                            as="textarea"
                            name="message"
                            value={formData.message}
                            onChange={handleChange}
                            required
                            rows={5}
                            placeholder="Please provide detailed information about your issue or question..."
                            className="rounded-3 border-0 shadow-sm"
                            style={{ background: '#f8f9fa', resize: 'none' }}
                          />
                        </Form.Group>

                        <div className="mt-4">
                          <Button
                            type="submit"
                            variant="primary"
                            size="lg"
                            className="px-5 py-3 rounded-pill border-0 fw-semibold"
                            style={{ 
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            }}
                          >
                            <FaPaperPlane className="me-2" />
                            Send Message
                          </Button>
                        </div>
                      </Form>
                    </>
                  )}
                </Card.Body>
              </Card>
            )}

            {activeTab === 'faq' && (
              <Card className="border-0 shadow-sm rounded-4">
                <Card.Body className="p-4 p-md-5">
                  <h3 className="h4 fw-bold mb-4" style={{ color: '#764ba2' }}>Frequently Asked Questions</h3>
                  <div className="accordion" id="faqAccordion">
                    {[
                      {
                        question: 'How do I report a scam?',
                        answer: 'Navigate to the "Report Scam" page, fill in the details about the scam, provide any evidence you have, and submit. Our team will review it within 24 hours.'
                      },
                      {
                        question: 'Is my report anonymous?',
                        answer: 'Yes, by default all reports are anonymized. Your personal information is kept confidential unless you choose to share it publicly.'
                      },
                      {
                        question: 'How long does it take to verify a report?',
                        answer: 'Typically 24-48 hours. High-priority scams may be verified faster. You\'ll receive an email notification once verified.'
                      },
                      {
                        question: 'Can I edit or delete my report?',
                        answer: 'Yes, you can edit or delete your reports from your profile page. Verified reports may require support assistance for major changes.'
                      },
                      {
                        question: 'How do I reset my password?',
                        answer: 'Click "Forgot Password" on the login page, enter your email, and follow the instructions sent to your inbox.'
                      },
                      {
                        question: 'Is ScamAlert free to use?',
                        answer: 'Yes, ScamAlert is completely free for all users. We believe scam protection should be accessible to everyone.'
                      },
                    ].map((item, index) => (
                      <div key={index} className="accordion-item border-0 mb-3">
                        <h2 className="accordion-header">
                          <button
                            className="accordion-button collapsed rounded-3 border-0 shadow-sm"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target={`#faq${index}`}
                            style={{ 
                              background: '#f8f9fa',
                              color: '#2d3748',
                              fontWeight: '600'
                            }}
                          >
                            {item.question}
                          </button>
                        </h2>
                        <div
                          id={`faq${index}`}
                          className="accordion-collapse collapse"
                          data-bs-parent="#faqAccordion"
                        >
                          <div className="accordion-body pt-3 text-muted">
                            {item.answer}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}
          </Col>

          {/* Right Side - Sticky Card */}
          <Col lg={4}>
            <div 
              className="sticky-sidebar"
              style={{ 
                position: 'sticky',
                top: `${sidebarTop}px`,
                transition: 'top 0.3s ease'
              }}
            >
              {/* 24/7 Support Card */}
              <Card className="border-0 shadow-lg rounded-4 overflow-hidden mb-4">
                <div 
                  className="p-5 text-white text-center"
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    minHeight: '200px'
                  }}
                >
                  <FaHeadset size={60} className="mb-4 opacity-75" />
                  <h3 className="fw-bold mb-3">24/7 Support</h3>
                  <p className="mb-0 opacity-90">
                    Our team is available around the clock to assist you with any issues.
                  </p>
                </div>
              </Card>

              {/* Contact Methods Card */}
              <Card className="border-0 shadow-sm rounded-4">
                <Card.Body className="p-4">
                  <h5 className="fw-bold mb-4" style={{ color: '#764ba2' }}>
                    <FaCommentDots className="me-2" />
                    Contact Methods
                  </h5>
                  
                  <div className="mb-4 pb-3 border-bottom">
                    <div className="d-flex align-items-start gap-3">
                      <div className="bg-light p-2 rounded-circle">
                        <FaEnvelope style={{ color: '#764ba2' }} />
                      </div>
                      <div>
                        <h6 className="fw-semibold mb-1 text-muted">Email Support</h6>
                        <p className="small text-muted mb-1">General inquiries and support</p>
                        <div className="fw-medium" style={{ color: '#764ba2' }}>
                          support@scamalert.com
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 pb-3 border-bottom">
                    <div className="d-flex align-items-start gap-3">
                      <div className="bg-light p-2 rounded-circle">
                        <FaPhone style={{ color: '#764ba2' }} />
                      </div>
                      <div>
                        <h6 className="fw-semibold mb-1 text-muted">Phone Support</h6>
                        <p className="small text-muted mb-1">Available 24/7 for urgent matters</p>
                        <div className="fw-medium" style={{ color: '#764ba2' }}>
                          +1 (555) 123-4567
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 pb-3 border-bottom">
                    <div className="d-flex align-items-start gap-3">
                      <div className="bg-light p-2 rounded-circle">
                        <FaExclamationTriangle style={{ color: '#764ba2' }} />
                      </div>
                      <div>
                        <h6 className="fw-semibold mb-1 text-muted">Emergency</h6>
                        <p className="small text-muted mb-1">Immediate scam emergencies</p>
                        <div className="fw-medium" style={{ color: '#764ba2' }}>
                          +1 (555) 911-9111
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    className="w-100 py-3 rounded-pill border-0 fw-semibold mt-2"
                    style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}
                    onClick={() => setActiveTab('contact')}
                  >
                    <FaPaperPlane className="me-2" />
                    Contact Support
                  </Button>
                </Card.Body>
              </Card>
            </div>
          </Col>
        </Row>
      </Container>

      <style jsx>{`
        .sticky-sidebar {
          position: -webkit-sticky;
          position: sticky;
        }
        
        input::placeholder {
          color: #6c757d;
        }
        
        .form-control:focus {
          box-shadow: 0 0 0 0.25rem rgba(118, 75, 162, 0.25);
          border-color: #764ba2;
        }
      `}</style>
    </div>
  );
} 