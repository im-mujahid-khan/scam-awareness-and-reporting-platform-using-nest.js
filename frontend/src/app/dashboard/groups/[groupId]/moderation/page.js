"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  Container, Row, Col, Card, Button, Badge, Spinner, Alert, 
  Modal, Form, Dropdown, Tab, Tabs 
} from "react-bootstrap"
import {
  FaArrowLeft,
  FaCheckCircle,
  FaTimesCircle,
  FaThumbtack,
  FaTrash,
  FaExclamationTriangle,
  FaShieldAlt,
  FaQuestionCircle,
  FaEye,
  FaFilter,
  FaSearch,
  FaComment,
  FaClock,
  FaCheck,
  FaTimes,
  FaEllipsisV,
  FaInfoCircle,
  FaCrown,
  FaUser,
  FaLock,
  FaSync,
  FaUserPlus,
  FaUserFriends,
  FaClipboardCheck,
  FaHistory,
  FaImage,
  FaFileAlt,
  FaBan,
  FaGlobe,
  FaEnvelope
} from "react-icons/fa"
import { useAuth } from "../../../../../../lib/contexts/AuthContext"
import { toast } from "react-toastify"
import DashboardLayout from "../../../../../../components/layout/DashboardLayout"

const GroupPostsModerationPage = () => {
  const params = useParams()
  const router = useRouter()
  const { user, api } = useAuth()

  // Posts states
  const [posts, setPosts] = useState([])
  const [pendingPosts, setPendingPosts] = useState([])
  const [approvedPosts, setApprovedPosts] = useState([])
  const [filteredPosts, setFilteredPosts] = useState([])
  
  // Join requests states
  const [joinRequests, setJoinRequests] = useState([])
  const [filteredRequests, setFilteredRequests] = useState([])
  
  // UI states
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("posts")
  const [statusFilter, setStatusFilter] = useState("pending")
  const [userRole, setUserRole] = useState("")
  const [group, setGroup] = useState(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedPost, setSelectedPost] = useState(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [accessDenied, setAccessDenied] = useState(false)
  const [postDetails, setPostDetails] = useState({})
  
  // Join request search
  const [requestSearch, setRequestSearch] = useState("")
  const [selectedPostForView, setSelectedPostForView] = useState(null)
  const [showPostDetailsModal, setShowPostDetailsModal] = useState(false)

  useEffect(() => {
    if (params.groupId && user) {
      loadGroupData()
    }
  }, [params.groupId, user])

  useEffect(() => {
    filterPosts()
  }, [searchTerm, statusFilter, pendingPosts, approvedPosts])

  useEffect(() => {
    filterJoinRequests()
  }, [requestSearch, joinRequests])

  const loadGroupData = async () => {
    try {
      setLoading(true)
      setAccessDenied(false)
      
      console.log("Loading group data for:", params.groupId)
      
      const groupResponse = await api.groups.getGroupBySlug(params.groupId)
      
      let detectedUserRole = null
      
      if (groupResponse.userRole) {
        detectedUserRole = groupResponse.userRole
      } else if (groupResponse.memberRole) {
        detectedUserRole = groupResponse.memberRole
      } else if (groupResponse.createdBy && groupResponse.createdBy.id === user?.id) {
        detectedUserRole = 'ADMIN'
      }
      
      const groupData = {
        id: groupResponse.id,
        name: groupResponse.name,
        user_role: detectedUserRole,
        postApproval: groupResponse.postApproval || "APPROVAL_REQUIRED",
        visibility: groupResponse.visibility || "PUBLIC"
      }
      
      setGroup(groupData)
      setUserRole(detectedUserRole)
      
      if (!['ADMIN', 'MODERATOR'].includes(detectedUserRole)) {
        console.error("User lacks permission. Role:", detectedUserRole)
        setAccessDenied(true)
        toast.error("You don't have permission to access the moderation panel")
        return
      }
      
      await Promise.all([
        loadAllPosts(groupData.id),
        loadJoinRequests(groupData.id)
      ])
      
    } catch (error) {
      console.error("Failed to load group data:", error)
      
      if (error.message?.includes('403') || 
          error.message?.includes('permission') || 
          error.message?.includes('denied')) {
        setAccessDenied(true)
        toast.error("Access denied. You don't have permission to moderate this group.")
      } else if (error.message?.includes('404') || error.message?.includes('not found')) {
        toast.error("Group not found")
        router.push('/dashboard/groups')
      } else {
        toast.error(error.message || "Failed to load group data")
      }
    } finally {
      setLoading(false)
    }
  }

  const viewPostDetails = async (postId) => {
    try {
      try {
        const postDetails = await api.posts.getPost(postId)
        setPostDetails(prev => ({
          ...prev,
          [postId]: postDetails
        }))
        setSelectedPostForView(postDetails)
      } catch (error) {
        console.log("Could not fetch post details, using cached data")
        const post = [...pendingPosts, ...approvedPosts].find(p => p.id === postId)
        if (post) {
          setSelectedPostForView(post)
        }
      }
      setShowPostDetailsModal(true)
    } catch (error) {
      console.error("Failed to load post details:", error)
      toast.error("Could not load post details")
    }
  }

  const loadJoinRequests = async (groupId) => {
    try {
      console.log("Loading join requests for group:", groupId)
      
      const response = await api.groups.getJoinRequests(groupId)
      const requestsData = Array.isArray(response) 
        ? response 
        : (response.requests || response.data || [])
      
      const transformedRequests = requestsData.map(request => ({
        id: request.id,
        user: {
          id: request.user?.id,
          name: request.user?.displayName || request.user?.name || "Unknown User",
          email: request.user?.email,
          avatar: request.user?.avatarUrl
        },
        requested_at: request.createdAt || request.requested_at,
        status: request.status || "PENDING",
        notes: request.notes || request.message || ""
      }))
      
      setJoinRequests(transformedRequests)
      
    } catch (error) {
      console.error("Failed to load join requests:", error)
      
      if (error.message?.includes('403') || error.message?.includes('permission')) {
        toast.error("Permission denied: Cannot access join requests")
      } else {
        toast.warning("Could not load join requests")
      }
    }
  }

  const filterJoinRequests = () => {
    let result = [...joinRequests]

    if (requestSearch) {
      const term = requestSearch.toLowerCase()
      result = result.filter(
        (request) => 
          (request.user.name && request.user.name.toLowerCase().includes(term)) || 
          (request.user.email && request.user.email.toLowerCase().includes(term)) ||
          (request.notes && request.notes.toLowerCase().includes(term))
      )
    }

    setFilteredRequests(result)
  }

  const handleApproveJoinRequest = async (requestId) => {
    if (!group || !group.id) {
      toast.error("Group information not available")
      return
    }

    try {
      await api.groups.handleJoinRequest(group.id, requestId, { 
        action: 'APPROVE' 
      })
      
      setJoinRequests(prev => prev.filter(req => req.id !== requestId))
      toast.success("Join request approved!")
      
    } catch (error) {
      console.error("Failed to approve join request:", error)
      
      if (error.message?.includes('403') || error.message?.includes('permission')) {
        toast.error("Permission denied: Cannot approve join requests")
        loadGroupData()
      } else {
        toast.error(error.message || "Failed to approve join request")
      }
    }
  }

  const handleRejectJoinRequest = async (requestId) => {
    if (!group || !group.id) {
      toast.error("Group information not available")
      return
    }

    try {
      await api.groups.handleJoinRequest(group.id, requestId, { 
        action: 'REJECT' 
      })
      
      setJoinRequests(prev => prev.filter(req => req.id !== requestId))
      toast.success("Join request rejected!")
      
    } catch (error) {
      console.error("Failed to reject join request:", error)
      
      if (error.message?.includes('403') || error.message?.includes('permission')) {
        toast.error("Permission denied: Cannot reject join requests")
        loadGroupData()
      } else {
        toast.error(error.message || "Failed to reject join request")
      }
    }
  }

  const loadAllPosts = async (groupId) => {
    try {
      console.log("Loading posts for group:", groupId)
      
      // Load pending posts
      try {
        const pendingResponse = await api.groupPosts.getPendingPosts(groupId)
        const pendingData = Array.isArray(pendingResponse) 
          ? pendingResponse 
          : (pendingResponse.posts || pendingResponse.data || pendingResponse.feed || [])
        
        const transformedPending = pendingData.map(post => {
          const postData = post.post || post
          
          const userData = postData.user || 
                          postData.createdBy || 
                          postData.author || 
                          {}
          
          const userName = userData.displayName || 
                          userData.name || 
                          userData.username ||
                          postData.username ||
                          "Unknown User"
          
          const userAvatar = userData.avatarUrl || 
                            userData.avatar || 
                            userData.profilePicture
          
          const title = postData.title || 
                       postData.name || 
                       "Untitled Post"
          
          const content = postData.description || 
                         postData.content || 
                         postData.body || 
                         postData.text || 
                         "No content provided"
          
          let images = []
          if (postData.evidences && Array.isArray(postData.evidences)) {
            images = postData.evidences
              .filter(e => e.evidenceType === 'IMAGE' || e.type === 'image')
              .map(e => e.fileUrl || e.url || e.path || e.filePath)
              .filter(url => url && url.trim() !== '')
          } else if (postData.images && Array.isArray(postData.images)) {
            images = postData.images.filter(img => img && img.trim() !== '')
          } else if (postData.attachments && Array.isArray(postData.attachments)) {
            images = postData.attachments
              .filter(a => a.type === 'image' || a.mimeType?.startsWith('image/'))
              .map(a => a.url || a.path || a.fileUrl)
              .filter(url => url && url.trim() !== '')
          }
          
          // CRITICAL FIX: Properly extract pin status from all possible locations
          const isPinned = Boolean(
            postData.isPinned === true || 
            postData.isPinned === 'true' ||
            postData.pinned === true || 
            postData.pinned === 'true' ||
            (postData.metadata && (postData.metadata.isPinned === true || postData.metadata.pinned === true))
          )
          
          console.log(` Post ${postData.id} pin status:`, {
            isPinned,
            raw_isPinned: postData.isPinned,
            raw_pinned: postData.pinned,
            metadata_pinned: postData.metadata?.pinned,
            metadata_isPinned: postData.metadata?.isPinned
          })
          
          return {
            id: postData.id || postData._id,
            title: title,
            content: content,
            postType: postData.postType || 
                     postData.type || 
                     (postData.scamTypeId ? "SCAM_REPORT" : "GENERAL"),
            user: {
              id: userData.id || userData._id,
              name: userName,
              avatar: userAvatar
            },
            created_at: postData.createdAt || 
                       postData.created_at || 
                       postData.createdDate || 
                       postData.timestamp,
            images: images,
            status: 'PENDING',
            rejectionReason: postData.rejectionReason,
            isPinned: isPinned,
            scamTypeId: postData.scamTypeId,
            lostAmount: postData.lostAmount,
            currency: postData.currency,
            companyId: postData.companyId,
            companyName: postData.companyNameManual || postData.companyName,
            _rawData: postData // Keep raw data for debugging
          }
        })
        
        setPendingPosts(transformedPending)
      } catch (error) {
        console.error("Failed to load pending posts:", error)
        toast.warning("Could not load pending posts")
      }
      
      // Load approved posts
      try {
        const approvedResponse = await api.groupPosts.getGroupFeed(groupId, { 
          limit: 100,
          includePending: false 
        })
        
        const approvedData = Array.isArray(approvedResponse) 
          ? approvedResponse 
          : (approvedResponse.posts || approvedResponse.data || approvedResponse.feed || [])
        
        console.log(`📥 Loaded ${approvedData.length} approved posts from API`)
        
        const transformedApproved = approvedData.map(post => {
          const postData = post.post || post
          
          const userData = postData.user || 
                          postData.createdBy || 
                          postData.author || 
                          {}
          
          const userName = userData.displayName || 
                          userData.name || 
                          userData.username ||
                          postData.username ||
                          "Unknown User"
          
          const userAvatar = userData.avatarUrl || 
                            userData.avatar || 
                            userData.profilePicture
          
          const title = postData.title || 
                       postData.name || 
                       "Untitled Post"
          
          const content = postData.description || 
                         postData.content || 
                         postData.body || 
                         postData.text || 
                         "No content provided"
          
          let images = []
          if (postData.evidences && Array.isArray(postData.evidences)) {
            images = postData.evidences
              .filter(e => e.evidenceType === 'IMAGE' || e.type === 'image')
              .map(e => e.fileUrl || e.url || e.path || e.filePath)
              .filter(url => url && url.trim() !== '')
          } else if (postData.images && Array.isArray(postData.images)) {
            images = postData.images.filter(img => img && img.trim() !== '')
          } else if (postData.attachments && Array.isArray(postData.attachments)) {
            images = postData.attachments
              .filter(a => a.type === 'image' || a.mimeType?.startsWith('image/'))
              .map(a => a.url || a.path || a.fileUrl)
              .filter(url => url && url.trim() !== '')
          }
          
          // CRITICAL FIX: Properly extract pin status from all possible locations
          const isPinned = Boolean(
            postData.isPinned === true || 
            postData.isPinned === 'true' ||
            postData.pinned === true || 
            postData.pinned === 'true' ||
            (postData.metadata && (postData.metadata.isPinned === true || postData.metadata.pinned === true))
          )
          
          console.log(` Post ${postData.id} pin status:`, {
            isPinned,
            raw_isPinned: postData.isPinned,
            raw_pinned: postData.pinned,
            metadata_pinned: postData.metadata?.pinned,
            metadata_isPinned: postData.metadata?.isPinned
          })
          
          return {
            id: postData.id || postData._id,
            title: title,
            content: content,
            postType: postData.postType || 
                     postData.type || 
                     (postData.scamTypeId ? "SCAM_REPORT" : "GENERAL"),
            user: {
              id: userData.id || userData._id,
              name: userName,
              avatar: userAvatar
            },
            created_at: postData.createdAt || 
                       postData.created_at || 
                       postData.createdDate || 
                       postData.timestamp,
            images: images,
            status: 'APPROVED',
            isPinned: isPinned,
            pinned: isPinned, // Backup property for compatibility
            approved_at: postData.publishedAt || 
                        postData.approvedAt || 
                        postData.updatedAt,
            scamTypeId: postData.scamTypeId,
            lostAmount: postData.lostAmount,
            currency: postData.currency,
            companyId: postData.companyId,
            companyName: postData.companyNameManual || postData.companyName,
            _rawData: postData // Keep raw data for debugging
          }
        })
        
        // Sort with pinned posts first
        const sortedApproved = transformedApproved.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1
          if (!a.isPinned && b.isPinned) return 1
          return new Date(b.created_at) - new Date(a.created_at)
        })
        
        console.log(` Sorted ${sortedApproved.length} posts, ${sortedApproved.filter(p => p.isPinned).length} pinned`)
        
        setApprovedPosts(sortedApproved)
      } catch (error) {
        console.error("Failed to load approved posts:", error)
        toast.warning("Could not load approved posts")
      }
      
    } catch (error) {
      console.error("Failed to load posts:", error)
      toast.error("Failed to load posts")
    }
  }

  const filterPosts = () => {
    let result = statusFilter === "pending" ? [...pendingPosts] : [...approvedPosts]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (post) => 
          (post.title && post.title.toLowerCase().includes(term)) || 
          (post.content && post.content.toLowerCase().includes(term)) ||
          (post.user.name && post.user.name.toLowerCase().includes(term))
      )
    }

    setFilteredPosts(result)
  }

  const handleApprovePost = async (postId) => {
    if (!group || !group.id) {
      toast.error("Group information not available")
      return
    }

    try {
      console.log("Approving post:", {
        groupId: group.id,
        postId: postId,
        post: pendingPosts.find(p => p.id === postId)
      })
      
      const post = pendingPosts.find(p => p.id === postId)
      if (!post) {
        toast.error("Post not found in pending list")
        return
      }
      
      const alreadyApproved = approvedPosts.some(p => p.id === postId)
      if (alreadyApproved) {
        toast.warning("Post is already approved")
        setPendingPosts(prev => prev.filter(p => p.id !== postId))
        return
      }
      
      // Use the API method
      await api.groupPosts.approveGroupPost(group.id, postId, "Post meets community guidelines")
      
      // Move post from pending to approved in local state
      setPendingPosts(prev => prev.filter(p => p.id !== postId))
      
      const approvedPost = {
        ...post, 
        status: 'APPROVED', 
        approved_at: new Date().toISOString(),
        isPinned: false // New posts should not be pinned by default
      }
      
      setApprovedPosts(prev => {
        const updated = [approvedPost, ...prev]
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1
          if (!a.isPinned && b.isPinned) return 1
          return new Date(b.created_at) - new Date(a.created_at)
        })
      })
      
      toast.success("Post approved successfully!")
      
      // Refresh to ensure backend state is synced
      setTimeout(() => {
        loadAllPosts(group.id)
      }, 1000)
      
    } catch (error) {
      console.error("Approval failed:", error)
      
      if (error.message?.includes('401') || error.message?.includes('token') || error.message?.includes('authentication')) {
        toast.error("Authentication failed. Please log in again.")
        
        localStorage.removeItem('token')
        localStorage.removeItem('accessToken')
        sessionStorage.removeItem('token')
        sessionStorage.removeItem('accessToken')
        
        setTimeout(() => {
          router.push('/login')
        }, 2000)
        
      } else if (error.message?.includes('404') || error.message?.includes('not found')) {
        toast.error("Post not found. It may have been deleted.")
        
        setTimeout(() => {
          setPendingPosts(prev => prev.filter(p => p.id !== postId))
        }, 1000)
        
      } else if (error.message?.includes('403') || error.message?.includes('permission')) {
        toast.error("Permission denied. You need admin/mod permissions.")
      } else {
        toast.error(`Failed to approve: ${error.message}`)
      }
    }
  }

  const handleRejectPost = (post) => {
    setSelectedPost(post)
    setShowRejectModal(true)
  }

  const confirmRejectPost = async () => {
    if (!selectedPost || !rejectionReason.trim()) {
      toast.error("Please provide a rejection reason")
      return
    }

    if (!group || !group.id) {
      toast.error("Group information not available")
      return
    }

    try {
      await api.groupPosts.rejectGroupPost(group.id, selectedPost.id, rejectionReason)
      
      setPendingPosts(prev => prev.filter(p => p.id !== selectedPost.id))
      
      toast.success("Post rejected successfully!")
      setShowRejectModal(false)
      setSelectedPost(null)
      setRejectionReason("")
      
    } catch (error) {
      console.error("Failed to reject post:", error)
      
      if (error.message?.includes('403') || error.message?.includes('permission')) {
        toast.error("Permission denied: Cannot reject posts")
        loadGroupData()
      } else {
        toast.error(error.message || "Failed to reject post")
      }
    }
  }

  const handleTogglePin = async (post) => {
    if (!group || !group.id) {
      toast.error("Group information not available")
      return
    }

    const newPinnedState = !post.isPinned

    try {
      console.log(' Pin/Unpin attempt:', {
        groupId: group.id,
        postId: post.id,
        currentPinState: post.isPinned,
        newPinnedState,
        rawData: post._rawData
      })

      // Call API to update pin status
      const response = await api.groupPosts.pinPost(group.id, post.id, newPinnedState)
      
      console.log(' API Response:', response)
      
      // Optimistically update the UI with MULTIPLE pin properties for compatibility
      setApprovedPosts(prev => {
        const updated = prev.map(p => 
          p.id === post.id 
            ? { 
                ...p, 
                isPinned: newPinnedState,
                pinned: newPinnedState, // Backup property for compatibility
                _rawData: {
                  ...p._rawData,
                  isPinned: newPinnedState,
                  pinned: newPinnedState,
                  is_pinned: newPinnedState
                }
              }
            : p
        )
        
        // Re-sort with pinned posts first
        return updated.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1
          if (!a.isPinned && b.isPinned) return 1
          return new Date(b.created_at) - new Date(a.created_at)
        })
      })
      
      toast.success(
        newPinnedState 
          ? " Post pinned to top successfully!" 
          : "Post unpinned successfully!"
      )
      
      // Refresh posts after a short delay to ensure backend state is synced
      setTimeout(() => {
        console.log(' Refreshing posts to sync with backend...')
        loadAllPosts(group.id)
      }, 500)
      
    } catch (error) {
      console.error(' Failed to toggle pin:', error)
      
      if (error.message?.includes('404')) {
        toast.error("Post not found in this group. It may have been deleted.")
        setTimeout(() => {
          loadAllPosts(group.id)
        }, 1000)
      } else if (error.message?.includes('403')) {
        toast.error("Permission denied: You need admin privileges to pin posts")
      } else {
        toast.error(`Failed: ${error.message}`)
      }
      
      // Revert optimistic update on error
      loadAllPosts(group.id)
    }
  }

  const handleRemovePost = (post) => {
    setSelectedPost(post)
    setShowDeleteModal(true)
  }

  const confirmRemovePost = async () => {
    if (!selectedPost || !group || !group.id) {
      toast.error("Post or group information not available")
      return
    }

    try {
      console.log('Removing post:', selectedPost.id)
      
      await api.groupPosts.removeGroupPost(group.id, selectedPost.id)
      
      setPendingPosts(prev => prev.filter(p => p.id !== selectedPost.id))
      setApprovedPosts(prev => prev.filter(p => p.id !== selectedPost.id))
      
      toast.success("Post removed successfully!")
      setShowDeleteModal(false)
      setSelectedPost(null)
      
    } catch (error) {
      console.error("Failed to remove post:", error)
      
      if (error.message?.includes('403') || error.message?.includes('permission')) {
        toast.error("Permission denied: Cannot remove posts")
        loadGroupData()
      } else {
        toast.error(error.message || "Failed to remove post")
      }
    }
  }

  const getPostTypeBadge = (postType) => {
    switch (postType) {
      case "SCAM_REPORT":
        return (
          <Badge 
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
            className="ms-2 py-1 px-2 rounded-pill border-0"
            style={{ 
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: 'white',
              fontSize: '0.7rem'
            }}
          >
            <FaShieldAlt className="me-1" />
            Awareness
          </Badge>
        )
      case "QUESTION":
        return (
          <Badge 
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

  const getStatusBadge = (status) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge 
            className="ms-2 py-1 px-2 rounded-pill border-0"
            style={{ 
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: 'white',
              fontSize: '0.7rem'
            }}
          >
            <FaClock className="me-1" />
            Pending
          </Badge>
        )
      case "APPROVED":
        return (
          <Badge 
            className="ms-2 py-1 px-2 rounded-pill border-0"
            style={{ 
              background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              color: 'white',
              fontSize: '0.7rem'
            }}
          >
            <FaCheckCircle className="me-1" />
            Approved
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
            className="py-1 px-2 rounded-pill border-0"
            style={{ 
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: 'white',
              fontSize: '0.75rem'
            }}
          >
            <FaCrown className="me-1" />
            Admin
          </Badge>
        )
      case "MODERATOR":
        return (
          <Badge 
            className="py-1 px-2 rounded-pill border-0"
            style={{ 
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: 'white',
              fontSize: '0.75rem'
            }}
          >
            <FaShieldAlt className="me-1" />
            Moderator
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
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    } catch (error) {
      return ""
    }
  }

  const refreshData = async () => {
    await loadGroupData()
  }

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <Spinner animation="border" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                <p className="mt-4 text-muted fs-5">Loading moderation panel...</p>
              </div>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    )
  }

  if (accessDenied || !['ADMIN', 'MODERATOR'].includes(userRole)) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <div className="p-4 rounded-circle d-inline-flex mb-4" 
                     style={{ 
                       background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(185, 28, 28, 0.1) 100%)',
                       border: '2px solid rgba(220, 38, 38, 0.2)'
                     }}>
                  <FaLock className="text-danger" style={{ fontSize: "3rem" }} />
                </div>
                <h3 className="fw-bold mb-3">Access Denied</h3>
                <p className="text-muted mb-4">
                  You don't have permission to access the moderation panel.
                </p>
                <div className="d-flex gap-3 justify-content-center flex-wrap">
                  <Button
                    variant="outline-primary"
                    onClick={() => router.push(`/dashboard/groups/${params.groupId}`)}
                    className="px-4 py-3 rounded-pill"
                  >
                    <FaArrowLeft className="me-2" />
                    Back to Group
                  </Button>
                  <Button
                    variant="outline-secondary"
                    onClick={refreshData}
                    className="px-4 py-3 rounded-pill"
                  >
                    <FaSync className="me-2" />
                    Refresh Permissions
                  </Button>
                </div>
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
              <div className="d-flex justify-content-between align-items-center mb-4">
                <Button
                  variant="outline-primary"
                  onClick={() => router.push(`/dashboard/groups/${params.groupId}`)}
                  className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill border-0 shadow-sm"
                >
                  <FaArrowLeft />
                  <span>Back to Group</span>
                </Button>
                
                <Button
                  variant="outline-secondary"
                  onClick={refreshData}
                  className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill border-0 shadow-sm"
                >
                  <FaSync />
                  Refresh
                </Button>
              </div>

              <div className="text-center mb-5">
                <h1 className="fw-bold mb-2 display-5" style={{ color: "#2d3748" }}>
                  Group Moderation
                </h1>
                <p className="text-muted mb-0 fs-6">
                  Manage posts and join requests for {group?.name || 'the group'}
                </p>
                <div className="mt-3">
                  {getRoleBadge(userRole)}
                  <Badge 
                    className="ms-2 py-1 px-3 rounded-pill border-0"
                    style={{ 
                      background: group?.postApproval === "APPROVAL_REQUIRED" 
                        ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'
                        : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      color: 'white'
                    }}
                  >
                    {group?.postApproval === "APPROVAL_REQUIRED" ? "Approval Required" : "Auto-Approval"}
                  </Badge>
                  {group?.visibility === "PRIVATE" && (
                    <Badge 
                      className="ms-2 py-1 px-3 rounded-pill border-0"
                      style={{ 
                        background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
                        color: 'white'
                      }}
                    >
                      <FaLock className="me-1" />
                      Private Group
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <Row className="mb-4 g-4">
              <Col md={3}>
                <Card className="border-0 shadow-sm h-100 rounded-4">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <p className="text-muted mb-2 small fw-semibold">
                          Pending Posts
                        </p>
                        <h2 className="fw-bold mb-0 display-6" style={{ color: '#F59E0B' }}>{pendingPosts.length}</h2>
                      </div>
                      <div className="p-3 rounded-3" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                        <FaComment className="text-white" style={{ fontSize: "1.5rem" }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={3}>
                <Card className="border-0 shadow-sm h-100 rounded-4">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <p className="text-muted mb-2 small fw-semibold">
                          Join Requests
                        </p>
                        <h2 className="fw-bold mb-0 display-6" style={{ color: '#3B82F6' }}>{joinRequests.length}</h2>
                      </div>
                      <div className="p-3 rounded-3" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}>
                        <FaUserPlus className="text-white" style={{ fontSize: "1.5rem" }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={3}>
                <Card className="border-0 shadow-sm h-100 rounded-4">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <p className="text-muted mb-2 small fw-semibold">
                          Approved Posts
                        </p>
                        <h2 className="fw-bold mb-0 display-6" style={{ color: '#10B981' }}>{approvedPosts.length}</h2>
                      </div>
                      <div className="p-3 rounded-3" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
                        <FaCheckCircle className="text-white" style={{ fontSize: "1.5rem" }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>

              <Col md={3}>
                <Card className="border-0 shadow-sm h-100 rounded-4">
                  <Card.Body className="p-4">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <p className="text-muted mb-2 small fw-semibold">
                          Total Actions
                        </p>
                        <h2 className="fw-bold mb-0 display-6" style={{ color: '#667eea' }}>
                          {pendingPosts.length + joinRequests.length}
                        </h2>
                      </div>
                      <div className="p-3 rounded-3" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <FaClipboardCheck className="text-white" style={{ fontSize: "1.5rem" }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Tabs */}
            <Tabs
              activeKey={activeTab}
              onSelect={(k) => setActiveTab(k)}
              className="mb-4"
              fill
            >
              <Tab 
                eventKey="posts" 
                title={
                  <div className="d-flex align-items-center gap-2">
                    <FaComment />
                    <span>Posts Moderation</span>
                    {pendingPosts.length > 0 && (
                      <Badge pill bg="warning" className="ms-1">
                        {pendingPosts.length}
                      </Badge>
                    )}
                  </div>
                }
              >
                {/* Posts Moderation Content */}
                <div className="mt-4">
                  {/* Filter Card for Posts */}
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
                              placeholder="Search posts..."
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
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="py-3 border-0 bg-light rounded-pill"
                            style={{ fontSize: '0.95rem' }}
                          >
                            <option value="pending">Pending Review ({pendingPosts.length})</option>
                            <option value="approved">Approved Posts ({approvedPosts.length})</option>
                          </Form.Select>
                        </Col>

                        <Col md={2}>
                          <Button
                            variant="light"
                            className="w-100 rounded-pill shadow-sm border-0 py-3"
                            onClick={() => {
                              setSearchTerm("")
                              setStatusFilter("pending")
                            }}
                          >
                            <FaFilter className="me-2" />
                            Clear
                          </Button>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>

                  {/* Posts List */}
                  <Card className="border-0 shadow-sm rounded-4">
                    <Card.Body className="p-4">
                      {filteredPosts.length === 0 ? (
                        <div className="text-center py-5">
                          {statusFilter === "pending" ? (
                            <>
                              <FaCheckCircle className="text-success mb-3" style={{ fontSize: "3rem", opacity: 0.2 }} />
                              <h5 className="fw-semibold mb-3">No pending posts</h5>
                              <p className="text-muted">All posts have been reviewed!</p>
                            </>
                          ) : (
                            <>
                              <FaComment className="text-muted mb-3" style={{ fontSize: "3rem", opacity: 0.2 }} />
                              <h5 className="fw-semibold mb-3">No posts found</h5>
                              <p className="text-muted">
                                {searchTerm 
                                  ? "Try changing your search terms"
                                  : "No posts in this group yet"}
                              </p>
                            </>
                          )}
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-4">
                          {filteredPosts.map((post) => (
                            <Card key={post.id} className="border-0 shadow-sm rounded-4">
                              <Card.Body className="p-4">
                                <div className="d-flex justify-content-between align-items-start mb-3">
                                  <div className="d-flex align-items-start gap-3 flex-grow-1">
                                    <div 
                                      className="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0"
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
                                    <div className="flex-grow-1">
                                      <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                                        <h6 className="fw-semibold mb-0">{post.user.name}</h6>
                                        {getPostTypeBadge(post.postType)}
                                        {getStatusBadge(post.status)}
                                        {post.isPinned === true && (
                                          <Badge 
                                            className="py-1 px-2 rounded-pill border-0"
                                            style={{ 
                                              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                                              color: 'white',
                                              fontSize: '0.7rem'
                                            }}
                                          >
                                            <FaThumbtack className="me-1" />
                                            Pinned
                                          </Badge>
                                        )}
                                      </div>
                                      <small className="text-muted d-block mb-3">
                                        {formatDate(post.created_at)}
                                        {post.approved_at && post.status === 'APPROVED' && (
                                          <span className="ms-2">
                                            • Approved: {formatDate(post.approved_at)}
                                          </span>
                                        )}
                                      </small>
                                      
                                      <h5 className="fw-semibold mb-2">
                                        {post.title !== "Untitled Post" && post.title !== "No title" 
                                          ? post.title 
                                          : <span className="text-muted">Untitled Post</span>}
                                      </h5>
                                      
                                      <div className="mb-3">
                                        {post.content !== "No content provided" && post.content.trim() !== "" ? (
                                          <p className="mb-0" style={{ 
                                            display: '-webkit-box',
                                            WebkitLineClamp: 3,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden'
                                          }}>
                                            {post.content}
                                          </p>
                                        ) : (
                                          <Alert variant="light" className="mb-0 p-2 border-0">
                                            <FaInfoCircle className="me-2" />
                                            <span className="text-muted">No content provided</span>
                                          </Alert>
                                        )}
                                      </div>

                                      {/* Additional Post Information */}
                                      {(post.scamTypeId || post.lostAmount || post.companyName) && (
                                        <div className="mb-3">
                                          <div className="d-flex flex-wrap gap-2">
                                            {post.lostAmount && (
                                              <Badge bg="info" className="px-2 py-1">
                                                <FaFileAlt className="me-1" />
                                                Amount: {post.currency || 'USD'} {parseFloat(post.lostAmount).toFixed(2)}
                                              </Badge>
                                            )}
                                            {post.companyName && (
                                              <Badge bg="secondary" className="px-2 py-1">
                                                <FaFileAlt className="me-1" />
                                                Company: {post.companyName}
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                      )}

                                      {/* Images/Evidence - Improved Design */}
                                      {post.images && post.images.length > 0 ? (
                                        <div className="mb-3">
                                          <h6 className="fw-semibold mb-2">
                                            <FaImage className="me-2" />
                                            Evidence ({post.images.length})
                                          </h6>
                                          <div className="d-flex flex-wrap gap-2">
                                            {post.images.map((img, idx) => (
                                              <div 
                                                key={idx}
                                                className="position-relative"
                                                style={{ 
                                                  width: '120px', 
                                                  height: '120px',
                                                  borderRadius: '8px',
                                                  overflow: 'hidden'
                                                }}
                                              >
                                                <img
                                                  src={img}
                                                  alt={`Evidence ${idx + 1}`}
                                                  className="w-100 h-100 object-cover cursor-pointer"
                                                  onClick={() => window.open(img, '_blank')}
                                                  onError={(e) => {
                                                    e.target.src = 'https://via.placeholder.com/120x120?text=Image'
                                                  }}
                                                />
                                                <div 
                                                  className="position-absolute top-0 end-0 m-1 bg-dark bg-opacity-50 rounded-circle p-1 cursor-pointer"
                                                  onClick={() => window.open(img, '_blank')}
                                                >
                                                  <FaEye size={12} className="text-white" />
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="mb-3">
                                          <Alert variant="light" className="mb-0 p-2 border-0">
                                            <FaImage className="me-2" />
                                            <span className="text-muted">No images/evidence attached</span>
                                          </Alert>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  {/* Action Buttons */}
                                  <div className="d-flex gap-2 flex-wrap justify-content-end">
                                    {post.status === 'PENDING' ? (
                                      <>
                                        <Button
                                          variant="success"
                                          size="sm"
                                          onClick={() => handleApprovePost(post.id)}
                                          className="px-3 py-2 rounded-pill border-0"
                                        >
                                          <FaCheckCircle className="me-2" />
                                          Approve
                                        </Button>
                                        <Button
                                          variant="danger"
                                          size="sm"
                                          onClick={() => handleRejectPost(post)}
                                          className="px-3 py-2 rounded-pill border-0"
                                        >
                                          <FaTimesCircle className="me-2" />
                                          Reject
                                        </Button>
                                        <Button
                                          variant="outline-info"
                                          size="sm"
                                          onClick={() => viewPostDetails(post.id)}
                                          className="px-3 py-2 rounded-pill"
                                        >
                                          <FaEye className="me-2" />
                                          View
                                        </Button>
                                      </>
                                    ) : (
                                      <>
                                        <Button
                                          variant={post.isPinned ? "primary" : "outline-primary"}
                                          size="sm"
                                          onClick={() => handleTogglePin(post)}
                                          className="px-3 py-2 rounded-pill border-0"
                                        >
                                          <FaThumbtack className="me-2" />
                                          {post.isPinned ? 'Unpin' : 'Pin'}
                                        </Button>
                                        <Button
                                          variant="outline-danger"
                                          size="sm"
                                          onClick={() => handleRemovePost(post)}
                                          className="px-3 py-2 rounded-pill"
                                        >
                                          <FaTrash className="me-2" />
                                          Remove
                                        </Button>
                                        <Button
                                          variant="outline-info"
                                          size="sm"
                                          onClick={() => viewPostDetails(post.id)}
                                          className="px-3 py-2 rounded-pill"
                                        >
                                          <FaEye className="me-2" />
                                          View
                                        </Button>
                                      </>
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
                </div>
              </Tab>

              <Tab 
                eventKey="requests" 
                title={
                  <div className="d-flex align-items-center gap-2">
                    <FaUserPlus />
                    <span>Join Requests</span>
                    {joinRequests.length > 0 && (
                      <Badge pill bg="primary" className="ms-1">
                        {joinRequests.length}
                      </Badge>
                    )}
                  </div>
                }
              >
                {/* Join Requests Content */}
                <div className="mt-4">
                  {/* Filter Card for Requests */}
                  <Card className="border-0 shadow-sm mb-4 rounded-4">
                    <Card.Body className="p-4">
                      <Row className="g-3 align-items-center">
                        <Col md={10}>
                          <div className="position-relative">
                            <FaSearch
                              className="position-absolute text-muted"
                              style={{ left: "20px", top: "50%", transform: "translateY(-50%)", zIndex: 10 }}
                            />
                            <Form.Control
                              type="text"
                              placeholder="Search join requests by name, email, or notes..."
                              value={requestSearch}
                              onChange={(e) => setRequestSearch(e.target.value)}
                              className="ps-5 py-3 border-0 bg-light rounded-pill"
                              style={{ 
                                paddingLeft: "50px",
                                fontSize: '0.95rem'
                              }}
                            />
                          </div>
                        </Col>

                        <Col md={2}>
                          <Button
                            variant="light"
                            className="w-100 rounded-pill shadow-sm border-0 py-3"
                            onClick={() => setRequestSearch("")}
                          >
                            <FaFilter className="me-2" />
                            Clear
                          </Button>
                        </Col>
                      </Row>
                    </Card.Body>
                  </Card>

                  {/* Join Requests List */}
                  <Card className="border-0 shadow-sm rounded-4">
                    <Card.Body className="p-4">
                      {filteredRequests.length === 0 ? (
                        <div className="text-center py-5">
                          <FaUserFriends className="text-muted mb-3" style={{ fontSize: "3rem", opacity: 0.2 }} />
                          <h5 className="fw-semibold mb-3">
                            {requestSearch ? "No matching requests found" : "No join requests"}
                          </h5>
                          <p className="text-muted">
                            {requestSearch 
                              ? "Try changing your search terms"
                              : "No pending join requests for this group"}
                          </p>
                        </div>
                      ) : (
                        <div className="d-flex flex-column gap-3">
                          {filteredRequests.map((request) => (
                            <Card key={request.id} className="border-0 shadow-sm">
                              <Card.Body className="p-4">
                                <div className="d-flex justify-content-between align-items-start">
                                  <div className="d-flex align-items-center gap-3">
                                    <div 
                                      className="rounded-circle d-flex align-items-center justify-content-center"
                                      style={{ 
                                        width: '48px', 
                                        height: '48px',
                                        background: request.user.avatar 
                                          ? `url(${request.user.avatar})` 
                                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                        backgroundSize: 'cover',
                                        color: 'white'
                                      }}
                                    >
                                      {!request.user.avatar && <FaUser size={20} />}
                                    </div>
                                    <div>
                                      <h6 className="fw-semibold mb-1">
                                        {request.user.name}
                                      </h6>
                                      {request.user.email && (
                                        <small className="text-muted d-flex align-items-center gap-1">
                                          <FaEnvelope size={12} />
                                          {request.user.email}
                                        </small>
                                      )}
                                      <small className="text-muted d-block mt-1">
                                        Requested {formatDate(request.requested_at)}
                                      </small>
                                      {request.notes && (
                                        <Alert variant="info" className="mt-2 mb-0 p-2 small border-0">
                                          <FaInfoCircle className="me-1" />
                                          {request.notes}
                                        </Alert>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="d-flex gap-2">
                                    <Button
                                      variant="success"
                                      size="sm"
                                      onClick={() => handleApproveJoinRequest(request.id)}
                                      className="px-3 py-2 rounded-pill border-0"
                                    >
                                      <FaCheckCircle className="me-2" />
                                      Approve
                                    </Button>
                                    <Button
                                      variant="danger"
                                      size="sm"
                                      onClick={() => handleRejectJoinRequest(request.id)}
                                      className="px-3 py-2 rounded-pill border-0"
                                    >
                                      <FaTimesCircle className="me-2" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              </Card.Body>
                            </Card>
                          ))}
                        </div>
                      )}
                    </Card.Body>
                  </Card>
                </div>
              </Tab>
            </Tabs>
          </Col>
        </Row>
      </Container>

      {/* Post Details Modal */}
      <Modal 
        show={showPostDetailsModal} 
        onHide={() => setShowPostDetailsModal(false)} 
        centered 
        size="lg"
      >
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">Post Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPostForView && (
            <div>
              <div className="mb-4">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{ 
                      width: '48px', 
                      height: '48px',
                      background: selectedPostForView.user?.avatar 
                        ? `url(${selectedPostForView.user.avatar})` 
                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundSize: 'cover',
                      color: 'white'
                    }}
                  >
                    {!selectedPostForView.user?.avatar && <FaUser size={20} />}
                  </div>
                  <div>
                    <h6 className="fw-semibold mb-0">{selectedPostForView.user?.name || "Unknown User"}</h6>
                    <small className="text-muted">
                      Posted {formatDate(selectedPostForView.created_at)}
                      {selectedPostForView.approved_at && (
                        <span className="ms-2">• Approved {formatDate(selectedPostForView.approved_at)}</span>
                      )}
                    </small>
                  </div>
                </div>
                
                <div className="mb-4">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    {getPostTypeBadge(selectedPostForView.postType)}
                    {getStatusBadge(selectedPostForView.status)}
                  </div>
                  
                  <h4 className="fw-bold mb-3">
                    {selectedPostForView.title && selectedPostForView.title !== "Untitled Post" 
                      ? selectedPostForView.title 
                      : <span className="text-muted">Untitled Post</span>}
                  </h4>
                  
                  <div className="bg-light rounded-3 p-4 mb-3">
                    <p style={{ whiteSpace: 'pre-wrap' }}>
                      {selectedPostForView.content && selectedPostForView.content !== "No content provided"
                        ? selectedPostForView.content
                        : <span className="text-muted">No content provided</span>}
                    </p>
                  </div>
                </div>

                {/* Additional Information */}
                {(selectedPostForView.scamTypeId || selectedPostForView.lostAmount || selectedPostForView.companyName) && (
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-3">Additional Information</h6>
                    <Row className="g-3">
                      {selectedPostForView.lostAmount && (
                        <Col md={6}>
                          <Card className="border-0 bg-light">
                            <Card.Body className="p-3">
                              <small className="text-muted d-block">Amount Lost</small>
                              <div className="fw-bold">
                                {selectedPostForView.currency || 'USD'} {parseFloat(selectedPostForView.lostAmount).toFixed(2)}
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      )}
                      {selectedPostForView.companyName && (
                        <Col md={6}>
                          <Card className="border-0 bg-light">
                            <Card.Body className="p-3">
                              <small className="text-muted d-block">Company Involved</small>
                              <div className="fw-bold">{selectedPostForView.companyName}</div>
                            </Card.Body>
                          </Card>
                        </Col>
                      )}
                    </Row>
                  </div>
                )}

                {/* Images/Evidence - Improved Design */}
                {selectedPostForView.images && selectedPostForView.images.length > 0 ? (
                  <div className="mb-4">
                    <h6 className="fw-semibold mb-3">Evidence/Images ({selectedPostForView.images.length})</h6>
                    <Row className="g-3">
                      {selectedPostForView.images.map((img, idx) => (
                        <Col md={4} key={idx}>
                          <Card className="border-0">
                            <Card.Body className="p-0">
                              <div 
                                className="rounded-3 overflow-hidden position-relative"
                                style={{ 
                                  height: '150px',
                                  cursor: 'pointer'
                                }}
                                onClick={() => window.open(img, '_blank')}
                              >
                                <img
                                  src={img}
                                  alt={`Evidence ${idx + 1}`}
                                  className="w-100 h-100 object-cover"
                                  onError={(e) => {
                                    e.target.src = 'https://via.placeholder.com/300x150?text=Image'
                                  }}
                                />
                                <div className="position-absolute top-0 end-0 m-2 bg-dark bg-opacity-50 rounded-circle p-1">
                                  <FaEye size={12} className="text-white" />
                                </div>
                              </div>
                            </Card.Body>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  </div>
                ) : (
                  <Alert variant="light" className="border-0">
                    <FaImage className="me-2" />
                    <span className="text-muted">No images or evidence attached to this post</span>
                  </Alert>
                )}
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button 
            variant="light" 
            onClick={() => setShowPostDetailsModal(false)}
            className="px-4 rounded-pill"
          >
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Reject Post Modal */}
      <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold">Reject Post</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedPost && (
            <div>
              <Alert variant="warning" className="mb-3 border-0">
                <FaExclamationTriangle className="me-2" />
                Please provide a reason for rejecting this post.
              </Alert>
              
              <div className="mb-3">
                <p className="mb-1 fw-semibold">
                  <strong>Post:</strong> {selectedPost.title}
                </p>
                <p className="mb-1 fw-semibold">
                  <strong>Author:</strong> {selectedPost.user?.name || "Unknown User"}
                </p>
              </div>
              
              <Form.Group className="mb-3">
                <Form.Label className="fw-semibold">Rejection Reason *</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={4}
                  placeholder="Explain why this post is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="rounded-3 border-0 bg-light"
                  style={{ padding: '1rem' }}
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button 
            variant="light" 
            onClick={() => {
              setShowRejectModal(false)
              setRejectionReason("")
            }}
            className="px-4 rounded-pill"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmRejectPost}
            className="px-4 rounded-pill border-0"
            disabled={!rejectionReason.trim()}
          >
            <FaTimes className="me-2" />
            Reject Post
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Post Modal */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)} centered>
        <Modal.Header closeButton className="border-0">
          <Modal.Title className="fw-bold text-danger">Remove Post</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center py-3">
            <div className="mb-4">
              <div className="p-3 rounded-circle d-inline-flex" 
                   style={{ background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(185, 28, 28, 0.1) 100%)' }}>
                <FaTrash className="text-danger" style={{ fontSize: "2.5rem" }} />
              </div>
            </div>
            <h5 className="fw-semibold mb-3">Are you sure?</h5>
            {selectedPost && (
              <>
                <p className="text-muted mb-2">
                  You are about to permanently delete this post:
                </p>
                <div className="bg-light rounded-3 p-3 mb-3">
                  <p className="fw-semibold mb-1">{selectedPost.title}</p>
                  <small className="text-muted">by {selectedPost.user?.name}</small>
                </div>
                <p className="text-danger small mb-0">
                  This action cannot be undone. The post and all associated data will be permanently deleted.
                </p>
              </>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button 
            variant="light" 
            onClick={() => setShowDeleteModal(false)} 
            className="px-4 py-2 rounded-pill border-0 fw-medium"
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmRemovePost}
            className="px-4 py-2 rounded-pill border-0 fw-medium"
          >
            <FaTrash className="me-2" />
            Remove Post
          </Button>
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  )
}

export default GroupPostsModerationPage
