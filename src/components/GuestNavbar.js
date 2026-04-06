// src/components/GuestNavbar.js
import React from 'react';
import { Link } from 'react-router-dom';
import { FaUniversity, FaUser, FaUserPlus } from 'react-icons/fa';

function GuestNavbar() {
  return (
    <nav style={styles.navbar}>
      <div style={styles.container}>
        {/* Logo */}
        <div style={styles.brand}>
          
          <span style={styles.brandText}>UPTM Digital Event</span>
        </div>

        {/* Navigation Links */}
        <div style={styles.navLinks}>
          <Link to="/" style={styles.navLink}>
            Home
          </Link>
          
          <Link to="/events" style={styles.navLink}>
            Events
          </Link>
        </div>

        {/* Auth Buttons */}
        <div style={styles.authButtons}>
          <Link to="/login" style={styles.loginButton}>
            <FaUser style={{ marginRight: '8px' }} />
            Login
          </Link>
          <Link to="/register" style={styles.registerButton}>
            <FaUserPlus style={{ marginRight: '8px' }} />
            Register
          </Link>
        </div>
      </div>
    </nav>
  );
}

const styles = {
  navbar: {
    background: 'linear-gradient(135deg, #2E3B55 0%, #1a2538 100%)',
    color: 'white',
    padding: '15px 20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)'
  },
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer'
  },
  logo: {
    fontSize: '28px',
    color: '#4FC3F7'
  },
  brandText: {
    fontSize: '20px',
    fontWeight: '700',
    background: 'linear-gradient(45deg, #64B5F6, #4FC3F7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  navLinks: {
    display: 'flex',
    gap: '30px'
  },
  navLink: {
    color: 'rgba(255,255,255,0.9)',
    textDecoration: 'none',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'all 0.3s',
    ':hover': {
      color: '#4FC3F7'
    }
  },
  authButtons: {
    display: 'flex',
    gap: '15px'
  },
  loginButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 20px',
    background: 'transparent',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s',
    ':hover': {
      background: 'rgba(255,255,255,0.1)',
      borderColor: '#4FC3F7'
    }
  },
  registerButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 20px',
    background: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s',
    ':hover': {
      background: '#388E3C',
      transform: 'translateY(-2px)'
    }
  }
};

export default GuestNavbar;