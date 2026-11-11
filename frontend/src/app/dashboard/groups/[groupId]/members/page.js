"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { 
  Container, Row, Col, Card, Button, Badge, Spinner, Alert, 
  Modal, Form, Dropdown, Table, FormCheck 
} from "react-bootstrap"
import {
  FaArrowLeft,
  FaUsers,
  FaUser,
  FaCrown,
  FaShieldAlt,
  FaUserCheck,
  FaUserTimes,
  FaSearch,
  FaFilter,
  FaEnvelope,
  FaUserPlus,
  FaTrash,
  FaCog,
  FaHistory,
  FaExclamationTriangle,
  FaBan,
  FaCheckCircle,
  FaTimesCircle,
  FaUserTag,
  FaEye,
  FaKey,
  FaUserLock
} from "react-icons/fa"
import { useAuth } from "../../../../../../lib/contexts/AuthContext"
import { toast } from "react-toastify"
import DashboardLayout from "../../../../../../components/layout/DashboardLayout"

const GroupMembersPage = () => {
  const params = useParams()
  const router = useRouter()
  const { user, api } = useAuth()

  const [members, setMembers] = useState([])
  const [filteredMembers, setFilteredMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("all")
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [showModerationLogs, setShowModerationLogs] = useState(false)
  const [selectedMember, setSelectedMember] = useState(null)
  const [newRole, setNewRole] = useState("")
  const [userRole, setUserRole] = useState("")
  const [pendingRequests, setPendingRequests] = useState([])
  const [group, setGroup] = useState(null)
  const [moderationLogs, setModerationLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  useEffect(() => {
    loadGroupData()
  }, [params.groupId])

  useEffect(() => {
    filterMembers()
  }, [searchTerm, roleFilter, members])

  const loadGroupData = async () => {
    try {
      setLoading(true)
      
      const groupResponse = await api.groups.getGroupBySlug(params.groupId)
      
      const groupData = {
        id: groupResponse.id,
        name: groupResponse.name,
        user_role: groupResponse.userRole || groupResponse.memberRole,
        is_member: groupResponse.isMember || false,
        createdBy: groupResponse.createdBy
      }
      
      setGroup(groupData)
      // setUserRole(groupData.user_role)
      
      await loadMembers(groupData.id)
      
      if (groupData.user_role === "ADMIN" || groupData.user_role === "MODERATOR") {
        await loadPendingRequests(groupData.id)
      }
      
    } catch (error) {
      console.error("Failed to load group data:", error)
      toast.error(error.message || "Failed to load group data")
      
      if (error.message?.includes('404') || error.message?.includes('not found')) {
        router.push('/dashboard/groups')
      }
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async (groupId) => {
  try {
    const response = await api.groups.getGroupMembers(groupId)

    const membersData = Array.isArray(response)
      ? response
      : (response.members || response.data || [])

    const transformedMembers = membersData.map(member => ({
      id: member.id,
      user: {
        id: member.userId || member.user?.id,
        name: member.user?.displayName || "Unknown User",
        avatar: member.user?.avatarUrl
      },
      role: member.role,
      joined_at: member.joinedAt,
      status: member.status
    }))

    setMembers(transformedMembers)
    setFilteredMembers(transformedMembers)

    //  DETECT CURRENT USER ROLE HERE
    const me = transformedMembers.find(
      m => m.user.id === user?.id
    )

    if (me) {
      setUserRole(me.role)   // 🔥 THIS FIXES EVERYTHING
    }

  } catch (error) {
    console.error("Failed to load members:", error)
  }
}


  const loadPendingRequests = async (groupId) => {
    try {
      const response = await api.groups.getJoinRequests(groupId)
      
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

  const loadModerationLogs = async () => {
    try {
      setLoadingLogs(true)
      const logs = await api.groups.getModerationLogs(group.id, 1, 50)
      setModerationLogs(Array.isArray(logs) ? logs : (logs.data || logs.logs || []))
    } catch (error) {
      console.error("Failed to load moderation logs:", error)
      toast.error("Failed to load moderation logs")
    } finally {
      setLoadingLogs(false)
    }
  }

  const filterMembers = () => {
    let result = [...members]

    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(
        (member) => 
          member.user.name.toLowerCase().includes(term) || 
          (member.user.email && member.user.email.toLowerCase().includes(term))
      )
    }

    if (roleFilter !== "all") {
      result = result.filter((member) => member.role === roleFilter)
    }

    setFilteredMembers(result)
  }

  const getRoleBadge = (role) => {
    switch (role) {
      case "ADMIN":
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
            <FaCrown className="me-1" size={10} />
            Admin
          </Badge>
        )
      case "MODERATOR":
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
            <FaShieldAlt className="me-1" size={10} />
            Moderator
          </Badge>
        )
      case "MEMBER":
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
            <FaUserCheck className="me-1" size={10} />
            Member
          </Badge>
        )
      default:
        return (
          <Badge bg="secondary" className="py-1 px-2 rounded-pill">
            {role}
          </Badge>
        )
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

 const handleChangeRole = (member) => {
  if (!canManageRole(member)) {
    toast.error("You don't have permission to change this member's role")
    return
  }
  setSelectedMember(member)
  // Always set newRole to ADMIN since we're promoting to admin
  setNewRole("ADMIN")
  setShowRoleModal(true)
}

  const handleRemoveMember = (member) => {
    if (!canRemoveMember(member)) {
      toast.error("You don't have permission to remove this member")
      return
    }
    setSelectedMember(member)
    setShowRemoveModal(true)
  }

  const canManageRole = (member) => {
    if (!userRole || !member) return false
    
    // Admins can manage everyone except themselves and the creator
    if (userRole === "ADMIN") {
      // Can't change own role
      if (member.user.id === user?.id) return false
      
      // Check if member is the creator of the group
      const isCreator = group?.createdBy?.id === member.user.id
      if (isCreator) return false
      
      return true
    }
    
    // Moderators can't manage roles
    return false
  }

  const canRemoveMember = (member) => {
    if (!userRole || !member) return false
    
    // Can't remove yourself
    if (member.user.id === user?.id) return false
    
    // Check if member is the creator of the group
    const isCreator = group?.createdBy?.id === member.user.id
    if (isCreator) return false
    
    // Admins can remove everyone (except creator and themselves)
    if (userRole === "ADMIN") return true
    
    // Moderators can only remove members (not admins or other moderators)
    if (userRole === "MODERATOR" && member.role === "MEMBER") {
      return true
    }
    
    return false
  }

  const canAssignAdmin = () => {
    return userRole === "ADMIN"
  }

  const confirmChangeRole = async () => {
  if (!selectedMember || !newRole || !group) return

  try {
    // This should always be "ADMIN" for admin promotions
    if (newRole === "ADMIN") {
      await api.groups.assignAdminRole(group.id, selectedMember.user.id)
      
      // Update local state
      setMembers(members.map(member => 
        member.id === selectedMember.id 
          ? { ...member, role: "ADMIN" } // Hardcode to ADMIN here too
          : member
      ))
      
      toast.success(`Member promoted to Admin successfully!`)
      setShowRoleModal(false)
      setSelectedMember(null)
      setNewRole("")
      
      // Reload members
      await loadMembers(group.id)
    } else {
      toast.error(`Changing role to ${newRole} is not currently supported. Only ADMIN promotion is available.`)
    }
  } catch (error) {
    console.error("Failed to update role:", error)
    toast.error(error.message || "Failed to update role")
  }
}

  const confirmRemoveMember = async () => {
    if (!selectedMember || !group) return

    try {
      const reason = "Removed by admin"
      await api.groups.removeMember(group.id, selectedMember.user.id, reason)
      
      setMembers(members.filter(member => member.id !== selectedMember.id))
      
      toast.success("Member removed from group")
      setShowRemoveModal(false)
      setSelectedMember(null)
      
    } catch (error) {
      console.error("Failed to remove member:", error)
      toast.error(error.message || "Failed to remove member")
    }
  }

  const handleAcceptRequest = async (request) => {
    if (!group) return
    
    try {
      await api.groups.handleJoinRequest(group.id, request.id, { 
        action: 'APPROVE' 
      })
      
      setPendingRequests(pendingRequests.filter(req => req.id !== request.id))
      toast.success("Request accepted")
      
      await loadMembers(group.id)
      
    } catch (error) {
      console.error("Failed to accept request:", error)
      toast.error(error.message || "Failed to accept request")
    }
  }

  const handleRejectRequest = async (request) => {
    if (!group) return
    
    try {
      await api.groups.handleJoinRequest(group.id, request.id, { 
        action: 'REJECT' 
      })
      
      setPendingRequests(pendingRequests.filter(req => req.id !== request.id))
      toast.success("Request rejected")
      
    } catch (error) {
      console.error("Failed to reject request:", error)
      toast.error(error.message || "Failed to reject request")
    }
  }

  const handleViewModerationLogs = async () => {
    await loadModerationLogs()
    setShowModerationLogs(true)
  }

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <div className="py-5">
                <Spinner animation="border" variant="primary" style={{ width: "3rem", height: "3rem" }} />
                <p className="mt-4 text-muted fs-5">Loading group members...</p>
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
                  Group Members
                </h1>
                <p className="text-muted mb-0 fs-6">
                  Manage members and their roles in {group?.name || 'the group'}
                </p>
                {(userRole === "ADMIN" || userRole === "MODERATOR") && (
                  <div className="mt-3">
                    <Button
                      variant="outline-info"
                      className="rounded-pill px-4 py-2 me-2"
                      onClick={handleViewModerationLogs}
                    >
                      <FaHistory className="me-2" />
                      View Moderation Logs
                    </Button>
                  </div>
                )}
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
                          Total Members
                        </p>
                        <h2 className="fw-bold mb-0 display-6">{members.length}</h2>
                      </div>
                      <div className="p-3 rounded-3" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                        <FaUsers className="text-white" style={{ fontSize: "1.5rem" }} />
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
                          Admins
                        </p>
                        <h2 className="fw-bold mb-0 display-6" style={{ color: '#DC2626' }}>
                          {members.filter(m => m.role === "ADMIN").length}
                        </h2>
                      </div>
                      <div className="p-3 rounded-3" style={{ background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)' }}>
                        <FaCrown className="text-white" style={{ fontSize: "1.5rem" }} />
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
                          Moderators
                        </p>
                        <h2 className="fw-bold mb-0 display-6" style={{ color: '#F59E0B' }}>
                          {members.filter(m => m.role === "MODERATOR").length}
                        </h2>
                      </div>
                      <div className="p-3 rounded-3" style={{ background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }}>
                        <FaShieldAlt className="text-white" style={{ fontSize: "1.5rem" }} />
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
                          Pending Requests
                        </p>
                        <h2 className="fw-bold mb-0 display-6" style={{ color: '#3B82F6' }}>
                          {pendingRequests.length}
                        </h2>
                      </div>
                      <div className="p-3 rounded-3" style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)' }}>
                        <FaUserPlus className="text-white" style={{ fontSize: "1.5rem" }} />
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            </Row>

            {/* Pending Requests */}
            {pendingRequests.length > 0 && (userRole === "ADMIN" || userRole === "MODERATOR") && (
              <Card className="border-0 shadow-sm mb-4 rounded-4">
                <Card.Body className="p-4">
                  <h5 className="fw-semibold mb-3" style={{ color: "#2d3748" }}>
                    Pending Join Requests
                  </h5>
                  
                  <div className="table-responsive">
                    <Table hover className="mb-0">
                      <thead style={{ background: "#f8f9fa" }}>
                        <tr>
                          <th className="py-3 px-4 fw-semibold">User</th>
                          <th className="py-3 px-4 fw-semibold">Requested</th>
                          <th className="py-3 px-4 fw-semibold text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingRequests.map((request) => (
                          <tr key={request.id}>
                            <td className="py-3 px-4">
                              <div className="d-flex align-items-center gap-3">
                                <div 
                                  className="rounded-circle d-flex align-items-center justify-content-center"
                                  style={{ 
                                    width: '40px', 
                                    height: '40px',
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    color: 'white'
                                  }}
                                >
                                  <FaUser size={16} />
                                </div>
                                <div>
                                  <h6 className="fw-semibold mb-1">{request.user.name}</h6>
                                  <small className="text-muted">{request.user.email}</small>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-muted">{formatDate(request.requested_at)}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="d-flex gap-2 justify-content-end">
                                <Button
                                  variant="success"
                                  size="sm"
                                  className="px-3 py-2 rounded-pill border-0"
                                  onClick={() => handleAcceptRequest(request)}
                                  style={{ 
                                    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                                  }}
                                >
                                  <FaUserCheck className="me-2" />
                                  Accept
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  className="px-3 py-2 rounded-pill border-0"
                                  onClick={() => handleRejectRequest(request)}
                                  style={{ 
                                    background: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)'
                                  }}
                                >
                                  <FaUserTimes className="me-2" />
                                  Reject
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                </Card.Body>
              </Card>
            )}

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
                        placeholder="Search members..."
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
                      value={roleFilter}
                      onChange={(e) => setRoleFilter(e.target.value)}
                      className="py-3 border-0 bg-light rounded-pill"
                      style={{ fontSize: '0.95rem' }}
                    >
                      <option value="all">All Roles</option>
                      <option value="ADMIN">Admins</option>
                      <option value="MODERATOR">Moderators</option>
                      <option value="MEMBER">Members</option>
                    </Form.Select>
                  </Col>

                  <Col md={2}>
                    <Button
                      variant="light"
                      className="w-100 rounded-pill shadow-sm border-0 py-3"
                      onClick={() => {
                        setSearchTerm("")
                        setRoleFilter("all")
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

            {/* Members Table */}
            <Card className="border-0 shadow-sm rounded-4">
              <Card.Body className="p-0">
                <div className="table-responsive">
                  <Table hover className="mb-0">
                    <thead style={{ 
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)'
                    }}>
                      <tr>
                        <th className="py-4 px-4 fw-semibold" style={{ color: "#4a5568" }}>
                          Member
                        </th>
                        <th className="py-4 px-4 fw-semibold" style={{ color: "#4a5568" }}>
                          Role
                        </th>
                        <th className="py-4 px-4 fw-semibold" style={{ color: "#4a5568" }}>
                          Joined
                        </th>
                        <th className="py-4 px-4 fw-semibold text-end" style={{ color: "#4a5568" }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.length === 0 ? (
                        <tr>
                          <td colSpan="4" className="text-center py-5">
                            <div className="py-5">
                              <FaUsers className="text-muted mb-3" style={{ fontSize: "3rem", opacity: 0.2 }} />
                              <h5 className="fw-semibold mb-3" style={{ color: "#4a5568" }}>
                                No members found
                              </h5>
                              <p className="text-muted mb-4">
                                {searchTerm || roleFilter !== "all"
                                  ? "Try changing your filters"
                                  : "No members in this group"}
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredMembers.map((member) => {
                          const isCreator = group?.createdBy?.id === member.user.id
                          const canChangeRole = canManageRole(member)
                          const canRemove = canRemoveMember(member)
                          const isCurrentUser = member.user.id === user?.id
                          
                          return (
                            <tr 
                              key={member.id} 
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
                                <div className="d-flex align-items-center gap-3">
                                  <div 
                                    className="rounded-circle d-flex align-items-center justify-content-center"
                                    style={{ 
                                      width: '48px', 
                                      height: '48px',
                                      background: member.user.avatar 
                                        ? `url(${member.user.avatar})`
                                        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                      backgroundSize: 'cover',
                                      color: 'white'
                                    }}
                                  >
                                    {!member.user.avatar && <FaUser size={20} />}
                                  </div>
                                  <div>
                                    <h6 className="fw-semibold mb-1" style={{ color: "#2d3748" }}>
                                      {member.user.name}
                                      {isCurrentUser && (
                                        <Badge bg="primary" pill className="ms-2">You</Badge>
                                      )}
                                      {isCreator && (
                                        <Badge bg="warning" pill className="ms-2">
                                          <FaKey className="me-1" />
                                          Creator
                                        </Badge>
                                      )}
                                    </h6>
                                    {member.user.email && (
                                      <small className="text-muted d-flex align-items-center gap-1">
                                        <FaEnvelope size={12} />
                                        {member.user.email}
                                      </small>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4">
                                {getRoleBadge(member.role)}
                              </td>
                              <td className="py-4 px-4">
                                <span className="text-muted">{formatDate(member.joined_at)}</span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="d-flex gap-2 justify-content-end">
                                  {/* Make Admin Button - Only show for non-admins, non-creators, non-current user */}
                                  {userRole === "ADMIN" && member.role === "MEMBER" && !isCreator && !isCurrentUser && (
                                    <Button
                                      variant="outline-primary"
                                      size="sm"
                                      onClick={() => handleChangeRole(member)}
                                      className="px-3 py-2 rounded-pill border-0"
                                      style={{ 
                                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                        border: '1px solid #e9ecef',
                                        color: '#667eea'
                                      }}
                                    >
                                      <FaCrown className="me-2" />
                                      Make Admin
                                    </Button>
                                  )}
                                  
                                  {/* Already Admin - Show disabled state */}
                                  {userRole === "ADMIN" && member.role === "ADMIN" && !isCurrentUser && (
                                    <Button
                                      variant="outline-secondary"
                                      size="sm"
                                      className="px-3 py-2 rounded-pill border-0"
                                      style={{ 
                                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                        border: '1px solid #e9ecef',
                                        color: '#6b7280'
                                      }}
                                      disabled
                                      title="This member is already an admin"
                                    >
                                      <FaCrown className="me-2" />
                                      Admin
                                    </Button>
                                  )}
                                  
                                  {/* Creator Badge - No actions available */}
                                  {isCreator && (
                                    <Button
                                      variant="light"
                                      size="sm"
                                      className="px-3 py-2 rounded-pill border-0"
                                      style={{ 
                                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                        border: '1px solid #e9ecef'
                                      }}
                                      disabled
                                      title="Group creator - no actions available"
                                    >
                                      <FaKey className="me-2" />
                                      Creator
                                    </Button>
                                  )}
                                  
                                  {/* Remove Button */}
                                  {canRemove && (
                                    <Button
                                      variant="outline-danger"
                                      size="sm"
                                      onClick={() => handleRemoveMember(member)}
                                      className="px-3 py-2 rounded-pill border-0"
                                      style={{ 
                                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                        border: '1px solid #fecaca',
                                        color: '#dc2626'
                                      }}
                                    >
                                      <FaTrash className="me-2" />
                                      Remove
                                    </Button>
                                  )}
                                  
                                  {/* Moderator View Only */}
                                  {userRole === "MODERATOR" && !canRemove && !isCurrentUser && (
                                    <Button
                                      variant="light"
                                      size="sm"
                                      className="px-3 py-2 rounded-pill border-0"
                                      style={{ 
                                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                        border: '1px solid #e9ecef'
                                      }}
                                      disabled
                                      title="View only - no actions available"
                                    >
                                      <FaEye />
                                    </Button>
                                  )}
                                  
                                  {/* Regular Member View (no admin/moderator privileges) */}
                                  {!userRole && !isCurrentUser && (
                                    <Button
                                      variant="light"
                                      size="sm"
                                      className="px-3 py-2 rounded-pill border-0"
                                      style={{ 
                                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                                        border: '1px solid #e9ecef'
                                      }}
                                      disabled
                                    >
                                      <FaEye />
                                    </Button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </Table>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Change Role Modal */}
      <Modal show={showRoleModal} onHide={() => setShowRoleModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Promote to Admin</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedMember && (
            <div>
              <div className="mb-4">
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div 
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{ 
                      width: '48px', 
                      height: '48px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white'
                    }}
                  >
                    <FaUser size={20} />
                  </div>
                  <div>
                    <h6 className="fw-semibold mb-1">{selectedMember.user.name}</h6>
                    <small className="text-muted">{selectedMember.user.email}</small>
                  </div>
                </div>
                
                <Alert variant="warning" className="mt-3">
                  <FaExclamationTriangle className="me-2" />
                  <strong>Confirm Promotion</strong>
                  <p className="mb-0 mt-2">
                    Are you sure you want to promote <strong>{selectedMember.user.name}</strong> to Admin?
                    They will have full control over group settings and members.
                  </p>
                </Alert>
                
                <div className="mb-3">
                  <Form.Label className="fw-semibold mb-2">New Role</Form.Label>
                  <Form.Control
  type="text"
  value="ADMIN"
  readOnly
  className="py-3 rounded-3 bg-light"
/>
<Form.Text className="text-muted">
  This member will be promoted from {selectedMember.role} to Admin
</Form.Text>
                </div>
                
                <Alert variant="info" className="mt-3">
                  <small>
                    <strong>Admin Permissions:</strong><br />
                    • Full control over group settings<br />
                    • Can manage all members (promote, demote, remove)<br />
                    • Can approve/reject join requests<br />
                    • Can manage group posts<br />
                    • Can delete the group
                  </small>
                </Alert>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setShowRoleModal(false)} className="px-4 rounded-pill">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={confirmChangeRole}
            className="px-4 rounded-pill"
          >
            <FaCrown className="me-2" />
            Promote to Admin
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Remove Member Modal */}
      <Modal show={showRemoveModal} onHide={() => setShowRemoveModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Remove Member</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedMember && (
            <div className="text-center py-3">
              <FaUserTimes className="text-danger mb-3" style={{ fontSize: "3rem", opacity: 0.8 }} />
              <p className="mb-0">Are you sure you want to remove <strong>{selectedMember.user.name}</strong> from the group?</p>
              <p className="text-muted small mb-0 mt-2">
                This action cannot be undone. The member will lose access to all group content.
              </p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setShowRemoveModal(false)} className="px-4 rounded-pill">
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmRemoveMember}
            className="px-4 rounded-pill"
          >
            Remove Member
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Moderation Logs Modal */}
      <Modal show={showModerationLogs} onHide={() => setShowModerationLogs(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Moderation Logs</Modal.Title>
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
              <Table hover>
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
                              log.action === 'ASSIGN_ADMIN' ? 'warning' : 'info'}
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
              </Table>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="light" onClick={() => setShowModerationLogs(false)} className="px-4 rounded-pill">
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  )
}

export default GroupMembersPage