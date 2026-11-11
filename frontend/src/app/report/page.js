// src/app/report/page.js (updated with authentication checks)
"use client"

import { useState, useEffect } from "react"
import { Container, Row, Col, Card, Tabs, Tab, Button, Spinner } from "react-bootstrap"
import {
  FaExclamationTriangle,
  FaShieldAlt,
  FaQuestionCircle,
  FaExclamationCircle,
  FaLightbulb,
  FaCommentAlt,
  FaArrowLeft
} from "react-icons/fa"
import { useAuth } from "../../../lib/contexts/AuthContext"
import { useRouter } from "next/navigation"
import DashboardLayout from "../../../components/layout/DashboardLayout"
import ScamReportForm from "./ScamReportForm"
import AwarenessForm from "./AwarenessForm"
import QuestionForm from "./QuestionForm"
import ImageMaskingTool from "../../../components/ImageMaskingTool"

const ReportPage = () => {
  const { user, api, isAuthenticated } = useAuth()
  const router = useRouter()

  // Tab state
  const [activeTab, setActiveTab] = useState("scam-report")
  
  // Common state
  const [loading, setLoading] = useState(false)
  const [scamTypes, setScamTypes] = useState([])
  const [companies, setCompanies] = useState([])
  
  // Image Masking State
  const [showImageMaskingTool, setShowImageMaskingTool] = useState(false)
  const [imageForMasking, setImageForMasking] = useState(null)
  const [maskingCallback, setMaskingCallback] = useState(null)
  const [isMaskingImage, setIsMaskingImage] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    if (!isAuthenticated) {
      // Redirect immediately to login if not authenticated
      router.replace('/auth/login?callbackUrl=/report');
    } else {
      loadData();
    }
  }, [isAuthenticated, router]);

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load scam types
      const scamTypesRes = await api.getScamTypes()
      setScamTypes(scamTypesRes || [])
      
      // Load user's companies if they have company role
      if (user?.role === "COMPANY_ADMIN" || user?.role === "MODERATOR" || user?.role === "COMPANY_STAFF") {
        try {
          const companiesRes = await api.companies.getMyCompanies()
          setCompanies(companiesRes || [])
        } catch (error) {
          console.log("No companies found or endpoint not available")
        }
      }
    } catch (error) {
      console.error("Failed to load data:", error)
    } finally {
      setLoading(false)
    }
  }

  // Function to open image masking tool with callback
  const openImageMaskingTool = (imageUrl, context, callback) => {
    setImageForMasking(imageUrl);
    setMaskingCallback(() => callback); // Store the callback function
    setIsMaskingImage(true);
    setShowImageMaskingTool(true);
  };

  // Function to handle saved masked image
  const handleMaskedImageSave = (maskedImageData) => {
    console.log("Masked image data received:", maskedImageData);
    
    // If there's a callback function, call it with the masked image data
    if (maskingCallback && typeof maskingCallback === 'function') {
      maskingCallback(maskedImageData);
    }
    
    setIsMaskingImage(false);
    setShowImageMaskingTool(false);
    setMaskingCallback(null);
  };

  // Show loading while checking authentication
  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <Spinner animation="border" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                <p className="mt-4 text-muted fs-5">Checking authentication...</p>
              </div>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <Spinner animation="border" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                <p className="mt-4 text-muted fs-5">Loading form data...</p>
              </div>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Container fluid className="py-4" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
        <div className="mb-4">
          <Button
            variant="outline-secondary"
            onClick={() => router.push("/dashboard")}
            className="mb-3 d-flex align-items-center gap-2 px-4 py-2 rounded-pill"
            style={{ 
              background: '#ffffff',
              borderColor: '#e9ecef'
            }}
          >
            <FaArrowLeft />
            <span>Back to Dashboard</span>
          </Button>
        </div>

        <Row className="justify-content-center">
          <Col xl={10} lg={12}>
            <div className="text-center mb-4">
              <h1 className="fw-bold mb-2" style={{ color: '#2d3748' }}>Create a Post</h1>
              <p className="text-muted mb-0" style={{ fontSize: '1.1rem' }}>
                Help protect the community by sharing information. All posts are subject to our content guidelines.
              </p>
            </div>

            <Card className="border-0 shadow-lg rounded-4 mb-4">
              <Card.Body className="p-3 p-md-4">
                <Tabs
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k)}
                  className="mb-4 border-0"
                  fill
                >
                  <Tab 
                    eventKey="scam-report" 
                    title={
                      <div className="d-flex align-items-center justify-content-center">
                        <FaExclamationTriangle className="me-2" style={{ color: '#dc3545' }} />
                        <span>Report a Scam</span>
                      </div>
                    }
                  >
                    <div className="pt-4">
                      <ScamReportForm 
                        scamTypes={scamTypes}
                        companies={companies}
                        user={user}
                        api={api}
                        router={router}
                        openImageMaskingTool={openImageMaskingTool}
                        isMaskingImage={isMaskingImage}
                      />
                    </div>
                  </Tab>

                  <Tab 
                    eventKey="awareness" 
                    title={
                      <div className="d-flex align-items-center justify-content-center">
                        <FaShieldAlt className="me-2" style={{ color: '#f59e0b' }} />
                        <span>Safety Awareness</span>
                      </div>
                    }
                  >
                    <div className="pt-4">
                      <AwarenessForm 
                        companies={companies}
                        user={user}
                        api={api}
                        router={router}
                        openImageMaskingTool={openImageMaskingTool}
                        isMaskingImage={isMaskingImage}
                      />
                    </div>
                  </Tab>

                  <Tab 
                    eventKey="question" 
                    title={
                      <div className="d-flex align-items-center justify-content-center">
                        <FaQuestionCircle className="me-2" style={{ color: '#3b82f6' }} />
                        <span>Ask a Question</span>
                      </div>
                    }
                  >
                    <div className="pt-4">
                      <QuestionForm 
                        api={api}
                        router={router}
                        openImageMaskingTool={openImageMaskingTool}
                        isMaskingImage={isMaskingImage}
                      />
                    </div>
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>

            {/* Tips & Guidelines Section */}
            <Row className="g-3 mt-3">
              <Col md={6} lg={4}>
                <Card className="border-0 shadow-sm rounded-4 h-100">
                  <Card.Body className="p-3">
                    <div className="d-flex align-items-center mb-3">
                      <div className="p-2 rounded-3 bg-primary bg-opacity-10 me-3">
                        <FaExclamationCircle className="text-primary" />
                      </div>
                      <h6 className="fw-bold mb-0" style={{ fontSize: '0.95rem' }}>Reporting Guidelines</h6>
                    </div>
                    <ul className="ps-3 mb-0 lh-lg small text-muted" style={{ fontSize: '0.85rem' }}>
                      <li className="mb-2">Be factual and specific</li>
                      <li className="mb-2">Avoid personal opinions</li>
                      <li className="mb-2">Respect privacy of others</li>
                      <li>No harassment or hate speech</li>
                    </ul>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6} lg={4}>
                <Card className="border-0 shadow-sm rounded-4 h-100">
                  <Card.Body className="p-3">
                    <div className="d-flex align-items-center mb-3">
                      <div className="p-2 rounded-3 bg-success bg-opacity-10 me-3">
                        <FaLightbulb className="text-success" />
                      </div>
                      <h6 className="fw-bold mb-0" style={{ fontSize: '0.95rem' }}>Community Impact</h6>
                    </div>
                    <p className="text-muted mb-0 lh-lg small" style={{ fontSize: '0.85rem' }}>
                      Your posts help educate others, prevent scams, and create a safer online environment for everyone.
                    </p>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={12} lg={4}>
                <Card className="border-0 shadow-sm rounded-4 h-100">
                  <Card.Body className="p-3">
                    <div className="d-flex align-items-center mb-3">
                      <div className="p-2 rounded-3 bg-info bg-opacity-10 me-3">
                        <FaCommentAlt className="text-info" />
                      </div>
                      <h6 className="fw-bold mb-0" style={{ fontSize: '0.95rem' }}>Response Time</h6>
                    </div>
                    <p className="text-muted mb-0 lh-lg small" style={{ fontSize: '0.85rem' }}>
                      Scam reports with evidence: 24-48 hours review
                      <br />
                      Questions and awareness: Published immediately
                    </p>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Container>

      {/* Image Masking Tool Modal */}
      <ImageMaskingTool
        imageUrl={imageForMasking}
        onSave={handleMaskedImageSave}
        onClose={() => {
          setShowImageMaskingTool(false);
          setIsMaskingImage(false);
          setMaskingCallback(null);
        }}
        show={showImageMaskingTool}
      />

      <style jsx>{`
        .nav-tabs .nav-link {
          border: none;
          color: #6c757d;
          font-weight: 500;
          padding: 0.75rem 1rem;
          border-radius: 12px 12px 0 0;
          background: transparent;
          margin-bottom: -1px;
          border-bottom: 3px solid transparent;
        }
        
        .nav-tabs .nav-link:hover {
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.05);
          border-color: transparent;
        }
        
        .nav-tabs .nav-link.active {
          color: #3b82f6;
          background: white;
          border-bottom: 3px solid #3b82f6;
          font-weight: 600;
        }
        
        .card {
          border-radius: 24px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: #ffffff;
          transition: all 0.3s ease;
        }
      `}</style>
    </DashboardLayout>
  )
}

export default ReportPage