"use client"

import { useState, useEffect, useCallback } from "react"
import { 
  Card, 
  Button, 
  Badge, 
  Spinner, 
  Alert,
  Row,
  Col,
  Dropdown
} from "react-bootstrap"
import {
  FaUser,
  FaThumbsUp,
  FaComment,
  FaShare,
  FaTrash,
  FaExclamationTriangle,
  FaShieldAlt,
  FaQuestionCircle,
  FaEye,
  FaClock,
  FaGlobe,
  FaLock,
  FaEllipsisV,
  FaCheck,
  FaTimes,
  FaBan,
  FaStar,
  FaSync,
  FaThumbtack
} from "react-icons/fa"
import { toast } from "react-toastify"

const GroupPostsFeed = ({
  groupId,
  posts,
  setPosts,
  onDeletePost,
  user,
  api,
  groupInfo,
  userRole
}) => {
  const [loading, setLoading] = useState(false)
  const [showPendingOnly, setShowPendingOnly] = useState(false)
  const [processingAction, setProcessingAction] = useState(null)
  const [pinCache, setPinCache] = useState({}) // Cache for pin status

  // ✅ Load pin cache from localStorage on mount
  useEffect(() => {
    const savedPinCache = localStorage.getItem(`pinCache_${groupId}`)
    if (savedPinCache) {
      try {
        const parsed = JSON.parse(savedPinCache)
        console.log('📌 Loaded pin cache from localStorage:', parsed)
        setPinCache(parsed)
      } catch (error) {
        console.error('❌ Error loading pin cache:', error)
      }
    }
  }, [groupId])

  // ✅ Save pin cache to localStorage whenever it changes
  useEffect(() => {
    if (groupId && Object.keys(pinCache).length > 0) {
      localStorage.setItem(`pinCache_${groupId}`, JSON.stringify(pinCache))
      console.log('💾 Saved pin cache to localStorage:', pinCache)
    }
  }, [pinCache, groupId])

  // ✅ CRITICAL: Enhanced function to extract pin status from API response
  const extractPinStatus = useCallback((fullPostObject) => {
    const postId = String(fullPostObject?.post?.id || fullPostObject?.id || "")
    if (!postId) return false

    // 1. Check cache first (most reliable after pin/unpin actions)
    if (pinCache[postId] !== undefined) {
      console.log(`📌 [${postId}] Using cached status:`, pinCache[postId])
      return pinCache[postId]
    }

    // 2. Check the GroupPost junction data (THIS IS THE KEY!)
    // Your API response structure: { id: "groupPostId", pinned: true, post: {...} }
    if (fullPostObject.pinned === true || fullPostObject.pinned === 'true') {
      console.log(`📌 [${postId}] Found in GroupPost.pinned:`, true)
      setPinCache(prev => ({ ...prev, [postId]: true }))
      return true
    }

    // 3. Check nested post data
    const postData = fullPostObject.post || fullPostObject
    
    if (postData.pinned === true || postData.pinned === 'true') {
      console.log(`📌 [${postId}] Found in post.pinned:`, true)
      setPinCache(prev => ({ ...prev, [postId]: true }))
      return true
    }

    if (postData.isPinned === true || postData.isPinned === 'true') {
      console.log(`📌 [${postId}] Found in post.isPinned:`, true)
      setPinCache(prev => ({ ...prev, [postId]: true }))
      return true
    }

    // 4. Check metadata
    if (postData.metadata?.pinned === true || postData.metadata?.isPinned === true) {
      console.log(`📌 [${postId}] Found in metadata:`, true)
      setPinCache(prev => ({ ...prev, [postId]: true }))
      return true
    }

    console.log(`📌 [${postId}] No pin status found, defaulting to false`)
    return false
  }, [pinCache])

  const loadPosts = useCallback(async () => {
    if (!groupId) {
      console.error("❌ Group ID is required to load posts")
      return
    }

    try {
      setLoading(true)
      
      let response
      const isAdminOrModerator = userRole === 'ADMIN' || userRole === 'MODERATOR'
      
      if (isAdminOrModerator && showPendingOnly) {
        console.log("📥 Loading pending posts for admin/moderator")
        response = await api.groupPosts.getPendingPosts(groupId)
      } else if (isAdminOrModerator) {
        console.log("📥 Loading all posts for admin/moderator")
        response = await api.groupPosts.getGroupPosts(groupId, { 
          limit: 100,
          includePending: false
        })
      } else {
        console.log("📥 Loading approved posts for regular member")
        response = await api.groupPosts.getGroupFeed(groupId, { limit: 100 })
      }
      
      console.log("📦 Full API response:", response)
      
      let postsData = []
      
      if (Array.isArray(response)) {
        postsData = response
      } else if (response.data && Array.isArray(response.data)) {
        postsData = response.data
      } else if (response.posts && Array.isArray(response.posts)) {
        postsData = response.posts
      } else if (response.feed && Array.isArray(response.feed)) {
        postsData = response.feed
      }
      
      console.log(`✅ Extracted ${postsData.length} posts from API response`)
      
      const transformedPosts = postsData.map(fullPost => {
        if (!fullPost) return null
        
        // ✅ CRITICAL: Extract pin status from the FULL object (includes GroupPost data)
        const isPinned = extractPinStatus(fullPost)
        
        const postData = fullPost.post || fullPost
        const postId = String(postData.id || postData._id || "")
        
        const postUser = postData.user || postData.createdBy || postData.author || {}
        
        const userName = String(
          postUser.displayName || 
          postUser.name || 
          postUser.username ||
          postData.username ||
          "Unknown User"
        )
        
        const userAvatar = String(
          postUser.avatarUrl || 
          postUser.avatar || 
          postUser.profilePicture ||
          ""
        )
        
        const userId = String(
          postUser.id || 
          postUser._id ||
          postData.userId || 
          postData.authorId ||
          ""
        )
        
        const content = String(
          postData.description || 
          postData.content || 
          postData.text || 
          postData.body || 
          ""
        )
        
        const title = String(postData.title || "")
        
        let images = []
        if (postData.evidences && Array.isArray(postData.evidences)) {
          images = postData.evidences
            .filter(e => e.evidenceType === 'IMAGE' || e.type === 'image')
            .map(e => e.fileUrl || e.url || e.path || "")
            .filter(Boolean)
        } else if (postData.images && Array.isArray(postData.images)) {
          images = postData.images.filter(Boolean)
        } else if (postData.media && Array.isArray(postData.media)) {
          images = postData.media
            .filter(m => m.type === 'image' || m.mimeType?.startsWith('image/'))
            .map(m => m.url || m.path || m.fileUrl || "")
            .filter(Boolean)
        }
        
        images = images.filter(img => img && img.trim() !== '')
        
        const currentUserId = user?.id || user?._id
        const is_owner = Boolean(currentUserId && (
          userId === currentUserId ||
          postUser.id === currentUserId
        ))
        
        const status = String(
          postData.status || 
          postData.state || 
          postData.approvalStatus || 
          'PUBLISHED'
        )
        
        const shouldAppearInMainFeed = Boolean(postData.shouldAppearInMainFeed !== false)
        const visibility = String(
          postData.visibility || 
          (shouldAppearInMainFeed ? 'PUBLIC' : 'GROUP_ONLY')
        )
        
        return {
          id: postId,
          content: content,
          title: title,
          postType: String(postData.postType || postData.type || "GENERAL"),
          groupId: String(postData.groupId || groupId || ""),
          userId: userId,
          userName: userName,
          userAvatar: userAvatar,
          created_at: String(
            postData.createdAt || 
            postData.created_at || 
            postData.createdDate || 
            postData.timestamp || 
            new Date().toISOString()
          ),
          likes: Number(postData.reactionCount || postData.likes || postData.likeCount || 0),
          comments: Number(postData.commentCount || postData.comments || 0),
          is_liked: Boolean(postData.isLiked || false),
          images: images,
          is_owner: is_owner,
          isPinned: isPinned, // ✅ Use extracted pin status
          pinned: isPinned, // ✅ Backup property
          status: status,
          visibility: visibility,
          shouldAppearInMainFeed: shouldAppearInMainFeed,
          canModerate: isAdminOrModerator,
          _raw: fullPost // ✅ Store full original object
        }
      }).filter(Boolean)
      
      // ✅ Sort with pinned posts first
      const sortedPosts = transformedPosts.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return new Date(b.created_at) - new Date(a.created_at)
      })
      
      const pinnedCount = sortedPosts.filter(p => p.isPinned).length
      console.log(`✅ Loaded ${sortedPosts.length} posts, ${pinnedCount} pinned`)
      
      setPosts(sortedPosts)
    } catch (error) {
      console.error("❌ Failed to load posts:", error)
      toast.error(error.message || "Failed to load group posts")
    } finally {
      setLoading(false)
    }
  }, [groupId, userRole, showPendingOnly, api, user, extractPinStatus])

  useEffect(() => {
    if (groupId) {
      loadPosts()
    }
  }, [groupId, loadPosts])

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
      toast.error("Failed to update like")
    }
  }

  const handleApprovePost = async (postId) => {
    if (!window.confirm("Approve this post to make it visible to all group members?")) return
    
    try {
      setProcessingAction(postId)
      await api.groupPosts.approveGroupPost(groupId, postId)
      
      setPosts(posts.map(post => 
        post.id === postId ? { ...post, status: 'APPROVED' } : post
      ))
      
      toast.success("✅ Post approved successfully!")
    } catch (error) {
      console.error("Failed to approve post:", error)
      toast.error(error.message || "Failed to approve post")
    } finally {
      setProcessingAction(null)
    }
  }

  const handleRejectPost = async (postId) => {
    if (!window.confirm("Reject this post? It will be removed from the group.")) return
    
    try {
      setProcessingAction(postId)
      await api.groupPosts.rejectGroupPost(groupId, postId, "Post rejected by moderator")
      
      setPosts(posts.filter(post => post.id !== postId))
      
      toast.success("✅ Post rejected and removed")
    } catch (error) {
      console.error("Failed to reject post:", error)
      toast.error(error.message || "Failed to reject post")
    } finally {
      setProcessingAction(null)
    }
  }

  const handleTogglePinPost = async (postId, isCurrentlyPinned) => {
    try {
      setProcessingAction(postId)
      
      console.log(`📌 Toggling pin for post ${postId}: ${isCurrentlyPinned ? 'pinned' : 'not pinned'} → ${!isCurrentlyPinned ? 'pinned' : 'unpinned'}`)
      
      const response = await api.groupPosts.pinPost(groupId, postId, !isCurrentlyPinned)
      
      console.log("📦 Pin API response:", response)
      
      // ✅ Extract the actual pinned status from response
      const newPinnedStatus = response.data?.pinned ?? response.pinned ?? !isCurrentlyPinned
      console.log("✅ New pinned status from API:", newPinnedStatus)
      
      // ✅ Update cache immediately
      setPinCache(prev => {
        const updated = { ...prev, [postId]: newPinnedStatus }
        console.log('💾 Updating pin cache:', updated)
        return updated
      })
      
      // ✅ Update posts with new pin status
      setPosts(prevPosts => {
        const updatedPosts = prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                isPinned: newPinnedStatus,
                pinned: newPinnedStatus,
                _raw: {
                  ...post._raw,
                  pinned: newPinnedStatus,
                  post: {
                    ...post._raw.post,
                    pinned: newPinnedStatus
                  }
                }
              } 
            : post
        )
        
        // ✅ Re-sort with pinned posts first
        return updatedPosts.sort((a, b) => {
          if (a.isPinned && !b.isPinned) return -1
          if (!a.isPinned && b.isPinned) return 1
          return new Date(b.created_at) - new Date(a.created_at)
        })
      })
      
      toast.success(`✅ Post ${newPinnedStatus ? 'pinned' : 'unpinned'} successfully!`)
      
    } catch (error) {
      console.error("❌ Failed to toggle pin status:", error)
      toast.error(error.message || "Failed to update post")
      
      // ✅ Reload posts on error
      loadPosts()
    } finally {
      setProcessingAction(null)
    }
  }

  const handleToggleVisibility = async (postId, shouldAppearInMainFeed) => {
    if (groupInfo?.visibility === 'PRIVATE') {
      toast.error("Cannot change visibility in private groups")
      return
    }
    
    const action = shouldAppearInMainFeed ? 'remove from' : 'add to'
    if (!window.confirm(`Are you sure you want to ${action} the main feed?`)) return
    
    try {
      setProcessingAction(postId)
      
      await api.groupPosts.updatePostVisibility(groupId, postId, {
        shouldAppearInMainFeed: !shouldAppearInMainFeed
      })
      
      setPosts(posts.map(post => 
        post.id === postId ? { 
          ...post, 
          shouldAppearInMainFeed: !shouldAppearInMainFeed,
          visibility: !shouldAppearInMainFeed ? 'PUBLIC' : 'GROUP_ONLY'
        } : post
      ))
      
      toast.success(`✅ Post ${!shouldAppearInMainFeed ? 'added to' : 'removed from'} main feed!`)
    } catch (error) {
      console.error("Failed to update visibility:", error)
      toast.error(error.message || "Failed to update post visibility")
    } finally {
      setProcessingAction(null)
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

  const getPostTypeBadge = (postType) => {
    switch (postType) {
      case "SCAM_REPORT":
        return (
          <Badge 
            className="ms-2 py-1 px-2 rounded-pill"
            style={{ 
              background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)',
              color: 'white',
              fontSize: '0.75rem'
            }}
          >
            <FaExclamationTriangle className="me-1" size={10} />
            Scam Report
          </Badge>
        )
      case "SCAM_AWARENESS":
        return (
          <Badge 
            className="ms-2 py-1 px-2 rounded-pill"
            style={{ 
              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
              color: 'white',
              fontSize: '0.75rem'
            }}
          >
            <FaShieldAlt className="me-1" size={10} />
            Awareness
          </Badge>
        )
      case "QUESTION":
        return (
          <Badge 
            className="ms-2 py-1 px-2 rounded-pill"
            style={{ 
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              color: 'white',
              fontSize: '0.75rem'
            }}
          >
            <FaQuestionCircle className="me-1" size={10} />
            Question
          </Badge>
        )
      default:
        return null
    }
  }

  const getVisibilityBadge = (shouldAppearInMainFeed, groupVisibility) => {
    if (groupVisibility === 'PRIVATE') {
      return (
        <Badge 
          className="ms-2 py-1 px-2 rounded-pill"
          style={{ 
            background: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)',
            color: 'white',
            fontSize: '0.7rem'
          }}
        >
          <FaLock className="me-1" size={8} />
          Group Only
        </Badge>
      )
    }
    
    return shouldAppearInMainFeed ? (
      <Badge 
        className="ms-2 py-1 px-2 rounded-pill"
        style={{ 
          background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
          color: 'white',
          fontSize: '0.7rem'
        }}
      >
        <FaGlobe className="me-1" size={8} />
        Public
      </Badge>
    ) : (
      <Badge 
        className="ms-2 py-1 px-2 rounded-pill"
        style={{ 
          background: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
          color: 'white',
          fontSize: '0.7rem'
        }}
      >
        <FaEye className="me-1" size={8} />
        Group Only
      </Badge>
    )
  }

  const filteredPosts = showPendingOnly 
    ? posts.filter(post => post.status === 'PENDING')
    : posts.filter(post => post.status !== 'PENDING')

  const pendingCount = posts.filter(post => post.status === 'PENDING').length
  const pinnedCount = posts.filter(post => post.isPinned).length

  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3 text-muted">Loading posts...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="fw-bold mb-0">
            Group Feed
            {groupInfo?.visibility && (
              <Badge 
                bg={groupInfo.visibility === 'PRIVATE' ? 'secondary' : 'success'} 
                className="ms-2"
              >
                {groupInfo.visibility} GROUP
              </Badge>
            )}
          </h5>
          <small className="text-muted">
            {filteredPosts.length} {showPendingOnly ? 'pending' : 'published'} posts
            {pendingCount > 0 && !showPendingOnly && (
              <span className="ms-2">
                ({pendingCount} pending review)
              </span>
            )}
            {pinnedCount > 0 && (
              <span className="ms-2">
                • <FaThumbtack className="text-warning" size={12} /> {pinnedCount} pinned
              </span>
            )}
          </small>
        </div>
        
        <div className="d-flex gap-2">
          {(userRole === 'ADMIN' || userRole === 'MODERATOR') && pendingCount > 0 && (
            <Button
              variant={showPendingOnly ? "primary" : "outline-primary"}
              onClick={() => setShowPendingOnly(!showPendingOnly)}
              className="d-flex align-items-center gap-2"
            >
              <FaClock />
              {showPendingOnly ? "Show Published" : `View Pending (${pendingCount})`}
            </Button>
          )}
          
          <Button
            variant="outline-secondary"
            onClick={loadPosts}
            className="d-flex align-items-center gap-2"
            disabled={loading}
          >
            <FaSync />
            Refresh
          </Button>
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <Card className="border-0 shadow-sm rounded-4 text-center py-5">
          <Card.Body>
            {showPendingOnly ? (
              <>
                <FaClock className="text-muted mb-3" style={{ fontSize: "4rem", opacity: 0.2 }} />
                <h5 className="fw-semibold mb-3">No pending posts</h5>
                <p className="text-muted mb-0">All posts have been reviewed</p>
              </>
            ) : (
              <>
                <FaComment className="text-muted mb-3" style={{ fontSize: "4rem", opacity: 0.2 }} />
                <h5 className="fw-semibold mb-3">No posts yet</h5>
                <p className="text-muted mb-0">
                  {groupInfo?.visibility === 'PRIVATE' 
                    ? "Be the first to share something in this private group"
                    : "Be the first to share something in this group"}
                </p>
              </>
            )}
          </Card.Body>
        </Card>
      ) : (
        <div className="d-flex flex-column gap-4">
          {filteredPosts.map((post) => (
            <Card key={post.id} className="border-0 shadow-sm rounded-4">
              <Card.Body className="p-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="d-flex align-items-center gap-3">
                    <div 
                      className="rounded-circle d-flex align-items-center justify-content-center"
                      style={{ 
                        width: '48px', 
                        height: '48px',
                        background: post.userAvatar 
                          ? `url(${post.userAvatar}) center center/cover no-repeat` 
                          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        overflow: 'hidden'
                      }}
                    >
                      {!post.userAvatar && <FaUser size={20} />}
                    </div>
                    <div>
                      <div className="d-flex align-items-center flex-wrap gap-1">
                        <h6 className="fw-semibold mb-0">
                          {post.userName || "Unknown User"}
                        </h6>
                        {getPostTypeBadge(post.postType)}
                        {getVisibilityBadge(post.shouldAppearInMainFeed, groupInfo?.visibility)}
                        {post.isPinned && (
                          <Badge 
                            className="ms-2 py-1 px-2 rounded-pill"
                            style={{ 
                              background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                              color: 'white',
                              fontSize: '0.75rem'
                            }}
                          >
                            <FaThumbtack className="me-1" size={10} />
                            Pinned
                          </Badge>
                        )}
                        {post.status === 'PENDING' && (
                          <Badge bg="warning" className="ms-2">
                            <FaClock className="me-1" size={10} />
                            Pending Review
                          </Badge>
                        )}
                      </div>
                      <small className="text-muted">{formatDate(post.created_at)}</small>
                    </div>
                  </div>
                  
                  <div className="d-flex gap-1">
                    {post.is_owner && (
                      <Button
                        variant="light"
                        className="rounded-circle border-0 p-2"
                        onClick={() => onDeletePost(post.id)}
                        style={{ width: '32px', height: '32px' }}
                        disabled={processingAction === post.id}
                      >
                        <FaTrash size={12} className="text-danger" />
                      </Button>
                    )}
                    
                    {(post.canModerate || post.is_owner) && (
                      <Dropdown align="end">
                        <Dropdown.Toggle
                          variant="light"
                          className="rounded-circle border-0 p-2"
                          style={{ width: '32px', height: '32px' }}
                          disabled={processingAction === post.id}
                        >
                          <FaEllipsisV size={12} />
                        </Dropdown.Toggle>
                        
                        <Dropdown.Menu className="rounded-3 shadow-sm border-0">
                          {post.status === 'PENDING' && post.canModerate && (
                            <>
                              <Dropdown.Item 
                                onClick={() => handleApprovePost(post.id)}
                                className="d-flex align-items-center gap-2"
                                disabled={processingAction === post.id}
                              >
                                <FaCheck className="text-success" />
                                Approve Post
                              </Dropdown.Item>
                              <Dropdown.Item 
                                onClick={() => handleRejectPost(post.id)}
                                className="d-flex align-items-center gap-2 text-danger"
                                disabled={processingAction === post.id}
                              >
                                <FaTimes className="me-2" />
                                Reject Post
                              </Dropdown.Item>
                              <Dropdown.Divider />
                            </>
                          )}
                          
                          {post.canModerate && (
                            <Dropdown.Item 
                              onClick={() => handleTogglePinPost(post.id, post.isPinned)}
                              className="d-flex align-items-center gap-2"
                              disabled={processingAction === post.id}
                            >
                              <FaThumbtack className={post.isPinned ? "text-warning" : "text-muted"} />
                              {post.isPinned ? 'Unpin Post' : 'Pin Post'}
                            </Dropdown.Item>
                          )}
                          
                          {post.canModerate && groupInfo?.visibility === 'PUBLIC' && (
                            <Dropdown.Item 
                              onClick={() => handleToggleVisibility(post.id, post.shouldAppearInMainFeed)}
                              className="d-flex align-items-center gap-2"
                              disabled={processingAction === post.id}
                            >
                              {post.shouldAppearInMainFeed ? (
                                <>
                                  <FaBan className="text-warning" />
                                  Remove from Main Feed
                                </>
                              ) : (
                                <>
                                  <FaGlobe className="text-success" />
                                  Add to Main Feed
                                </>
                              )}
                            </Dropdown.Item>
                          )}
                          
                          {post.is_owner && (
                            <Dropdown.Item 
                              onClick={() => onDeletePost(post.id)}
                              className="d-flex align-items-center gap-2 text-danger"
                              disabled={processingAction === post.id}
                            >
                              <FaTrash />
                              Delete Post
                            </Dropdown.Item>
                          )}
                        </Dropdown.Menu>
                      </Dropdown>
                    )}
                  </div>
                </div>

                <div className="mb-4">
                  {post.title && post.title !== "No title" && (
                    <h5 className="fw-bold mb-2">{post.title}</h5>
                  )}
                  {post.content && post.content !== "No content" ? (
                    <p style={{ whiteSpace: 'pre-wrap' }}>{post.content}</p>
                  ) : (
                    <Alert variant="light" className="text-muted">
                      No content provided
                    </Alert>
                  )}
                  
                  {post.images && post.images.length > 0 && (
                    <div className="mt-3">
                      <h6 className="fw-semibold mb-2">
                        <FaEye className="me-2" />
                        Evidence ({post.images.length})
                      </h6>
                      <Row className="g-2">
                        {post.images.map((image, index) => (
                          <Col key={index} xs={6} md={4}>
                            <div 
                              className="rounded-3 overflow-hidden position-relative"
                              style={{ 
                                height: '150px',
                                cursor: 'pointer'
                              }}
                              onClick={() => window.open(image, '_blank')}
                            >
                              <img
                                src={image}
                                alt={`Evidence ${index + 1}`}
                                className="img-fluid w-100 h-100 object-cover"
                                onError={(e) => {
                                  e.target.onerror = null
                                  e.target.src = 'https://via.placeholder.com/300x150?text=Image'
                                }}
                              />
                              <div className="position-absolute top-0 end-0 m-2 bg-dark bg-opacity-50 rounded-circle p-1">
                                <FaEye size={12} className="text-white" />
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    </div>
                  )}
                </div>

                {post.status !== 'PENDING' && (
                  <div className="d-flex gap-2 border-top pt-3">
                    <Button
                      variant={post.is_liked ? "primary" : "light"}
                      className="flex-grow-1 rounded-pill py-2"
                      onClick={() => handleLikePost(post.id)}
                      disabled={processingAction === post.id}
                    >
                      <FaThumbsUp className="me-2" />
                      {post.likes}
                    </Button>
                    <Button variant="light" className="flex-grow-1 rounded-pill py-2">
                      <FaComment className="me-2" />
                      {post.comments}
                    </Button>
                    <Button variant="light" className="rounded-pill py-2 px-3">
                      <FaShare />
                    </Button>
                  </div>
                )}
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default GroupPostsFeed