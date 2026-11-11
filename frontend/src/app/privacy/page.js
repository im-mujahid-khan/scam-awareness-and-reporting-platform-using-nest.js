'use client';

import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { FaArrowLeft, FaSearch, FaShieldAlt, FaLock, FaUser, FaGlobe, FaChartBar } from 'react-icons/fa';
import { useRouter } from 'next/navigation';

export default function PrivacyPolicy() {
  const router = useRouter();
  const [sidebarTop, setSidebarTop] = useState(20);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const newTop = Math.max(20, 20 - scrollTop * 0.1); // Slow movement
      setSidebarTop(newTop);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
                  placeholder="Search in privacy policy..."
                  className="form-control py-3 ps-5 rounded-pill border-0 shadow-sm w-100"
                  style={{ background: '#f8f9fa' }}
                />
              </div>
            </div>

            {/* Header */}
            <div className="mb-5">
              <h1 className="display-4 fw-bold mb-3" style={{ color: '#764ba2' }}>
                Privacy Policy
              </h1>
              <div className="d-flex align-items-center gap-3 mb-4">
                <div className="d-flex align-items-center gap-2 text-muted">
                  <FaShieldAlt />
                  <span>Latest update: 24 June 2024</span>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="privacy-content">
              <section className="mb-5 pb-4 border-bottom">
                <p className="lead text-muted">
                  At ScamAlert ("we," "our," "us"), we value your privacy and are committed to 
                  protecting your personal information. This Privacy Policy outlines our practices 
                  regarding the collection, use, disclosure, and protection of your data when you 
                  visit our website. By using our services, you agree to the terms of this policy. 
                  Please read it carefully to understand how we handle your information.
                </p>
              </section>

              {/* Section 1 */}
              <section className="mb-5">
                <div className="d-flex align-items-start gap-3 mb-4">
                  <div className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{ 
                      width: '50px', 
                      height: '50px', 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      flexShrink: 0
                    }}
                  >
                    <h2 className="h4 fw-bold mb-0">1</h2>
                  </div>
                  <div>
                    <h2 className="h3 fw-bold mb-3" style={{ color: '#764ba2' }}>Introduction</h2>
                    <p className="text-muted">
                      ScamAlert is dedicated to creating a safe and secure online environment for 
                      our users. We understand the importance of privacy and are committed to 
                      safeguarding your personal information. This Privacy Policy explains our 
                      practices concerning the collection, use, and sharing of your data. We 
                      encourage you to review this policy regularly as we may update it periodically 
                      to reflect changes in our practices or legal requirements.
                    </p>
                  </div>
                </div>
              </section>

              {/* Section 2 */}
              <section className="mb-5">
                <div className="d-flex align-items-start gap-3 mb-4">
                  <div className="d-flex align-items-center justify-content-center rounded-circle"
                    style={{ 
                      width: '50px', 
                      height: '50px', 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      flexShrink: 0
                    }}
                  >
                    <h2 className="h4 fw-bold mb-0">2</h2>
                  </div>
                  <div>
                    <h2 className="h3 fw-bold mb-4" style={{ color: '#764ba2' }}>Information We Collect</h2>
                    
                    <div className="mb-4">
                      <h3 className="h4 fw-bold mb-3" style={{ color: '#4a5568' }}>
                        <FaLock className="me-2" />
                        Personal Data
                      </h3>
                      <p className="text-muted">
                        We collect personally identifiable information ("Personal Data") that you 
                        voluntarily provide to us. This may include your name, email address, phone 
                        number, and other contact information. You may provide this information when 
                        you sign up for our services, contact us for inquiries, or participate in 
                        community features.
                      </p>
                    </div>

                    <div className="mb-4">
                      <h3 className="h4 fw-bold mb-3" style={{ color: '#4a5568' }}>
                        <FaChartBar className="me-2" />
                        Non-Personal Data
                      </h3>
                      <p className="text-muted">
                        In addition to Personal Data, we collect non-personal information ("Non-Personal Data") 
                        that cannot be used to identify you individually. This includes data such as your 
                        IP address, browser type, operating system, referring URLs, pages viewed, and the 
                        dates/times of your visits. Non-Personal Data helps us understand user behavior 
                        and improve our platform's performance and user experience.
                      </p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Add more sections as needed */}
            </div>
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
              {/* Your Privacy Matters Card */}
              <Card className="border-0 shadow-lg rounded-4 overflow-hidden mb-4">
                <div 
                  className="p-5 text-white text-center"
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    minHeight: '200px'
                  }}
                >
                  <FaShieldAlt size={60} className="mb-4 opacity-75" />
                  <h3 className="fw-bold mb-3">Your Privacy Matters</h3>
                  <p className="mb-0 opacity-90">
                    We're committed to protecting your data and being transparent about how we use it.
                  </p>
                </div>
              </Card>

              {/* Contact Card */}
              <Card className="border-0 shadow-sm rounded-4">
                <Card.Body className="p-4">
                  <h5 className="fw-bold mb-4" style={{ color: '#764ba2' }}>
                    <FaUser className="me-2" />
                    Contact Information
                  </h5>
                  
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-2 text-muted">Privacy Officer</h6>
                    <p className="mb-0" style={{ color: '#764ba2' }}>privacy@scamalert.com</p>
                  </div>
                  
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-2 text-muted">Support Team</h6>
                    <p className="mb-0" style={{ color: '#764ba2' }}>support@scamalert.com</p>
                  </div>
                  
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-2 text-muted">Phone</h6>
                    <p className="mb-0" style={{ color: '#764ba2' }}>+1 (555) 123-4567</p>
                  </div>

                  <Button
                    variant="primary"
                    className="w-100 py-3 rounded-pill border-0 fw-semibold mt-3"
                    style={{ 
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                    }}
                    onClick={() => router.push('/support')}
                  >
                    <FaGlobe className="me-2" />
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
        
        .privacy-content section {
          scroll-margin-top: 100px;
        }
      `}</style>
    </div>
  );
}