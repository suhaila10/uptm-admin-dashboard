// src/Dashboard.js - UPDATED with robust admin "EVENTS MANAGED" count
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  limit
} from 'firebase/firestore';
import { db, auth } from './firebase';

// UPTM Color Palette
const colors = {
  maroon: '#800000',      // Primary UPTM maroon
  darkMaroon: '#5a0000',   // Darker maroon for gradients
  navy: '#1a2b4c',        // Navy blue
  darkNavy: '#0f1a30',     // Darker navy
  white: '#ffffff',
  lightGray: '#f5f5f5',
  borderGray: '#e0e0e0'
};

function Dashboard({ user, userData }) {
  const navigate = useNavigate();
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [myEvents, setMyEvents] = useState([]);
  const [myManagedEvents, setMyManagedEvents] = useState([]);
  const [myPendingRequests, setMyPendingRequests] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [stats, setStats] = useState({
    totalEvents: 0,
    upcomingEvents: 0,
    attendedEvents: 0,
    managedEvents: 0,
    pendingRequests: 0,
    totalPendingRequests: 0,
    certificates: 0
  });

  useEffect(() => {
    if (userData) {
      fetchEvents();
      fetchPendingRequests();
    }
  }, [userData]);

  useEffect(() => {
    if (userData && (upcomingEvents.length > 0 || myEvents.length > 0 || myManagedEvents.length > 0)) {
      fetchStats();
    }
  }, [userData, upcomingEvents, myEvents, myManagedEvents, myPendingRequests]);

  const fetchEvents = async () => {
    try {
      setLoadingEvents(true);
      const now = new Date();
      
      // 1. Upcoming events (system-wide)
      const upcomingQuery = query(
        collection(db, 'events'),
        where('date', '>=', now),
        orderBy('date', 'asc'),
        limit(5)
      );
      const upcomingSnapshot = await getDocs(upcomingQuery);
      const upcomingData = upcomingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date
      }));
      setUpcomingEvents(upcomingData);

      // 2. Events the user is attending (for students/lecturers)
      if (userData.role === 'student' || userData.role === 'lecturer') {
        const attendingQuery = query(
          collection(db, 'events'),
          where('attendees', 'array-contains', user.uid),
          orderBy('date', 'desc')
        );
        const attendingSnapshot = await getDocs(attendingQuery);
        const attendingData = attendingSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMyEvents(attendingData);
      }

      // 3. Events managed/created by the user (for organizer/admin)
      if (userData.role === 'organizer' || userData.role === 'admin') {
        let managedEvents = [];

        if (userData.role === 'admin') {
          // For admin: fetch all events and filter client-side to include those where
          // createdBy == uid OR organizerId == uid
          const allEventsQuery = query(collection(db, 'events'));
          const allEventsSnapshot = await getDocs(allEventsQuery);
          const allEvents = allEventsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Filter events where either createdBy or organizerId matches admin UID
          managedEvents = allEvents.filter(event => 
            event.createdBy === user.uid || event.organizerId === user.uid
          );
          
          // Sort by date descending
          managedEvents.sort((a, b) => {
            const dateA = a.date?.toDate?.() || new Date(0);
            const dateB = b.date?.toDate?.() || new Date(0);
            return dateB - dateA;
          });
        } else {
          // Organizer: events where organizerId == user.uid
          const organizerQuery = query(
            collection(db, 'events'),
            where('organizerId', '==', user.uid),
            orderBy('date', 'desc')
          );
          const organizerSnapshot = await getDocs(organizerQuery);
          managedEvents = organizerSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
        }

        setMyManagedEvents(managedEvents);
      }

    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchPendingRequests = async () => {
    if (!userData || (userData.role !== 'student' && userData.role !== 'lecturer')) {
      return;
    }
    
    try {
      const requestsQuery = query(
        collection(db, 'event_requests'),
        where('requesterId', '==', user.uid),
        where('status', 'in', ['pending', 'revision_needed']),
        orderBy('submittedAt', 'desc')
      );
      
      const requestsSnapshot = await getDocs(requestsQuery);
      const requestsData = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMyPendingRequests(requestsData);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const now = new Date();
      
      const upcomingQuery = query(
        collection(db, 'events'),
        where('date', '>=', now)
      );
      const upcomingSnapshot = await getDocs(upcomingQuery);
      
      const totalQuery = query(collection(db, 'events'));
      const totalSnapshot = await getDocs(totalQuery);

      let totalPending = 0;
      if (userData?.role === 'admin') {
        const pendingQuery = query(
          collection(db, 'event_requests'),
          where('status', 'in', ['pending', 'revision_needed'])
        );
        const pendingSnapshot = await getDocs(pendingQuery);
        totalPending = pendingSnapshot.size;
      }

      const attendedCount = (userData?.role === 'student' || userData?.role === 'lecturer')
        ? myEvents.filter(e => e.date?.toDate() < now).length
        : 0;
      
      setStats({
        totalEvents: totalSnapshot.size,
        upcomingEvents: upcomingSnapshot.size,
        attendedEvents: attendedCount,
        managedEvents: myManagedEvents.length,
        pendingRequests: myPendingRequests.length,
        totalPendingRequests: totalPending,
        certificates: 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date not set';
    try {
      const date = timestamp.toDate();
      return date.toLocaleDateString('en-MY', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getRoleColor = (role) => {
    switch(role) {
      case 'admin': return colors.maroon;
      case 'organizer': return colors.navy;
      case 'lecturer': return '#17a2b8';
      case 'student': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const getSecondCardLabel = () => {
    if (userData?.role === 'student' || userData?.role === 'lecturer') {
      return 'EVENTS ATTENDING';
    } else if (userData?.role === 'organizer' || userData?.role === 'admin') {
      return 'EVENTS MANAGED';
    }
    return 'MY EVENTS';
  };

  const getSecondCardValue = () => {
    if (userData?.role === 'student' || userData?.role === 'lecturer') {
      return myEvents.length;
    } else if (userData?.role === 'organizer' || userData?.role === 'admin') {
      return myManagedEvents.length;
    }
    return 0;
  };

  const getThirdCardLabel = () => {
    if (userData?.role === 'admin') {
      return 'PENDING REQUESTS';
    } else {
      return 'ATTENDED EVENTS';
    }
  };

  const getThirdCardValue = () => {
    if (userData?.role === 'admin') {
      return stats.totalPendingRequests;
    } else {
      return stats.attendedEvents;
    }
  };

  if (!userData) {
    return (
      <div style={{ 
        maxWidth: '1200px', 
        margin: 'auto', 
        padding: '20px',
        textAlign: 'center',
        marginTop: '50px'
      }}>
        <h2>Loading dashboard...</h2>
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '1200px', 
      margin: 'auto', 
      padding: '20px',
      backgroundColor: colors.lightGray,
      minHeight: '100vh'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: colors.white,
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        border: `1px solid ${colors.borderGray}`
      }}>
        <div>
          <h1 style={{ 
            margin: 0, 
            color: colors.maroon,
            fontSize: '28px',
            fontWeight: 'bold'
          }}>UPTM Digital Event</h1>
          <p style={{ color: colors.navy, margin: '5px 0 0 0' }}>
            Welcome back, {userData?.name || user?.email || 'User'}!
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ 
            background: getRoleColor(userData?.role),
            color: colors.white,
            padding: '5px 15px',
            borderRadius: '20px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}>
            {userData?.role?.toUpperCase() || 'GUEST'}
          </span>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              color: colors.maroon,
              border: `1px solid ${colors.maroon}`,
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.3s',
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        <div style={{ 
          background: `linear-gradient(135deg, ${colors.maroon} 0%, ${colors.darkMaroon} 100%)`,
          color: colors.white,
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(128,0,0,0.2)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>UPCOMING EVENTS</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>{stats.upcomingEvents}</p>
        </div>

        <div style={{ 
          background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.darkNavy} 100%)`,
          color: colors.white,
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(26,43,76,0.2)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>{getSecondCardLabel()}</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>{getSecondCardValue()}</p>
        </div>

        <div style={{ 
          background: `linear-gradient(135deg, ${colors.maroon} 0%, ${colors.navy} 100%)`,
          color: colors.white,
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(128,0,0,0.2)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>{getThirdCardLabel()}</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>{getThirdCardValue()}</p>
        </div>

        <div style={{ 
          background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.maroon} 100%)`,
          color: colors.white,
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(26,43,76,0.2)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>TOTAL EVENTS</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>{stats.totalEvents}</p>
        </div>
      </div>

      {/* Main Content */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 2fr',
        gap: '30px',
        marginBottom: '30px'
      }}>
        {/* Left Sidebar - Profile & Quick Actions (unchanged) */}
        <div>
          {/* Profile Card (unchanged) */}
          <div style={{ 
            background: colors.white,
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            border: `1px solid ${colors.borderGray}`
          }}>
            <h3 style={{ marginTop: 0, color: colors.maroon }}>Profile Overview</h3>
            <div style={{ marginBottom: '15px' }}>
              <div style={{ 
                width: '80px', 
                height: '80px', 
                borderRadius: '50%', 
                background: `linear-gradient(135deg, ${colors.maroon}, ${colors.navy})`,
                color: colors.white,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '32px',
                fontWeight: 'bold',
                margin: '0 auto 15px auto'
              }}>
                {userData?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <p style={{ textAlign: 'center', fontWeight: 'bold', marginBottom: '5px', color: colors.navy }}>
                {userData?.name || 'Not set'}
              </p>
              <p style={{ textAlign: 'center', color: colors.maroon, fontSize: '14px' }}>
                {user?.email}
              </p>
            </div>
            
            <div style={{ 
              background: colors.lightGray, 
              padding: '15px', 
              borderRadius: '8px',
              fontSize: '14px',
              border: `1px solid ${colors.borderGray}`
            }}>
              <p style={{ margin: '5px 0' }}>
                <strong style={{ color: colors.maroon }}>Role:</strong> {userData?.role || 'Not assigned'}
              </p>
              {userData?.userId && (
                <p style={{ margin: '5px 0' }}>
                  <strong style={{ color: colors.maroon }}>User ID:</strong> {userData.userId}
                </p>
              )}
              {userData?.faculty && (
                <p style={{ margin: '5px 0' }}>
                  <strong style={{ color: colors.maroon }}>Faculty:</strong> {userData.faculty}
                </p>
              )}
              <p style={{ margin: '5px 0', color: colors.navy, fontSize: '12px' }}>
                Member since: {userData?.createdAt?.toDate().toLocaleDateString() || 'N/A'}
              </p>
            </div>
          </div>

          {/* Quick Actions Card (unchanged) */}
          <div style={{ 
            background: colors.white,
            borderRadius: '10px',
            padding: '20px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            border: `1px solid ${colors.borderGray}`
          }}>
            <h3 style={{ marginTop: 0, color: colors.maroon }}>Quick Actions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Link to="/events" style={{ textDecoration: 'none' }}>
                <button style={{ 
                  width: '100%', 
                  padding: '12px',
                  background: colors.maroon,
                  color: colors.white,
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  transition: 'all 0.3s',
                }}>
                  <span>📅</span> Browse All Events
                </button>
              </Link>

              {(userData?.role === 'student' || userData?.role === 'lecturer') && (
                <Link to="/request-event" style={{ textDecoration: 'none' }}>
                  <button style={{ 
                    width: '100%', 
                    padding: '12px',
                    background: colors.navy,
                    color: colors.white,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    position: 'relative',
                  }}>
                    <span>📝</span> Request to Create Event
                    {stats.pendingRequests > 0 && (
                      <span style={{
                        position: 'absolute',
                        top: '-5px',
                        right: '-5px',
                        background: colors.maroon,
                        color: 'white',
                        borderRadius: '50%',
                        width: '20px',
                        height: '20px',
                        fontSize: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        border: `2px solid ${colors.white}`
                      }}>
                        {stats.pendingRequests}
                      </span>
                    )}
                  </button>
                </Link>
              )}

              {(userData?.role === 'organizer' || userData?.role === 'admin') && (
                <Link to="/create-event" style={{ textDecoration: 'none' }}>
                  <button style={{ 
                    width: '100%', 
                    padding: '12px',
                    background: colors.navy,
                    color: colors.white,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '14px',
                  }}>
                    <span>➕</span> Create New Event
                  </button>
                </Link>
              )}

              {userData?.role === 'admin' && (
                <Link to="/admin/requests" style={{ textDecoration: 'none' }}>
                  <button style={{ 
                    width: '100%', 
                    padding: '12px',
                    background: colors.maroon,
                    color: colors.white,
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '14px',
                  }}>
                    <span>📋</span> Manage Event Requests
                  </button>
                </Link>
              )}

              <Link to="/my-events" style={{ textDecoration: 'none' }}>
                <button style={{ 
                  width: '100%', 
                  padding: '12px',
                  background: colors.white,
                  color: colors.maroon,
                  border: `1px solid ${colors.maroon}`,
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '14px',
                }}>
                  <span>📋</span> 
                  {userData?.role === 'student' || userData?.role === 'lecturer' 
                    ? 'My Registered Events' 
                    : 'Events I Managed'}
                </button>
              </Link>
            </div>
          </div>

          {/* Pending Requests Preview for Students/Lecturers */}
          {(userData?.role === 'student' || userData?.role === 'lecturer') && myPendingRequests.length > 0 && (
            <div style={{ 
              background: colors.white,
              borderRadius: '10px',
              padding: '20px',
              marginTop: '20px',
              boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
              border: `1px solid ${colors.borderGray}`
            }}>
              <h3 style={{ marginTop: 0, color: colors.maroon }}>Your Pending Event Requests</h3>
              {myPendingRequests.slice(0, 3).map(request => (
                <div key={request.id} style={{
                  padding: '10px',
                  borderBottom: `1px solid ${colors.borderGray}`,
                  marginBottom: '5px'
                }}>
                  <p style={{ margin: '0 0 5px 0', fontWeight: 'bold' }}>{request.title}</p>
                  <p style={{ margin: 0, fontSize: '12px', color: colors.maroon }}>
                    Status: {request.status === 'pending' ? '⏳ Under Review' : '✏️ Revision Needed'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Content - Upcoming Events (unchanged) */}
        <div>
          <div style={{ 
            background: colors.white,
            borderRadius: '10px',
            padding: '25px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
            border: `1px solid ${colors.borderGray}`
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '25px',
              borderBottom: `2px solid ${colors.maroon}`,
              paddingBottom: '15px'
            }}>
              <h3 style={{ margin: 0, color: colors.maroon }}>Upcoming Events</h3>
              <Link to="/events" style={{ color: colors.navy, textDecoration: 'none' }}>View All →</Link>
            </div>

            {loadingEvents ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p>Loading events...</p>
              </div>
            ) : upcomingEvents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {upcomingEvents.map(event => (
                  <div key={event.id} style={{ 
                    border: `1px solid ${colors.borderGray}`,
                    borderRadius: '10px',
                    padding: '20px',
                  }}>
                    <h4 style={{ margin: '0 0 15px 0', color: colors.navy }}>{event.title}</h4>
                    <div style={{ marginBottom: '15px' }}>
                      <p style={{ margin: '8px 0', fontSize: '14px', color: '#666' }}>
                        📅 {formatDate(event.date)}
                      </p>
                      <p style={{ margin: '8px 0', fontSize: '14px', color: '#666' }}>
                        📍 {event.venue || 'Venue TBD'}
                      </p>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                    }}>
                      <span style={{ 
                        background: colors.lightGray,
                        color: colors.maroon,
                        padding: '5px 12px',
                        borderRadius: '20px',
                        fontSize: '13px',
                      }}>
                        👥 {event.attendeesCount || 0} attending
                      </span>
                      <Link to={`/events/${event.id}`}>
                        <button style={{ 
                          padding: '8px 20px',
                          background: colors.maroon,
                          color: colors.white,
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                        }}>
                          View Details
                        </button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <p>No upcoming events found.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div style={{ 
        textAlign: 'center', 
        padding: '20px', 
        color: colors.navy, 
        borderTop: `1px solid ${colors.borderGray}`,
        background: colors.white,
        borderRadius: '8px'
      }}>
        <p>UPTM Digital Event v1.0 • {new Date().getFullYear()}</p>
      </div>
    </div>
  );
}

export default Dashboard;