'use client';

import { useState, useRef } from 'react';
import { 
  Modal, Button, Spinner, Alert, ProgressBar, 
  Tab, Nav, Row, Col, Card, Form, InputGroup
} from 'react-bootstrap';
import { 
  FaUpload, FaImage, FaVideo, FaFile, FaPaperclip, 
  FaTimes, FaCamera, FaLink, FaCloudUploadAlt,
  FaSmile, FaStickyNote
} from 'react-icons/fa';

export default function MediaUpload({ 
  show, 
  onHide, 
  onSelect, 
  uploading = false 
}) {
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [caption, setCaption] = useState('');
  
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const handleFileSelect = (event, fileType = 'FILE') => {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;
    
    // Validate file sizes and types
    const validFiles = files.filter(file => {
      if (fileType === 'IMAGE') {
        const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        return validTypes.includes(file.type) && file.size <= maxSize;
      } else if (fileType === 'VIDEO') {
        const validTypes = ['video/mp4', 'video/webm', 'video/ogg'];
        const maxSize = 50 * 1024 * 1024; // 50MB
        return validTypes.includes(file.type) && file.size <= maxSize;
      } else {
        const maxSize = 25 * 1024 * 1024; // 25MB
        return file.size <= maxSize;
      }
    });

    if (validFiles.length !== files.length) {
      setError('Some files were rejected due to size or type restrictions.');
    }

    setSelectedFiles(prev => [...prev, ...validFiles.map(file => ({
      file,
      type: fileType,
      preview: fileType === 'IMAGE' ? URL.createObjectURL(file) : null,
      name: file.name,
      size: file.size
    }))]);

    // Clear input
    event.target.value = '';
  };

  const handleRemoveFile = (index) => {
    setSelectedFiles(prev => {
      const newFiles = [...prev];
      const removedFile = newFiles.splice(index, 1)[0];
      
      // Revoke object URL if it exists
      if (removedFile.preview) {
        URL.revokeObjectURL(removedFile.preview);
      }
      
      return newFiles;
    });
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      setError('Please select at least one file to upload');
      return;
    }

    setError(null);
    setUploadProgress(0);

    try {
      // Upload each file with caption
      for (const fileInfo of selectedFiles) {
        // Pass both the file and caption to parent component
        await onSelect(fileInfo.file, fileInfo.type, caption);
      }

      setUploadProgress(100);
      
      // Reset and close after success
      setTimeout(() => {
        resetAndClose();
      }, 500);

    } catch (error) {
      setError(error.message || 'Failed to upload files');
    }
  };

  const handleLinkSubmit = () => {
    if (!linkUrl.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    // Validate URL
    try {
      new URL(linkUrl);
      // Pass link with caption
      onSelect({ url: linkUrl, type: 'LINK' }, 'LINK', caption);
      resetAndClose();
    } catch {
      setError('Please enter a valid URL');
    }
  };

  const resetAndClose = () => {
    setSelectedFiles([]);
    setUploadProgress(0);
    setError(null);
    setLinkUrl('');
    setCaption('');
    setActiveTab('upload');
    onHide();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType) => {
    switch (fileType) {
      case 'IMAGE': return <FaImage className="text-primary" />;
      case 'VIDEO': return <FaVideo className="text-danger" />;
      default: return <FaFile className="text-secondary" />;
    }
  };

  return (
    <Modal 
      show={show} 
      onHide={!uploading ? resetAndClose : undefined}
      centered
      size="lg"
      backdrop={uploading ? 'static' : true}
    >
      <Modal.Header closeButton={!uploading} className="border-0">
        <Modal.Title className="fw-bold">
          <FaCloudUploadAlt className="me-2" />
          {selectedFiles.length > 0 ? `Send ${selectedFiles.length} File(s)` : 'Share Media'}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {uploading ? (
          <div className="text-center py-4">
            <Spinner animation="border" variant="primary" size="lg" />
            <h6 className="mt-3 fw-semibold">Uploading files...</h6>
            <ProgressBar 
              now={uploadProgress} 
              label={`${uploadProgress}%`}
              animated 
              className="mt-3"
              style={{ height: '8px' }}
            />
            <p className="text-muted small mt-2">
              {selectedFiles.length} file(s) being uploaded
            </p>
          </div>
        ) : (
          <>
            <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
              <Nav variant="pills" className="mb-4">
                <Nav.Item>
                  <Nav.Link eventKey="upload" className="d-flex align-items-center gap-2">
                    <FaUpload />
                    Upload Files
                  </Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="link" className="d-flex align-items-center gap-2">
                    <FaLink />
                    Add Link
                  </Nav.Link>
                </Nav.Item>
              </Nav>
              
              <Tab.Content>
                {/* Upload Files Tab */}
                <Tab.Pane eventKey="upload">
                  {error && (
                    <Alert variant="danger" className="d-flex align-items-center gap-2">
                      <FaTimes />
                      {error}
                    </Alert>
                  )}
                  
                  {/* File Type Buttons */}
                  {selectedFiles.length === 0 ? (
                    <Row className="g-3 mb-4">
                      <Col md={4}>
                        <Card 
                          className="text-center border-dashed hover-card"
                          style={{ cursor: 'pointer' }}
                          onClick={() => imageInputRef.current?.click()}
                        >
                          <Card.Body className="py-4">
                            <FaImage size={32} className="text-primary mb-3" />
                            <h6 className="fw-semibold mb-2">Images</h6>
                            <p className="text-muted small mb-0">
                              JPG, PNG, GIF, WEBP
                            </p>
                            <p className="text-muted small">Max 10MB</p>
                          </Card.Body>
                        </Card>
                        <input
                          ref={imageInputRef}
                          type="file"
                          accept="image/*"
                          multiple
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileSelect(e, 'IMAGE')}
                        />
                      </Col>
                      
                      <Col md={4}>
                        <Card 
                          className="text-center border-dashed hover-card"
                          style={{ cursor: 'pointer' }}
                          onClick={() => videoInputRef.current?.click()}
                        >
                          <Card.Body className="py-4">
                            <FaVideo size={32} className="text-danger mb-3" />
                            <h6 className="fw-semibold mb-2">Videos</h6>
                            <p className="text-muted small mb-0">
                              MP4, WebM, OGG
                            </p>
                            <p className="text-muted small">Max 50MB</p>
                          </Card.Body>
                        </Card>
                        <input
                          ref={videoInputRef}
                          type="file"
                          accept="video/*"
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileSelect(e, 'VIDEO')}
                        />
                      </Col>
                      
                      <Col md={4}>
                        <Card 
                          className="text-center border-dashed hover-card"
                          style={{ cursor: 'pointer' }}
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <Card.Body className="py-4">
                            <FaPaperclip size={32} className="text-secondary mb-3" />
                            <h6 className="fw-semibold mb-2">Files</h6>
                            <p className="text-muted small mb-0">
                              PDF, DOC, TXT, etc.
                            </p>
                            <p className="text-muted small">Max 25MB</p>
                          </Card.Body>
                        </Card>
                        <input
                          ref={fileInputRef}
                          type="file"
                          multiple
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileSelect(e, 'FILE')}
                        />
                      </Col>
                    </Row>
                  ) : (
                    // Show preview when files are selected
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="fw-semibold mb-0">
                          Preview ({selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''})
                        </h6>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => setSelectedFiles([])}
                          className="d-flex align-items-center gap-2"
                        >
                          <FaTimes />
                          Clear All
                        </Button>
                      </div>
                      
                      <div className="selected-files-preview mb-4">
                        {selectedFiles.map((fileInfo, index) => (
                          <Card key={index} className="mb-3 overflow-hidden">
                            <Card.Body className="p-0">
                              <div className="d-flex">
                                {/* Preview Section */}
                                <div className="preview-section" style={{ 
                                  width: '150px', 
                                  height: '150px',
                                  backgroundColor: '#f8f9fa',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0
                                }}>
                                  {fileInfo.preview ? (
                                    <img
                                      src={fileInfo.preview}
                                      alt={fileInfo.name}
                                      className="img-fluid h-100 w-100"
                                      style={{ objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <div className="text-center p-3">
                                      {getFileIcon(fileInfo.type)}
                                      <p className="small text-muted mt-2 mb-0">
                                        {fileInfo.type}
                                      </p>
                                    </div>
                                  )}
                                </div>
                                
                                {/* File Info Section */}
                                <div className="flex-grow-1 p-3">
                                  <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div style={{ maxWidth: '70%' }}>
                                      <h6 className="fw-semibold mb-1 text-truncate">
                                        {fileInfo.name}
                                      </h6>
                                      <p className="text-muted small mb-0">
                                        {formatFileSize(fileInfo.size)} • {fileInfo.type}
                                      </p>
                                    </div>
                                    <Button
                                      variant="link"
                                      className="text-danger p-0"
                                      onClick={() => handleRemoveFile(index)}
                                    >
                                      <FaTimes size={18} />
                                    </Button>
                                  </div>
                                  
                                  {/* Add caption for this specific file (like WhatsApp) */}
                                  <Form.Group className="mt-3">
                                    <Form.Label className="small text-muted mb-2">
                                      <FaStickyNote className="me-1" />
                                      Add caption (optional)
                                    </Form.Label>
                                    <Form.Control
                                      as="textarea"
                                      rows={2}
                                      placeholder={`Add caption for ${fileInfo.name}...`}
                                      className="border-light"
                                      style={{ fontSize: '0.9rem' }}
                                      onChange={(e) => {
                                        // For simplicity, we'll use the same caption for all files
                                        // In a more complex implementation, you could store captions per file
                                        setCaption(e.target.value);
                                      }}
                                    />
                                  </Form.Group>
                                </div>
                              </div>
                            </Card.Body>
                          </Card>
                        ))}
                      </div>
                      
                      {/* Global caption input */}
                      <Form.Group className="mb-3">
                        <Form.Label className="fw-semibold small mb-2">
                          <FaStickyNote className="me-2" />
                          Add a caption for all files
                        </Form.Label>
                        <InputGroup>
                          <Form.Control
                            as="textarea"
                            rows={3}
                            placeholder="Add a caption to your files (optional)..."
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                            className="border-2 rounded-3"
                            style={{ fontSize: '0.9rem' }}
                          />
                        </InputGroup>
                        <Form.Text className="text-muted">
                          This caption will be sent with your files
                        </Form.Text>
                      </Form.Group>
                    </div>
                  )}
                </Tab.Pane>
                
                {/* Add Link Tab */}
                <Tab.Pane eventKey="link">
                  {error && (
                    <Alert variant="danger" className="d-flex align-items-center gap-2">
                      <FaTimes />
                      {error}
                    </Alert>
                  )}
                  
                  <Form onSubmit={(e) => {
                    e.preventDefault();
                    handleLinkSubmit();
                  }}>
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">
                        Enter URL <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        className="border-2 rounded-3 py-3"
                        required
                      />
                      <Form.Text className="text-muted">
                        Enter a direct link to an image, video, or document
                      </Form.Text>
                    </Form.Group>
                    
                    <Form.Group className="mb-3">
                      <Form.Label className="fw-semibold">
                        <FaStickyNote className="me-2" />
                        Add caption (optional)
                      </Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        placeholder="Add a caption to your link..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="border-2 rounded-3"
                      />
                    </Form.Group>
                  </Form>
                </Tab.Pane>
              </Tab.Content>
            </Tab.Container>
          </>
        )}
      </Modal.Body>
      
      {!uploading && (
        <Modal.Footer className="border-0">
          <Button
            variant="outline-secondary"
            onClick={resetAndClose}
            className="px-4"
          >
            Cancel
          </Button>
          {activeTab === 'upload' ? (
            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={selectedFiles.length === 0}
              className="px-4 d-flex align-items-center gap-2"
            >
              <FaUpload />
              Send {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ''}
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleLinkSubmit}
              disabled={!linkUrl.trim()}
              className="px-4 d-flex align-items-center gap-2"
            >
              <FaLink />
              Send Link
            </Button>
          )}
        </Modal.Footer>
      )}
      
      <style jsx>{`
        .border-dashed {
          border: 2px dashed #dee2e6 !important;
          border-radius: 12px !important;
          transition: all 0.3s ease;
        }
        
        .hover-card:hover {
          border-color: #0d6efd !important;
          background-color: #f8f9fa;
          transform: translateY(-2px);
        }
        
        .selected-files-preview {
          max-height: 400px;
          overflow-y: auto;
        }
        
        .file-icon {
          flex-shrink: 0;
        }
        
        .preview-section {
          border-right: 1px solid #e9ecef;
        }
        
        @media (max-width: 768px) {
          .preview-section {
            width: 100px !important;
            height: 100px !important;
          }
        }
      `}</style>
    </Modal>
  );
}