// src/components/Navbar.js (Create this new folder and file)
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../firebase';
import {
  FaHome,
  FaCalendarAlt,
  FaUsers,
  FaQrcode,
  FaPlusCircle,
  FaChartBar,
  FaUser,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaListAlt,
  FaUserTie
} from 'react-icons/fa';

function Navbar({ user, userData }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    auth.signOut();
    navigate('/login');
  };

  // Student Navigation Items
  const studentNavItems = [
    { path: '/student-dashboard', label: 'Dashboard', icon: <FaHome /> },
    { path: '/events', label: 'Browse Events', icon: <FaCalendarAlt /> },
    { path: '/my-events', label: 'My Events', icon: <FaListAlt /> },
    { path: '/scan-qr', label: 'Scan QR', icon: <FaQrcode /> },
  ];

  // Organizer/Admin Navigation Items
  const organizerNavItems = [
    { path: '/dashboard', label: 'Dashboard', icon: <FaHome /> },
    { path: '/events', label: 'Events', icon: <FaCalendarAlt /> },
    { path: '/create-event', label: 'Create Event', icon: <FaPlusCircle /> },
    { path: '/my-events', label: 'My Events', icon: <FaListAlt /> },
    
  ];

  // Get navigation items based on user role
  const getNavItems = () => {
    if (!user) return [];
    if (userData?.role === 'student') return studentNavItems;
    if (['organizer', 'admin'].includes(userData?.role)) return organizerNavItems;
    return [];
  };

  const navItems = getNavItems();

  // Check if current route is active
  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // User role display
  const getUserRoleDisplay = () => {
    if (!userData) return 'User';
    const role = userData.role || 'user';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.navContainer}>
        {/* Logo/Brand - UPTM Logo Image */}
        <div style={styles.brand}>
          <img 
            src={require('../images/uptm.png')} 
            alt="UPTM Logo" 
            style={styles.logo}
          />
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={styles.mobileToggle}
        >
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

        {/* Navigation Links */}
        <div style={{
          ...styles.navLinks,
          ...(isMobileMenuOpen ? styles.navLinksMobile : {})
        }}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                ...styles.navLink,
                ...(isActive(item.path) ? styles.activeNavLink : {})
              }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {item.icon}
              <span style={styles.navLinkText}>{item.label}</span>
            </Link>
          ))}
        </div>

        {/* User Info & Actions */}
        {user ? (
          <div style={styles.userSection}>
            <div style={styles.userInfo}>
              <div style={styles.userAvatar}>
                {userData?.name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
              </div>
              <div style={styles.userDetails}>
                <div style={styles.userName}>
                  {userData?.name || user.email?.split('@')[0]}
                </div>
                <div style={styles.userRole}>
                  <FaUserTie style={{ marginRight: '5px', fontSize: '12px' }} />
                  {getUserRoleDisplay()}
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              style={styles.logoutButton}
              title="Logout"
            >
              <FaSignOutAlt />
            </button>
          </div>
        ) : (
          <div style={styles.authLinks}>
            <Link to="/login" style={styles.loginButton}>
              <FaUser style={{ marginRight: '8px' }} />
              Login
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}

const styles = {
  navbar: {
    background: 'linear-gradient(135deg, #2E3B55 0%, #1a2538 100%)',
    color: 'white',
    padding: '0 20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    position: 'sticky',
    top: 0,
    zIndex: 1000
  },
  navContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '10px 0'
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    userSelect: 'none'
  },
  logo: {
    height: '50px', // Adjust this value based on your logo's size
    width: 'auto',
    objectFit: 'contain'
  },
  mobileToggle: {
    display: 'none',
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '5px'
  },
  navLinks: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    flex: 1,
    justifyContent: 'center'
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: 'rgba(255,255,255,0.8)',
    textDecoration: 'none',
    padding: '10px 15px',
    borderRadius: '8px',
    transition: 'all 0.3s ease',
    fontWeight: '500',
    fontSize: '15px',
    ':hover': {
      background: 'rgba(255,255,255,0.1)',
      color: 'white',
      transform: 'translateY(-2px)'
    }
  },
  activeNavLink: {
    background: 'rgba(79, 195, 247, 0.2)',
    color: 'white',
    borderBottom: '3px solid #4FC3F7'
  },
  navLinkText: {
    display: 'inline'
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  userAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '18px',
    color: 'white'
  },
  userDetails: {
    display: 'flex',
    flexDirection: 'column'
  },
  userName: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'white'
  },
  userRole: {
    fontSize: '12px',
    color: '#BBDEFB',
    display: 'flex',
    alignItems: 'center',
    opacity: 0.9
  },
  logoutButton: {
    background: 'rgba(244, 67, 54, 0.2)',
    color: '#FF8A80',
    border: '1px solid #FF8A80',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.3s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    ':hover': {
      background: '#F44336',
      color: 'white'
    }
  },
  authLinks: {
    display: 'flex',
    gap: '10px'
  },
  loginButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s',
    ':hover': {
      background: '#388E3C',
      transform: 'translateY(-2px)'
    }
  },

  // Mobile Styles
  navLinksMobile: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    background: '#2E3B55',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px',
    gap: '15px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.3)',
    borderTop: '1px solid rgba(255,255,255,0.1)'
  },

  // Responsive
  '@media (max-width: 1024px)': {
    navLinkText: {
      display: 'none'
    },
    navLink: {
      padding: '10px'
    }
  },

  '@media (max-width: 768px)': {
    mobileToggle: {
      display: 'block'
    },
    navLinks: {
      display: 'none'
    },
    userDetails: {
      display: 'none'
    },
    logo: {
      height: '40px' // Slightly smaller on mobile
    },
    navLinkText: {
      display: 'inline'
    }
  },

  '@media (max-width: 480px)': {
    navContainer: {
      padding: '8px 0'
    },
    logo: {
      height: '35px' // Even smaller on very small screens
    },
    userAvatar: {
      width: '36px',
      height: '36px',
      fontSize: '16px'
    }
  }
};

export default Navbar;