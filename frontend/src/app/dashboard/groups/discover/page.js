"use client"

import { useState, useEffect } from "react"
import { Container, Row, Col, Card, Button, Badge, Spinner, Form, Pagination, Alert } from "react-bootstrap"
import {
  FaSearch,
  FaFilter,
  FaGlobe,
  FaLock,
  FaBuilding,
  FaUsers,
  FaComments,
  FaCalendarAlt,
  FaArrowRight,
  FaUserPlus,
  FaFire,
  FaStar,
  FaRocket,
  FaImage,
  FaClock,
  FaCheckCircle,
  FaUserFriends,
  FaPlus
} from "react-icons/fa"
import { useRouter } from "next/navigation"
import { useAuth } from "../../../../../lib/contexts/AuthContext"
import { toast } from "react-toastify"
import DashboardLayout from "../../../../../components/layout/DashboardLayout"

const DiscoverGroupsPage = () => {
  const { user, api } = useAuth()
  const router = useRouter()

  const [allGroups, setAllGroups] = useState([])
  const [joinedGroupIds, setJoinedGroupIds] = useState([])
  const [pendingGroupIds, setPendingGroupIds] = useState([]) // Track pending requests
  const [filteredGroups, setFilteredGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [visibilityFilter, setVisibilityFilter] = useState("all")
  const [topicFilter, setTopicFilter] = useState("all")
  const [sortBy, setSortBy] = useState("popular")
  const [currentPage, setCurrentPage] = useState(1)
  const [processingRequest, setProcessingRequest] = useState(null) // Track processing requests
  const groupsPerPage = 12

  // Group topics from schema enum
  const groupTopics = [
    { value: "PHISHING", label: "Phishing" },
    { value: "FAKE_SUPPORT", label: "Fake Support" },
    { value: "IMPERSONATION", label: "Impersonation" },
    { value: "INVESTMENT", label: "Investment" },
    { value: "JOB_SCAM", label: "Job Scam" },
    { value: "ROMANCE", label: "Romance" },
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
    loadData()
  }, [])

  useEffect(() => {
    filterAndSortGroups()
  }, [searchTerm, visibilityFilter, topicFilter, sortBy, allGroups, joinedGroupIds, pendingGroupIds])

  const loadData = async () => {
    try {
      setLoading(true)
      
      console.log("Loading discover data...")
      
      // Load all groups and user's joined groups in parallel
      const [allGroupsResponse, joinedGroupsResponse] = await Promise.all([
        api.groups.searchGroups(),
        loadJoinedGroups()
      ])
      
      console.log("All groups API response:", allGroupsResponse)
      console.log("Joined groups response:", joinedGroupsResponse)
      
      // Parse all groups
      let allGroupsData = []
      
      if (Array.isArray(allGroupsResponse)) {
        allGroupsData = allGroupsResponse
      } else if (allGroupsResponse.groups && Array.isArray(allGroupsResponse.groups)) {
        allGroupsData = allGroupsResponse.groups
      } else if (allGroupsResponse.data && Array.isArray(allGroupsResponse.data)) {
        allGroupsData = allGroupsResponse.data
      }
      
      // Transform API response to match component needs
      const transformedGroups = allGroupsData.map(group => ({
        id: group.id,
        slug: group.slug || group.id,
        name: group.name,
        description: group.description,
        visibility: group.visibility || 'PUBLIC',
        topic: group.topic,
        members_count: group.memberCount || group.members_count || 0,
        posts_count: group.postCount || group.posts_count || 0,
        follower_count: group.followerCount || 0,
        coverImageUrl: group.coverImageUrl || group.banner_url,
        is_member: false, // Will be updated based on joinedGroupIds
        hasPendingRequest: false, // Will be updated based on pendingGroupIds
        is_recommended: group.isRecommended || false,
        trending_score: calculateTrendingScore(group),
        created_at: group.createdAt || group.created_at,
        company: group.company,
        userRole: group.userRole,
        postApproval: group.postApproval,
        rules: group.rules,
        country: group.country,
        region: group.region,
        city: group.city,
        createdBy: group.createdBy
      }))
      
      console.log("Transformed groups:", transformedGroups.length)
      console.log("User has joined group IDs:", joinedGroupIds)
      console.log("User has pending requests:", pendingGroupIds)
      
      setAllGroups(transformedGroups)
      
    } catch (error) {
      console.error("Failed to load groups:", error)
      toast.error(error.message || "Failed to load groups")
      setAllGroups([])
    } finally {
      setLoading(false)
    }
  }

  const loadJoinedGroups = async () => {
    try {
      // Get groups where user is a member (already approved)
      const response = await api.request('/api/v1/groups/joined')
      
      console.log("Joined groups raw response:", response)
      
      let joinedGroups = []
      if (Array.isArray(response)) {
        joinedGroups = response
      } else if (response.groups && Array.isArray(response.groups)) {
        joinedGroups = response.groups
      } else if (response.data && Array.isArray(response.data)) {
        joinedGroups = response.data
      }
      
      // Extract just the IDs of joined groups
      const joinedIds = joinedGroups.map(group => group.id)
      console.log("Extracted joined group IDs:", joinedIds)
      
      setJoinedGroupIds(joinedIds)
      return joinedGroups
    } catch (error) {
      console.warn("Could not load joined groups:", error)
      setJoinedGroupIds([])
      return []
    }
  }

  const calculateTrendingScore = (group) => {
    let score = 0
    score += Math.min(group.memberCount || group.members_count || 0, 500) / 5
    score += Math.min(group.postCount || group.posts_count || 0, 100) / 2
    score += Math.min(group.followerCount || 0, 300) / 3
    
    if (group.createdAt || group.created_at) {
      const createdDate = new Date(group.createdAt || group.created_at)
      const daysSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
      if (daysSinceCreation < 30) {
        score += (30 - daysSinceCreation) * 2
      }
    }
    
    return Math.min(Math.round(score), 100)
  }

  const filterAndSortGroups = () => {
    let result = [...allGroups]

    // IMPORTANT: Filter out ONLY groups that user has already joined
    // Private groups with pending requests STAY in the discover page
    result = result.filter(group => !joinedGroupIds.includes(group.id))
    
    console.log(`Filtered groups: ${allGroups.length} total, ${result.length} after removing joined groups`)
    console.log(`Private groups with pending requests: ${result.filter(g => pendingGroupIds.includes(g.id) && g.visibility === 'PRIVATE').length}`)

    // Apply search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (group) => 
          group.name.toLowerCase().includes(term) || 
          (group.description && group.description.toLowerCase().includes(term))
      )
    }

    // Apply visibility filter
    if (visibilityFilter !== "all") {
      result = result.filter((group) => group.visibility === visibilityFilter)
    }

    // Apply topic filter
    if (topicFilter !== "all") {
      result = result.filter((group) => group.topic === topicFilter)
    }

    // Apply sorting
    result = sortGroups(result, sortBy)

    setFilteredGroups(result)
    setCurrentPage(1) // Reset to first page when filters change
  }

  const sortGroups = (groupsList, sortOption) => {
    const sorted = [...groupsList]
    
    switch (sortOption) {
      case "popular":
        return sorted.sort((a, b) => b.members_count - a.members_count)
      case "trending":
        return sorted.sort((a, b) => b.trending_score - a.trending_score)
      case "recent":
        return sorted.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      case "recommended":
        return sorted.sort((a, b) => {
          if (a.is_recommended && !b.is_recommended) return -1
          if (!a.is_recommended && b.is_recommended) return 1
          return b.members_count - a.members_count
        })
      default:
        return sorted
    }
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
              color: 'white',
              fontSize: '0.75rem'
            }}
          >
            <FaGlobe className="me-1" size={10} />
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
              color: 'white',
              fontSize: '0.75rem'
            }}
          >
            <FaLock className="me-1" size={10} />
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
              color: 'white',
              fontSize: '0.75rem'
            }}
          >
            <FaBuilding className="me-1" size={10} />
            Official
          </Badge>
        )
      default:
        return null
    }
  }

  const getTopicBadge = (topic) => {
    if (!topic) return null
    
    const topicColors = {
      PHISHING: "#DC2626",
      FAKE_SUPPORT: "#F59E0B",
      IMPERSONATION: "#8B5CF6",
      INVESTMENT: "#10B981",
      JOB_SCAM: "#3B82F6",
      ROMANCE: "#EC4899",
      PAYMENT_REQUEST: "#F97316",
      FAKE_WEBSITE: "#06B6D4",
      SOCIAL_MEDIA: "#6366F1",
      MARKETPLACE: "#84CC16",
      SUBSCRIPTION: "#14B8A6",
      PHONE_CALL: "#0EA5E9",
      SMS: "#8B5CF6",
      WHATSAPP: "#10B981",
      CRYPTO: "#F59E0B",
      LOAN: "#DC2626",
      CHARITY: "#3B82F6",
      INVOICE: "#8B5CF6",
      IDENTITY_THEFT: "#EC4899",
      ACCOUNT_TAKEOVER: "#DC2626",
      GIVEAWAY: "#F59E0B",
      OTHER: "#6B7280"
    }
    
    const color = topicColors[topic] || "#6B7280"
    const label = formatTopicLabel(topic)
    
    return (
      <Badge 
        bg="" 
        className="py-1 px-2 rounded-pill border-0"
        style={{ 
          backgroundColor: color,
          color: 'white',
          fontSize: '0.75rem'
        }}
      >
        {label}
      </Badge>
    )
  }

  const formatTopicLabel = (topic) => {
    if (!topic) return "Other"
    return topic
      .toLowerCase()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, char => char.toUpperCase())
  }

  const getTrendingBadge = (score) => {
    if (score >= 90) {
      return (
        <Badge 
          bg="" 
          className="py-1 px-2 rounded-pill border-0"
          style={{ 
            background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
            color: 'white',
            fontSize: '0.75rem'
          }}
        >
          <FaFire className="me-1" size={10} />
          Hot
        </Badge>
      )
    } else if (score >= 80) {
      return (
        <Badge 
          bg="" 
          className="py-1 px-2 rounded-pill border-0"
          style={{ 
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            color: 'white',
            fontSize: '0.75rem'
          }}
        >
          <FaRocket className="me-1" size={10} />
          Trending
        </Badge>
      )
    }
    return null
  }

  const formatDate = (dateString) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
      
      if (diffDays === 0) return "Today"
      if (diffDays === 1) return "Yesterday"
      if (diffDays < 7) return `${diffDays} days ago`
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
      
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric"
      })
    } catch (error) {
      return ""
    }
  }

  const handleJoinGroup = async (group) => {
    const groupId = group.id
    const isPrivate = group.visibility === "PRIVATE"
    
    try {
      setProcessingRequest(groupId)
      
      console.log(` Attempting to ${isPrivate ? 'request to join' : 'join'} group: "${group.name}"`)
      
      // Make API call to join/request to join group
      const response = await api.groups.joinGroup(groupId)
      
      console.log(" Join/Request API response:", response)
      
      // Parse response to determine actual status
      let successMessage = ""
      let toastType = "success"
      let isPending = false
      
      // Check response for status indicators
      const responseMessage = response.message?.toLowerCase() || ""
      const responseStatus = response.status?.toLowerCase() || ""
      const responseData = response.data || response
      
      // Determine if it's pending based on multiple indicators
      isPending = 
        responseStatus === 'pending' ||
        responseData.status === 'PENDING' ||
        responseData.membershipStatus === 'PENDING' ||
        responseMessage.includes('pending') ||
        responseMessage.includes('request') ||
        responseMessage.includes('approval') ||
        responseMessage.includes('waiting') ||
        (isPrivate && !responseMessage.includes('joined') && !responseMessage.includes('member'))
      
      if (isPending) {
        // Request is pending approval (always for private groups, sometimes for public if they require approval)
        successMessage = " Join request sent! The group admin will review your request."
        toastType = "info"
        
        // Add to pendingGroupIds
        setPendingGroupIds(prev => [...prev, groupId])
        
        // Update group to show pending status (but keep it in the list)
        setAllGroups(prev => prev.map(g => 
          g.id === groupId 
            ? { ...g, hasPendingRequest: true }
            : g
        ))
        
      } else {
        // Successfully joined (public group or auto-approved private group)
        successMessage = " Successfully joined the group!"
        toastType = "success"
        
        // Add to joinedGroupIds (so it disappears from discover page)
        setJoinedGroupIds(prev => [...prev, groupId])
        
        // Update group to show member status
        setAllGroups(prev => prev.map(g => 
          g.id === groupId 
            ? { ...g, is_member: true }
            : g
        ))
      }
      
      // Show appropriate toast
      if (toastType === "info") {
        toast.info(successMessage, {
          autoClose: 5000,
          position: "top-right"
        })
      } else {
        toast.success(successMessage, {
          autoClose: 4000,
          position: "top-right"
        })
      }
      
    } catch (error) {
      console.error(" Join/Request error:", error)
      
      // Handle specific error cases with appropriate UI updates
      const errorMessage = error.message?.toLowerCase() || ""
      
      if (errorMessage.includes('already requested') || 
          errorMessage.includes('pending request') ||
          errorMessage.includes('request already exists')) {
        
        // Already has pending request
        toast.info(" You've already sent a request. Waiting for admin approval.", {
          autoClose: 4000
        })
        
        // Add to pendingGroupIds if not already
        setPendingGroupIds(prev => {
          if (!prev.includes(groupId)) {
            return [...prev, groupId]
          }
          return prev
        })
        
      } else if (errorMessage.includes('already a member') || 
                 errorMessage.includes('already joined') ||
                 errorMessage.includes('already in group')) {
        
        // Already a member
        toast.info("You are already a member of this group!", {
          autoClose: 3000
        })
        
        // Add to joinedGroupIds if not already
        setJoinedGroupIds(prev => {
          if (!prev.includes(groupId)) {
            return [...prev, groupId]
          }
          return prev
        })
        
      } else if (errorMessage.includes('private') && 
                 errorMessage.includes('cannot join')) {
        
        toast.info(" This is a private group. Please request to join.", {
          autoClose: 4000
        })
        
      } else {
        toast.error(` ${error.message || "Failed to process request"}`, {
          autoClose: 4000
        })
      }
    } finally {
      setProcessingRequest(null)
    }
  }

  const handleViewGroup = (groupSlug) => {
    if (groupSlug) {
      router.push(`/dashboard/groups/${groupSlug}`)
    }
  }

  const handleCreateGroup = () => {
    router.push("/dashboard/groups/create")
  }

  const handleYourGroups = () => {
    router.push("/dashboard/groups")
  }

  // Get button configuration based on group status
  const getButtonConfig = (group) => {
    const groupId = group.id
    const isPrivate = group.visibility === "PRIVATE"
    const isPending = pendingGroupIds.includes(groupId)
    const isMember = joinedGroupIds.includes(groupId)
    
    if (processingRequest === groupId) {
      return {
        text: "Processing...",
        icon: <Spinner animation="border" size="sm" className="me-2" />,
        onClick: () => {},
        variant: "outline-secondary",
        disabled: true
      }
    }
    
    if (isMember) {
      return {
        text: "Enter Group",
        icon: <FaArrowRight className="me-2" />,
        onClick: () => handleViewGroup(group.slug),
        variant: "primary",
        disabled: false
      }
    }
    
    if (isPending) {
      return {
        text: "Request Pending",
        icon: <FaClock className="me-2" />,
        onClick: () => {},
        variant: "outline-secondary",
        disabled: true
      }
    }
    
    if (isPrivate) {
      return {
        text: "Request to Join",
        icon: <FaLock className="me-2" />,
        onClick: () => handleJoinGroup(group),
        variant: "outline-primary",
        disabled: false
      }
    }
    
    return {
      text: "Join Group",
      icon: <FaUserPlus className="me-2" />,
      onClick: () => handleJoinGroup(group),
      variant: "primary",
      disabled: false
    }
  }

  // Pagination
  const indexOfLastGroup = currentPage * groupsPerPage
  const indexOfFirstGroup = indexOfLastGroup - groupsPerPage
  const currentGroups = filteredGroups.slice(indexOfFirstGroup, indexOfLastGroup)
  const totalPages = Math.ceil(filteredGroups.length / groupsPerPage)

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <Spinner animation="border" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                <p className="mt-4 text-muted fs-5">Discovering groups...</p>
              </div>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    )
  }

  // Calculate stats excluding only joined groups (pending groups still count as discoverable)
  const discoverGroupsCount = allGroups.filter(group => !joinedGroupIds.includes(group.id)).length
  
  const totalMembersCount = allGroups
    .filter(group => !joinedGroupIds.includes(group.id))
    .reduce((sum, group) => sum + group.members_count, 0)
    
  const totalPostsCount = allGroups
    .filter(group => !joinedGroupIds.includes(group.id))
    .reduce((sum, group) => sum + group.posts_count, 0)
    
  const recommendedCount = allGroups
    .filter(group => !joinedGroupIds.includes(group.id) && group.is_recommended)
    .length

  return (
    <DashboardLayout>
      <Container fluid className="py-4">
        <Row className="justify-content-center">
          <Col xl={12}>
            {/* Header */}
            <div className="text-center mb-5">
              <div className="position-relative">
                <div
                  className="position-absolute top-0 start-50 translate-middle-x w-100 h-100 rounded-4"
                  style={{
                    background: "linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)",
                    zIndex: 0,
                    maxWidth: '800px'
                  }}
                />
                <div className="position-relative p-4 rounded-4">
                  <h1 className="fw-bold mb-2 display-5" style={{ color: "#2d3748" }}>
                    Discover Groups
                  </h1>
                  <p className="text-muted mb-0 fs-6">
                    Explore new communities focused on scam prevention and awareness
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons - ADDED THIS SECTION */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex gap-3">
                {/* <Button
                  variant="primary"
                  onClick={handleCreateGroup}
                  className="d-flex align-items-center gap-2 px-4 py-3 rounded-pill shadow-sm border-0 fw-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    transition: 'all 0.3s ease'
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
                  <FaPlus />
                  <span>Create Group</span>
                </Button> */}

                <Button
                  variant="outline-primary"
                  onClick={handleYourGroups}
                  className="d-flex align-items-center gap-2 px-4 py-3 rounded-pill border-0 shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                    border: '1px solid #e9ecef',
                    color: '#667eea'
                  }}
                >
                  <FaUserFriends />
                  <span>Your Groups</span>
                </Button>
              </div>

              <div className="d-flex align-items-center gap-3">
                <p className="text-muted mb-0 small">
                  Showing {discoverGroupsCount} groups to discover
                  {joinedGroupIds.length > 0 && ` (${joinedGroupIds.length} already joined)`}
                </p>
              </div>
            </div>

            {/* Stats Banner */}
            <Card className="border-0 shadow-sm mb-4 rounded-4" style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white'
            }}>
              <Card.Body className="p-4">
                <Row className="g-4">
                  <Col md={3} className="text-center">
                    <div className="p-3">
                      <FaUsers className="mb-2" style={{ fontSize: '2rem' }} />
                      <h3 className="fw-bold mb-1">{discoverGroupsCount}+</h3>
                      <p className="mb-0 opacity-75">Groups to Discover</p>
                    </div>
                  </Col>
                  <Col md={3} className="text-center">
                    <div className="p-3">
                      <FaUsers className="mb-2" style={{ fontSize: '2rem' }} />
                      <h3 className="fw-bold mb-1">
                        {totalMembersCount}+
                      </h3>
                      <p className="mb-0 opacity-75">Total Members</p>
                    </div>
                  </Col>
                  <Col md={3} className="text-center">
                    <div className="p-3">
                      <FaComments className="mb-2" style={{ fontSize: '2rem' }} />
                      <h3 className="fw-bold mb-1">
                        {totalPostsCount}+
                      </h3>
                      <p className="mb-0 opacity-75">Total Posts</p>
                    </div>
                  </Col>
                  <Col md={3} className="text-center">
                    <div className="p-3">
                      <FaStar className="mb-2" style={{ fontSize: '2rem' }} />
                      <h3 className="fw-bold mb-1">
                        {recommendedCount}
                      </h3>
                      <p className="mb-0 opacity-75">Recommended</p>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Info Alert about joined groups */}
            {(joinedGroupIds.length > 0 || pendingGroupIds.length > 0) && (
              <Alert variant="info" className="border-0 shadow-sm mb-4 rounded-4" style={{ 
                background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                border: '1px solid rgba(102, 126, 234, 0.2)',
                color: '#4a5568'
              }}>
                <div className="d-flex align-items-center">
                  <FaGlobe className="me-3" style={{ color: '#667eea' }} />
                  <div>
                    <strong>Note:</strong> 
                    {joinedGroupIds.length > 0 && ` You're already a member of ${joinedGroupIds.length} group(s).`}
                    {pendingGroupIds.length > 0 && ` You have ${pendingGroupIds.length} pending join request(s).`}
                    {" Joined groups are shown in "}
                    <Button 
                      variant="link" 
                      className="p-0 fw-bold"
                      onClick={handleYourGroups}
                      style={{ color: '#667eea' }}
                    >
                      Your Groups
                    </Button>
                    {" page. Private groups with pending requests remain in this list."}
                  </div>
                </div>
              </Alert>
            )}

            {/* Filters */}
            <Card className="border-0 shadow-sm mb-4 rounded-4">
              <Card.Body className="p-4">
                <Row className="g-3 align-items-center">
                  <Col md={4}>
                    <div className="position-relative">
                      <FaSearch
                        className="position-absolute text-muted"
                        style={{ left: "20px", top: "50%", transform: "translateY(-50%)", zIndex: 10 }}
                      />
                      <Form.Control
                        type="text"
                        placeholder="Search groups by name or description..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="ps-5 py-3 border-0 bg-light rounded-pill"
                        style={{ 
                          paddingLeft: "50px",
                          fontSize: '0.95rem'
                        }}
                      />
                    </div>
                  </Col>

                  <Col md={2}>
                    <Form.Select
                      value={visibilityFilter}
                      onChange={(e) => setVisibilityFilter(e.target.value)}
                      className="py-3 border-0 bg-light rounded-pill"
                      style={{ fontSize: '0.95rem' }}
                    >
                      <option value="all">All Types</option>
                      <option value="PUBLIC">Public</option>
                      <option value="PRIVATE">Private</option>
                      <option value="OFFICIAL">Official</option>
                    </Form.Select>
                  </Col>

                  <Col md={2}>
                    <Form.Select
                      value={topicFilter}
                      onChange={(e) => setTopicFilter(e.target.value)}
                      className="py-3 border-0 bg-light rounded-pill"
                      style={{ fontSize: '0.95rem' }}
                    >
                      <option value="all">All Topics</option>
                      {groupTopics.map(topic => (
                        <option key={topic.value} value={topic.value}>
                          {topic.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Col>

                  <Col md={2}>
                    <Form.Select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="py-3 border-0 bg-light rounded-pill"
                      style={{ fontSize: '0.95rem' }}
                    >
                      <option value="popular">Most Popular</option>
                      <option value="trending">Trending</option>
                      <option value="recent">Recently Added</option>
                      <option value="recommended">Recommended</option>
                    </Form.Select>
                  </Col>

                  <Col md={2}>
                    <Button
                      variant="light"
                      className="w-100 rounded-pill shadow-sm border-0 py-3"
                      onClick={() => {
                        setSearchTerm("")
                        setVisibilityFilter("all")
                        setTopicFilter("all")
                        setSortBy("popular")
                      }}
                      style={{ 
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
                      }}
                    >
                      <FaFilter />
                    </Button>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Recommended Groups Section */}
            {filteredGroups.filter(g => g.is_recommended).length > 0 && (
              <div className="mb-4">
                <h4 className="fw-bold mb-3" style={{ color: "#2d3748" }}>
                  <FaStar className="me-2 text-warning" />
                  Recommended For You
                </h4>
                <Row className="g-4">
                  {currentGroups
                    .filter(group => group.is_recommended)
                    .map((group) => {
                      const buttonConfig = getButtonConfig(group)
                      const isPending = pendingGroupIds.includes(group.id)
                      const isMember = joinedGroupIds.includes(group.id)
                      
                      return (
                        <Col key={group.id} xl={3} lg={4} md={6}>
                          <GroupCard 
                            group={group}
                            buttonConfig={buttonConfig}
                            onView={handleViewGroup}
                            getVisibilityBadge={getVisibilityBadge}
                            getTopicBadge={getTopicBadge}
                            getTrendingBadge={getTrendingBadge}
                            formatDate={formatDate}
                            isRecommended={true}
                            isPending={isPending}
                            isMember={isMember}
                          />
                        </Col>
                      )
                    })
                  }
                </Row>
              </div>
            )}

            {/* All Groups */}
            <div>
              <h4 className="fw-bold mb-3" style={{ color: "#2d3748" }}>
                {sortBy === "popular" && "Most Popular Groups"}
                {sortBy === "trending" && "Trending Groups"}
                {sortBy === "recent" && "Recently Added Groups"}
                {sortBy === "recommended" && "All Groups"}
              </h4>
              
              {currentGroups.length === 0 ? (
                <Card className="border-0 shadow-sm rounded-4 text-center py-5">
                  <Card.Body>
                    <FaSearch className="text-muted mb-3" style={{ fontSize: "4rem", opacity: 0.2 }} />
                    <h5 className="fw-semibold mb-3" style={{ color: "#4a5568" }}>
                      {searchTerm || visibilityFilter !== "all" || topicFilter !== "all"
                        ? "No groups match your filters"
                        : allGroups.length > 0 && joinedGroupIds.length === allGroups.length
                        ? "You've joined all available groups!"
                        : "No groups available to discover"}
                    </h5>
                    <p className="text-muted mb-4">
                      {allGroups.length > 0 && joinedGroupIds.length === allGroups.length
                        ? "You're already a member of all groups. Check out 'Your Groups' to manage them."
                        : searchTerm || visibilityFilter !== "all" || topicFilter !== "all"
                        ? "Try changing your filters"
                        : "No groups available at the moment"}
                    </p>
                    {allGroups.length > 0 && joinedGroupIds.length === allGroups.length ? (
                      <Button
                        variant="primary"
                        onClick={handleYourGroups}
                        className="px-4 py-3 rounded-pill shadow-sm border-0 fw-semibold"
                        style={{ 
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        }}
                      >
                        View Your Groups
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        onClick={handleCreateGroup}
                        className="px-4 py-3 rounded-pill shadow-sm border-0 fw-semibold"
                        style={{ 
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                        }}
                      >
                        Create Your Own Group
                      </Button>
                    )}
                  </Card.Body>
                </Card>
              ) : (
                <>
                  <Row className="g-4">
                    {currentGroups
                      .filter(group => !group.is_recommended)
                      .map((group) => {
                        const buttonConfig = getButtonConfig(group)
                        const isPending = pendingGroupIds.includes(group.id)
                        const isMember = joinedGroupIds.includes(group.id)
                        
                        return (
                          <Col key={group.id} xl={3} lg={4} md={6}>
                            <GroupCard 
                              group={group}
                              buttonConfig={buttonConfig}
                              onView={handleViewGroup}
                              getVisibilityBadge={getVisibilityBadge}
                              getTopicBadge={getTopicBadge}
                              getTrendingBadge={getTrendingBadge}
                              formatDate={formatDate}
                              isRecommended={false}
                              isPending={isPending}
                              isMember={isMember}
                            />
                          </Col>
                        )
                      })
                    }
                  </Row>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-4">
                      <Card className="border-0 shadow-sm rounded-4">
                        <Card.Body className="p-4">
                          <div className="d-flex justify-content-between align-items-center">
                            <p className="text-muted mb-0 small">
                              Showing {indexOfFirstGroup + 1} to {Math.min(indexOfLastGroup, filteredGroups.length)} of{" "}
                              {filteredGroups.length} discoverable groups
                              {pendingGroupIds.length > 0 && ` (${pendingGroupIds.length} with pending requests)`}
                            </p>
                            <Pagination className="mb-0">
                              <Pagination.Prev
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="rounded-pill me-2 border-0"
                                style={{ 
                                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                  border: '1px solid #e9ecef'
                                }}
                              />
                              {[...Array(totalPages)].map((_, index) => (
                                <Pagination.Item
                                  key={index + 1}
                                  active={currentPage === index + 1}
                                  onClick={() => setCurrentPage(index + 1)}
                                  className="rounded-pill mx-1 border-0"
                                  style={{ 
                                    background: currentPage === index + 1 
                                      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                      : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                    border: '1px solid #e9ecef',
                                    color: currentPage === index + 1 ? 'white' : '#6b7280'
                                  }}
                                >
                                  {index + 1}
                                </Pagination.Item>
                              ))}
                              <Pagination.Next
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="rounded-pill ms-2 border-0"
                                style={{ 
                                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                  border: '1px solid #e9ecef'
                                }}
                              />
                            </Pagination>
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  )}
                </>
              )}
            </div>
          </Col>
        </Row>
      </Container>
    </DashboardLayout>
  )
}

