// app/dashboard/groups/[groupId]/posts/components/GroupEvidenceModal.js
"use client"

import { useState } from "react"
import { 
  Modal, 
  Form, 
  Button, 
  Alert, 
  OverlayTrigger, 
  Tooltip,
  Spinner,
  ProgressBar
} from "react-bootstrap"
import {
  FaInfoCircle,
  FaUpload,
  FaImage,
  FaVideo,
  FaFilePdf,
  FaLink,
  FaPhone,
  FaEnvelope,
  FaEye,
  FaEyeSlash,
  FaMask,
  FaFileAlt,
  FaCamera,
  FaCheckCircle ,
  FaBrush,
  FaTimes,
  FaCloudUploadAlt,
  FaCheck,
  FaExclamationCircle
} from "react-icons/fa"
import { toast } from "react-toastify"

const GroupEvidenceModal = ({
  show,
  onHide,
  onAddEvidence,
  evidenceType,
  api
}) => {
  const [currentEvidence, setCurrentEvidence] = useState({
    evidenceType: "",
    fileUrl: "",
    websiteUrl: "",
    phoneNumber: "",
    emailAddress: "",
    isMasked: false,
    hasUserConsent: false,
    fileName: "",
    fileSize: null,
    mimeType: "",
    description: "",
    containsSensitiveInfo: false,
    maskedPreviewUrl: "",
    originalFileUrl: "",
    originalContent: "",
    maskedContent: "",
    file: null,
  })

  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState('')

  const handleMediaChange = (field, value) => {
    setCurrentEvidence(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "application/pdf", "video/mp4"]
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload image, PDF, or video files.")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size too large. Maximum 10MB allowed.")
      return
    }

    try {
      setUploadingFile(true)
      setUploadStatus('uploading')
      setUploadProgress(0)
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 90) return prev + 10
          return prev
        })
      }, 200)

      const formData = new FormData()
      formData.append('file', file)
      
      let uploadEndpoint = api.upload.uploadPostMedia
      if (evidenceType === 'scam') {
        uploadEndpoint = api.upload.uploadReportEvidence
      }

      const response = await uploadEndpoint(formData)
      
      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadStatus('success')
      
      setCurrentEvidence(prev => ({
        ...prev,
        file: file,
        fileUrl: response.url,
        fileName: response.fileName || file.name,
        fileSize: response.fileSize || file.size,
        mimeType: response.mimeType || file.type,
        evidenceType: file.type.startsWith('image/') ? "IMAGE" : 
                     file.type.startsWith('video/') ? "VIDEO" : "PDF"
      }))
      
      toast.success("File uploaded successfully!")
    } catch (error) {
      console.error("File upload failed:", error)
      setUploadStatus('error')
      toast.error("Failed to upload file")
    } finally {
      setUploadingFile(false)
    }
  }

  const handleFileUploadClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = "image/*,video/*,application/pdf"
    input.onchange = (e) => handleFileSelect(e)
    input.click()
  }

  const addEvidence = async () => {
    const evidenceType = currentEvidence.evidenceType
    
    if (!evidenceType) {
      toast.error("Please select evidence type")
      return
    }

    // Validate based on type
    if (evidenceType === "PHONE_NUMBER" && !currentEvidence.phoneNumber) {
      toast.error("Please enter phone number")
      return
    }

    if (evidenceType === "EMAIL_ADDRESS" && !currentEvidence.emailAddress) {
      toast.error("Please enter email address")
      return
    }

    if (evidenceType === "WEBSITE" && !currentEvidence.websiteUrl) {
      toast.error("Please enter website URL")
      return
    }

    if ((evidenceType === "IMAGE" || 
         evidenceType === "VIDEO" || 
         evidenceType === "PDF") && 
        !currentEvidence.file) {
      toast.error("Please upload a file")
      return
    }

    // Process masking for text-based evidence
    let maskedContent = "";
    let originalContent = "";
    
    if (evidenceType === "PHONE_NUMBER" && currentEvidence.phoneNumber) {
      originalContent = currentEvidence.phoneNumber;
      maskedContent = currentEvidence.isMasked ? maskPhoneNumber(currentEvidence.phoneNumber) : currentEvidence.phoneNumber;
    } else if (evidenceType === "EMAIL_ADDRESS" && currentEvidence.emailAddress) {
      originalContent = currentEvidence.emailAddress;
      maskedContent = currentEvidence.isMasked ? maskEmail(currentEvidence.emailAddress) : currentEvidence.emailAddress;
    } else if (evidenceType === "WEBSITE" && currentEvidence.websiteUrl) {
      originalContent = currentEvidence.websiteUrl;
      maskedContent = currentEvidence.isMasked ? maskWebsite(currentEvidence.websiteUrl) : currentEvidence.websiteUrl;
    }

    const evidenceId = Date.now().toString()
    const newEvidence = {
      id: evidenceId,
      evidenceType: evidenceType,
      isMasked: currentEvidence.isMasked,
      hasUserConsent: currentEvidence.hasUserConsent,
      description: currentEvidence.description || "",
      maskedContent: maskedContent,
      originalContent: originalContent,
      fileName: currentEvidence.fileName,
      fileSize: currentEvidence.fileSize,
      mimeType: currentEvidence.mimeType,
      file: currentEvidence.file,
      fileUrl: currentEvidence.fileUrl,
      maskedPreviewUrl: currentEvidence.maskedPreviewUrl,
      originalFileUrl: currentEvidence.originalFileUrl,
      containsSensitiveInfo: currentEvidence.containsSensitiveInfo,
    }
    
    // Add type-specific data
    if (evidenceType === "PHONE_NUMBER") {
      newEvidence.phoneNumber = maskedContent || originalContent
    } else if (evidenceType === "EMAIL_ADDRESS") {
      newEvidence.emailAddress = maskedContent || originalContent
    } else if (evidenceType === "WEBSITE") {
      newEvidence.websiteUrl = maskedContent || originalContent
    }

    onAddEvidence(newEvidence)
    
    // Reset form
    setCurrentEvidence({
      evidenceType: "",
      fileUrl: "",
      websiteUrl: "",
      phoneNumber: "",
      emailAddress: "",
      isMasked: false,
      hasUserConsent: false,
      fileName: "",
      fileSize: null,
      mimeType: "",
      description: "",
      containsSensitiveInfo: false,
      maskedPreviewUrl: "",
      originalFileUrl: "",
      originalContent: "",
      maskedContent: "",
      file: null,
    })
    
    setUploadProgress(0)
    setUploadStatus('')
    
    toast.success("Evidence added successfully!")
    onHide()
  }

  const maskPhoneNumber = (phone) => {
    if (!phone) return ""
    const digits = phone.replace(/\D/g, "")
    if (digits.length <= 4) return phone
    const visibleDigits = digits.slice(-4)
    const maskedPart = digits.slice(0, -4).replace(/\d/g, "*")
    return `+${maskedPart}${visibleDigits}`
  }

  const maskEmail = (email) => {
    if (!email) return ""
    const [username, domain] = email.split("@")
    if (username.length <= 2) return email
    const firstChar = username.charAt(0)
    const lastChar = username.charAt(username.length - 1)
    const maskedMiddle = "*".repeat(username.length - 2)
    return `${firstChar}${maskedMiddle}${lastChar}@${domain}`
  }

  const maskWebsite = (url) => {
    if (!url) return ""
    try {
      const urlObj = new URL(url)
      const hostname = urlObj.hostname
      const path = urlObj.pathname
      
      if (hostname.length <= 5) return url
      
      const parts = hostname.split('.')
      if (parts.length >= 2) {
        const domain = parts[parts.length - 2]
        const tld = parts[parts.length - 1]
        
        if (domain.length <= 3) return url
        
        const firstChar = domain.charAt(0)
        const lastChar = domain.charAt(domain.length - 1)
        const maskedMiddle = "*".repeat(domain.length - 2)
        
        const maskedDomain = `${firstChar}${maskedMiddle}${lastChar}`
        const otherParts = parts.slice(0, parts.length - 2)
        
        const finalHostname = [...otherParts, maskedDomain, tld].join('.')
        return `${urlObj.protocol}//${finalHostname}${path}`
      }
      return url
    } catch {
      return url
    }
  }

  const getMediaIcon = (type) => {
    switch (type) {
      case "IMAGE": return <FaImage className="text-primary" />
      case "VIDEO": return <FaVideo className="text-danger" />
      case "PDF": return <FaFilePdf className="text-warning" />
      case "WEBSITE": return <FaLink className="text-info" />
      case "PHONE_NUMBER": return <FaPhone className="text-success" />
      case "EMAIL_ADDRESS": return <FaEnvelope className="text-secondary" />
      default: return <FaFileAlt className="text-primary" />
    }
  }

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Add Evidence</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Alert variant="info" className="rounded-3 mb-4">
          <FaInfoCircle className="me-2" />
          <span className="fw-medium">
            <strong>Important:</strong> Files are uploaded immediately when added.
            Make sure sensitive information is masked before adding.
          </span>
        </Alert>

        <Form.Group className="mb-4">
          <Form.Label className="fw-medium">Evidence Type <span className="text-danger">*</span></Form.Label>
          <Form.Select
            value={currentEvidence.evidenceType}
            onChange={(e) => handleMediaChange("evidenceType", e.target.value)}
            className="py-3"
            style={{ 
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              background: '#f8f9fa'
            }}
          >
            <option value="">Please select type</option>
            <option value="IMAGE">Image (Screenshot, Photo)</option>
            <option value="VIDEO">Video Recording</option>
            <option value="PDF">PDF Document</option>
            <option value="WEBSITE">Website URL</option>
            <option value="PHONE_NUMBER">Phone Number</option>
            <option value="EMAIL_ADDRESS">Email Address</option>
          </Form.Select>
        </Form.Group>

        {currentEvidence.evidenceType && (
          <div className="mt-4">
            {/* File Upload for Images, Videos, PDFs */}
            {(currentEvidence.evidenceType === "IMAGE" || 
              currentEvidence.evidenceType === "VIDEO" || 
              currentEvidence.evidenceType === "PDF") && (
              <>
                <Form.Group className="mb-4">
                  <Form.Label>Upload File</Form.Label>
                  <div className="border rounded p-4 text-center" style={{ background: '#f8f9fa', cursor: 'pointer' }}
                       onClick={handleFileUploadClick}>
                    <FaUpload className="text-muted mb-3" size={40} />
                    <p className="mb-2">
                      Click to select {currentEvidence.evidenceType.toLowerCase()} file
                    </p>
                    <small className="text-muted d-block">
                      Supported: {currentEvidence.evidenceType === "IMAGE" ? "JPG, PNG, GIF" : 
                                 currentEvidence.evidenceType === "VIDEO" ? "MP4" : "PDF"} 
                      • Max 10MB
                    </small>
                    {uploadingFile && (
                      <div className="mt-3">
                        <Spinner animation="border" size="sm" className="me-2" />
                        Processing file...
                      </div>
                    )}
                    {currentEvidence.file && (
                      <Alert variant="success" className="mt-3 mb-0">
                        <FaCheckCircle className="me-2" />
                        File selected: {currentEvidence.fileName || "file"}
                      </Alert>
                    )}
                  </div>
                </Form.Group>

                {uploadStatus === 'uploading' && (
                  <div className="mb-4">
                    <ProgressBar 
                      now={uploadProgress} 
                      label={`${uploadProgress}%`}
                      className="mt-1"
                    />
                  </div>
                )}
              </>
            )}

            {/* Website URL */}
            {currentEvidence.evidenceType === "WEBSITE" && (
              <>
                <Form.Group className="mb-4">
                  <Form.Label>Website URL</Form.Label>
                  <Form.Control
                    type="url"
                    placeholder="https://example.com"
                    value={currentEvidence.websiteUrl}
                    onChange={(e) => handleMediaChange("websiteUrl", e.target.value)}
                    className="py-3"
                    style={{ 
                      borderRadius: '12px',
                      border: '1px solid #e9ecef',
                      background: '#f8f9fa'
                    }}
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Check
                    type="checkbox"
                    label="Mask website URL for privacy"
                    checked={currentEvidence.isMasked}
                    onChange={(e) => {
                      handleMediaChange("isMasked", e.target.checked)
                      if (e.target.checked && currentEvidence.websiteUrl) {
                        handleMediaChange("maskedContent", maskWebsite(currentEvidence.websiteUrl))
                      }
                    }}
                    className="mt-2"
                  />
                </Form.Group>
              </>
            )}

            {/* Phone Number */}
            {currentEvidence.evidenceType === "PHONE_NUMBER" && (
              <>
                <Form.Group className="mb-4">
                  <Form.Label>Phone Number</Form.Label>
                  <Form.Control
                    type="tel"
                    placeholder="+1234567890"
                    value={currentEvidence.phoneNumber}
                    onChange={(e) => handleMediaChange("phoneNumber", e.target.value)}
                    className="py-3"
                    style={{ 
                      borderRadius: '12px',
                      border: '1px solid #e9ecef',
                      background: '#f8f9fa'
                    }}
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Check
                    type="checkbox"
                    label="Mask phone number for privacy"
                    checked={currentEvidence.isMasked}
                    onChange={(e) => {
                      handleMediaChange("isMasked", e.target.checked)
                      if (e.target.checked && currentEvidence.phoneNumber) {
                        handleMediaChange("maskedContent", maskPhoneNumber(currentEvidence.phoneNumber))
                      }
                    }}
                    className="mt-2"
                  />
                </Form.Group>
              </>
            )}

            {/* Email Address */}
            {currentEvidence.evidenceType === "EMAIL_ADDRESS" && (
              <>
                <Form.Group className="mb-4">
                  <Form.Label>Email Address</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="example@domain.com"
                    value={currentEvidence.emailAddress}
                    onChange={(e) => handleMediaChange("emailAddress", e.target.value)}
                    className="py-3"
                    style={{ 
                      borderRadius: '12px',
                      border: '1px solid #e9ecef',
                      background: '#f8f9fa'
                    }}
                  />
                </Form.Group>
                <Form.Group className="mb-4">
                  <Form.Check
                    type="checkbox"
                    label="Mask email address for privacy"
                    checked={currentEvidence.isMasked}
                    onChange={(e) => {
                      handleMediaChange("isMasked", e.target.checked)
                      if (e.target.checked && currentEvidence.emailAddress) {
                        handleMediaChange("maskedContent", maskEmail(currentEvidence.emailAddress))
                      }
                    }}
                    className="mt-2"
                  />
                </Form.Group>
              </>
            )}

            {/* Description for all evidence types */}
            <Form.Group className="mb-4">
              <Form.Label>Description (Optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Describe this evidence..."
                value={currentEvidence.description}
                onChange={(e) => handleMediaChange("description", e.target.value)}
                className="py-3"
                style={{ 
                  borderRadius: '12px',
                  border: '1px solid #e9ecef',
                  background: '#f8f9fa'
                }}
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Check
                type="checkbox"
                label="I consent to store this evidence for display purposes"
                checked={currentEvidence.hasUserConsent}
                onChange={(e) => handleMediaChange("hasUserConsent", e.target.checked)}
                required
              />
            </Form.Group>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={addEvidence}
          disabled={
            !currentEvidence.evidenceType || 
            !currentEvidence.hasUserConsent ||
            (currentEvidence.evidenceType === "IMAGE" || 
             currentEvidence.evidenceType === "VIDEO" || 
             currentEvidence.evidenceType === "PDF") && !currentEvidence.file
          }
        >
          <FaUpload className="me-2" />
          Add Evidence
        </Button>
      </Modal.Footer>
    </Modal>
  )
}

export default GroupEvidenceModal