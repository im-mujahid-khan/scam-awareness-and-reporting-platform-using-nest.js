"use client"

import { useState, useEffect } from "react"
import { Container, Row, Col, Card, Button, Spinner, Alert, Badge } from "react-bootstrap"
import { 
  FaBuilding, FaPlus, FaEnvelope, FaPhone, FaCalendarAlt, FaCheckCircle, FaSyncAlt, 
  FaIndustry, FaUsers, FaExclamationTriangle, FaCheck, FaArrowLeft, FaGlobe,
  FaMapMarkerAlt, FaPhoneAlt, FaUserTie, FaChartLine
} from "react-icons/fa"
import Link from "next/link"
import { useAuth } from '../../../lib/contexts/AuthContext';
import DashboardLayout from "../../../components/layout/DashboardLayout"
import { toast } from "react-toastify"

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const { api, user } = useAuth()

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      setError("")
      
      console.log("Fetching companies...")
      
      const response = await api.companies.getMyCompanies()
      
      console.log("Companies API Response:", response)
      
      let companiesData = []
      
      if (Array.isArray(response)) {
        companiesData = response
      } else if (response && typeof response === 'object') {
        if (Array.isArray(response.data)) {
          companiesData = response.data
        } else if (Array.isArray(response.companies)) {
          companiesData = response.companies
        } else if (Array.isArray(response.items)) {
          companiesData = response.items
        } else if (response.data && typeof response.data === 'object' && !Array.isArray(response.data)) {
          companiesData = [response.data]
        } else {
          const keys = Object.keys(response)
          if (keys.length > 0) {
            for (const key of keys) {
              if (Array.isArray(response[key])) {
                companiesData = response[key]
                break
              }
            }
          }
        }
      }
      
      console.log("Processed companies data:", companiesData)
      
      if (!Array.isArray(companiesData)) {
        console.warn("Companies data is not an array:", companiesData)
        companiesData = []
      }
      
      const companiesWithLogos = companiesData.map(company => {
        const logoUrl = company.logo || company.logoUrl || company.logoURL || company.image || company.imageUrl || company.logo?.url
        return {
          ...company,
          logoUrl: logoUrl || null,
          id: company.id || company._id,
          name: company.name || 'Unnamed Company',
          email: company.email || company.contactEmail || 'No email',
          industry: company.industry || 'Not specified',
          phone: company.phone || company.contactPhone || '',
          website: company.website || company.websiteUrl || '',
          location: company.location || company.address || 'Location not specified',
          createdAt: company.createdAt || company.createdDate || new Date().toISOString(),
          staffCount: company.staffCount || company.staff?.length || 0,
          isVerified: company.isVerified || company.verified || company.verificationStatus === 'VERIFIED',
          postCount: company.postCount || 0,
          description: company.description || company.bio || ''
        }
      })
      
      setCompanies(companiesWithLogos || [])
      
      if (companiesWithLogos.length === 0) {
        console.log("No companies found - empty array returned")
      }
      
    } catch (err) {
      console.error("Error fetching companies:", err)
      
      if (err.message?.includes('Network Error') || err.message?.includes('Failed to fetch')) {
        setError("Network error. Please check your connection and try again.")
      } else if (err.message?.includes('Session expired')) {
        setError("Session expired. Please login again.")
      } else if (err.message?.includes('401')) {
        setError("Please login to view your companies.")
      } else if (err.message?.includes('403')) {
        setError("You don't have permission to view companies.")
      } else {
        setError(err.message || "Failed to load companies")
      }
      
      setCompanies([])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const refreshCompanies = () => {
    setRefreshing(true)
    fetchCompanies()
  }

  const handleImageError = (e, companyName) => {
    console.log(`Logo failed to load for ${companyName}`)
    e.target.style.display = 'none'
    
    const parent = e.target.parentElement
    if (parent) {
      const fallback = document.createElement('div')
      fallback.className = "logo-fallback"
      fallback.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 24px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 18px;
      `
      fallback.textContent = companyName ? companyName.charAt(0).toUpperCase() : 'C'
      parent.appendChild(fallback)
    }
  }

  return (
    <DashboardLayout>
      <Container className="py-4" style={{ maxWidth: "1400px" }}>
        {/* Improved Large Banner Header */}
        <div
          className="mb-5 position-relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            borderRadius: "28px",
            padding: "4rem 3rem",
            minHeight: "300px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* Decorative Elements */}
          <div
            className="position-absolute"
            style={{
              top: "0",
              left: "0",
              right: "0",
              bottom: "0",
              background:
                'url("data:image/svg+xml,%3Csvg width="80" height="80" viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fillRule="evenodd"%3E%3Cg fill="%23ffffff" fillOpacity="0.05"%3E%3Cpath d="M50 50h-4v4h4v-4zm0-40h-4v4h4v-4zm-40 0H6v4h4v-4zm0 40H6v4h4v-4z"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
              opacity: 0.3,
            }}
          />
          
          {/* Floating Circles */}
          <div
            className="position-absolute rounded-circle"
            style={{
              width: "180px",
              height: "180px",
              background: "rgba(255, 255, 255, 0.08)",
              top: "-60px",
              right: "80px",
            }}
          />
          <div
            className="position-absolute rounded-circle"
            style={{
              width: "120px",
              height: "120px",
              background: "rgba(255, 255, 255, 0.05)",
              bottom: "-40px",
              left: "100px",
            }}
          />

          <Row className="align-items-center position-relative z-1">
            <Col lg={8}>
              <div className="mb-4">
                {/* Back Button */}
                <div className="mb-4">
                  <Link
                    href="/dashboard"
                    className="text-decoration-none d-inline-flex align-items-center gap-2 fw-medium"
                    style={{
                      color: "rgba(255, 255, 255, 0.9)",
                      transition: "all 0.3s ease",
                      padding: "8px 16px",
                      borderRadius: "12px",
                      background: "rgba(255, 255, 255, 0.15)",
                      backdropFilter: "blur(10px)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.25)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)";
                    }}
                  >
                    <FaArrowLeft />
                    <span>Back to Dashboard</span>
                  </Link>
                </div>

                <div className="d-flex align-items-center mb-4">
                  <div
                    className="d-flex align-items-center justify-content-center me-4"
                    style={{
                      width: "80px",
                      height: "80px",
                      borderRadius: "20px",
                      background: "rgba(255, 255, 255, 0.2)",
                      backdropFilter: "blur(10px)",
                      border: "2px solid rgba(255, 255, 255, 0.3)",
                    }}
                  >
                    <FaBuilding size={40} color="white" />
                  </div>
                  <div>
                    <h1 className="fw-bold mb-2 text-white display-5">
                      My Companies
                    </h1>
                    <p className="mb-0 text-white fs-5" style={{ opacity: 0.9 }}>
                      Manage all your registered businesses in one place
                    </p>
                  </div>
                </div>

                {/* Stats Bar */}
                {!loading && companies.length > 0 && (
                  <div className="d-flex align-items-center gap-4 mt-4">
                    <div className="d-flex align-items-center gap-2">
                      <div className="text-white fw-bold fs-3">{companies.length}</div>
                      <div className="text-white" style={{ opacity: 0.8 }}>Companies</div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <div className="text-white fw-bold fs-3">
                        {companies.filter(c => c.isVerified).length}
                      </div>
                      <div className="text-white" style={{ opacity: 0.8 }}>Verified</div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <div className="text-white fw-bold fs-3">
                        {companies.reduce((sum, c) => sum + (c.staffCount || 0), 0)}
                      </div>
                      <div className="text-white" style={{ opacity: 0.8 }}>Total Staff</div>
                    </div>
                  </div>
                )}
              </div>
            </Col>
            
            <Col lg={4} className="mt-4 mt-lg-0">
              <div className="d-flex flex-column gap-3">
                <Button
                  variant="light"
                  onClick={refreshCompanies}
                  disabled={refreshing}
                  className="rounded-pill px-4 py-3 fw-semibold d-inline-flex align-items-center justify-content-center"
                  style={{
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                    border: "none",
                    fontSize: "1rem",
                    background: "rgba(255, 255, 255, 0.95)",
                    color: "#667eea",
                  }}
                >
                  <FaSyncAlt className={`me-2 ${refreshing ? 'spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh Companies'}
                </Button>
                
                <Link
                  href="/companies/create"
                  className="btn btn-light rounded-pill px-4 py-3 fw-semibold d-inline-flex align-items-center justify-content-center text-decoration-none"
                  style={{
                    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.2)",
                    border: "none",
                    fontSize: "1rem",
                    background: "linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.85) 100%)",
                    color: "#667eea",
                    transition: "all 0.3s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-3px)";
                    e.currentTarget.style.boxShadow = "0 12px 40px rgba(0, 0, 0, 0.25)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 8px 32px rgba(0, 0, 0, 0.2)";
                  }}
                >
                  <FaPlus className="me-2" />
                  Add New Company
                </Link>
              </div>
            </Col>
          </Row>
        </div>

        {error && (
          <Alert
            variant="danger"
            dismissible
            onClose={() => setError("")}
            className="mb-4 border-0"
            style={{
              background: "linear-gradient(135deg, rgba(220, 53, 69, 0.1) 0%, rgba(220, 53, 69, 0.05) 100%)",
              borderRadius: "18px",
              border: "1px solid rgba(220, 53, 69, 0.2)",
              padding: "1.5rem",
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-3">
                <div
                  className="d-flex align-items-center justify-content-center rounded-circle"
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "rgba(220, 53, 69, 0.15)",
                  }}
                >
                  <FaExclamationTriangle size={24} color="#dc3545" />
                </div>
                <div>
                  <h5 className="fw-bold mb-1" style={{ color: "#dc3545" }}>Error Loading Companies</h5>
                  <p className="mb-0" style={{ color: "#721c24" }}>{error}</p>
                </div>
              </div>
              <div>
                <Button 
                  variant="outline-danger" 
                  onClick={refreshCompanies} 
                  disabled={refreshing}
                  className="rounded-pill px-4 py-2"
                >
                  <FaSyncAlt className={`me-2 ${refreshing ? 'spin' : ''}`} />
                  Retry
                </Button>
              </div>
            </div>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <div className="mb-4">
              <div className="spinner-wrapper">
                <Spinner
                  animation="border"
                  style={{
                    width: "3rem",
                    height: "3rem",
                    borderWidth: "4px",
                    color: "#667eea",
                  }}
                />
              </div>
            </div>
            <h5 className="fw-semibold mb-3" style={{ color: "#4a5568" }}>Loading your companies...</h5>
            <p className="text-muted">Fetching your company data</p>
          </div>
        ) : companies.length === 0 ? (
          <Card
            className="border-0 shadow-lg text-center"
            style={{
              borderRadius: "28px",
              padding: "4rem 2rem",
              background: "linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%)",
              border: "1px solid rgba(102, 126, 234, 0.1)",
            }}
          >
            <Card.Body>
              <div
                className="mb-4"
                style={{
                  width: "140px",
                  height: "140px",
                  margin: "0 auto",
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 12px 48px rgba(102, 126, 234, 0.3)",
                }}
              >
                <FaBuilding size={64} color="white" />
              </div>
              <h3 className="fw-bold mb-3 display-6" style={{ color: "#2d3748" }}>
                No Companies Registered
              </h3>
              <p className="text-muted mb-4 fs-5" style={{ maxWidth: "500px", margin: "0 auto", lineHeight: "1.6" }}>
                You haven't registered any companies yet. Start by creating your first company to manage your business profile and posts.
              </p>
              <div className="d-flex flex-column flex-md-row gap-3 justify-content-center mt-5">
                <Button
                  variant="outline-primary"
                  onClick={refreshCompanies}
                  disabled={refreshing}
                  className="rounded-pill px-5 py-3 fw-semibold d-flex align-items-center justify-content-center"
                  style={{
                    borderWidth: "2px",
                    fontSize: "1rem",
                  }}
                >
                  <FaSyncAlt className={`me-2 ${refreshing ? 'spin' : ''}`} />
                  {refreshing ? 'Retrying...' : 'Refresh Page'}
                </Button>
                <Link
                  href="/companies/create"
                  className="btn btn-lg rounded-pill px-5 py-3 fw-semibold border-0 d-flex align-items-center justify-content-center text-decoration-none"
                  style={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    boxShadow: "0 10px 32px rgba(102, 126, 234, 0.3)",
                    transition: "all 0.3s ease",
                    fontSize: "1rem",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = "translateY(-4px)"
                    e.currentTarget.style.boxShadow = "0 16px 48px rgba(102, 126, 234, 0.4)"
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)"
                    e.currentTarget.style.boxShadow = "0 10px 32px rgba(102, 126, 234, 0.3)"
                  }}
                >
                  <FaPlus className="me-2" />
                  Create Your First Company
                </Link>
              </div>
            </Card.Body>
          </Card>
        ) : (
          <>
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h4 className="fw-bold mb-2 display-6" style={{ color: "#2d3748" }}>
                  Your Companies
                </h4>
                <p className="text-muted fs-5 mb-0">
                  Manage and view all your registered companies
                </p>
              </div>
              <div className="d-flex align-items-center gap-3">
                <Badge
                  className="px-4 py-3 rounded-pill"
                  style={{
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                    border: "none",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                  }}
                >
                  Total: {companies.length}
                </Badge>
                <div className="d-flex align-items-center gap-2">
                  <FaChartLine className="text-primary" />
                  <small className="text-muted fw-medium">
                    Logos: {companies.filter(c => c.logoUrl).length}/{companies.length}
                  </small>
                </div>
              </div>
            </div>
            
            <Row className="g-4">
              {companies.map((company) => (
                <Col key={company.id} lg={4} md={6}>
                  <Link href={`/companies/${company.id}`} className="text-decoration-none">
                    <Card
                      className="border-0 h-100 company-card"
                      style={{
                        borderRadius: "24px",
                        background: "#ffffff",
                        boxShadow: "0 6px 24px rgba(0, 0, 0, 0.08)",
                        transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                        overflow: "hidden",
                        border: "1px solid rgba(102, 126, 234, 0.1)",
                      }}
                    >
                      {/* Gradient Top Border */}
                      <div
                        style={{
                          height: "6px",
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        }}
                      />

                      <Card.Body className="p-4">
                        <div className="text-center mb-4">
                          {/* Company Logo Container */}
                          <div className="position-relative d-inline-block mb-3">
                            <div
                              style={{
                                width: "120px",
                                height: "120px",
                                borderRadius: "24px",
                                background: company.logoUrl
                                  ? "#f8f9fa"
                                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                border: "4px solid white",
                                position: "relative",
                                overflow: "hidden",
                                margin: "0 auto",
                                boxShadow: "0 8px 32px rgba(102, 126, 234, 0.2)",
                              }}
                            >
                              {company.logoUrl ? (
                                <img
                                  src={company.logoUrl}
                                  alt={company.name}
                                  style={{
                                    width: "100%",
                                    height: "100%",
                                    objectFit: "cover",
                                    borderRadius: "20px",
                                  }}
                                  onError={(e) => handleImageError(e, company.name)}
                                  loading="lazy"
                                />
                              ) : (
                                <div className="d-flex flex-column align-items-center justify-content-center h-100 w-100">
                                  <FaBuilding size={56} color="white" />
                                  <small className="text-white mt-2 fw-medium">No Logo</small>
                                </div>
                              )}
                            </div>

                            {/* Decorative Border */}
                            <div
                              className="position-absolute"
                              style={{
                                top: "-6px",
                                left: "-6px",
                                right: "-6px",
                                bottom: "-6px",
                                borderRadius: "28px",
                                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                zIndex: -1,
                                opacity: 0.2,
                              }}
                            />

                            {/* Verification Badge */}
                            {company.isVerified && (
                              <div
                                className="position-absolute d-flex align-items-center justify-content-center rounded-circle"
                                style={{
                                  top: "10px",
                                  right: "10px",
                                  width: "36px",
                                  height: "36px",
                                  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                  color: "white",
                                  border: "3px solid white",
                                  boxShadow: "0 4px 16px rgba(16, 185, 129, 0.3)",
                                }}
                              >
                                <FaCheck size={14} />
                              </div>
                            )}
                          </div>

                          {/* Company Name */}
                          <h5 className="fw-bold mb-2" style={{ 
                            color: "#2d3748",
                            fontSize: "1.4rem",
                            lineHeight: "1.3"
                          }}>
                            {company.name}
                          </h5>

                          {/* Industry Badge */}
                          <div className="d-flex align-items-center justify-content-center gap-2 flex-wrap mb-3">
                            <Badge
                              className="px-3 py-2 rounded-pill fw-semibold border-0 d-flex align-items-center gap-2"
                              style={{
                                background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
                                color: "#f5f6f9ff",
                                fontSize: "0.85rem",
                                border: "1px solid rgba(102, 126, 234, 0.2)",
                              }}
                            >
                              <FaIndustry size={12} />
                              {company.industry || "N/A"}
                            </Badge>
                          </div>

                          {/* Company Description (if available) */}
                          {company.description && (
                            <p className="text-muted mb-4" style={{ 
                              fontSize: "0.9rem",
                              lineHeight: "1.5",
                              minHeight: "40px"
                            }}>
                              {company.description.length > 80 
                                ? `${company.description.substring(0, 80)}...` 
                                : company.description}
                            </p>
                          )}
                        </div>

                        {/* Info Panel */}
                        <div
                          className="mb-4"
                          style={{
                            background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
                            borderRadius: "18px",
                            padding: "1.25rem",
                            border: "1px solid rgba(102, 126, 234, 0.1)",
                          }}
                        >
                          {/* Email */}
                          <div className="d-flex align-items-center mb-3">
                            <div
                              className="d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "12px",
                                background: "rgba(102, 126, 234, 0.1)",
                              }}
                            >
                              <FaEnvelope style={{ color: "#667eea" }} size={16} />
                            </div>
                            <div className="flex-grow-1">
                              <div className="fw-medium text-muted small mb-1">Email</div>
                              <div className="text-truncate" style={{ color: "#4a5568", fontSize: "0.95rem" }}>
                                {company.email}
                              </div>
                            </div>
                          </div>

                          {/* Phone */}
                          {company.phone && (
                            <div className="d-flex align-items-center mb-3">
                              <div
                                className="d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  borderRadius: "12px",
                                  background: "rgba(102, 126, 234, 0.1)",
                                }}
                              >
                                <FaPhoneAlt style={{ color: "#667eea" }} size={16} />
                              </div>
                              <div className="flex-grow-1">
                                <div className="fw-medium text-muted small mb-1">Phone</div>
                                <div className="text-truncate" style={{ color: "#4a5568", fontSize: "0.95rem" }}>
                                  {company.phone}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Staff Count */}
                          <div className="d-flex align-items-center">
                            <div
                              className="d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                              style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "12px",
                                background: "rgba(102, 126, 234, 0.1)",
                              }}
                            >
                              <FaUsers style={{ color: "#667eea" }} size={16} />
                            </div>
                            <div className="flex-grow-1">
                              <div className="fw-medium text-muted small mb-1">Staff Members</div>
                              <div className="d-flex align-items-center gap-2" style={{ color: "#4a5568", fontSize: "0.95rem" }}>
                                <FaUserTie size={12} />
                                <span>
                                  {company.staffCount || 0} member{company.staffCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Footer with Date and CTA */}
                        <div className="d-flex justify-content-between align-items-center pt-3 border-top">
                          <div>
                            <div className="text-muted fw-medium small mb-1">Registered Date</div>
                            <div className="d-flex align-items-center gap-2">
                              <FaCalendarAlt className="text-primary" size={14} />
                              <span className="fw-semibold" style={{ color: "#4a5568", fontSize: "0.9rem" }}>
                                {company.createdAt ? new Date(company.createdAt).toLocaleDateString('en-US', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric'
                                }) : 'N/A'}
                              </span>
                            </div>
                          </div>
                          <Button
                            className="rounded-pill px-4 py-2 fw-semibold border-0 d-flex align-items-center gap-2"
                            style={{
                              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              color: "white",
                              fontSize: "0.9rem",
                              transition: "all 0.3s ease",
                              boxShadow: "0 4px 16px rgba(102, 126, 234, 0.2)",
                            }}
                          >
                            View Details
                            <FaArrowLeft style={{ transform: "rotate(180deg)" }} size={12} />
                          </Button>
                        </div>
                      </Card.Body>
                    </Card>
                  </Link>
                </Col>
              ))}
            </Row>
          </>
        )}
      </Container>

      <style jsx>{`
        .company-card {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .company-card:hover {
          transform: translateY(-12px) scale(1.02);
          box-shadow: 0 24px 72px rgba(102, 126, 234, 0.25) !important;
          border-color: rgba(102, 126, 234, 0.3) !important;
        }
        
        .spinner-wrapper {
          display: inline-block;
          animation: pulse 2s ease-in-out infinite;
        }
        
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1; 
          }
          50% { 
            transform: scale(1.05);
            opacity: 0.8; 
          }
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .logo-fallback {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 18px;
        }
        
        @media (max-width: 768px) {
          .company-card:hover {
            transform: translateY(-6px);
          }
        }
      `}</style>
    </DashboardLayout>
  )
}