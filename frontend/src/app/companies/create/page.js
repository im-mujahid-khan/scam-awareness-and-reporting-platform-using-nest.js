'use client';

import { useState, useRef } from 'react';
import { 
  Container, 
  Row, 
  Col, 
  Card, 
  Form, 
  Button, 
  Alert, 
  Badge,
  ProgressBar,
  Spinner,
  ListGroup,
  Modal
} from 'react-bootstrap';
import { 
  FaBuilding, 
  FaEnvelope, 
  FaPhone, 
  FaGlobe, 
  FaUser, 
  FaArrowRight, 
  FaUpload, 
  FaIndustry,
  FaInfoCircle,
  FaCheck,
  FaTimes,
  FaTrash,
  FaSpinner,
  FaCloudUploadAlt,
  FaExclamationTriangle,
  FaTimesCircle,
  FaEye,
  FaImage,
  FaFileAlt,
  FaPaperclip,
  FaPlus,
  FaLink,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFileImage
} from 'react-icons/fa';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../../lib/contexts/AuthContext';
import DashboardLayout from '../../../../components/layout/DashboardLayout';
import { toast } from 'react-toastify';

export default function CreateCompanyPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    website: '',
    industry: '',
    description: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  
  // Logo state
  const [selectedLogo, setSelectedLogo] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoUploadProgress, setLogoUploadProgress] = useState(0);
  const [logoUploadStatus, setLogoUploadStatus] = useState('idle');
  const [uploadedLogoData, setUploadedLogoData] = useState(null);
  
  // Verification documents state
  const [verificationDocs, setVerificationDocs] = useState([]);
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [showDocPreview, setShowDocPreview] = useState(false);
  const [selectedDocPreview, setSelectedDocPreview] = useState(null);
  const [activeUploads, setActiveUploads] = useState(0); // Add this line
  
  const logoFileInputRef = useRef(null);
  const docFileInputRef = useRef(null);
  const router = useRouter();
  const { api } = useAuth();

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name) newErrors.name = 'Company name is required';
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.industry) newErrors.industry = 'Industry is required';
    return newErrors;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (!formData.contactName) newErrors.contactName = 'Contact name is required';
    if (!formData.contactEmail) newErrors.contactEmail = 'Contact email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.contactEmail)) newErrors.contactEmail = 'Contact email is invalid';
    return newErrors;
  };

  const nextStep = () => {
    const stepErrors = step === 1 ? validateStep1() : validateStep2();
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setStep(step + 1);
    setErrors({});
  };

  const prevStep = () => {
    setStep(step - 1);
    setErrors({});
  };

  const getFileIcon = (fileType) => {
    if (fileType.includes('pdf')) return <FaFilePdf className="text-danger" />;
    if (fileType.includes('word') || fileType.includes('doc')) return <FaFileWord className="text-primary" />;
    if (fileType.includes('excel') || fileType.includes('sheet')) return <FaFileExcel className="text-success" />;
    if (fileType.includes('image')) return <FaFileImage className="text-warning" />;
    return <FaFileAlt className="text-muted" />;
  };

  const handleLogoSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, logo: 'Logo size should be less than 5MB' }));
        return;
      }
      
      // Check file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, logo: 'Please select a valid image (JPEG, PNG, GIF, WebP)' }));
        return;
      }
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result);
        setSelectedLogo(file);
      };
      reader.readAsDataURL(file);
      
      // Clear any previous errors
      setErrors(prev => ({ ...prev, logo: null }));
      
      // Auto-upload the file
      await uploadLogoFile(file);
    } catch (error) {
      console.error('Error processing logo:', error);
      setErrors(prev => ({ ...prev, logo: 'Failed to process image' }));
    }
  };

  const uploadLogoFile = async (file) => {
    try {
      setUploadingLogo(true);
      setLogoUploadStatus('uploading');
      setLogoUploadProgress(0);
      
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setLogoUploadProgress(prev => {
          if (prev < 90) {
            return prev + 10;
          }
          return prev;
        });
      }, 200);

      // Upload logo using the company-logo endpoint
      const response = await api.upload.uploadCompanyLogo(formData);
      
      clearInterval(progressInterval);
      setLogoUploadProgress(100);
      setLogoUploadStatus('success');
      
      // Store uploaded logo data
      setUploadedLogoData(response);
      
      toast.success('Logo uploaded successfully!');
    } catch (error) {
      console.error('Logo upload failed:', error);
      setLogoUploadStatus('error');
      setErrors(prev => ({ 
        ...prev, 
        logo: error.message || 'Failed to upload logo' 
      }));
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDocSelect = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    // Filter valid files
    const validFiles = files.filter(file => {
      const maxSize = 10 * 1024 * 1024; // 10MB
      const validTypes = [
        'application/pdf',
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];

      if (file.size > maxSize) {
        toast.error(`File "${file.name}" exceeds 10MB limit`);
        return false;
      }

      if (!validTypes.includes(file.type)) {
        toast.error(`File "${file.name}" has unsupported format`);
        return false;
      }

      return true;
    });

    if (validFiles.length === 0) return;

    // Upload files in parallel but track progress separately
    setUploadingDocs(true);
    
    // Use Promise.allSettled to handle all uploads regardless of individual failures
    const uploadPromises = validFiles.map(file => uploadDocumentFile(file));
    
    try {
      await Promise.allSettled(uploadPromises);
    } finally {
      setUploadingDocs(false);
      // Clear file input
      if (docFileInputRef.current) {
        docFileInputRef.current.value = '';
      }
    }
  };

