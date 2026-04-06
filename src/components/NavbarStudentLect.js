// src/components/NavbarStudentLect.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import {
  FaHome,
  FaCalendarAlt,
  FaQrcode,
  FaPlusCircle,
  FaClipboardList,
  FaUser,
  FaSignOutAlt,
  FaBars,
  FaTimes,
  FaListAlt
} from 'react-icons/fa';

function NavbarStudentLect({ user, userData }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    if (user && (userData?.role === 'student' || userData?.role === 'lecturer')) {
      const fetchPendingCount = async () => {
        const q = query(
          collection(db, 'event_requests'),
          where('requesterId', '==', user.uid),
          where('status', 'in', ['pending', 'revision_needed'])
        );
        const snapshot = await getDocs(q);
        setPendingRequestsCount(snapshot.size);
      };
      fetchPendingCount();
    }
  }, [user, userData]);

  const handleLogout = () => {
    auth.signOut();
    navigate('/login');
  };

  const navItems = [
    { path: '/student-dashboard', label: 'Dashboard', icon: <FaHome /> },
    { path: '/events', label: 'Browse Events', icon: <FaCalendarAlt /> },
    { path: '/my-events', label: 'My Events', icon: <FaListAlt /> },
    { path: '/scan-qr', label: 'Scan QR', icon: <FaQrcode /> },
    { path: '/request-event', label: 'Request Event', icon: <FaPlusCircle />, badge: pendingRequestsCount },
    { path: '/my-requests', label: 'My Requests', icon: <FaClipboardList />, badge: pendingRequestsCount },
  ];

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const getUserRoleDisplay = () => {
    if (!userData) return 'User';
    const role = userData.role || 'user';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <nav style={styles.navbar}>
      <div style={styles.navContainer}>
        <div style={styles.brand}>
          <img src={require('../images/uptm.png')} alt="UPTM Logo" style={styles.logo} />
        </div>

        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} style={styles.mobileToggle}>
          {isMobileMenuOpen ? <FaTimes /> : <FaBars />}
        </button>

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
              {item.badge > 0 && <span style={styles.badge}>{item.badge}</span>}
            </Link>
          ))}
        </div>

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
                {getUserRoleDisplay()}
              </div>
            </div>
          </div>
          <button onClick={handleLogout} style={styles.logoutButton} title="Logout">
            <FaSignOutAlt />
          </button>
        </div>
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
    alignItems: 'center'
  },
  logo: {
    height: '50px',
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
    gap: '15px',
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
    position: 'relative'
  },
  activeNavLink: {
    background: 'rgba(79, 195, 247, 0.2)',
    color: 'white',
    borderBottom: '3px solid #4FC3F7'
  },
  navLinkText: {
    display: 'inline'
  },
  badge: {
    position: 'absolute',
    top: '-5px',
    right: '-5px',
    background: '#dc3545',
    color: 'white',
    borderRadius: '50%',
    width: '18px',
    height: '18px',
    fontSize: '11px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold'
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
    justifyContent: 'center'
  },
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
  '@media (max-width: 768px)': {
    mobileToggle: { display: 'block' },
    navLinks: { display: 'none' },
    userDetails: { display: 'none' },
    logo: { height: '40px' }
  },
  '@media (max-width: 480px)': {
    logo: { height: '35px' },
    userAvatar: { width: '36px', height: '36px', fontSize: '16px' }
  }
};

export default NavbarStudentLect;