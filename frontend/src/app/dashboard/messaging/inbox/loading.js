'use client';

import { Spinner } from 'react-bootstrap';

export default function MessagingLoading() {
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
      <div className="text-center">
        <Spinner animation="border" variant="primary" size="lg" />
        <p className="mt-3 text-muted fw-medium">Loading messages...</p>
      </div>
    </div>
  );
}