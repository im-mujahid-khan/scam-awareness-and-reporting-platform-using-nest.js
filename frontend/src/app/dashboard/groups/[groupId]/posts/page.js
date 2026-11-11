// app/dashboard/groups/[groupId]/posts/page.js
"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  Container, Row, Col, Card, Button, Spinner, Tabs, Tab,
  Alert, Badge
} from "react-bootstrap"
import {
  FaArrowLeft,
  FaExclamationTriangle,
  FaShieldAlt,
  FaQuestionCircle,
  FaUser,
  FaSync,
  FaGlobe,
  FaLock,
  FaInfoCircle
} from "react-icons/fa"
import { useAuth } from "../../../../../../lib/contexts/AuthContext"
import DashboardLayout from "../../../../../../components/layout/DashboardLayout"
import GroupScamReportForm from "./components/GroupScamReportForm"
import GroupAwarenessForm from "./components/GroupAwarenessForm"
import GroupQuestionForm from "./components/GroupQuestionForm"
import GroupPostsFeed from "./components/GroupPostsFeed"
import ImageMaskingTool from "../../../../../../components/ImageMaskingTool" // Import the masking tool

const GroupPostsPage = () => {
  const params = useParams()
  const router = useRouter()
  const { user, api } = useAuth()

  const [activeTab, setActiveTab] = useState("feed")
  const [loading, setLoading] = useState(true)
  const [isMember, setIsMember] = useState(false)
  const [groupInfo, setGroupInfo] = useState(null)
  const [groupId, setGroupId] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [posts, setPosts] = useState([])
  const [scamTypes, setScamTypes] = useState([])
  const [companies, setCompanies] = useState([])
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [groupVisibility, setGroupVisibility] = useState("PUBLIC")

  // Image Masking State - Add these lines
  const [showImageMaskingTool, setShowImageMaskingTool] = useState(false)
  const [imageForMasking, setImageForMasking] = useState(null)
  const [maskingCallback, setMaskingCallback] = useState(null)
  const [isMaskingImage, setIsMaskingImage] = useState(false)

  useEffect(() => {
    if (params.groupId && user) {
      loadGroupInfo()
    }
  }, [params.groupId, user, refreshTrigger])

  const loadGroupInfo = async () => {
    try {
      setLoading(true)
      const response = await api.groups.getGroupBySlug(params.groupId)
      
      console.log("📊 Group Info Response:", response)
      
      setGroupInfo(response)
      setGroupId(response.id)
      setGroupVisibility(response.visibility || "PUBLIC")
      
      let detectedUserRole = null
      if (response.userRole) {
        detectedUserRole = response.userRole
      } else if (response.memberRole) {
        detectedUserRole = response.memberRole
      } else if (response.createdBy && response.createdBy.id === user?.id) {
        detectedUserRole = 'ADMIN'
      }
      
      setUserRole(detectedUserRole)
      
      const memberStatus = response.isMember || 
                          response.userRole !== null || 
                          response.memberRole !== null ||
                          (response.createdBy && response.createdBy.id === user?.id)
      
      setIsMember(memberStatus)
      
      // Load scam types
      try {
        const scamTypesRes = await api.getScamTypes()
        setScamTypes(scamTypesRes || [])
      } catch (error) {
        console.log("Could not load scam types:", error)
        setScamTypes([])
      }
      
      // Load companies
      await loadCompanies()
      
    } catch (error) {
      console.error("❌ Failed to load group info:", error)
      router.push('/dashboard/groups')
    } finally {
      setLoading(false)
    }
  }

  const loadCompanies = async () => {
    try {
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
        console.log("Trying alternative companies endpoint...")
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
      console.log("No companies found")
      setCompanies([])
    }
  }

  const refreshCompanies = async () => {
    await loadCompanies()
  }

  const shouldBypassApproval = () => {
    return userRole === 'ADMIN' || userRole === 'MODERATOR'
  }

  // Function to open image masking tool with callback - Add this function
  const openImageMaskingTool = (imageUrl, context, callback) => {
    setImageForMasking(imageUrl);
    setMaskingCallback(() => callback); // Store the callback function
    setIsMaskingImage(true);
    setShowImageMaskingTool(true);
  };

  // Function to handle saved masked image - Add this function
  const handleMaskedImageSave = (maskedImageData) => {
    console.log("Masked image data received:", maskedImageData);
    
    // If there's a callback function, call it with the masked image data
    if (maskingCallback && typeof maskingCallback === 'function') {
      maskingCallback(maskedImageData);
    }
    
    setIsMaskingImage(false);
    setShowImageMaskingTool(false);
    setMaskingCallback(null);
  };

  const handlePostCreated = async (newPost) => {
    console.log(" New post created:", newPost)
    
    // Log visibility info for debugging
    console.log(" Post visibility check:", {
      groupVisibility,
      newPostVisibility: newPost.visibility,
      shouldAppearInMainFeed: newPost.shouldAppearInMainFeed,
      isPrivateGroup: groupVisibility === 'PRIVATE'
    })
    
    // Refresh posts after creation
    setRefreshTrigger(prev => prev + 1)
    
    // Also add to local state immediately
    if (newPost) {
      setPosts(prev => [newPost, ...prev])
    }
  }

  const handleDeletePost = async (postId) => {
    if (!window.confirm("Are you sure you want to delete this post?")) return

    if (!groupId) return

    try {
      await api.groupPosts.removeGroupPost(groupId, postId)
      setPosts(posts.filter(post => post.id !== postId))
    } catch (error) {
      console.error("❌ Failed to delete post:", error)
    }
  }

  const handleRefreshPosts = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const getVisibilityInfo = () => {
    if (groupVisibility === 'PRIVATE') {
      return {
        icon: <FaLock />,
        badge: (
          <Badge bg="secondary" className="ms-2">
            <FaLock className="me-1" />
            Private Group
          </Badge>
        ),
        message: "Posts in this private group are only visible to members and will NOT appear in the main feed.",
        color: "#6B7280"
      }
    } else {
      return {
        icon: <FaGlobe />,
        badge: (
          <Badge bg="success" className="ms-2">
            <FaGlobe className="me-1" />
            Public Group
          </Badge>
        ),
        message: "Posts in this public group will appear in both group feed and main feed.",
        color: "#10B981"
      }
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <Spinner animation="border" variant="primary" />
                <p className="mt-4 text-muted fs-5">Loading group posts...</p>
              </div>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    )
  }

  const visibilityInfo = getVisibilityInfo()

  return (
    <DashboardLayout>
      <Container fluid className="py-4" style={{ background: '#f8f9fa', minHeight: '100vh' }}>
        <Row className="justify-content-center">
          <Col xl={10} lg={12}>
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
                  onClick={handleRefreshPosts}
                  className="d-flex align-items-center gap-2 px-3 py-2 rounded-pill border-0 shadow-sm"
                >
                  <FaSync />
                  <span>Refresh Posts</span>
                </Button>
              </div>

              <div className="text-center mb-5">
                <div className="d-flex align-items-center justify-content-center gap-3 mb-3">
                  <h1 className="fw-bold mb-0 display-5" style={{ color: "#2d3748" }}>
                    {groupInfo?.name || "Group Posts"}
                  </h1>
                  {visibilityInfo.badge}
                </div>
                
                <p className="text-muted mb-0 fs-6">
                  Share and discuss scam reports, awareness tips, and questions
                </p>
                
                {/* Visibility Alert */}
                <Alert 
                  variant="light" 
                  className="mt-3 d-inline-flex align-items-center gap-2 border-0"
                  style={{ 
                    background: groupVisibility === 'PRIVATE' 
                      ? 'rgba(107, 114, 128, 0.1)' 
                      : 'rgba(16, 185, 129, 0.1)',
                    border: `1px solid ${visibilityInfo.color}20`,
                    color: groupVisibility === 'PRIVATE' ? '#6B7280' : '#065F46'
                  }}
                >
                  <div className="d-flex align-items-center">
                    <FaInfoCircle className="me-2" />
                    <span>{visibilityInfo.message}</span>
                  </div>
                </Alert>
                
                {/* Show post approval status */}
                {groupInfo?.postApproval === "APPROVAL_REQUIRED" && (
                  <Alert variant="info" className="mt-3 d-inline-block">
                    <FaExclamationTriangle className="me-2" />
                    Posts require admin approval before appearing in the feed
                  </Alert>
                )}
              </div>
            </div>

            {/* Tabs for Create Post and Feed */}
            <Card className="border-0 shadow-sm mb-4 rounded-4">
              <Card.Body className="p-4">
                <Tabs
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k)}
                  className="mb-4 border-0"
                  fill
                >
                  <Tab 
                    eventKey="feed" 
                    title={
                      <div className="d-flex align-items-center justify-content-center py-2">
                        <FaUser className="me-2" />
                        <span>Group Feed</span>
                      </div>
                    }
                  >
                    <div className="pt-4">
                      <GroupPostsFeed 
                        groupId={groupId}
                        posts={posts}
                        setPosts={setPosts}
                        onDeletePost={handleDeletePost}
                        user={user}
                        api={api}
                        groupInfo={groupInfo}
                        userRole={userRole}
                      />
                    </div>
                  </Tab>

                  <Tab 
                    eventKey="scam-report" 
                    title={
                      <div className="d-flex align-items-center justify-content-center py-2">
                        <FaExclamationTriangle className="me-2" style={{ color: '#dc3545' }} />
                        <span>Report Scam</span>
                      </div>
                    }
                  >
                    <div className="pt-4">
                      {isMember ? (
                        <GroupScamReportForm
                          groupId={groupId}
                          groupInfo={groupInfo}
                          userRole={userRole}
                          shouldBypassApproval={shouldBypassApproval}
                          scamTypes={scamTypes}
                          companies={companies}
                          user={user}
                          api={api}
                          onPostCreated={handlePostCreated}
                          refreshCompanies={refreshCompanies}
                          openImageMaskingTool={openImageMaskingTool} // Pass the prop
                          isMaskingImage={isMaskingImage} // Pass the prop
                        />
                      ) : (
                        <div className="text-center py-5">
                          <FaUser className="text-muted mb-3" size={48} />
                          <h5>Join the group to create posts</h5>
                          <p className="text-muted">Only group members can create posts in this group.</p>
                        </div>
                      )}
                    </div>
                  </Tab>

                  <Tab 
                    eventKey="awareness" 
                    title={
                      <div className="d-flex align-items-center justify-content-center py-2">
                        <FaShieldAlt className="me-2" style={{ color: '#f59e0b' }} />
                        <span>Share Awareness</span>
                      </div>
                    }
                  >
                    <div className="pt-4">
                      {isMember ? (
                        <GroupAwarenessForm
                          groupId={groupId}
                          groupInfo={groupInfo}
                          userRole={userRole}
                          shouldBypassApproval={shouldBypassApproval}
                          companies={companies}
                          user={user}
                          api={api}
                          onPostCreated={handlePostCreated}
                          refreshCompanies={refreshCompanies}
                          openImageMaskingTool={openImageMaskingTool} // Pass the prop
                          isMaskingImage={isMaskingImage} // Pass the prop
                        />
                      ) : (
                        <div className="text-center py-5">
                          <FaUser className="text-muted mb-3" size={48} />
                          <h5>Join the group to create posts</h5>
                          <p className="text-muted">Only group members can create posts in this group.</p>
                        </div>
                      )}
                    </div>
                  </Tab>

                  <Tab 
                    eventKey="question" 
                    title={
                      <div className="d-flex align-items-center justify-content-center py-2">
                        <FaQuestionCircle className="me-2" style={{ color: '#3b82f6' }} />
                        <span>Ask Question</span>
                      </div>
                    }
                  >
                    <div className="pt-4">
                      {isMember ? (
                        <GroupQuestionForm
                          groupId={groupId}
                          groupInfo={groupInfo}
                          userRole={userRole}
                          shouldBypassApproval={shouldBypassApproval}
                          user={user}
                          api={api}
                          onPostCreated={handlePostCreated}
                          openImageMaskingTool={openImageMaskingTool} // Pass the prop
                          isMaskingImage={isMaskingImage} // Pass the prop
                        />
                      ) : (
                        <div className="text-center py-5">
                          <FaUser className="text-muted mb-3" size={48} />
                          <h5>Join the group to create posts</h5>
                          <p className="text-muted">Only group members can create posts in this group.</p>
                        </div>
                      )}
                    </div>
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Image Masking Tool Modal - Add this component */}
      <ImageMaskingTool
        imageUrl={imageForMasking}
        onSave={handleMaskedImageSave}
        onClose={() => {
          setShowImageMaskingTool(false);
          setIsMaskingImage(false);
          setMaskingCallback(null);
        }}
        show={showImageMaskingTool}
      />
    </DashboardLayout>
  )
}

export default GroupPostsPage