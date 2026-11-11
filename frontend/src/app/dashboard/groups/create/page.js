"use client"

import { useState, useEffect } from "react"
import { Container, Row, Col, Card, Form, Button, Alert, Spinner, Badge, ProgressBar } from "react-bootstrap"
import Select from 'react-select'
import { Country, State, City } from 'country-state-city'
import {
  FaArrowLeft,
  FaSave,
  FaUpload,
  FaGlobe,
  FaLock,
  FaBuilding,
  FaInfoCircle,
  FaExclamationTriangle,
  FaMapMarkerAlt,
  FaTimes,
  FaCloudUploadAlt,
  FaCheck,
  FaExclamationCircle,
  FaCamera,
  FaTrash,
  FaEye,
  FaTimesCircle,
  FaSpinner,
  FaImage
} from "react-icons/fa"
import { useRouter } from "next/navigation"
import { useAuth } from "../../../../../lib/contexts/AuthContext"
import { toast } from "react-toastify"
import DashboardLayout from "../../../../../components/layout/DashboardLayout"

const CreateGroupPage = () => {
  const { user, api } = useAuth()
  const router = useRouter()

  const [formData, setFormData] = useState({
    name: "",
    visibility: "PUBLIC",
    description: "",
    rules: "",
    companyId: "",
    topic: "",
    postApproval: "INSTANT",
    country: "",
    region: "",
    city: ""
  })

  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('idle') // idle, uploading, success, error
  const [imagePreview, setImagePreview] = useState(null)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadedImageData, setUploadedImageData] = useState(null)
  
  const [companies, setCompanies] = useState([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  
  // Location states
  const [countries, setCountries] = useState([])
  const [regions, setRegions] = useState([])
  const [cities, setCities] = useState([])

  // Group topics from schema
  const groupTopics = [
    { value: "PHISHING", label: "Phishing" },
    { value: "FAKE_SUPPORT", label: "Fake Support" },
    { value: "IMPERSONATION", label: "Impersonation" },
    { value: "INVESTMENT", label: "Investment Scams" },
    { value: "JOB_SCAM", label: "Job Scams" },
    { value: "ROMANCE", label: "Romance Scams" },
    { value: "PAYMENT_REQUEST", label: "Payment Request" },
    { value: "FAKE_WEBSITE", label: "Fake Website" },
    { value: "SOCIAL_MEDIA", label: "Social Media" },
    { value: "MARKETPLACE", label: "Marketplace" },
    { value: "SUBSCRIPTION", label: "Subscription" },
    { value: "PHONE_CALL", label: "Phone Call" },
    { value: "SMS", label: "SMS" },
    { value: "WHATSAPP", label: "WhatsApp" },
    { value: "CRYPTO", label: "Crypto" },
    { value: "LOAN", label: "Loan" },
    { value: "CHARITY", label: "Charity" },
    { value: "INVOICE", label: "Invoice" },
    { value: "IDENTITY_THEFT", label: "Identity Theft" },
    { value: "ACCOUNT_TAKEOVER", label: "Account Takeover" },
    { value: "GIVEAWAY", label: "Giveaway" },
    { value: "OTHER", label: "Other" }
  ]

  useEffect(() => {
    // Fetch companies if user can create official groups
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      fetchCompanies()
    }
    
    // Load all countries
    const allCountries = Country.getAllCountries().map(country => ({
      value: country.isoCode,
      label: country.name,
      flag: country.flag
    }))
    setCountries(allCountries.sort((a, b) => a.label.localeCompare(b.label)))
  }, [user])

  // Load regions when country changes
  useEffect(() => {
    if (formData.country) {
      const countryStates = State.getStatesOfCountry(formData.country).map(state => ({
        value: state.isoCode,
        label: state.name
      }))
      setRegions(countryStates.sort((a, b) => a.label.localeCompare(b.label)))
      
      // Reset region and city when country changes
      setFormData(prev => ({ ...prev, region: '', city: '' }))
      setCities([])
    } else {
      setRegions([])
      setCities([])
    }
  }, [formData.country])

  // Load cities when region changes
  useEffect(() => {
    if (formData.country && formData.region) {
      const stateCities = City.getCitiesOfState(formData.country, formData.region).map(city => ({
        value: city.name,
        label: city.name
      }))
      setCities(stateCities.sort((a, b) => a.label.localeCompare(b.label)))
      
      // Reset city when region changes
      setFormData(prev => ({ ...prev, city: '' }))
    } else {
      setCities([])
    }
  }, [formData.country, formData.region])

  const fetchCompanies = async () => {
    try {
      setLoadingCompanies(true)
      const response = await api.companies.getMyCompanies()
      setCompanies(response.companies || response || [])
    } catch (error) {
      console.error("Failed to load companies:", error)
      toast.error("Failed to load companies")
    } finally {
      setLoadingCompanies(false)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = "Group name is required"
    } else if (formData.name.length < 3) {
      newErrors.name = "Group name must be at least 3 characters"
    } else if (formData.name.length > 60) {
      newErrors.name = "Group name must be less than 60 characters"
    }

    if (!formData.visibility) {
      newErrors.visibility = "Group visibility is required"
    }

    if (formData.description && formData.description.length > 700) {
      newErrors.description = "Description must be less than 700 characters"
    }

    if (formData.visibility === "OFFICIAL" && !formData.companyId) {
      newErrors.companyId = "Company is required for official groups"
    }

    if (formData.rules && formData.rules.length > 1000) {
      newErrors.rules = "Rules must be less than 1000 characters"
    }

    // Check upload status
    if (selectedFile && uploadStatus === 'uploading') {
      toast.error("Please wait for the image to finish uploading")
      return newErrors
    }

    if (selectedFile && uploadStatus === 'error') {
      toast.error("Cover image upload failed. Please remove and re-upload the image.")
      return newErrors
    }

    return newErrors
  }

  const handleFileSelect = (event) => {
    const file = event.target.files[0]
    if (!file) return

    try {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, coverImage: 'Image size should be less than 5MB' }))
        return
      }
      
      // Check file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
      if (!validTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, coverImage: 'Please select a valid image (JPEG, PNG, GIF, WebP)' }))
        return
      }
      
      // Create preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
        setSelectedFile(file)
      }
      reader.readAsDataURL(file)
      
      // Clear any previous errors
      setErrors(prev => ({ ...prev, coverImage: null }))
      
    } catch (error) {
      console.error('Error processing image:', error)
      setErrors(prev => ({ ...prev, coverImage: 'Failed to process image' }))
    }
  }

  const uploadCoverImage = async () => {
    if (!selectedFile) {
      toast.error('No image selected')
      return
    }

    try {
      setUploadingImage(true)
      setUploadStatus('uploading')
      setUploadProgress(0)
      
      const formData = new FormData()
      formData.append('file', selectedFile)
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 90) {
            return prev + 10
          }
          return prev
        })
      }, 200)

      // Use the existing uploadFile method (make sure it's the one pointing to /api/v1/uploads/group-image)
      const response = await api.upload.uploadFile(formData)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadStatus('success')
      
      // Store uploaded image data
      setUploadedImageData(response)
      
      toast.success('Cover image uploaded successfully!')
    } catch (error) {
      console.error('Cover image upload failed:', error)
      setUploadStatus('error')
      setErrors(prev => ({ 
        ...prev, 
        coverImage: error.message || 'Failed to upload cover image' 
      }))
      toast.error('Failed to upload cover image')
    } finally {
      setUploadingImage(false)
    }
  }

  const retryUpload = async () => {
    await uploadCoverImage()
  }

  const removeImage = () => {
    setSelectedFile(null)
    setImagePreview(null)
    setUploadedImageData(null)
    setUploadStatus('idle')
    setUploadProgress(0)
    setErrors(prev => ({ ...prev, coverImage: null }))
  }

  const triggerFileInput = () => {
    if (uploadingImage) {
      toast.info('Please wait for current upload to finish')
      return
    }
    
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (e) => handleFileSelect(e)
    input.click()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    // Check if image is still uploading
    if (selectedFile && uploadStatus === 'uploading') {
      toast.error('Please wait for image to finish uploading')
      return
    }

    // Check if image upload failed
    if (selectedFile && uploadStatus === 'error') {
      toast.error('Please fix image upload issue before submitting')
      return
    }

    setLoading(true)
    try {
      // Get country and region names from ISO codes
      const selectedCountry = countries.find(c => c.value === formData.country)
      const selectedRegion = regions.find(r => r.value === formData.region)
      
      // Prepare data for API - Include coverImageUrl from uploadedImageData
      const groupData = {
        name: formData.name.trim(),
        visibility: formData.visibility,
        description: formData.description.trim() || undefined,
        rules: formData.rules.trim() || undefined,
        topic: formData.topic || undefined,
        postApproval: formData.postApproval,
        country: selectedCountry?.label || formData.country.trim() || undefined,
        region: selectedRegion?.label || formData.region.trim() || undefined,
        city: formData.city.trim() || undefined,
        // Include coverImageUrl if uploaded
        ...(uploadedImageData?.url && { coverImageUrl: uploadedImageData.url }),
      }

      // Add companyId for official groups
      if (formData.visibility === "OFFICIAL" && formData.companyId) {
        groupData.companyId = formData.companyId
      }

      console.log('Creating group with data:', groupData)
      console.log('Cover image URL to be sent:', uploadedImageData?.url)

      // Create group with cover image URL
      const response = await api.groups.createGroup(groupData)
      
      console.log('Group created successfully:', response)
      
      toast.success("Group created successfully!")
      
      // Redirect to the new group page
      if (response.slug) {
        router.push(`/dashboard/groups/${response.slug}`)
      } else {
        router.push("/dashboard/groups")
      }
      
    } catch (error) {
      console.error("Failed to create group:", error)
      toast.error(error.message || "Failed to create group")
      setErrors({ submit: error.message || "An error occurred" })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: undefined
      }))
    }

    // If visibility changes to not OFFICIAL, clear companyId
    if (name === "visibility" && value !== "OFFICIAL") {
      setFormData(prev => ({
        ...prev,
        companyId: ""
      }))
    }
  }

  // Custom styles for react-select to match your design
  const customSelectStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: '48px',
      borderRadius: '16px',
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
      borderRadius: '16px',
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
  }

  const getUploadStatusBadge = () => {
    switch (uploadStatus) {
      case 'uploading':
        return (
          <Badge bg="info" className="px-2 py-1" style={{ fontSize: '0.7rem' }}>
            <FaCloudUploadAlt className="me-1" /> Uploading {uploadProgress}%
          </Badge>
        )
      case 'success':
        return (
          <Badge bg="success" className="px-2 py-1" style={{ fontSize: '0.7rem' }}>
            <FaCheck className="me-1" /> Uploaded
          </Badge>
        )
      case 'error':
        return (
          <Badge bg="danger" className="px-2 py-1" style={{ fontSize: '0.7rem' }}>
            <FaExclamationTriangle className="me-1" /> Upload Failed
          </Badge>
        )
      default:
        return (
          <Badge bg="secondary" className="px-2 py-1" style={{ fontSize: '0.7rem' }}>
            <FaUpload className="me-1" /> Ready to Upload
          </Badge>
        )
    }
  }

  return (
    <DashboardLayout>
      <Container fluid className="py-4">
        <Row className="justify-content-center">
          <Col xl={8} lg={10}>
            {/* Header */}
            <div className="text-center mb-5">
              <div className="position-relative">
                <div
                  className="position-absolute top-0 start-50 translate-middle-x w-100 h-100 rounded-4"
                  style={{
                    background: "linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)",
                    zIndex: 0,
                    maxWidth: '600px'
                  }}
                />
                <div className="position-relative p-4 rounded-4">
                  <h1 className="fw-bold mb-2 display-5" style={{ color: "#2d3748" }}>
                    Create New Group
                  </h1>
                  <p className="text-muted mb-0 fs-6">
                    Start a community for scam awareness and prevention
                  </p>
                </div>
              </div>
            </div>

            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="p-4 p-md-5">
                <div className="mb-4">
                  <Button
                    variant="outline-primary"
                    onClick={() => router.push("/dashboard/groups")}
                    className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill border-0 shadow-sm mb-4"
                    style={{ 
                      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                      border: '1px solid #e9ecef',
                      color: '#667eea'
                    }}
                  >
                    <FaArrowLeft />
                    <span>Back to Groups</span>
                  </Button>
                </div>

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
                      <FaExclamationTriangle className="me-2" />
                      <span className="fw-medium">{errors.submit}</span>
                    </div>
                  </Alert>
                )}

                <Alert variant="info" className="border-0 mb-4" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
                  <FaInfoCircle className="me-2" />
                  <span className="fw-medium">Create a safe space for discussing scams and prevention methods</span>
                </Alert>

                <Form onSubmit={handleSubmit}>
                  {/* Group Name */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold mb-2" style={{ color: "#4a5568" }}>
                      Group Name <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      name="name"
                      placeholder="Enter group name (e.g., Cyber Security Awareness)"
                      value={formData.name}
                      onChange={handleChange}
                      isInvalid={!!errors.name}
                      className="py-3 border-0 rounded-3"
                      style={{ 
                        background: '#f8f9fa',
                        fontSize: '1rem'
                      }}
                    />
                    {errors.name && (
                      <Form.Text className="text-danger small fw-medium mt-2 d-block">
                        {errors.name}
                      </Form.Text>
                    )}
                    <Form.Text className="text-muted small mt-2 d-block">
                      Choose a clear, descriptive name for your group (max 60 characters)
                    </Form.Text>
                  </Form.Group>

                  {/* Group Visibility */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold mb-2" style={{ color: "#4a5568" }}>
                      Group Visibility <span className="text-danger">*</span>
                    </Form.Label>
                    <div className="row g-3">
                      {[
                        { value: "PUBLIC", label: "Public", icon: FaGlobe, description: "Anyone can join and view content" },
                        { value: "PRIVATE", label: "Private", icon: FaLock, description: "Requires approval to join" },
                      ].map((type) => (
                        <Col key={type.value} md={6}>
                          <div 
                            className={`p-3 rounded-3 border cursor-pointer ${formData.visibility === type.value ? 'border-primary' : 'border-light'}`}
                            onClick={() => handleChange({ target: { name: 'visibility', value: type.value } })}
                            style={{ 
                              background: formData.visibility === type.value ? 'rgba(102, 126, 234, 0.05)' : '#f8f9fa',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer'
                            }}
                          >
                            <div className="d-flex align-items-center mb-2">
                              <type.icon className={`me-2 ${formData.visibility === type.value ? 'text-primary' : 'text-muted'}`} />
                              <span className="fw-medium">{type.label}</span>
                            </div>
                            <p className="small text-muted mb-0">{type.description}</p>
                          </div>
                        </Col>
                      ))}
                    </div>
                    <input
                      type="hidden"
                      name="visibility"
                      value={formData.visibility}
                    />
                    {errors.visibility && (
                      <Form.Text className="text-danger small fw-medium mt-2 d-block">
                        {errors.visibility}
                      </Form.Text>
                    )}
                  </Form.Group>

                  {/* Cover Image Upload - Made Entirely Clickable */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold mb-2" style={{ color: "#4a5568" }}>
                      Cover Image (Optional)
                    </Form.Label>
                    
                    <Alert variant="light" className="border rounded-3 mb-3" style={{ background: 'rgba(245, 158, 11, 0.05)' }}>
                      <div className="d-flex">
                        <FaInfoCircle className="me-2 flex-shrink-0" />
                        <div>
                          <strong>Image Upload:</strong> Select an image first, then click "Upload Cover" to upload it to the server.
                          Image will be attached to the group during creation.
                        </div>
                      </div>
                    </Alert>
                    
                    <div className="text-center mb-3">
                      <div className="position-relative d-inline-block">
                        {/* Make the entire preview area clickable */}
                        <div 
                          className="group-cover-preview mb-3"
                          onClick={triggerFileInput}
                          style={{ cursor: uploadingImage ? 'not-allowed' : 'pointer' }}
                          title={uploadingImage ? 'Upload in progress' : 'Click to select image'}
                        >
                          {uploadingImage ? (
                            <div className="d-flex flex-column align-items-center justify-content-center h-100">
                              <FaSpinner className="text-primary mb-2 spin" size={24} />
                              <small className="text-muted">Uploading...</small>
                            </div>
                          ) : imagePreview ? (
                            <div className="position-relative h-100">
                              <img 
                                src={imagePreview} 
                                alt="Cover Preview" 
                                className="cover-image"
                              />
                              <div className="cover-image-overlay">
                                <div className="overlay-content">
                                  <FaCamera size={32} className="text-white mb-2" />
                                  <small className="text-white">Click to change image</small>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="cover-placeholder d-flex flex-column align-items-center justify-content-center">
                              <FaImage size={48} className="text-muted mb-2" />
                              <small className="text-muted text-center">Click to select cover image</small>
                            </div>
                          )}
                        </div>
                        
                        {/* Upload Status Display */}
                        <div className="d-flex justify-content-center align-items-center gap-2 mt-3 mb-3">
                          {getUploadStatusBadge()}
                          {uploadedImageData?.url && (
                            <div className="ms-2">
                              <small className="text-success">
                                <FaCheck className="me-1" />
                                Ready to attach to group
                              </small>
                            </div>
                          )}
                        </div>
                        
                        {/* Upload Progress Bar */}
                        {uploadStatus === 'uploading' && (
                          <div className="w-100 mb-3" style={{ maxWidth: '400px', margin: '0 auto' }}>
                            <ProgressBar 
                              now={uploadProgress} 
                              label={`${uploadProgress}%`}
                              className="mt-1"
                              style={{ height: '6px' }}
                            />
                          </div>
                        )}
                        
                        {/* Upload Error Message */}
                        {uploadStatus === 'error' && (
                          <div className="mb-3">
                            <Alert variant="danger" className="py-2 mb-0 small">
                              <small>
                                <FaExclamationTriangle className="me-1" />
                                Upload failed. 
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="p-0 ms-1"
                                  onClick={retryUpload}
                                >
                                  Retry
                                </Button>
                              </small>
                            </Alert>
                          </div>
                        )}
                        
                        {/* Buttons - Keep them accessible but also allow click on preview */}
                        <div className="d-flex justify-content-center gap-2 mt-3">
                          {/* This button is still available but optional */}
                          <Button 
                            variant="primary" 
                            size="sm"
                            onClick={triggerFileInput}
                            disabled={uploadingImage}
                          >
                            <FaUpload className="me-2" />
                            {uploadedImageData ? 'Change Cover' : 'Select Cover'}
                          </Button>
                          
                          {selectedFile && uploadStatus !== 'success' && !uploadingImage && (
                            <Button 
                              variant="success" 
                              size="sm"
                              onClick={uploadCoverImage}
                            >
                              <FaCloudUploadAlt className="me-2" />
                              Upload Cover
                            </Button>
                          )}
                          
                          {imagePreview && (
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={removeImage}
                              disabled={uploadingImage}
                            >
                              <FaTrash className="me-2" />
                              Remove
                            </Button>
                          )}
                        </div>
                        
                        {/* Hidden file input - now triggered by clicking anywhere in preview */}
                        <input
                          type="file"
                          id="cover-upload"
                          accept="image/*"
                          onChange={handleFileSelect}
                          style={{ display: 'none' }}
                          disabled={uploadingImage}
                        />
                        
                        {errors.coverImage && (
                          <Alert variant="warning" className="mt-2 py-2 small">
                            {errors.coverImage}
                          </Alert>
                        )}
                        
                        <div className="small text-muted mt-2">
                          <FaInfoCircle className="me-1" />
                          <strong>Auto-upload:</strong> Need to click "Upload Cover" after selecting
                          <br />
                          <strong>Note:</strong> Cover image will be attached to group during creation
                          <br />
                          <strong>Recommended:</strong> 1200×400 pixels, max 5MB (JPEG, PNG, GIF, WebP)
                        </div>
                      </div>
                    </div>
                    <Form.Text className="text-muted small mt-2 d-block">
                      Upload a cover image to make your group stand out (click anywhere in the preview area to select image)
                    </Form.Text>
                  </Form.Group>

                  {/* Group Topic */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold mb-2" style={{ color: "#4a5568" }}>
                      Group Topic (Optional)
                    </Form.Label>
                    <Form.Select
                      name="topic"
                      value={formData.topic}
                      onChange={handleChange}
                      className="py-3 border-0 rounded-3"
                      style={{ 
                        background: '#f8f9fa',
                        fontSize: '1rem'
                      }}
                    >
                      <option value="">Select a topic</option>
                      {groupTopics.map(topic => (
                        <option key={topic.value} value={topic.value}>
                          {topic.label}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted small mt-2 d-block">
                      Choose the main topic of discussion for this group
                    </Form.Text>
                  </Form.Group>

                  {/* Post Approval Setting */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold mb-2" style={{ color: "#4a5568" }}>
                      Post Approval
                    </Form.Label>
                    <div className="row g-3">
                      {[
                        { value: "INSTANT", label: "Instant", description: "Posts appear immediately" },
                        { value: "APPROVAL_REQUIRED", label: "Approval Required", description: "Posts need admin approval" }
                      ].map((approval) => (
                        <Col key={approval.value} md={6}>
                          <div 
                            className={`p-3 rounded-3 border cursor-pointer ${formData.postApproval === approval.value ? 'border-primary' : 'border-light'}`}
                            onClick={() => handleChange({ target: { name: 'postApproval', value: approval.value } })}
                            style={{ 
                              background: formData.postApproval === approval.value ? 'rgba(102, 126, 234, 0.05)' : '#f8f9fa',
                              transition: 'all 0.2s ease',
                              cursor: 'pointer'
                            }}
                          >
                            <div className="fw-medium mb-1">{approval.label}</div>
                            <p className="small text-muted mb-0">{approval.description}</p>
                          </div>
                        </Col>
                      ))}
                    </div>
                  </Form.Group>

                  {/* Company Selection (only for Official groups) */}
                  {formData.visibility === "OFFICIAL" && (
                    <Form.Group className="mb-4">
                      <div className="d-flex align-items-center mb-2">
                        <Form.Label className="fw-semibold mb-0" style={{ color: "#4a5568" }}>
                          Company <span className="text-danger">*</span>
                        </Form.Label>
                        <Badge bg="warning" text="dark" className="ms-2 py-1 px-2">Admin only</Badge>
                      </div>
                      <Form.Select
                        name="companyId"
                        value={formData.companyId}
                        onChange={handleChange}
                        isInvalid={!!errors.companyId}
                        disabled={loadingCompanies}
                        className="py-3 border-0 rounded-3"
                        style={{ 
                          background: '#f8f9fa',
                          fontSize: '1rem'
                        }}
                      >
                        <option value="">
                          {loadingCompanies ? "Loading companies..." : "Select a company"}
                        </option>
                        {companies.map(company => (
                          <option key={company.id} value={company.id}>
                            {company.name}
                          </option>
                        ))}
                      </Form.Select>
                      {errors.companyId && (
                        <Form.Text className="text-danger small fw-medium mt-2 d-block">
                          {errors.companyId}
                        </Form.Text>
                      )}
                      <Form.Text className="text-muted small mt-2 d-block">
                        Official groups are managed by company administrators
                      </Form.Text>
                    </Form.Group>
                  )}

                  {/* Location Fields */}
                  <Form.Group className="mb-4">
                    <div className="d-flex align-items-center mb-3">
                      <FaMapMarkerAlt className="text-primary me-2" />
                      <Form.Label className="fw-semibold mb-0" style={{ color: "#4a5568" }}>
                        Location (Optional)
                      </Form.Label>
                    </div>
                    
                    {/* Country Select */}
                    <div className="mb-3">
                      <Form.Label className="fw-medium mb-2" style={{ color: "#4a5568" }}>
                        Country
                      </Form.Label>
                      <Select
                        options={countries}
                        value={countries.find(c => c.value === formData.country) || null}
                        onChange={(option) => setFormData({...formData, country: option?.value || ''})}
                        placeholder="Select country..."
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
                    </div>

                    {/* Region/State Select */}
                    <div className="mb-3">
                      <Form.Label className="fw-medium mb-2" style={{ color: "#4a5568" }}>
                        Region/State
                      </Form.Label>
                      <Select
                        options={regions}
                        value={regions.find(r => r.value === formData.region) || null}
                        onChange={(option) => setFormData({...formData, region: option?.value || ''})}
                        placeholder={formData.country ? "Select region/state..." : "Select country first"}
                        styles={customSelectStyles}
                        isSearchable
                        isDisabled={!formData.country}
                        noOptionsMessage={() => formData.country ? "Type to search regions..." : "Select country first"}
                      />
                    </div>

                    {/* City Select */}
                    <div className="mb-3">
                      <Form.Label className="fw-medium mb-2" style={{ color: "#4a5568" }}>
                        City
                      </Form.Label>
                      <Select
                        options={cities}
                        value={cities.find(c => c.value === formData.city) || null}
                        onChange={(option) => setFormData({...formData, city: option?.value || ''})}
                        placeholder={formData.region ? "Select city..." : "Select region first"}
                        styles={customSelectStyles}
                        isSearchable
                        isDisabled={!formData.region}
                        noOptionsMessage={() => formData.region ? "Type to search cities..." : "Select region first"}
                      />
                    </div>

                    <Form.Text className="text-muted small mt-2 d-block">
                      Help members find location-specific groups
                    </Form.Text>
                  </Form.Group>

                  {/* Description */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold mb-2" style={{ color: "#4a5568" }}>
                      Description 
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      name="description"
                      placeholder="Describe the purpose of this group..."
                      value={formData.description}
                      onChange={handleChange}
                      isInvalid={!!errors.description}
                      rows={4}
                      className="py-3 border-0 rounded-3"
                      style={{ 
                        background: '#f8f9fa',
                        fontSize: '1rem',
                        resize: 'none'
                      }}
                    />
                    <div className="d-flex justify-content-between mt-2">
                      <Form.Text className="text-muted small">
                        Briefly describe what this group is about
                      </Form.Text>
                      <Form.Text className={`small ${formData.description.length > 700 ? 'text-danger' : 'text-muted'}`}>
                        {formData.description.length}/700
                      </Form.Text>
                    </div>
                    {errors.description && (
                      <Form.Text className="text-danger small fw-medium mt-2 d-block">
                        {errors.description}
                      </Form.Text>
                    )}
                  </Form.Group>

                  {/* Group Rules */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-semibold mb-2" style={{ color: "#4a5568" }}>
                      Group Rules (Optional)
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      name="rules"
                      placeholder="Set rules for group members..."
                      value={formData.rules}
                      onChange={handleChange}
                      isInvalid={!!errors.rules}
                      rows={4}
                      className="py-3 border-0 rounded-3"
                      style={{ 
                        background: '#f8f9fa',
                        fontSize: '1rem',
                        resize: 'none'
                      }}
                    />
                    <div className="d-flex justify-content-between mt-2">
                      <Form.Text className="text-muted small">
                        Define community guidelines and rules
                      </Form.Text>
                      <Form.Text className={`small ${formData.rules.length > 1000 ? 'text-danger' : 'text-muted'}`}>
                        {formData.rules.length}/1000
                      </Form.Text>
                    </div>
                    {errors.rules && (
                      <Form.Text className="text-danger small fw-medium mt-2 d-block">
                        {errors.rules}
                      </Form.Text>
                    )}
                  </Form.Group>

                  {/* Submit Button */}
                  <div className="d-flex gap-3 pt-3">
                    <Button
                      variant="light"
                      onClick={() => router.push("/dashboard/groups")}
                      disabled={loading || uploadingImage}
                      className="px-4 py-3 rounded-pill border-0 fw-semibold flex-grow-1"
                      style={{ 
                        background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={loading || uploadingImage || (selectedFile && uploadStatus === 'error')}
                      className="px-4 py-3 rounded-pill border-0 fw-semibold flex-grow-1"
                      style={{ 
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!loading) {
                          e.currentTarget.style.transform = 'translateY(-2px)'
                          e.currentTarget.style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!loading) {
                          e.currentTarget.style.transform = 'translateY(0)'
                          e.currentTarget.style.boxShadow = 'none'
                        }
                      }}
                    >
                      {loading ? (
                        <span className="d-flex align-items-center justify-content-center">
                          <Spinner animation="border" size="sm" className="me-2" />
                          Creating Group...
                        </span>
                      ) : (
                        <span className="d-flex align-items-center justify-content-center">
                          <FaSave className="me-2" />
                          Create Group
                        </span>
                      )}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      <style jsx>{`
        .group-cover-preview {
          width: 400px;
          height: 200px;
          border-radius: 20px;
          background: #f8f9fa;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          border: 2px dashed #dee2e6;
          overflow: hidden;
          position: relative;
          transition: all 0.3s ease;
        }
        
        .group-cover-preview:hover {
          border-color: #667eea;
          background: rgba(102, 126, 234, 0.05);
        }
        
        .cover-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border-radius: 20px;
        }
        
        .cover-image-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.3s ease;
          border-radius: 20px;
        }
        
        .group-cover-preview:hover .cover-image-overlay {
          opacity: 1;
        }
        
        .overlay-content {
          text-align: center;
          color: white;
        }
        
        .cover-placeholder {
          color: #667eea;
          padding: 40px;
          transition: all 0.3s ease;
        }
        
        .group-cover-preview:hover .cover-placeholder {
          color: #764ba2;
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Mobile Responsiveness */
        @media (max-width: 768px) {
          .group-cover-preview {
            width: 300px;
            height: 150px;
          }
        }
        
        @media (max-width: 576px) {
          .group-cover-preview {
            width: 250px;
            height: 125px;
          }
          
          .cover-placeholder {
            padding: 20px;
          }
        }
      `}</style>
    </DashboardLayout>
  )
}

export default CreateGroupPage