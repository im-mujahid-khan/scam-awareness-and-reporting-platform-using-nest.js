// src/app/companies/[id]/ManageStaffModal.js
'use client';

import { useState } from 'react';
import { 
  Modal, Alert, Button, Form, ListGroup, Badge 
} from 'react-bootstrap';
import { 
  FaExclamationTriangle, FaCheck, FaTrash, FaSpinner, FaUsers,
  FaUserTimes, FaExclamationCircle
} from 'react-icons/fa';
import { toast } from 'react-toastify';
import { useAuth } from '../../../../lib/contexts/AuthContext';

export default function ManageStaffModal({ 
  companyId, 
  companyName, 
  staffList, 
  onClose 
}) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('EDITOR');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [staffToDelete, setStaffToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
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
      const response = await api.companies.addStaff(companyId, {
        userEmail: email.trim().toLowerCase(),
        role: role
      });
      
      console.log('Staff added successfully:', response);
      setSuccess(`Staff member added successfully as ${role}!`);
      setEmail('');
      setRole('EDITOR');
      
      // Refresh staff list after 1.5 seconds
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err) {
      console.error('Error adding staff:', err);
      let errorMessage = 'Failed to add staff member';
      
      if (err.message?.includes('404')) {
        errorMessage = 'User not found with this email. User must be registered first.';
      } else if (err.message?.includes('409')) {
        errorMessage = 'User is already a staff member of this company';
      } else if (err.message?.includes('403')) {
        errorMessage = 'Only company administrators can add staff';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStaff = async () => {
    if (!staffToDelete) return;

    setDeleting(true);
    
    try {
      await api.companies.removeStaff(companyId, staffToDelete.userId);
      toast.success('Staff member removed successfully!');
      setShowDeleteConfirm(false);
      setStaffToDelete(null);
      onClose();
    } catch (err) {
      console.error('Error removing staff:', err);
      const errorMessage = err.message || 'Failed to remove staff member';
      toast.error(errorMessage);
    } finally {
      setDeleting(false);
    }
  };

  const confirmRemoveStaff = (staff) => {
    setStaffToDelete({
      id: staff.id,
      userId: staff.userId,
      name: staff.userDisplayName || staff.userEmail,
      email: staff.userEmail,
      role: staff.role
    });
    setShowDeleteConfirm(true);
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
      <Badge 
        bg={roleColors[role] || 'secondary'} 
        className="px-2 py-1 fw-medium"
      >
        {role}
      </Badge>
    );
  };

  return (
    <>
      <Modal.Header closeButton className="border-0 pb-2">
        <Modal.Title className="fw-bold" style={{ color: '#2d3748' }}>
          <div className="d-flex align-items-center">
            <div className="staff-modal-icon me-3">
              <FaUsers className="text-primary" size={20} />
            </div>
            <div>
              <div className="h5 mb-0">Manage Staff</div>
              <div className="text-muted small">{companyName}</div>
            </div>
          </div>
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body className="pt-0">
        {/* Error Alert */}
        {error && (
          <Alert 
            variant="danger" 
            dismissible 
            onClose={() => setError('')}
            className="border-0 rounded-pill mb-4"
            style={{ 
              background: 'rgba(220, 53, 69, 0.1)',
              border: '1px solid rgba(220, 53, 69, 0.2)'
            }}
          >
            <FaExclamationTriangle className="me-2" />
            {error}
          </Alert>
        )}

        {/* Success Alert */}
        {success && (
          <Alert 
            variant="success" 
            dismissible 
            onClose={() => setSuccess('')}
            className="border-0 rounded-pill mb-4"
            style={{ 
              background: 'rgba(40, 167, 69, 0.1)',
              border: '1px solid rgba(40, 167, 69, 0.2)'
            }}
          >
            <FaCheck className="me-2" />
            {success}
          </Alert>
        )}

        {/* Add New Staff Section */}
        <div className="add-staff-section mb-4">
          <h6 className="fw-semibold mb-3" style={{ color: '#4a5568' }}>
            Add New Staff Member
          </h6>
          
          <div className="bg-light rounded-3 p-4 mb-3">
            <div className="row g-3">
              <div className="col-md-7">
                <Form.Group>
                  <Form.Label className="fw-medium small mb-2">
                    User Email Address
                  </Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="Enter registered user's email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={loading}
                    isInvalid={!!error && !error.includes('Note')}
                    className="rounded-pill"
                    style={{
                      border: '1px solid #e2e8f0',
                      padding: '0.75rem 1rem'
                    }}
                  />
                  <Form.Text className="text-muted small mt-2 d-flex align-items-center">
                    <FaExclamationTriangle className="me-1" size={12} />
                    User must have an account on the platform
                  </Form.Text>
                </Form.Group>
              </div>
              
              <div className="col-md-3">
                <Form.Group>
                  <Form.Label className="fw-medium small mb-2">
                    Assign Role
                  </Form.Label>
                  <Form.Select 
                    value={role} 
                    onChange={(e) => setRole(e.target.value)}
                    disabled={loading}
                    className="rounded-pill"
                    style={{
                      border: '1px solid #e2e8f0',
                      padding: '0.75rem 1rem'
                    }}
                  >
                    <option value="EDITOR">Editor</option>
                    <option value="ADMIN">Admin</option>
                  </Form.Select>
                  <Form.Text className="text-muted small mt-2">
                    Permissions level
                  </Form.Text>
                </Form.Group>
              </div>
              
              <div className="col-md-2 d-flex align-items-end">
                <Button 
                  variant="primary" 
                  onClick={handleAddStaff}
                  disabled={loading || !email}
                  className="rounded-pill w-100 py-2"
                  style={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    border: 'none',
                    fontWeight: '600'
                  }}
                >
                  {loading ? (
                    <>
                      <FaSpinner className="spin me-2" />
                      Adding...
                    </>
                  ) : (
                    'Add Staff'
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Role Information */}
          <div className="role-info bg-white border rounded-3 p-3">
            <h6 className="fw-semibold small mb-2" style={{ color: '#4a5568' }}>
              Role Permissions:
            </h6>
            <div className="row g-2">
              <div className="col-md-6">
                <div className="d-flex align-items-center mb-2">
                  <Badge bg="warning" className="me-2 px-2 py-1">ADMIN</Badge>
                  <span className="small">Full company access</span>
                </div>
              </div>
              <div className="col-md-6">
                <div className="d-flex align-items-center mb-2">
                  <Badge bg="info" className="me-2 px-2 py-1">EDITOR</Badge>
                  <span className="small">Limited editing access</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Current Staff List */}
        <div className="current-staff-section">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h6 className="fw-semibold mb-0" style={{ color: '#4a5568' }}>
              Current Staff ({staffList.length})
            </h6>
            <Badge 
              bg="light" 
              text="dark"
              className="px-3 py-2 rounded-pill"
              style={{ border: '1px solid #e2e8f0' }}
            >
              <span className="fw-medium">{staffList.length}</span> members
            </Badge>
          </div>

          {staffList.length === 0 ? (
            <div className="text-center py-4 bg-light rounded-3">
              <div className="mb-3">
                <div className="empty-staff-icon mx-auto mb-3">
                  <FaUsers className="text-muted" size={40} />
                </div>
                <h6 className="fw-semibold mb-2">No Staff Members</h6>
                <p className="text-muted small mb-0">
                  Add staff members to collaborate on company management
                </p>
              </div>
            </div>
          ) : (
            <div className="staff-list-container">
              <ListGroup className="border-0">
                {staffList.map((staff) => (
                  <ListGroup.Item 
                    key={staff.id || staff.userId} 
                    className="border-0 mb-2 p-0"
                  >
                    <div className="staff-card border rounded-3 p-3">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="d-flex align-items-center">
                          <div className="staff-avatar me-3">
                            <div 
                              className="avatar-circle"
                              style={{
                                background: staff.userId === user?.id 
                                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                  : 'linear-gradient(135deg, #6c757d 0%, #495057 100%)'
                              }}
                            >
                              <span className="avatar-text">
                                {staff.userDisplayName?.charAt(0)?.toUpperCase() || 
                                 staff.userEmail?.charAt(0)?.toUpperCase() || 'U'}
                              </span>
                            </div>
                          </div>
                          
                          <div>
                            <div className="d-flex align-items-center mb-1">
                              <span className="fw-medium me-2">
                                {staff.userDisplayName || 'Unknown User'}
                              </span>
                              {staff.userId === user?.id && (
                                <Badge bg="primary" className="px-2 py-1 small">
                                  You
                                </Badge>
                              )}
                              {staff.role === 'OWNER' && (
                                <Badge bg="danger" className="ms-1 px-2 py-1 small">
                                  Owner
                                </Badge>
                              )}
                            </div>
                            
                            <div className="text-muted small mb-2">
                              {staff.userEmail}
                            </div>
                            
                            <div className="d-flex align-items-center gap-2">
                              {getRoleBadge(staff.role)}
                              <Badge 
                                bg={staff.isActive ? 'success' : 'secondary'} 
                                className="px-2 py-1"
                              >
                                {staff.isActive ? 'Active' : 'Inactive'}
                              </Badge>
                              <span className="text-muted small">
                                Joined {staff.joinedAt ? new Date(staff.joinedAt).toLocaleDateString() : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        {staff.role !== 'OWNER' && staff.userId !== user?.id && (
                          <Button 
                            variant="outline-danger" 
                            size="sm"
                            onClick={() => confirmRemoveStaff(staff)}
                            disabled={loading}
                            className="rounded-pill px-3"
                            title="Remove Staff"
                          >
                            <FaTrash size={14} />
                          </Button>
                        )}
                      </div>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </div>
          )}
        </div>
      </Modal.Body>
      
      <Modal.Footer className="border-0 pt-0">
        <Button 
          variant="light" 
          onClick={onClose}
          disabled={loading}
          className="rounded-pill px-4"
          style={{ border: '1px solid #e2e8f0' }}
        >
          Close
        </Button>
      </Modal.Footer>

      {/* Delete Confirmation Modal */}
      <Modal 
        show={showDeleteConfirm} 
        onHide={() => {
          setShowDeleteConfirm(false);
          setStaffToDelete(null);
        }}
        centered
        size="md"
      >
        <Modal.Header closeButton className="border-0 pb-2">
          <Modal.Title className="fw-bold" style={{ color: '#dc3545' }}>
            <div className="d-flex align-items-center">
              <div className="delete-confirm-icon me-3">
                <FaUserTimes size={24} />
              </div>
              <div>
                <div className="h5 mb-0">Remove Staff Member</div>
              </div>
            </div>
          </Modal.Title>
        </Modal.Header>
        
        <Modal.Body className="pt-0">
          {staffToDelete && (
            <div className="delete-confirm-content">
              <Alert 
                variant="danger" 
                className="border-0 rounded-pill mb-4"
                style={{ 
                  background: 'rgba(220, 53, 69, 0.1)',
                  border: '1px solid rgba(220, 53, 69, 0.2)'
                }}
              >
                <div className="d-flex align-items-center">
                  <FaExclamationCircle className="me-2" />
                  <span className="fw-medium">Warning: This action cannot be undone</span>
                </div>
              </Alert>
              
              <div className="staff-to-delete-info mb-4">
                <div className="text-center mb-4">
                  <div 
                    className="avatar-circle-large mx-auto mb-3"
                    style={{
                      background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                      width: '60px',
                      height: '60px'
                    }}
                  >
                    <span className="avatar-text-large">
                      {staffToDelete.name?.charAt(0)?.toUpperCase() || 
                       staffToDelete.email?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <h6 className="fw-bold mb-1">{staffToDelete.name}</h6>
                  <p className="text-muted small mb-2">{staffToDelete.email}</p>
                  <div className="d-flex justify-content-center gap-2">
                    {getRoleBadge(staffToDelete.role)}
                    <Badge bg="light" text="dark" className="px-2 py-1">
                      Staff Member
                    </Badge>
                  </div>
                </div>
                
                <div className="alert alert-warning border-0 rounded-3">
                  <div className="d-flex align-items-start">
                    <FaExclamationTriangle className="me-2 mt-1 text-warning" />
                    <div>
                      <p className="mb-2 small">
                        Are you sure you want to remove <strong>{staffToDelete.name}</strong> from staff?
                      </p>
                      <ul className="small text-muted mb-0 ps-3">
                        <li>They will lose access to company management</li>
                        <li>All their permissions will be revoked immediately</li>
                        <li>This action cannot be reversed</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        
        <Modal.Footer className="border-0">
          <Button 
            variant="light" 
            onClick={() => {
              setShowDeleteConfirm(false);
              setStaffToDelete(null);
            }}
            disabled={deleting}
            className="rounded-pill px-4"
            style={{ border: '1px solid #e2e8f0' }}
          >
            Cancel
          </Button>
          <Button 
            variant="danger" 
            onClick={handleRemoveStaff}
            disabled={deleting}
            className="rounded-pill px-4"
            style={{ 
              background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
              border: 'none'
            }}
          >
            {deleting ? (
              <>
                <FaSpinner className="spin me-2" />
                Removing...
              </>
            ) : (
              <>
                <FaTrash className="me-2" />
                Remove Staff
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <style jsx>{`
        .staff-modal-icon {
          width: 40px;
          height: 40px;
          background: rgba(102, 126, 234, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .delete-confirm-icon {
          width: 48px;
          height: 48px;
          background: rgba(220, 53, 69, 0.1);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #dc3545;
        }
        
        .avatar-circle {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .avatar-circle-large {
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .avatar-text {
          color: white;
          font-weight: bold;
          font-size: 1.1rem;
        }
        
        .avatar-text-large {
          color: white;
          font-weight: bold;
          font-size: 1.5rem;
        }
        
        .staff-card {
          transition: all 0.3s ease;
          background: white;
        }
        
        .staff-card:hover {
          border-color: #667eea !important;
          box-shadow: 0 4px 12px rgba(102, 126, 234, 0.1);
          transform: translateY(-2px);
        }
        
        .empty-staff-icon {
          width: 80px;
          height: 80px;
          background: #f8f9fa;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px dashed #dee2e6;
        }
        
        .role-info {
          border-left: 4px solid #667eea;
        }
        
        .add-staff-section {
          background: linear-gradient(135deg, #f8f9fa 0%, #f1f3f9 100%);
          border-radius: 12px;
          padding: 1.5rem;
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
          .staff-card {
            padding: 1rem !important;
          }
          
          .avatar-circle {
            width: 40px;
            height: 40px;
          }
          
          .avatar-text {
            font-size: 0.9rem;
          }
        }
        
        @media (max-width: 576px) {
          .add-staff-section {
            padding: 1rem;
          }
          
          .staff-modal-icon {
            width: 36px;
            height: 36px;
          }
          
          .delete-confirm-icon {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </>
  );
}