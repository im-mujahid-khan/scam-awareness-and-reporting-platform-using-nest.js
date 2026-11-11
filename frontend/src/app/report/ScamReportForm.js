"use client"

import { useState, useEffect } from "react"
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
import { Country, State, City } from 'country-state-city'
import {
  FaExclamationTriangle,
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
  FaCheck,
  FaExclamationCircle,
  FaCloudUploadAlt
} from "react-icons/fa"
import { toast } from "react-toastify"

const ScamReportForm = ({ 
  scamTypes, 
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
    scamTypeId: "",
    lostAmount: "",
    currency: "USD",
    country: "",
    region: "",
    city: "",
    incidentDate: "",
    companyId: "",
    companyNameManual: "",
  })

  const [evidence, setEvidence] = useState([])
  const [showEvidenceModal, setShowEvidenceModal] = useState(false)
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

  const [errors, setErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  
  // Track upload progress for each file
  const [uploadProgress, setUploadProgress] = useState({})
  const [uploadStatus, setUploadStatus] = useState({})
  
  // Location states
  const [countries, setCountries] = useState([])
  const [regions, setRegions] = useState([])
  const [cities, setCities] = useState([])

  // Companies state
  const [companies, setCompanies] = useState([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)

  // Sensitive Info Modal State
  const [showSensitiveInfoModal, setShowSensitiveInfoModal] = useState(false)
  const [pendingImageForSensitiveCheck, setPendingImageForSensitiveCheck] = useState(null)
  const [pendingFileName, setPendingFileName] = useState("")
  const [pendingFileData, setPendingFileData] = useState(null)

  // Preview modal state
  const [showImagePreview, setShowImagePreview] = useState(false)
  const [imagePreviewUrl, setImagePreviewUrl] = useState("")
  const [imagePreviewTitle, setImagePreviewTitle] = useState("")

  useEffect(() => {
    const allCountries = Country.getAllCountries().map(country => ({
      value: country.isoCode,
      label: country.name,
      phoneCode: country.phonecode,
      flag: country.flag
    }))
    setCountries(allCountries.sort((a, b) => a.label.localeCompare(b.label)))
  }, [])

  useEffect(() => {
    if (formData.country) {
      const countryStates = State.getStatesOfCountry(formData.country).map(state => ({
        value: state.isoCode,
        label: state.name
      }))
      setRegions(countryStates.sort((a, b) => a.label.localeCompare(b.label)))
      setFormData(prev => ({ ...prev, region: '', city: '' }))
      setCities([])
    } else {
      setRegions([])
      setCities([])
    }
  }, [formData.country])

  useEffect(() => {
    if (formData.country && formData.region) {
      const stateCities = City.getCitiesOfState(formData.country, formData.region).map(city => ({
        value: city.name,
        label: city.name
      }))
      setCities(stateCities.sort((a, b) => a.label.localeCompare(b.label)))
      setFormData(prev => ({ ...prev, city: '' }))
    } else {
      setCities([])
    }
  }, [formData.country, formData.region])

  // Fetch ALL companies on component mount
  useEffect(() => {
    fetchAllCompanies()
  }, [])

  // Function to upload file to server immediately when added
  const uploadFileToServer = async (file, evidenceId) => {
    try {
      setUploadStatus(prev => ({ ...prev, [evidenceId]: 'uploading' }))
      setUploadProgress(prev => ({ ...prev, [evidenceId]: 0 }))
      
      const formData = new FormData()
      formData.append('file', file)
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const current = prev[evidenceId] || 0
          if (current < 90) {
            return { ...prev, [evidenceId]: current + 10 }
          }
          return prev
        })
      }, 200)

      const response = await api.upload.uploadReportEvidence(formData)
      
      clearInterval(progressInterval)
      setUploadProgress(prev => ({ ...prev, [evidenceId]: 100 }))
      setUploadStatus(prev => ({ ...prev, [evidenceId]: 'success' }))
      
      return response // Should contain {url, key, fileName, fileSize, mimeType, bucket, createdAt}
    } catch (error) {
      console.error("File upload failed:", error)
      setUploadStatus(prev => ({ ...prev, [evidenceId]: 'error' }))
      throw error
    }
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
      
      // Update evidence with uploaded URL
      setEvidence(prev => prev.map(evidenceItem => {
        if (evidenceItem.id === item.id) {
          return {
            ...evidenceItem,
            fileUrl: uploadResult.url,
            fileName: uploadResult.fileName,
            mimeType: uploadResult.mimeType,
            fileSize: uploadResult.fileSize,
            isMasked: item.isMasked,
            originalContent: item.originalContent || uploadResult.url,
            maskedContent: item.maskedContent || uploadResult.url
          }
        }
        return evidenceItem
      }))
      
      toast.success(`${item.fileName} uploaded successfully!`)
    } catch (error) {
      console.error("Retry upload failed:", error)
      toast.error(`Failed to upload ${item.fileName}`)
    }
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
            <FaExclamationCircle className="me-1" /> Upload Failed
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

  // Fetch ALL companies
  const fetchAllCompanies = async () => {
    try {
      setLoadingCompanies(true)
      
      let companiesData = []
      
      try {
        const response = await api.companies.getAllCompanies()
        
        if (Array.isArray(response)) {
          companiesData = response
        } else if (response.companies && Array.isArray(response.companies)) {
          companiesData = response.companies
        } else if (response.data && Array.isArray(response.data)) {
          companiesData = response.data
        }
      } catch (error) {
        const response = await api.companies.getMyCompanies()
        if (Array.isArray(response)) {
          companiesData = response
        } else if (response.companies && Array.isArray(response.companies)) {
          companiesData = response.companies
        } else if (response.data && Array.isArray(response.data)) {
          companiesData = response.data
        }
      }
      
      setCompanies(companiesData)
    } catch (error) {
      console.error("Failed to fetch companies:", error)
      toast.error("Failed to load companies list")
    } finally {
      setLoadingCompanies(false)
    }
  }

  const validateForm = () => {
    const newErrors = {}
    if (!formData.title.trim()) newErrors.title = "Title is required"
    if (!formData.description.trim()) newErrors.description = "Description is required"
    if (!formData.scamTypeId) newErrors.scamTypeId = "Scam type is required"
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error("Please fill all required fields")
      return
    }

    // Check if all files are uploaded
    const unuploadedFiles = evidence.filter(item => 
      ["IMAGE", "VIDEO", "PDF"].includes(item.evidenceType) && 
      !item.fileUrl
    )
    
    if (unuploadedFiles.length > 0) {
      toast.error(`Please wait for ${unuploadedFiles.length} file(s) to finish uploading`)
      return
    }

    // Check for upload errors
    const failedUploads = evidence.filter(item => 
      ["IMAGE", "VIDEO", "PDF"].includes(item.evidenceType) && 
      uploadStatus[item.id] === 'error'
    )
    
    if (failedUploads.length > 0) {
      toast.error(`Some files failed to upload. Please remove and re-add them.`)
      return
    }

    setIsSubmitting(true)

    try {
      // Prepare evidence for submission
      const evidenceForSubmission = evidence.map(item => {
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
      
      const payload = {
        title: formData.title,
        description: formData.description,
        scamTypeId: formData.scamTypeId,
        postType: "SCAM_REPORT",
        ...(formData.lostAmount && { 
          lostAmount: parseFloat(formData.lostAmount).toFixed(2) 
        }),
        ...(formData.currency && { currency: formData.currency }),
        ...(formData.country && { country: formData.country }),
        ...(formData.region && { region: formData.region }),
        ...(formData.city && { city: formData.city }),
        ...(formData.incidentDate && { incidentDate: formData.incidentDate }),
        ...(formData.companyId && { companyId: formData.companyId }),
        ...(formData.companyNameManual && { companyNameManual: formData.companyNameManual }),
        ...(evidenceForSubmission.length > 0 && { evidence: evidenceForSubmission }),
        isCompanyPost: !!formData.companyId
      }

      const response = await api.posts.createScamReport(payload)
      
      if (evidenceForSubmission.length > 0) {
        toast.success(
          "Thank you for your report. Your submission includes evidence and is currently under review by our team. " +
          "Once reviewed, it will appear in the newsfeed."
        )
        router.push("/dashboard/posts")
      } else {
        toast.success("Scam report submitted successfully! It has been published.")
        router.push("/feed")
      }
      
      // Clear form
      setFormData({
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
      })
      setEvidence([])
      setUploadProgress({})
      setUploadStatus({})
      
    } catch (error) {
      console.error("Submission error:", error)
      toast.error(error.message || "Failed to submit report")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMediaChange = (field, value) => {
    setCurrentEvidence(prev => ({
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
        
        // Update current evidence with masked image
        setCurrentEvidence(prev => ({
          ...prev,
          file: file,
          fileUrl: undefined, // Clear fileUrl as we'll upload the file
          maskedPreviewUrl: undefined, // Don't store data URL
          isMasked: true,
          containsSensitiveInfo: true,
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
      fileUrl: undefined, // Will be set after upload
      maskedPreviewUrl: undefined, // Don't store data URLs
      originalFileUrl: undefined,
      containsSensitiveInfo: currentEvidence.containsSensitiveInfo,
    }
    
    // Add type-specific data
    if (evidenceType === "PHONE_NUMBER") {
      newEvidence.phoneNumber = maskedContent || originalContent
    } else if (evidenceType === "EMAIL_ADDRESS") {
      newEvidence.emailAddress = maskedContent || originalContent
    } else if (evidenceType === "WEBSITE") {
      newEvidence.websiteUrl = maskedContent || originalContent
    } else if (["IMAGE", "VIDEO", "PDF"].includes(evidenceType)) {
      // Upload file immediately
      try {
        toast.info(`Uploading ${currentEvidence.fileName}...`)
        const uploadResult = await uploadFileToServer(
          currentEvidence.file,
          evidenceId
        )
        
        // Update evidence with uploaded URL from response
        newEvidence.fileUrl = uploadResult.url
        newEvidence.fileName = uploadResult.fileName
        newEvidence.mimeType = uploadResult.mimeType
        newEvidence.fileSize = uploadResult.fileSize
        
        // Create a temporary preview URL for display (not stored in state)
        if (evidenceType === "IMAGE") {
          const previewUrl = URL.createObjectURL(currentEvidence.file)
          newEvidence.previewUrl = previewUrl
        }
        
        toast.success(`${currentEvidence.fileName} uploaded successfully!`)
      } catch (uploadError) {
        console.error("Failed to upload file:", uploadError)
        toast.error(`Failed to upload ${currentEvidence.fileName}`)
        // Don't add the evidence item if upload fails
        return
      }
    }

    // Add to evidence array
    setEvidence(prev => [...prev, newEvidence])
    
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
    
    if (!["IMAGE", "VIDEO", "PDF"].includes(evidenceType)) {
      toast.success("Evidence added successfully")
    }
  }

  const removeEvidence = (id) => {
    // Clean up any object URLs before removing
    const item = evidence.find(e => e.id === id)
    if (item && item.previewUrl) {
      URL.revokeObjectURL(item.previewUrl)
    }
    
    setEvidence(prev => prev.filter(e => e.id !== id))
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

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size too large. Maximum 10MB allowed.")
      return
    }

    try {
      setUploadingFile(true)
      
      // Create preview URL for display only
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
        setCurrentEvidence(prev => ({
          ...prev,
          file: file,
          fileUrl: previewUrl, // Only for preview
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          evidenceType: evidenceType,
          originalContent: previewUrl
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
    // Clean up the preview URL
    if (pendingImageForSensitiveCheck) {
      URL.revokeObjectURL(pendingImageForSensitiveCheck)
    }
    
    if (shouldMask && pendingFileData) {
      // Open masking tool with the file
      const previewUrl = URL.createObjectURL(pendingFileData)
      openImageMaskingTool(previewUrl, 'scam', (maskedImageData) => {
        URL.revokeObjectURL(previewUrl) // Clean up
        handleMaskedImageData(maskedImageData)
      })
    } else if (pendingFileData) {
      // User chose not to mask
      setCurrentEvidence(prev => ({
        ...prev,
        file: pendingFileData,
        fileUrl: undefined, // Don't store data URL
        fileName: pendingFileName || "image.png",
        fileSize: pendingFileData.size,
        mimeType: pendingFileData.type,
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
    setEvidence(prev => prev.map(item => {
      if (item.id === id) {
        const evidenceType = getEvidenceType(item);
        const newIsMasked = !item.isMasked;
        
        if (evidenceType === "PHONE_NUMBER") {
          const original = item.originalContent || item.phoneNumber?.replace(/\*/g, '');
          const maskedContent = newIsMasked ? maskPhoneNumber(original) : original;
          return {
            ...item,
            isMasked: newIsMasked,
            phoneNumber: maskedContent,
            maskedContent: maskedContent
          };
        } else if (evidenceType === "EMAIL_ADDRESS") {
          const original = item.originalContent || item.emailAddress?.replace(/\*/g, '');
          const maskedContent = newIsMasked ? maskEmail(original) : original;
          return {
            ...item,
            isMasked: newIsMasked,
            emailAddress: maskedContent,
            maskedContent: maskedContent
          };
        } else if (evidenceType === "WEBSITE") {
          const original = item.originalContent || item.websiteUrl;
          const maskedContent = newIsMasked ? maskWebsite(original) : original;
          return {
            ...item,
            isMasked: newIsMasked,
            websiteUrl: maskedContent,
            maskedContent: maskedContent
          };
        } else if (evidenceType === "IMAGE" || evidenceType === "VIDEO" || evidenceType === "PDF") {
          const original = item.originalContent || item.fileName;
          return {
            ...item,
            isMasked: newIsMasked,
            fileName: newIsMasked ? maskFileName(original) : original,
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

  const toggleSensitiveInfo = (id) => {
    setEvidence(prev => prev.map(item => {
      if (item.id === id) {
        const evidenceType = getEvidenceType(item);
        if (evidenceType === "IMAGE" || evidenceType === "VIDEO") {
          return {
            ...item,
            containsSensitiveInfo: !item.containsSensitiveInfo
          };
        }
      }
      return item;
    }));
  }

  const renderMaskButton = (item) => {
    const evidenceType = getEvidenceType(item);
    
    if (evidenceType === "IMAGE" && item.file) {
      // Create a temporary preview URL for the masking tool
      return (
        <OverlayTrigger
          placement="top"
          overlay={<Tooltip>Click to mask sensitive information in this image</Tooltip>}
        >
          <Button
            variant="outline-warning"
            size="sm"
            onClick={() => {
              const previewUrl = URL.createObjectURL(item.file)
              openImageMaskingTool(previewUrl, 'scam', (maskedImageData) => {
                URL.revokeObjectURL(previewUrl) // Clean up
                
                // Convert data URL to blob and create file
                fetch(maskedImageData.maskedDataUrl)
                  .then(res => res.blob())
                  .then(blob => {
                    const fileName = `masked-image-${Date.now()}.png`
                    const file = new File([blob], fileName, { type: 'image/png' })
                    
                    setEvidence(prev => prev.map(evidenceItem => {
                      if (evidenceItem.id === item.id) {
                        return {
                          ...evidenceItem,
                          file: file,
                          isMasked: true,
                          containsSensitiveInfo: true,
                          maskedContent: "Image has been masked for privacy"
                        };
                      }
                      return evidenceItem;
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

  const isImageOrVideo = (type) => {
    return type === "IMAGE" || type === "VIDEO";
  }

  // Function to preview image
  const previewImage = async (item) => {
    if (item.file) {
      const previewUrl = URL.createObjectURL(item.file)
      setImagePreviewUrl(previewUrl)
      setImagePreviewTitle(item.maskedContent ? "Masked Image Preview" : "Original Image Preview")
      setShowImagePreview(true)
    }
  }

  // Refresh companies function
  const refreshCompanies = async () => {
    await fetchAllCompanies()
    toast.info("Refreshed companies list")
  }

  return (
    <>
      <Form onSubmit={handleSubmit}>
        <Alert variant="light" className="border rounded-3 mb-4" style={{ background: 'rgba(220, 53, 69, 0.05)' }}>
          <FaInfoCircle className="me-2" />
          <span className="fw-medium">
            <strong>Important:</strong> Reports with evidence require admin review. Reports without evidence are auto-published with a "No Evidence" badge.
          </span>
        </Alert>

        {/* Scam Type - Required */}
        <Form.Group className="mb-4">
          <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
            Scam Type <span className="text-danger">*</span>
          </Form.Label>
          <Form.Select
            value={formData.scamTypeId}
            onChange={(e) => setFormData({ ...formData, scamTypeId: e.target.value })}
            isInvalid={!!errors.scamTypeId}
            className="py-3"
            required
            style={{ 
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              background: '#f8f9fa'
            }}
          >
            <option value="">Select the type of scam</option>
            {scamTypes.map((type) => (
              <option key={type.id || type._id} value={type.id || type._id}>
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

        {/* Title - Required */}
        <Form.Group className="mb-4">
          <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
            Report Title <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            type="text"
            placeholder="e.g., Fake Investment Scheme on WhatsApp"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            isInvalid={!!errors.title}
            className="py-3"
            required
            maxLength={200}
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

        {/* Description - Required */}
        <Form.Group className="mb-4">
          <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
            Detailed Description <span className="text-danger">*</span>
          </Form.Label>
          <Form.Control
            as="textarea"
            rows={6}
            placeholder="Describe the scam in detail. Include what happened, how you were contacted, and any suspicious details..."
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            isInvalid={!!errors.description}
            className="py-3"
            required
            maxLength={5000}
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

        {/* Financial Loss - Optional */}
        <Form.Group className="mb-4">
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
              placeholder="0.00"
              value={formData.lostAmount}
              onChange={(e) => setFormData({ ...formData, lostAmount: e.target.value })}
              className="py-3"
              style={{ 
                border: '1px solid #e9ecef',
                borderLeft: 'none',
                borderRadius: '0 12px 12px 0',
                background: '#f8f9fa'
              }}
            />
          </div>
        </Form.Group>

        {/* Location Section - Optional */}
        <Form.Group className="mb-4">
          <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
            Location (Optional)
          </Form.Label>
          <Row className="g-2">
            <Col md={4}>
              <Form.Select
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="py-3 mb-2 mb-md-0"
                style={{ 
                  borderRadius: '12px',
                  border: '1px solid #e9ecef',
                  background: '#f8f9fa'
                }}
              >
                <option value="">Select country</option>
                {countries.map(country => (
                  <option key={country.value} value={country.value}>
                    {country.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Select
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                className="py-3 mb-2 mb-md-0"
                disabled={!formData.country}
                style={{ 
                  borderRadius: '12px',
                  border: '1px solid #e9ecef',
                  background: '#f8f9fa'
                }}
              >
                <option value="">Select region/state</option>
                {regions.map(region => (
                  <option key={region.value} value={region.value}>
                    {region.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Select
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                className="py-3"
                disabled={!formData.region}
                style={{ 
                  borderRadius: '12px',
                  border: '1px solid #e9ecef',
                  background: '#f8f9fa'
                }}
              >
                <option value="">Select city</option>
                {cities.map(city => (
                  <option key={city.value} value={city.value}>
                    {city.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
        </Form.Group>

        {/* Incident Date - Optional */}
        <Form.Group className="mb-4">
          <Form.Label className="fw-medium mb-2" style={{ color: '#4a5568' }}>
            Incident Date (Optional)
          </Form.Label>
          <Form.Control
            type="date"
            value={formData.incidentDate}
            onChange={(e) => setFormData({ ...formData, incidentDate: e.target.value })}
            className="py-3"
            max={new Date().toISOString().split('T')[0]}
            style={{ 
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              background: '#f8f9fa'
            }}
          />
        </Form.Group>

        {/* Company Involvement - Optional */}
        <Form.Group className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <Form.Label className="fw-medium mb-0" style={{ color: '#4a5568' }}>
              Company Involved (Optional)
            </Form.Label>
            {companies.length > 0 && (
              <Button
                variant="link"
                size="sm"
                onClick={refreshCompanies}
                disabled={loadingCompanies}
                className="p-0 text-decoration-none"
              >
                <small>
                  {loadingCompanies ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-1" />
                      Refreshing...
                    </>
                  ) : (
                    "Refresh List"
                  )}
                </small>
              </Button>
            )}
          </div>
          
          {/* Company Selector - Shows all companies */}
          {loadingCompanies ? (
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" className="me-2" />
              Loading companies...
            </div>
          ) : companies.length > 0 ? (
            <>
              <Form.Select
                value={formData.companyId}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  companyId: e.target.value,
                  companyNameManual: e.target.value ? "" : formData.companyNameManual
                })}
                className="py-3 mb-3"
                style={{ 
                  borderRadius: '12px',
                  border: '1px solid #e9ecef',
                  background: '#f8f9fa'
                }}
              >
                <option value="">Select a company</option>
                {companies.map((company) => (
                  <option key={company.id || company._id} value={company.id || company._id}>
                    {company.name}
                    {company.domain ? ` (${company.domain})` : ''}
                    {company.description ? ` - ${company.description.substring(0, 50)}${company.description.length > 50 ? '...' : ''}` : ''}
                  </option>
                ))}
              </Form.Select>
              
              <div className="text-center mb-3">
                <span className="text-muted small">- OR -</span>
              </div>
            </>
          ) : (
            <Alert variant="info" className="rounded-3 mb-3">
              <FaInfoCircle className="me-2" />
              <span>
                No companies found in the system. You can manually enter a company name below.
              </span>
            </Alert>
          )}
          
          {/* Manual Company Input */}
          <Form.Control
            type="text"
            placeholder="Enter company name manually"
            value={formData.companyNameManual}
            onChange={(e) => setFormData({ 
              ...formData, 
              companyNameManual: e.target.value,
              companyId: e.target.value ? "" : formData.companyId
            })}
            className="py-3"
            style={{ 
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              background: '#f8f9fa'
            }}
          />
          
          <Form.Text className="text-muted small">
            Select from available companies or enter a new company name
          </Form.Text>
        </Form.Group>

        {/* Evidence Section - Optional */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h6 className="fw-semibold mb-0" style={{ color: '#4a5568' }}>
                Evidence Library (Optional)
              </h6>
              <small className="text-muted">
                <FaCloudUploadAlt className="me-1" /> <strong>Files are uploaded immediately when added</strong>
                <br />
                <FaCheck className="me-1" /> Green badge means file is ready for submission
                <br />
                <FaMask className="me-1" /> Mask sensitive information before uploading
                <br />
                <FaBrush className="me-1" /> Use the brush icon to mask sensitive areas in images
                <br />
                <FaEye className="me-1" /> Click the preview button to view masked images
              </small>
            </div>
            <Button
              variant="outline-secondary"
              size="sm"
              onClick={() => setShowEvidenceModal(true)}
              className="rounded-pill px-3"
            >
              <FaPlus className="me-1" />
              Add Evidence
            </Button>
          </div>

          {evidence.length === 0 ? (
            <Alert variant="light" className="text-center py-4 rounded-3">
              <p className="text-muted mb-0">
                No evidence added. Reports without evidence are published immediately.
              </p>
            </Alert>
          ) : (
            <>
              <div className="row g-2 mb-3">
                {evidence.map((item) => {
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
                              {isImageOrVideo(evidenceType) && item.containsSensitiveInfo && (
                                <Badge bg="danger" className="px-2 py-1 me-2" style={{ fontSize: '0.7rem' }}>
                                  <FaCamera className="me-1" /> Sensitive
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
                                  {isImageOrVideo(evidenceType) && (
                                    <OverlayTrigger
                                      placement="top"
                                      overlay={
                                        <Tooltip>
                                          {item.containsSensitiveInfo 
                                            ? "This image/video contains sensitive information (click to remove flag)" 
                                            : "Flag this image/video as containing sensitive information"}
                                        </Tooltip>
                                      }
                                    >
                                      <Button
                                        variant={item.containsSensitiveInfo ? "outline-danger" : "outline-secondary"}
                                        size="sm"
                                        onClick={() => toggleSensitiveInfo(item.id)}
                                        className="rounded-circle p-1"
                                        style={{ width: '28px', height: '28px' }}
                                      >
                                        <FaCamera size={12} />
                                      </Button>
                                    </OverlayTrigger>
                                  )}
                                  {evidenceType === "IMAGE" && item.file && (
                                    <OverlayTrigger
                                      placement="top"
                                      overlay={
                                        <Tooltip>
                                          {item.isMasked ? "Preview masked image" : "Preview original image"}
                                        </Tooltip>
                                      }
                                    >
                                      <Button
                                        variant="outline-primary"
                                        size="sm"
                                        onClick={() => previewImage(item)}
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
                              
                              {/* Upload Status Messages */}
                              {["IMAGE", "VIDEO", "PDF"].includes(evidenceType) && 
                               uploadStatus[item.id] === 'error' && (
                                <div className="mt-2">
                                  <Alert variant="danger" className="py-1 mb-0">
                                    <small>
                                      <FaExclamationCircle className="me-1" />
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
                                        onClick={() => removeEvidence(item.id)}
                                      >
                                        <FaTimes className="me-1" /> Remove
                                      </Button>
                                    </small>
                                  </Alert>
                                </div>
                              )}
                            </div>
                            
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => removeEvidence(item.id)}
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

        {/* Submit Button */}
        <div className="border-top pt-4">
          <div className="d-flex gap-2">
            <Button
              type="submit"
              variant="danger"
              disabled={
                isSubmitting || 
                isMaskingImage ||
                evidence.some(item => 
                  ["IMAGE", "VIDEO", "PDF"].includes(item.evidenceType) && 
                  (!item.fileUrl || uploadStatus[item.id] === 'error')
                )
              }
              className="flex-grow-1 py-3"
              style={{ 
                borderRadius: '12px',
                background: '#dc3545',
                border: 'none',
                fontSize: '1.1rem'
              }}
            >
              {isSubmitting ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <FaCheckCircle className="me-2" />
                  Submit Scam Report
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
      <Modal show={showEvidenceModal} onHide={() => {
        setShowEvidenceModal(false)
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
      }} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add Evidence to Scam Report</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="info" className="rounded-3 mb-4">
            <FaInfoCircle className="me-2" />
            <span className="fw-medium">
              <strong>Important:</strong> Files are uploaded immediately when you click "Add & Upload Evidence".
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
            {!currentEvidence.evidenceType && (
              <div className="text-danger mt-2 small fw-medium">
                Please select type
              </div>
            )}
          </Form.Group>

          {/* Show fields based on selected type */}
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
                      {isMaskingImage && (
                        <div className="mt-3">
                          <Spinner animation="border" size="sm" variant="warning" className="me-2" />
                          Masking image in progress...
                        </div>
                      )}
                      {currentEvidence.file && (
                        <Alert variant="success" className="mt-3 mb-0">
                          <FaCheckCircle className="me-2" />
                          File selected: {currentEvidence.fileName || "file"}
                          <div className="mt-1 small">
                            Size: {(currentEvidence.file.size / 1024 / 1024).toFixed(2)} MB
                          </div>
                        </Alert>
                      )}
                    </div>
                  </Form.Group>

                  {/* Image Preview Section - Only for IMAGE type */}
                  {currentEvidence.evidenceType === "IMAGE" && currentEvidence.file && (
                    <Form.Group className="mb-4">
                      <div className="border rounded p-3" style={{ background: '#f8f9fa' }}>
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6 className="mb-0">Image Preview</h6>
                          <div className="d-flex gap-2">
                            {currentEvidence.isMasked ? (
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
                              {currentEvidence.isMasked 
                                ? "Masked Image (This is what will be submitted)"
                                : "Original Image - Mask sensitive areas if needed"}
                            </p>
                          </div>
                          
                          <div 
                            className="border rounded overflow-hidden position-relative mx-auto" 
                            style={{ height: '200px', width: '100%', maxWidth: '300px' }}
                          >
                            {currentEvidence.file ? (
                              <>
                                <img 
                                  src={URL.createObjectURL(currentEvidence.file)} 
                                  alt="Preview" 
                                  style={{ 
                                    width: '100%', 
                                    height: '100%', 
                                    objectFit: 'cover',
                                    cursor: 'pointer'
                                  }} 
                                  onClick={() => previewImage(currentEvidence)}
                                />
                                <div className="position-absolute top-0 end-0 m-2">
                                  <Button
                                    variant="outline-info"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      previewImage(currentEvidence);
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
                          
                          {currentEvidence.file && (
                            <div className="mt-3 text-center">
                              <small className={currentEvidence.isMasked ? "text-success" : "text-warning"}>
                                <FaCheckCircle className="me-1" />
                                {currentEvidence.isMasked 
                                  ? "Image has been masked. Sensitive information is blurred."
                                  : "Click 'Mask Image' button to blur sensitive areas if needed."}
                              </small>
                              <div className="mt-2">
                                <Button
                                  variant="outline-success"
                                  size="sm"
                                  onClick={() => previewImage(currentEvidence)}
                                  className="me-2"
                                >
                                  <FaEye className="me-1" /> Preview Full Size
                                </Button>
                                <Button
                                  variant="warning"
                                  size="sm"
                                  onClick={() => {
                                    const previewUrl = URL.createObjectURL(currentEvidence.file)
                                    openImageMaskingTool(previewUrl, 'scam', (maskedImageData) => {
                                      URL.revokeObjectURL(previewUrl)
                                      handleMaskedImageData(maskedImageData)
                                    })
                                  }}
                                  disabled={isMaskingImage}
                                >
                                  <FaBrush className="me-1" /> {currentEvidence.isMasked ? 'Re-mask' : 'Mask'} Image
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </Form.Group>
                  )}
                  
                  {/* Sensitive Info Checkbox for Images/Videos */}
                  {(currentEvidence.evidenceType === "IMAGE" || currentEvidence.evidenceType === "VIDEO") && currentEvidence.file && (
                    <Form.Group className="mb-4">
                      <Form.Check
                        type="checkbox"
                        label={
                          <span>
                            <strong>This {currentEvidence.evidenceType.toLowerCase()} contains sensitive information</strong>
                            <br />
                            <small className="text-muted">
                              (e.g., phone numbers, email addresses, personal information visible in the {currentEvidence.evidenceType.toLowerCase()})
                            </small>
                          </span>
                        }
                        checked={currentEvidence.containsSensitiveInfo}
                        onChange={(e) => handleMediaChange("containsSensitiveInfo", e.target.checked)}
                        className="mt-2"
                      />
                      {currentEvidence.containsSensitiveInfo && (
                        <Alert variant="warning" className="mt-2">
                          <FaInfoCircle className="me-2" />
                          <strong>Important:</strong> Please ensure you have blurred or obscured any sensitive information 
                          in the {currentEvidence.evidenceType.toLowerCase()} before submitting. You can use the masking tool 
                          to blur phone numbers, email addresses, or other personal data.
                        </Alert>
                      )}
                    </Form.Group>
                  )}

                  {/* File Name Masking Option */}
                  <Form.Group className="mb-4">
                    <Form.Check
                      type="checkbox"
                      label="Mask file name for privacy"
                      checked={currentEvidence.isMasked}
                      onChange={(e) => handleMediaChange("isMasked", e.target.checked)}
                      className="mt-2"
                    />
                    {currentEvidence.isMasked && currentEvidence.fileName && (
                      <small className="text-muted d-block mt-1">
                        File name will appear as: {maskFileName(currentEvidence.fileName)}
                      </small>
                    )}
                  </Form.Group>
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
                    {currentEvidence.isMasked && currentEvidence.websiteUrl && (
                      <small className="text-muted d-block mt-1">
                        URL will appear as: {maskWebsite(currentEvidence.websiteUrl)}
                      </small>
                    )}
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
                    {currentEvidence.isMasked && currentEvidence.phoneNumber && (
                      <small className="text-muted d-block mt-1">
                        Phone number will appear as: {maskPhoneNumber(currentEvidence.phoneNumber)}
                      </small>
                    )}
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
                    {currentEvidence.isMasked && currentEvidence.emailAddress && (
                      <small className="text-muted d-block mt-1">
                        Email will appear as: {maskEmail(currentEvidence.emailAddress)}
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
          <Button variant="secondary" onClick={() => {
            setShowEvidenceModal(false)
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
          }}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              addEvidence();
              setShowEvidenceModal(false);
            }}
            disabled={
              !currentEvidence.evidenceType || 
              !currentEvidence.hasUserConsent ||
              (currentEvidence.evidenceType === "IMAGE" || 
               currentEvidence.evidenceType === "VIDEO" || 
               currentEvidence.evidenceType === "PDF") && !currentEvidence.file ||
              isMaskingImage
            }
            style={{ 
              borderRadius: '12px',
              background: '#3b82f6',
              border: 'none'
            }}
          >
            <FaUpload className="me-2" />
            Add & Upload Evidence
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Image Preview Modal */}
      <Modal show={showImagePreview} onHide={() => {
        URL.revokeObjectURL(imagePreviewUrl) // Clean up the object URL
        setShowImagePreview(false)
      }} centered size="lg">
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
            <Button variant="secondary" onClick={() => {
              URL.revokeObjectURL(imagePreviewUrl)
              setShowImagePreview(false)
            }}>
              <FaTimes className="me-1" /> Close
            </Button>
            {imagePreviewUrl && (
              <Button 
                variant="primary"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = imagePreviewUrl;
                  link.download = 'image-preview.png';
                  link.click();
                }}
              >
                <FaDownload className="me-1" /> Download Preview
              </Button>
            )}
          </div>
        </Modal.Body>
      </Modal>
    </>
  )
}

export default ScamReportForm