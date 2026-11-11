'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Container, Row, Col, Card, Spinner, Alert, Button,
  Table, Badge, Modal, Form
} from 'react-bootstrap';
import {
  FaBan, FaCheckCircle, FaUserCircle, FaTrash, FaArrowLeft,
  FaSearch, FaFilter, FaExclamationTriangle
} from 'react-icons/fa';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../../lib/contexts/AuthContext';
import { toast } from 'react-toastify';

export default function BlockedUsers() {
  const router = useRouter();
  const { api } = useAuth();
  
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [unblocking, setUnblocking] = useState(false);
  const [error, setError] = useState(null);

  // Load blocked users
  const loadBlockedUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.messaging.getBlockedUsers();
      const users = Array.isArray(response) ? response : response?.data || response?.users || [];
      
      console.log('🚫 Blocked users:', users);
      setBlockedUsers(users);
      setFilteredUsers(users);
      
    } catch (error) {
      console.error('Failed to load blocked users:', error);
      setError('Failed to load blocked users');
      toast.error('Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  // Filter users based on search
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(blockedUsers);
      return;
    }

    const term = searchTerm.toLowerCase().trim();
    const filtered = blockedUsers.filter(user => {
      const displayName = (user.displayName || '').toLowerCase();
      const email = (user.email || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      
      return displayName.includes(term) || 
             email.includes(term) || 
             username.includes(term);
    });
    
    setFilteredUsers(filtered);
  }, [searchTerm, blockedUsers]);

  // Handle unblock
  const handleUnblockUser = async () => {
    if (!selectedUser) return;
    
    try {
      setUnblocking(true);
      
      await api.messaging.unblockUser(selectedUser.id);
      
      toast.success('User unblocked successfully');
      
      // Update local state
      setBlockedUsers(prev => prev.filter(user => user.id !== selectedUser.id));
      
      closeUnblockModal();
      
    } catch (error) {
      console.error('Failed to unblock user:', error);
      toast.error('Failed to unblock user: ' + (error.response?.data?.message || error.message));
    } finally {
      setUnblocking(false);
    }
  };

  const openUnblockModal = (user) => {
    setSelectedUser(user);
    setShowUnblockModal(true);
  };

  const closeUnblockModal = () => {
    setShowUnblockModal(false);
    setSelectedUser(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'Invalid Date';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <Container className="py-5">
          <Row className="justify-content-center">
            <Col md={8} className="text-center">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3 text-muted">Loading blocked users...</p>
            </Col>
          </Row>
        </Container>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Container className="py-4">
        {/* Header */}
        <Row className="mb-4">
          <Col>
            <div className="d-flex align-items-center justify-content-between mb-3">
              <div className="d-flex align-items-center gap-3">
                <Button
                  variant="link"
                  onClick={() => router.back()}
                  className="p-0 text-secondary"
                >
                  <FaArrowLeft size={20} />
                </Button>
                <div>
                  <h3 className="fw-bold mb-0">Blocked Users</h3>
                  <p className="text-muted mb-0">
                    Manage users you've blocked from messaging you
                  </p>
                </div>
              </div>
              <Badge bg="danger" className="fs-6 px-3 py-2">
                {blockedUsers.length} Blocked
              </Badge>
            </div>
          </Col>
        </Row>

        {/* Search Bar */}
        <Row className="mb-4">
          <Col md={6}>
            <div className="position-relative">
              <div className="position-absolute top-50 start-0 translate-middle-y ps-3">
                <FaSearch className="text-muted" />
              </div>
              <Form.Control
                type="text"
                placeholder="Search blocked users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="ps-5"
                style={{ height: '48px' }}
              />
            </div>
          </Col>
          <Col md={6} className="d-flex justify-content-end">
            <Button
              variant="outline-secondary"
              onClick={loadBlockedUsers}
              className="d-flex align-items-center gap-2"
            >
              <FaFilter />
              Refresh
            </Button>
          </Col>
        </Row>

        {error && (
          <Row className="mb-4">
            <Col>
              <Alert variant="warning" className="d-flex align-items-center gap-2">
                <FaExclamationTriangle />
                {error}
              </Alert>
            </Col>
          </Row>
        )}

        {/* Blocked Users List */}
        {filteredUsers.length > 0 ? (
          <Card className="shadow-sm border-0">
            <Card.Body className="p-0">
              <Table hover responsive className="mb-0">
                <thead className="bg-light">
                  <tr>
                    <th className="border-0 ps-4">User</th>
                    <th className="border-0">Blocked On</th>
                    <th className="border-0">Reason</th>
                    <th className="border-0 text-end pe-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => (
                    <tr key={user.id} className="align-middle">
                      <td className="ps-4">
                        <div className="d-flex align-items-center gap-3">
                          <div className="position-relative">
                            {user.avatarUrl ? (
                              <img
                                src={user.avatarUrl}
                                alt={user.displayName}
                                className="rounded-circle"
                                style={{ width: '40px', height: '40px', objectFit: 'cover' }}
                              />
                            ) : (
                              <div className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                                style={{ width: '40px', height: '40px' }}>
                                <FaUserCircle size={20} className="text-secondary" />
                              </div>
                            )}
                          </div>
                          <div>
                            <h6 className="fw-semibold mb-1 d-flex align-items-center gap-2">
                              {user.displayName || user.email?.split('@')[0]}
                              {user.verifiedAt && (
                                <FaCheckCircle size={12} className="text-info" title="Verified User" />
                              )}
                            </h6>
                            <small className="text-muted">
                              {user.email}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div>
                          <div className="fw-medium">{formatDate(user.blockedAt)}</div>
                          {user.expiresAt && (
                            <small className="text-muted">
                              Expires: {formatDate(user.expiresAt)}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <Badge bg="danger" className="fw-normal">
                          {user.blockReason || 'Not specified'}
                        </Badge>
                      </td>
                      <td className="text-end pe-4">
                        <Button
                          variant="outline-success"
                          size="sm"
                          onClick={() => openUnblockModal(user)}
                          className="px-3"
                        >
                          Unblock
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        ) : (
          <Card className="shadow-sm border-0">
            <Card.Body className="text-center py-5">
              <div className="mb-3">
                <FaBan className="text-muted" size={48} />
              </div>
              <h5 className="fw-semibold mb-2">No blocked users</h5>
              <p className="text-muted mb-4">
                {searchTerm ? 'No blocked users match your search' : 'You haven\'t blocked any users yet'}
              </p>
              {searchTerm && (
                <Button
                  variant="outline-primary"
                  onClick={() => setSearchTerm('')}
                >
                  Clear Search
                </Button>
              )}
            </Card.Body>
          </Card>
        )}

        {/* Empty state message */}
        {!searchTerm && blockedUsers.length === 0 && (
          <Row className="mt-4">
            <Col>
              <Alert variant="info">
                <h6 className="fw-semibold">About Blocking</h6>
                <p className="mb-0">
                  When you block a user, they won't be able to:
                </p>
                <ul className="mb-0">
                  <li>Send you new messages</li>
                  <li>See your online status</li>
                  <li>Start new conversations with you</li>
                </ul>
                <p className="mb-0 mt-2">
                  You can always unblock users from this page.
                </p>
              </Alert>
            </Col>
          </Row>
        )}
      </Container>

      {/* Unblock Confirmation Modal */}
      <Modal show={showUnblockModal} onHide={closeUnblockModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>Unblock User</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <div className="text-center">
              <div className="mb-4">
                {selectedUser.avatarUrl ? (
                  <img
                    src={selectedUser.avatarUrl}
                    alt={selectedUser.displayName}
                    className="rounded-circle mb-3"
                    style={{ width: '80px', height: '80px', objectFit: 'cover' }}
                  />
                ) : (
                  <div className="rounded-circle bg-light d-flex align-items-center justify-content-center mx-auto mb-3"
                    style={{ width: '80px', height: '80px' }}>
                    <FaUserCircle size={40} className="text-secondary" />
                  </div>
                )}
                <h5 className="fw-bold mb-1">{selectedUser.displayName || selectedUser.email?.split('@')[0]}</h5>
                <p className="text-muted mb-3">{selectedUser.email}</p>
                <Badge bg="danger" className="fs-6 px-3 py-1">
                  Blocked for: {selectedUser.blockReason || 'Not specified'}
                </Badge>
              </div>
              
              <Alert variant="info">
                <strong>Note:</strong> Unblocking this user will allow them to:
                <ul className="mb-0 mt-2">
                  <li>Send you new messages</li>
                  <li>See your online status</li>
                  <li>Start new conversations with you</li>
                </ul>
              </Alert>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeUnblockModal}>
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={handleUnblockUser}
            disabled={unblocking}
          >
            {unblocking ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Unblocking...
              </>
            ) : (
              'Confirm Unblock'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </DashboardLayout>
  );
}