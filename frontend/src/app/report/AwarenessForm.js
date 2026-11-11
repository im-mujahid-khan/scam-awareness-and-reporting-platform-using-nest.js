"use client"

import { useState } from "react"
import { 
  Form, 
  Button, 
  Badge, 
  Spinner, 
  Alert, 
  Modal, 
  OverlayTrigger, 
  Tooltip,
  Card,
  Row,
  Col,
  ProgressBar
} from "react-bootstrap"
import {
  FaShieldAlt,
  FaInfoCircle,
  FaCheckCircle,
  FaPlus,
  FaImage,
  FaVideo,
  FaFilePdf,
  FaLink,
  FaPhone,
  FaEnvelope,
  FaTrash,
  FaUpload,
  FaEye,
  FaEyeSlash,
  FaMask,
  FaFileAlt,
  FaCamera,
  FaBrush,
  FaMoneyBillWave,
  FaBuilding,
  FaMapMarkerAlt,
  FaCalendar,
  FaTimes,
  FaDownload,
  FaCloudUploadAlt,
  FaCheck,
  FaExclamationTriangle,
  FaTimesCircle
} from "react-icons/fa"
import { toast } from "react-toastify"

const AwarenessForm = ({ 
  companies, 
  user, 
  api, 
  router, 
  openImageMaskingTool,
  isMaskingImage
}) => {
  // Form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    companyId: "",
    companyNameManual: "",
  })

  const [media, setMedia] = useState([])
  const [showMediaModal, setShowMediaModal] = useState(false)
  const [currentMedia, setCurrentMedia] = useState({
    evidenceType: "",
    file: null,
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
    maskedContent: "",
  })

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  
  // Track upload progress for each file
  const [uploadProgress, setUploadProgress] = useState({})
  const [uploadStatus, setUploadStatus] = useState({})

  // Sensitive Info Modal State
  const [showSensitiveInfoModal, setShowSensitiveInfoModal] = useState(false)
  const [pendingImageForSensitiveCheck, setPendingImageForSensitiveCheck] = useState(null)
  const [pendingFileName, setPendingFileName] = useState("")
  const [pendingFileData, setPendingFileData] = useState(null)

  // Preview modal state
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [imagePreviewUrl, setImagePreviewUrl] = useState("")
  const [imagePreviewTitle, setImagePreviewTitle] = useState("")

  const validateForm = () => {
    const newErrors = {}
    if (!formData.title.trim()) newErrors.title = "Title is required"
    if (!formData.description.trim()) newErrors.description = "Description is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Function to upload file to server immediately when added
  const uploadFileToServer = async (file, mediaId) => {
    try {
      setUploadStatus(prev => ({ ...prev, [mediaId]: 'uploading' }))
      setUploadProgress(prev => ({ ...prev, [mediaId]: 0 }))
      
      const formData = new FormData()
      formData.append('file', file)
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[mediaId] || 0
          if (current < 90) {
            return { ...prev, [mediaId]: current + 10 }
          }
          return prev
        })
      }, 200)

      const response = await api.upload.uploadPostMedia(formData)
      
      clearInterval(progressInterval)
      setUploadProgress(prev => ({ ...prev, [mediaId]: 100 }))
      setUploadStatus(prev => ({ ...prev, [mediaId]: 'success' }))
      
      return response // Should contain {url, key, fileName, etc.}
    } catch (error) {
      console.error("File upload failed:", error)
      setUploadStatus(prev => ({ ...prev, [mediaId]: 'error' }))
      throw error
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error("Please fill all required fields")
      return
    }

    // Check if all files are uploaded
    const unuploadedFiles = media.filter(item => 
      ["IMAGE", "VIDEO", "PDF"].includes(item.evidenceType) && 
      !item.fileUrl
    )
    
    if (unuploadedFiles.length > 0) {
      toast.error(`Please wait for ${unuploadedFiles.length} file(s) to finish uploading`)
      return
    }

    // Check for upload errors
    const failedUploads = media.filter(item => 
      ["IMAGE", "VIDEO", "PDF"].includes(item.evidenceType) && 
      uploadStatus[item.id] === 'error'
    )
    
    if (failedUploads.length > 0) {
      toast.error(`Some files failed to upload. Please remove and re-add them.`)
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare media for submission - files are already uploaded
      const finalMedia = media.map(item => {
        const baseItem = {
          evidenceType: item.evidenceType,
          isMasked: item.isMasked || false,
          hasUserConsent: item.hasUserConsent || true,
          description: item.description || "",
          maskedContent: item.maskedContent || "",
        }
        
        // Add appropriate fields based on evidence type
        switch (item.evidenceType) {
          case "IMAGE":
          case "VIDEO":
          case "PDF":
            return {
              ...baseItem,
              fileUrl: item.fileUrl, // Use the uploaded URL
              fileName: item.fileName,
              mimeType: item.mimeType,
              fileSize: item.fileSize
            }
          case "PHONE_NUMBER":
            return {
              ...baseItem,
              phoneNumber: item.phoneNumber,
            }
          case "EMAIL_ADDRESS":
            return {
              ...baseItem,
              emailAddress: item.emailAddress,
            }
          case "WEBSITE":
            return {
              ...baseItem,
              websiteUrl: item.websiteUrl,
            }
          default:
            return baseItem
        }
      })
      
      // Create the post with media references
      const payload = {
        postType: "SCAM_AWARENESS",
        title: formData.title,
        description: formData.description,
        isCompanyPost: !!formData.companyId,
        ...(formData.companyId && { companyId: formData.companyId }),
        ...(finalMedia.length > 0 && { media: finalMedia })
      }
      
      console.log("Submitting awareness post payload:", payload)
      
      await api.posts.createPost(payload)
      
      toast.success("Awareness post created successfully!")
      
      // Clear form
      setFormData({
        title: "",
        description: "",
        companyId: "",
        companyNameManual: "",
      })
      setMedia([])
      setUploadProgress({})
      setUploadStatus({})
      
      // Redirect to feed
      router.push("/feed")
      
    } catch (error) {
      console.error("Submission error:", error)
      toast.error(error.message || "Failed to create post")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMediaChange = (field, value) => {
    setCurrentMedia(prev => ({
      ...prev,
      [field]: value
    }))
  }

  // Function to handle masked image data from ImageMaskingTool
  const handleMaskedImageData = async (maskedImageData) => {
    if (maskedImageData && maskedImageData.maskedDataUrl) {
      try {
        // Convert data URL to blob
        const response = await fetch(maskedImageData.maskedDataUrl)
        const blob = await response.blob()
        const fileName = `masked-image-${Date.now()}.png`
        const file = new File([blob], fileName, { type: 'image/png' })
        
        // Update current media with masked image
        setCurrentMedia(prev => ({
          ...prev,
          file: file,
          fileUrl: maskedImageData.maskedDataUrl,
          maskedContent: "Image has been masked for privacy",
          isMasked: true,
          evidenceType: "IMAGE",
          mimeType: "image/png",
          fileName: fileName
        }))
        
        toast.success("Image has been masked successfully!")
      } catch (error) {
        console.error("Failed to process masked image:", error)
        toast.error("Failed to process masked image")
      }
    }
  }

  const addMediaItem = async () => {
    const evidenceType = currentMedia.evidenceType
    
    if (!evidenceType) {
      toast.error("Please select evidence type")
      return
    }

    // Validate based on type
    if (evidenceType === "PHONE_NUMBER" && !currentMedia.phoneNumber) {
      toast.error("Please enter phone number")
      return
    }

    if (evidenceType === "EMAIL_ADDRESS" && !currentMedia.emailAddress) {
      toast.error("Please enter email address")
      return
    }

    if (evidenceType === "WEBSITE" && !currentMedia.websiteUrl) {
      toast.error("Please enter website URL")
      return
    }

    if ((evidenceType === "IMAGE" || 
         evidenceType === "VIDEO" || 
         evidenceType === "PDF") && 
        !currentMedia.file) {
      toast.error("Please upload a file")
      return
    }

    // Process masking for text-based evidence
    let maskedContent = "";
    if (evidenceType === "PHONE_NUMBER" && currentMedia.phoneNumber) {
      maskedContent = currentMedia.isMasked ? maskPhoneNumber(currentMedia.phoneNumber) : currentMedia.phoneNumber;
    } else if (evidenceType === "EMAIL_ADDRESS" && currentMedia.emailAddress) {
      maskedContent = currentMedia.isMasked ? maskEmail(currentMedia.emailAddress) : currentMedia.emailAddress;
    } else if (evidenceType === "WEBSITE" && currentMedia.websiteUrl) {
      maskedContent = currentMedia.isMasked ? maskWebsite(currentMedia.websiteUrl) : currentMedia.websiteUrl;
    }

    const mediaId = Date.now().toString()
    const newMedia = {
      id: mediaId,
      evidenceType: evidenceType,
      isMasked: currentMedia.isMasked,
      hasUserConsent: currentMedia.hasUserConsent,
      description: currentMedia.description || "",
      maskedContent: maskedContent,
      fileName: currentMedia.fileName,
      fileSize: currentMedia.fileSize,
      mimeType: currentMedia.mimeType,
      // For file preview
      fileUrl: currentMedia.fileUrl,
      maskedPreviewUrl: evidenceType === "IMAGE" ? currentMedia.fileUrl : undefined,
      file: currentMedia.file,
    }
    
    // Add type-specific data
    if (evidenceType === "PHONE_NUMBER") {
      newMedia.phoneNumber = currentMedia.phoneNumber
    } else if (evidenceType === "EMAIL_ADDRESS") {
      newMedia.emailAddress = currentMedia.emailAddress
    } else if (evidenceType === "WEBSITE") {
      newMedia.websiteUrl = currentMedia.websiteUrl
    } else if (["IMAGE", "VIDEO", "PDF"].includes(evidenceType)) {
      // Upload file immediately
      try {
        toast.info(`Uploading ${currentMedia.fileName}...`)
        const uploadResult = await uploadFileToServer(
          currentMedia.file,
          mediaId
        )
        
        // Update media with uploaded URL from response
        newMedia.fileUrl = uploadResult.url // Use uploaded URL instead of preview URL
        newMedia.fileName = uploadResult.fileName
        newMedia.mimeType = uploadResult.mimeType
        newMedia.fileSize = uploadResult.fileSize
        
        toast.success(`${currentMedia.fileName} uploaded successfully!`)
      } catch (uploadError) {
        console.error("Failed to upload file:", uploadError)
        toast.error(`Failed to upload ${currentMedia.fileName}`)
        // Don't add the media item if upload fails
        return
      }
    }

    // Add to media array
    setMedia(prev => [...prev, newMedia])
    
    // Reset form
    setCurrentMedia({
      evidenceType: "",
      file: null,
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
      maskedContent: "",
    })
    
    if (!["IMAGE", "VIDEO", "PDF"].includes(evidenceType)) {
      toast.success("Media added successfully")
    }
  }

  const removeMedia = (id) => {
    setMedia(prev => prev.filter(e => e.id !== id))
    // Clean up upload tracking
    setUploadProgress(prev => {
      const newProgress = { ...prev }
      delete newProgress[id]
      return newProgress
    })
    setUploadStatus(prev => {
      const newStatus = { ...prev }
      delete newStatus[id]
      return newStatus
    })
  }

  // Retry upload for failed files
  const retryUpload = async (item) => {
    if (!item.file) {
      toast.error("No file available for upload")
      return
    }

    try {
      toast.info(`Retrying upload for ${item.fileName}...`)
      const uploadResult = await uploadFileToServer(item.file, item.id)
      
      // Update media with uploaded URL
      setMedia(prev => prev.map(mediaItem => {
        if (mediaItem.id === item.id) {
          return {
            ...mediaItem,
            fileUrl: uploadResult.url,
            fileName: uploadResult.fileName,
            mimeType: uploadResult.mimeType,
            fileSize: uploadResult.fileSize
          }
        }
        return mediaItem
      }))
      
      toast.success(`${item.fileName} uploaded successfully!`)
    } catch (error) {
      console.error("Retry upload failed:", error)
      toast.error(`Failed to upload ${item.fileName}`)
    }
  }

  const maskPhoneNumber = (phone) => {
    if (!phone) return ""
    const digits = phone.replace(/\D/g, "")
    if (digits.length <= 4) return phone
    const visibleDigits = digits.slice(-4)
    const maskedPart = digits.slice(0, -4).replace(/\d/g, "*")
    return `${maskedPart}${visibleDigits}`
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

  const maskFileName = (fileName) => {
    if (!fileName) return "File"
    const nameParts = fileName.split('.')
    if (nameParts.length === 1) return "*****" + fileName.slice(-4)
    const extension = nameParts.pop()
    const nameWithoutExt = nameParts.join('.')
    if (nameWithoutExt.length <= 3) return "***." + extension
    const firstChar = nameWithoutExt.charAt(0)
    const lastChar = nameWithoutExt.charAt(nameWithoutExt.length - 1)
    const maskedMiddle = "*".repeat(nameWithoutExt.length - 2)
    return `${firstChar}${maskedMiddle}${lastChar}.${extension}`
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

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    const validTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif", "application/pdf", "video/mp4"]
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file type. Please upload image, PDF, or video files.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size too large. Maximum 30MB allowed.")
      return
    }

    try {
      setUploadingFile(true)
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file)
      
      // Determine evidence type
      let evidenceType = "PDF"
      if (file.type.startsWith('image/')) {
        evidenceType = "IMAGE"
      } else if (file.type.startsWith('video/')) {
        evidenceType = "VIDEO"
      }
      
      // For images, show the sensitive info modal
      if (file.type.startsWith('image/')) {
        setPendingImageForSensitiveCheck(previewUrl)
        setPendingFileName(file.name)
        setPendingFileData(file)
        setShowSensitiveInfoModal(true)
      } else {
        // For non-images, set the File object directly
        setCurrentMedia(prev => ({
          ...prev,
          file: file,
          fileUrl: previewUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          evidenceType: evidenceType
        }))
        toast.success("File ready for upload")
      }
    } catch (error) {
      console.error("Failed to process file:", error)
      toast.error("Failed to process file")
    } finally {
      setUploadingFile(false)
    }
  }

  const handleSensitiveInfoResponse = (shouldMask) => {
    if (shouldMask && pendingImageForSensitiveCheck && pendingFileData) {
      // Open masking tool with the image
      openImageMaskingTool(pendingImageForSensitiveCheck, 'awareness', (maskedImageData) => {
        handleMaskedImageData(maskedImageData)
      })
    } else if (pendingFileData) {
      // User chose not to mask
      setCurrentMedia(prev => ({
        ...prev,
        file: pendingFileData,
        fileUrl: pendingImageForSensitiveCheck,
        fileName: pendingFileName || "image.png",
        fileSize: null,
        mimeType: "image/png",
        evidenceType: "IMAGE"
      }))
      toast.success("Image ready for upload")
    }
    
    // Reset pending data
    setPendingImageForSensitiveCheck(null)
    setPendingFileName("")
    setPendingFileData(null)
    setShowSensitiveInfoModal(false)
  }

  const handleFileUploadClick = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = "image/*,video/*,application/pdf"
    input.onchange = (e) => handleFileSelect(e)
    input.click()
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

  const getMediaLabel = (type) => {
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

  const getEvidenceType = (item) => {
    return item.evidenceType
  }

  const toggleMask = (id) => {
    setMedia(prev => prev.map(item => {
      if (item.id === id) {
        const evidenceType = getEvidenceType(item);
        const newIsMasked = !item.isMasked;
        
        if (evidenceType === "PHONE_NUMBER") {
          const original = item.phoneNumber;
          return {
            ...item,
            isMasked: newIsMasked,
            maskedContent: newIsMasked ? maskPhoneNumber(original) : original
          };
        } else if (evidenceType === "EMAIL_ADDRESS") {
          const original = item.emailAddress;
          return {
            ...item,
            isMasked: newIsMasked,
            maskedContent: newIsMasked ? maskEmail(original) : original
          };
        } else if (evidenceType === "WEBSITE") {
          const original = item.websiteUrl;
          return {
            ...item,
            isMasked: newIsMasked,
            maskedContent: newIsMasked ? maskWebsite(original) : original
          };
        } else if (evidenceType === "IMAGE" || evidenceType === "VIDEO" || evidenceType === "PDF") {
          const original = item.fileName;
          return {
            ...item,
            isMasked: newIsMasked,
            maskedContent: newIsMasked ? maskFileName(original) : original
          };
        }
        return {
          ...item,
          isMasked: newIsMasked
        };
      }
      return item;
    }));
  }

  const getDisplayContent = (item) => {
    if (item.maskedContent) {
      return item.maskedContent;
    }
    
    const evidenceType = getEvidenceType(item);
    
    if (evidenceType === "PHONE_NUMBER") {
      return item.phoneNumber;
    } else if (evidenceType === "EMAIL_ADDRESS") {
      return item.emailAddress;
    } else if (evidenceType === "WEBSITE") {
      return item.websiteUrl;
    } else if (item.fileName) {
      return item.fileName;
    } else if (item.description) {
      return item.description;
    }
    return "Evidence";
  }

  const canBeMasked = (item) => {
    const evidenceType = getEvidenceType(item);
    return [
      "PHONE_NUMBER", 
      "EMAIL_ADDRESS", 
      "WEBSITE", 
      "IMAGE", 
      "VIDEO", 
      "PDF"
    ].includes(evidenceType);
  }

  const renderMaskButton = (item) => {
    const evidenceType = getEvidenceType(item);
    
    if (evidenceType === "IMAGE" && (item.fileUrl || item.maskedPreviewUrl)) {
      const imageUrl = item.maskedPreviewUrl || item.fileUrl;
      return (
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip>Click to mask sensitive information in this image</Tooltip>}
        >
          <Button
            variant="outline-warning"
            size="sm"
            onClick={() => {
              openImageMaskingTool(imageUrl, 'awareness', (maskedImageData) => {
                // Convert data URL to blob and create file
                fetch(maskedImageData.maskedDataUrl)
                  .then(res => res.blob())
                  .then(blob => {
                    const fileName = `masked-image-${Date.now()}.png`
                    const file = new File([blob], fileName, { type: 'image/png' })
                    
                    setMedia(prev => prev.map(mediaItem => {
                      if (mediaItem.id === item.id) {
                        return {
                          ...mediaItem,
                          file: file,
                          maskedPreviewUrl: maskedImageData.maskedDataUrl,
                          isMasked: true,
                          maskedContent: "Image has been masked for privacy"
                        };
                      }
                      return mediaItem;
                    }));
                    toast.success("Image has been masked successfully!");
                  })
                  .catch(error => {
                    console.error("Failed to process masked image:", error)
                    toast.error("Failed to process masked image")
                  })
              })
            }}
            className="rounded-circle p-1"
            style={{ width: '28px', height: '28px' }}
          >
            <FaBrush size={12} />
          </Button>
        </OverlayTrigger>
      );
    }
    return null;
  };

  // Function to preview image
  const previewImage = (imageUrl, title = "Image Preview") => {
    setImagePreviewUrl(imageUrl);
    setImagePreviewTitle(title);
    setShowImagePreview(true);
  }

  const getUploadStatusBadge = (item) => {
    const status = uploadStatus[item.id];
    const progress = uploadProgress[item.id] || 0;
    
    if (!["IMAGE", "VIDEO", "PDF"].includes(item.evidenceType)) {
      return null;
    }
    
    if (!item.fileUrl) {
      if (status === 'uploading') {
        return (
          <Badge bg="info" className="px-2 py-1" style={{ fontSize: '0.7rem' }}>
            <FaCloudUploadAlt className="me-1" /> Uploading {progress}%
          </Badge>
        );
      } else if (status === 'error') {
        return (
          <Badge bg="danger" className="px-2 py-1" style={{ fontSize: '0.7rem' }}>
            <FaExclamationTriangle className="me-1" /> Upload Failed
          </Badge>
        );
      } else {
        return (
          <Badge bg="secondary" className="px-2 py-1" style={{ fontSize: '0.7rem' }}>
            <FaUpload className="me-1" /> Ready to Upload
          </Badge>
        );
      }
    } else {
      return (
        <Badge bg="success" className="px-2 py-1" style={{ fontSize: '0.7rem' }}>
          <FaCheck className="me-1" /> Uploaded
        </Badge>
      );
    }
  };

  return (
    <>
      <Form onSubmit={handleSubmit}>
        <Alert variant="light" className="border rounded-3 mb-4" style={{ background: 'rgba(245, 158, 11, 0.05)' }}>
          <div className="d-flex">
            <FaInfoCircle className="me-2 flex-shrink-0" />
            <div>
              <strong>Scam Awareness Posts:</strong> Published immediately to feed. Files are uploaded automatically when added. 
              Mask sensitive information before submitting.
            </div>
          </div>
        </Alert>

        <Form.Group className="mb-4">
          <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
            Title <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            type="text"
            placeholder="e.g., How to Spot Phishing Emails"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            isInvalid={!!errors.title}
            className="py-3"
            required
            style={{ 
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              background: '#f8f9fa'
            }}
          />
          {errors.title && (
            <div className="text-danger mt-2 small fw-medium">
              {errors.title}
            </div>
          )}
        </Form.Group>

        <Form.Group className="mb-4">
          <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
            Content <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={8}
            placeholder="Share your safety tips, awareness information, or educational content..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            isInvalid={!!errors.description}
            className="py-3"
            required
            style={{ 
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              background: '#f8f9fa'
            }}
          />
          {errors.description && (
            <div className="text-danger mt-2 small fw-medium">
              {errors.description}
            </div>
          )}
        </Form.Group>

        {/* Company Post Option */}
        {companies.length > 0 && (
          <Form.Group className="mb-4">
            <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
              Post As (Optional)
            </Form.Label>
            <Form.Select
              value={formData.companyId}
              onChange={(e) => setFormData({ ...formData, companyId: e.target.value })}
              className="py-3"
              style={{ 
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                background: '#f8f9fa'
              }}
            >
              <option value="">Post as myself ({user?.displayName || "User"})</option>
              {companies.map((company) => (
                <option key={company.id} value={company.id}>
                  Post as {company.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        )}

        {/* Evidence Section - Optional */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6 className="fw-semibold mb-0" style={{ color: '#4a5568' }}>
                Evidence Library (Optional)
              </h6>
              <small className="text-muted">
                <FaUpload className="me-1" /> <strong>Files are uploaded immediately when added</strong>
                <br />
                <FaCheck className="me-1" /> Green badge means file is ready for submission
                <br />
                <FaMask className="me-1" /> Mask sensitive information before uploading
              </small>
            </div>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setShowMediaModal(true)}
              className="rounded-pill px-3"
            >
              <FaPlus className="me-1" />
              Add Evidence
            </Button>
          </div>

          {media.length === 0 ? (
            <Alert variant="light" className="text-center py-4 rounded-3">
              <p className="text-muted mb-0">
                No evidence added. Posts are published immediately to the feed.
              </p>
            </Alert>
          ) : (
            <>
              <div className="row g-2 mb-3">
                {media.map((item) => {
                  const evidenceType = getEvidenceType(item);
                  const canMask = canBeMasked(item);
                  const displayContent = getDisplayContent(item);
                  const uploadStatusBadge = getUploadStatusBadge(item);
                  
                  return (
                    <div key={item.id} className="col-12">
                      <Card className="border">
                        <Card.Body className="py-2 px-3">
                          <div className="d-flex align-items-center justify-content-between mb-2">
                            <div className="d-flex align-items-center">
                              <div className="me-3">
                                {getMediaIcon(evidenceType)}
                              </div>
                              <div>
                                <h6 className="mb-0 me-2">{getMediaLabel(evidenceType)}</h6>
                              </div>
                            </div>
                            <div className="d-flex align-items-center">
                              {item.isMasked && canMask && (
                                <Badge bg="warning" className="px-2 py-1 me-2" style={{ fontSize: '0.7rem' }}>
                                  <FaMask className="me-1" /> Masked
                                </Badge>
                              )}
                              {uploadStatusBadge}
                            </div>
                          </div>
                          
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="flex-grow-1">
                              <div className="d-flex align-items-center mb-1">
                                <small className="text-muted me-2" style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {displayContent}
                                </small>
                                <div className="d-flex gap-1">
                                  {canMask && (
                                    <OverlayTrigger
                                      placement="top"
                                      overlay={
                                        <Tooltip>
                                          {item.isMasked ? "Click to unmask (show full information)" : "Click to mask (hide sensitive information)"}
                                        </Tooltip>
                                      }
                                    >
                                      <Button
                                        variant={item.isMasked ? "outline-success" : "outline-info"}
                                        size="sm"
                                        onClick={() => toggleMask(item.id)}
                                        className="rounded-circle p-1"
                                        style={{ width: '28px', height: '28px' }}
                                      >
                                        {item.isMasked ? <FaEyeSlash size={12} /> : <FaEye size={12} />}
                                      </Button>
                                    </OverlayTrigger>
                                  )}
                                  {renderMaskButton(item)}
                                  {evidenceType === "IMAGE" && (item.fileUrl || item.maskedPreviewUrl) && (
                                    <OverlayTrigger
                                      placement="top"
                                      overlay={
                                        <Tooltip>
                                          {item.maskedPreviewUrl ? "Preview masked image" : "Preview original image"}
                                        </Tooltip>
                                      }
                                    >
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => previewImage(
                                          item.maskedPreviewUrl || item.fileUrl,
                                          item.maskedPreviewUrl ? "Masked Image Preview" : "Original Image Preview"
                                        )}
                                        className="rounded-circle p-1"
                                        style={{ width: '28px', height: '28px' }}
                                      >
                                        <FaEye size={12} />
                                      </Button>
                                    </OverlayTrigger>
                                  )}
                                </div>
                              </div>
                              
                              {item.description && (
                                <small className="text-muted d-block mb-1">{item.description}</small>
                              )}
                              
                              {/* Upload Progress Bar */}
                              {["IMAGE", "VIDEO", "PDF"].includes(evidenceType) && 
                               uploadStatus[item.id] === 'uploading' && (
                                <div className="mt-2">
                                  <ProgressBar 
                                    now={uploadProgress[item.id] || 0} 
                                    label={`${uploadProgress[item.id] || 0}%`}
                                    className="mt-1"
                                    style={{ height: '6px' }}
                                  />
                                </div>
                              )}
                              
                              {/* Upload Error Message */}
                              {["IMAGE", "VIDEO", "PDF"].includes(evidenceType) && 
                               uploadStatus[item.id] === 'error' && (
                                <div className="mt-2">
                                  <Alert variant="danger" className="py-1 mb-0">
                                    <small>
                                      <FaExclamationTriangle className="me-1" />
                                      Upload failed. 
                                      <Button 
                                        variant="link" 
                                        size="sm" 
                                        className="p-0 ms-1"
                                        onClick={() => retryUpload(item)}
                                      >
                                        Retry
                                      </Button>
                                      <Button 
                                        variant="link" 
                                        size="sm" 
                                        className="p-0 ms-2 text-danger"
                                        onClick={() => removeMedia(item.id)}
                                      >
                                        <FaTimesCircle className="me-1" /> Remove
                                      </Button>
                                    </small>
                                  </Alert>
                                </div>
                              )}
                            </div>
                            
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => removeMedia(item.id)}
                              className="rounded-circle ms-2 flex-shrink-0"
                              style={{ width: '32px', height: '32px' }}
                            >
                              <FaTrash />
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  );
                })}
              </div>
              
              <Alert variant="info" className="mt-3">
                <FaInfoCircle className="me-2" />
                <strong>Upload Status:</strong>
                <ul className="mt-2 mb-0">
                  <li>
                    <Badge bg="success" className="me-2">✓ Uploaded</Badge>
                    File is ready for submission
                  </li>
                  <li>
                    <Badge bg="info" className="me-2">↑ Uploading</Badge>
                    File is currently uploading
                  </li>
                  <li>
                    <Badge bg="danger" className="me-2">✗ Failed</Badge>
                    Upload failed - click "Retry" or remove and re-add
                  </li>
                </ul>
              </Alert>
            </>
          )}
        </div>

        <div className="border-top pt-4">
          <div className="d-flex gap-2">
            <Button
              type="submit"
              variant="warning"
              disabled={
                isSubmitting || 
                isMaskingImage ||
                media.some(item => 
                  ["IMAGE", "VIDEO", "PDF"].includes(item.evidenceType) && 
                  (!item.fileUrl || uploadStatus[item.id] === 'error')
                )
              }
              className="flex-grow-1 py-3"
              style={{ 
                borderRadius: '12px',
                background: '#f59e0b',
                border: 'none',
                fontSize: '1.1rem'
              }}
            >
              {isSubmitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Publishing...
                </>
              ) : (
                <>
                  <FaCheckCircle className="me-2" />
                  Publish to Feed
                </>
              )}
            </Button>
          </div>
        </div>
      </Form>

      {/* Sensitive Info Modal */}
      <Modal show={showSensitiveInfoModal} onHide={() => {
        setShowSensitiveInfoModal(false)
        setPendingImageForSensitiveCheck(null)
        setPendingFileData(null)
      }} centered>
        <Modal.Header closeButton>
          <Modal.Title>Image Upload Detected</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="rounded-3 mb-4">
            <FaInfoCircle className="me-2" />
            <strong>This is an image.</strong> Does it contain sensitive information?
          </Alert>
          
          <div className="text-center mb-4">
            <div className="mb-3">
              <FaImage size={48} className="text-primary" />
            </div>
            <p className="mb-0">
              Sensitive information includes:
            </p>
            <ul className="text-start mb-4">
              <li>Phone numbers</li>
              <li>Email addresses</li>
              <li>Personal information</li>
              <li>Addresses</li>
              <li>Financial information</li>
            </ul>
            
            <div className="d-grid gap-2">
              <Button 
                variant="warning" 
                size="lg"
                onClick={() => handleSensitiveInfoResponse(true)}
              >
                <FaBrush className="me-2" />
                Yes, open masking tool
              </Button>
              <Button 
                variant="outline-secondary" 
                size="lg"
                onClick={() => handleSensitiveInfoResponse(false)}
              >
                No, upload as-is
              </Button>
            </div>
          </div>
        </Modal.Body>
      </Modal>

      {/* Evidence Modal */}
      <Modal show={showMediaModal} onHide={() => {
        setShowMediaModal(false)
        setCurrentMedia({
          evidenceType: "",
          file: null,
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
          maskedContent: "",
        })
      }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add Evidence to Awareness Post</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="rounded-3 mb-4">
            <FaInfoCircle className="me-2" />
            <span className="fw-medium">
              <strong>Important:</strong> Files are uploaded immediately when you click "Add Evidence".
              Make sure sensitive information is masked before adding.
            </span>
          </Alert>

          <Form.Group className="mb-4">
            <Form.Label className="fw-medium">Evidence Type <span className="text-danger">*</span></Form.Label>
            <Form.Select
              value={currentMedia.evidenceType}
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
            {!currentMedia.evidenceType && (
              <div className="text-danger mt-2 small fw-medium">
                Please select type
              </div>
            )}
          </Form.Group>

          {/* Show fields based on selected type */}
          {currentMedia.evidenceType && (
            <div className="mt-4">
              {/* File Upload for Images, Videos, PDFs */}
              {(currentMedia.evidenceType === "IMAGE" || 
                currentMedia.evidenceType === "VIDEO" || 
                currentMedia.evidenceType === "PDF") && (
                <>
                  <Form.Group className="mb-4">
                    <Form.Label>Upload File</Form.Label>
                    <div className="border rounded p-4 text-center" style={{ background: '#f8f9fa', cursor: 'pointer' }}
                         onClick={handleFileUploadClick}>
                      <FaUpload className="text-muted mb-3" size={40} />
                      <p className="mb-2">
                        Click to select {currentMedia.evidenceType.toLowerCase()} file
                      </p>
                      <small className="text-muted d-block">
                        Supported: {currentMedia.evidenceType === "IMAGE" ? "JPG, PNG, GIF" : 
                                   currentMedia.evidenceType === "VIDEO" ? "MP4" : "PDF"} 
                        • Max 30MB
                      </small>
                      {uploadingFile && (
                        <div className="mt-3">
                          <Spinner animation="border" size="sm" className="me-2" />
                          Processing file...
                        </div>
                      )}
                      {isMaskingImage && (
                        <div className="mt-3">
                          <Spinner animation="border" size="sm" variant="warning" className="me-2" />
                          Masking image in progress...
                        </div>
                      )}
                      {currentMedia.fileUrl && (
                        <Alert variant="success" className="mt-3 mb-0">
                          <FaCheckCircle className="me-2" />
                          File selected: {currentMedia.fileName || "file"}
                          {currentMedia.file && (
                            <div className="mt-1 small">
                              Size: {(currentMedia.file.size / 1024 / 1024).toFixed(2)} MB
                            </div>
                          )}
                        </Alert>
                      )}
                    </div>
                  </Form.Group>

                  {/* Image Preview Section - Only for IMAGE type */}
                  {currentMedia.evidenceType === "IMAGE" && currentMedia.fileUrl && (
                    <Form.Group className="mb-4">
                      <div className="border rounded p-3" style={{ background: '#f8f9fa' }}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="mb-0">Image Preview</h6>
                          <div className="d-flex gap-2">
                            {currentMedia.isMasked ? (
                              <Badge bg="success" className="px-2 py-1">
                                <FaMask className="me-1" /> Masked Applied
                              </Badge>
                            ) : (
                              <Badge bg="warning" className="px-2 py-1">
                                <FaInfoCircle className="me-1" /> Not Masked Yet
                              </Badge>
                            )}
                          </div>
                        </div>
                        
                        {/* Single column showing the image */}
                        <div className="text-center">
                          <div className="mb-3">
                            <p className="small text-muted">
                              {currentMedia.isMasked 
                                ? "Masked Image (This is what will be submitted)"
                                : "Original Image - Mask sensitive areas if needed"}
                            </p>
                          </div>
                          
                          <div 
                            className="border rounded overflow-hidden position-relative mx-auto" 
                            style={{ height: '200px', width: '100%', maxWidth: '300px' }}
                          >
                            {currentMedia.fileUrl ? (
                              <>
                                <img 
                                  src={currentMedia.fileUrl} 
                                  alt="Preview" 
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover',
                                    cursor: 'pointer'
                                  }} 
                                  onClick={() => previewImage(currentMedia.fileUrl, 
                                    currentMedia.isMasked ? "Masked Image Preview" : "Original Image Preview")}
                                />
                                <div className="position-absolute top-0 end-0 m-2">
                                  <Button
                                    variant="outline-info"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      previewImage(currentMedia.fileUrl, 
                                        currentMedia.isMasked ? "Masked Image Preview" : "Original Image Preview");
                                    }}
                                    className="rounded-circle p-1"
                                    style={{ width: '28px', height: '28px' }}
                                  >
                                    <FaEye size={10} />
                                  </Button>
                                </div>
                              </>
                            ) : (
                              <div 
                                className="d-flex flex-column align-items-center justify-content-center h-100 text-muted"
                                style={{ background: '#f0f0f0' }}
                              >
                                <FaImage size={48} className="mb-3" />
                                <small className="mb-3">No image preview</small>
                              </div>
                            )}
                          </div>
                          
                          {currentMedia.fileUrl && (
                            <div className="mt-3 text-center">
                              <small className={currentMedia.isMasked ? "text-success" : "text-warning"}>
                                <FaCheckCircle className="me-1" />
                                {currentMedia.isMasked 
                                  ? "Image has been masked. Sensitive information is blurred."
                                  : "Click 'Mask Image' button to blur sensitive areas if needed."}
                              </small>
                              <div className="mt-2">
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => previewImage(currentMedia.fileUrl, 
                                    currentMedia.isMasked ? "Masked Image Preview" : "Original Image Preview")}
                                  className="me-2"
                                >
                                  <FaEye className="me-1" /> Preview Full Size
                                </Button>
                                <Button
                                  variant="warning"
                                  size="sm"
                                  onClick={() => {
                                    openImageMaskingTool(currentMedia.fileUrl, 'awareness', (maskedImageData) => {
                                      handleMaskedImageData(maskedImageData)
                                    })
                                  }}
                                  disabled={isMaskingImage}
                                >
                                  <FaBrush className="me-1" /> {currentMedia.isMasked ? 'Re-mask' : 'Mask'} Image
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Form.Group>
                  )}
                </>
              )}

              {/* Website URL */}
              {currentMedia.evidenceType === "WEBSITE" && (
                <>
                  <Form.Group className="mb-4">
                    <Form.Label>Website URL</Form.Label>
                    <Form.Control
                      type="url"
                      placeholder="https://example.com"
                      value={currentMedia.websiteUrl}
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
                      checked={currentMedia.isMasked}
                      onChange={(e) => {
                        handleMediaChange("isMasked", e.target.checked)
                        if (e.target.checked && currentMedia.websiteUrl) {
                          handleMediaChange("maskedContent", maskWebsite(currentMedia.websiteUrl))
                        }
                      }}
                      className="mt-2"
                    />
                    {currentMedia.isMasked && currentMedia.websiteUrl && (
                      <small className="text-muted d-block mt-1">
                        URL will appear as: {maskWebsite(currentMedia.websiteUrl)}
                      </small>
                    )}
                  </Form.Group>
                </>
              )}

              {/* Phone Number */}
              {currentMedia.evidenceType === "PHONE_NUMBER" && (
                <>
                  <Form.Group className="mb-4">
                    <Form.Label>Phone Number</Form.Label>
                    <Form.Control
                      type="tel"
                      placeholder="+1234567890"
                      value={currentMedia.phoneNumber}
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
                      checked={currentMedia.isMasked}
                      onChange={(e) => {
                        handleMediaChange("isMasked", e.target.checked)
                        if (e.target.checked && currentMedia.phoneNumber) {
                          handleMediaChange("maskedContent", maskPhoneNumber(currentMedia.phoneNumber))
                        }
                      }}
                      className="mt-2"
                    />
                    {currentMedia.isMasked && currentMedia.phoneNumber && (
                      <small className="text-muted d-block mt-1">
                        Phone number will appear as: {maskPhoneNumber(currentMedia.phoneNumber)}
                      </small>
                    )}
                  </Form.Group>
                </>
              )}

              {/* Email Address */}
              {currentMedia.evidenceType === "EMAIL_ADDRESS" && (
                <>
                  <Form.Group className="mb-4">
                    <Form.Label>Email Address</Form.Label>
                    <Form.Control
                      type="email"
                      placeholder="example@domain.com"
                      value={currentMedia.emailAddress}
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
                      checked={currentMedia.isMasked}
                      onChange={(e) => {
                        handleMediaChange("isMasked", e.target.checked)
                        if (e.target.checked && currentMedia.emailAddress) {
                          handleMediaChange("maskedContent", maskEmail(currentMedia.emailAddress))
                        }
                      }}
                      className="mt-2"
                    />
                    {currentMedia.isMasked && currentMedia.emailAddress && (
                      <small className="text-muted d-block mt-1">
                        Email will appear as: {maskEmail(currentMedia.emailAddress)}
                      </small>
                    )}
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
                  value={currentMedia.description}
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
                  checked={currentMedia.hasUserConsent}
                  onChange={(e) => handleMediaChange("hasUserConsent", e.target.checked)}
                  required
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowMediaModal(false)
            setCurrentMedia({
              evidenceType: "",
              file: null,
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
              maskedContent: "",
            })
          }}>
            Cancel
          </Button>
          <Button 
            variant="warning" 
            onClick={() => {
              addMediaItem();
              setShowMediaModal(false);
            }}
            disabled={
              !currentMedia.evidenceType || 
              !currentMedia.hasUserConsent ||
              (currentMedia.evidenceType === "IMAGE" || 
               currentMedia.evidenceType === "VIDEO" || 
               currentMedia.evidenceType === "PDF") && !currentMedia.file ||
              isMaskingImage
            }
            style={{ 
              borderRadius: '12px',
              background: '#f59e0b',
              border: 'none'
            }}
          >
            <FaUpload className="me-2" />
            Add & Upload Evidence
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Image Preview Modal */}
      <Modal show={showImagePreview} onHide={() => setShowImagePreview(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>{imagePreviewTitle}</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <div className="border rounded p-2 mb-3">
            <img 
              src={imagePreviewUrl} 
              alt="Preview" 
              style={{ 
                maxWidth: '100%', 
                maxHeight: '70vh', 
                objectFit: 'contain' 
              }} 
            />
          </div>
          <div className="d-flex justify-content-center gap-2">
            <Button variant="secondary" onClick={() => setShowImagePreview(false)}>
              <FaTimes className="me-1" /> Close
            </Button>
            {imagePreviewUrl && imagePreviewUrl.startsWith('data:image') && (
              <Button 
                variant="primary"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = imagePreviewUrl;
                  link.download = 'image-preview.png';
                  link.click();
                }}
              >
                <FaDownload className="me-1" /> Download
              </Button>
            )}
          </div>
        </Modal.Body>
      </Modal>
    </>
  )
}

export default AwarenessForm