"use client"

import { useState, useEffect } from "react"
import { Container, Row, Col, Card, Table, Button, Badge, Spinner, Form, Modal, Pagination, Alert } from "react-bootstrap"
import {
  FaEdit,
  FaTrash,
  FaEye,
  FaFilter,
  FaSearch,
  FaExclamationTriangle,
  FaShieldAlt,
  FaQuestionCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaSort,
  FaPlus,
  FaArrowLeft,
  FaFileAlt,
  FaSortUp,
  FaSortDown,
  FaBuilding,
  FaUser,
  FaCalendarAlt,
  FaInfoCircle,
  FaArrowRight,
  FaTags,
  FaEllipsisH
} from "react-icons/fa"
import { useRouter } from "next/navigation"
import { useAuth } from "../../../../lib/contexts/AuthContext"
import { toast } from "react-toastify"
import DashboardLayout from "../../../../components/layout/DashboardLayout"

const MyPostsDashboard = () => {
  const { user, api } = useAuth()
  const router = useRouter()

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [filteredPosts, setFilteredPosts] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [sortConfig, setSortConfig] = useState({ key: "createdAt", direction: "desc" })
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [postToDelete, setPostToDelete] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [isHovered, setIsHovered] = useState(false)
  const postsPerPage = 10

  useEffect(() => {
    loadPosts()
  }, [])

  useEffect(() => {
    filterAndSortPosts()
  }, [posts, searchTerm, statusFilter, typeFilter, sortConfig])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const response = await api.posts.getMyPosts()
      
      // Handle different response structures
      let postsArray = []
      
      if (Array.isArray(response)) {
        postsArray = response
      } else if (response && response.data && Array.isArray(response.data)) {
        postsArray = response.data
      } else if (response && response.posts && Array.isArray(response.posts)) {
        postsArray = response.posts
      } else if (response && response.items && Array.isArray(response.items)) {
        postsArray = response.items
      }
      
      console.log("Posts loaded:", postsArray)
      setPosts(postsArray)
    } catch (error) {
      console.error("Failed to load posts:", error)
      toast.error("Failed to load your posts")
      setPosts([])
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortPosts = () => {
    let result = Array.isArray(posts) ? [...posts] : []

    // Apply filters
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (post) => 
          (post.title && post.title.toLowerCase().includes(term)) || 
          (post.description && post.description.toLowerCase().includes(term))
      )
    }

    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        result = result.filter((post) => post.status !== "DELETED")
      } else {
        result = result.filter((post) => post.status === statusFilter)
      }
    }

    if (typeFilter !== "all") {
      result = result.filter((post) => post.postType === typeFilter)
    }

    // Apply sorting
    result.sort((a, b) => {
      const aValue = a[sortConfig.key]
      const bValue = b[sortConfig.key]

      if (sortConfig.key === "createdAt" || sortConfig.key === "updatedAt" || sortConfig.key === "editableUntil") {
        const aDate = aValue ? new Date(aValue) : new Date(0)
        const bDate = bValue ? new Date(bValue) : new Date(0)
        return sortConfig.direction === "asc"
          ? aDate - bDate
          : bDate - aDate
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1
      }
      return 0
    })

    setFilteredPosts(result)
  }

  const requestSort = (key) => {
    let direction = "asc"
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
  }

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <FaSort className="text-muted opacity-50" />
    return sortConfig.direction === "asc" ? 
      <FaSortUp className="text-primary" /> : 
      <FaSortDown className="text-primary" />
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <Badge 
            bg="" 
            className="py-1 px-3 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: 'white',
              fontSize: '0.8rem'
            }}
          >
            <FaCheckCircle className="me-1" /> Published
          </Badge>
        )
      case "UNDER_REVIEW":
        return (
          <Badge 
            bg="" 
            className="py-1 px-3 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: 'white',
              fontSize: '0.8rem'
            }}
          >
            <FaClock className="me-1" /> Under Review
          </Badge>
        )
      case "REJECTED":
        return (
          <Badge 
            bg="" 
            className="py-1 px-3 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: 'white',
              fontSize: '0.8rem'
            }}
          >
            <FaTimesCircle className="me-1" /> Rejected
          </Badge>
        )
      case "DELETED":
        return (
          <Badge 
            bg="" 
            className="py-1 px-3 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
              color: 'white',
              fontSize: '0.8rem'
            }}
          >
            Deleted
          </Badge>
        )
      default:
        return (
          <Badge 
            bg="secondary" 
            className="py-1 px-3 rounded-pill fw-medium"
          >
            {status || "Unknown"}
          </Badge>
        )
    }
  }