const uploadDocumentFile = async (file) => {
  const docId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Create temporary document object
  const tempDoc = {
    id: docId,
    name: file.name,
    type: file.type,
    size: file.size,
    status: 'uploading',
    progress: 0,
    file: file
  };
  
  // Add to state immediately
  setVerificationDocs(prev => [...prev, tempDoc]);
  setActiveUploads(prev => prev + 1);
  
  // Track interval locally
  let progressInterval = null;
  
  try {
    // Start progress simulation (0-80%)
    progressInterval = setInterval(() => {
      setVerificationDocs(prev => 
        prev.map(doc => {
          if (doc.id === docId && doc.progress < 80) {
            // Increment by 10% every second
            const newProgress = Math.min(doc.progress + 10, 80);
            return { ...doc, progress: newProgress };
          }
          return doc;
        })
      );
    }, 1000);
    
    const formData = new FormData();
    formData.append('file', file);
    
    console.log('Uploading document:', file.name, 'Type:', file.type);
    console.log('Using company-media endpoint for document upload');
    
    // IMPORTANT: Use company-media endpoint for verification documents
    // This endpoint should accept all file types including documents
    const uploadPromise = api.upload.uploadCompanyLogo(formData); // Changed from uploadReportEvidence
    
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Upload timeout after 30 seconds')), 30000);
    });
    
    const response = await Promise.race([uploadPromise, timeoutPromise]);
    console.log('Upload completed:', response);
    
    // Clear interval
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    
    // Update to 100% and success status
    setVerificationDocs(prev => 
      prev.map(doc => 
        doc.id === docId 
          ? { 
              ...doc, 
              status: 'success', 
              progress: 100,
              url: response.url || response.imageUrl || response.fileUrl,
              uploadedData: response
            }
          : doc
      )
    );
    
    toast.success(`"${file.name}" uploaded successfully!`);
    return response;
  } catch (error) {
    console.error('Document upload failed:', error);
    
    // Clear interval if exists
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }
    
    // Update with error status
    setVerificationDocs(prev => 
      prev.map(doc => 
        doc.id === docId 
          ? { 
              ...doc, 
              status: 'error', 
              progress: 0,
              error: error.message || 'Upload failed'
            }
          : doc
      )
    );
    
    // Check if it's a file type error
    if (error.message && error.message.includes('expected type')) {
      toast.error(`File type not supported: ${file.name}. Please use images or documents.`);
    } else {
      toast.error(`Failed to upload "${file.name}": ${error.message || 'Unknown error'}`);
    }
    throw error;
  } finally {
    setActiveUploads(prev => Math.max(0, prev - 1));
  }
};

  const retryLogoUpload = async () => {
    if (!selectedLogo) {
      toast.error('No logo selected');
      return;
    }
    
    await uploadLogoFile(selectedLogo);
  };

  const retryDocUpload = async (doc) => {
    // Remove the old doc from state
    setVerificationDocs(prev => prev.filter(d => d.id !== doc.id));
    
    // Re-upload with the original file
    if (doc.file) {
      await uploadDocumentFile(doc.file);
    } else {
      toast.error('Original file not found for retry');
    }
  };

  const handleRemoveLogo = () => {
    setSelectedLogo(null);
    setLogoPreview(null);
    setUploadedLogoData(null);
    setLogoUploadStatus('idle');
    setLogoUploadProgress(0);
    setErrors(prev => ({ ...prev, logo: null }));
    
    if (logoFileInputRef.current) {
      logoFileInputRef.current.value = '';
    }
  };

  const handleRemoveDoc = (docId) => {
    setVerificationDocs(prev => prev.filter(doc => doc.id !== docId));
  };

  const handleViewDoc = (doc) => {
    if (doc.url) {
      window.open(doc.url, '_blank');
    } else if (doc.file) {
      // Create object URL for local preview
      const url = URL.createObjectURL(doc.file);
      setSelectedDocPreview(url);
      setShowDocPreview(true);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const triggerLogoFileInput = () => {
    if (logoFileInputRef.current) {
      logoFileInputRef.current.click();
    }
  };

  const triggerDocFileInput = () => {
    if (docFileInputRef.current) {
      docFileInputRef.current.click();
    }
  };

  const getLogoUploadStatusBadge = () => {
    switch (logoUploadStatus) {
      case 'uploading':
        return (
          <Badge bg="info" className="px-2 py-1" style={{ fontSize: '0.7rem' }}>
            <FaCloudUploadAlt className="me-1" /> Uploading {logoUploadProgress}%
          </Badge>
        );
      case 'success':
        return (
          <Badge bg="success" className="px-2 py-1" style={{ fontSize: '0.7rem' }}>
            <FaCheck className="me-1" /> Uploaded
          </Badge>
        );
      case 'error':
        return (
          <Badge bg="danger" className="px-2 py-1" style={{ fontSize: '0.7rem' }}>
            <FaExclamationTriangle className="me-1" /> Upload Failed
          </Badge>
        );
      default:
        return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step !== 3) {
      nextStep();
      return;
    }

    // Check if logo is still uploading
    if (selectedLogo && logoUploadStatus === 'uploading') {
      toast.error('Please wait for logo to finish uploading');
      return;
    }

    // Check if any documents are still uploading
    const uploadingDocsExist = verificationDocs.some(doc => doc.status === 'uploading');
    if (uploadingDocsExist) {
      toast.error('Please wait for all documents to finish uploading');
      return;
    }

    setLoading(true);
    
    try {
      // Prepare company data - INCLUDE logoUrl from uploadedLogoData
      // AND verificationDocs array from uploaded documents
      const companyData = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        industry: formData.industry.trim(),
        description: formData.description?.trim() || '',
        contactName: formData.contactName.trim(),
        contactEmail: formData.contactEmail.trim().toLowerCase(),
        // Include logoUrl if uploaded
        ...(uploadedLogoData?.url && { logoUrl: uploadedLogoData.url }),
        // Include verificationDocs array (only successfully uploaded docs with URLs)
        verificationDocs: verificationDocs
          .filter(doc => doc.status === 'success' && doc.url)
          .map(doc => doc.url),
        // Optional fields
        ...(formData.phone?.trim() && { phone: formData.phone.trim() }),
        ...(formData.website?.trim() && { website: formData.website.trim() }),
        ...(formData.contactPhone?.trim() && { contactPhone: formData.contactPhone.trim() }),
      };

      console.log('Creating company with data:', companyData);
      console.log('Logo URL to be sent:', uploadedLogoData?.url);
      console.log('Verification docs to be sent:', companyData.verificationDocs);

      // Create company with logo URL and verification docs
      const response = await api.companies.createCompany(companyData);
      
      console.log('Company created successfully:', response);
      
      toast.success('Company created successfully!');
      
      if (response.id) {
        router.push(`/companies/${response.id}`);
      } else {
        router.push('/companies');
      }
    } catch (err) {
      console.error('Create company error:', err);
      const errorMessage = err.message || 
                         'Failed to create company. Please try again.';
      
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
    <DashboardLayout>
      <Container className="py-4">
        <Row className="mb-4">
          <Col>
            <Link 
              href="/companies/me" 
              className="text-decoration-none d-inline-flex align-items-center"
              style={{ color: '#667eea' }}
            >
              ← Back to Companies
            </Link>
          </Col>
        </Row>

        <Row className="justify-content-center">
          <Col xl={8} lg={10}>
            {/* Header */}
            <div className="text-center mb-4">
              <div className="logo-container mb-3">
                <div className="avatar-circle mx-auto mb-3">
                  <FaBuilding className="avatar-icon" />
                </div>
              </div>
              <h1 className="fw-bold mb-2" style={{ color: '#2d3748' }}>Register Your Company</h1>
              <p className="text-muted mb-0" style={{ fontSize: '1rem' }}>Join our platform to protect your business and customers</p>
              
              {/* Progress Steps */}
              <div className="d-flex justify-content-center align-items-center mb-4 mt-4">
                {[1, 2, 3].map((stepNum) => (
                  <div key={stepNum} className="d-flex align-items-center">
                    <div 
                      className={`rounded-circle d-flex align-items-center justify-content-center ${step > stepNum ? 'bg-primary' : step === stepNum ? 'bg-primary' : 'bg-light'}`}
                      style={{
                        width: '40px',
                        height: '40px',
                        color: step > stepNum || step === stepNum ? 'white' : '#6c757d',
                        border: step === stepNum ? '3px solid #667eea' : 'none',
                        fontWeight: 'bold',
                        background: step > stepNum || step === stepNum ? 
                          'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#f8f9fa'
                      }}
                    >
                      {stepNum}
                    </div>
                    {stepNum < 3 && (
                      <div 
                        className={`mx-2 ${step > stepNum ? 'bg-primary' : 'bg-light'}`}
                        style={{ 
                          height: '3px', 
                          width: '60px',
                          background: step > stepNum ? 
                            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : '#e9ecef'
                        }}
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="d-flex justify-content-between px-5 mt-2">
                <small className="text-muted">Basic Info</small>
                <small className="text-muted">Contact Details</small>
                <small className="text-muted">Review</small>
              </div>
            </div>

            <Card 
              className="border-0 shadow-lg" 
              style={{ 
                borderRadius: '24px',
                background: '#ffffff'
              }}
            >
              <Card.Body className="p-4 p-md-5">
                {errors.submit && (
                  <Alert 
                    variant="danger" 
                    dismissible 
                    onClose={() => setErrors(prev => ({ ...prev, submit: null }))}
                    className="rounded-pill border-0 mb-4"
                    style={{ 
                      background: 'rgba(220, 53, 69, 0.1)', 
                      border: '1px solid rgba(220, 53, 69, 0.2)' 
                    }}
                  >
                    <div className="d-flex align-items-center">
                      <FaTimes className="me-2" />
                      <span className="fw-medium">{errors.submit}</span>
                    </div>
                  </Alert>
                )}

                <Form onSubmit={handleSubmit}>
                  {step === 1 && (
                    <>
                      {/* Company Logo Upload Section */}
                      <div className="text-center mb-4">
                        <h6 className="fw-semibold mb-3">Company Logo</h6>
                        <div className="position-relative d-inline-block mb-3">
                          <div className="company-logo-preview">
                            {uploadingLogo ? (
                              <div className="d-flex flex-column align-items-center justify-content-center h-100">
                                <FaSpinner className="text-primary mb-2 spin" size={24} />
                                <small className="text-muted">Uploading...</small>
                              </div>
                            ) : logoPreview ? (
                              <img 
                                src={logoPreview} 
                                alt="Logo Preview" 
                                className="logo-image"
                              />
                            ) : (
                              <div className="logo-placeholder d-flex flex-column align-items-center justify-content-center">
                                <FaImage size={48} className="text-muted mb-2" />
                                <small className="text-muted text-center">No logo selected</small>
                              </div>
                            )}
                          </div>
                          
                          {/* Upload Status Display */}
                          <div className="d-flex justify-content-center align-items-center gap-2 mt-3 mb-3">
                            {getLogoUploadStatusBadge()}
                          </div>
                          
                          {/* Upload Progress Bar */}
                          {logoUploadStatus === 'uploading' && (
                            <div className="w-100 mb-3" style={{ maxWidth: '300px', margin: '0 auto' }}>
                              <ProgressBar 
                                now={logoUploadProgress} 
                                label={`${logoUploadProgress}%`}
                                className="mt-1"
                                style={{ height: '6px' }}
                              />
                            </div>
                          )}
                          
                          {/* Upload Error Message */}
                          {logoUploadStatus === 'error' && (
                            <div className="mb-3">
                              <Alert variant="danger" className="py-2 mb-0 small">
                                <small>
                                  <FaExclamationTriangle className="me-1" />
                                  Upload failed. 
                                  <Button 
                                    variant="link" 
                                    size="sm" 
                                    className="p-0 ms-1"
                                    onClick={retryLogoUpload}
                                  >
                                    Retry
                                  </Button>
                                </small>
                              </Alert>
                            </div>
                          )}
                          
                          <div className="d-flex justify-content-center gap-2 mt-3">
                            <label htmlFor="logo-upload" className="btn btn-sm btn-primary">
                              <FaUpload className="me-2" />
                              {uploadedLogoData ? 'Change Logo' : 'Upload Logo'}
                            </label>
                            
                            {logoPreview && (
                              <Button 
                                variant="outline-danger" 
                                size="sm"
                                onClick={handleRemoveLogo}
                                disabled={uploadingLogo}
                              >
                                <FaTrash className="me-2" />
                                Remove
                              </Button>
                            )}
                          </div>
                          
                          <input
                            ref={logoFileInputRef}
                            type="file"
                            id="logo-upload"
                            accept="image/*"
                            onChange={handleLogoSelect}
                            style={{ display: 'none' }}
                            disabled={uploadingLogo}
                          />
                          
                          {errors.logo && (
                            <Alert variant="warning" className="mt-2 py-2 small">
                              {errors.logo}
                            </Alert>
                          )}
                          
                          <div className="small text-muted mt-2">
                            <FaInfoCircle className="me-1" />
                            <strong>Auto-upload:</strong> Logo uploads automatically when selected
                            <br />
                            <strong>Note:</strong> Logo will be attached to company during creation
                            <br />
                            <strong>Recommended:</strong> Square image, max 5MB (JPEG, PNG, GIF, WebP)
                          </div>
                        </div>
                      </div>

                      {/* Verification Documents Section */}
                      <div className="mb-4">
                        <h6 className="fw-semibold mb-3">Verification Documents</h6>
                        <div className="verification-docs-section p-3 border rounded" style={{ background: '#f8f9fa' }}>
                          <div className="mb-3">
                            <p className="text-muted small mb-2">
                              <FaInfoCircle className="me-1" />
                              Upload supporting documents for company verification (e.g., business license, registration certificate, tax documents). All files are auto-uploaded when selected.
                            </p>
                            <div className="d-flex justify-content-between align-items-center">
                              <Button 
                                variant="outline-primary" 
                                size="sm"
                                onClick={triggerDocFileInput}
                                disabled={uploadingDocs || activeUploads > 0}
                              >
                                <FaPlus className="me-2" />
                                Add Documents
                              </Button>
                              <small className="text-muted">
                                {verificationDocs.length} document(s) added
                              </small>
                            </div>
                            <input
                              ref={docFileInputRef}
                              type="file"
                              multiple
                              accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx"
                              onChange={handleDocSelect}
                              style={{ display: 'none' }}
                              disabled={uploadingDocs || activeUploads > 0}
                            />
                          </div>
                          
                          {/* Documents List */}
                          {verificationDocs.length > 0 && (
                            <ListGroup className="mb-3">
                              {verificationDocs.map((doc) => (
                                <ListGroup.Item 
                                  key={doc.id}
                                  className="d-flex align-items-center justify-content-between"
                                >
                                  <div className="d-flex align-items-center">
                                    {getFileIcon(doc.type)}
                                    <div className="ms-3">
                                      <div className="fw-medium small">{doc.name}</div>
                                      <div className="text-muted extra-small">
                                        {formatFileSize(doc.size)} • {doc.type}
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="d-flex align-items-center">
                                    {/* Upload Status */}
                                    {doc.status === 'uploading' && (
                                      <div className="d-flex align-items-center">
                                        <Badge bg="info" className="me-2">
                                          Uploading {doc.progress}%
                                        </Badge>
                                        <div style={{ width: '60px', marginRight: '8px' }}>
                                          <ProgressBar 
                                            now={doc.progress} 
                                            variant="info"
                                            style={{ height: '6px' }}
                                          />
                                        </div>
                                        <Spinner size="sm" />
                                      </div>
                                    )}
                                    {doc.status === 'success' && (
                                      <Badge bg="success" className="me-2">
                                        <FaCheck /> Uploaded
                                      </Badge>
                                    )}
                                    {doc.status === 'error' && (
                                      <Badge bg="danger" className="me-2">
                                        <FaTimes /> Failed
                                      </Badge>
                                    )}
                                    
                                    {/* Actions */}
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="text-primary p-0 me-2"
                                      onClick={() => handleViewDoc(doc)}
                                      disabled={doc.status === 'uploading'}
                                    >
                                      <FaEye size={14} />
                                    </Button>
                                    {doc.status === 'error' && (
                                      <Button
                                        variant="link"
                                        size="sm"
                                        className="text-warning p-0 me-2"
                                        onClick={() => retryDocUpload(doc)}
                                      >
                                        <FaCloudUploadAlt size={14} />
                                      </Button>
                                    )}
                                    <Button
                                      variant="link"
                                      size="sm"
                                      className="text-danger p-0"
                                      onClick={() => handleRemoveDoc(doc.id)}
                                      disabled={doc.status === 'uploading'}
                                    >
                                      <FaTrash size={14} />
                                    </Button>
                                  </div>
                                </ListGroup.Item>
                              ))}
                            </ListGroup>
                          )}
                          
                          {/* Supported Formats Info */}
                          <div className="small text-muted">
                            <FaPaperclip className="me-1" />
                            <strong>Supported formats:</strong> PDF, JPEG, PNG, GIF, WebP, DOC, DOCX, XLS, XLSX
                            <br />
                            <strong>Max file size:</strong> 10MB per file
                            <br />
                            <strong>Auto-upload:</strong> Documents upload automatically when selected
                          </div>
                        </div>
                      </div>

                      {/* Company Name */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Company Name *
                        </Form.Label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-transparent border-end-0">
                            <FaBuilding className="text-muted" />
                          </span>
                          <Form.Control
                            type="text"
                            placeholder="Enter company name"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            isInvalid={!!errors.name}
                            required
                            className="border-start-0 py-3"
                            style={{ 
                              borderRadius: '12px 0 0 12px',
                              border: '1px solid #e9ecef',
                              background: '#f8f9fa'
                            }}
                          />
                        </div>
                        {errors.name && (
                          <div className="text-danger mt-2 small fw-medium">
                            {errors.name}
                          </div>
                        )}
                      </Form.Group>

                      {/* Company Email */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Company Email *
                        </Form.Label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-transparent border-end-0">
                            <FaEnvelope className="text-muted" />
                          </span>
                          <Form.Control
                            type="email"
                            placeholder="company@example.com"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
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

                      {/* Industry */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Industry *
                        </Form.Label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-transparent border-end-0">
                            <FaIndustry className="text-muted" />
                          </span>
                          <Form.Select
                            value={formData.industry}
                            onChange={(e) => handleInputChange('industry', e.target.value)}
                            isInvalid={!!errors.industry}
                            required
                            className="border-start-0 py-3"
                            style={{ 
                              borderRadius: '12px 0 0 12px',
                              border: '1px solid #e9ecef',
                              background: '#f8f9fa'
                            }}
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
                        </div>
                        {errors.industry && (
                          <div className="text-danger mt-2 small fw-medium">
                            {errors.industry}
                          </div>
                        )}
                      </Form.Group>

                      {/* Description */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Description
                        </Form.Label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-transparent border-end-0 align-items-start pt-3">
                            <FaInfoCircle className="text-muted" />
                          </span>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="Brief description about your company..."
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            className="border-start-0 py-3"
                            style={{ 
                              borderRadius: '12px 0 12px 12px',
                              border: '1px solid #e9ecef',
                              background: '#f8f9fa',
                              resize: 'none'
                            }}
                          />
                        </div>
                      </Form.Group>

                      {/* Next Button */}
                      <Button 
                        type="button"
                        variant="primary" 
                        className="w-100 mb-4 py-3 fw-bold border-0"
                        onClick={nextStep}
                        disabled={uploadingLogo || activeUploads > 0}
                        style={{ 
                          borderRadius: '12px',
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          fontSize: '1.1rem'
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
                      <h5 className="fw-semibold mb-4" style={{ color: '#2d3748' }}>Contact Information</h5>
                      
                      {/* Contact Name */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Contact Person Name *
                        </Form.Label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-transparent border-end-0">
                            <FaUser className="text-muted" />
                          </span>
                          <Form.Control
                            type="text"
                            placeholder="Full name of contact person"
                            value={formData.contactName}
                            onChange={(e) => handleInputChange('contactName', e.target.value)}
                            isInvalid={!!errors.contactName}
                            required
                            className="border-start-0 py-3"
                            style={{ 
                              borderRadius: '12px 0 0 12px',
                              border: '1px solid #e9ecef',
                              background: '#f8f9fa'
                            }}
                          />
                        </div>
                        {errors.contactName && (
                          <div className="text-danger mt-2 small fw-medium">
                            {errors.contactName}
                          </div>
                        )}
                      </Form.Group>

                      {/* Contact Email */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Contact Email *
                        </Form.Label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-transparent border-end-0">
                            <FaEnvelope className="text-muted" />
                          </span>
                          <Form.Control
                            type="email"
                            placeholder="contact@example.com"
                            value={formData.contactEmail}
                            onChange={(e) => handleInputChange('contactEmail', e.target.value)}
                            isInvalid={!!errors.contactEmail}
                            required
                            className="border-start-0 py-3"
                            style={{ 
                              borderRadius: '12px 0 0 12px',
                              border: '1px solid #e9ecef',
                              background: '#f8f9fa'
                            }}
                          />
                        </div>
                        {errors.contactEmail && (
                          <div className="text-danger mt-2 small fw-medium">
                            {errors.contactEmail}
                          </div>
                        )}
                      </Form.Group>

                      {/* Contact Phone */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Contact Phone
                        </Form.Label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-transparent border-end-0">
                            <FaPhone className="text-muted" />
                          </span>
                          <Form.Control
                            type="tel"
                            placeholder="+1234567890"
                            value={formData.contactPhone}
                            onChange={(e) => handleInputChange('contactPhone', e.target.value)}
                            className="border-start-0 py-3"
                            style={{ 
                              borderRadius: '12px 0 0 12px',
                              border: '1px solid #e9ecef',
                              background: '#f8f9fa'
                            }}
                          />
                        </div>
                        <Form.Text className="text-muted small">
                          Optional - International format starting with +
                        </Form.Text>
                      </Form.Group>

                      {/* Website */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Company Website
                        </Form.Label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-transparent border-end-0">
                            <FaGlobe className="text-muted" />
                          </span>
                          <Form.Control
                            type="url"
                            placeholder="https://example.com"
                            value={formData.website}
                            onChange={(e) => handleInputChange('website', e.target.value)}
                            className="border-start-0 py-3"
                            style={{ 
                              borderRadius: '12px 0 0 12px',
                              border: '1px solid #e9ecef',
                              background: '#f8f9fa'
                            }}
                          />
                        </div>
                      </Form.Group>

                      {/* Phone */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Company Phone
                        </Form.Label>
                        <div className="input-group input-group-lg">
                          <span className="input-group-text bg-transparent border-end-0">
                            <FaPhone className="text-muted" />
                          </span>
                          <Form.Control
                            type="tel"
                            placeholder="+1234567890"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="border-start-0 py-3"
                            style={{ 
                              borderRadius: '12px 0 0 12px',
                              border: '1px solid #e9ecef',
                              background: '#f8f9fa'
                            }}
                          />
                        </div>
                        <Form.Text className="text-muted small">
                          Optional - International format starting with +
                        </Form.Text>
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
                            border: '1px solid #e9ecef'
                          }}
                        >
                          Back
                        </Button>
                        
                        <Button 
                          type="button"
                          variant="primary" 
                          className="flex-grow-1 py-3 fw-bold border-0"
                          onClick={nextStep}
                          disabled={uploadingLogo || activeUploads > 0}
                          style={{ 
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            fontSize: '1.1rem'
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
                      </div>
                    </>
                  )}

                  {step === 3 && (
                    <>
                      <h5 className="fw-semibold mb-4" style={{ color: '#2d3748' }}>Review & Submit</h5>
                      
                      {/* Review Card */}
                      <Card className="border-0 shadow-sm mb-4" style={{ background: '#f8f9fa' }}>
                        <Card.Body className="p-4">
                          <div className="row mb-4">
                            <div className="col-md-4 text-center mb-3 mb-md-0">
                              <div className="company-logo-review mb-3">
                                {logoPreview ? (
                                  <img 
                                    src={logoPreview} 
                                    alt="Company Logo" 
                                    className="logo-image"
                                  />
                                ) : (
                                  <div className="logo-placeholder-large d-flex flex-column align-items-center justify-content-center">
                                    <FaImage size={64} className="text-muted mb-2" />
                                    <small className="text-muted">No logo</small>
                                  </div>
                                )}
                              </div>
                              <h5 className="fw-bold" style={{ color: '#2d3748' }}>{formData.name}</h5>
                              <Badge 
                                bg="primary" 
                                className="px-3 py-2 rounded-pill fw-medium"
                                style={{ 
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  border: 'none'
                                }}
                              >
                                {formData.industry}
                              </Badge>
                              
                              {/* Logo Upload Status in Review */}
                              <div className="mt-3">
                                {getLogoUploadStatusBadge()}
                                {uploadedLogoData?.url && (
                                  <div className="mt-2">
                                    <small className="text-success">
                                      <FaCheck className="me-1" />
                                      Ready to attach to company
                                    </small>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="col-md-8">
                              <div className="review-details">
                                <div className="detail-item mb-3">
                                  <FaEnvelope className="text-muted me-3" />
                                  <span className="text-muted">Company Email:</span>
                                  <span className="ms-2 fw-medium">{formData.email}</span>
                                </div>
                                
                                {formData.phone && (
                                  <div className="detail-item mb-3">
                                    <FaPhone className="text-muted me-3" />
                                    <span className="text-muted">Company Phone:</span>
                                    <span className="ms-2 fw-medium">{formData.phone}</span>
                                  </div>
                                )}
                                
                                {formData.website && (
                                  <div className="detail-item mb-3">
                                    <FaGlobe className="text-muted me-3" />
                                    <span className="text-muted">Website:</span>
                                    <span className="ms-2 fw-medium">
                                      <a href={formData.website} target="_blank" rel="noopener noreferrer" className="text-decoration-none">
                                        {formData.website}
                                      </a>
                                    </span>
                                  </div>
                                )}
                                
                                <div className="detail-item mb-3">
                                  <FaUser className="text-muted me-3" />
                                  <span className="text-muted">Contact Person:</span>
                                  <span className="ms-2 fw-medium">{formData.contactName}</span>
                                </div>
                                
                                <div className="detail-item mb-3">
                                  <FaEnvelope className="text-muted me-3" />
                                  <span className="text-muted">Contact Email:</span>
                                  <span className="ms-2 fw-medium">{formData.contactEmail}</span>
                                </div>
                                
                                {formData.contactPhone && (
                                  <div className="detail-item mb-4">
                                    <FaPhone className="text-muted me-3" />
                                    <span className="text-muted">Contact Phone:</span>
                                    <span className="ms-2 fw-medium">{formData.contactPhone}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Verification Documents in Review */}
                          {verificationDocs.length > 0 && (
                            <div className="review-docs mt-4 pt-4 border-top">
                              <h6 className="fw-semibold mb-3">Verification Documents ({verificationDocs.length})</h6>
                              <div className="row">
                                {verificationDocs.map((doc) => (
                                  <div key={doc.id} className="col-md-6 mb-2">
                                    <Card className="border-0 shadow-sm">
                                      <Card.Body className="p-3">
                                        <div className="d-flex align-items-center">
                                          {getFileIcon(doc.type)}
                                          <div className="ms-3 flex-grow-1">
                                            <div className="fw-medium small text-truncate">{doc.name}</div>
                                            <div className="text-muted extra-small">
                                              {formatFileSize(doc.size)}
                                            </div>
                                          </div>
                                          <div className="ms-2">
                                            {doc.status === 'success' ? (
                                              <Badge bg="success" className="small">
                                                <FaCheck /> Ready
                                              </Badge>
                                            ) : doc.status === 'uploading' ? (
                                              <Badge bg="info" className="small">
                                                Uploading {doc.progress}%
                                              </Badge>
                                            ) : (
                                              <Badge bg="danger" className="small">
                                                <FaTimes /> Failed
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      </Card.Body>
                                    </Card>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {formData.description && (
                            <div className="review-description mt-4 pt-4 border-top">
                              <h6 className="fw-semibold mb-2">Company Description</h6>
                              <p className="text-muted mb-0">
                                {formData.description}
                              </p>
                            </div>
                          )}
                          
                          <div className="mt-4 pt-4 border-top">
                            <div className="alert alert-info border-0" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
                              <FaInfoCircle className="me-2" />
                              <span className="fw-medium">You will be automatically assigned as the Administrator/Owner of this company.</span>
                              <br />
                              {uploadedLogoData && (
                                <small className="d-block mt-1">
                                  Logo is uploaded and ready to be attached to the company profile.
                                </small>
                              )}
                              {verificationDocs.length > 0 && (
                                <small className="d-block mt-1">
                                  {verificationDocs.filter(d => d.status === 'success').length} verification document(s) ready to be attached.
                                </small>
                              )}
                            </div>
                          </div>
                        </Card.Body>
                      </Card>

                      {/* Navigation Buttons */}
                      <div className="d-flex gap-3">
                        <Button 
                          type="button"
                          variant="light" 
                          className="flex-grow-1 py-3 fw-bold"
                          onClick={prevStep}
                          style={{ 
                            borderRadius: '12px',
                            border: '1px solid #e9ecef'
                          }}
                        >
                          Back
                        </Button>
                        
                        <Button 
                          type="submit" 
                          variant="primary" 
                          className="flex-grow-1 py-3 fw-bold border-0"
                          disabled={loading || uploadingLogo || activeUploads > 0}
                          style={{ 
                            borderRadius: '12px',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            fontSize: '1.1rem'
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
                              <FaSpinner className="me-2 spin" />
                              Creating Company...
                            </span>
                          ) : (
                            <span className="d-flex align-items-center justify-content-center">
                              Create Company
                              <FaCheck className="ms-2" />
                            </span>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Document Preview Modal */}
      <Modal show={showDocPreview} onHide={() => setShowDocPreview(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Document Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {selectedDocPreview && (
            selectedDocPreview.includes('blob:') ? (
              <div>
                <p className="text-muted mb-3">This is a local preview of the document.</p>
                <img 
                  src={selectedDocPreview} 
                  alt="Document Preview" 
                  className="img-fluid rounded"
                  style={{ maxHeight: '500px' }}
                />
                <p className="text-muted mt-3 small">
                  <FaInfoCircle className="me-1" />
                  Note: This is a local preview. The document will be available at a permanent URL after upload.
                </p>
              </div>
            ) : (
              <div>
                <p className="text-muted mb-3">Opening document in new tab...</p>
                <Button 
                  variant="primary" 
                  onClick={() => window.open(selectedDocPreview, '_blank')}
                >
                  <FaLink className="me-2" />
                  Open Document
                </Button>
              </div>
            )
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDocPreview(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
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
        
        .company-logo-preview {
          width: 150px;
          height: 150px;
          border-radius: 12px;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          border: 2px dashed #dee2e6;
          overflow: hidden;
        }
        
        .logo-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 12px;
        }
        
        .logo-placeholder {
          color: #667eea;
          padding: 20px;
        }
        
        .company-logo-review {
          width: 200px;
          height: 200px;
          border-radius: 12px;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          border: 2px solid #e9ecef;
          overflow: hidden;
        }
        
        .logo-placeholder-large {
          color: #667eea;
          padding: 40px;
        }
        
        .review-details .detail-item {
          display: flex;
          align-items: center;
          padding: 0.5rem 0;
        }
        
        .verification-docs-section {
          border-radius: 12px;
          border-color: #e9ecef !important;
        }
        
        .extra-small {
          font-size: 0.75rem;
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
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
        
        .form-control:focus,
        .form-select:focus {
          box-shadow: none;
          border-color: #667eea;
        }
        
        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .company-logo-preview {
            width: 120px;
            height: 120px;
          }
          
          .company-logo-review {
            width: 150px;
            height: 150px;
          }
          
          .logo-placeholder-large {
            padding: 20px;
          }
          
          .progress-steps .step {
            width: 30px;
            height: 30px;
          }
          
          .progress-steps .step-connector {
            width: 40px;
          }
        }
        
        @media (max-width: 576px) {
          .company-logo-preview {
            width: 100px;
            height: 100px;
          }
          
          .company-logo-review {
            width: 120px;
            height: 120px;
          }
          
          .logo-placeholder {
            padding: 10px;
          }
          
          .logo-placeholder-large {
            padding: 10px;
          }
          
          .progress-steps {
            flex-direction: column;
            gap: 0.5rem;
          }
          
          .progress-steps .step-connector {
            display: none;
          }
        }
        
        .card {
          border-radius: 24px !important;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: #ffffff;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.08);
        }
        
        * {
          transition: all 0.2s ease;
        }
      `}</style>
    </DashboardLayout>
  );
}