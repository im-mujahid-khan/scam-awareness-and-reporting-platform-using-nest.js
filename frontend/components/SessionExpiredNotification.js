'use client';

import { useEffect, useState } from 'react';
import { FaExclamationTriangle, FaSignOutAlt, FaTimes } from 'react-icons/fa';

export default function SessionExpiredNotification({ 
  message = 'Your session has expired. Please login again.',
  conflictType = 'device',
  onDismiss,
  onLoginAgain
}) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-dismiss after 10 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onDismiss) onDismiss();
    }, 10000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!isVisible) return null;

  const getTitle = () => {
    switch (conflictType) {
      case 'device':
        return 'Session Expired - Logged In Elsewhere';
      case 'session':
        return 'Multiple Sessions Detected';
      case 'inactivity':
        return 'Session Timed Out';
      default:
        return 'Session Expired';
    }
  };

  const getIcon = () => {
    switch (conflictType) {
      case 'device':
        return '📱';
      case 'session':
        return '🔄';
      case 'inactivity':
        return '⏰';
      default:
        return '⚠️';
    }
  };

  return (
    <div className="session-expired-notification">
      <style jsx>{`
        .session-expired-notification {
          position: fixed;
          top: 20px;
          right: 20px;
          background: linear-gradient(135deg, #f56565 0%, #c53030 100%);
          color: white;
          padding: 16px 24px;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
          z-index: 99999;
          max-width: 400px;
          animation: slideIn 0.3s ease-out;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          backdrop-filter: blur(10px);
        }

        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .notification-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .notification-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 16px;
        }

        .notification-icon {
          font-size: 20px;
        }

        .notification-body {
          font-size: 14px;
          line-height: 1.5;
          margin-bottom: 16px;
          opacity: 0.9;
        }

        .notification-actions {
          display: flex;
          gap: 8px;
          margin-top: 12px;
        }

        .action-button {
          flex: 1;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
          border: none;
        }

        .primary-action {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
        }

        .primary-action:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .secondary-action {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
        }

        .secondary-action:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .close-button {
          background: transparent;
          border: none;
          color: white;
          opacity: 0.7;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .close-button:hover {
          opacity: 1;
          background: rgba(255, 255, 255, 0.1);
        }

        @media (max-width: 480px) {
          .session-expired-notification {
            top: 10px;
            left: 10px;
            right: 10px;
            max-width: none;
          }

          .notification-actions {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="notification-header">
        <div className="notification-title">
          <span className="notification-icon">{getIcon()}</span>
          <span>{getTitle()}</span>
        </div>
        <button 
          className="close-button"
          onClick={() => {
            setIsVisible(false);
            if (onDismiss) onDismiss();
          }}
        >
          <FaTimes />
        </button>
      </div>

      <div className="notification-body">
        {message}
      </div>

      <div className="notification-actions">
        <button 
          className="action-button primary-action"
          onClick={() => {
            setIsVisible(false);
            if (onLoginAgain) onLoginAgain();
          }}
        >
          <FaSignOutAlt style={{ marginRight: '6px' }} />
          Login Again
        </button>
        <button 
          className="action-button secondary-action"
          onClick={() => {
            setIsVisible(false);
            if (onDismiss) onDismiss();
          }}
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}