const getTypeBadge = (post) => {
  const { postType, isCompanyPost, badges } = post
  
  let gradient = ""
  let icon = FaExclamationTriangle
  
  switch (postType) {
    case "SCAM_REPORT":
      gradient = "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)"
      icon = FaExclamationTriangle
      break
    case "SCAM_AWARENESS":
      gradient = "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
      icon = FaShieldAlt
      break
    case "QUESTION":
      gradient = "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)"
      icon = FaQuestionCircle
      break
    default:
      gradient = "linear-gradient(135deg, #6B7280 0%, #4B5563 100%)"
      icon = FaFileAlt
  }
  
  const Icon = icon
  
  // Filter out evidence badges that match the post type
  const evidenceBadges = badges && Array.isArray(badges) 
    ? badges.filter(badge => 
        !(badge.badgeType === "SCAM_REPORT" && postType === "SCAM_REPORT") &&
        !(badge.badgeType === "SCAM_AWARENESS" && postType === "SCAM_AWARENESS") &&
        !(badge.badgeType === "QUESTION" && postType === "QUESTION")
      )
    : []
  
  return (
    <div className="d-flex flex-column gap-2">
      {/* Main Type Badge */}
      <Badge 
        bg="" 
        className="py-1 px-3 rounded-pill border-0 d-flex align-items-center gap-2 fw-medium"
        style={{ 
          background: gradient,
          color: 'white',
          fontSize: '0.8rem',
          width: 'fit-content'
        }}
      >
        <Icon className="me-1" size={12} />
        {postType === "SCAM_REPORT" ? "Scam Report" : 
         postType === "SCAM_AWARENESS" ? "Scam Awareness" : 
         postType === "QUESTION" ? "Question" : postType}
      </Badge>
      
      {/* Company Badge */}
      {isCompanyPost && (
        <Badge 
          bg="" 
          className="py-1 px-2 rounded-pill align-self-start border-0 fw-medium"
          style={{ 
            background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
            color: 'white',
            fontSize: '0.75rem'
          }}
        >
          <FaBuilding className="me-1" size={10} />
          Company Post
        </Badge>
      )}
      
      {/* Evidence Badges Only (filtered to not duplicate main type) */}
      {evidenceBadges.length > 0 && (
        <div className="d-flex flex-column gap-1 mt-1">
          {evidenceBadges.map((badge, index) => {
            // Use badge color from backend or default colors
            const badgeColor = badge.color || 
              (badge.badgeType === "EVIDENCE_PROVIDED" ? "#10B981" :
               badge.badgeType === "NO_EVIDENCE" ? "#6B7280" : "#6c757d")
            
            return (
              <Badge 
                key={badge.id || index} 
                className="py-1 px-2 rounded-pill align-self-start border-0 fw-medium"
                style={{ 
                  backgroundColor: badgeColor,
                  color: 'white',
                  fontSize: '0.75rem'
                }}
              >
                {badge.label}
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}
  const formatDate = (dateString) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    } catch (error) {
      return "Invalid Date"
    }
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return "N/A"
    try {
      return new Date(dateString).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    } catch (error) {
      return "Invalid Date"
    }
  }

  const canEditPost = (post) => {
    if (!post || !user) return false
    
    // Check if post is deleted
    if (post.status === "DELETED") return false
    
    // Check edit window (30 minutes from creation)
    const now = new Date()
    const editableUntil = post.editableUntil ? new Date(post.editableUntil) : null
    
    if (editableUntil && now > editableUntil) {
      return false
    }
    
    // Normal user: can only edit their own posts
    if (post.userId === user.id) {
      return true
    }
    
    // Company staff: can edit specific post types
    if (post.isCompanyPost && post.companyStaff) {
      const allowedPostTypes = ['SCAM_AWARENESS', 'QUESTION']
      
      // Company staff can edit company-created scam reports
      if (post.postType === 'SCAM_REPORT') {
        return true
      }
      
      return allowedPostTypes.includes(post.postType)
    }
    
    return false
  }

  const canDeletePost = (post) => {
    if (!post || !user) return false
    
    // Check if post is already deleted
    if (post.status === "DELETED") return false
    
    // Normal user: can only delete their own posts
    if (post.userId === user.id) {
      return true
    }
    
    // Company staff: can delete specific post types
    if (post.isCompanyPost && post.companyStaff) {
      const allowedPostTypes = ['SCAM_AWARENESS', 'QUESTION']
      
      // Company staff can delete company-created scam reports
      if (post.postType === 'SCAM_REPORT') {
        return true
      }
      
      return allowedPostTypes.includes(post.postType)
    }
    
    return false
  }

  const handleEdit = (post) => {
    if (!post || !post.id) {
      toast.error("Cannot edit post: missing ID")
      return
    }
    
    if (canEditPost(post)) {
      router.push(`/dashboard/posts/edit/${post.id}`)
    } else {
      if (post.status === "DELETED") {
        toast.warning("This post has been deleted and cannot be edited.")
      } else if (post.editableUntil && new Date() > new Date(post.editableUntil)) {
        toast.warning("Edit window has expired (30 minutes after creation).")
      } else {
        toast.warning("You don't have permission to edit this post.")
      }
    }
  }

  const handleView = (post) => {
    if (!post || !post.id) {
      toast.error("Cannot view post: missing ID")
      return
    }
    router.push(`/dashboard/posts/view/${post.id}`)
  }

  const confirmDelete = (post) => {
    if (!post || !post.id) {
      toast.error("Cannot delete post: missing ID")
      return
    }
    
    if (!canDeletePost(post)) {
      if (post.status === "DELETED") {
        toast.warning("This post has already been deleted")
      } else {
        toast.warning("You don't have permission to delete this post")
      }
      return
    }
    
    setPostToDelete(post)
    setShowDeleteModal(true)
  }

  const handleDelete = async () => {
    if (!postToDelete || !postToDelete.id) {
      toast.error("Cannot delete post: missing ID")
      return
    }

    try {
      await api.posts.deletePost(postToDelete.id)
      toast.success("Post deleted successfully")
      
      // Update local state - mark as deleted
      setPosts(prevPosts => 
        Array.isArray(prevPosts)
          ? prevPosts.map(post => 
              post.id === postToDelete.id 
                ? { ...post, status: "DELETED", deletedAt: new Date().toISOString() }
                : post
            )
          : []
      )
      
      // Reload posts to get updated list
      loadPosts()
    } catch (error) {
      console.error("Delete error:", error)
      toast.error(error.message || "Failed to delete post")
    } finally {
      setShowDeleteModal(false)
      setPostToDelete(null)
    }
  }

  // Calculate stats
  const calculateStats = () => {
    if (!Array.isArray(posts)) return { total: 0, published: 0, underReview: 0, rejected: 0, deleted: 0 }
    
    const activePosts = posts.filter(p => p.status !== "DELETED")
    
    return {
      total: activePosts.length,
      published: activePosts.filter((p) => p.status === "PUBLISHED").length,
      underReview: activePosts.filter((p) => p.status === "UNDER_REVIEW").length,
      rejected: activePosts.filter((p) => p.status === "REJECTED").length,
      deleted: posts.filter((p) => p.status === "DELETED").length,
    }
  }

  const stats = calculateStats()

  // Pagination
  const indexOfLastPost = currentPage * postsPerPage
  const indexOfFirstPost = indexOfLastPost - postsPerPage
  const currentPosts = Array.isArray(filteredPosts) 
    ? filteredPosts.filter(p => p.status !== "DELETED").slice(indexOfFirstPost, indexOfLastPost)
    : []
  const totalPages = Math.ceil((Array.isArray(filteredPosts) ? filteredPosts.filter(p => p.status !== "DELETED").length : 0) / postsPerPage)

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <Spinner animation="border" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                <p className="mt-4 text-muted fs-5">Loading your posts...</p>
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
          <Col xl={12}>
            {/* Header Section */}
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
                    My Posts & Reports
                  </h1>
                  <p className="text-muted mb-0 fs-6">
                    Manage all your scam reports, awareness posts, and questions
                  </p>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <Row className="mb-4 g-4">
              <Col md={3}>
                <Card 
                  className="border-0 shadow-sm h-100 rounded-4"
                  onMouseEnter={() => setIsHovered(true)}
                  onMouseLeave={() => setIsHovered(false)}
                  style={{ 
                    transition: 'all 0.3s ease',
                    borderRadius: '16px'
                  }}
                >
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <p className="text-muted mb-2 small fw-semibold">
                          Active Posts
                        </p>
                        <h2 className="fw-bold mb-0 display-6">{stats.total}</h2>
                      </div>
                      <div className="p-3 rounded-3" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}>
                        <FaFileAlt className="text-white" style={{ fontSize: "1.5rem" }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={3}>
                <Card className="border-0 shadow-sm h-100 rounded-4" style={{ borderRadius: '16px' }}>
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <p className="text-muted mb-2 small fw-semibold">
                          Published
                        </p>
                        <h2 className="fw-bold mb-0 display-6" style={{ color: '#10B981' }}>
                          {stats.published}
                        </h2>
                      </div>
                      <div className="p-3 rounded-3" style={{ background: "linear-gradient(135deg, #10B981 0%, #059669 100%)" }}>
                        <FaCheckCircle className="text-white" style={{ fontSize: "1.5rem" }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={3}>
                <Card className="border-0 shadow-sm h-100 rounded-4" style={{ borderRadius: '16px' }}>
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <p className="text-muted mb-2 small fw-semibold">
                          Under Review
                        </p>
                        <h2 className="fw-bold mb-0 display-6" style={{ color: '#F59E0B' }}>
                          {stats.underReview}
                        </h2>
                      </div>
                      <div className="p-3 rounded-3" style={{ background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)" }}>
                        <FaClock className="text-white" style={{ fontSize: "1.5rem" }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={3}>
                <Card className="border-0 shadow-sm h-100 rounded-4" style={{ borderRadius: '16px' }}>
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <p className="text-muted mb-2 small fw-semibold">
                          Rejected
                        </p>
                        <h2 className="fw-bold mb-0 display-6" style={{ color: '#DC2626' }}>
                          {stats.rejected}
                        </h2>
                      </div>
                      <div className="p-3 rounded-3" style={{ background: "linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)" }}>
                        <FaTimesCircle className="text-white" style={{ fontSize: "1.5rem" }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Action Buttons */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <Button
                variant="outline-primary"
                onClick={() => router.push("/dashboard")}
                className="d-flex align-items-center gap-2 px-4 py-3 rounded-pill border-0 shadow-sm"
                style={{ 
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  border: '1px solid #e9ecef',
                  color: '#667eea'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                }}
              >
                <FaArrowLeft />
                <span className="fw-semibold">Back to Dashboard</span>
              </Button>
              
              <div className="d-flex gap-3">
                <Button
                  variant="danger"
                  onClick={() => router.push("/report")}
                  className="d-flex align-items-center gap-2 px-4 py-3 rounded-pill shadow-sm border-0 fw-semibold"
                  style={{ 
                    background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(220, 38, 38, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <FaExclamationTriangle />
                  <span>Report Scam</span>
                </Button>
              </div>
            </div>

            {/* Filter Card */}
            <Card className="border-0 shadow-sm mb-4 rounded-4" style={{ borderRadius: '16px' }}>
              <Card.Body className="p-4">
                <Row className="g-3 align-items-center">
                  <Col md={5}>
                    <div className="position-relative">
                      <FaSearch
                        className="position-absolute text-muted"
                        style={{ left: "20px", top: "50%", transform: "translateY(-50%)", zIndex: 10 }}
                      />
                      <Form.Control
                        type="text"
                        placeholder="Search in your posts..."
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

                  <Col md={3}>
                    <Form.Select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="py-3 border-0 bg-light rounded-pill"
                      style={{ fontSize: '0.95rem' }}
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active Only</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                      <option value="PUBLISHED">Published</option>
                      <option value="REJECTED">Rejected</option>
                      <option value="DELETED">Deleted</option>
                    </Form.Select>
                  </Col>

                  <Col md={3}>
                    <Form.Select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="py-3 border-0 bg-light rounded-pill"
                      style={{ fontSize: '0.95rem' }}
                    >
                      <option value="all">All Types</option>
                      <option value="SCAM_REPORT">Scam Reports</option>
                      <option value="SCAM_AWARENESS">Scam Awareness</option>
                      <option value="QUESTION">Questions</option>
                    </Form.Select>
                  </Col>

                  <Col md={1}>
                    <Button
                      variant="light"
                      className="w-100 rounded-pill shadow-sm border-0 py-3"
                      onClick={() => {
                        setSearchTerm("")
                        setStatusFilter("all")
                        setTypeFilter("all")
                        setSortConfig({ key: "createdAt", direction: "desc" })
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

            {/* Posts Table */}
            <Card 
              className="border-0 shadow-sm rounded-4 overflow-hidden"
              style={{ borderRadius: '16px' }}
            >
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead style={{ 
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                    }}>
                      <tr>
                        <th className="py-4 px-4 cursor-pointer fw-semibold" 
                            onClick={() => requestSort("title")}
                            style={{ color: '#4a5568' }}>
                          <div className="d-flex align-items-center gap-2">
                            Title
                            {getSortIcon("title")}
                          </div>
                        </th>
                        <th className="py-4 px-4 cursor-pointer fw-semibold" 
                            onClick={() => requestSort("postType")}
                            style={{ color: '#4a5568' }}>
                          <div className="d-flex align-items-center gap-2">
                            Type
                            {getSortIcon("postType")}
                          </div>
                        </th>
                        <th className="py-4 px-4 fw-semibold" style={{ color: '#4a5568' }}>
                          Status
                        </th>
                        <th className="py-4 px-4 cursor-pointer fw-semibold" 
                            onClick={() => requestSort("createdAt")}
                            style={{ color: '#4a5568' }}>
                          <div className="d-flex align-items-center gap-2">
                            <FaCalendarAlt className="text-muted" />
                            Created
                            {getSortIcon("createdAt")}
                          </div>
                        </th>
                        <th className="py-4 px-4 text-end fw-semibold" style={{ color: '#4a5568' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentPosts.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="text-center py-5">
                            <div className="py-5">
                              <div className="mb-4">
                                <FaExclamationTriangle className="text-muted" style={{ fontSize: "3rem", opacity: 0.2 }} />
                              </div>
                              <h5 className="fw-semibold mb-3" style={{ color: "#4a5568" }}>
                                No posts found
                              </h5>
                              <p className="text-muted mb-4">
                                {searchTerm || statusFilter !== "all" || typeFilter !== "all"
                                  ? "Try changing your filters"
                                  : "Create your first post"}
                              </p>
                              <Button
                                variant="primary"
                                className="px-4 py-3 rounded-pill shadow-sm border-0 fw-semibold"
                                onClick={() => router.push("/dashboard/posts/create")}
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
                                <FaPlus className="me-2" />
                                Create First Post
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        currentPosts.map((post) => {
                          const editable = canEditPost(post)
                          const deletable = canDeletePost(post)
                          const editableUntil = post.editableUntil ? new Date(post.editableUntil) : null
                          const now = new Date()
                          const canEdit = editable && editableUntil && now < editableUntil

                          return (
                            <tr 
                              key={post.id || post._id} 
                              className="align-middle"
                              style={{ 
                                borderBottom: '1px solid #f1f5f9',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#f8fafc';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'transparent';
                              }}
                            >
                              <td className="py-4 px-4">
                                <div>
                                  <h6 className="fw-semibold mb-2" style={{ color: "#2d3748", fontSize: '1rem' }}>
                                    {post.title || "Untitled Post"}
                                  </h6>
                                  <p className="text-muted small mb-0" style={{ maxWidth: "300px" }}>
                                    {post.description ? `${post.description.substring(0, 80)}...` : "No description"}
                                  </p>
                                  {post.isCompanyPost && (
                                    <small className="text-muted d-block mt-2">
                                      <FaBuilding className="me-1" size={12} />
                                      {post.company?.name || "Company Post"}
                                    </small>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                {getTypeBadge(post)}
                              </td>
                              <td className="py-4 px-4">
                                <div className="d-flex flex-column gap-2">
                                  {getStatusBadge(post.status)}
                                  {editableUntil && (
                                    <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                                      {now < editableUntil ? (
                                        <>
                                          <FaClock className="me-1" size={10} />
                                          Editable until: {formatDateTime(post.editableUntil)}
                                        </>
                                      ) : (
                                        <>
                                          <FaTimesCircle className="me-1" size={10} />
                                          Edit window expired
                                        </>
                                      )}
                                    </small>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-muted small" style={{ fontSize: '0.875rem' }}>
                                  {formatDate(post.createdAt)}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="d-flex gap-2 justify-content-end">
                                  <Button
                                    variant="outline-primary"
                                    size="sm"
                                    onClick={() => handleView(post)}
                                    className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill border-0"
                                    style={{ 
                                      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                      border: '1px solid #e9ecef',
                                      color: '#667eea'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.transform = 'translateY(-1px)';
                                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.1)';
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.transform = 'translateY(0)';
                                      e.currentTarget.style.boxShadow = 'none';
                                    }}
                                  >
                                    <FaEye size={12} />
                                    <span className="fw-medium">View</span>
                                  </Button>
                                  {canEdit && (
                                    <Button
                                      variant="outline-secondary"
                                      size="sm"
                                      onClick={() => handleEdit(post)}
                                      className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill border-0"
                                      style={{ 
                                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                        border: '1px solid #e9ecef',
                                        color: '#6b7280'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(107, 114, 128, 0.1)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                      }}
                                    >
                                      <FaEdit size={12} />
                                      <span className="fw-medium">Edit</span>
                                    </Button>
                                  )}
                                  {deletable && (
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => confirmDelete(post)}
                                      className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill border-0"
                                      style={{ 
                                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                        border: '1px solid #fecaca',
                                        color: '#dc2626'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = 'translateY(-1px)';
                                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.1)';
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = 'translateY(0)';
                                        e.currentTarget.style.boxShadow = 'none';
                                      }}
                                    >
                                      <FaTrash size={12} />
                                      <span className="fw-medium">Delete</span>
                                    </Button>
                                  )}
                                </div>
                                {!canEdit && editableUntil && now < editableUntil && (
                                  <small className="text-warning d-block mt-2 text-end" style={{ fontSize: '0.75rem' }}>
                                    <FaInfoCircle className="me-1" size={10} />
                                    No edit permission
                                  </small>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </Table>
                </div>

                {totalPages > 1 && (
                  <div className="p-4 border-top bg-light">
                    <div className="d-flex justify-content-between align-items-center">
                      <p className="text-muted mb-0 small">
                        Showing {indexOfFirstPost + 1} to {Math.min(indexOfLastPost, filteredPosts.filter(p => p.status !== "DELETED").length)} of{" "}
                        {filteredPosts.filter(p => p.status !== "DELETED").length} posts
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
                            className={currentPage === index + 1 ? "rounded-pill mx-1 border-0" : "rounded-pill mx-1 border-0"}
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
                  </div>
                )}
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteModal} 
        onHide={() => setShowDeleteModal(false)} 
        centered
        contentClassName="border-0 rounded-4 shadow-lg"
      >
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold" style={{ color: '#2d3748' }}>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <div className="mb-4">
              <div className="p-3 rounded-circle d-inline-flex" 
                   style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(185, 28, 28, 0.1) 100%)' }}>
                <FaTrash className="text-danger" style={{ fontSize: "2.5rem" }} />
              </div>
            </div>
            <h5 className="fw-semibold mb-3" style={{ color: '#1e293b' }}>
              Delete this post?
            </h5>
            <p className="text-muted mb-0">
              Are you sure you want to delete this post? This action cannot be undone.
            </p>
            <p className="text-muted small mb-0 mt-2">
              {postToDelete?.isCompanyPost 
                ? "This company post will be soft deleted and removed from the newsfeed." 
                : "The post will be permanently removed from the newsfeed."}
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button 
            variant="light" 
            onClick={() => setShowDeleteModal(false)} 
            className="px-4 py-2 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
              border: '1px solid #e2e8f0'
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            className="px-4 py-2 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            Delete Post
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .min-vh-100 {
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
        }
        
        .card {
          border-radius: 16px !important;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: #ffffff;
          transition: all 0.3s ease;
        }
        
        .card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
        }
        
        .btn:hover {
          transform: translateY(-2px);
        }
        
        .form-control:focus,
        .form-select:focus {
          box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
          border-color: #667eea;
        }
        
        .table td, .table th {
          vertical-align: middle;
        }
        
        .table th {
          font-weight: 600;
          color: #4a5568;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .table td {
          border-bottom: 1px solid #f1f5f9;
        }
        
        .badge {
          transition: all 0.2s ease;
        }
        
        .badge:hover {
          transform: scale(1.05);
        }
        
        .pagination-item:hover {
          transform: translateY(-1px);
        }
        
        @media (max-width: 768px) {
          .card {
            border-radius: 12px !important;
          }
          
          .btn {
            padding: 0.5rem 1rem !important;
            font-size: 0.875rem;
          }
          
          .table-responsive {
            font-size: 0.875rem;
          }
          
          .table th, .table td {
            padding: 0.75rem !important;
          }
        }
        
        @media (max-width: 576px) {
          .d-flex {
            flex-direction: column;
            gap: 1rem;
          }
          
          .btn {
            width: 100%;
          }
          
          .pagination {
            flex-wrap: wrap;
            justify-content: center;
          }
        }
      `}</style>
    </DashboardLayout>
  )
}

export default MyPostsDashboard