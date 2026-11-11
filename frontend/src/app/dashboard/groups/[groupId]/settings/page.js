"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Container, Row, Col, Card, Form, Button, Badge, Spinner, Alert, Modal, Tabs, Tab } from "react-bootstrap"
import Select from 'react-select'
import { Country, State, City } from 'country-state-city'
import {
  FaArrowLeft,
  FaSave,
  FaTrash,
  FaCog,
  FaExclamationTriangle,
  FaLock,
  FaGlobe,
  FaBuilding,
  FaUpload,
  FaInfoCircle,
  FaShieldAlt,
  FaBell,
  FaUserPlus,
  FaBan,
  FaMapMarkerAlt,
  FaUserCog,
  FaUsers,
  FaHistory,
  FaCheckCircle,
  FaTimesCircle,
  FaUserCheck,
  FaCrown,
  FaUserTag,
  FaSignOutAlt,
  FaDoorOpen
} from "react-icons/fa"
import { useAuth } from "../../../../../../lib/contexts/AuthContext"
import { toast } from "react-toastify"
import DashboardLayout from "../../../../../../components/layout/DashboardLayout"

const GroupSettingsPage = () => {
  const params = useParams()
  const router = useRouter()
  const { user, api } = useAuth()

  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("general")
  const [formData, setFormData] = useState({})
  const [errors, setErrors] = useState({})
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const [userRole, setUserRole] = useState("")
  const [bannerPreview, setBannerPreview] = useState(null)
  const [bannerFile, setBannerFile] = useState(null)
  const [companies, setCompanies] = useState([])
  
  // Moderation states
  const [moderationLogs, setModerationLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [showLogsModal, setShowLogsModal] = useState(false)
  const [pendingRequests, setPendingRequests] = useState([])
  
  // Location states
  const [countries, setCountries] = useState([])
  const [regions, setRegions] = useState([])
  const [cities, setCities] = useState([])
  const [selectedCountry, setSelectedCountry] = useState(null)
  const [selectedRegion, setSelectedRegion] = useState(null)
  const [selectedCity, setSelectedCity] = useState(null)

  // Group topics from schema
  const groupTopics = [
    { value: "", label: "No specific topic" },
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
    if (params.groupId && user) {
      loadGroupData()
      loadCompanies()
    }
    
    // Load all countries
    const allCountries = Country.getAllCountries().map(country => ({
      value: country.isoCode,
      label: country.name,
      flag: country.flag
    }))
    setCountries(allCountries.sort((a, b) => a.label.localeCompare(b.label)))
  }, [params.groupId, user])

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

  const loadCompanies = async () => {
    try {
      if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
        const response = await api.companies.getMyCompanies()
        setCompanies(response.companies || response || [])
      }
    } catch (error) {
      console.error("Failed to load companies:", error)
    }
  }

  const loadGroupData = async () => {
    try {
      setLoading(true)
      
      console.log("Loading group settings for:", params.groupId, "User:", user?.id)
      
      const groupResponse = await api.groups.getGroupBySlug(params.groupId)
      
      console.log("Group settings API response:", groupResponse)
      
      // CRITICAL: Same membership detection logic as detail page
      const detectedUserRole = groupResponse.userRole || 
                               groupResponse.memberRole || 
                               (groupResponse.createdBy && groupResponse.createdBy.id === user?.id ? 'ADMIN' : null)
      
      console.log("Detected user role:", detectedUserRole, {
        userRole: groupResponse.userRole,
        memberRole: groupResponse.memberRole,
        createdById: groupResponse.createdBy?.id,
        currentUserId: user?.id
      })
      
      // Find country ISO code from country name
      const countryName = groupResponse.country || ""
      const country = Country.getAllCountries().find(c => 
        c.name.toLowerCase() === countryName.toLowerCase()
      )
      
      // Find region ISO code from region name
      const regionName = groupResponse.region || ""
      let region = null
      if (country) {
        region = State.getStatesOfCountry(country.isoCode).find(s => 
          s.name.toLowerCase() === regionName.toLowerCase()
        )
      }
      
      const groupData = {
        id: groupResponse.id,
        slug: groupResponse.slug || groupResponse.id,
        name: groupResponse.name,
        description: groupResponse.description || "",
        visibility: groupResponse.visibility || 'PUBLIC',
        rules: groupResponse.rules || "",
        coverImageUrl: groupResponse.coverImageUrl,
        topic: groupResponse.topic || "",
        postApproval: groupResponse.postApproval || "INSTANT",
        companyId: groupResponse.company?.id || "",
        country: country?.isoCode || "",
        region: region?.isoCode || "",
        city: groupResponse.city || "",
        countryName: groupResponse.country || "",
        regionName: groupResponse.region || "",
        created_at: groupResponse.createdAt,
        user_role: detectedUserRole,
        createdBy: groupResponse.createdBy
      }

      setGroup(groupData)
      setFormData({ ...groupData })
      setUserRole(detectedUserRole)
      
      // Set selected values for dropdowns
      if (country?.isoCode) {
        setSelectedCountry({
          value: country.isoCode,
          label: country.name,
          flag: country.flag
        })
      }
      
      if (region?.isoCode) {
        setSelectedRegion({
          value: region.isoCode,
          label: region.name
        })
      }
      
      if (groupResponse.city) {
        setSelectedCity({
          value: groupResponse.city,
          label: groupResponse.city
        })
      }
      
      if (groupData.coverImageUrl) {
        setBannerPreview(groupData.coverImageUrl)
      }
      
    } catch (error) {
      console.error("Failed to load group:", error)
      toast.error(error.message || "Failed to load group settings")
      
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        router.push('/dashboard/groups')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadModerationLogs = async () => {
    try {
      setLoadingLogs(true)
      const logs = await api.groups.getModerationLogs(group.id)
      setModerationLogs(Array.isArray(logs) ? logs : (logs.data || logs.logs || []))
    } catch (error) {
      console.error("Failed to load moderation logs:", error)
      toast.error("Failed to load moderation logs")
    } finally {
      setLoadingLogs(false)
    }
  }

  const loadPendingRequests = async () => {
    try {
      const response = await api.groups.getJoinRequests(group.id)
      const requestsData = Array.isArray(response) 
        ? response 
        : (response.requests || response.data || [])
      
      const transformedRequests = requestsData.map(request => ({
        id: request.id,
        user: {
          id: request.user?.id,
          name: request.user?.displayName || request.user?.name || "Unknown User",
          email: request.user?.email
        },
        requested_at: request.createdAt || request.requested_at
      }))
      
      setPendingRequests(transformedRequests)
    } catch (error) {
      console.error("Failed to load pending requests:", error)
    }
  }

  const handleViewModerationLogs = async () => {
    await loadModerationLogs()
    setShowLogsModal(true)
  }

  const handleViewModerationPage = async () => {
  try {
    // First, verify we still have admin access
    const groupResponse = await api.groups.getGroupBySlug(params.groupId)
    const currentRole = groupResponse.userRole || 
                       groupResponse.memberRole || 
                       (groupResponse.createdBy && groupResponse.createdBy.id === user?.id ? 'ADMIN' : null)
    
    if (!['ADMIN', 'MODERATOR'].includes(currentRole)) {
      toast.error("You no longer have permission to access the moderation panel")
      return
    }
    
    // Try to access moderation data to verify permissions
    await api.groupPosts.getPendingPosts(groupResponse.id)
    
    // If successful, navigate to moderation page
    router.push(`/dashboard/groups/${params.groupId}/moderation`)
    
  } catch (error) {
    console.error("Permission check failed:", error)
    
    if (error.message?.includes('403') || error.message?.includes('permission') || error.message?.includes('denied')) {
      toast.error("You don't have permission to access the moderation panel")
    } else {
      toast.error("Failed to access moderation panel")
    }
  }
}

  const handleViewMembersPage = () => {
    router.push(`/dashboard/groups/${params.groupId}/members`)
  }

  const formatDate = (dateString) => {
    if (!dateString) return ""
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    } catch (error) {
      return ""
    }
  }

  const handleLeaveGroup = async () => {
    if (!group) return;
    
    setLeaving(true);
    try {
      // Call the leave group API endpoint
      await api.groups.leaveGroup(group.id);
      
      toast.success("You have successfully left the group!");
      
      // Navigate to groups page
      setTimeout(() => {
        router.push("/dashboard/groups");
      }, 1000);
      
    } catch (error) {
      console.error("Failed to leave group:", error);
      
      // Handle specific error cases based on API documentation
      if (error.message?.includes('403') || error.message?.includes('Cannot leave as only admin')) {
        toast.error("You cannot leave as the only admin. Please transfer ownership to another member first.");
      } else if (error.message?.includes('409') || error.message?.includes('Not a member')) {
        toast.error("You are not a member of this group.");
        // If not a member, redirect to groups page
        setTimeout(() => {
          router.push("/dashboard/groups");
        }, 2000);
      } else {
        toast.error(error.message || "Failed to leave group. Please try again.");
      }
      
      setLeaving(false);
      setShowLeaveModal(false);
    }
  };

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name?.trim()) {
      newErrors.name = "Group name is required"
    } else if (formData.name.length < 3) {
      newErrors.name = "Group name must be at least 3 characters"
    } else if (formData.name.length > 60) {
      newErrors.name = "Group name must be less than 60 characters"
    }

    if (formData.description && formData.description.length > 700) {
      newErrors.description = "Description must be less than 700 characters"
    }

    if (formData.rules && formData.rules.length > 1000) {
      newErrors.rules = "Rules must be less than 1000 characters"
    }

    if (formData.visibility === "OFFICIAL" && !formData.companyId) {
      newErrors.companyId = "Company is required for official groups"
    }

    return newErrors
  }

  const handleSaveSettings = async () => {
    const validationErrors = validateForm()
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      toast.error("Please fix the errors in the form")
      return
    }

    setSaving(true)
    try {
      // Get country and region names from ISO codes
      const selectedCountryObj = countries.find(c => c.value === formData.country)
      const selectedRegionObj = regions.find(r => r.value === formData.region)
      
      // Prepare update data
      const updateData = {
        name: formData.name.trim(),
        visibility: formData.visibility,
        description: formData.description?.trim() || undefined,
        rules: formData.rules?.trim() || undefined,
        topic: formData.topic || undefined,
        postApproval: formData.postApproval,
        country: selectedCountryObj?.label || formData.country?.trim() || undefined,
        region: selectedRegionObj?.label || formData.region?.trim() || undefined,
        city: formData.city?.trim() || undefined,
      }

      // Add companyId for official groups
      if (formData.visibility === "OFFICIAL" && formData.companyId) {
        updateData.companyId = formData.companyId
      }

      // Upload new banner if changed
      if (bannerFile) {
        const uploadFormData = new FormData()
        uploadFormData.append('file', bannerFile)
        
        try {
          const uploadResponse = await api.upload.uploadFile(uploadFormData)
          updateData.coverImageUrl = uploadResponse.url || uploadResponse.fileUrl
        } catch (uploadError) {
          console.error("Failed to upload banner:", uploadError)
          toast.warning("Settings saved but banner upload failed")
        }
      } else if (bannerPreview === null && group.coverImageUrl) {
        // Banner was removed
        updateData.coverImageUrl = null
      }

      // Update group
      await api.groups.updateGroup(group.id, updateData)
      
      toast.success("Settings saved successfully!")
      
      // Reload group data
      await loadGroupData()
      
    } catch (error) {
      console.error("Failed to save settings:", error)
      toast.error(error.message || "Failed to save settings")
      setErrors({ submit: error.message || "An error occurred" })
    } finally {
      setSaving(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
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

  const handleCountryChange = (option) => {
    setSelectedCountry(option)
    setFormData(prev => ({
      ...prev,
      country: option?.value || "",
      region: "",
      city: ""
    }))
    setSelectedRegion(null)
    setSelectedCity(null)
  }

  const handleRegionChange = (option) => {
    setSelectedRegion(option)
    setFormData(prev => ({
      ...prev,
      region: option?.value || "",
      city: ""
    }))
    setSelectedCity(null)
  }

  const handleCityChange = (option) => {
    setSelectedCity(option)
    setFormData(prev => ({
      ...prev,
      city: option?.value || ""
    }))
  }

  const handleBannerUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Validate file
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a valid image file (JPEG, PNG, GIF, WebP)")
      return
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error("Image size must be less than 5MB")
      return
    }

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setBannerPreview(reader.result)
    }
    reader.readAsDataURL(file)

    // Store file for upload
    setBannerFile(file)
  }

  const removeBanner = () => {
    setBannerPreview(null)
    setBannerFile(null)
    setFormData(prev => ({
      ...prev,
      coverImageUrl: null
    }))
  }

  const getVisibilityBadge = (visibility) => {
    switch (visibility) {
      case "PUBLIC":
        return (
          <Badge 
            bg="" 
            className="py-1 px-2 rounded-pill border-0"
            style={{ 
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: 'white'
            }}
          >
            <FaGlobe className="me-1" />
            Public
          </Badge>
        )
      case "PRIVATE":
        return (
          <Badge 
            bg="" 
            className="py-1 px-2 rounded-pill border-0"
            style={{ 
              background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
              color: 'white'
            }}
          >
            <FaLock className="me-1" />
            Private
          </Badge>
        )
      case "OFFICIAL":
        return (
          <Badge 
            bg="" 
            className="py-1 px-2 rounded-pill border-0"
            style={{ 
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              color: 'white'
            }}
          >
            <FaBuilding className="me-1" />
            Official
          </Badge>
        )
      default:
        return null
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

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <Spinner animation="border" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                <p className="mt-4 text-muted fs-5">Loading group settings...</p>
              </div>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    )
  }

  // FIXED: Check userRole after loading is complete
  if (!loading && userRole !== "ADMIN") {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <FaExclamationTriangle className="text-danger mb-3" style={{ fontSize: "4rem", opacity: 0.8 }} />
                <h3 className="fw-bold mb-3">Access Denied</h3>
                <p className="text-muted mb-4">
                  You don't have permission to access group settings. Only group administrators can manage settings.
                </p>
                <Button
                  variant="primary"
                  onClick={() => router.push(`/dashboard/groups/${params.groupId}`)}
                  className="px-4 py-3 rounded-pill"
                >
                  Back to Group
                </Button>
              </div>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <Container fluid className="py-4">
        <Row className="justify-content-center">
          <Col xl={10}>
            {/* Header */}
            <div className="mb-4">
              <Button
                variant="outline-primary"
                onClick={() => router.push(`/dashboard/groups/${params.groupId}`)}
                className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill border-0 shadow-sm mb-4"
                style={{ 
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  border: '1px solid #e9ecef',
                  color: '#667eea'
                }}
              >
                <FaArrowLeft />
                <span>Back to Group</span>
              </Button>

              <div className="text-center mb-5">
                <h1 className="fw-bold mb-2 display-5" style={{ color: "#2d3748" }}>
                  Group Settings
                </h1>
                <p className="text-muted mb-0 fs-6">
                  Manage your group's configuration and preferences
                </p>
              </div>
            </div>

            {errors.submit && (
              <Alert 
                variant="danger" 
                dismissible 
                onClose={() => setErrors({})}
                className="rounded-4 border-0 mb-4"
              >
                <FaExclamationTriangle className="me-2" />
                {errors.submit}
              </Alert>
            )}

            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-4"
              fill
            >
              <Tab 
                eventKey="general" 
                title={
                  <div className="d-flex align-items-center gap-2">
                    <FaCog />
                    <span>General</span>
                  </div>
                }
              >
                {/* ... Keep the entire General tab content exactly as before ... */}
                <Card className="border-0 shadow-sm mt-4 rounded-4">
                  <Card.Body className="p-4 p-md-5">
                    <h5 className="fw-semibold mb-4" style={{ color: "#2d3748" }}>
                      General Settings
                    </h5>

                    {/* Group Name */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold mb-2" style={{ color: "#4a5568" }}>
                        Group Name
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="name"
                        value={formData.name || ""}
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
                    </Form.Group>

                    {/* Description */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold mb-2" style={{ color: "#4a5568" }}>
                        Description
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        name="description"
                        value={formData.description || ""}
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
                          Describe your group's purpose and focus
                        </Form.Text>
                        <Form.Text className={`small ${(formData.description?.length || 0) > 700 ? 'text-danger' : 'text-muted'}`}>
                          {(formData.description?.length || 0)}/700
                        </Form.Text>
                      </div>
                      {errors.description && (
                        <Form.Text className="text-danger small fw-medium mt-2 d-block">
                          {errors.description}
                        </Form.Text>
                      )}
                    </Form.Group>

                    {/* Group Visibility */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold mb-2" style={{ color: "#4a5568" }}>
                        Group Visibility
                      </Form.Label>
                      <div className="row g-3">
                        {[
                          { value: "PUBLIC", label: "Public", icon: FaGlobe, description: "Anyone can join and view content" },
                          { value: "PRIVATE", label: "Private", icon: FaLock, description: "Requires approval to join" },
                          // { value: "OFFICIAL", label: "Official", icon: FaBuilding, description: "Company-managed group" }
                        ].map((type) => (
                          <Col key={type.value} md={4}>
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
                    </Form.Group>

                    {/* Company Selection (only for Official groups) */}
                    {formData.visibility === "OFFICIAL" && (
                      <Form.Group className="mb-4">
                        <div className="d-flex align-items-center mb-2">
                          <Form.Label className="fw-semibold mb-0" style={{ color: "#4a5568" }}>
                            Company
                          </Form.Label>
                          <Badge bg="warning" text="dark" className="ms-2 py-1 px-2">Admin only</Badge>
                        </div>
                        <Form.Select
                          name="companyId"
                          value={formData.companyId || ""}
                          onChange={handleChange}
                          isInvalid={!!errors.companyId}
                          className="py-3 border-0 rounded-3"
                          style={{ 
                            background: '#f8f9fa',
                            fontSize: '1rem'
                          }}
                        >
                          <option value="">Select a company</option>
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
                      </Form.Group>
                    )}

                    {/* Group Topic */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold mb-2" style={{ color: "#4a5568" }}>
                        Group Topic
                      </Form.Label>
                      <Form.Select
                        name="topic"
                        value={formData.topic || ""}
                        onChange={handleChange}
                        className="py-3 border-0 rounded-3"
                        style={{ 
                          background: '#f8f9fa',
                          fontSize: '1rem'
                        }}
                      >
                        {groupTopics.map(topic => (
                          <option key={topic.value} value={topic.value}>
                            {topic.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

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
                          value={selectedCountry}
                          onChange={handleCountryChange}
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
                          value={selectedRegion}
                          onChange={handleRegionChange}
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
                          value={selectedCity}
                          onChange={handleCityChange}
                          placeholder={formData.region ? "Select city..." : "Select region first"}
                          styles={customSelectStyles}
                          isSearchable
                          isDisabled={!formData.region}
                          noOptionsMessage={() => formData.region ? "Type to search cities..." : "Select region first"}
                        />
                      </div>
                      
                      {/* Display current location if exists */}
                      {(group?.countryName || group?.regionName || group?.city) && (
                        <Alert variant="info" className="border-0 rounded-3 mt-3" 
                             style={{ 
                               background: 'rgba(102, 126, 234, 0.1)',
                               border: '1px solid rgba(102, 126, 234, 0.2)'
                             }}
                        >
                          <FaInfoCircle className="me-2" />
                          <small>
                            Current location: {[group?.countryName, group?.regionName, group?.city]
                              .filter(Boolean)
                              .join(", ")}
                          </small>
                        </Alert>
                      )}
                    </Form.Group>
                  </Card.Body>
                </Card>
              </Tab>

              <Tab 
                eventKey="rules" 
                title={
                  <div className="d-flex align-items-center gap-2">
                    <FaShieldAlt />
                    <span>Rules & Moderation</span>
                  </div>
                }
              >
                <Card className="border-0 shadow-sm mt-4 rounded-4">
                  <Card.Body className="p-4 p-md-5">
                    <h5 className="fw-semibold mb-4" style={{ color: "#2d3748" }}>
                      Group Rules & Moderation
                    </h5>
                    
                    <Alert variant="info" className="border-0 mb-4" style={{ background: 'rgba(102, 126, 234, 0.1)' }}>
                      <FaInfoCircle className="me-2" />
                      <span className="fw-medium">Set clear rules to maintain a positive community environment</span>
                    </Alert>

                    {/* Post Approval */}
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

                    {/* Group Rules */}
                    <Form.Group className="mb-4">
                      <Form.Label className="fw-semibold mb-2" style={{ color: "#4a5568" }}>
                        Group Rules
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        name="rules"
                        value={formData.rules || ""}
                        onChange={handleChange}
                        isInvalid={!!errors.rules}
                        rows={8}
                        className="py-3 border-0 rounded-3"
                        style={{ 
                          background: '#f8f9fa',
                          fontSize: '1rem',
                          resize: 'none'
                        }}
                        placeholder="Enter your group rules, one per line..."
                      />
                      <div className="d-flex justify-content-between mt-2">
                        <Form.Text className="text-muted small">
                          Define community guidelines and rules for members
                        </Form.Text>
                        <Form.Text className={`small ${(formData.rules?.length || 0) > 1000 ? 'text-danger' : 'text-muted'}`}>
                          {(formData.rules?.length || 0)}/1000
                        </Form.Text>
                      </div>
                      {errors.rules && (
                        <Form.Text className="text-danger small fw-medium mt-2 d-block">
                          {errors.rules}
                        </Form.Text>
                      )}
                    </Form.Group>

                    {/* MODERATION SECTION - ADDED HERE */}
                    <div className="mt-5 pt-4 border-top">
                      <h5 className="fw-semibold mb-4" style={{ color: "#2d3748" }}>
                        <FaUserCog className="me-2 text-warning" />
                        Moderation Tools
                      </h5>
                      
                      <Alert variant="warning" className="border-0 mb-4" style={{ 
                        background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)',
                        border: '1px solid rgba(245, 158, 11, 0.2)'
                      }}>
                        <FaShieldAlt className="me-2" />
                        <span className="fw-medium">Manage group content and members</span>
                      </Alert>

                      <div className="row g-4">
                        {/* Posts Moderation Card */}
                        <Col md={6}>
                          <Card className="border-0 shadow-sm h-100 rounded-4" style={{ 
                            border: '1px solid rgba(245, 158, 11, 0.2)',
                            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.05) 0%, rgba(217, 119, 6, 0.05) 100%)'
                          }}>
                            <Card.Body className="p-4">
                              <div className="d-flex align-items-start mb-3">
                                <div className="p-3 rounded-3 me-3" style={{ 
                                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                                }}>
                                  <FaCheckCircle className="text-white" size={20} />
                                </div>
                                <div>
                                  <h6 className="fw-semibold mb-1">Posts Moderation</h6>
                                  <p className="text-muted small mb-0">Review and manage group posts</p>
                                </div>
                              </div>
                              <Button
                                variant="warning"
                                onClick={handleViewModerationPage}
                                className="w-100 py-2 rounded-pill border-0 mt-2"
                                style={{ 
                                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                  color: 'white'
                                }}
                              >
                                <FaUserCog className="me-2" />
                                Moderate Posts
                              </Button>
                            </Card.Body>
                          </Card>
                        </Col>

                        {/* Members Management Card */}
                        <Col md={6}>
                          <Card className="border-0 shadow-sm h-100 rounded-4" style={{ 
                            border: '1px solid rgba(102, 126, 234, 0.2)',
                            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)'
                          }}>
                            <Card.Body className="p-4">
                              <div className="d-flex align-items-start mb-3">
                                <div className="p-3 rounded-3 me-3" style={{ 
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                }}>
                                  <FaUsers className="text-white" size={20} />
                                </div>
                                <div>
                                  <h6 className="fw-semibold mb-1">Members Management</h6>
                                  <p className="text-muted small mb-0">Manage roles and permissions</p>
                                </div>
                              </div>
                              <Button
                                variant="primary"
                                onClick={handleViewMembersPage}
                                className="w-100 py-2 rounded-pill border-0 mt-2"
                                style={{ 
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                }}
                              >
                                <FaUserTag className="me-2" />
                                Manage Members
                              </Button>
                            </Card.Body>
                          </Card>
                        </Col>
                      </div>

                      {/* Moderation Logs */}
                      <div className="mt-4">
                        <Card className="border-0 shadow-sm rounded-4">
                          <Card.Body className="p-4">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h6 className="fw-semibold mb-0">
                                <FaHistory className="me-2 text-info" />
                                Moderation Logs
                              </h6>
                              <Button
                                variant="outline-info"
                                size="sm"
                                onClick={handleViewModerationLogs}
                                className="rounded-pill border-0"
                                style={{ 
                                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                  border: '1px solid #e9ecef',
                                  color: '#3B82F6'
                                }}
                              >
                                View All Logs
                              </Button>
                            </div>
                            <p className="text-muted small mb-0">
                              View all moderation actions taken in this group
                            </p>
                          </Card.Body>
                        </Card>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Tab>

              <Tab 
                eventKey="danger" 
                title={
                  <div className="d-flex align-items-center gap-2 text-warning">
                    <FaExclamationTriangle />
                    <span>Leave Group</span>
                  </div>
                }
              >
                <Card className="border-0 shadow-sm mt-4 rounded-4 border-warning">
                  <Card.Body className="p-4 p-md-5">
                    <h5 className="fw-semibold mb-4 text-warning">
                      Leave Group
                    </h5>

                    <Alert variant="warning" className="border-0 mb-4">
                      <FaExclamationTriangle className="me-2" />
                      <span className="fw-medium">This action will remove you from the group. Proceed with caution.</span>
                    </Alert>

                    <div className="d-flex flex-column gap-4">
                      {/* Leave Group Card */}
                      <Card className="border-warning">
                        <Card.Body className="p-4">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h6 className="fw-semibold mb-1">Leave Group</h6>
                              <p className="text-muted small mb-0">
                                {userRole === 'ADMIN' 
                                  ? "As an admin, you can leave the group if there are other admins. The group will continue to exist."
                                  : "You will no longer be a member of this group. You can rejoin if the group is public or request to join if it's private."}
                              </p>
                            </div>
                            <Button
                              variant="warning"
                              onClick={() => setShowLeaveModal(true)}
                              className="px-4 py-2 rounded-pill border-0"
                              style={{ 
                                background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                                color: 'white'
                              }}
                            >
                              <FaSignOutAlt className="me-2" />
                              Leave Group
                            </Button>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  </Card.Body>
                </Card>
              </Tab>
            </Tabs>

            {/* Save Button */}
            <div className="d-flex justify-content-end gap-3 mt-4">
              <Button
                variant="light"
                onClick={() => router.push(`/dashboard/groups/${params.groupId}`)}
                className="px-4 py-3 rounded-pill border-0 fw-semibold"
                style={{ 
                  background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                  border: '1px solid #e2e8f0'
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveSettings}
                disabled={saving}
                className="px-4 py-3 rounded-pill border-0 fw-semibold"
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  transition: 'all 0.3s ease'
                }}
              >
                {saving ? (
                  <span className="d-flex align-items-center justify-content-center">
                    <Spinner animation="border" size="sm" className="me-2" />
                    Saving...
                  </span>
                ) : (
                  <span className="d-flex align-items-center justify-content-center">
                    <FaSave className="me-2" />
                    Save Changes
                  </span>
                )}
              </Button>
            </div>
          </Col>
        </Row>
      </Container>

      {/* Moderation Logs Modal */}
      <Modal show={showLogsModal} onHide={() => setShowLogsModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <FaHistory className="me-2 text-info" />
            Moderation Logs
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingLogs ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading logs...</p>
            </div>
          ) : moderationLogs.length === 0 ? (
            <div className="text-center py-4">
              <FaHistory className="text-muted mb-3" style={{ fontSize: "3rem", opacity: 0.2 }} />
              <h5>No moderation logs yet</h5>
              <p className="text-muted">All moderation actions will be logged here.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Target</th>
                    <th>Performed By</th>
                    <th>Date</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {moderationLogs.map((log, index) => (
                    <tr key={index}>
                      <td>
                        <Badge 
                          bg={log.action === 'REMOVE_MEMBER' ? 'danger' : 
                              log.action === 'CHANGE_ROLE' ? 'warning' : 'info'}
                          className="rounded-pill"
                        >
                          {log.action}
                        </Badge>
                      </td>
                      <td>{log.targetUser?.name || 'N/A'}</td>
                      <td>{log.performedBy?.name || 'System'}</td>
                      <td>{formatDate(log.createdAt)}</td>
                      <td>
                        <small className="text-muted">{log.details || 'No details'}</small>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setShowLogsModal(false)} className="px-4 rounded-pill">
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Leave Group Modal */}
      <Modal show={showLeaveModal} onHide={() => setShowLeaveModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold text-warning">Leave Group</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <div className="mb-4">
              <div className="p-3 rounded-circle d-inline-flex" 
                   style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)' }}>
                <FaSignOutAlt className="text-warning" style={{ fontSize: "2.5rem" }} />
              </div>
            </div>
            <h5 className="fw-semibold mb-3">Are you sure you want to leave?</h5>
            <p className="text-muted mb-0">
              {userRole === 'ADMIN' 
                ? `As an admin of "${group?.name}", you will lose all admin privileges. If you are the only admin, you cannot leave the group.`
                : `You will be removed from the "${group?.name}" group.`}
            </p>
            {userRole !== 'ADMIN' && (
              <p className="text-muted small mb-0 mt-2">
                You can rejoin later if the group is public or request to join if it's private.
              </p>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button 
            variant="light" 
            onClick={() => setShowLeaveModal(false)} 
            className="px-4 py-2 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
              border: '1px solid #e2e8f0'
            }}
          >
            Cancel
          </Button>
          <Button
            variant="warning"
            onClick={handleLeaveGroup}
            disabled={leaving}
            className="px-4 py-2 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: 'white'
            }}
          >
            {leaving ? (
              <span className="d-flex align-items-center justify-content-center">
                <Spinner animation="border" size="sm" className="me-2" />
                Leaving...
              </span>
            ) : (
              <span className="d-flex align-items-center justify-content-center">
                <FaSignOutAlt className="me-2" />
                Leave Group
              </span>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  )
}

export default GroupSettingsPage