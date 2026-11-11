"use client"

import { useState, useEffect, useCallback } from "react"
import { Container, Row, Col, Card, Button, Badge, Spinner, Form, Pagination, Alert } from "react-bootstrap"
import {
  FaUsers,
  FaPlus,
  FaSearch,
  FaFilter,
  FaCalendarAlt,
  FaLock,
  FaGlobe,
  FaBuilding,
  FaComments,
  FaUserFriends,
  FaImage,
  FaClock,
  FaCheckCircle,
  FaSignInAlt,
  FaBell,
  FaShieldAlt,
  FaExclamationTriangle,
  FaSignOutAlt
} from "react-icons/fa"
import { useRouter } from "next/navigation"
import { useAuth } from "../../../../lib/contexts/AuthContext"
import { toast } from "react-toastify"
import DashboardLayout from "../../../../components/layout/DashboardLayout"
import Link from "next/link"

const GroupsPage = () => {
  const { user, api, isAuthenticated, loading: authLoading } = useAuth()
  const router = useRouter()

  const [groups, setGroups] = useState([])
  const [filteredGroups, setFilteredGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [processingRequest, setProcessingRequest] = useState(null)
  const [membershipStatus, setMembershipStatus] = useState({})
  const [pendingRequestCounts, setPendingRequestCounts] = useState({})

  const groupsPerPage = 9

  // Check authentication
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      console.log("🚫 User not authenticated - groups page should redirect via middleware")
    }
  }, [isAuthenticated, authLoading])

  useEffect(() => {
    if (user && isAuthenticated) {
      loadGroups()
    }
  }, [user, isAuthenticated])

  useEffect(() => {
    filterGroups()
  }, [searchTerm, typeFilter, groups])

  const initializeMembershipStatus = useCallback((allGroups, myGroups) => {
    const status = {}

    console.group("🔍 MEMBERSHIP INITIALIZATION")
    console.log("Current user ID:", user?.id)
    console.log("User object:", user)
    console.log("All groups count:", allGroups.length)
    console.log("My groups count:", myGroups.length)

    // Create a map of user's groups for quick lookup
    const myGroupMap = new Map()
    myGroups.forEach(g => {
      const role = g.memberRole || g.user_role || g.role || g.userRole || 'MEMBER'
      myGroupMap.set(g.id, {
        isMember: true,
        role: role,
        hasPendingRequest: false
      })
      console.log(` User is member of group ${g.id} (${g.name}) with role: ${role}`)
    })

    allGroups.forEach(group => {
      const groupId = group.id

      // Default status
      let groupStatus = {
        isMember: false,
        role: null,
        hasPendingRequest: false
      }

      // Priority 1: Check if user is already a member from myGroups (most reliable)
      if (myGroupMap.has(groupId)) {
        groupStatus = myGroupMap.get(groupId)
        console.log(` Priority 1: Group "${group.name}" - User IS member (from myGroups)`)
      }
      // Priority 2: Check if user is the creator/admin of the group
      else {
        // Check all possible creator field names
        const isCreator = (
          group.createdBy === user?.id ||
          group.created_by === user?.id ||
          group.creatorId === user?.id ||
          group.creator_id === user?.id ||
          group.ownerId === user?.id ||
          group.owner_id === user?.id ||
          group.userId === user?.id ||
          group.user_id === user?.id ||
          group.authorId === user?.id ||
          group.author_id === user?.id
        )

        if (isCreator) {
          groupStatus = {
            isMember: true,
            role: 'ADMIN', // Creator is always admin
            hasPendingRequest: false
          }
          console.log(`👑 Priority 2: Group "${group.name}" - User is CREATOR/ADMIN`)
        }
        // Priority 3: Check if the group data itself indicates membership
        else if (group.isMember === true || group.is_member === true) {
          groupStatus.isMember = true
          groupStatus.role = group.userRole || group.user_role || group.memberRole || 'MEMBER'
          console.log(` Priority 3: Group "${group.name}" - User IS member (from group data)`)
        }
        // Priority 4: Check for pending request
        else if (group.hasPendingRequest === true ||
          group.has_pending_request === true ||
          group.pendingRequest === true ||
          group.membershipStatus === 'PENDING' ||
          group.membership_status === 'PENDING') {
          groupStatus.hasPendingRequest = true
          console.log(`⏳ Priority 4: Group "${group.name}" - User HAS pending request`)
        } else {
          console.log(`❌ Default: Group "${group.name}" - User is NOT a member`)
        }
      }

      status[groupId] = groupStatus
      console.log(`📊 Final status for "${group.name}":`, groupStatus)
    })

    console.log("\n Final membership status map:", status)
    console.groupEnd()

    return status
  }, [user?.id])

  const loadPendingRequestCounts = useCallback(async (adminGroupIds) => {
    const counts = {}

    console.log(`📊 Loading pending counts for ${adminGroupIds.length} admin groups`)

    const requests = adminGroupIds.map(async (groupId) => {
      try {
        const response = await api.groups.getJoinRequests(groupId)
        console.log(`Join requests for group ${groupId}:`, response)

        // Handle different response structures
        let requestsArray = []
        if (Array.isArray(response)) {
          requestsArray = response
        } else if (response.requests && Array.isArray(response.requests)) {
          requestsArray = response.requests
        } else if (response.data && Array.isArray(response.data)) {
          requestsArray = response.data
        } else if (response.joinRequests && Array.isArray(response.joinRequests)) {
          requestsArray = response.joinRequests
        }

        const pendingCount = requestsArray.filter(req =>
          req.status === 'PENDING' ||
          req.status === 'pending' ||
          !req.status
        ).length

        if (pendingCount > 0) {
          counts[groupId] = pendingCount
          console.log(` Group ${groupId} has ${pendingCount} pending requests`)
        }
      } catch (error) {
        console.warn(` Failed to load requests for group ${groupId}:`, error)
      }
    })

    await Promise.all(requests)
    setPendingRequestCounts(counts)
  }, [api.groups])

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true)

      console.log("🔄 Loading groups for user:", user?.id)

      // MODIFIED: Use the dedicated joined groups endpoint instead of searchGroups
      // This will return only groups where the user is a member
      const joinedGroupsResponse = await api.request('/api/v1/groups/joined')

      console.log("📥 Joined groups response:", joinedGroupsResponse)

      // Parse groups from response
      let userGroups = []
      if (Array.isArray(joinedGroupsResponse)) {
        userGroups = joinedGroupsResponse
      } else if (joinedGroupsResponse.groups && Array.isArray(joinedGroupsResponse.groups)) {
        userGroups = joinedGroupsResponse.groups
      } else if (joinedGroupsResponse.data && Array.isArray(joinedGroupsResponse.data)) {
        userGroups = joinedGroupsResponse.data
      }

      console.log(` Loaded ${userGroups.length} groups where user is a member`)

      // Get user's groups for role information (using same endpoint for consistency)
      let myGroups = userGroups // We already have user's groups from the joined endpoint

      // Update groups state with only user's groups
      setGroups(userGroups)

      // Initialize membership status (includes creator detection)
      const membershipData = initializeMembershipStatus(userGroups, myGroups)
      setMembershipStatus(membershipData)

      // Load pending request counts for admin groups
      const adminGroupIds = Object.entries(membershipData)
        .filter(([_, status]) => status.role === 'ADMIN')
        .map(([groupId]) => groupId)

      if (adminGroupIds.length > 0) {
        console.log(`🔑 Found ${adminGroupIds.length} admin groups, loading pending requests...`)
        setTimeout(() => {
          loadPendingRequestCounts(adminGroupIds)
        }, 500)
      }

    } catch (error) {
      console.error("❌ Failed to load groups:", error)
      toast.error(error.message || "Failed to load groups")
      setGroups([])
      setMembershipStatus({})
    } finally {
      setLoading(false)
    }
  }, [user?.id, api.request, initializeMembershipStatus, loadPendingRequestCounts])

  const filterGroups = useCallback(() => {
    let result = [...groups]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (group) =>
          group.name?.toLowerCase().includes(term) ||
          group.description?.toLowerCase().includes(term)
      )
    }

    if (typeFilter !== "all") {
      result = result.filter((group) =>
        group.visibility === typeFilter || group.type === typeFilter
      )
    }

    setFilteredGroups(result)
    setCurrentPage(1)
  }, [searchTerm, typeFilter, groups])

  const handleJoinOrRequest = async (group) => {
    const groupId = group.id
    const isPrivate = group.visibility === "PRIVATE" || group.type === "PRIVATE"

    try {
      setProcessingRequest(groupId)

      console.log(`🚀 Attempting to join ${isPrivate ? 'PRIVATE' : 'PUBLIC'} group: "${group.name}"`)

      // Make API call to join group
      const response = await api.groups.joinGroup(groupId)

      console.log("📥 Join API response:", response)

      // Parse response to determine actual status
      let actualStatus = {
        isMember: false,
        hasPendingRequest: false,
        role: null
      }

      let successMessage = ""
      let toastType = "success"

      // Check response for status indicators
      const responseMessage = response.message?.toLowerCase() || ""
      const responseStatus = response.status?.toLowerCase() || ""
      const responseData = response.data || response

      // Determine if it's pending based on multiple indicators
      const isPending =
        responseStatus === 'pending' ||
        responseData.status === 'PENDING' ||
        responseData.membershipStatus === 'PENDING' ||
        responseMessage.includes('pending') ||
        responseMessage.includes('request') ||
        responseMessage.includes('approval') ||
        responseMessage.includes('waiting') ||
        (isPrivate && !responseMessage.includes('joined') && !responseMessage.includes('member'))

      if (isPending) {
        // Request is pending approval
        actualStatus = {
          isMember: false,
          hasPendingRequest: true,
          role: null
        }
        successMessage = "📨 Join request sent! The group admin will review your request."
        toastType = "info"
      } else {
        // Successfully joined
        actualStatus = {
          isMember: true,
          hasPendingRequest: false,
          role: responseData.role || response.role || 'MEMBER'
        }
        successMessage = "🎉 Successfully joined the group! Click 'Enter Group' to start participating."
        toastType = "success"
      }

      console.log(" Determined status:", actualStatus)

      // Update membership status immediately (live update)
      setMembershipStatus(prev => ({
        ...prev,
        [groupId]: actualStatus
      }))

      // Update group data with correct member count
      setGroups(prev => prev.map(g =>
        g.id === groupId
          ? {
            ...g,
            isMember: actualStatus.isMember,
            hasPendingRequest: actualStatus.hasPendingRequest,
            memberCount: actualStatus.isMember
              ? (g.memberCount || 0) + 1
              : g.memberCount || 0
          }
          : g
      ))

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

      // If user became admin, refresh pending counts
      if (actualStatus.role === 'ADMIN') {
        setTimeout(() => {
          loadPendingRequestCounts([groupId])
        }, 1000)
      }

    } catch (error) {
      console.error("❌ Join/Request error:", error)

      // Handle specific error cases with appropriate UI updates
      const errorMessage = error.message?.toLowerCase() || ""

      if (errorMessage.includes('already requested') ||
        errorMessage.includes('pending request') ||
        errorMessage.includes('request already exists')) {

        // Update to show pending request
        setMembershipStatus(prev => ({
          ...prev,
          [groupId]: {
            ...prev[groupId],
            hasPendingRequest: true,
            isMember: false
          }
        }))

        setGroups(prev => prev.map(g =>
          g.id === groupId
            ? { ...g, hasPendingRequest: true, isMember: false }
            : g
        ))

        toast.info("⏳ You've already sent a request. Waiting for admin approval.", {
          autoClose: 4000
        })

      } else if (errorMessage.includes('already a member') ||
        errorMessage.includes('already joined') ||
        errorMessage.includes('already in group')) {

        // Update to show membership
        setMembershipStatus(prev => ({
          ...prev,
          [groupId]: {
            ...prev[groupId],
            isMember: true,
            hasPendingRequest: false,
            role: 'MEMBER'
          }
        }))

        setGroups(prev => prev.map(g =>
          g.id === groupId
            ? { ...g, isMember: true, hasPendingRequest: false }
            : g
        ))

        toast.info(" You are already a member of this group!", {
          autoClose: 3000
        })

      } else if (errorMessage.includes('private') &&
        errorMessage.includes('cannot join')) {

        toast.info("🔒 This is a private group. Please request to join.", {
          autoClose: 4000
        })

      } else {
        toast.error(`❌ ${error.message || "Failed to process request"}`, {
          autoClose: 4000
        })
      }
    } finally {
      setProcessingRequest(null)
    }
  }

  const getTypeBadge = (type) => {
    const visibility = type || "PUBLIC"

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
        return (
          <Badge bg="secondary" className="py-1 px-2 rounded-pill">
            {visibility}
          </Badge>
        )
    }
  }

  const getRoleBadge = (role) => {
    if (!role) return null

    switch (role) {
      case "ADMIN":
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
            Admin
          </Badge>
        )
      case "MODERATOR":
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
            Moderator
          </Badge>
        )
      case "MEMBER":
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
            Member
          </Badge>
        )
      default:
        return null
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ""
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch (error) {
      return ""
    }
  }

  const isPrivateGroup = (group) => {
    return group.visibility === "PRIVATE" || group.type === "PRIVATE"
  }

  const isAdmin = (groupId) => {
    return membershipStatus[groupId]?.role === "ADMIN"
  }

  const getButtonConfig = (group) => {
    const groupId = group.id
    const isPrivate = isPrivateGroup(group)
    const userStatus = membershipStatus[groupId]

    if (processingRequest === groupId) {
      return {
        primary: {
          text: "Processing...",
          icon: <Spinner animation="border" size="sm" className="me-2" />,
          onClick: () => { },
          variant: "outline-secondary",
          disabled: true
        },
        secondary: null
      }
    }

    if (userStatus?.isMember) {
      return {
        primary: {
          text: "Enter Group",
          icon: <FaSignInAlt className="me-2" />,
          onClick: () => handleViewGroup(group.slug, group.id),
          variant: "primary",
          disabled: false
        },
        secondary: isAdmin(groupId) ? {
          text: "Moderate",
          icon: <FaShieldAlt />,
          onClick: () => handleManageRequests(group.id),
          variant: "outline-secondary",
          hasBadge: pendingRequestCounts[groupId] > 0,
          badgeCount: pendingRequestCounts[groupId]
        } : null
      }
    }

    if (userStatus?.hasPendingRequest) {
      return {
        primary: {
          text: "Request Pending",
          icon: <FaClock className="me-2" />,
          onClick: () => { },
          variant: "outline-secondary",
          disabled: true
        },
        secondary: null
      }
    }

    if (isPrivate) {
      return {
        primary: {
          text: "Request to Join",
          icon: <FaLock className="me-2" />,
          onClick: () => handleJoinOrRequest(group),
          variant: "outline-primary",
          disabled: false
        },
        secondary: null
      }
    }

    return {
      primary: {
        text: "Join Group",
        icon: <FaUserFriends className="me-2" />,
        onClick: () => handleJoinOrRequest(group),
        variant: "primary",
        disabled: false
      },
      secondary: null
    }
  }

  const handleViewGroup = (groupSlug, groupId) => {
    const identifier = groupSlug || groupId
    router.push(`/dashboard/groups/${identifier}`)
  }

  const handleCreateGroup = () => {
    router.push("/dashboard/groups/create")
  }

  const handleDiscoverGroups = () => {
    router.push("/dashboard/groups/discover")
  }

  const handleManageRequests = (groupId) => {
    router.push(`/dashboard/groups/${groupId}/moderation`)
  }

  const indexOfLastGroup = currentPage * groupsPerPage
  const indexOfFirstGroup = indexOfLastGroup - groupsPerPage
  const currentGroups = filteredGroups.slice(indexOfFirstGroup, indexOfLastGroup)
  const totalPages = Math.ceil(filteredGroups.length / groupsPerPage)

  // Show auth loading state
  if (authLoading) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <Spinner animation="border" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                <p className="mt-4 text-muted fs-5">Checking authentication...</p>
              </div>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    )
  }

  // Show not authenticated message (fallback if middleware fails)
  if (!isAuthenticated) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <div className="mb-4">
                  <FaExclamationTriangle
                    className="text-danger"
                    style={{ fontSize: "4rem", opacity: 0.7 }}
                  />
                </div>
                <h4 className="fw-bold mb-3" style={{ color: "#dc3545" }}>
                  Authentication Required
                </h4>
                <p className="text-muted mb-4">
                  You need to be logged in to access groups. Please sign in to continue.
                </p>
                <div className="d-flex gap-3 justify-content-center">
                  <Link href="/auth/login?callbackUrl=/dashboard/groups">
                    <Button
                      variant="primary"
                      className="px-4 py-3 rounded-pill shadow-sm border-0 fw-semibold"
                      style={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                      }}
                    >
                      <FaSignInAlt className="me-2" />
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/auth/signup">
                    <Button
                      variant="outline-primary"
                      className="px-4 py-3 rounded-pill border-0"
                      style={{
                        borderColor: '#667eea',
                        color: '#667eea'
                      }}
                    >
                      Create Account
                    </Button>
                  </Link>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    )
  }

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <Spinner animation="border" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                <p className="mt-4 text-muted fs-5">Loading your groups...</p>
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
        {/* Authentication Status Banner */}
        {isAuthenticated && (
          <Row className="mb-3">
            <Col>
              <Alert
                variant="success"
                className="border-0 rounded-4 shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.1) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  color: '#065f46'
                }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <FaCheckCircle className="me-2" />
                    <span className="fw-medium">
                      Signed in as <strong>{user?.displayName || user?.email || 'User'}</strong>
                    </span>
                  </div>
                  <Badge
                    bg=""
                    className="py-1 px-2 rounded-pill border-0"
                    style={{
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: 'white',
                      fontSize: '0.75rem'
                    }}
                  >
                    Authenticated
                  </Badge>
                </div>
              </Alert>
            </Col>
          </Row>
        )}

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
                    maxWidth: '600px'
                  }}
                />
                <div className="position-relative p-4 rounded-4">
                  <h1 className="fw-bold mb-2 display-5" style={{ color: "#2d3748" }}>
                    Your Groups
                  </h1>
                  <p className="text-muted mb-0 fs-6">
                    Communities you've joined for scam prevention and awareness
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div className="d-flex gap-3">
                <Button
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
                </Button>

                <Button
                  variant="outline-primary"
                  onClick={handleDiscoverGroups}
                  className="d-flex align-items-center gap-2 px-4 py-3 rounded-pill border-0 shadow-sm"
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                    border: '1px solid #e9ecef',
                    color: '#667eea'
                  }}
                >
                  <FaGlobe />
                  <span>Discover Groups</span>
                </Button>
              </div>

              <div className="d-flex align-items-center gap-3">
                <p className="text-muted mb-0 small">
                  Showing {filteredGroups.length} groups you're a member of
                </p>
              </div>
            </div>

            {/* Filter Card */}
            <Card className="border-0 shadow-sm mb-4 rounded-4">
              <Card.Body className="p-4">
                <Row className="g-3 align-items-center">
                  <Col md={6}>
                    <div className="position-relative">
                      <FaSearch
                        className="position-absolute text-muted"
                        style={{ left: "20px", top: "50%", transform: "translateY(-50%)", zIndex: 10 }}
                      />
                      <Form.Control
                        type="text"
                        placeholder="Search your groups..."
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

                  <Col md={4}>
                    <Form.Select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="py-3 border-0 bg-light rounded-pill"
                      style={{ fontSize: '0.95rem' }}
                    >
                      <option value="all">All Types</option>
                      <option value="PUBLIC">Public Groups</option>
                      <option value="PRIVATE">Private Groups</option>
                      <option value="OFFICIAL">Official Groups</option>
                    </Form.Select>
                  </Col>

                  <Col md={2}>
                    <Button
                      variant="light"
                      className="w-100 rounded-pill shadow-sm border-0 py-3"
                      onClick={() => {
                        setSearchTerm("")
                        setTypeFilter("all")
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

            {/* Groups Grid */}
            <Row className="g-4">
              {currentGroups.length === 0 ? (
                <Col xs={12}>
                  <Card className="border-0 shadow-sm rounded-4 text-center py-5">
                    <Card.Body>
                      <div className="mb-4">
                        <FaUsers className="text-muted" style={{ fontSize: "4rem", opacity: 0.2 }} />
                      </div>
                      <h5 className="fw-semibold mb-3" style={{ color: "#4a5568" }}>
                        {searchTerm || typeFilter !== "all"
                          ? "No groups match your filters"
                          : "You haven't joined any groups yet"}
                      </h5>
                      <p className="text-muted mb-4">
                        {searchTerm || typeFilter !== "all"
                          ? "Try changing your filters"
                          : "Join or create your first group to get started"}
                      </p>
                      <div className="d-flex gap-3 justify-content-center">
                        <Button
                          variant="primary"
                          onClick={handleDiscoverGroups}
                          className="px-4 py-3 rounded-pill shadow-sm border-0 fw-semibold"
                          style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          }}
                        >
                          <FaGlobe className="me-2" />
                          Discover Groups
                        </Button>
                        <Button
                          variant="outline-primary"
                          onClick={handleCreateGroup}
                          className="px-4 py-3 rounded-pill border-0"
                        >
                          <FaPlus className="me-2" />
                          Create Group
                        </Button>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ) : (
                currentGroups.map((group) => {
                  const buttonConfig = getButtonConfig(group)
                  const userStatus = membershipStatus[group.id]
                  const isMember = userStatus?.isMember
                  const hasPendingRequest = userStatus?.hasPendingRequest
                  const pendingCount = pendingRequestCounts[group.id] || 0

                  return (
                    <Col key={group.id} xl={4} lg={4} md={6}>
                      <Card
                        className="border-0 shadow-sm h-100 rounded-4 overflow-hidden"
                        style={{
                          transition: 'all 0.3s ease',
                          cursor: isMember ? 'pointer' : 'default'
                        }}
                        onClick={() => isMember && handleViewGroup(group.slug, group.id)}
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
                        {/* Banner */}
                        <div
                          className="position-relative"
                          style={{
                            height: '120px',
                            background: group.coverImageUrl
                              ? `url(${group.coverImageUrl})`
                              : group.banner_url
                                ? `url(${group.banner_url})`
                                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            backgroundSize: 'cover',
                            backgroundPosition: 'center'
                          }}
                        >
                          {(!group.coverImageUrl && !group.banner_url) && (
                            <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                              <FaImage className="text-white" style={{ fontSize: '2rem', opacity: 0.5 }} />
                            </div>
                          )}

                          <div className="position-absolute top-0 start-0 p-3">
                            <div className="d-flex gap-2">
                              {getTypeBadge(group.visibility || group.type)}
                              {userStatus?.role && getRoleBadge(userStatus.role)}
                            </div>
                          </div>

                          {isAdmin(group.id) && pendingCount > 0 && (
                            <div className="position-absolute top-0 end-0 p-3">
                              <Badge
                                bg=""
                                className="py-1 px-2 rounded-pill border-0 shadow-sm"
                                style={{
                                  background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                                  color: 'white',
                                  fontSize: '0.75rem',
                                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                                }}
                              >
                                <FaBell className="me-1" size={10} />
                                {pendingCount} pending
                              </Badge>
                            </div>
                          )}
                        </div>

                        <Card.Body className="p-4">
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
                            {group.description || "No description available"}
                          </p>

                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <div className="d-flex align-items-center gap-3">
                              <div className="d-flex align-items-center gap-1 text-muted small">
                                <FaUsers size={14} />
                                <span>{group.memberCount || group.members_count || 0}</span>
                              </div>
                              <div className="d-flex align-items-center gap-1 text-muted small">
                                <FaComments size={14} />
                                <span>{group.postCount || group.posts_count || 0}</span>
                              </div>
                            </div>

                            <div className="text-muted small">
                              <FaCalendarAlt className="me-1" size={12} />
                              {formatDate(group.createdAt || group.created_at)}
                            </div>
                          </div>

                          <div className="d-flex gap-2">
                            <Button
                              variant={buttonConfig.primary.variant}
                              className={`flex-grow-1 py-2 rounded-pill border-0 ${buttonConfig.primary.disabled ? 'pe-none' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                buttonConfig.primary.onClick();
                              }}
                              disabled={buttonConfig.primary.disabled}
                              style={{
                                background: buttonConfig.primary.variant === 'primary'
                                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                  : buttonConfig.primary.variant === 'outline-primary'
                                    ? 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
                                    : 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)',
                                border: buttonConfig.primary.variant === 'outline-primary'
                                  ? '1px solid #667eea'
                                  : '1px solid #e9ecef',
                                color: buttonConfig.primary.variant === 'primary'
                                  ? 'white'
                                  : buttonConfig.primary.variant === 'outline-primary'
                                    ? '#667eea'
                                    : '#9ca3af',
                                cursor: buttonConfig.primary.disabled ? 'not-allowed' : 'pointer'
                              }}
                            >
                              {buttonConfig.primary.icon}
                              {buttonConfig.primary.text}
                            </Button>

                            {buttonConfig.secondary && (
                              <div
                                className="position-relative"
                                style={{ cursor: 'default' }}
                                title="Pending join requests"
                              >
                                <div
                                  className="px-3 py-2 rounded-pill border-0 d-inline-flex align-items-center justify-content-center"
                                  style={{
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                    border: '1px solid #e9ecef',
                                    color: '#6b7280',
                                    cursor: 'default',
                                    opacity: 0.8
                                  }}
                                >
                                  {buttonConfig.secondary.icon}
                                </div>
                                {buttonConfig.secondary.hasBadge && (
                                  <Badge
                                    pill
                                    className="position-absolute border-0"
                                    style={{
                                      top: '-8px',
                                      right: '-8px',
                                      background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                                      color: 'white',
                                      fontSize: '0.65rem',
                                      minWidth: '20px',
                                      padding: '0.25rem 0.4rem',
                                      pointerEvents: 'none'
                                    }}
                                  >
                                    {buttonConfig.secondary.badgeCount}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

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
                                {userStatus?.role && ` (${userStatus.role})`}
                              </Badge>
                            </div>
                          )}

                          {!isMember && hasPendingRequest && (
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
                    </Col>
                  )
                })
              )}
            </Row>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-4">
                <Card className="border-0 shadow-sm rounded-4">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center">
                      <p className="text-muted mb-0 small">
                        Showing {indexOfFirstGroup + 1} to {Math.min(indexOfLastGroup, filteredGroups.length)} of{" "}
                        {filteredGroups.length} groups
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
          </Col>
        </Row>
      </Container>

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.7;
          }
        }
      `}</style>
    </DashboardLayout>
  )
}

export default GroupsPage