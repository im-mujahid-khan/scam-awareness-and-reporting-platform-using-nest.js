'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ManageStaffModal from './ManageStaffModal'; // Add this import

import { 
  Container, Row, Col, Card, Button, Badge, Tab, Nav, 
  Alert, Spinner, Modal, Form, ListGroup 
} from 'react-bootstrap';
import { 
  FaBuilding, FaEnvelope, FaPhone, FaGlobe, FaIndustry, 
  FaUser, FaEdit, FaTrash, FaUsers, FaShieldAlt, 
  FaCheckCircle, FaTimesCircle, FaArrowLeft, FaCalendarAlt,
  FaFileAlt, FaCog, FaPlus, FaSpinner, FaUpload, FaExclamationTriangle,
  FaImage, FaCloudUploadAlt, FaCheck
} from 'react-icons/fa';
import Link from 'next/link';
import { useAuth } from '../../../../lib/contexts/AuthContext';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import { toast } from 'react-toastify';

export default function CompanyProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, api } = useAuth();
  
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [staffList, setStaffList] = useState([]);
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);
  const [userRole, setUserRole] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [logoPreview, setLogoPreview] = useState(null);
  const [selectedLogo, setSelectedLogo] = useState(null);
  
  const companyId = params.id;

  useEffect(() => {
    if (companyId) {
      fetchCompany();
      fetchStaff();
    }
  }, [companyId]);

  const fetchCompany = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Use the correct API method from the updated API client
      const response = await api.companies.getCompany(companyId);
      
      console.log('Company fetched:', response);
      
      // Get logo URL from various possible fields
      const logoUrl = response.logo || response.logoUrl || response.logoURL || response.image || response.imageUrl || response.logo?.url;
      
      setCompany({
        ...response,
        logoUrl: logoUrl || null
      });
      
      // Check user role (adjust based on your API response structure)
      const role = response.userRole || response.role || 'VIEWER';
      setUserRole(role);
      setIsOwnerOrAdmin(['OWNER', 'ADMIN'].includes(role));
    } catch (err) {
      console.error('Error fetching company:', err);
      setError(err.message || 'Failed to load company details');
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchStaff = async () => {
    try {
      // Use the correct API method from the updated API client
      const response = await api.companies.getStaff(companyId);
      console.log('Staff fetched:', response);
      setStaffList(response || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
      setStaffList([]);
    }
  };

  const handleDeleteCompany = async () => {
    try {
      // Use API request directly for delete since we don't have a specific delete method
      await api.request(`/api/v1/companies/${companyId}`, { 
        method: 'DELETE' 
      });
      
      toast.success('Company deleted successfully!');
      router.push('/companies');
    } catch (err) {
      console.error('Error deleting company:', err);
      const errorMessage = err.message || 'Failed to delete company';
      toast.error(errorMessage);
      setError(errorMessage);
    } finally {
      setShowDeleteModal(false);
    }
  };

  const handleLogoUpload = async (file) => {
    try {
      setUploadingLogo(true);
      setUploadProgress(0);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 90) {
            return prev + 10;
          }
          return prev;
        });
      }, 200);

      // Upload logo
      const response = await api.upload.uploadCompanyLogo(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Update company with new logo URL - Use logoUrl field based on company creation API
      const updateData = {
        logoUrl: response.url, // Use logoUrl instead of logo
      };
      
      console.log('Updating company logo with data:', updateData);
      
      // Update company with new logo
      await api.companies.updateCompany(companyId, updateData);
      
      // Update local state
      setCompany(prev => ({
        ...prev,
        logoUrl: response.url
      }));
      
      setLogoPreview(response.url);
      setSelectedLogo(null);
      
      toast.success('Logo updated successfully!');
      
      // Reset after 2 seconds
      setTimeout(() => {
        setUploadingLogo(false);
        setUploadProgress(0);
      }, 2000);
    } catch (error) {
      console.error('Logo upload failed:', error);
      toast.error('Failed to upload logo: ' + (error.message || 'Unknown error'));
      setUploadingLogo(false);
      setUploadProgress(0);
    }
  };

  const handleLogoSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo size should be less than 5MB');
      return;
    }
    
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error('Please select a valid image (JPEG, PNG, GIF, WebP)');
      return;
    }
    
    setSelectedLogo(file);
    
    // Create preview URL
    const reader = new FileReader();
    reader.onloadend = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const triggerLogoUpload = () => {
    if (selectedLogo) {
      handleLogoUpload(selectedLogo);
    }
  };

  const getVerificationBadge = () => {
    if (!company) return null;
    
    switch (company.verificationStatus) {
      case 'VERIFIED':
        return (
          <Badge 
            className="px-3 py-2 rounded-pill fw-medium d-flex align-items-center"
            style={{ 
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              color: 'white',
              border: 'none'
            }}
          >
            <FaCheckCircle className="me-2" />
            Verified
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge 
            className="px-3 py-2 rounded-pill fw-medium d-flex align-items-center"
            style={{ 
              background: 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)',
              color: 'white',
              border: 'none'
            }}
          >
            <FaTimesCircle className="me-2" />
            Pending Verification
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge 
            className="px-3 py-2 rounded-pill fw-medium d-flex align-items-center"
            style={{ 
              background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
              color: 'white',
              border: 'none'
            }}
          >
            <FaTimesCircle className="me-2" />
            Verification Rejected
          </Badge>
        );
      default:
        return (
          <Badge 
            className="px-3 py-2 rounded-pill fw-medium d-flex align-items-center"
            style={{ 
              background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
              color: 'white',
              border: 'none'
            }}
          >
            <FaTimesCircle className="me-2" />
            Not Verified
          </Badge>
        );
    }
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      'OWNER': 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
      'ADMIN': 'linear-gradient(135deg, #ffc107 0%, #fd7e14 100%)',
      'EDITOR': 'linear-gradient(135deg, #17a2b8 0%, #138496 100%)',
      'STAFF': 'linear-gradient(135deg, #007bff 0%, #0056b3 100%)',
      'VIEWER': 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
      'NONE': 'linear-gradient(135deg, #6c757d 0%, #495057 100%)'
    };
    
    return (
      <Badge 
        className="px-3 py-1 fw-medium"
        style={{ 
          background: roleColors[role] || roleColors['VIEWER'],
          color: 'white',
          border: 'none'
        }}
      >
        {role}
      </Badge>
    );
  };

  const refreshData = () => {
    fetchCompany();
    fetchStaff();
  };

  const handleRemoveStaff = async (staffId, userId, staffName) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove "${staffName}" from staff?\n\n` +
      `This action will revoke their access to company management.`
    );
    
    if (!confirmed) return;
    
    try {
      // Use the correct API method from the updated API client
      await api.companies.removeStaff(companyId, userId);
      toast.success(`"${staffName}" removed successfully from staff!`);
      refreshData();
    } catch (err) {
      console.error('Error removing staff:', err);
      const errorMessage = err.message || 'Failed to remove staff member';
      toast.error(errorMessage);
    }
  };

  const handleImageError = (e) => {
    e.target.style.display = 'none';
    const parent = e.target.parentElement;
    if (parent) {
      const fallback = document.createElement('div');
      fallback.className = "logo-fallback-large";
      fallback.style.cssText = `
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 48px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 20px;
      `;
      fallback.textContent = company.name ? company.name.charAt(0).toUpperCase() : 'C';
      parent.appendChild(fallback);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="py-5 text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading company details...</p>
        </Container>
      </DashboardLayout>
    );
  }

  if (error || !company) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Alert 
            variant="danger" 
            className="border-0 rounded-pill"
            style={{ 
              background: 'rgba(220, 53, 69, 0.1)', 
              border: '1px solid rgba(220, 53, 69, 0.2)' 
            }}
          >
            <FaTimesCircle className="me-2" />
            {error || 'Company not found'}
          </Alert>
          <Link href="/companies" className="btn btn-primary mt-3">
            <FaArrowLeft className="me-2" />
            Back to Companies
          </Link>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container className="py-4">
        {/* Back Button */}
        <Row className="mb-4">
          <Col>
            <Link 
              href="/companies" 
              className="text-decoration-none d-inline-flex align-items-center"
              style={{ color: '#667eea' }}
            >
              <FaArrowLeft className="me-2" />
              Back to Companies
            </Link>
          </Col>
        </Row>

        {/* Error Alert */}
        {error && (
          <Row className="mb-3">
            <Col>
              <Alert 
                variant="danger" 
                dismissible 
                onClose={() => setError('')}
                className="border-0 rounded-pill"
                style={{ 
                  background: 'rgba(220, 53, 69, 0.1)', 
                  border: '1px solid rgba(220, 53, 69, 0.2)' 
                }}
              >
                <FaTimesCircle className="me-2" />
                {error}
              </Alert>
            </Col>
          </Row>
        )}

        {/* Company Header */}
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-lg" style={{ borderRadius: '20px' }}>
              <Card.Body className="p-4">
                <Row className="align-items-center">
                  <Col lg={2} className="text-center mb-4 mb-lg-0">
                    <div className="company-logo-large mb-3 position-relative">
                      {company.logoUrl ? (
                        <img 
                          src={company.logoUrl} 
                          alt={company.name} 
                          className="logo-image"
                          onError={handleImageError}
                          loading="lazy"
                        />
                      ) : (
                        <div className="logo-placeholder-xlarge">
                          <FaBuilding size={64} />
                        </div>
                      )}
                      
                      {/* Logo Upload Overlay */}
                      {isOwnerOrAdmin && (
                        <div className="position-absolute top-0 start-0 w-100 h-100">
                          <div className="position-relative w-100 h-100">
                            <div className="position-absolute bottom-0 end-0 m-2">
                              <Button 
                                variant="primary" 
                                size="sm"
                                className="rounded-circle p-2"
                                style={{
                                  background: 'rgba(102, 126, 234, 0.9)',
                                  border: '2px solid white',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                                }}
                                onClick={() => document.getElementById('logo-upload-input').click()}
                                disabled={uploadingLogo}
                              >
                                <FaUpload size={16} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {/* Upload Progress */}
                      {uploadingLogo && (
                        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
                             style={{ background: 'rgba(0,0,0,0.7)', borderRadius: '20px' }}>
                          <div className="text-center">
                            <FaSpinner className="text-white spin mb-2" size={24} />
                            <div className="text-white small">Uploading {uploadProgress}%</div>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Logo Upload Input */}
                    <input
                      type="file"
                      id="logo-upload-input"
                      accept="image/*"
                      onChange={handleLogoSelect}
                      style={{ display: 'none' }}
                      disabled={uploadingLogo}
                    />
                    
                    {/* Selected Logo Preview and Upload Button */}
                    {selectedLogo && !uploadingLogo && (
                      <div className="mt-3">
                        <Alert variant="info" className="py-2 small mb-2">
                          <FaImage className="me-2" />
                          Selected: {selectedLogo.name}
                        </Alert>
                        <div className="d-flex gap-2 justify-content-center">
                          <Button 
                            variant="success" 
                            size="sm"
                            onClick={triggerLogoUpload}
                          >
                            <FaCloudUploadAlt className="me-2" />
                            Upload Logo
                          </Button>
                          <Button 
                            variant="outline-secondary" 
                            size="sm"
                            onClick={() => {
                              setSelectedLogo(null);
                              setLogoPreview(null);
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    
                    {/* Logo Upload Instructions */}
                    {isOwnerOrAdmin && !selectedLogo && !uploadingLogo && (
                      <small className="text-muted d-block mt-2">
                        Click the upload icon to change logo
                      </small>
                    )}
                  </Col>
                  
                  <Col lg={7} className="mb-4 mb-lg-0">
                    <div className="d-flex align-items-center mb-2">
                      <h1 className="fw-bold me-3 mb-0" style={{ color: '#2d3748' }}>
                        {company.name}
                      </h1>
                      {getVerificationBadge()}
                    </div>
                    
                    <Badge 
                      className="px-3 py-2 mb-3 rounded-pill fw-medium"
                      style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none'
                      }}
                    >
                      <FaIndustry className="me-2" />
                      {company.industry || 'N/A'}
                    </Badge>
                    
                    {company.description && (
                      <p className="text-muted mb-0">{company.description}</p>
                    )}
                    
                    {/* User Role */}
                    <div className="mt-2">
                      <Badge 
                        className="px-3 py-1"
                        style={{ 
                          background: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
                          color: 'white',
                          border: 'none'
                        }}
                      >
                        Your Role: {userRole || 'N/A'}
                      </Badge>
                    </div>
                  </Col>
                  
                  <Col lg={3} className="text-lg-end">
                    {isOwnerOrAdmin && (
                      <div className="d-flex flex-column gap-2">
                        <Button 
                          variant="primary" 
                          className="rounded-pill px-4 py-2"
                          onClick={() => setShowEditModal(true)}
                          style={{ 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none'
                          }}
                        >
                          <FaEdit className="me-2" />
                          Edit Profile
                        </Button>
                        
                        <Button 
                          variant="outline-primary" 
                          className="rounded-pill px-4 py-2"
                          onClick={() => setShowStaffModal(true)}
                        >
                          <FaUsers className="me-2" />
                          Manage Staff
                        </Button>
                        
                        {userRole === 'OWNER' && (
                          <Button 
                            variant="outline-danger" 
                            className="rounded-pill px-4 py-2"
                            onClick={() => setShowDeleteModal(true)}
                          >
                            <FaTrash className="me-2" />
                            Delete Company
                          </Button>
                        )}
                      </div>
                    )}
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Tabs Navigation */}
        <Row className="mb-4">
          <Col>
            <Card className="border-0 shadow-sm">
              <Card.Body className="p-0">
                <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                  <Nav variant="pills" className="company-tabs">
                    <Nav.Item>
                      <Nav.Link eventKey="overview">
                        <FaBuilding className="me-2" />
                        Overview
                      </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                      <Nav.Link eventKey="staff">
                        <FaUsers className="me-2" />
                        Staff
                        <Badge bg="primary" pill className="ms-2">
                          {staffList.length}
                        </Badge>
                      </Nav.Link>
                    </Nav.Item>
                    {isOwnerOrAdmin && (
                      <Nav.Item>
                        <Nav.Link eventKey="settings">
                          <FaCog className="me-2" />
                          Settings
                        </Nav.Link>
                      </Nav.Item>
                    )}
                  </Nav>
                </Tab.Container>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Tab Content */}
        <Tab.Container activeKey={activeTab}>
          <Tab.Content>
            {/* Overview Tab */}
            <Tab.Pane eventKey="overview">
              <Row>
                <Col lg={8}>
                  {/* Company Details */}
                  <Card className="border-0 shadow-sm mb-4">
                    <Card.Header className="bg-transparent border-0">
                      <h5 className="fw-semibold mb-0">Company Details</h5>
                    </Card.Header>
                    <Card.Body>
                      <Row>
                        <Col md={6} className="mb-4">
                          <div className="detail-card p-3 rounded">
                            <div className="d-flex align-items-center mb-3">
                              <div className="detail-icon me-3">
                                <FaEnvelope className="text-primary" />
                              </div>
                              <div>
                                <div className="fw-medium text-muted small">Email</div>
                                <div className="fw-semibold">{company.email}</div>
                              </div>
                            </div>
                          </div>
                        </Col>
                        
                        <Col md={6} className="mb-4">
                          <div className="detail-card p-3 rounded">
                            <div className="d-flex align-items-center mb-3">
                              <div className="detail-icon me-3">
                                <FaPhone className="text-success" />
                              </div>
                              <div>
                                <div className="fw-medium text-muted small">Phone</div>
                                <div className="fw-semibold">{company.phone || 'Not provided'}</div>
                              </div>
                            </div>
                          </div>
                        </Col>
                        
                        <Col md={6} className="mb-4">
                          <div className="detail-card p-3 rounded">
                            <div className="d-flex align-items-center mb-3">
                              <div className="detail-icon me-3">
                                <FaGlobe className="text-info" />
                              </div>
                              <div>
                                <div className="fw-medium text-muted small">Website</div>
                                <div className="fw-semibold">
                                  {company.website ? (
                                    <a 
                                      href={company.website} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-decoration-none"
                                    >
                                      {company.website}
                                    </a>
                                  ) : 'Not provided'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Col>
                        
                        <Col md={6} className="mb-4">
                          <div className="detail-card p-3 rounded">
                            <div className="d-flex align-items-center mb-3">
                              <div className="detail-icon me-3">
                                <FaCalendarAlt className="text-warning" />
                              </div>
                              <div>
                                <div className="fw-medium text-muted small">Member Since</div>
                                <div className="fw-semibold">
                                  {company.createdAt ? new Date(company.createdAt).toLocaleDateString() : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </Col>
                      </Row>
                      
                      {/* Contact Person */}
                      {company.contactName && (
                        <div className="mt-4 pt-4 border-top">
                          <h6 className="fw-semibold mb-3">Contact Person</h6>
                          <Card className="border-0" style={{ background: '#f8f9fa' }}>
                            <Card.Body>
                              <Row>
                                <Col md={6}>
                                  <div className="mb-3">
                                    <div className="fw-medium text-muted small">Name</div>
                                    <div className="fw-semibold">{company.contactName}</div>
                                  </div>
                                </Col>
                                <Col md={6}>
                                  <div className="mb-3">
                                    <div className="fw-medium text-muted small">Email</div>
                                    <div className="fw-semibold">{company.contactEmail || 'Not provided'}</div>
                                  </div>
                                </Col>
                                {company.contactPhone && (
                                  <Col md={6}>
                                    <div className="mb-3">
                                      <div className="fw-medium text-muted small">Phone</div>
                                      <div className="fw-semibold">{company.contactPhone}</div>
                                    </div>
                                  </Col>
                                )}
                              </Row>
                            </Card.Body>
                          </Card>
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </Col>
                
                <Col lg={4}>
                  {/* Verification Status */}
                  <Card className="border-0 shadow-sm mb-4">
                    <Card.Header className="bg-transparent border-0">
                      <h5 className="fw-semibold mb-0">Verification Status</h5>
                    </Card.Header>
                    <Card.Body>
                      <div className="verification-status">
                        <div className="status-item mb-3">
                          <div className="d-flex align-items-center">
                            <div className={`status-indicator me-3 ${company.isVerified ? 'verified' : 'pending'}`}>
                              {company.isVerified ? <FaCheckCircle /> : <FaTimesCircle />}
                            </div>
                            <div>
                              <div className="fw-medium">Account Verified</div>
                              <div className="small text-muted">
                                {company.isVerified ? 'Verified account' : 'Pending verification'}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="status-item mb-3">
                          <div className="d-flex align-items-center">
                            <div className={`status-indicator me-3 ${company.verificationStatus === 'VERIFIED' ? 'verified' : 'pending'}`}>
                              {company.verificationStatus === 'VERIFIED' ? <FaCheckCircle /> : <FaTimesCircle />}
                            </div>
                            <div>
                              <div className="fw-medium">Business Verification</div>
                              <div className="small text-muted">
                                {company.verificationStatus === 'VERIFIED' ? 'Business verified' : 
                                 company.verificationStatus === 'PENDING' ? 'Under review' : 
                                 company.verificationStatus === 'REJECTED' ? 'Rejected' : 'Not verified'}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {isOwnerOrAdmin && company.verificationStatus !== 'VERIFIED' && (
                        <Alert variant="info" className="mt-3 border-0" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
                          <FaShieldAlt className="me-2" />
                          <span className="fw-medium">Get verified to build trust with customers.</span>
                        </Alert>
                      )}
                    </Card.Body>
                  </Card>

                  {/* Quick Stats */}
                  <Card className="border-0 shadow-sm">
                    <Card.Header className="bg-transparent border-0">
                      <h5 className="fw-semibold mb-0">Quick Stats</h5>
                    </Card.Header>
                    <Card.Body>
                      <div className="stats-grid">
                        <div className="stat-box text-center p-3 rounded">
                          <div className="stat-value fw-bold" style={{ color: '#667eea' }}>
                            {staffList.length}
                          </div>
                          <div className="stat-label small text-muted">Staff Members</div>
                        </div>
                        <div className="stat-box text-center p-3 rounded">
                          <div className="stat-value fw-bold" style={{ color: '#28a745' }}>
                            {staffList.filter(s => s.isActive).length}
                          </div>
                          <div className="stat-label small text-muted">Active Staff</div>
                        </div>
                        <div className="stat-box text-center p-3 rounded">
                          <div className="stat-value fw-bold" style={{ color: '#6c757d' }}>
                            {staffList.filter(s => s.role === 'ADMIN' || s.role === 'OWNER').length}
                          </div>
                          <div className="stat-label small text-muted">Admins</div>
                        </div>
                        <div className="stat-box text-center p-3 rounded">
                          <div className="stat-value fw-bold" style={{ color: '#17a2b8' }}>
                            {staffList.filter(s => s.role === 'EDITOR').length}
                          </div>
                          <div className="stat-label small text-muted">Editors</div>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              </Row>
            </Tab.Pane>

            {/* Staff Tab */}
            <Tab.Pane eventKey="staff">
              <Card className="border-0 shadow-sm">
                <Card.Header className="bg-transparent border-0">
                  <div className="d-flex justify-content-between align-items-center">
                    <h5 className="fw-semibold mb-0">Staff Members</h5>
                    {isOwnerOrAdmin && (
                      <Button 
                        variant="primary" 
                        size="sm"
                        onClick={() => setShowStaffModal(true)}
                        style={{ 
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          border: 'none'
                        }}
                      >
                        <FaPlus className="me-2" />
                        Add Staff
                      </Button>
                    )}
                  </div>
                </Card.Header>
                <Card.Body>
                  {staffList.length === 0 ? (
                    <div className="text-center py-5">
                      <FaUsers size={48} className="text-muted mb-3" />
                      <h5 className="fw-semibold mb-2">No Staff Members</h5>
                      <p className="text-muted mb-4">Add staff members to collaborate on company management</p>
                      {isOwnerOrAdmin && (
                        <Button 
                          variant="primary"
                          onClick={() => setShowStaffModal(true)}
                          style={{ 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            border: 'none'
                          }}
                        >
                          <FaPlus className="me-2" />
                          Add First Staff Member
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover">
                        <thead>
                          <tr>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Joined</th>
                            {isOwnerOrAdmin && <th>Actions</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {staffList.map((staff) => (
                            <tr key={staff.id || staff.userId}>
                              <td>
                                <div className="d-flex align-items-center">
                                  <div className="avatar-circle-small me-3">
                                    <span className="avatar-text-small">
                                      {staff.userDisplayName?.charAt(0) || staff.userEmail?.charAt(0) || 'U'}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="fw-medium">{staff.userDisplayName || 'Unknown'}</div>
                                    {staff.userId === user?.id && (
                                      <small className="text-primary">(You)</small>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td>{staff.userEmail || 'N/A'}</td>
                              <td>{getRoleBadge(staff.role)}</td>
                              <td>
                                <Badge bg={staff.isActive ? 'success' : 'secondary'} pill>
                                  {staff.isActive ? 'Active' : 'Inactive'}
                                </Badge>
                              </td>
                              <td>{staff.joinedAt ? new Date(staff.joinedAt).toLocaleDateString() : 'N/A'}</td>
                              {isOwnerOrAdmin && staff.role !== 'OWNER' && staff.userId !== user?.id && (
                                <td>
                                  <Button 
                                    variant="outline-danger" 
                                    size="sm"
                                    onClick={() => handleRemoveStaff(staff.id, staff.userId, staff.userDisplayName || staff.userEmail)}
                                    title="Remove Staff"
                                  >
                                    <FaTrash />
                                  </Button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Tab.Pane>

            {/* Settings Tab */}
            {isOwnerOrAdmin && (
              <Tab.Pane eventKey="settings">
                <Card className="border-0 shadow-sm">
                  <Card.Header className="bg-transparent border-0">
                    <h5 className="fw-semibold mb-0">Company Settings</h5>
                  </Card.Header>
                  <Card.Body>
                    <div className="settings-list">
                      <div className="setting-item mb-4 p-3 rounded border">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className="d-flex align-items-center">
                            <FaShieldAlt className="text-primary me-3" />
                            <div>
                              <div className="fw-medium">Verification</div>
                              <div className="small text-muted">Submit documents for business verification</div>
                            </div>
                          </div>
                          <Button variant="outline-primary" size="sm">
                            Submit Documents
                          </Button>
                        </div>
                      </div>
                      
                      <div className="setting-item mb-4 p-3 rounded border">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className="d-flex align-items-center">
                            <FaUsers className="text-warning me-3" />
                            <div>
                              <div className="fw-medium">Staff Management</div>
                              <div className="small text-muted">Add or remove staff members</div>
                            </div>
                          </div>
                          <Button 
                            variant="outline-warning" 
                            size="sm"
                            onClick={() => setShowStaffModal(true)}
                          >
                            Manage Staff
                          </Button>
                        </div>
                      </div>
                      
                      <div className="setting-item mb-4 p-3 rounded border">
                        <div className="d-flex align-items-center justify-content-between mb-2">
                          <div className="d-flex align-items-center">
                            <FaFileAlt className="text-success me-3" />
                            <div>
                              <div className="fw-medium">Documents</div>
                              <div className="small text-muted">Upload company documents and certificates</div>
                            </div>
                          </div>
                          <Button variant="outline-success" size="sm">
                            Upload Documents
                          </Button>
                        </div>
                      </div>
                      
                      {userRole === 'OWNER' && (
                        <div className="setting-item p-3 rounded border">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="d-flex align-items-center">
                              <FaTrash className="text-danger me-3" />
                              <div>
                                <div className="fw-medium">Delete Company</div>
                                <div className="small text-muted">Permanently delete this company and all data</div>
                              </div>
                            </div>
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => setShowDeleteModal(true)}
                            >
                              Delete Company
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card.Body>
                </Card>
              </Tab.Pane>
            )}
          </Tab.Content>
        </Tab.Container>

        {/* Edit Company Modal */}
        <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered size="lg">
          <EditCompanyModal 
            company={company}
            onClose={() => {
              setShowEditModal(false);
              refreshData();
            }}
          />
        </Modal>

        {/* Manage Staff Modal */}
        <Modal show={showStaffModal} onHide={() => setShowStaffModal(false)} centered size="lg">
          <ManageStaffModal 
            companyId={companyId}
            companyName={company.name}
            staffList={staffList}
            onClose={() => {
              setShowStaffModal(false);
              refreshData();
            }}
          />
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
          <Modal.Header closeButton>
            <Modal.Title>Delete Company</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="danger" className="border-0">
              <FaTrash className="me-2" />
              <strong>Warning:</strong> This action cannot be undone. All company data will be permanently deleted.
            </Alert>
            <p className="text-muted">
              Are you sure you want to delete <strong>{company.name}</strong>? This will remove all staff associations and company data.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteCompany}>
              Delete Company
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>

      <style jsx>{`
        .company-logo-large {
          width: 120px;
          height: 120px;
          border-radius: 20px;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          border: 3px solid #e9ecef;
          overflow: hidden;
          position: relative;
        }
        
        .logo-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 20px;
        }
        
        .logo-placeholder-xlarge {
          color: #667eea;
          font-size: 64px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
        }
        
        .company-tabs {
          padding: 1rem 1rem 0;
          border-bottom: 1px solid #e9ecef;
        }
        
        .company-tabs .nav-link {
          border: none;
          color: #6c757d;
          font-weight: 500;
          padding: 0.75rem 1.5rem;
          margin-bottom: -1px;
          border-radius: 12px 12px 0 0;
        }
        
        .company-tabs .nav-link.active {
          color: #667eea;
          background-color: white;
          border-bottom: 3px solid #667eea;
        }
        
        .company-tabs .nav-link:hover:not(.active) {
          color: #667eea;
          background-color: rgba(102, 126, 234, 0.1);
        }
        
        .detail-card {
          background: white;
          border: 1px solid #e9ecef;
          transition: all 0.3s ease;
        }
        
        .detail-card:hover {
          border-color: #667eea;
          box-shadow: 0 5px 15px rgba(102, 126, 234, 0.1);
        }
        
        .detail-icon {
          width: 40px;
          height: 40px;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .verification-status .status-indicator {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
        }
        
        .verification-status .status-indicator.verified {
          background: rgba(40, 167, 69, 0.1);
          color: #28a745;
        }
        
        .verification-status .status-indicator.pending {
          background: rgba(255, 193, 7, 0.1);
          color: #ffc107;
        }
        
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
        }
        
        .stat-box {
          background: white;
          border: 1px solid #e9ecef;
          transition: all 0.3s ease;
        }
        
        .stat-box:hover {
          transform: translateY(-3px);
          box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
          border-color: #667eea;
        }
        
        .avatar-circle-small {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .avatar-text-small {
          color: white;
          font-weight: bold;
          font-size: 0.875rem;
        }
        
        .settings-list .setting-item {
          background: white;
          border: 1px solid #e9ecef;
          transition: all 0.3s ease;
        }
        
        .settings-list .setting-item:hover {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.02);
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        .logo-fallback-large {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 48px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
        }
        
        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .company-logo-large {
            width: 100px;
            height: 100px;
          }
          
          .logo-placeholder-xlarge {
            font-size: 48px;
          }
          
          .company-tabs .nav-link {
            padding: 0.5rem 1rem;
            font-size: 0.9rem;
          }
          
          .stats-grid {
            grid-template-columns: 1fr;
          }
        }
        
        @media (max-width: 576px) {
          .company-logo-large {
            width: 80px;
            height: 80px;
          }
          
          .logo-placeholder-xlarge {
            font-size: 32px;
          }
          
          .company-tabs {
            flex-direction: column;
          }
          
          .company-tabs .nav-link {
            width: 100%;
            text-align: center;
            margin-bottom: 0.5rem;
            border-radius: 12px;
          }
          
          .company-tabs .nav-link.active {
            border-bottom: 3px solid #667eea;
            border-radius: 12px;
          }
        }
        
        * {
          transition: all 0.2s ease;
        }
      `}</style>
    </DashboardLayout>
  );
}

// Edit Company Modal Component
function EditCompanyModal({ company, onClose }) {
  const [formData, setFormData] = useState({
    name: company.name || '',
    email: company.email || '',
    phone: company.phone || '',
    website: company.website || '',
    industry: company.industry || '',
    description: company.description || '',
    contactName: company.contactName || '',
    contactEmail: company.contactEmail || '',
    contactPhone: company.contactPhone || '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { api } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Prepare update data - Use logoUrl field for logo based on API response
      const updateData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        industry: formData.industry.trim(),
        description: formData.description?.trim() || '',
        contactName: formData.contactName.trim(),
        contactEmail: formData.contactEmail.trim().toLowerCase(),
        // Optional fields - only include if they have values
        ...(formData.phone?.trim() && { phone: formData.phone.trim() }),
        ...(formData.website?.trim() && { website: formData.website.trim() }),
        ...(formData.contactPhone?.trim() && { contactPhone: formData.contactPhone.trim() }),
        // Include logoUrl if it exists in the original company
        ...(company.logoUrl && { logoUrl: company.logoUrl }),
      };

      console.log('Updating company with data:', updateData);

      // Use the correct API method from the updated API client
      const response = await api.companies.updateCompany(company.id, updateData);
      
      console.log('Company updated successfully:', response);
      
      toast.success('Company updated successfully!');
      onClose();
    } catch (err) {
      console.error('Error updating company:', err);
      const errorMessage = err.message || 'Failed to update company. Please try again.';
      
      toast.error(errorMessage);
      setErrors({ 
        submit: errorMessage 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  return (
    <>
      <Modal.Header closeButton>
        <Modal.Title>Edit Company</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {errors.submit && (
          <Alert variant="danger" dismissible onClose={() => setErrors({})}>
            {errors.submit}
          </Alert>
        )}

        <Form onSubmit={handleSubmit}>
          {/* Company Name */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-medium mb-2">Company Name *</Form.Label>
            <Form.Control
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              isInvalid={!!errors.name}
              required
            />
          </Form.Group>

          {/* Company Email */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-medium mb-2">Company Email *</Form.Label>
            <Form.Control
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              isInvalid={!!errors.email}
              required
            />
          </Form.Group>

          {/* Industry */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-medium mb-2">Industry *</Form.Label>
            <Form.Select
              value={formData.industry}
              onChange={(e) => handleInputChange('industry', e.target.value)}
              isInvalid={!!errors.industry}
              required
            >
              <option value="">Select Industry</option>
              <option value="Technology">Technology</option>
              <option value="Finance">Finance</option>
              <option value="Healthcare">Healthcare</option>
              <option value="E-commerce">E-commerce</option>
              <option value="Education">Education</option>
              <option value="Retail">Retail</option>
              <option value="Manufacturing">Manufacturing</option>
              <option value="Other">Other</option>
            </Form.Select>
          </Form.Group>

          {/* Description */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-medium mb-2">Description</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
            />
          </Form.Group>

          {/* Contact Name */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-medium mb-2">Contact Person Name *</Form.Label>
            <Form.Control
              type="text"
              value={formData.contactName}
              onChange={(e) => handleInputChange('contactName', e.target.value)}
              isInvalid={!!errors.contactName}
              required
            />
          </Form.Group>

          {/* Contact Email */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-medium mb-2">Contact Email *</Form.Label>
            <Form.Control
              type="email"
              value={formData.contactEmail}
              onChange={(e) => handleInputChange('contactEmail', e.target.value)}
              isInvalid={!!errors.contactEmail}
              required
            />
          </Form.Group>

          {/* Contact Phone */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-medium mb-2">Contact Phone</Form.Label>
            <Form.Control
              type="tel"
              placeholder="+1234567890"
              value={formData.contactPhone}
              onChange={(e) => handleInputChange('contactPhone', e.target.value)}
            />
          </Form.Group>

          {/* Website */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-medium mb-2">Company Website</Form.Label>
            <Form.Control
              type="url"
              placeholder="https://example.com"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
            />
          </Form.Group>

          {/* Phone */}
          <Form.Group className="mb-4">
            <Form.Label className="fw-medium mb-2">Company Phone</Form.Label>
            <Form.Control
              type="tel"
              placeholder="+1234567890"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit}
          disabled={loading}
          style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none'
          }}
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </Button>
      </Modal.Footer>
    </>
  );
}

// IMPORTANT: DO NOT INCLUDE THE OLD ManageStaffModal FUNCTION HERE
// It is now in a separate file: ./ManageStaffModal.js