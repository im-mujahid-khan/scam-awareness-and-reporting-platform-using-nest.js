"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Container, Row, Col, Card, Button, Badge, Spinner, Alert, Modal, Form } from "react-bootstrap"
import {
  FaArrowLeft,
  FaUsers,
  FaCalendarAlt,
  FaCog,
  FaUser,
  FaSignOutAlt,
  FaLock,
  FaGlobe,
  FaBuilding,
  FaInfoCircle,
  FaUserPlus,
  FaComments,
  FaBell,
  FaBellSlash,
  FaThumbsUp,
  FaComment,
  FaPaperPlane,
  FaImage,
  FaTimes,
  FaTrash,
  FaExclamationTriangle,
  FaShieldAlt,
  FaQuestionCircle,
  FaPlus
} from "react-icons/fa"
import { useAuth } from "../../../../../lib/contexts/AuthContext"
import { toast } from "react-toastify"
import DashboardLayout from "../../../../../components/layout/DashboardLayout"

const GroupDetailPage = () => {
  const params = useParams()
  const router = useRouter()
  const { user, api } = useAuth()

  const [group, setGroup] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [isMember, setIsMember] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [posts, setPosts] = useState([])
  const [members, setMembers] = useState([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [loadingPosts, setLoadingPosts] = useState(false)
  const [loadingMembers, setLoadingMembers] = useState(false)
  const [joinRequested, setJoinRequested] = useState(false)
  
  // Quick post creation state (simplified - for basic awareness posts only)
  const [postContent, setPostContent] = useState("")
  const [images, setImages] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (params.groupId && user) {
      loadGroupData()
    }
  }, [params.groupId, user])

  const loadGroupData = async () => {
    try {
      setLoading(true)
      
      console.log("Loading group data for:", params.groupId, "User:", user?.id)
      
      // Get group details
      const groupResponse = await api.groups.getGroupBySlug(params.groupId)
      
      console.log("Group API response:", groupResponse)
      
      // Transform group data with proper membership handling
      const groupData = {
        id: groupResponse.id,
        slug: groupResponse.slug || groupResponse.id,
        name: groupResponse.name,
        description: groupResponse.description,
        visibility: groupResponse.visibility || 'PUBLIC',
        topic: groupResponse.topic,
        members_count: groupResponse.memberCount || 0,
        posts_count: groupResponse.postCount || 0,
        follower_count: groupResponse.followerCount || 0,
        banner_url: groupResponse.coverImageUrl,
        rules: groupResponse.rules,
        postApproval: groupResponse.postApproval,
        created_at: groupResponse.createdAt,
        updated_at: groupResponse.updatedAt,
        company: groupResponse.company,
        createdBy: groupResponse.createdBy,
        country: groupResponse.country,
        region: groupResponse.region,
        city: groupResponse.city,
        is_member: groupResponse.isMember || 
                   groupResponse.userRole !== null || 
                   groupResponse.memberRole !== null ||
                   (groupResponse.createdBy && groupResponse.createdBy.id === user?.id),
        user_role: groupResponse.userRole || groupResponse.memberRole || 
                   (groupResponse.createdBy && groupResponse.createdBy.id === user?.id ? 'ADMIN' : null),
        is_following: groupResponse.isFollowing || false
      }
      
      console.log("Transformed group data:", {
        isMember: groupData.is_member,
        userRole: groupData.user_role,
        createdById: groupResponse.createdBy?.id,
        currentUserId: user?.id
      })
      
      setGroup(groupData)
      setIsMember(groupData.is_member)
      setUserRole(groupData.user_role)
      setIsFollowing(groupData.is_following)
      
      // Load posts and members if user is a member
      if (groupData.is_member) {
        await Promise.all([
          loadPosts(groupData.id),
          loadMembers(groupData.id)
        ])
      }
      
    } catch (error) {
      console.error("Failed to load group:", error)
      toast.error(error.message || "Failed to load group details")
      
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        router.push('/dashboard/groups')
      }
    } finally {
      setLoading(false)
    }
  }

 const loadPosts = async (groupId) => {
  try {
    setLoadingPosts(true)
    const response = await api.groupPosts.getGroupFeed(groupId, { limit: 10 })
    
    console.log("Group detail posts response:", response) // Debug log
    
    let postsData = []
    
    // Handle the nested structure
    if (Array.isArray(response)) {
      postsData = response
    } else if (response.data && Array.isArray(response.data)) {
      // Extract posts from the data array
      postsData = response.data.map(item => item.post)
    } else if (response.posts && Array.isArray(response.posts)) {
      postsData = response.posts
    }
    
    const transformedPosts = postsData.map(post => {
      if (!post) return null // Skip null posts
      
      return {
        id: post.id,
        content: post.description || post.content,
        title: post.title,
        postType: post.postType,
        user: {
          name: post.user?.displayName || post.user?.name || "Unknown User",
          avatar: post.user?.avatarUrl,
          id: post.user?.id || post.userId
        },
        created_at: post.createdAt,
        likes: post.reactionCount || 0,
        comments: post.commentCount || 0,
        is_liked: post.isLiked || false,
        images: post.evidences?.filter(e => e.evidenceType === 'IMAGE').map(e => e.fileUrl) || [],
        is_owner: post.userId === user?.id,
        isPinned: post.isPinned || false,
        status: post.status || 'PUBLISHED'
      }
    }).filter(Boolean) // Remove null items
    
    console.log("Transformed posts for detail page:", transformedPosts) // Debug log
    
    setPosts(transformedPosts)
  } catch (error) {
    console.error("Failed to load posts:", error)
    toast.error("Failed to load group posts")
  } finally {
    setLoadingPosts(false)
  }
}

  const loadMembers = async (groupId) => {
    try {
      setLoadingMembers(true)
      const response = await api.groups.getGroupMembers(groupId)
      
      const membersData = Array.isArray(response) 
        ? response 
        : (response.members || response.data || [])
      
      const transformedMembers = membersData.map(member => ({
        id: member.id,
        user: {
          id: member.userId || member.user?.id,
          name: member.user?.displayName || member.user?.name || "Unknown User",
          email: member.user?.email,
          avatar: member.user?.avatarUrl
        },
        role: member.role,
        joined_at: member.joinedAt || member.joined_at
      }))
      
      setMembers(transformedMembers)
    } catch (error) {
      console.error("Failed to load members:", error)
    } finally {
      setLoadingMembers(false)
    }
  }

  const getVisibilityBadge = (visibility) => {
    switch (visibility) {
      case "PUBLIC":
        return (
          <Badge 
            bg="" 
            className="py-1 px-3 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: 'white'
            }}
          >
            <FaGlobe className="me-1" />
            Public Group
          </Badge>
        )
      case "PRIVATE":
        return (
          <Badge 
            bg="" 
            className="py-1 px-3 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
              color: 'white'
            }}
          >
            <FaLock className="me-1" />
            Private Group
          </Badge>
        )
      case "OFFICIAL":
        return (
          <Badge 
            bg="" 
            className="py-1 px-3 rounded-pill border-0 fw-medium"
            style={{ 
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              color: 'white'
            }}
          >
            <FaBuilding className="me-1" />
            Official Group
          </Badge>
        )
      default:
        return null
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

  const getPostTypeBadge = (postType) => {
    switch (postType) {
      case "SCAM_REPORT":
        return (
          <Badge 
            bg="" 
            className="ms-2 py-1 px-2 rounded-pill border-0"
            style={{ 
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: 'white',
              fontSize: '0.7rem'
            }}
          >
            <FaExclamationTriangle className="me-1" />
            Scam Report
          </Badge>
        )
      case "SCAM_AWARENESS":
        return (
          <Badge 
            bg="" 
            className="ms-2 py-1 px-2 rounded-pill border-0"
            style={{ 
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: 'white',
              fontSize: '0.7rem'
            }}
          >
            <FaShieldAlt className="me-1" />
            Scam Awareness
          </Badge>
        )
      case "QUESTION":
        return (
          <Badge 
            bg="" 
            className="ms-2 py-1 px-2 rounded-pill border-0"
            style={{ 
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              color: 'white',
              fontSize: '0.7rem'
            }}
          >
            <FaQuestionCircle className="me-1" />
            Question
          </Badge>
        )
      default:
        return null
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffMs = now - date
      const diffMins = Math.floor(diffMs / 60000)
      const diffHours = Math.floor(diffMs / 3600000)
      const diffDays = Math.floor(diffMs / 86400000)

      if (diffMins < 1) return "Just now"
      if (diffMins < 60) return `${diffMins}m ago`
      if (diffHours < 24) return `${diffHours}h ago`
      if (diffDays < 7) return `${diffDays}d ago`
      
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric"
      })
    } catch (error) {
      return ""
    }
  }

  const handleJoinGroup = async () => {
    try {
      setJoinRequested(true)
      await api.groups.joinGroup(group.id)
      
      if (group.visibility === "PUBLIC") {
        toast.success("Joined group successfully!")
        await loadGroupData()
      } else {
        toast.success("Join request sent! Waiting for admin approval.")
      }
      
    } catch (error) {
      console.error("Failed to join group:", error)
      toast.error(error.message || "Failed to join group")
      setJoinRequested(false)
    }
  }

  const handleLeaveGroup = async () => {
    try {
      await api.groups.leaveGroup(group.id)
      
      toast.success("Left the group successfully")
      setShowLeaveModal(false)
      
      router.push('/dashboard/groups')
      
    } catch (error) {
      console.error("Failed to leave group:", error)
      toast.error(error.message || "Failed to leave group")
    }
  }

  const toggleFollow = async () => {
    try {
      if (isFollowing) {
        await api.groups.unfollowGroup(group.id)
        toast.success("Unfollowed group")
        setIsFollowing(false)
        setGroup(prev => ({
          ...prev,
          follower_count: Math.max(0, prev.follower_count - 1)
        }))
      } else {
        await api.groups.followGroup(group.id)
        toast.success("Following group")
        setIsFollowing(true)
        setGroup(prev => ({
          ...prev,
          follower_count: prev.follower_count + 1
        }))
      }
    } catch (error) {
      console.error("Failed to toggle follow:", error)
      toast.error(error.message || "Failed to update follow status")
    }
  }

  const handleCreatePost = async (e) => {
    e.preventDefault()
    
    if (!postContent.trim()) {
      toast.error("Please enter post content")
      return
    }

    try {
      setSubmitting(true)
      
      // Prepare post data - simple awareness post
      const postData = {
        title: postContent.substring(0, 100),
        description: postContent,
        postType: "SCAM_AWARENESS"
      }
      
      // Upload images if present
      if (images.length > 0) {
        const uploadedImages = []
        
        for (const image of images) {
          try {
            const formData = new FormData()
            formData.append('file', image)
            
            const uploadResponse = await api.upload.uploadFile(formData)
            uploadedImages.push({
              evidenceType: "IMAGE",
              fileUrl: uploadResponse.url || uploadResponse.fileUrl
            })
          } catch (uploadError) {
            console.error("Failed to upload image:", uploadError)
          }
        }
        
        if (uploadedImages.length > 0) {
          postData.evidences = uploadedImages
        }
      }
      
      // Create post in group
      await api.groupPosts.createGroupPost(group.id, postData)
      
      const message = group.postApproval === "APPROVAL_REQUIRED"
        ? "Post submitted for approval!"
        : "Post created successfully!"
      
      toast.success(message)
      
      // Clear form
      setPostContent("")
      setImages([])
      
      // Reload posts
      await loadPosts(group.id)
      
    } catch (error) {
      console.error("Failed to create post:", error)
      toast.error(error.message || "Failed to create post")
    } finally {
      setSubmitting(false)
    }
  }

  const handleLikePost = async (postId) => {
    try {
      await api.posts.toggleReaction(postId, 'like')
      
      setPosts(posts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            likes: post.is_liked ? post.likes - 1 : post.likes + 1,
            is_liked: !post.is_liked
          }
        }
        return post
      }))
    } catch (error) {
      console.error("Failed to update like:", error)
    }
  }

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return

    try {
      await api.groupPosts.removeGroupPost(group.id, postId)
      setPosts(posts.filter(post => post.id !== postId))
      toast.success("Post deleted successfully!")
    } catch (error) {
      console.error("Failed to delete post:", error)
      toast.error(error.message || "Failed to delete post")
    }
  }

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files)
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    const validFiles = files.filter(file => {
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name}: Invalid file type`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name}: File too large (max 5MB)`)
        return false
      }
      return true
    })
    if (validFiles.length > 0) {
      setImages([...images, ...validFiles])
    }
  }

  const removeImage = (index) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleViewAllMembers = () => {
    router.push(`/dashboard/groups/${params.groupId}/members`)
  }

  const handleSettings = () => {
    router.push(`/dashboard/groups/${params.groupId}/settings`)
  }

  const handleCreateFullPost = () => {
    router.push(`/dashboard/groups/${params.groupId}/posts`)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <Spinner animation="border" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                <p className="mt-4 text-muted fs-5">Loading group details...</p>
              </div>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    )
  }

  if (!group) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <h3 className="fw-bold mb-3">Group not found</h3>
                <p className="text-muted mb-4">The group you're looking for doesn't exist or you don't have access.</p>
                <Button
                  variant="primary"
                  onClick={() => router.push("/dashboard/groups")}
                  className="px-4 py-3 rounded-pill"
                >
                  Back to Groups
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
          <Col xl={12}>
            {/* Header */}
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

            {/* Group Header Card */}
            <Card className="border-0 shadow-sm mb-4 rounded-4 overflow-hidden">
              <div 
                className="position-relative"
                style={{ 
                  height: '200px',
                  background: group.banner_url 
                    ? `url(${group.banner_url})` 
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              >
                {!group.banner_url && (
                  <div className="w-100 h-100 d-flex align-items-center justify-content-center">
                    <FaUsers className="text-white" style={{ fontSize: '4rem', opacity: 0.5 }} />
                  </div>
                )}
                <div className="position-absolute bottom-0 start-0 end-0 p-4" 
                     style={{ 
                       background: 'linear-gradient(transparent, rgba(0,0,0,0.7))' 
                     }}>
                  <div className="d-flex justify-content-between align-items-end">
                    <div>
                      <h1 className="fw-bold text-white mb-2">{group.name}</h1>
                      <div className="d-flex align-items-center gap-3 flex-wrap">
                        {getVisibilityBadge(group.visibility)}
                        {userRole && getRoleBadge(userRole)}
                        {group.company && (
                          <Badge 
                            bg="" 
                            className="py-1 px-2 rounded-pill border-0"
                            style={{ 
                              background: 'linear-gradient(135deg, #0EA5E9 0%, #0284C7 100%)',
                              color: 'white',
                              fontSize: '0.875rem'
                            }}
                          >
                            <FaBuilding className="me-1" />
                            {group.company.name}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      {isMember && (
                        <>
                          <Button
                            variant={isFollowing ? "primary" : "outline-primary"}
                            className="px-3 py-2 rounded-pill border-0 d-flex align-items-center gap-2"
                            onClick={toggleFollow}
                            style={{ 
                              background: isFollowing 
                                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                : 'rgba(255, 255, 255, 0.2)',
                              color: 'white',
                              border: '1px solid rgba(255, 255, 255, 0.3)'
                            }}
                          >
                            {isFollowing ? <FaBell /> : <FaBellSlash />}
                            <span>{isFollowing ? 'Following' : 'Follow'}</span>
                          </Button>
                          
                          {userRole === "ADMIN" && (
                            <Button
                              variant="outline-light"
                              className="px-3 py-2 rounded-pill border-0 d-flex align-items-center gap-2"
                              onClick={handleSettings}
                            >
                              <FaCog />
                              <span>Settings</span>
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <Card.Body className="p-4">
                <Row>
                  <Col lg={8}>
                    <div className="mb-4">
                      <h5 className="fw-semibold mb-3" style={{ color: "#2d3748" }}>Description</h5>
                      <p className="text-muted mb-0">{group.description || "No description provided"}</p>
                    </div>

                    {group.rules && (
                      <div className="mb-4">
                        <h5 className="fw-semibold mb-3" style={{ color: "#2d3748" }}>Group Rules</h5>
                        <div className="bg-light p-4 rounded-3">
                          <pre className="text-muted mb-0" style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                            {group.rules}
                          </pre>
                        </div>
                      </div>
                    )}

                    <div className="d-flex align-items-center gap-4 text-muted flex-wrap">
                      <div className="d-flex align-items-center gap-2">
                        <FaCalendarAlt />
                        <span>Created {formatDate(group.created_at)}</span>
                      </div>
                      {group.createdBy && (
                        <div className="d-flex align-items-center gap-2">
                          <FaUser />
                          <span>By {group.createdBy.displayName}</span>
                        </div>
                      )}
                    </div>
                  </Col>

                  <Col lg={4}>
                    <Card className="border-0 shadow-sm rounded-4">
                      <Card.Body className="p-4">
                        <h5 className="fw-semibold mb-4" style={{ color: "#2d3748" }}>Group Stats</h5>
                        
                        <div className="mb-4">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <div className="d-flex align-items-center gap-2">
                              <FaUsers className="text-primary" />
                              <span className="fw-medium">Members</span>
                            </div>
                            <span className="fw-bold display-6">{group.members_count}</span>
                          </div>
                          
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-2">
                              <FaComments className="text-primary" />
                              <span className="fw-medium">Posts</span>
                            </div>
                            <span className="fw-bold display-6">{group.posts_count}</span>
                          </div>
                        </div>

                        {isMember ? (
                          <div className="d-flex flex-column gap-2">
                            <div className="d-grid gap-2">
                              <Button
                                variant="primary"
                                onClick={handleViewAllMembers}
                                className="py-2 rounded-pill border-0"
                                style={{ 
                                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                }}
                              >
                                <FaUsers className="me-2" />
                                View All Members
                              </Button>
                              
                              <Button
                                variant="outline-danger"
                                onClick={() => setShowLeaveModal(true)}
                                className="py-2 rounded-pill border-0"
                                style={{ 
                                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                  border: '1px solid #fecaca',
                                  color: '#dc2626'
                                }}
                              >
                                <FaSignOutAlt className="me-2" />
                                Leave Group
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="d-grid">
                            <Button
                              variant="primary"
                              onClick={handleJoinGroup}
                              disabled={joinRequested && group.visibility === "PRIVATE"}
                              className="py-3 rounded-pill border-0 fw-semibold"
                              style={{ 
                                background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                              }}
                            >
                              <FaUserPlus className="me-2" />
                              {joinRequested && group.visibility === "PRIVATE" 
                                ? "Request Pending..." 
                                : group.visibility === "PRIVATE" 
                                  ? "Request to Join" 
                                  : "Join Group"}
                            </Button>
                          </div>
                        )}
                      </Card.Body>
                    </Card>
                  </Col>
                </Row>
              </Card.Body>
            </Card>

            {/* Posts and Members Section - Only for Members */}
            {isMember ? (
              <Row className="g-4">
                {/* Posts Column */}
                <Col lg={8}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="fw-bold mb-0">
                      <FaComments className="me-2" />
                      Group Posts
                    </h4>
                    <Button
                      variant="link"
                      onClick={() => router.push(`/dashboard/groups/${params.groupId}/posts`)}
                      className="text-decoration-none p-0"
                    >
                      View All Posts
                    </Button>
                  </div>

                  {/* Quick Post Creation Card */}
                  {/* <Card className="border-0 shadow-sm mb-4 rounded-4">
                    <Card.Body className="p-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="fw-semibold mb-0">Quick Post</h6>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={handleCreateFullPost}
                          className="rounded-pill border-0"
                          style={{ 
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            border: '1px solid #e9ecef',
                            color: '#667eea'
                          }}
                        >
                          <FaPlus className="me-1" />
                          Create Full Post
                        </Button>
                      </div>

                      <Alert variant="info" className="mb-3 border-0 py-2 px-3" style={{ background: 'rgba(59, 130, 246, 0.1)', fontSize: '0.875rem' }}>
                        <FaInfoCircle className="me-2" />
                        Quick post creates awareness posts. For scam reports or questions, click "Create Full Post"
                      </Alert>
                      
                      {group.postApproval === "APPROVAL_REQUIRED" && (
                        <Alert variant="warning" className="mb-3 border-0 py-2 px-3" style={{ fontSize: '0.875rem' }}>
                          <FaExclamationTriangle className="me-2" />
                          Posts require admin approval before being published
                        </Alert>
                      )}
                      
                      <Form onSubmit={handleCreatePost}>
                        <Form.Group className="mb-3">
                          <Form.Control
                            as="textarea"
                            placeholder="Share something with the group..."
                            value={postContent}
                            onChange={(e) => setPostContent(e.target.value)}
                            rows={3}
                            className="border-0 rounded-3"
                            style={{ 
                              background: '#f8f9fa',
                              fontSize: '0.95rem',
                              resize: 'none'
                            }}
                          />
                        </Form.Group>

                        {images.length > 0 && (
                          <div className="mb-3">
                            <div className="row g-2">
                              {images.map((image, index) => (
                                <Col key={index} xs={4} md={3}>
                                  <div className="position-relative">
                                    <img
                                      src={URL.createObjectURL(image)}
                                      alt={`Preview ${index + 1}`}
                                      className="img-fluid rounded-3 w-100"
                                      style={{ height: '80px', objectFit: 'cover' }}
                                    />
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      className="position-absolute top-0 end-0 m-1 rounded-circle p-0"
                                      onClick={() => removeImage(index)}
                                      style={{ width: '20px', height: '20px' }}
                                    >
                                      <FaTimes size={10} />
                                    </Button>
                                  </div>
                                </Col>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="d-flex justify-content-between align-items-center">
                          <div>
                            <input
                              type="file"
                              id="image-upload"
                              accept="image/*"
                              multiple
                              onChange={handleImageUpload}
                              className="d-none"
                            />
                            <Button
                              variant="light"
                              type="button"
                              size="sm"
                              className="rounded-pill border-0"
                              onClick={() => document.getElementById('image-upload').click()}
                              disabled={submitting}
                            >
                              <FaImage className="me-2" />
                              Add Images
                            </Button>
                          </div>

                          <Button
                            type="submit"
                            variant="primary"
                            size="sm"
                            disabled={!postContent.trim() || submitting}
                            className="px-4 py-2 rounded-pill border-0"
                            style={{ 
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            }}
                          >
                            {submitting ? (
                              <>
                                <Spinner animation="border" size="sm" className="me-2" />
                                Posting...
                              </>
                            ) : (
                              <>
                                <FaPaperPlane className="me-2" />
                                Post
                              </>
                            )}
                          </Button>
                        </div>
                      </Form>
                    </Card.Body>
                  </Card> */}

                  {/* Posts List */}
                  {loadingPosts ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" variant="primary" />
                      <p className="mt-3 text-muted">Loading posts...</p>
                    </div>
                  ) : posts.length === 0 ? (
                    <Card className="border-0 shadow-sm rounded-4 text-center py-5">
                      <Card.Body>
                        <FaComments className="text-muted mb-3" style={{ fontSize: "3rem", opacity: 0.2 }} />
                        <h5 className="fw-semibold mb-3">No posts yet</h5>
                        <p className="text-muted mb-3">Be the first to share something in this group</p>
                        <Button
                          variant="primary"
                          onClick={handleCreateFullPost}
                          className="px-4 py-2 rounded-pill border-0"
                          style={{ 
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          }}
                        >
                          <FaPlus className="me-2" />
                          Create Post
                        </Button>
                      </Card.Body>
                    </Card>
                  ) : (
                    <div className="d-flex flex-column gap-4">
                      {posts.map((post) => (
                        <Card key={post.id} className="border-0 shadow-sm rounded-4">
                          <Card.Body className="p-4">
                            <div className="d-flex justify-content-between align-items-start mb-3">
                              <div className="d-flex align-items-center gap-3">
                                <div 
                                  className="rounded-circle d-flex align-items-center justify-content-center"
                                  style={{ 
                                    width: '48px', 
                                    height: '48px',
                                    background: post.user.avatar 
                                      ? `url(${post.user.avatar})` 
                                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    backgroundSize: 'cover',
                                    color: 'white'
                                  }}
                                >
                                  {!post.user.avatar && <FaUser size={20} />}
                                </div>
                                <div>
                                  <div className="d-flex align-items-center">
                                    <h6 className="fw-semibold mb-0">
                                      {post.user.name}
                                    </h6>
                                    {getPostTypeBadge(post.postType)}
                                    {post.isPinned && (
                                      <Badge bg="primary" className="ms-2">Pinned</Badge>
                                    )}
                                    {post.status === 'PENDING' && (
                                      <Badge bg="warning" className="ms-2">Pending Approval</Badge>
                                    )}
                                  </div>
                                  <small className="text-muted">{formatDate(post.created_at)}</small>
                                </div>
                              </div>
                              
                              {(post.is_owner || userRole === 'ADMIN') && (
                                <Button
                                  variant="light"
                                  className="rounded-circle border-0 p-2"
                                  onClick={() => handleDeletePost(post.id)}
                                  style={{ width: '32px', height: '32px' }}
                                >
                                  <FaTrash size={12} className="text-danger" />
                                </Button>
                              )}
                            </div>

                            <div className="mb-3">
                              {post.title && <h5 className="fw-bold mb-2">{post.title}</h5>}
                              <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>
                              
                              {post.images && post.images.length > 0 && (
                                <div className="row g-2 mt-3">
                                  {post.images.map((image, index) => (
                                    <Col key={index} xs={6} md={4}>
                                      <img
                                        src={image}
                                        alt={`Post image ${index + 1}`}
                                        className="img-fluid rounded-3 w-100"
                                        style={{ height: '150px', objectFit: 'cover', cursor: 'pointer' }}
                                        onClick={() => window.open(image, '_blank')}
                                      />
                                    </Col>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="d-flex gap-2 border-top pt-3">
                              <Button
                                variant={post.is_liked ? "primary" : "light"}
                                className="flex-grow-1 rounded-pill border-0"
                                onClick={() => handleLikePost(post.id)}
                                style={{ 
                                  background: post.is_liked 
                                    ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                    : '#f8f9fa'
                                }}
                              >
                                <FaThumbsUp className="me-2" />
                                {post.likes} {post.is_liked ? 'Liked' : 'Like'}
                              </Button>
                              <Button variant="light" className="flex-grow-1 rounded-pill">
                                <FaComment className="me-2" />
                                {post.comments} Comments
                              </Button>
                            </div>
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  )}
                </Col>

                {/* Members Column */}
                <Col lg={4}>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0" style={{ color: "#2d3748" }}>
                      <FaUsers className="me-2" />
                      Members ({members.length})
                    </h5>
                    <Button
                      variant="link"
                      onClick={handleViewAllMembers}
                      className="text-decoration-none p-0"
                    >
                      View All
                    </Button>
                  </div>

                  {loadingMembers ? (
                    <div className="text-center py-5">
                      <Spinner animation="border" variant="primary" size="sm" />
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-3">
                      {members.slice(0, 5).map((member) => (
                        <Card key={member.id} className="border-0 shadow-sm rounded-3">
                          <Card.Body className="p-3">
                            <div className="d-flex align-items-center gap-3">
                              <div 
                                className="rounded-circle d-flex align-items-center justify-content-center"
                                style={{ 
                                  width: '40px', 
                                  height: '40px',
                                  background: member.user.avatar 
                                    ? `url(${member.user.avatar})`
                                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                  backgroundSize: 'cover',
                                  color: 'white'
                                }}
                              >
                                {!member.user.avatar && <FaUser size={16} />}
                              </div>
                              <div className="flex-grow-1">
                                <h6 className="fw-semibold mb-0 small">{member.user.name}</h6>
                                <small className="text-muted">{getRoleBadge(member.role)}</small>
                              </div>
                            </div>
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  )}
                </Col>
              </Row>
            ) : (
              <Alert variant="info" className="rounded-4 p-4">
                <div className="d-flex align-items-center">
                  <FaLock className="me-3" style={{ fontSize: '2rem' }} />
                  <div className="flex-grow-1">
                    <h5 className="fw-semibold mb-2">Join Group to Post</h5>
                    <p className="mb-3">Only group members can view posts, create content, and comment.</p>
                    <Button
                      variant="primary"
                      onClick={handleJoinGroup}
                      disabled={joinRequested && group.visibility === "PRIVATE"}
                      className="px-4 py-2 rounded-pill border-0"
                      style={{ 
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                      }}
                    >
                      <FaUserPlus className="me-2" />
                      {joinRequested && group.visibility === "PRIVATE" 
                        ? "Request Pending..." 
                        : group.visibility === "PRIVATE" 
                          ? "Request to Join" 
                          : "Join Group"}
                    </Button>
                  </div>
                </div>
              </Alert>
            )}
          </Col>
        </Row>
      </Container>

      {/* Leave Group Modal */}
      <Modal show={showLeaveModal} onHide={() => setShowLeaveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Leave Group</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <FaSignOutAlt className="text-danger mb-3" style={{ fontSize: "3rem", opacity: 0.8 }} />
            <p className="mb-0">Are you sure you want to leave this group?</p>
            <p className="text-muted small mb-0 mt-2">
              You will no longer see group posts or receive notifications.
              {userRole === "ADMIN" && " As an admin, you should transfer admin rights before leaving."}
            </p>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setShowLeaveModal(false)} className="px-4 rounded-pill">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleLeaveGroup}
            className="px-4 rounded-pill"
          >
            Leave Group
          </Button>
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  )
}

export default GroupDetailPage
