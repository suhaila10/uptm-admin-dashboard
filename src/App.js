// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { auth, db } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

// Import Components
import Login from './Login';
import Register from './Register';
import Dashboard from './Dashboard';
import CreateEvent from './CreateEvent';
import EventList from './EventList';
import EventDetails from './EventDetails';
import EditEvent from './EditEvent';
import MyEvents from './MyEvents';
import AttendanceManagement from './AttendanceManagement';
import StudentScanner from './StudentScanner';
import StudentDashboard from './StudentDashboard';
import RequestEvent from './RequestEvent';
import MyEventRequests from './MyEventRequests';
import AdminEventRequests from './AdminEventRequests';
import EditRequest from './EditRequest';
import EventAttendees from './EventAttendees';

// Import Navbars
import Navbar from './components/Navbar';
import NavbarStudentLect from './components/NavbarStudentLect'; // 👈 new navbar for students/lecturers
import GuestNavbar from './components/GuestNavbar';
import BottomNav from './components/BottomNav';

import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
            console.log('User data loaded:', userDoc.data());
          } else {
            console.log('No user data found for UID:', firebaseUser.uid);
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  const getDefaultRoute = () => {
    if (!user) return '/login';
    if (!userData) return '/dashboard';
    
    switch (userData.role) {
      case 'student':
      case 'lecturer':
        return '/student-dashboard';
      case 'organizer':
      case 'admin':
        return '/dashboard';
      default:
        return '/dashboard';
    }
  };

  return (
    <Router>
      {/* Show appropriate navbar based on auth status and role */}
      {user ? (
        userData?.role === 'student' || userData?.role === 'lecturer' ? (
          <NavbarStudentLect user={user} userData={userData} />
        ) : (
          <Navbar user={user} userData={userData} />
        )
      ) : (
        <GuestNavbar />
      )}
      
      <main style={{ padding: '20px', paddingBottom: user ? '70px' : '20px' }}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={!user ? <Login /> : <Navigate to={getDefaultRoute()} />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to={getDefaultRoute()} />} />
          
          {/* Role-based dashboards */}
          <Route path="/dashboard" element={
            user ? (
              userData?.role === 'student' || userData?.role === 'lecturer'
                ? <Navigate to="/student-dashboard" /> 
                : <Dashboard user={user} userData={userData} />
            ) : <Navigate to="/login" />
          } />
          
          <Route path="/student-dashboard" element={
            user ? <StudentDashboard user={user} userData={userData} /> : <Navigate to="/login" />
          } />
          
          {/* Event management routes */}
          <Route path="/edit-event/:id" element={
            user ? <EditEvent user={user} userData={userData} /> : <Navigate to="/login" />
          } />
          
          <Route path="/create-event" element={
            user && (userData?.role === 'organizer' || userData?.role === 'admin') 
              ? <CreateEvent userData={userData} /> 
              : user ? <Navigate to={getDefaultRoute()} /> : <Navigate to="/login" />
          } />
          
          {/* Event browsing */}
          <Route path="/events" element={user ? <EventList user={user} userData={userData} /> : <Navigate to="/login" />} />
          <Route path="/events/:id" element={user ? <EventDetails user={user} userData={userData} /> : <Navigate to="/login" />} />
          
          {/* Attendance management */}
          <Route path="/attendance/:eventId" element={
            user ? <AttendanceManagement user={user} userData={userData} /> : <Navigate to="/login" />
          } />
          
          {/* QR Scanner */}
          <Route path="/scan-qr" element={user ? <StudentScanner /> : <Navigate to="/login" />} />
          <Route path="/scan-qr/:eventId" element={user ? <StudentScanner /> : <Navigate to="/login" />} />
          
          {/* My Events */}
          <Route path="/my-events" element={user ? <MyEvents user={user} userData={userData} /> : <Navigate to="/login" />} />
          
          {/* Event Request Routes */}
          <Route path="/request-event" element={
            user ? <RequestEvent /> : <Navigate to="/login" />
          } />
          
          <Route path="/my-requests" element={
            user ? <MyEventRequests /> : <Navigate to="/login" />
          } />

          <Route path="/event/:id/attendees" element={<EventAttendees />} />

          <Route path="/edit-request/:id" element={
            user ? <EditRequest /> : <Navigate to="/login" />
          } />
          
          <Route path="/admin/requests" element={
            user && userData?.role === 'admin' ? 
              <AdminEventRequests /> : 
              user ? <Navigate to={getDefaultRoute()} /> : <Navigate to="/login" />
          } />
          
          {/* Default route */}
          <Route path="/" element={<Navigate to={getDefaultRoute()} />} />
        </Routes>
      </main>

      {/* Bottom navigation for mobile */}
      {user && (
        <div style={{ display: 'none' }}>
          <BottomNav userData={userData} />
        </div>
      )}
    </Router>
  );
}

const styles = {
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #800000',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '20px'
  }
};

// Add CSS animation
const styleSheet = document.styleSheets[0];
try {
  styleSheet.insertRule(`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `, styleSheet.cssRules.length);
} catch (e) {}

export default App;