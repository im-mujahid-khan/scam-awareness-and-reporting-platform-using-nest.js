'use client';

import { Container, Row, Col, Nav, Navbar } from 'react-bootstrap';
import { 
  FaShieldAlt, 
  FaGithub, 
  FaTwitter, 
  FaFacebook, 
  FaLinkedin, 
  FaEnvelope,
  FaHeart,
  FaExclamationTriangle
} from 'react-icons/fa';
import Link from 'next/link';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const quickLinks = [
    { name: 'Home', href: '/' },
    { name: 'Search Scams', href: '/search' },
    { name: 'Report Scam', href: '/report' },
    { name: 'Scam Feed', href: '/feed/scam-reports' },
    { name: 'Awareness', href: '/feed/awareness' },
    { name: 'Groups', href: '/dashboard/groups' },
  ];

  const resources = [
    { name: 'Safety Tips', href: '/safety-tips' },
    { name: 'Scam Statistics', href: '/statistics' },
    { name: 'Company Profiles', href: '/companies' },
    { name: 'API Documentation', href: '/api-docs' },
    { name: 'Mobile App', href: '/mobile' },
    { name: 'Browser Extension', href: '/extension' },
  ];

  const legal = [
    { name: 'Privacy Policy', href: '/privacy' },
    // { name: 'Terms of Service', href: '/terms' },
    // { name: 'Cookie Policy', href: '/cookies' },
    // { name: 'Community Guidelines', href: '/guidelines' },
    // { name: 'Report Abuse', href: '/report-abuse' },
    { name: 'Contact Support', href: '/support' }, 
  ];

  const socialLinks = [
    { icon: <FaTwitter />, href: 'https://twitter.com/scamalert', label: 'Twitter' },
    { icon: <FaFacebook />, href: 'https://facebook.com/scamalert', label: 'Facebook' },
    { icon: <FaLinkedin />, href: 'https://linkedin.com/company/scamalert', label: 'LinkedIn' },
    { icon: <FaGithub />, href: 'https://github.com/scamalert', label: 'GitHub' },
  ];

  return (
    <footer className="bg-dark text-white mt-auto pt-5 pb-4">
      <Container>
        <Row>
          {/* Brand & Description */}
          <Col lg={4} className="mb-4">
            <div className="d-flex align-items-center mb-3">
              <FaShieldAlt className="fs-2 text-primary me-2" />
              <h3 className="fw-bold mb-0">ScamAlert</h3>
            </div>
            <p className="text-light mb-4">
              A community-driven platform to report, search, and stay protected from online scams. 
              Join thousands of users in making the internet safer for everyone.
            </p>
            <div className="d-flex gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-white fs-5 hover-text-primary"
                  aria-label={social.label}
                  style={{ textDecoration: 'none', transition: 'color 0.2s' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = '#0d6efd'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'white'}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </Col>

          {/* Quick Links */}
          <Col md={4} lg={2} className="mb-4">
            <h5 className="fw-bold mb-3">Quick Links</h5>
            <Nav className="flex-column">
              {quickLinks.map((link) => (
                <Nav.Link 
                  key={link.name} 
                  as={Link} 
                  href={link.href}
                  className="text-light p-0 mb-2"
                >
                  {link.name}
                </Nav.Link>
              ))}
            </Nav>
          </Col>

          {/* Resources */}
          <Col md={4} lg={2} className="mb-4">
            <h5 className="fw-bold mb-3">Resources</h5>
            <Nav className="flex-column">
              {resources.map((link) => (
                <Nav.Link 
                  key={link.name} 
                  as={Link} 
                  href={link.href}
                  className="text-light p-0 mb-2"
                >
                  {link.name}
                </Nav.Link>
              ))}
            </Nav>
          </Col>

          {/* Legal & Contact */}
          <Col md={4} lg={2} className="mb-4">
            <h5 className="fw-bold mb-3">Legal & Help</h5>
            <Nav className="flex-column">
              {legal.map((link) => (
                <Nav.Link 
                  key={link.name} 
                  as={Link} 
                  href={link.href}
                  className="text-light p-0 mb-2"
                >
                  {link.name}
                </Nav.Link>
              ))}
            </Nav>
          </Col>

          {/* Emergency Alert */}
          <Col lg={2} className="mb-4">
            <div className="bg-danger bg-opacity-10 border border-danger rounded p-3">
              <div className="d-flex align-items-center mb-2">
                <FaExclamationTriangle className="text-danger me-2" />
                <h6 className="fw-bold mb-0 text-danger">Emergency</h6>
              </div>
              <p className="small text-light mb-3">
                If you've lost money or are in immediate danger, contact authorities first.
              </p>
              <a 
                href="tel:911" 
                className="btn btn-danger btn-sm w-100"
              >
                Call Emergency
              </a>
            </div>
          </Col>
        </Row>

        <hr className="my-4 border-secondary" />

        <Row className="align-items-center">
          <Col md={6} className="mb-3 mb-md-0">
            <p className="mb-0 text-light small">
              &copy; {currentYear} ScamAlert. All rights reserved. 
              {/* <span className="d-inline-block ms-2">
                Made with <FaHeart className="text-danger" /> to protect the community.
              </span> */}
            </p>
          </Col>
          <Col md={6} className="text-md-end">
            <div className="d-flex flex-column flex-md-row justify-content-md-end align-items-md-center gap-3">
              <div className="d-flex align-items-center">
                <FaEnvelope className="me-2" />
                <a href="mailto:report@scamalert.com" className="text-light small">
                  report@scamalert.com
                </a>
              </div>
              <div className="small text-light">
                v1.0.0 • {new Date().toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </div>
            </div>
          </Col>
        </Row>

        {/* Badges */}
        <Row className="mt-4">
          <Col>
            <div className="d-flex flex-wrap gap-2 justify-content-center">
              <span className="badge bg-primary">SSL Secured</span>
              <span className="badge bg-success">GDPR Compliant</span>
              <span className="badge bg-warning text-dark">100% Anonymous</span>
              <span className="badge bg-info">24/7 Monitoring</span>
              <span className="badge bg-danger">Verified Reports</span>
            </div>
          </Col>
        </Row>
      </Container>
    </footer>
  );
}