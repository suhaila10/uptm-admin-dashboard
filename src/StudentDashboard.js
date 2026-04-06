// src/StudentDashboard.js - Updated with app promotion banner
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { 
  FaQrcode, 
  FaCalendarAlt, 
  FaCheckCircle,
  FaClock,
  FaUserCheck,
  FaMapMarkerAlt,
  FaArrowRight,
  FaPlusCircle,
  FaClipboardList,
  FaSync,
  FaMobileAlt          // <-- New icon for app banner
} from 'react-icons/fa';

function StudentDashboard({ user, userData }) {
  const [registeredEvents, setRegisteredEvents] = useState([]);
  const [attendedEvents, setAttendedEvents] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      fetchStudentEvents();
      fetchPendingRequests();
    }
  }, [user]);

  const fetchStudentEvents = async () => {
    try {
      const userId = auth.currentUser?.uid;
      console.log('Fetching events for user:', userId);
      
      // Fetch registered events
      const eventsQuery = query(
        collection(db, 'events'),
        where('attendees', 'array-contains', userId)
      );
      
      const eventsSnapshot = await getDocs(eventsQuery);
      console.log('Found registered events:', eventsSnapshot.size);
      
      const eventsList = [];
      eventsSnapshot.forEach(doc => {
        eventsList.push({ id: doc.id, ...doc.data() });
      });
      
      setRegisteredEvents(eventsList);
      
      // Fetch attendance records
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('userId', '==', userId)
      );
      
      const attendanceSnapshot = await getDocs(attendanceQuery);
      const attendedList = [];
      
      attendanceSnapshot.forEach(doc => {
        attendedList.push(doc.data());
      });
      
      setAttendedEvents(attendedList);
      
    } catch (error) {
      console.error('Error fetching student events:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const userId = auth.currentUser?.uid;
      console.log('Fetching pending requests for user:', userId);
      
      const requestsQuery = query(
        collection(db, 'event_requests'),
        where('requesterId', '==', userId),
        where('status', 'in', ['pending', 'revision_needed'])
      );
      
      const requestsSnapshot = await getDocs(requestsQuery);
      console.log('Found pending requests:', requestsSnapshot.size);
      
      const requestsList = [];
      requestsSnapshot.forEach(doc => {
        const data = doc.data();
        console.log('Request:', doc.id, data);
        requestsList.push({ id: doc.id, ...data });
      });
      
      setPendingRequests(requestsList);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchStudentEvents();
    fetchPendingRequests();
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date not set';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const isEventToday = (eventDate) => {
    if (!eventDate) return false;
    try {
      const date = eventDate.toDate ? eventDate.toDate() : new Date(eventDate);
      const today = new Date();
      return date.toDateString() === today.toDateString();
    } catch (error) {
      return false;
    }
  };

  return (
    <div style={styles.container}>
      {/* Header with Refresh Button */}
      <div style={styles.header}>
        <h1>Dashboard</h1>
        <div style={styles.headerButtons}>
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            style={styles.refreshButton}
          >
            <FaSync style={{ marginRight: '5px', animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          
          <button 
            onClick={() => navigate('/request-event')}
            style={styles.requestButton}
          >
            <FaPlusCircle style={{ marginRight: '8px' }} />
            Request Event
            {pendingRequests.length > 0 && (
              <span style={styles.requestBadge}>
                {pendingRequests.length}
              </span>
            )}
          </button>
          
          <button 
            onClick={() => navigate('/scan-qr')}
            style={styles.scanButton}
          >
            <FaQrcode style={{ marginRight: '8px' }} />
            Scan QR Code
          </button>
        </div>
      </div>

      {/* Pending Requests Alert */}
      {pendingRequests.length > 0 && (
        <div style={styles.pendingAlert}>
          <FaClipboardList style={styles.alertIcon} />
          <div style={styles.alertContent}>
            <strong>You have {pendingRequests.length} pending event request(s)</strong>
            <p style={styles.alertText}>
              {pendingRequests.map(req => req.title).join(', ')} - 
              Status: {pendingRequests[0].status === 'pending' ? 'Under Review' : 'Revision Needed'}
            </p>
          </div>
          <button 
            onClick={() => navigate('/my-requests')}
            style={styles.viewRequestsButton}
          >
            View Requests
          </button>
        </div>
      )}

      {/* --- NEW: App Promotion Banner --- */}
      <div style={styles.appBanner}>
        <FaMobileAlt style={styles.appIcon} />
        <div style={styles.appContent}>
          <strong>📱 For a better experience, use the mobile app!</strong>
          <p style={styles.appText}>
            Scan QR codes easily on the phone.
          </p>
        </div>
        {/* Optional download button – remove or comment out if not needed */}
        {/* <button style={styles.downloadButton} onClick={() => window.open('https://example.com/app', '_blank')}>
          Download App
        </button> */}
      </div>

      {/* Quick Stats */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <FaCalendarAlt style={styles.statIcon} />
          <div style={styles.statNumber}>{registeredEvents.length}</div>
          <div style={styles.statLabel}>Registered Events</div>
        </div>
        <div style={styles.statCard}>
          <FaUserCheck style={styles.statIcon} />
          <div style={styles.statNumber}>
            {attendedEvents.filter(e => e.status === 'present').length}
          </div>
          <div style={styles.statLabel}>Attended Events</div>
        </div>
        <div style={styles.statCard}>
          <FaClock style={styles.statIcon} />
          <div style={styles.statNumber}>
            {registeredEvents.filter(e => isEventToday(e.startDate || e.date)).length}
          </div>
          <div style={styles.statLabel}>Events Today</div>
        </div>
        <div style={{...styles.statCard, background: '#fff3cd'}}>
          <FaClipboardList style={{...styles.statIcon, color: '#856404'}} />
          <div style={styles.statNumber}>{pendingRequests.length}</div>
          <div style={styles.statLabel}>Pending Requests</div>
        </div>
      </div>

      {/* Today's Events */}
      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Today's Events</h2>
        <div style={styles.eventsGrid}>
          {registeredEvents
            .filter(event => isEventToday(event.startDate || event.date))
            .map(event => (
              <div key={event.id} style={styles.eventCard}>
                <div style={styles.eventHeader}>
                  <h3 style={styles.eventTitle}>{event.title}</h3>
                  <span style={{
                    ...styles.eventStatus,
                    background: event.status === 'published' ? '#28a745' : 
                               event.status === 'ongoing' ? '#3498db' : '#6c757d'
                  }}>
                    {event.status}
                  </span>
                </div>
                
                <div style={styles.eventDetails}>
                  <div style={styles.detailItem}>
                    <FaCalendarAlt style={styles.detailIcon} />
                    <span>{formatDate(event.startDate || event.date)}</span>
                  </div>
                  <div style={styles.detailItem}>
                    <FaMapMarkerAlt style={styles.detailIcon} />
                    <span>{event.isOnline ? 'Online' : event.venue}</span>
                  </div>
                </div>
                
                <div style={styles.eventActions}>
                  <button 
                    onClick={() => navigate(`/events/${event.id}`)}
                    style={styles.viewButton}
                  >
                    View Details
                  </button>
                  <button 
                    onClick={() => navigate(`/scan-qr/${event.id}`)}
                    style={styles.scanEventButton}
                  >
                    <FaQrcode style={{ marginRight: '5px' }} />
                    Scan QR
                  </button>
                </div>
              </div>
            ))}
          
          {registeredEvents.filter(e => isEventToday(e.startDate || e.date)).length === 0 && (
            <div style={styles.emptyState}>
              <p>No events scheduled for today</p>
            </div>
          )}
        </div>
      </div>

      {/* All Registered Events */}
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <h2 style={styles.sectionTitle}>All Registered Events</h2>
          <button 
            onClick={() => navigate('/events')}
            style={styles.viewAllButton}
          >
            View All <FaArrowRight style={{ marginLeft: '5px' }} />
          </button>
        </div>
        
        <div style={styles.eventsTable}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Event</th>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Venue</th>
                <th style={styles.th}>Status</th>
                <th style={styles.th}>Attendance</th>
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {registeredEvents.map(event => {
                const attendance = attendedEvents.find(a => a.eventId === event.id);
                return (
                  <tr key={event.id} style={styles.tr}>
                    <td style={styles.td}>
                      <strong>{event.title}</strong>
                      <div style={styles.eventCode}>Code: {event.eventCode}</div>
                    </td>
                    <td style={styles.td}>{formatDate(event.startDate || event.date)}</td>
                    <td style={styles.td}>
                      {event.isOnline ? 'Online' : event.venue}
                      {event.room && <div style={styles.room}>Room: {event.room}</div>}
                    </td>
                    <td style={styles.td}>
                      <span style={{
                        ...styles.statusBadge,
                        background: event.status === 'published' ? '#28a745' : 
                                   event.status === 'ongoing' ? '#3498db' : '#6c757d'
                      }}>
                        {event.status}
                      </span>
                    </td>
                    <td style={styles.td}>
                      {attendance ? (
                        <span style={{
                          ...styles.attendanceBadge,
                          background: attendance.status === 'present' ? '#28a745' : '#dc3545'
                        }}>
                          {attendance.status.toUpperCase()}
                        </span>
                      ) : (
                        <span style={styles.pendingBadge}>PENDING</span>
                      )}
                    </td>
                    <td style={styles.td}>
                      <div style={styles.actionButtons}>
                        <button 
                          onClick={() => navigate(`/events/${event.id}`)}
                          style={styles.smallButton}
                        >
                          View
                        </button>
                        {!attendance && event.status === 'ongoing' && (
                          <button 
                            onClick={() => navigate(`/scan-qr/${event.id}`)}
                            style={{ ...styles.smallButton, background: '#9b59b6' }}
                          >
                            Scan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '15px'
  },
  headerButtons: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap'
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600'
  },
  scanButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px',
    background: '#9b59b6',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    position: 'relative'
  },
  requestButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px',
    background: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    position: 'relative'
  },
  requestBadge: {
    position: 'absolute',
    top: '-5px',
    right: '-5px',
    background: '#e74c3c',
    color: 'white',
    borderRadius: '50%',
    width: '22px',
    height: '22px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold'
  },
  pendingAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    background: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '10px',
    padding: '15px',
    marginBottom: '25px',
    flexWrap: 'wrap'
  },
  alertIcon: {
    fontSize: '24px',
    color: '#856404'
  },
  alertContent: {
    flex: 1
  },
  alertText: {
    margin: '5px 0 0 0',
    fontSize: '14px',
    color: '#856404'
  },
  viewRequestsButton: {
    padding: '8px 16px',
    background: '#856404',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  // --- New styles for app promotion banner ---
  appBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    background: '#e3f2fd',        // Light blue background
    border: '1px solid #90caf9',
    borderRadius: '10px',
    padding: '15px',
    marginBottom: '25px',
    flexWrap: 'wrap'
  },
  appIcon: {
    fontSize: '24px',
    color: '#1976d2'
  },
  appContent: {
    flex: 1
  },
  appText: {
    margin: '5px 0 0 0',
    fontSize: '14px',
    color: '#1976d2'
  },
  downloadButton: {
    padding: '8px 16px',
    background: '#1976d2',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500'
  },
  // -----------------------------------------
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '40px'
  },
  statCard: {
    background: 'white',
    padding: '25px',
    borderRadius: '15px',
    textAlign: 'center',
    boxShadow: '0 5px 15px rgba(0,0,0,0.1)'
  },
  statIcon: {
    fontSize: '32px',
    color: '#3498db',
    marginBottom: '15px'
  },
  statNumber: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: '5px'
  },
  statLabel: {
    color: '#6c757d',
    fontSize: '14px'
  },
  section: {
    marginBottom: '40px'
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px'
  },
  sectionTitle: {
    color: '#2c3e50',
    marginBottom: '0'
  },
  viewAllButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 16px',
    background: 'transparent',
    color: '#3498db',
    border: '1px solid #3498db',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  eventsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px'
  },
  eventCard: {
    background: 'white',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '15px'
  },
  eventTitle: {
    margin: '0',
    fontSize: '18px',
    color: '#2c3e50'
  },
  eventStatus: {
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    color: 'white',
    fontWeight: 'bold'
  },
  eventDetails: {
    marginBottom: '20px'
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '8px',
    color: '#6c757d',
    fontSize: '14px'
  },
  detailIcon: {
    marginRight: '8px',
    color: '#3498db'
  },
  eventActions: {
    display: 'flex',
    gap: '10px'
  },
  viewButton: {
    flex: 1,
    padding: '8px',
    background: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  scanEventButton: {
    flex: 1,
    padding: '8px',
    background: '#9b59b6',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  eventsTable: {
    background: 'white',
    borderRadius: '10px',
    overflow: 'hidden',
    boxShadow: '0 3px 10px rgba(0,0,0,0.1)'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    padding: '15px',
    textAlign: 'left',
    background: '#f8f9fa',
    borderBottom: '2px solid #e9ecef',
    color: '#2c3e50',
    fontWeight: '600'
  },
  tr: {
    borderBottom: '1px solid #e9ecef',
    ':hover': {
      background: '#f8f9fa'
    }
  },
  td: {
    padding: '15px',
    verticalAlign: 'top'
  },
  eventCode: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '5px'
  },
  room: {
    fontSize: '12px',
    color: '#6c757d',
    marginTop: '5px'
  },
  statusBadge: {
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    color: 'white',
    fontWeight: 'bold',
    display: 'inline-block'
  },
  attendanceBadge: {
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    color: 'white',
    fontWeight: 'bold',
    display: 'inline-block'
  },
  pendingBadge: {
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    background: '#ffc107',
    color: '#212529',
    fontWeight: 'bold',
    display: 'inline-block'
  },
  actionButtons: {
    display: 'flex',
    gap: '5px'
  },
  smallButton: {
    padding: '5px 10px',
    background: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  emptyState: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '40px',
    color: '#6c757d'
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

export default StudentDashboard;