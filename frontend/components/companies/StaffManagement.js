'use client';

import { useState } from 'react';
import { Button, Form, Alert, Badge, ListGroup, Modal } from 'react-bootstrap';
import { FaPlus, FaTrash, FaSpinner, FaExclamationTriangle, FaCheckCircle } from 'react-icons/fa';
import { useAuth } from '../../lib/contexts/AuthContext';
import { toast } from 'react-toastify';

export default function StaffManagement({ companyId, staffList, onUpdate }) {
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EDITOR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { api, user } = useAuth();

  const handleAddStaff = async () => {
    if (!email) {
      setError('Please enter an email address');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await api.post(`/api/v1/companies/${companyId}/staff`, {
        userEmail: email.trim().toLowerCase(),
        role: role
      });
      
      console.log('Staff added successfully:', response.data);
      setSuccess(`Staff member added successfully as ${role}!`);
      setEmail('');
      setRole('EDITOR');
      
      // Refresh staff list
      setTimeout(() => {
        onUpdate();
        setShowModal(false);
      }, 1500);
    } catch (err) {
      console.error('Error adding staff:', err);
      let errorMessage = 'Failed to add staff member';
      
      if (err.response?.status === 404) {
        errorMessage = 'User not found with this email. User must be registered first.';
      } else if (err.response?.status === 409) {
        errorMessage = 'User is already a staff member of this company';
      } else if (err.response?.status === 403) {
        errorMessage = 'Only company administrators can add staff';
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStaff = async (staffId, userId, staffName) => {
    if (!window.confirm(`Are you sure you want to remove ${staffName} from staff?`)) {
      return;
    }

    try {
      await api.delete(`/api/v1/companies/${companyId}/staff/${userId}`);
      toast.success('Staff member removed successfully!');
      onUpdate();
    } catch (err) {
      console.error('Error removing staff:', err);
      const errorMessage = err.response?.data?.message || 
                         'Failed to remove staff member';
      
      toast.error(errorMessage);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && email) {
      handleAddStaff();
    }
  };

  const getRoleBadge = (role) => {
    const roleColors = {
      'OWNER': 'danger',
      'ADMIN': 'warning',
      'EDITOR': 'info',
      'STAFF': 'primary',
      'VIEWER': 'secondary'
    };
    
    return (
      <Badge bg={roleColors[role] || 'secondary'} className="px-2 py-1">
        {role}
      </Badge>
    );
  };

  return (
    <>
      <Button 
        variant="primary" 
        onClick={() => setShowModal(true)}
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none'
        }}
      >
        <FaPlus className="me-2" />
        Manage Staff
      </Button>

      <Modal show={showModal} onHide={() => setShowModal(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Manage Staff Members</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert 
              variant="danger" 
              dismissible 
              onClose={() => setError('')}
              className="border-0"
            >
              <FaExclamationTriangle className="me-2" />
              {error}
            </Alert>
          )}

          {success && (
            <Alert 
              variant="success" 
              dismissible 
              onClose={() => setSuccess('')}
              className="border-0"
            >
              <FaCheckCircle className="me-2" />
              {success}
            </Alert>
          )}

          <h6 className="fw-semibold mb-3">Add New Staff Member</h6>
          <div className="row g-2 mb-4">
            <div className="col-md-7">
              <Form.Control
                type="email"
                placeholder="Enter user's email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                isInvalid={!!error}
              />
              <Form.Text className="text-muted small">
                User must be registered on the platform
              </Form.Text>
            </div>
            <div className="col-md-3">
              <Form.Select 
                value={role} 
                onChange={(e) => setRole(e.target.value)}
                disabled={loading}
              >
                <option value="EDITOR">Editor</option>
                <option value="ADMIN">Admin</option>
              </Form.Select>
              <Form.Text className="text-muted small">
                Role permissions
              </Form.Text>
            </div>
            <div className="col-md-2">
              <Button 
                variant="primary" 
                onClick={handleAddStaff}
                disabled={loading || !email}
                className="w-100"
                style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none'
                }}
              >
                {loading ? (
                  <FaSpinner className="spin" />
                ) : (
                  'Add'
                )}
              </Button>
            </div>
          </div>

          <div className="mb-3">
            <small className="text-muted">
              <FaExclamationTriangle className="me-1" />
              <strong>Note:</strong> Only ADMIN and EDITOR roles are available. 
              Users must be registered on the platform before they can be added.
            </small>
          </div>

          <h6 className="fw-semibold mb-3">Current Staff ({staffList.length})</h6>
          {staffList.length === 0 ? (
            <div className="text-center py-3">
              <p className="text-muted">No staff members yet</p>
            </div>
          ) : (
            <ListGroup>
              {staffList.map((staff) => (
                <ListGroup.Item 
                  key={staff.id} 
                  className="d-flex justify-content-between align-items-center"
                >
                  <div>
                    <div className="fw-medium">{staff.userDisplayName || 'Unknown'}</div>
                    <small className="text-muted">{staff.userEmail}</small>
                    <div className="mt-1">
                      {getRoleBadge(staff.role)}
                      {staff.userId === user?.id && (
                        <Badge bg="primary" className="ms-2 px-2 py-1">
                          You
                        </Badge>
                      )}
                      {staff.role === 'OWNER' && (
                        <Badge bg="danger" className="ms-2 px-2 py-1">
                          Owner
                        </Badge>
                      )}
                    </div>
                  </div>
                  {staff.role !== 'OWNER' && staff.userId !== user?.id && (
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => handleRemoveStaff(staff.id, staff.userId, staff.userDisplayName || staff.userEmail)}
                      disabled={loading}
                      title="Remove Staff"
                    >
                      <FaTrash />
                    </Button>
                  )}
                </ListGroup.Item>
              ))}
            </ListGroup>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)} disabled={loading}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}