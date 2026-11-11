"use client"

import { useState, useEffect } from "react"
import { Container, Row, Col, Card, Form, Button, Alert, Badge, Spinner, Modal } from "react-bootstrap"
import {
  FaTrash,
  FaExclamationTriangle,
  FaMoneyBillWave,
  FaMapMarkerAlt,
  FaPhone,
  FaEnvelope,
  FaLink,
  FaSave,
  FaTimes,
  FaInfoCircle,
  FaEye,
  FaEyeSlash,
  FaArrowLeft,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaBuilding,
  FaImages,
  FaFilePdf,
  FaVideo,
  FaPlus,
  FaCalendar,
  FaShieldAlt,
  FaQuestionCircle,
  FaUpload,
} from "react-icons/fa"
import { useParams, useRouter } from "next/navigation"
import { useAuth } from '../../../../../../lib/contexts/AuthContext';
import { toast } from 'react-toastify';
import DashboardLayout from '../../../../../../components/layout/DashboardLayout';

const EditPostPage = () => {
  const { id } = useParams()
  const { user, api } = useAuth()
  const router = useRouter()

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scamTypeId: "",
    lostAmount: "",
    currency: "USD",
    country: "",
    region: "",
    city: "",
    incidentDate: "",
    companyId: "",
    companyNameManual: "",
    evidence: [],
  })

  // Post data
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  // Evidence state
  const [evidence, setEvidence] = useState([])
  const [newEvidence, setNewEvidence] = useState([])
  const [evidenceToRemove, setEvidenceToRemove] = useState([])
  const [showEvidenceModal, setShowEvidenceModal] = useState(false)
  const [currentEvidence, setCurrentEvidence] = useState({
    evidenceType: "IMAGE",
    fileUrl: "",
    websiteUrl: "",
    phoneNumber: "",
    emailAddress: "",
    maskedContent: "",
    isMasked: true,
    hasUserConsent: false,
    fileName: "",
    fileSize: null,
    mimeType: "",
  })
  const [uploadingFile, setUploadingFile] = useState(false)

  // UI state
  const [scamTypes, setScamTypes] = useState([])
  const [companies, setCompanies] = useState([])
  const [showPiiMask, setShowPiiMask] = useState(false)
  const [timeLeft, setTimeLeft] = useState(null)
  const [timeExpired, setTimeExpired] = useState(false)

  useEffect(() => {
    if (id) {
      loadPost()
      loadData()
    }
  }, [id])

  useEffect(() => {
    if (post && post.editableUntil) {
      const timer = setInterval(() => {
        const now = new Date()
        const editableUntil = new Date(post.editableUntil)
        const diff = editableUntil - now
        
        if (diff <= 0) {
          clearInterval(timer)
          setTimeLeft("Expired")
          setTimeExpired(true)
          
          if (!timeExpired) {
            toast.error("Edit window has expired! Redirecting...")
            setTimeout(() => {
              router.push(`/dashboard/posts/view/${id}`)
            }, 2000)
          }
        } else {
          const minutes = Math.floor(diff / 1000 / 60)
          const seconds = Math.floor((diff / 1000) % 60)
          setTimeLeft(`${minutes}m ${seconds}s`)
        }
      }, 1000)
      
      return () => clearInterval(timer)
    }
  }, [post, timeExpired])

  const loadPost = async () => {
    try {
      setLoading(true)
      
      const response = await api.getPost(id)
      setPost(response)
      
      if (response) {
        if (response.status === "DELETED") {
          toast.error("Deleted posts cannot be edited")
          router.push(`/dashboard/posts/view/${id}`)
          return
        }
        
        const now = new Date()
        const editableUntil = response.editableUntil ? new Date(response.editableUntil) : null
        
        if (!editableUntil || now > editableUntil) {
          toast.error("Edit window has expired (30 minutes after creation)")
          router.push(`/dashboard/posts/view/${id}`)
          return
        }

        const canEdit = canUserEditPost(response)
        if (!canEdit) {
          toast.error("You don't have permission to edit this post")
          router.push(`/dashboard/posts/view/${id}`)
          return
        }

        setFormData({
          title: response.title || "",
          description: response.description || "",
          scamTypeId: response.scamTypeId || "",
          lostAmount: response.lostAmount ? parseFloat(response.lostAmount).toFixed(2) : "",
          currency: response.currency || "USD",
          country: response.country || "",
          region: response.region || "",
          city: response.city || "",
          incidentDate: response.incidentDate ? new Date(response.incidentDate).toISOString().split('T')[0] : "",
          companyId: response.companyId || "",
          companyNameManual: response.companyNameManual || "",
          evidence: response.evidences || [],
        })

        if (response.evidences && response.evidences.length > 0) {
          setEvidence(response.evidences)
        }
      }
    } catch (error) {
      console.error("Failed to load post:", error)
      toast.error("Failed to load post")
      router.push("/dashboard/posts")
    } finally {
      setLoading(false)
    }
  }

  const canUserEditPost = (post) => {
    if (!post || !user) return false
    
    if (post.userId === user.id) {
      return true
    }
    
    if (post.isCompanyPost && post.companyStaff) {
      const allowedPostTypes = ['SCAM_AWARENESS', 'QUESTION']
      
      if (post.postType === 'SCAM_REPORT') {
        return true
      }
      
      return allowedPostTypes.includes(post.postType)
    }
    
    return false
  }

  const loadData = async () => {
    try {
      const scamTypesRes = await api.getScamTypes()
      setScamTypes(scamTypesRes || [])
      
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
    }
  }

  const maskPII = (text) => {
    if (!text) return ""
    if (text.includes("@")) {
      const [username, domain] = text.split("@")
      if (username.length <= 2) return text
      const firstChar = username.charAt(0)
      const lastChar = username.charAt(username.length - 1)
      const maskedMiddle = "*".repeat(username.length - 2)
      return `${firstChar}${maskedMiddle}${lastChar}@${domain}`
    }
    if (text.replace(/\D/g, "").length >= 10) {
      const digits = text.replace(/\D/g, "")
      return `+${digits.slice(0, -4).replace(/\d/g, "*")}${digits.slice(-4)}`
    }
    return text
  }

  const getEvidenceIcon = (type) => {
    switch (type) {
      case "IMAGE": return <FaImages className="text-primary" />
      case "VIDEO": return <FaVideo className="text-danger" />
      case "PDF": return <FaFilePdf className="text-warning" />
      case "WEBSITE": return <FaLink className="text-info" />
      case "PHONE_NUMBER": return <FaPhone className="text-success" />
      case "EMAIL_ADDRESS": return <FaEnvelope className="text-secondary" />
      default: return <FaImages className="text-primary" />
    }
  }

  const getEvidenceLabel = (type) => {
    switch (type) {
      case "IMAGE": return "Image"
      case "VIDEO": return "Video"
      case "PDF": return "PDF Document"
      case "WEBSITE": return "Website"
      case "PHONE_NUMBER": return "Phone Number"
      case "EMAIL_ADDRESS": return "Email Address"
      default: return type
    }
  }

  const handleEvidenceChange = (field, value) => {
    setCurrentEvidence(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFileUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "application/pdf", "video/mp4"]
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload image, PDF, or video files.")
      return
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size too large. Maximum 10MB allowed.")
      return
    }

    try {
      setUploadingFile(true)
      
      // In a real app, upload to S3/backend
      // For now, create a preview URL
      const fileUrl = URL.createObjectURL(file)
      
      setCurrentEvidence(prev => ({
        ...prev,
        fileUrl: fileUrl,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
      }))
      
      toast.success("File ready for upload")
    } catch (error) {
      console.error("Failed to process file:", error)
      toast.error("Failed to process file")
    } finally {
      setUploadingFile(false)
    }
  }

  const addEvidence = () => {
    if (!currentEvidence.evidenceType) {
      toast.error("Please select evidence type")
      return
    }

    // Validate based on type
    if (currentEvidence.evidenceType === "PHONE_NUMBER" && !currentEvidence.phoneNumber) {
      toast.error("Please enter phone number")
      return
    }

    if (currentEvidence.evidenceType === "EMAIL_ADDRESS" && !currentEvidence.emailAddress) {
      toast.error("Please enter email address")
      return
    }

    if (currentEvidence.evidenceType === "WEBSITE" && !currentEvidence.websiteUrl) {
      toast.error("Please enter website URL")
      return
    }

    if ((currentEvidence.evidenceType === "IMAGE" || 
         currentEvidence.evidenceType === "VIDEO" || 
         currentEvidence.evidenceType === "PDF") && 
        !currentEvidence.fileUrl) {
      toast.error("Please upload a file")
      return
    }

    // Create masked content for PII
    let maskedContent = ""
    if (currentEvidence.evidenceType === "PHONE_NUMBER" && currentEvidence.phoneNumber) {
      maskedContent = maskPII(currentEvidence.phoneNumber)
    }
    if (currentEvidence.evidenceType === "EMAIL_ADDRESS" && currentEvidence.emailAddress) {
      maskedContent = maskPII(currentEvidence.emailAddress)
    }

    const newEvidenceItem = {
      id: Date.now().toString(),
      evidenceType: currentEvidence.evidenceType,
      ...(currentEvidence.evidenceType === "PHONE_NUMBER" && { 
        phoneNumber: currentEvidence.phoneNumber,
        maskedContent: maskedContent,
        isMasked: true,
        hasUserConsent: currentEvidence.hasUserConsent,
      }),
      ...(currentEvidence.evidenceType === "EMAIL_ADDRESS" && { 
        emailAddress: currentEvidence.emailAddress,
        maskedContent: maskedContent,
        isMasked: true,
        hasUserConsent: currentEvidence.hasUserConsent,
      }),
      ...(currentEvidence.evidenceType === "WEBSITE" && { 
        websiteUrl: currentEvidence.websiteUrl,
        maskedContent: currentEvidence.websiteUrl,
        isMasked: false,
        hasUserConsent: currentEvidence.hasUserConsent,
      }),
      ...(currentEvidence.fileUrl && {
        fileUrl: currentEvidence.fileUrl,
        fileName: currentEvidence.fileName,
        fileSize: currentEvidence.fileSize,
        mimeType: currentEvidence.mimeType,
        maskedContent: currentEvidence.fileName,
        isMasked: false,
        hasUserConsent: currentEvidence.hasUserConsent,
      }),
      isNew: true
    }

    setNewEvidence(prev => [...prev, newEvidenceItem])
    
    setCurrentEvidence({
      evidenceType: "IMAGE",
      fileUrl: "",
      websiteUrl: "",
      phoneNumber: "",
      emailAddress: "",
      maskedContent: "",
      isMasked: true,
      hasUserConsent: false,
      fileName: "",
      fileSize: null,
      mimeType: "",
    })
    
    setShowEvidenceModal(false)
    toast.success("Evidence added successfully")
  }

  const removeEvidence = (id, isExisting = false) => {
    if (isExisting) {
      setEvidenceToRemove(prev => [...prev, id])
      setEvidence(prev => prev.filter(e => e.id !== id))
    } else {
      setNewEvidence(prev => prev.filter(e => e.id !== id))
    }
    toast.success("Evidence removed")
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.title.trim()) newErrors.title = "Title is required"
    if (!formData.description.trim()) newErrors.description = "Description is required"
    if (post.postType === "SCAM_REPORT" && !formData.scamTypeId) newErrors.scamTypeId = "Scam type is required for scam reports"
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error("Please fill all required fields")
      return
    }

    if (timeExpired) {
      toast.error("Edit window has expired. Cannot save changes.")
      return
    }

    setSaving(true)

    try {
      const evidencePayload = [
        ...evidence.filter(e => !evidenceToRemove.includes(e.id)).map(e => ({
          evidenceType: e.evidenceType,
          fileUrl: e.fileUrl || null,
          websiteUrl: e.websiteUrl || null,
          phoneNumber: e.phoneNumber || null,
          emailAddress: e.emailAddress || null,
          maskedContent: e.maskedContent || null,
          hasUserConsent: e.hasUserConsent || false,
          isMasked: e.isMasked !== false,
          fileName: e.fileName || null,
          fileSize: e.fileSize || null,
          mimeType: e.mimeType || null,
        })),
        ...newEvidence.map(e => ({
          evidenceType: e.evidenceType,
          fileUrl: e.fileUrl || null,
          websiteUrl: e.websiteUrl || null,
          phoneNumber: e.phoneNumber || null,
          emailAddress: e.emailAddress || null,
          maskedContent: e.maskedContent || null,
          hasUserConsent: e.hasUserConsent || false,
          isMasked: e.isMasked !== false,
          fileName: e.fileName || null,
          fileSize: e.fileSize || null,
          mimeType: e.mimeType || null,
        }))
      ]

      let formattedLostAmount = null;
      if (formData.lostAmount && formData.lostAmount.trim() !== '') {
        formattedLostAmount = parseFloat(formData.lostAmount).toFixed(2);
      }
      
      const payload = {
        title: formData.title,
        description: formData.description,
        ...(post.postType === "SCAM_REPORT" && { scamTypeId: formData.scamTypeId }),
        ...(post.postType === "SCAM_REPORT" && formattedLostAmount && { lostAmount: formattedLostAmount }),
        ...(post.postType === "SCAM_REPORT" && formData.currency && { currency: formData.currency }),
        ...(post.postType === "SCAM_REPORT" && formData.country && { country: formData.country }),
        ...(post.postType === "SCAM_REPORT" && formData.region && { region: formData.region }),
        ...(post.postType === "SCAM_REPORT" && formData.city && { city: formData.city }),
        ...(post.postType === "SCAM_REPORT" && formData.incidentDate && { incidentDate: formData.incidentDate }),
        ...(post.postType === "SCAM_REPORT" && formData.companyId && { companyId: formData.companyId }),
        ...(post.postType === "SCAM_REPORT" && formData.companyNameManual && { companyNameManual: formData.companyNameManual }),
        ...(evidencePayload.length > 0 && { evidence: evidencePayload }),
      }

      await api.posts.updatePost(id, payload)
      
      toast.success("Post updated successfully!")
      router.push(`/dashboard/posts/view/${id}`)
    } catch (error) {
      console.error("Update error:", error)
      toast.error(error.message || "Failed to update post")
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    if (window.confirm("Are you sure? Any unsaved changes will be lost.")) {
      router.push(`/dashboard/posts/view/${id}`)
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "PUBLISHED":
        return { variant: "success", icon: FaCheckCircle, label: "Published" }
      case "UNDER_REVIEW":
        return { variant: "warning", icon: FaClock, label: "Under Review" }
      case "REJECTED":
        return { variant: "danger", icon: FaTimesCircle, label: "Rejected" }
      case "DELETED":
        return { variant: "secondary", icon: FaTimesCircle, label: "Deleted" }
      default:
        return { variant: "secondary", icon: FaClock, label: "Unknown" }
    }
  }

  const getPostTypeIcon = (type, badgeColor) => {
    switch (type) {
      case "SCAM_REPORT":
        return { icon: FaExclamationTriangle, color: badgeColor || "#dc3545", label: "Scam Report" }
      case "SCAM_AWARENESS":
        return { icon: FaShieldAlt, color: badgeColor || "#f59e0b", label: "Scam Awareness" }
      case "QUESTION":
        return { icon: FaQuestionCircle, color: badgeColor || "#3b82f6", label: "Question" }
      default:
        return { icon: FaExclamationTriangle, color: "#6c757d", label: "Post" }
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <Spinner animation="border" variant="primary" style={{ width: "3rem", height: "3rem" }} />
              <p className="mt-4 text-muted fw-medium">Loading post...</p>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    )
  }

  if (!post) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8}>
              <Alert variant="danger" className="rounded-4 border-0 shadow-sm">
                <FaExclamationTriangle className="me-2" />
                Post not found or you don't have permission to edit it
              </Alert>
              <Button variant="primary" className="rounded-pill px-4" onClick={() => router.push("/dashboard/posts")}>
                Back to Dashboard
              </Button>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    )
  }

  const statusBadge = getStatusBadge(post.status)
  const primaryBadge = post.badges && post.badges.length > 0 ? post.badges[0] : null
  const badgeColor = primaryBadge ? primaryBadge.color : null
  const postTypeIcon = getPostTypeIcon(post.postType, badgeColor)
  const StatusIcon = statusBadge.icon
  const PostTypeIcon = postTypeIcon.icon
  const totalEvidence = evidence.length + newEvidence.length - evidenceToRemove.length

  return (
    <DashboardLayout>
      <Container fluid className="py-4" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
        <div className="mb-4">
          <Button
            variant="outline-secondary"
            onClick={() => router.push(`/dashboard/posts/view/${id}`)}
            className="mb-3 d-flex align-items-center gap-2 px-4 py-2 rounded-pill"
            style={{ 
              background: '#ffffff',
              borderColor: '#e9ecef'
            }}
          >
            <FaArrowLeft />
            <span>Back to Post</span>
          </Button>

          <div className="text-center mb-4">
            <h1 className="fw-bold mb-2" style={{ color: '#2d3748' }}>Edit Post</h1>
            <p className="text-muted mb-0" style={{ fontSize: '1.1rem' }}>
              Update your post details within the edit window
            </p>
          </div>
        </div>

        {timeExpired && (
          <Alert variant="danger" className="mb-4 rounded-3">
            <FaTimesCircle className="me-2" />
            Edit window has expired! You can no longer edit this post.
          </Alert>
        )}

        <Row className="justify-content-center">
          <Col xl={10} lg={12}>
            <Card className="border-0 shadow-lg rounded-4 mb-4">
              <Card.Body className="p-4 p-md-5">
                <div className="mb-4">
                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <div>
                      <Badge bg={statusBadge.variant} className="py-2 px-3 rounded-pill me-2">
                        <StatusIcon className="me-1" />
                        {statusBadge.label}
                      </Badge>
                      <Badge className="py-2 px-3 rounded-pill" style={{ 
                        backgroundColor: postTypeIcon.color,
                        color: 'white'
                      }}>
                        <PostTypeIcon className="me-1" />
                        {postTypeIcon.label}
                      </Badge>
                    </div>
                    {timeLeft && (
                      <Badge bg={timeExpired ? "danger" : "warning"} className="py-2 px-3 rounded-pill">
                        <FaClock className="me-2" />
                        {timeExpired ? "Expired" : timeLeft}
                      </Badge>
                    )}
                  </div>
                </div>

                <Form onSubmit={handleSubmit}>
                  <Alert variant="light" className="border rounded-3 mb-4">
                    <FaInfoCircle className="me-2" />
                    You can edit this post for 30 minutes after creation. After approval, editing is disabled.
                  </Alert>

                  {/* Title */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                      Title <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      isInvalid={!!errors.title}
                      className="py-3"
                      style={{ 
                        borderRadius: '12px',
                        border: '1px solid #e9ecef',
                        background: '#f8f9fa'
                      }}
                      placeholder="Enter a descriptive title for your post"
                      required
                      disabled={timeExpired}
                    />
                    {errors.title && (
                      <div className="text-danger mt-2 small fw-medium">
                        {errors.title}
                      </div>
                    )}
                  </Form.Group>

                  {/* Description */}
                  <Form.Group className="mb-4">
                    <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                      Description <span className="text-danger">*</span>
                    </Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={6}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      isInvalid={!!errors.description}
                      className="py-3"
                      style={{ 
                        borderRadius: '12px',
                        border: '1px solid #e9ecef',
                        background: '#f8f9fa'
                      }}
                      placeholder="Describe your post in detail..."
                      required
                      disabled={timeExpired}
                    />
                    {errors.description && (
                      <div className="text-danger mt-2 small fw-medium">
                        {errors.description}
                      </div>
                    )}
                  </Form.Group>

                  {/* Scam Report Specific Fields */}
                  {post.postType === "SCAM_REPORT" && (
                    <>
                      {/* Scam Type */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Scam Type <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select
                          value={formData.scamTypeId}
                          onChange={(e) => setFormData({ ...formData, scamTypeId: e.target.value })}
                          isInvalid={!!errors.scamTypeId}
                          className="py-3"
                          style={{ 
                            borderRadius: '12px',
                            border: '1px solid #e9ecef',
                            background: '#f8f9fa'
                          }}
                          required
                          disabled={timeExpired}
                        >
                          <option value="">Select the type of scam</option>
                          {scamTypes.map((type) => (
                            <option key={type.id} value={type.id}>
                              {type.name}
                            </option>
                          ))}
                        </Form.Select>
                        {errors.scamTypeId && (
                          <div className="text-danger mt-2 small fw-medium">
                            {errors.scamTypeId}
                          </div>
                        )}
                      </Form.Group>

                      {/* Financial Loss & Currency */}
                      <Row className="mb-4">
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                              Financial Loss (Optional)
                            </Form.Label>
                            <div className="input-group">
                              <span className="input-group-text" style={{ 
                                background: '#f8f9fa',
                                border: '1px solid #e9ecef',
                                borderRadius: '12px 0 0 12px'
                              }}>
                                $
                              </span>
                              <Form.Control
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.lostAmount}
                                onChange={(e) => setFormData({ ...formData, lostAmount: e.target.value })}
                                className="py-3"
                                style={{ 
                                  border: '1px solid #e9ecef',
                                  borderLeft: 'none',
                                  borderRadius: '0 12px 12px 0',
                                  background: '#f8f9fa'
                                }}
                                placeholder="0.00"
                                disabled={timeExpired}
                              />
                            </div>
                          </Form.Group>
                        </Col>
                        <Col md={6}>
                          <Form.Group>
                            <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                              Currency
                            </Form.Label>
                            <Form.Select
                              value={formData.currency}
                              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                              className="py-3"
                              style={{ 
                                borderRadius: '12px',
                                border: '1px solid #e9ecef',
                                background: '#f8f9fa'
                              }}
                              disabled={timeExpired}
                            >
                              <option value="USD">USD ($)</option>
                              <option value="EUR">EUR (€)</option>
                              <option value="GBP">GBP (£)</option>
                              <option value="CAD">CAD ($)</option>
                              <option value="AUD">AUD ($)</option>
                            </Form.Select>
                          </Form.Group>
                        </Col>
                      </Row>

                      {/* Location */}
                      <div className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Location (Optional)
                        </Form.Label>
                        <Row className="g-2">
                          <Col md={4}>
                            <Form.Control
                              type="text"
                              value={formData.country}
                              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                              className="py-3 mb-2 mb-md-0"
                              style={{ 
                                borderRadius: '12px',
                                border: '1px solid #e9ecef',
                                background: '#f8f9fa'
                              }}
                              placeholder="Country"
                              disabled={timeExpired}
                            />
                          </Col>
                          <Col md={4}>
                            <Form.Control
                              type="text"
                              value={formData.region}
                              onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                              className="py-3 mb-2 mb-md-0"
                              style={{ 
                                borderRadius: '12px',
                                border: '1px solid #e9ecef',
                                background: '#f8f9fa'
                              }}
                              placeholder="Region/State"
                              disabled={timeExpired}
                            />
                          </Col>
                          <Col md={4}>
                            <Form.Control
                              type="text"
                              value={formData.city}
                              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                              className="py-3"
                              style={{ 
                                borderRadius: '12px',
                                border: '1px solid #e9ecef',
                                background: '#f8f9fa'
                              }}
                              placeholder="City"
                              disabled={timeExpired}
                            />
                          </Col>
                        </Row>
                      </div>

                      {/* Incident Date */}
                      <Form.Group className="mb-4">
                        <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                          Incident Date (Optional)
                        </Form.Label>
                        <Form.Control
                          type="date"
                          value={formData.incidentDate}
                          onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
                          className="py-3"
                          style={{ 
                            borderRadius: '12px',
                            border: '1px solid #e9ecef',
                            background: '#f8f9fa'
                          }}
                          max={new Date().toISOString().split('T')[0]}
                          disabled={timeExpired}
                        />
                      </Form.Group>

                      {/* Company Involvement */}
                      {(companies.length > 0 || post.isCompanyPost) && (
                        <div className="mb-4">
                          <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
                            Company Involvement (Optional)
                          </Form.Label>
                          {companies.length > 0 && (
                            <Form.Select
                              value={formData.companyId}
                              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
                              className="py-3 mb-2"
                              style={{ 
                                borderRadius: '12px',
                                border: '1px solid #e9ecef',
                                background: '#f8f9fa'
                              }}
                              disabled={timeExpired}
                            >
                              <option value="">Select company if involved</option>
                              {companies.map((company) => (
                                <option key={company.id} value={company.id}>
                                  {company.name}
                                </option>
                              ))}
                            </Form.Select>
                          )}
                          <Form.Control
                            type="text"
                            placeholder="Or enter company name manually"
                            value={formData.companyNameManual}
                            onChange={(e) => setFormData({ ...formData, companyNameManual: e.target.value })}
                            className="py-3"
                            style={{ 
                              borderRadius: '12px',
                              border: '1px solid #e9ecef',
                              background: '#f8f9fa'
                            }}
                            disabled={timeExpired}
                          />
                        </div>
                      )}
                    </>
                  )}

                  {/* Evidence Section */}
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <h6 className="fw-medium mb-0" style={{ color: '#4a5568' }}>
                          Evidence ({totalEvidence}/10)
                        </h6>
                        <small className="text-muted">
                          Add, remove, or update evidence to support your report
                        </small>
                      </div>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => setShowEvidenceModal(true)}
                        className="rounded-pill px-3"
                        disabled={timeExpired}
                      >
                        <FaPlus className="me-1" />
                        Add Evidence
                      </Button>
                    </div>

                    {/* Existing Evidence */}
                    {evidence.length > 0 && (
                      <div className="mb-4">
                        <h6 className="fw-medium mb-2" style={{ color: '#4a5568' }}>Current Evidence</h6>
                        <div className="row g-2">
                          {evidence.map((item) => (
                            <div key={item.id} className="col-12">
                              <Card className="border">
                                <Card.Body className="py-2 px-3 d-flex align-items-center justify-content-between">
                                  <div className="d-flex align-items-center">
                                    <div className="me-3">
                                      {getEvidenceIcon(item.evidenceType)}
                                    </div>
                                    <div>
                                      <h6 className="mb-0">{getEvidenceLabel(item.evidenceType)}</h6>
                                      {(item.evidenceType === "PHONE_NUMBER" || item.evidenceType === "EMAIL_ADDRESS") && (
                                        <small className="text-muted">
                                          {showPiiMask ? (item.phoneNumber || item.emailAddress) : (item.maskedContent || maskPII(item.phoneNumber || item.emailAddress))}
                                        </small>
                                      )}
                                      {item.evidenceType === "WEBSITE" && (
                                        <small className="text-muted">{item.websiteUrl}</small>
                                      )}
                                      {item.fileName && (
                                        <small className="text-muted">{item.fileName}</small>
                                      )}
                                    </div>
                                  </div>
                                  {!timeExpired && (
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => removeEvidence(item.id, true)}
                                      className="rounded-circle"
                                    >
                                      <FaTrash />
                                    </Button>
                                  )}
                                </Card.Body>
                              </Card>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* New Evidence */}
                    {newEvidence.length > 0 && (
                      <div className="mb-4">
                        <h6 className="fw-medium mb-2" style={{ color: '#4a5568' }}>New Evidence to Add</h6>
                        <div className="row g-2">
                          {newEvidence.map((item) => (
                            <div key={item.id} className="col-12">
                              <Card className="border">
                                <Card.Body className="py-2 px-3 d-flex align-items-center justify-content-between">
                                  <div className="d-flex align-items-center">
                                    <div className="me-3">
                                      {getEvidenceIcon(item.evidenceType)}
                                    </div>
                                    <div>
                                      <h6 className="mb-0">{getEvidenceLabel(item.evidenceType)} <Badge bg="success" className="ms-2">New</Badge></h6>
                                      {(item.evidenceType === "PHONE_NUMBER" || item.evidenceType === "EMAIL_ADDRESS") && (
                                        <small className="text-muted">{item.maskedContent}</small>
                                      )}
                                      {item.evidenceType === "WEBSITE" && (
                                        <small className="text-muted">{item.websiteUrl}</small>
                                      )}
                                      {item.fileName && (
                                        <small className="text-muted">{item.fileName}</small>
                                      )}
                                    </div>
                                  </div>
                                  {!timeExpired && (
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => removeEvidence(item.id, false)}
                                      className="rounded-circle"
                                    >
                                      <FaTrash />
                                    </Button>
                                  )}
                                </Card.Body>
                              </Card>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {totalEvidence === 0 && (
                      <Alert variant="light" className="text-center py-4 rounded-3">
                        <p className="text-muted mb-0">
                          No evidence added. Add evidence to make your post more credible.
                        </p>
                      </Alert>
                    )}

                    {/* PII Toggle */}
                    {evidence.some(e => e.evidenceType === "PHONE_NUMBER" || e.evidenceType === "EMAIL_ADDRESS") && (
                      <div className="mt-3">
                        <Form.Check
                          type="switch"
                          id="pii-toggle"
                          label="Show original PII for existing evidence"
                          checked={showPiiMask}
                          onChange={(e) => setShowPiiMask(e.target.checked)}
                        />
                        <small className="text-muted">
                          Toggle to view original phone numbers/emails for existing evidence
                        </small>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="d-flex gap-2 pt-4 border-top">
                    <Button
                      type="submit"
                      variant="primary"
                      disabled={saving || timeExpired}
                      className="rounded-pill px-4"
                    >
                      {saving ? (
                        <>
                          <Spinner animation="border" size="sm" className="me-2" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <FaSave className="me-2" />
                          Save Changes
                        </>
                      )}
                    </Button>

                    <Button
                      type="button"
                      variant="outline-secondary"
                      className="rounded-pill px-4"
                      onClick={handleCancel}
                    >
                      <FaTimes className="me-2" />
                      Cancel
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>

            {/* Side Cards */}
            <Row className="g-3">
              <Col md={6} lg={4}>
                <Card className="border-0 shadow-sm rounded-4">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center mb-3">
                      <div className="p-2 rounded-3 me-3" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                        <FaClock className="text-primary" />
                      </div>
                      <h6 className="fw-medium mb-0" style={{ color: '#4a5568' }}>Time Information</h6>
                    </div>
                    <div className="mb-3">
                      <small className="text-muted d-block">Created</small>
                      <p className="mb-0 fw-medium" style={{ color: '#2d3748' }}>
                        {new Date(post.createdAt).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </p>
                    </div>
                    {post.editableUntil && (
                      <div>
                        <small className="text-muted d-block">Editable Until</small>
                        <p className="mb-0 fw-medium" style={{ 
                          color: timeExpired || new Date() > new Date(post.editableUntil) ? '#dc3545' : '#10b981' 
                        }}>
                          {new Date(post.editableUntil).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </p>
                        {timeLeft && (
                          <p className={`mb-0 small mt-1 ${timeExpired ? "text-danger" : "text-warning"}`}>
                            <FaClock className="me-1" />
                            {timeExpired ? "Edit window expired" : `${timeLeft} remaining`}
                          </p>
                        )}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={6} lg={4}>
                <Card className="border-0 shadow-sm rounded-4">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center mb-3">
                      <div className="p-2 rounded-3 me-3" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                        <FaCheckCircle className="text-success" />
                      </div>
                      <h6 className="fw-medium mb-0" style={{ color: '#4a5568' }}>Editing Tips</h6>
                    </div>
                    <ul className="ps-3 mb-0">
                      <li className="mb-2 text-muted small">Be specific with your details</li>
                      <li className="mb-2 text-muted small">Update evidence as needed</li>
                      <li className="text-muted small">Review PII protection</li>
                    </ul>
                  </Card.Body>
                </Card>
              </Col>
              
              <Col md={12} lg={4}>
                <Card className="border-0 shadow-sm rounded-4">
                  <Card.Body className="p-4">
                    <div className="d-flex align-items-center mb-3">
                      <div className="p-2 rounded-3 me-3" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                        <PostTypeIcon style={{ color: postTypeIcon.color }} />
                      </div>
                      <h6 className="fw-medium mb-0" style={{ color: '#4a5568' }}>Post Type</h6>
                    </div>
                    <Badge className="py-2 px-3 rounded-pill mb-3" style={{ 
                      backgroundColor: postTypeIcon.color,
                      color: 'white'
                    }}>
                      <PostTypeIcon className="me-1" />
                      {postTypeIcon.label}
                    </Badge>
                    {post.scamType && (
                      <div className="mt-3">
                        <small className="text-muted d-block">Scam Type</small>
                        <p className="mb-0 fw-medium" style={{ color: '#2d3748' }}>
                          {post.scamType.name}
                        </p>
                      </div>
                    )}
                    {post.isCompanyPost && (
                      <div className="mt-3">
                        <small className="text-muted d-block">Company Post</small>
                        <p className="mb-0 fw-medium d-flex align-items-center" style={{ color: '#2d3748' }}>
                          <FaBuilding className="me-2" />
                          {post.company?.name || "Company Post"}
                        </p>
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* Evidence Modal - COMPLETE VERSION */}
        <Modal show={showEvidenceModal} onHide={() => setShowEvidenceModal(false)} centered size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Add Evidence</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Alert variant="light" className="border rounded-3 mb-4">
              <FaInfoCircle className="me-2" />
              <span className="fw-medium">Personal information (phone numbers, email addresses) will be automatically masked.</span>
            </Alert>

            <Form.Group className="mb-4">
              <Form.Label className="fw-medium">Evidence Type</Form.Label>
              <Form.Select
                value={currentEvidence.evidenceType}
                onChange={(e) => handleEvidenceChange("evidenceType", e.target.value)}
                className="py-3"
                style={{ 
                  borderRadius: '12px',
                  border: '1px solid #e9ecef',
                  background: '#f8f9fa'
                }}
              >
                <option value="IMAGE">Image (Screenshot, Photo)</option>
                <option value="VIDEO">Video Recording</option>
                <option value="PDF">PDF Document</option>
                <option value="WEBSITE">Website URL</option>
                <option value="PHONE_NUMBER">Phone Number</option>
                <option value="EMAIL_ADDRESS">Email Address</option>
              </Form.Select>
            </Form.Group>

            {/* File Upload for Images, Videos, PDFs */}
            {(currentEvidence.evidenceType === "IMAGE" || 
              currentEvidence.evidenceType === "VIDEO" || 
              currentEvidence.evidenceType === "PDF") && (
              <Form.Group className="mb-4">
                <Form.Label>Upload File</Form.Label>
                <div className="border rounded p-4 text-center" style={{ background: '#f8f9fa' }}>
                  <FaUpload className="text-muted mb-3" size={40} />
                  <Form.Control 
                    type="file" 
                    accept={
                      currentEvidence.evidenceType === "IMAGE" ? "image/*" :
                      currentEvidence.evidenceType === "VIDEO" ? "video/*" :
                      "application/pdf"
                    }
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    style={{ 
                      borderRadius: '12px',
                      border: '1px solid #e9ecef'
                    }}
                  />
                  {uploadingFile && (
                    <div className="mt-3">
                      <Spinner animation="border" size="sm" className="me-2" />
                      Uploading file...
                    </div>
                  )}
                  {currentEvidence.fileUrl && (
                    <Alert variant="success" className="mt-3">
                      File ready: {currentEvidence.fileName}
                    </Alert>
                  )}
                </div>
              </Form.Group>
            )}

            {/* Website URL */}
            {currentEvidence.evidenceType === "WEBSITE" && (
              <Form.Group className="mb-4">
                <Form.Label>Website URL</Form.Label>
                <Form.Control
                  type="url"
                  placeholder="https://example.com"
                  value={currentEvidence.websiteUrl}
                  onChange={(e) => handleEvidenceChange("websiteUrl", e.target.value)}
                  className="py-3"
                  style={{ 
                    borderRadius: '12px',
                    border: '1px solid #e9ecef',
                    background: '#f8f9fa'
                  }}
                />
              </Form.Group>
            )}

            {/* Phone Number */}
            {currentEvidence.evidenceType === "PHONE_NUMBER" && (
              <Form.Group className="mb-4">
                <Form.Label>Phone Number</Form.Label>
                <Form.Control
                  type="tel"
                  placeholder="+1234567890"
                  value={currentEvidence.phoneNumber}
                  onChange={(e) => handleEvidenceChange("phoneNumber", e.target.value)}
                  className="py-3"
                  style={{ 
                    borderRadius: '12px',
                    border: '1px solid #e9ecef',
                    background: '#f8f9fa'
                  }}
                />
              </Form.Group>
            )}

            {/* Email Address */}
            {currentEvidence.evidenceType === "EMAIL_ADDRESS" && (
              <Form.Group className="mb-4">
                <Form.Label>Email Address</Form.Label>
                <Form.Control
                  type="email"
                  placeholder="example@domain.com"
                  value={currentEvidence.emailAddress}
                  onChange={(e) => handleEvidenceChange("emailAddress", e.target.value)}
                  className="py-3"
                  style={{ 
                    borderRadius: '12px',
                    border: '1px solid #e9ecef',
                    background: '#f8f9fa'
                  }}
                />
              </Form.Group>
            )}

            <Form.Group className="mb-4">
              <Form.Check
                type="checkbox"
                label="I consent to store this evidence for moderation purposes only"
                checked={currentEvidence.hasUserConsent}
                onChange={(e) => handleEvidenceChange("hasUserConsent", e.target.checked)}
                required
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEvidenceModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={addEvidence}
              disabled={
                (currentEvidence.evidenceType === "IMAGE" || 
                 currentEvidence.evidenceType === "VIDEO" || 
                 currentEvidence.evidenceType === "PDF") && !currentEvidence.fileUrl
              }
              style={{ 
                borderRadius: '12px',
                background: '#3b82f6',
                border: 'none'
              }}
            >
              Add Evidence
            </Button>
          </Modal.Footer>
        </Modal>
      </Container>
    </DashboardLayout>
  )
}

export default EditPostPage