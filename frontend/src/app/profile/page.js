// src/app/profile/page.js - COMPLETE WITH AUTHENTICATION FIX
"use client"

import { useState, useEffect, useRef } from "react"
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Badge,
  Tab,
  Nav,
  Form,
  Modal,
  ProgressBar,
  Alert,
  Spinner
} from "react-bootstrap"
import {
  FaUser,
  FaEdit,
  FaCamera,
  FaGlobe,
  FaMapMarkerAlt,
  FaEnvelope,
  FaPhone,
  FaCalendarAlt,
  FaChartLine,
  FaShieldAlt,
  FaStar,
  FaAward,
  FaBell,
  FaLock,
  FaFileAlt,
  FaHistory,
  FaCheckCircle,
  FaTimesCircle,
  FaArrowLeft,
  FaTrash,
  FaUpload,
  FaEye,
  FaComment,
  FaBookmark,
  FaThumbsUp,
  FaComments,
  FaBuilding,
  FaExclamationTriangle,
  FaQuestionCircle,
  FaClock,
} from "react-icons/fa"
import { useAuth } from "../../../lib/contexts/AuthContext"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { toast } from "react-toastify"

// Skeleton Loader Component
const PostSkeleton = () => (
  <div className="p-4 rounded-3 border-0" style={{ background: "white", boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)" }}>
    <div className="d-flex justify-content-between align-items-start mb-3">
      <div className="d-flex gap-2">
        <div className="skeleton" style={{ width: "80px", height: "24px", borderRadius: "12px" }}></div>
        <div className="skeleton" style={{ width: "100px", height: "24px", borderRadius: "12px" }}></div>
      </div>
      <div className="skeleton" style={{ width: "80px", height: "16px", borderRadius: "4px" }}></div>
    </div>
    <div className="skeleton mb-2" style={{ width: "70%", height: "20px", borderRadius: "4px" }}></div>
    <div className="skeleton mb-3" style={{ width: "90%", height: "16px", borderRadius: "4px" }}></div>
    <div className="skeleton mb-3" style={{ width: "100%", height: "16px", borderRadius: "4px" }}></div>
    <div className="d-flex justify-content-between">
      <div className="d-flex gap-3">
        <div className="skeleton" style={{ width: "60px", height: "16px", borderRadius: "4px" }}></div>
        <div className="skeleton" style={{ width: "80px", height: "16px", borderRadius: "4px" }}></div>
      </div>
      <div className="skeleton" style={{ width: "60px", height: "16px", borderRadius: "4px" }}></div>
    </div>
    
    <style jsx>{`
      .skeleton {
        background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
        background-size: 200% 100%;
        animation: loading 1.5s ease-in-out infinite;
      }
      
      @keyframes loading {
        0% {
          background-position: 200% 0;
        }
        100% {
          background-position: -200% 0;
        }
      }
    `}</style>
  </div>
)

export default function ProfilePage() {
  const { 
    user, 
    profile, 
    fetchUserProfile, 
    updateProfile,
    uploadProfileImage,
    api,
    isAuthenticated,
    loading: authLoading
  } = useAuth()
  
  const router = useRouter()
  const pathname = usePathname()

  const [activeTab, setActiveTab] = useState("overview")
  const [editMode, setEditMode] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [postsLoading, setPostsLoading] = useState(false)

  // Image upload states
  const [selectedImage, setSelectedImage] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [imageError, setImageError] = useState("")
  const [imageUploaded, setImageUploaded] = useState(false)
  
  // Ref for file input
  const fileInputRef = useRef(null)

  const [formData, setFormData] = useState({
    displayName: "",
    firstName: "",
    lastName: "",
    bio: "",
    phone: "",
    location: "",
    website: "",
    avatarUrl: "",
  })
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState("")

  // User stats
  const [userStats, setUserStats] = useState({
    totalPosts: 0,
    totalComments: 0,
    savedPosts: 0,
    likesReceived: 0,
    credibilityScore: 94,
    memberSince: "Jan 2023",
    published: 0,
    underReview: 0,
    rejected: 0,
  })

  // User posts data
  const [userPosts, setUserPosts] = useState([])
  
  // Recent comments data
  const [recentComments, setRecentComments] = useState([])

  // Check authentication - prevent logout on refresh
  useEffect(() => {
    if (isAuthenticated === false && !authLoading) {
      router.replace(`/auth/login?callbackUrl=${pathname}`)
    }
  }, [isAuthenticated, authLoading, router, pathname])

  // Initialize form data from user profile
  useEffect(() => {
    if (user || profile) {
      setFormData({
        displayName: user?.displayName || profile?.displayName || "",
        firstName: user?.firstName || profile?.firstName || "",
        lastName: user?.lastName || profile?.lastName || "",
        bio: user?.bio || profile?.bio || "",
        phone: user?.phone || profile?.phone || "",
        location: profile?.location || user?.location || "Not set",
        website: profile?.website || "",
        avatarUrl: profile?.avatarUrl || user?.avatarUrl || "",
      })
      
      // Set initial image preview from profile
      if (profile?.avatarUrl || user?.avatarUrl) {
        setImagePreview(profile?.avatarUrl || user?.avatarUrl);
      }
    }
  }, [user, profile])

  // Load user data
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserData()
    }
  }, [isAuthenticated, user])

  // Show loading while checking authentication
  if (authLoading || isAuthenticated === null) {
    return (
      <Container fluid className="py-5" style={{ background: "#f8fafc", minHeight: "100vh" }}>
        <Row className="justify-content-center">
          <Col md={8} className="text-center">
            <div className="py-5">
              <Spinner
                animation="border"
                variant="primary"
                style={{ width: "3rem", height: "3rem" }}
              />
              <p className="mt-4 text-muted fs-5">
                Loading your profile...
              </p>
            </div>
          </Col>
        </Row>
      </Container>
    )
  }

  // Load user posts and statistics
  const loadUserData = async () => {
    try {
      setPostsLoading(true)
      
      // Load user's posts
      const postsResponse = await api.posts.getMyPosts()
      
      // Handle different response structures
      let postsArray = []
      
      if (Array.isArray(postsResponse)) {
        postsArray = postsResponse
      } else if (postsResponse && postsResponse.data && Array.isArray(postsResponse.data)) {
        postsArray = postsResponse.data
      } else if (postsResponse && postsResponse.posts && Array.isArray(postsResponse.posts)) {
        postsArray = postsResponse.posts
      } else if (postsResponse && postsResponse.items && Array.isArray(postsResponse.items)) {
        postsArray = postsResponse.items
      }
      
      // Filter out deleted posts and sort by creation date
      const activePosts = postsArray.filter(post => post.status !== "DELETED")
      const sortedPosts = activePosts.sort((a, b) => 
        new Date(b.createdAt) - new Date(a.createdAt)
      )
      
      setUserPosts(sortedPosts)
      
      // Calculate statistics
      const stats = calculateUserStats(sortedPosts)
      setUserStats({
        totalPosts: activePosts.length,
        totalComments: recentComments.length,
        savedPosts: 0,
        likesReceived: calculateTotalLikes(sortedPosts),
        credibilityScore: profile?.credibilityScore || 94,
        memberSince: formatMemberSince(user?.createdAt),
        published: stats.published,
        underReview: stats.underReview,
        rejected: stats.rejected,
      })
      
      setRecentComments([])
      
    } catch (error) {
      console.error("Failed to load user data:", error)
      toast.error("Failed to load your posts")
    } finally {
      setPostsLoading(false)
    }
  }

  // Calculate user statistics from posts
  const calculateUserStats = (posts) => {
    const stats = {
      published: 0,
      underReview: 0,
      rejected: 0,
    }
    
    posts.forEach(post => {
      switch (post.status) {
        case "PUBLISHED":
          stats.published++
          break
        case "UNDER_REVIEW":
          stats.underReview++
          break
        case "REJECTED":
          stats.rejected++
          break
      }
    })
    
    return stats
  }

  // Calculate total likes from all posts
  const calculateTotalLikes = (posts) => {
    return posts.reduce((total, post) => {
      return total + (post.reactionCount || 0)
    }, 0)
  }

  // Format member since date
  const formatMemberSince = (dateString) => {
    if (!dateString) return "Jan 2023"
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
      })
    } catch (error) {
      return "Jan 2023"
    }
  }

  // Format post date
  const formatPostDate = (dateString) => {
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

  // Get post status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <Badge 
            bg="" 
            className="py-1 px-2 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: 'white',
              fontSize: '0.75rem'
            }}
          >
            <FaCheckCircle className="me-1" size={10} />
            Published
          </Badge>
        )
      case "UNDER_REVIEW":
        return (
          <Badge 
            bg="" 
            className="py-1 px-2 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: 'white',
              fontSize: '0.75rem'
            }}
          >
            <FaClock className="me-1" size={10} />
            Under Review
          </Badge>
        )
      case "REJECTED":
        return (
          <Badge 
            bg="" 
            className="py-1 px-2 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: 'white',
              fontSize: '0.75rem'
            }}
          >
            <FaTimesCircle className="me-1" size={10} />
            Rejected
          </Badge>
        )
      default:
        return (
          <Badge 
            bg="" 
            className="py-1 px-2 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
              color: 'white',
              fontSize: '0.75rem'
            }}
          >
            {status}
          </Badge>
        )
    }
  }

  // Get post type badge
  const getTypeBadge = (post) => {
    const { postType, isCompanyPost } = post
    
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
    
    return (
      <div className="d-flex flex-column gap-1">
        <Badge 
          bg="" 
          className="py-1 px-2 rounded-pill border-0 d-flex align-items-center gap-1 fw-medium"
          style={{ 
            background: gradient,
            color: 'white',
            fontSize: '0.75rem',
            width: 'fit-content'
          }}
        >
          <Icon size={10} />
          {postType === "SCAM_REPORT" ? "Scam Report" : 
           postType === "SCAM_AWARENESS" ? "Awareness" : 
           postType === "QUESTION" ? "Question" : postType}
        </Badge>
        
        {isCompanyPost && (
          <Badge 
            bg="" 
            className="py-1 px-2 rounded-pill align-self-start border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
              color: 'white',
              fontSize: '0.7rem'
            }}
          >
            <FaBuilding size={8} />
            Company
          </Badge>
        )}
      </div>
    )
  }

  // Handle image selection via click on profile picture
  const handleProfileImageClick = () => {
    fileInputRef.current?.click()
  }

  // Handle image file selection
  const handleImageSelect = async (event) => {
    const file = event.target.files[0]
    setImageError("")
    setImageUploaded(false)

    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setImageError("Image size should be less than 5MB")
        return
      }

      // Check file type
      const validTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"]
      if (!validTypes.includes(file.type)) {
        setImageError("Please select a valid image (JPEG, PNG, GIF, WebP)")
        return
      }

      // Create preview URL
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result)
      }
      reader.readAsDataURL(file)

      // Auto-upload the image
      await handleUploadImage(file)
    }
  }

  // Upload image automatically after selection
  const handleUploadImage = async (file = null) => {
    const imageToUpload = file || selectedImage
    if (!imageToUpload) {
      setImageError("Please select an image first")
      return
    }

    try {
      setUploadingImage(true)
      setImageError("")
      
      const uploadResult = await uploadProfileImage(imageToUpload)
      
      if (uploadResult.success) {
        setSelectedImage(imageToUpload)
        setImageUploaded(true)
        setFormData(prev => ({
          ...prev,
          avatarUrl: uploadResult.imageUrl
        }))
        toast.success("Image uploaded successfully!")
      } else {
        throw new Error(uploadResult.error || "Failed to upload image")
      }
    } catch (error) {
      console.error("Upload image error:", error)
      setImageError(error.message || "Failed to upload image")
    } finally {
      setUploadingImage(false)
    }
  }

  // Remove selected image
  const handleRemoveImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
    setImageError("")
    setImageUploaded(false)

    // Reset to original avatar if exists
    if (profile?.avatarUrl) {
      setImagePreview(profile.avatarUrl)
      setFormData(prev => ({
        ...prev,
        avatarUrl: profile.avatarUrl
      }))
    } else {
      setImagePreview(null)
      setFormData(prev => ({
        ...prev,
        avatarUrl: ""
      }))
    }
  }

  // Handle edit profile
  const handleEditProfile = () => {
    setEditMode(true)
    setShowEditModal(true)
  }

  // Handle save profile
  const handleSaveProfile = async () => {
    setLoading(true)
    setErrors({})
    setImageError("")

    try {
      // Prepare profile data
      const profileUpdateData = {
        displayName: formData.displayName,
        firstName: formData.firstName,
        lastName: formData.lastName,
        bio: formData.bio,
        phone: formData.phone,
        location: formData.location,
        website: formData.website,
        ...(formData.avatarUrl && { avatarUrl: formData.avatarUrl }),
      }

      console.log("Saving profile with data:", profileUpdateData)

      // Remove empty fields
      Object.keys(profileUpdateData).forEach(key => {
        if (profileUpdateData[key] === null || profileUpdateData[key] === undefined || profileUpdateData[key] === '') {
          delete profileUpdateData[key];
        }
      });

      // Use updateProfile instead of updateUserProfile
      const result = await updateProfile(profileUpdateData)
      
      if (result.success) {
        setSuccessMessage("Profile updated successfully!")
        setSelectedImage(null)
        setImageUploaded(false)
        setEditMode(false)
        setShowEditModal(false)

        // Refresh profile data
        await fetchUserProfile(true)

        setTimeout(() => setSuccessMessage(""), 3000)
      } else {
        setErrors({ submit: result.error })
      }
    } catch (error) {
      console.error("Save profile error:", error)
      setErrors({ 
        submit: error.message || "Failed to update profile. Please try again." 
      })
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const getInitials = () => {
    if (user?.displayName) {
      return user.displayName.charAt(0).toUpperCase()
    }
    if (user?.firstName && user?.lastName) {
      return (user.firstName.charAt(0) + user.lastName.charAt(0)).toUpperCase()
    }
    return "U"
  }

  const getDisplayName = () => {
    if (user?.displayName) return user.displayName
    if (user?.firstName && user?.lastName) return `${user.firstName} ${user.lastName}`
    if (user?.email) return user.email.split("@")[0]
    return "User"
  }

  // Handle post click
  const handlePostClick = (postId) => {
    router.push(`/dashboard/posts/view/${postId}`)
  }

  // Handle edit post
  const handleEditPost = (post) => {
    if (post.status === "DELETED") {
      toast.warning("This post has been deleted and cannot be edited.")
      return
    }
    
    if (post.status === "PUBLISHED") {
      toast.warning("Published posts cannot be edited.")
      return
    }
    
    router.push(`/dashboard/posts/edit/${post.id}`)
  }

  // Refresh posts
  const handleRefreshPosts = () => {
    loadUserData()
  }

  return (
    <Container fluid className="py-4" style={{ background: "#f8fafc", minHeight: "100vh" }}>
      {/* Back Button */}
      <Row className="mb-4">
        <Col>
          <Link
            href="/dashboard"
            className="text-decoration-none d-inline-flex align-items-center gap-2 fw-medium"
            style={{
              color: "#64748b",
              transition: "all 0.3s ease",
              padding: "8px 16px",
              borderRadius: "8px",
              background: "white",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "#475569";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.12)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "#64748b";
              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.08)";
            }}
          >
            <FaArrowLeft />
            <span>Back to Dashboard</span>
          </Link>
        </Col>
      </Row>

      {/* Success Message */}
      {successMessage && (
        <Row className="mb-3">
          <Col>
            <Alert
              variant="success"
              dismissible
              onClose={() => setSuccessMessage("")}
              className="border-0 rounded-3 shadow-sm"
              style={{
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                color: "white",
                padding: "16px 20px",
              }}
            >
              <FaCheckCircle className="me-2" />
              {successMessage}
            </Alert>
          </Col>
        </Row>
      )}

      {/* Main Profile Section */}
      <Row className="g-4">
        {/* Left Column - Profile Info */}
        <Col lg={4}>
          {/* Profile Card */}
          <Card className="border-0 shadow-sm rounded-3">
            <Card.Body className="p-4">
              <div className="text-center mb-4">
                {/* Profile Avatar */}
                <div className="position-relative d-inline-block mb-3">
                  <div
                    className="rounded-circle"
                    style={{
                      width: "120px",
                      height: "120px",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "2.5rem",
                      fontWeight: "bold",
                      color: "white",
                      border: "4px solid white",
                      boxShadow: "0 4px 20px rgba(102, 126, 234, 0.2)",
                      overflow: "hidden",
                    }}
                  >
                    {uploadingImage ? (
                      <div className="d-flex align-items-center justify-content-center h-100">
                        <Spinner animation="border" size="sm" variant="light" />
                      </div>
                    ) : imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Preview"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : profile?.avatarUrl ? (
                      <img
                        src={profile.avatarUrl}
                        alt={getDisplayName()}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <span>{getInitials()}</span>
                    )}
                  </div>

                  {/* Upload button */}
                  <label
                    htmlFor="avatar-upload"
                    style={{
                      position: "absolute",
                      bottom: "5px",
                      right: "5px",
                      width: "36px",
                      height: "36px",
                      background: "#667eea",
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      border: "3px solid white",
                      boxShadow: "0 2px 8px rgba(102, 126, 234, 0.3)",
                      transition: "all 0.3s ease",
                      color: "white",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "scale(1.1)";
                      e.currentTarget.style.background = "#764ba2";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                      e.currentTarget.style.background = "#667eea";
                    }}
                  >
                    {uploadingImage ? <Spinner animation="border" size="sm" /> : <FaCamera size={14} />}
                  </label>

                  {/* Hidden file input */}
                  <input
                    type="file"
                    id="avatar-upload"
                    accept="image/*"
                    onChange={handleImageSelect}
                    style={{ display: "none" }}
                    disabled={uploadingImage}
                  />
                </div>

                <h4 className="fw-bold mb-2" style={{ color: "#1e293b" }}>
                  {getDisplayName()}
                </h4>
                <p className="text-muted mb-0">@{user?.email?.split('@')[0] || 'username'}</p>
              </div>

              {/* Member Since */}
              <div className="d-flex align-items-center justify-content-center gap-2 text-muted mb-4">
                <FaCalendarAlt size={14} />
                <span>Member Since: {userStats.memberSince}</span>
              </div>

              {/* Profile Completion */}
              <Card className="border-0 shadow-sm rounded-3 mb-4">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-semibold mb-0" style={{ color: "#475569", fontSize: "0.9rem" }}>
                      Profile Completion
                    </h6>
                    <span className="fw-bold" style={{ color: "#667eea" }}>60%</span>
                  </div>
                  <ProgressBar
                    now={60}
                    className="mb-2"
                    style={{
                      height: "6px",
                      borderRadius: "3px",
                      background: "rgba(102, 126, 234, 0.1)",
                    }}
                  />
                  <small className="text-muted">Add bio, location, and profile picture to complete your profile</small>
                </Card.Body>
              </Card>

              {/* Enhanced Stats Grid */}
              <Card className="border-0 shadow-sm rounded-3 mb-4">
                <Card.Body className="p-4">
                  <h6 className="fw-semibold mb-3" style={{ color: "#475569" }}>Profile Stats</h6>
                  <Row className="g-3">
                    <Col xs={6} md={3}>
                      <div className="text-center p-3 rounded-3" style={{ background: "rgba(102, 126, 234, 0.08)" }}>
                        <div className="fw-bold fs-3 mb-1" style={{ color: "#667eea" }}>
                          {userStats.totalPosts}
                        </div>
                        <div className="text-muted small">Posts</div>
                      </div>
                    </Col>
                    <Col xs={6} md={3}>
                      <div className="text-center p-3 rounded-3" style={{ background: "rgba(16, 185, 129, 0.08)" }}>
                        <div className="fw-bold fs-3 mb-1" style={{ color: "#10b981" }}>
                          {userStats.likesReceived}
                        </div>
                        <div className="text-muted small">Likes</div>
                      </div>
                    </Col>
                    <Col xs={6} md={3}>
                      <div className="text-center p-3 rounded-3" style={{ background: "rgba(245, 158, 11, 0.08)" }}>
                        <div className="fw-bold fs-3 mb-1" style={{ color: "#f59e0b" }}>
                          {userStats.totalComments}
                        </div>
                        <div className="text-muted small">Comments</div>
                      </div>
                    </Col>
                    <Col xs={6} md={3}>
                      <div className="text-center p-3 rounded-3" style={{ background: "rgba(236, 72, 153, 0.08)" }}>
                        <div className="fw-bold fs-3 mb-1" style={{ color: "#ec4899" }}>
                          {userStats.savedPosts}
                        </div>
                        <div className="text-muted small">Saved</div>
                      </div>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>

              {/* Bio */}
              {formData.bio && (
                <div className="mb-4">
                  <h6 className="fw-semibold mb-2" style={{ color: "#475569" }}>About</h6>
                  <p className="text-muted mb-0" style={{ fontSize: "0.9rem", lineHeight: "1.6" }}>
                    {formData.bio}
                  </p>
                </div>
              )}

              {/* Contact Info */}
              <div className="mb-4">
                <h6 className="fw-semibold mb-3" style={{ color: "#475569" }}>Contact Information</h6>
                <div className="d-flex flex-column gap-2">
                  {user?.email && (
                    <div className="d-flex align-items-center gap-2">
                      <FaEnvelope className="text-muted" size={14} />
                      <span className="text-muted small">{user.email}</span>
                    </div>
                  )}
                  {formData.phone && (
                    <div className="d-flex align-items-center gap-2">
                      <FaPhone className="text-muted" size={14} />
                      <span className="text-muted small">{formData.phone}</span>
                    </div>
                  )}
                  {formData.location && (
                    <div className="d-flex align-items-center gap-2">
                      <FaMapMarkerAlt className="text-muted" size={14} />
                      <span className="text-muted small">{formData.location}</span>
                    </div>
                  )}
                  {formData.website && (
                    <div className="d-flex align-items-center gap-2">
                      <FaGlobe className="text-muted" size={14} />
                      <a 
                        href={formData.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-decoration-none small"
                        style={{ color: "#667eea" }}
                      >
                        {formData.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <Card className="border-0 shadow-sm rounded-3 mb-4">
                <Card.Body className="p-4">
                  <h6 className="fw-semibold mb-3" style={{ color: "#475569" }}>Quick Actions</h6>
                  <div className="row g-2">
                    <div className="col-6">
                      <Button
                        variant="outline-primary"
                        className="w-100 py-3 rounded-3 d-flex flex-column align-items-center justify-content-center"
                        style={{ 
                          borderColor: "#e2e8f0",
                          background: "rgba(102, 126, 234, 0.05)",
                          color: "#667eea",
                          height: "90px"
                        }}
                        onClick={() => router.push("/report")}
                      >
                        <FaEdit size={20} className="mb-2" />
                        <span className="small fw-medium">New Post</span>
                      </Button>
                    </div>
                    <div className="col-6">
                      <Button
                        variant="outline-success"
                        className="w-100 py-3 rounded-3 d-flex flex-column align-items-center justify-content-center"
                        style={{ 
                          borderColor: "#e2e8f0",
                          background: "rgba(16, 185, 129, 0.05)",
                          color: "#10b981",
                          height: "90px"
                        }}
                        onClick={() => setActiveTab("posts")}
                      >
                        <FaHistory size={20} className="mb-2" />
                        <span className="small fw-medium">View Activity</span>
                      </Button>
                    </div>
                  </div>
                </Card.Body>
              </Card>

              {/* Action Buttons */}
              <div className="d-flex flex-column gap-2">
                <Button
                  variant="primary"
                  onClick={handleEditProfile}
                  className="w-100 py-2 rounded-3 border-0 fw-medium"
                  style={{ 
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                  }}
                >
                  <FaEdit className="me-2" />
                  Edit Profile
                </Button>
                <Button
                  variant="outline-primary"
                  className="w-100 py-2 rounded-3 fw-medium"
                  style={{ 
                    borderColor: "#667eea",
                    color: "#667eea"
                  }}
                  onClick={handleRefreshPosts}
                  disabled={postsLoading}
                >
                  {postsLoading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <FaHistory className="me-2" />
                      Refresh Posts
                    </>
                  )}
                </Button>
              </div>
            </Card.Body>
          </Card>

          {/* Credibility Score Card */}
          <Card className="border-0 shadow-sm rounded-3 mt-4">
            <Card.Body className="p-4">
              <h6 className="fw-semibold mb-3" style={{ color: "#475569" }}>Credibility Score</h6>
              <div className="text-center mb-3">
                <div 
                  className="rounded-circle d-inline-flex align-items-center justify-content-center"
                  style={{
                    width: "80px",
                    height: "80px",
                    background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                    color: "white",
                    fontWeight: "bold",
                    fontSize: "1.5rem"
                  }}
                >
                  {userStats.credibilityScore}%
                </div>
              </div>
              <ProgressBar
                now={userStats.credibilityScore}
                className="mb-2"
                style={{
                  height: "8px",
                  borderRadius: "4px",
                  background: "rgba(16, 185, 129, 0.2)",
                }}
              />
              <div className="text-center">
                <small className="text-muted">Based on report accuracy and community feedback</small>
              </div>
            </Card.Body>
          </Card>

          {/* Post Statistics Card */}
          <Card className="border-0 shadow-sm rounded-3 mt-4">
            <Card.Body className="p-4">
              <h6 className="fw-semibold mb-3" style={{ color: "#475569" }}>Post Statistics</h6>
              <div className="d-flex flex-column gap-2">
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted small">Published</span>
                  <Badge className="px-2 py-1" style={{ background: "#10B981", color: "white" }}>
                    {userStats.published}
                  </Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted small">Under Review</span>
                  <Badge className="px-2 py-1" style={{ background: "#F59E0B", color: "white" }}>
                    {userStats.underReview}
                  </Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted small">Rejected</span>
                  <Badge className="px-2 py-1" style={{ background: "#DC2626", color: "white" }}>
                    {userStats.rejected}
                  </Badge>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="text-muted small">Total Likes</span>
                  <Badge className="px-2 py-1" style={{ background: "#667eea", color: "white" }}>
                    {userStats.likesReceived}
                  </Badge>
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>

        {/* Right Column - Main Content */}
        <Col lg={8}>
          {/* Tabs Navigation */}
          <Card className="border-0 shadow-sm mb-4 rounded-3">
            <Card.Body className="p-3">
              <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
                <Nav variant="pills" className="profile-tabs" style={{ gap: "4px" }}>
                  {[
                    { key: "overview", label: "Overview", icon: FaChartLine, count: null },
                    { key: "posts", label: "Posts", icon: FaFileAlt, count: userPosts.length },
                    { key: "activity", label: "Activity", icon: FaHistory, count: recentComments.length + userPosts.length },
                    { key: "security", label: "Security", icon: FaLock, count: null },
                  ].map((tab) => (
                    <Nav.Item key={tab.key}>
                      <Nav.Link
                        eventKey={tab.key}
                        style={{
                          borderRadius: "8px",
                          padding: "10px 16px",
                          fontWeight: "500",
                          fontSize: "0.875rem",
                          transition: "all 0.3s ease",
                          border: "none",
                          background:
                            activeTab === tab.key ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" : "transparent",
                          color: activeTab === tab.key ? "white" : "#64748b",
                        }}
                      >
                        <tab.icon className="me-2" size={14} />
                        {tab.label}
                        {tab.count !== null && (
                          <Badge
                            pill
                            className="ms-2"
                            style={{
                              background: activeTab === tab.key 
                                ? "rgba(255, 255, 255, 0.3)" 
                                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                              color: "white",
                              fontSize: "0.7rem",
                              padding: "2px 8px",
                              minWidth: "24px",
                              textAlign: "center",
                              fontWeight: "600",
                              boxShadow: activeTab === tab.key ? "none" : "0 1px 3px rgba(102, 126, 234, 0.3)",
                            }}
                          >
                            {tab.count}
                          </Badge>
                        )}
                      </Nav.Link>
                    </Nav.Item>
                  ))}
                </Nav>
              </Tab.Container>
            </Card.Body>
          </Card>

          {/* Tab Content */}
          <Tab.Content>
            {/* Overview Tab */}
            {activeTab === "overview" && (
              <>
                {/* Engagement Stats */}
                <Row className="mb-4">
                  <Col md={6}>
                    <Card className="border-0 shadow-sm h-100 rounded-3">
                      <Card.Body className="p-4">
                        <h6 className="fw-semibold mb-3" style={{ color: "#475569" }}>Engagement</h6>
                        <div className="d-flex flex-column gap-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-2">
                              <div className="p-2 rounded-3" style={{ background: "rgba(102, 126, 234, 0.1)" }}>
                                <FaThumbsUp className="text-primary" size={16} />
                              </div>
                              <span className="fw-medium" style={{ color: "#475569" }}>Likes Received</span>
                            </div>
                            <span className="fw-bold" style={{ color: "#667eea", fontSize: "1.25rem" }}>
                              {userStats.likesReceived}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-2">
                              <div className="p-2 rounded-3" style={{ background: "rgba(16, 185, 129, 0.1)" }}>
                                <FaComments className="text-success" size={16} />
                              </div>
                              <span className="fw-medium" style={{ color: "#475569" }}>Comments Made</span>
                            </div>
                            <span className="fw-bold" style={{ color: "#10b981", fontSize: "1.25rem" }}>
                              {userStats.totalComments}
                            </span>
                          </div>
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-2">
                              <div className="p-2 rounded-3" style={{ background: "rgba(245, 158, 11, 0.1)" }}>
                                <FaBookmark className="text-warning" size={16} />
                              </div>
                              <span className="fw-medium" style={{ color: "#475569" }}>Posts Saved</span>
                            </div>
                            <span className="fw-bold" style={{ color: "#f59e0b", fontSize: "1.25rem" }}>
                              {userStats.savedPosts}
                            </span>
                          </div>
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                  <Col md={6}>
                    <Card className="border-0 shadow-sm h-100 rounded-3">
                      <Card.Body className="p-4">
                        <h6 className="fw-semibold mb-3" style={{ color: "#475569" }}>Recent Achievements</h6>
                        <div className="d-flex flex-column gap-3">
                          {[
                            { icon: FaAward, title: "Top Contributor", description: "Active community member", color: "#f59e0b" },
                            { icon: FaShieldAlt, title: "Verified Reporter", description: "High accuracy reports", color: "#10b981" },
                            { icon: FaStar, title: "Helpful Member", description: "50+ helpful contributions", color: "#667eea" },
                          ].map((achievement, index) => (
                            <div key={index} className="d-flex align-items-center gap-3 p-2 rounded-3" style={{ background: "rgba(241, 245, 249, 0.5)" }}>
                              <div className="p-2 rounded-3" style={{ background: `${achievement.color}15` }}>
                                <achievement.icon style={{ color: achievement.color }} size={18} />
                              </div>
                              <div>
                                <div className="fw-medium" style={{ color: "#1e293b", fontSize: "0.9rem" }}>
                                  {achievement.title}
                                </div>
                                <div className="text-muted small">{achievement.description}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>

                {/* Recent Posts Preview */}
                <Card className="border-0 shadow-sm rounded-3">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                      <h6 className="fw-semibold mb-0" style={{ color: "#475569" }}>Recent Posts</h6>
                      <Button
                        variant="link"
                        onClick={() => setActiveTab("posts")}
                        className="text-decoration-none p-0 fw-medium"
                        style={{ color: "#667eea" }}
                      >
                        View All
                      </Button>
                    </div>
                    
                    {postsLoading ? (
                      <div className="d-flex flex-column gap-3">
                        {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
                      </div>
                    ) : userPosts.slice(0, 3).length === 0 ? (
                      <div className="text-center py-5">
                        <div className="mb-4">
                          <div 
                            className="mx-auto d-flex align-items-center justify-content-center rounded-circle mb-3"
                            style={{
                              width: "80px",
                              height: "80px",
                              background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
                              color: "#667eea",
                              fontSize: "2rem"
                            }}
                          >
                            <FaFileAlt />
                          </div>
                        </div>
                        <h5 className="fw-semibold mb-3" style={{ color: "#475569" }}>No posts yet</h5>
                        <p className="text-muted mb-4">Start by sharing your first scam report or awareness post</p>
                        <div className="d-flex gap-3 justify-content-center">
                          <Button
                            variant="outline-primary"
                            onClick={() => router.push("/report")}
                            className="rounded-3 fw-medium px-4 py-2"
                            style={{ 
                              borderColor: "#667eea",
                              color: "#667eea"
                            }}
                          >
                            How to Write a Good Report
                          </Button>
                          <Button
                            variant="primary"
                            onClick={() => router.push("/report")}
                            className="rounded-3 fw-medium px-4 py-2 border-0"
                            style={{ 
                              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                            }}
                          >
                            <FaEdit className="me-2" />
                            Create First Post
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {userPosts.slice(0, 3).map((post) => (
                          <div 
                            key={post.id}
                            className="p-4 rounded-3 border-0"
                            style={{ 
                              background: "white",
                              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.08)",
                              transition: "all 0.3s ease",
                              cursor: "pointer",
                              borderLeft: `4px solid ${post.postType === "SCAM_REPORT" ? "#dc2626" : 
                                          post.postType === "SCAM_AWARENESS" ? "#f59e0b" : 
                                          "#3b82f6"}`
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.boxShadow = "0 4px 20px rgba(0, 0, 0, 0.12)";
                              e.currentTarget.style.transform = "translateY(-2px)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.boxShadow = "0 1px 3px rgba(0, 0, 0, 0.08)";
                              e.currentTarget.style.transform = "translateY(0)";
                            }}
                            onClick={() => handlePostClick(post.id)}
                          >
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <div className="d-flex align-items-center gap-2">
                                {getTypeBadge(post)}
                                {getStatusBadge(post.status)}
                              </div>
                              <small className="text-muted">{formatPostDate(post.createdAt)}</small>
                            </div>
                            
                            <h6 className="fw-semibold mb-2" style={{ color: "#1e293b" }}>
                              {post.title || "Untitled Post"}
                            </h6>
                            
                            {post.description && (
                              <p className="text-muted mb-3" style={{ fontSize: "0.875rem", lineHeight: "1.6" }}>
                                {post.description.substring(0, 120)}...
                              </p>
                            )}
                            
                            <div className="d-flex align-items-center justify-content-between">
                              <div className="d-flex align-items-center gap-3 text-muted small">
                                <span className="d-flex align-items-center gap-1">
                                  <FaThumbsUp size={12} />
                                  {post.reactionCount || 0} likes
                                </span>
                                <span className="d-flex align-items-center gap-1">
                                  <FaComments size={12} />
                                  {post.commentCount || 0} comments
                                </span>
                              </div>
                              <Button
                                variant="link"
                                className="p-0 text-decoration-none fw-medium"
                                style={{ color: "#667eea", fontSize: "0.875rem" }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePostClick(post.id);
                                }}
                              >
                                Read More →
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </Card.Body>
                </Card>
              </>
            )}

            {/* Posts Tab */}
            {activeTab === "posts" && (
              <Card className="border-0 shadow-sm rounded-3">
                <Card.Body className="p-4">
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h6 className="fw-semibold mb-0" style={{ color: "#475569" }}>
                      All Posts ({userPosts.length})
                    </h6>
                    <div className="d-flex gap-2">
                      <Button
                        variant="outline-primary"
                        onClick={handleRefreshPosts}
                        disabled={postsLoading}
                        className="rounded-3 fw-medium px-3 py-2"
                        style={{ 
                          borderColor: "#667eea",
                          color: "#667eea"
                        }}
                      >
                        {postsLoading ? (
                          <Spinner animation="border" size="sm" />
                        ) : (
                          <FaHistory className="me-2" />
                        )}
                        Refresh
                      </Button>
                      <Button
                        variant="primary"
                        onClick={() => router.push("/report")}
                        className="rounded-3 fw-medium px-3 py-2 border-0"
                        style={{ 
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        }}
                      >
                        <FaEdit className="me-2" />
                        Create New Post
                      </Button>
                    </div>
                  </div>
                  
                  {postsLoading ? (
                    <div className="d-flex flex-column gap-3">
                      {[1, 2, 3].map(i => <PostSkeleton key={i} />)}
                    </div>
                  ) : userPosts.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="mb-4">
                        <div 
                          className="mx-auto d-flex align-items-center justify-content-center rounded-circle mb-3"
                          style={{
                            width: "80px",
                            height: "80px",
                            background: "linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)",
                            color: "#667eea",
                            fontSize: "2rem"
                          }}
                        >
                          <FaFileAlt />
                        </div>
                      </div>
                      <h5 className="fw-semibold mb-3" style={{ color: "#475569" }}>No posts yet</h5>
                      <p className="text-muted mb-4">Start by creating your first post</p>
                      <Button
                        variant="primary"
                        onClick={() => router.push("/report")}
                        className="rounded-3 fw-medium px-4 py-3 border-0"
                        style={{ 
                          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                        }}
                      >
                        <FaEdit className="me-2" />
                        Create First Post
                      </Button>
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {userPosts.map((post) => (
                        <Card key={post.id} className="border-0 shadow-sm rounded-3">
                          <Card.Body className="p-4">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <div className="d-flex align-items-center gap-2">
                                {getTypeBadge(post)}
                                {getStatusBadge(post.status)}
                              </div>
                              <small className="text-muted">{formatPostDate(post.createdAt)}</small>
                            </div>
                            
                            <h6 className="fw-semibold mb-3" style={{ color: "#1e293b" }}>
                              {post.title || "Untitled Post"}
                            </h6>
                            
                            {post.description && (
                              <p className="text-muted mb-3 small">
                                {post.description.substring(0, 150)}...
                              </p>
                            )}
                            
                            <div className="d-flex justify-content-between align-items-center">
                              <div className="d-flex align-items-center gap-3 text-muted">
                                <span className="d-flex align-items-center gap-1">
                                  <FaThumbsUp size={14} />
                                  {post.reactionCount || 0}
                                </span>
                                <span className="d-flex align-items-center gap-1">
                                  <FaComments size={14} />
                                  {post.commentCount || 0}
                                </span>
                              </div>
                              <div className="d-flex gap-2">
                                <Button
                                  variant="outline-primary"
                                  size="sm"
                                  className="rounded-3 border-0 fw-medium"
                                  style={{ 
                                    background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
                                    border: "1px solid #e2e8f0",
                                    color: "#667eea"
                                  }}
                                  onClick={() => handlePostClick(post.id)}
                                >
                                  <FaEye className="me-1" size={12} />
                                  View
                                </Button>
                                {(post.status === "UNDER_REVIEW" || post.status === "DRAFT") && (
                                  <Button
                                    variant="outline-secondary"
                                    size="sm"
                                    className="rounded-3 border-0 fw-medium"
                                    style={{ 
                                      background: "linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)",
                                      border: "1px solid #e2e8f0",
                                      color: "#64748b"
                                    }}
                                    onClick={() => handleEditPost(post)}
                                  >
                                    <FaEdit className="me-1" size={12} />
                                    Edit
                                  </Button>
                                )}
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            )}

            {/* Activity Tab */}
            {activeTab === "activity" && (
              <Card className="border-0 shadow-sm rounded-3">
                <Card.Body className="p-4">
                  <h6 className="fw-semibold mb-4" style={{ color: "#475569" }}>Recent Activity</h6>
                  <div className="d-flex flex-column gap-3">
                    {userPosts.slice(0, 5).map((post) => (
                      <div 
                        key={post.id}
                        className="p-3 rounded-3 border"
                        style={{ 
                          borderColor: "#e2e8f0",
                          background: "white",
                          transition: "all 0.3s ease",
                          cursor: "pointer"
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = "#cbd5e1";
                          e.currentTarget.style.background = "#f8fafc";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = "#e2e8f0";
                          e.currentTarget.style.background = "white";
                        }}
                        onClick={() => handlePostClick(post.id)}
                      >
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center gap-3">
                            <div className="p-2 rounded-3" style={{ background: "rgba(102, 126, 234, 0.1)" }}>
                              <FaFileAlt className="text-primary" />
                            </div>
                            <div>
                              <div className="fw-medium" style={{ color: "#1e293b" }}>
                                {post.title || "Untitled Post"}
                              </div>
                              <div className="text-muted small">{formatPostDate(post.createdAt)}</div>
                            </div>
                          </div>
                          {getStatusBadge(post.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}

            {/* Security Tab */}
            {activeTab === "security" && (
              <Card className="border-0 shadow-sm rounded-3">
                <Card.Body className="p-4">
                  <h6 className="fw-semibold mb-4" style={{ color: "#475569" }}>Security Settings</h6>
                  <div className="d-flex flex-column gap-3">
                    <div className="p-3 rounded-3 border" style={{ borderColor: "#e2e8f0" }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-3">
                          <div className="p-2 rounded-3" style={{ background: "rgba(102, 126, 234, 0.1)" }}>
                            <FaLock className="text-primary" />
                          </div>
                          <div>
                            <div className="fw-medium" style={{ color: "#1e293b" }}>Password</div>
                            <div className="text-muted small">Last changed 30 days ago</div>
                          </div>
                        </div>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          className="rounded-3 fw-medium px-3 py-2"
                          style={{ 
                            borderColor: "#667eea",
                            color: "#667eea"
                          }}
                          onClick={() => router.push('/auth/change-password')}
                        >
                          Change Password
                        </Button>
                      </div>
                    </div>

                    <div className="p-3 rounded-3 border" style={{ borderColor: "#e2e8f0" }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-3">
                          <div className="p-2 rounded-3" style={{ background: "rgba(245, 158, 11, 0.1)" }}>
                            <FaBell className="text-warning" />
                          </div>
                          <div>
                            <div className="fw-medium" style={{ color: "#1e293b" }}>Login Alerts</div>
                            <div className="text-muted small">Get notified for new logins</div>
                          </div>
                        </div>
                        <Form.Check type="switch" defaultChecked />
                      </div>
                    </div>

                    <div className="p-3 rounded-3 border" style={{ borderColor: "#e2e8f0" }}>
                      <div className="d-flex align-items-center justify-content-between mb-2">
                        <div className="d-flex align-items-center gap-3">
                          <div className="p-2 rounded-3" style={{ background: "rgba(16, 185, 129, 0.1)" }}>
                            <FaShieldAlt className="text-success" />
                          </div>
                          <div>
                            <div className="fw-medium" style={{ color: "#1e293b" }}>Two-Factor Authentication</div>
                            <div className="text-muted small">Add extra security to your account</div>
                          </div>
                        </div>
                        <Button
                          variant="outline-success"
                          size="sm"
                          className="rounded-3 fw-medium px-3 py-2"
                          style={{ 
                            borderColor: "#10b981",
                            color: "#10b981"
                          }}
                        >
                          Enable 2FA
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )}
          </Tab.Content>
        </Col>
      </Row>

      {/* Edit Profile Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg" centered>
        <Modal.Header
          closeButton
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            padding: "20px 24px",
          }}
        >
          <Modal.Title className="fw-bold" style={{ display: "flex", alignItems: "center" }}>
            <FaEdit className="me-2" />
            Edit Profile
          </Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: "30px" }}>
          {imageError && (
            <Alert
              variant="danger"
              className="mb-3 rounded-3"
              style={{
                background: "rgba(220, 38, 38, 0.1)",
                color: "#dc2626",
                border: "none",
              }}
            >
              {imageError}
            </Alert>
          )}

          {errors.submit && (
            <Alert
              variant="danger"
              className="mb-3 rounded-3"
              style={{
                background: "rgba(220, 38, 38, 0.1)",
                color: "#dc2626",
                border: "none",
              }}
            >
              {errors.submit}
            </Alert>
          )}

          {/* Profile Picture Section - Clickable to upload */}
          <div className="text-center mb-4">
            <div 
              className="position-relative d-inline-block"
              style={{ cursor: "pointer" }}
              onClick={handleProfileImageClick}
            >
              <div
                style={{
                  width: "140px",
                  height: "140px",
                  borderRadius: "50%",
                  overflow: "hidden",
                  border: "5px solid #667eea",
                  boxShadow: "0 8px 24px rgba(102, 126, 234, 0.3)",
                  position: "relative",
                  background: "#f8fafc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                {uploadingImage ? (
                  <div className="d-flex align-items-center justify-content-center h-100">
                    <Spinner animation="border" variant="primary" />
                  </div>
                ) : imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Profile Preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : profile?.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={getDisplayName()}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div 
                    style={{
                      width: "100%",
                      height: "100%",
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                      fontSize: "2.5rem",
                      fontWeight: "bold"
                    }}
                  >
                    {getInitials()}
                  </div>
                )}
                
                {/* Camera overlay */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    background: "rgba(0, 0, 0, 0.5)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    opacity: 0,
                    transition: "opacity 0.3s ease",
                    borderRadius: "50%"
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0";
                  }}
                >
                  <FaCamera size={32} color="white" />
                </div>
              </div>

              {/* Camera icon */}
              <div
                style={{
                  position: "absolute",
                  bottom: "10px",
                  right: "10px",
                  width: "44px",
                  height: "44px",
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "white",
                  border: "4px solid white",
                  boxShadow: "0 4px 12px rgba(102, 126, 234, 0.5)",
                  cursor: "pointer",
                  zIndex: 10
                }}
              >
                <FaCamera size={18} />
              </div>

              {/* Upload status badges */}
              {selectedImage && !imageUploaded && (
                <Badge
                  bg="warning"
                  className="position-absolute"
                  style={{
                    top: "10px",
                    right: "10px",
                    transform: "translate(30%, -30%)",
                    fontSize: "0.7rem",
                    padding: "4px 8px",
                    zIndex: 10
                  }}
                >
                  Click to Upload
                </Badge>
              )}
              {imageUploaded && (
                <Badge
                  bg="success"
                  className="position-absolute"
                  style={{
                    top: "10px",
                    left: "10px",
                    transform: "translate(-30%, -30%)",
                    fontSize: "0.7rem",
                    padding: "4px 8px",
                    zIndex: 10
                  }}
                >
                  <FaCheckCircle className="me-1" />
                  Uploaded
                </Badge>
              )}
            </div>
            
            {/* Hidden file input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleImageSelect}
              style={{ display: "none" }}
              disabled={uploadingImage}
            />
            
            <div className="mt-3">
              <p className="text-muted mb-2" style={{ fontSize: "0.875rem" }}>
                Click the profile picture to select and upload a new image
              </p>
              <div className="d-flex justify-content-center gap-2 align-items-center">
                <small className="text-muted">
                  Accepted: JPEG, PNG, GIF, WebP • Max size: 5MB
                </small>
              </div>
            </div>
          </div>

          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold" style={{ color: "#374151" }}>
                    Display Name
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="displayName"
                    value={formData.displayName}
                    onChange={handleInputChange}
                    placeholder="Enter display name"
                    className="rounded-3"
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "10px 14px",
                      fontSize: "0.9rem",
                    }}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold" style={{ color: "#374151" }}>
                    Phone
                  </Form.Label>
                  <Form.Control
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter phone number"
                    className="rounded-3"
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "10px 14px",
                      fontSize: "0.9rem",
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold" style={{ color: "#374151" }}>
                    First Name
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    placeholder="Enter first name"
                    className="rounded-3"
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "10px 14px",
                      fontSize: "0.9rem",
                    }}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold" style={{ color: "#374151" }}>
                    Last Name
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    placeholder="Enter last name"
                    className="rounded-3"
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "10px 14px",
                      fontSize: "0.9rem",
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold" style={{ color: "#374151" }}>
                    Location
                  </Form.Label>
                  <Form.Control
                    type="text"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    placeholder="Enter location"
                    className="rounded-3"
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "10px 14px",
                      fontSize: "0.9rem",
                    }}
                  />
                </Form.Group>
              </Col>

              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-semibold" style={{ color: "#374151" }}>
                    Website
                  </Form.Label>
                  <Form.Control
                    type="url"
                    name="website"
                    value={formData.website}
                    onChange={handleInputChange}
                    placeholder="https://example.com"
                    className="rounded-3"
                    style={{
                      border: "1px solid #e5e7eb",
                      padding: "10px 14px",
                      fontSize: "0.9rem",
                    }}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mb-3">
              <Form.Label className="fw-semibold" style={{ color: "#374151" }}>
                Bio
              </Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself..."
                className="rounded-3"
                style={{
                  border: "1px solid #e5e7eb",
                  padding: "10px 14px",
                  fontSize: "0.9rem",
                  resize: "none",
                }}
              />
            </Form.Group>

            {/* Image upload status */}
            {selectedImage && !imageUploaded && (
              <Alert
                variant="warning"
                className="rounded-3"
                style={{
                  background: "rgba(245, 158, 11, 0.1)",
                  color: "#92400e",
                  border: "none",
                  fontSize: "0.875rem",
                }}
              >
                <FaExclamationTriangle className="me-2" />
                <strong>Image selected but not uploaded.</strong> Click on the profile picture above to automatically upload the selected image.
              </Alert>
            )}

            {imageUploaded && (
              <Alert
                variant="success"
                className="rounded-3"
                style={{
                  background: "rgba(16, 185, 129, 0.1)",
                  color: "#065f46",
                  border: "none",
                  fontSize: "0.875rem",
                }}
              >
                <FaCheckCircle className="me-2" />
                <strong>Profile picture uploaded successfully.</strong> It will be saved when you click "Save Changes".
              </Alert>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer style={{ border: "none", padding: "20px 30px", background: "#f9fafb" }}>
          <Button
            variant="light"
            onClick={() => {
              setShowEditModal(false);
              setSelectedImage(null);
              setImageUploaded(false);
              setImageError("");
            }}
            className="rounded-3 fw-medium px-4 py-2"
            style={{
              border: "1px solid #e5e7eb",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveProfile}
            disabled={loading || uploadingImage}
            className="rounded-3 fw-medium px-4 py-2 border-0"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            {loading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Saving...
              </>
            ) : (
              <>
                <FaCheckCircle className="me-2" />
                Save Changes
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  )
}