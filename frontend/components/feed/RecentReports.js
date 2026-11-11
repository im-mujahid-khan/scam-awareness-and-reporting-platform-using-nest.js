'use client';

import { Card, Badge, Button } from 'react-bootstrap';
import { FaExclamationTriangle, FaComment, FaEye, FaCalendarAlt } from 'react-icons/fa';
import Link from 'next/link';
import { formatDate } from '../../lib/utils';

export default function RecentReports() {
  // Mock data - replace with API data
  const recentReports = [
    {
      id: '1',
      title: 'Fake Tech Support - Microsoft Impersonation',
      identity: '+1 (555) ***-***-1234',
      type: 'phone',
      riskScore: 92,
      category: 'Tech Support Scam',
      description: 'Caller claimed to be from Microsoft support...',
      reportsCount: 24,
      commentsCount: 12,
      viewsCount: 345,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    },
    {
      id: '2',
      title: 'Phishing Email - Fake PayPal Login',
      identity: 's*****t@phishing-domain.com',
      type: 'email',
      riskScore: 78,
      category: 'Phishing',
      description: 'Email pretending to be PayPal security alert...',
      reportsCount: 18,
      commentsCount: 8,
      viewsCount: 289,
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(), // 5 hours ago
    },
    {
      id: '3',
      title: 'Crypto Investment Fraud - "Guaranteed Returns"',
      identity: '0x7a3b9c8d4e5f6a7b8c9d0e1f',
      type: 'wallet',
      riskScore: 95,
      category: 'Investment Fraud',
      description: 'Promise of 200% returns in crypto investments...',
      reportsCount: 42,
      commentsCount: 21,
      viewsCount: 512,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    },
    {
      id: '4',
      title: 'Romance Scam - Fake Dating Profile',
      identity: '@love_scammer_2024',
      type: 'social',
      riskScore: 65,
      category: 'Romance Scam',
      description: 'Fake profile asking for money for emergencies...',
      reportsCount: 15,
      commentsCount: 5,
      viewsCount: 198,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    },
  ];

  const getRiskBadgeVariant = (score) => {
    if (score >= 81) return 'danger';
    if (score >= 51) return 'warning';
    if (score >= 21) return 'info';
    return 'success';
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'phone': return '📱';
      case 'email': return '📧';
      case 'website': return '🌐';
      case 'social': return '👥';
      case 'wallet': return '💰';
      default: return '🔍';
    }
  };

  return (
    <div className="recent-reports">
      {recentReports.map((report) => (
        <Card key={report.id} className="mb-3 hover-card">
          <Card.Body className="p-3 p-md-4">
            {/* Header Section - Responsive Stack */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start mb-3 gap-2">
              <div className="flex-grow-1">
                <div className="d-flex align-items-center mb-1 flex-wrap">
                  <span className="me-2 fs-5">{getTypeIcon(report.type)}</span>
                  <h6 className="mb-0 text-break">{report.title}</h6>
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2 text-muted small mb-2">
                  <span className="text-truncate">{report.identity}</span>
                  <span className="d-none d-md-inline">•</span>
                  <span>{report.category}</span>
                </div>
              </div>
              <Badge 
                bg={getRiskBadgeVariant(report.riskScore)} 
                className="fs-6 px-3 py-2 align-self-start align-self-md-center"
              >
                {report.riskScore}
              </Badge>
            </div>

            {/* Description */}
            <p className="small text-muted mb-3 d-none d-md-block">{report.description}</p>
            <p className="small text-muted mb-3 d-block d-md-none text-truncate" title={report.description}>
              {report.description}
            </p>

            {/* Stats and Actions - Responsive Stack */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
              {/* Stats */}
              <div className="d-flex flex-wrap gap-3 flex-grow-1">
                <div className="d-flex align-items-center text-muted small">
                  <FaExclamationTriangle className="me-1 flex-shrink-0" />
                  <span>{report.reportsCount} reports</span>
                </div>
                <div className="d-flex align-items-center text-muted small">
                  <FaComment className="me-1 flex-shrink-0" />
                  <span>{report.commentsCount}</span>
                </div>
                <div className="d-flex align-items-center text-muted small">
                  <FaEye className="me-1 flex-shrink-0" />
                  <span>{report.viewsCount}</span>
                </div>
                <div className="d-flex align-items-center text-muted small">
                  <FaCalendarAlt className="me-1 flex-shrink-0" />
                  <span className="text-nowrap">{formatDate(report.createdAt)}</span>
                </div>
              </div>

              {/* Buttons - Responsive Stack */}
              <div className="d-flex flex-wrap gap-2 w-100 w-md-auto">
                <Button
                  variant="outline-primary"
                  size="sm"
                  as={Link}
                  href={`/search/${report.id}`}
                  className="flex-grow-1 flex-md-grow-0"
                >
                  View Details
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  as={Link}
                  href={`/report?identity=${encodeURIComponent(report.identity)}`}
                  className="flex-grow-1 flex-md-grow-0"
                >
                  Report Similar
                </Button>
              </div>
            </div>
          </Card.Body>
        </Card>
      ))}

      {recentReports.length === 0 && (
        <div className="text-center py-5">
          <FaExclamationTriangle className="fs-1 text-muted mb-3" />
          <h5>No recent reports</h5>
          <p className="text-muted">Be the first to report a scam in your area</p>
          <Button variant="primary" as={Link} href="/report">
            Report a Scam
          </Button>
        </div>
      )}
    </div>
  );
}