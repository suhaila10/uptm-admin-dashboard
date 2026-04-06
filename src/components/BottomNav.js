// src/components/BottomNav.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaCalendarAlt, 
  FaQrcode, 
  FaUser, 
  FaPlusCircle,
  FaListAlt,
  FaChartBar
} from 'react-icons/fa';

function BottomNav({ userData }) {
  const location = useLocation();

  // Student Navigation Items
  const studentNavItems = [
    { path: '/student-dashboard', icon: <FaHome />, label: 'Home' },
    { path: '/events', icon: <FaCalendarAlt />, label: 'Events' },
    { path: '/scan-qr', icon: <FaQrcode />, label: 'Scan' },
    { path: '/my-events', icon: <FaListAlt />, label: 'My Events' },
  ];

  // Organizer Navigation Items
  const organizerNavItems = [
    { path: '/dashboard', icon: <FaHome />, label: 'Home' },
    { path: '/events', icon: <FaCalendarAlt />, label: 'Events' },
    { path: '/create-event', icon: <FaPlusCircle />, label: 'Create' },
    { path: '/my-events', icon: <FaListAlt />, label: 'My Events' },
    { path: '/attendance', icon: <FaChartBar />, label: 'Stats' },
  ];

  const getNavItems = () => {
    if (!userData) return [];
    if (userData.role === 'student') return studentNavItems;
    if (['organizer', 'admin'].includes(userData.role)) return organizerNavItems;
    return [];
  };

  const navItems = getNavItems();

  const isActive = (path) => {
    return location.pathname === path;
  };

  return (
    <div style={styles.bottomNav}>
      {navItems.map((item) => (
        <Link
          key={item.path}
          to={item.path}
          style={{
            ...styles.navItem,
            ...(isActive(item.path) ? styles.activeNavItem : {})
          }}
        >
          <div style={styles.iconContainer}>
            {item.icon}
          </div>
          <span style={styles.navLabel}>{item.label}</span>
        </Link>
      ))}
    </div>
  );
}

const styles = {
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-around',
    background: '#2E3B55',
    padding: '10px 0',
    borderTop: '1px solid rgba(255,255,255,0.1)',
    zIndex: 1000,
    boxShadow: '0 -2px 10px rgba(0,0,0,0.2)'
  },
  navItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    textDecoration: 'none',
    color: 'rgba(255,255,255,0.6)',
    flex: 1,
    padding: '5px 0',
    transition: 'all 0.3s'
  },
  activeNavItem: {
    color: '#4FC3F7'
  },
  iconContainer: {
    fontSize: '20px',
    marginBottom: '4px'
  },
  navLabel: {
    fontSize: '12px',
    fontWeight: '500'
  }
};

export default BottomNav;