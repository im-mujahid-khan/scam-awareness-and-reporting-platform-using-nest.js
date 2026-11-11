import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { AlertTriangle } from 'lucide-react';

const ReportCommentModal = ({ show, onHide, onSubmit, commentId }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reportReasons = [
    { value: 'SPAM', label: 'Spam or misleading' },
    { value: 'HARASSMENT', label: 'Harassment or bullying' },
    { value: 'HATE_SPEECH', label: 'Hate speech or discrimination' },
    { value: 'VIOLENCE', label: 'Violence or threats' },
    { value: 'MISINFORMATION', label: 'False information' },
    { value: 'INAPPROPRIATE', label: 'Inappropriate content' },
    { value: 'OTHER', label: 'Other (please specify)' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason || submitting) return;

    try {
      setSubmitting(true);
      await onSubmit({
        commentId,
        reason,
        details: details.trim()
      });
      
      // Reset form
      setReason('');
      setDetails('');
      onHide();
    } catch (err) {
      console.error('Failed to report comment:', err);
      alert('Failed to submit report. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setReason('');
      setDetails('');
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <AlertTriangle className="text-warning" size={24} />
          Report Comment
        </Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <p className="text-muted mb-3">
            Help us understand what's wrong with this comment. Your report will be reviewed by our moderation team.
          </p>

          {/* Reason Selection */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">
              What's wrong with this comment? <span className="text-danger">*</span>
            </Form.Label>
            {reportReasons.map((option) => (
              <Form.Check
                key={option.value}
                type="radio"
                id={`reason-${option.value}`}
                name="reason"
                label={option.label}
                value={option.value}
                checked={reason === option.value}
                onChange={(e) => setReason(e.target.value)}
                disabled={submitting}
                className="mb-2"
              />
            ))}
          </Form.Group>

          {/* Additional Details (Optional) */}
          <Form.Group className="mb-3">
            <Form.Label className="fw-semibold">
              Additional details (optional)
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Provide any additional context that might help us review this report..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              disabled={submitting}
              maxLength={500}
            />
            <Form.Text className="text-muted">
              {details.length}/500 characters
            </Form.Text>
          </Form.Group>

          {/* Privacy Notice */}
          <div className="alert alert-info mb-0">
            <small>
              <strong>Privacy:</strong> Your report is anonymous. The comment author won't know who reported it.
            </small>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            type="submit"
            disabled={!reason || submitting}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Submitting...
              </>
            ) : (
              'Submit Report'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default ReportCommentModal;