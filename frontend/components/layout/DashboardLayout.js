// File: src/components/layout/DashboardLayout.js
'use client';

import LeftSidebar from './LeftSidebar';
import BottomNavigation from './BottomNavigation';
import { useState, useEffect } from 'react';

export default function DashboardLayout({ children, noScroll = false }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState(60);

  useEffect(() => {
    const getNavbarHeight = () => {
      if (typeof window !== 'undefined') {
        const navbar = document.querySelector('nav.navbar');
        if (navbar) {
          setNavbarHeight(navbar.offsetHeight);
        }
      }
    };

    getNavbarHeight();
    window.addEventListener('resize', getNavbarHeight);
    
    return () => window.removeEventListener('resize', getNavbarHeight);
  }, []);

  return (
    <div className={`dashboard-container min-vh-100 bg-light ${noScroll ? 'no-scroll' : ''}`}>
      <div className="row g-0 position-relative">
        {/* Left Sidebar */}
        <aside className={`sidebar-wrapper ${sidebarCollapsed ? 'collapsed' : ''} col-lg-3 col-xl-2 d-none d-lg-block border-end bg-white`}>
          <div className="sidebar-sticky-container">
            <button 
              className="sidebar-toggle-btn btn btn-light btn-sm rounded-circle border shadow-sm"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              style={{
                position: 'absolute',
                right: '12px',
                top: `calc(${navbarHeight}px + 20px)`,
                zIndex: 1001,
                width: '24px',
                height: '24px',
                padding: '0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {sidebarCollapsed ? '→' : '←'}
            </button>
            <LeftSidebar collapsed={sidebarCollapsed} navbarHeight={navbarHeight} />
          </div>
        </aside>
        
        {/* Main Content Area */}
        <main className={`main-content ${sidebarCollapsed ? 'expanded' : ''} col-lg-9 col-xl-10 px-lg-4 py-4 ${noScroll ? 'no-scroll' : ''}`}>
          <div className="content-wrapper">
            {children}
          </div>
        </main>
      </div>
      
      {/* Bottom Navigation for mobile */}
      <BottomNavigation />
      
      <style jsx>{`
        .dashboard-container {
          transition: all 0.3s ease;
          overflow-x: hidden;
          position: relative;
        }
        
        .dashboard-container.no-scroll {
          overflow-y: hidden !important;
        }
        
        .row {
          display: flex;
          min-height: 100vh;
        }
        
        /* FIXED: Sidebar with proper positioning */
        .sidebar-wrapper {
          height: calc(100vh - ${navbarHeight}px);
          position: fixed;
          top: ${navbarHeight}px;
          left: 0;
          overflow-y: auto;
          overflow-x: hidden;
          z-index: 999;
          box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
          transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          width: 280px;
          background: white;
        }
        
        .sidebar-wrapper.collapsed {
          width: 80px !important;
        }
        
        .sidebar-sticky-container {
          position: relative;
          height: 100%;
          padding: 1.5rem 0.5rem;
          display: flex;
          flex-direction: column;
        }
        
        /* FIXED: Main content with proper spacing */
        .main-content {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: calc(100vh - ${navbarHeight}px);
          overflow-x: hidden;
          margin-top: ${navbarHeight}px;
          margin-left: 280px;
          flex: 1;
        }
        
        .main-content.no-scroll {
          overflow-y: hidden !important;
        }
        
        .main-content.expanded {
          margin-left: 80px;
        }
        
        .content-wrapper {
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          padding-bottom: 2rem;
        }
        
        /* Hide sidebar scrollbar for chat page */
        .dashboard-container.no-scroll .sidebar-wrapper {
          overflow-y: hidden;
        }
        
        /* Custom scrollbar for sidebar - only when not in chat page */
        .sidebar-wrapper::-webkit-scrollbar {
          width: 4px;
        }
        
        .sidebar-wrapper::-webkit-scrollbar-track {
          background: #f8f9fa;
        }
        
        .sidebar-wrapper::-webkit-scrollbar-thumb {
          background: #dee2e6;
          border-radius: 2px;
        }
        
        .sidebar-wrapper::-webkit-scrollbar-thumb:hover {
          background: #adb5bd;
        }
        
        /* Hide scrollbar when collapsed */
        .sidebar-wrapper.collapsed::-webkit-scrollbar {
          display: none;
        }
        
        .sidebar-wrapper.collapsed {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        /* Responsive adjustments */
        @media (max-width: 991.98px) {
          .sidebar-wrapper {
            position: fixed;
            left: -100%;
            top: 0;
            z-index: 1050;
            transition: left 0.3s ease;
            width: 280px !important;
            height: 100vh;
          }
          
          .sidebar-wrapper.active {
            left: 0;
          }
          
          .main-content {
            margin-left: 0 !important;
            margin-top: ${navbarHeight}px;
            padding-left: 1rem;
            padding-right: 1rem;
            width: 100%;
          }
        }
        
        /* Medium screens */
        @media (min-width: 992px) and (max-width: 1199px) {
          .sidebar-wrapper {
            width: 250px;
          }
          
          .sidebar-wrapper.collapsed {
            width: 80px !important;
          }
          
          .main-content {
            margin-left: 250px;
          }
          
          .main-content.expanded {
            margin-left: 80px;
          }
        }
        
        /* Large screens */
        @media (min-width: 1400px) {
          .sidebar-wrapper {
            width: 300px;
          }
          
          .main-content {
            margin-left: 300px;
          }
          
          .main-content.expanded {
            margin-left: 80px;
          }
        }
      `}</style>
    </div>
  );
}