// Group Card Component (Updated)
const GroupCard = ({ 
  group, 
  buttonConfig, 
  onView, 
  getVisibilityBadge, 
  getTopicBadge, 
  getTrendingBadge, 
  formatDate, 
  isRecommended = false,
  isPending = false,
  isMember = false
}) => (
  <Card 
    className="border-0 shadow-sm h-100 rounded-4 overflow-hidden"
    style={{ 
      transition: 'all 0.3s ease',
      cursor: isMember ? 'pointer' : 'default',
      border: isRecommended ? '2px solid #F59E0B' : 'none',
      background: isRecommended ? 'linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%)' : 'white'
    }}
    onClick={() => isMember && onView(group.slug)}
    onMouseEnter={(e) => {
      if (isMember) {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.12)';
      }
    }}
    onMouseLeave={(e) => {
      if (isMember) {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
      }
    }}
  >
    {/* Banner Image Section */}
    <div 
      className="position-relative"
      style={{ 
        height: '120px',
        background: group.coverImageUrl 
          ? `url(${group.coverImageUrl})`
          : isRecommended
          ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {!group.coverImageUrl && (
        <div className="w-100 h-100 d-flex align-items-center justify-content-center">
          <FaImage className="text-white" style={{ fontSize: '2rem', opacity: 0.5 }} />
        </div>
      )}
      
      {/* Badges overlay */}
      <div className="position-absolute top-0 start-0 p-3">
        <div className="d-flex flex-column gap-2">
          {getVisibilityBadge(group.visibility)}
          {getTopicBadge(group.topic)}
        </div>
      </div>
      
      {/* Recommended badge in top-right */}
      {isRecommended && (
        <div className="position-absolute top-0 end-0 p-3">
          <Badge 
            bg="" 
            className="py-1 px-2 rounded-pill border-0 shadow-sm"
            style={{ 
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: 'white',
              fontSize: '0.75rem'
            }}
          >
            <FaStar className="me-1" size={10} />
            Recommended
          </Badge>
        </div>
      )}
      
      {/* Trending badge in top-right (if not recommended) */}
      {!isRecommended && (
        <div className="position-absolute top-0 end-0 p-3">
          {getTrendingBadge(group.trending_score)}
        </div>
      )}
    </div>

    <Card.Body className="p-4">
      {!isRecommended && (
        <div className="d-flex justify-content-between align-items-start mb-3">
          <div className="d-flex align-items-center gap-2">
            {getTrendingBadge(group.trending_score)}
          </div>
        </div>
      )}

      <h5 className="fw-bold mb-2" style={{ color: "#2d3748" }}>
        {group.name}
      </h5>
      
      <p className="text-muted small mb-4" style={{ 
        minHeight: '48px',
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden'
      }}>
        {group.description || "No description provided"}
      </p>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-1 text-muted small">
            <FaUsers size={14} />
            <span>{group.members_count} {isRecommended ? 'members' : ''}</span>
          </div>
          <div className="d-flex align-items-center gap-1 text-muted small">
            <FaComments size={14} />
            <span>{group.posts_count} {isRecommended ? 'posts' : ''}</span>
          </div>
        </div>
        
        <div className="text-muted small">
          <FaCalendarAlt className="me-1" size={12} />
          {formatDate(group.created_at)}
        </div>
      </div>

      <div className="d-grid">
        <Button
          variant={buttonConfig.variant}
          className="py-2 rounded-pill border-0 fw-semibold"
          onClick={(e) => {
            e.stopPropagation()
            buttonConfig.onClick()
          }}
          disabled={buttonConfig.disabled}
          style={{ 
            background: buttonConfig.variant === 'primary' 
              ? isRecommended
                ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
              : buttonConfig.variant === 'outline-primary'
              ? 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
              : buttonConfig.variant === 'outline-secondary'
              ? 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)'
              : buttonConfig.variant === 'outline-warning'
              ? 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
              : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: buttonConfig.variant === 'outline-primary' 
              ? '1px solid #667eea'
              : buttonConfig.variant === 'outline-warning'
              ? '1px solid #F59E0B'
              : buttonConfig.variant === 'outline-secondary'
              ? '1px solid #e9ecef'
              : 'none',
            color: buttonConfig.variant === 'primary' 
              ? 'white' 
              : buttonConfig.variant === 'outline-primary'
              ? '#667eea'
              : buttonConfig.variant === 'outline-warning'
              ? '#D97706'
              : '#9ca3af',
            cursor: buttonConfig.disabled ? 'not-allowed' : 'pointer'
          }}
        >
          {buttonConfig.icon}
          {buttonConfig.text}
        </Button>
      </div>
      
      {/* Status badges */}
      {isMember && (
        <div className="mt-3">
          <Badge 
            bg="" 
            className="py-1 px-2 rounded-pill border-0 w-100 text-center"
            style={{ 
              background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
              color: '#667eea',
              fontSize: '0.75rem'
            }}
          >
            <FaCheckCircle className="me-1" size={10} />
            You are a member
          </Badge>
        </div>
      )}
      
      {isPending && (
        <div className="mt-3">
          <Badge 
            bg="" 
            className="py-1 px-2 rounded-pill border-0 w-100 text-center"
            style={{ 
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(217, 119, 6, 0.1) 100%)',
              color: '#d97706',
              fontSize: '0.75rem'
            }}
          >
            <FaClock className="me-1" size={10} />
            Request pending admin approval
          </Badge>
        </div>
      )}
    </Card.Body>
  </Card>
)

export default DiscoverGroupsPage