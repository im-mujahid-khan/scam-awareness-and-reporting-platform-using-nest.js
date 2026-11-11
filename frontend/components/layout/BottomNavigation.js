'use client';

import { Navbar, Nav } from 'react-bootstrap';
import { 
  FaHome, 
  FaSearch, 
  FaPlusCircle, 
  FaUsers, 
  FaUser,
  FaBullhorn
} from 'react-icons/fa';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function BottomNavigation() {
  const pathname = usePathname();

  const navItems = [
    { 
      path: '/', 
      label: 'Home', 
      icon: <FaHome />,
      active: pathname === '/'
    },
    { 
      path: '/search', 
      label: 'Search', 
      icon: <FaSearch />,
      active: pathname === '/search'
    },
    { 
      path: '/report', 
      label: 'Report', 
      icon: <FaPlusCircle />,
      active: pathname === '/report',
      highlight: true
    },
    { 
      path: '/feed/awareness', 
      label: 'Awareness', 
      icon: <FaBullhorn />,
      active: pathname.includes('/feed')
    },
    { 
      path: '/profile', 
      label: 'Profile', 
      icon: <FaUser />,
      active: pathname.includes('/profile')
    },
  ];

  return (
    <Navbar fixed="bottom" bg="white" className="border-top d-lg-none shadow-lg">
      <Nav className="w-100 justify-content-around">
        {navItems.map((item) => (
          <Nav.Link 
            key={item.path}
            as={Link} 
            href={item.path}
            className={`text-center px-2 py-1 ${item.active ? 'active text-primary' : 'text-secondary'}`}
          >
            <div className="d-flex flex-column align-items-center">
              <div className={`position-relative ${item.highlight ? 'mt-1' : ''}`}>
                {item.highlight ? (
                  <div className="position-absolute top-0 start-100 translate-middle">
                    <span className="badge rounded-pill bg-danger" style={{ fontSize: '0.5rem' }}>
                      !
                    </span>
                  </div>
                ) : null}
                <span className={`fs-5 ${item.highlight ? 'text-danger' : ''}`}>
                  {item.icon}
                </span>
              </div>
              <small className="mt-1" style={{ fontSize: '0.7rem' }}>
                {item.label}
              </small>
            </div>
          </Nav.Link>
        ))}
      </Nav>
    </Navbar>
  );
}