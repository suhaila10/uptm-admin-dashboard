import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaQrcode, 
  FaUsers, 
  FaCheckCircle, 
  FaDownload,
  FaSearch,
  FaArrowLeft,
  FaUserPlus,
  FaExclamationTriangle,
  FaUserCheck,
  FaUserTimes,
  FaClock,
  FaSync,
  FaIdCard
} from 'react-icons/fa';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  updateDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  orderBy,
  onSnapshot,
  arrayUnion,
  increment,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import AttendanceScanner from './AttendanceScanner';

function AttendanceManagement({ user, userData }) {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [manualUserId, setManualUserId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchEventData();
    setupRealtimeAttendance();
  }, [eventId, refreshTrigger]);

  // 🔐 AUTHORIZATION CHECK – Only event organizer or admin may proceed
  useEffect(() => {
    if (event && user) {
      const isOrganizer = user.uid === event.organizerId;
      const isAdmin = userData?.role === 'admin';
      if (!isOrganizer && !isAdmin) {
        alert('You are not authorized to manage attendance for this event.');
        navigate('/dashboard');
      }
    }
  }, [event, user, userData, navigate]);

  // Helper: find user by custom ID (e.g., matric number)
  const findUserByCustomId = async (customId) => {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('userId', '==', customId));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const docSnap = querySnapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
  };

  const fetchEventData = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Fetch event
      const eventDoc = await getDoc(doc(db, 'events', eventId));
      
      if (!eventDoc.exists()) {
        setError('Event not found');
        navigate('/events');
        return;
      }
      
      const eventData = { 
        id: eventDoc.id, 
        ...eventDoc.data(),
        date: eventDoc.data().date?.toDate?.() || new Date()
      };
      setEvent(eventData);
      
      // Fetch registered users (attendees)
      await fetchRegisteredUsers(eventData);
      
    } catch (error) {
      console.error('Error fetching event data:', error);
      setError('Failed to load event data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegisteredUsers = async (eventData) => {
    try {
      if (eventData.attendees && eventData.attendees.length > 0) {
        const users = [];
        const batchSize = 10;
        
        for (let i = 0; i < eventData.attendees.length; i += batchSize) {
          const batch = eventData.attendees.slice(i, i + batchSize);
          const userPromises = batch.map(async (userId) => {
            try {
              const userDoc = await getDoc(doc(db, 'users', userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                return {
                  id: userId,
                  ...userData,
                  registered: true,
                  customUserId: userData.userId || null  // store custom ID if present
                };
              } else {
                return {
                  id: userId,
                  name: 'Unknown User',
                  email: 'N/A',
                  registered: false,
                  customUserId: null
                };
              }
            } catch (error) {
              console.error(`Error fetching user ${userId}:`, error);
              return null;
            }
          });
          
          const batchUsers = await Promise.all(userPromises);
          users.push(...batchUsers.filter(user => user !== null));
        }
        
        setRegisteredUsers(users);
      } else {
        setRegisteredUsers([]);
      }
    } catch (error) {
      console.error('Error fetching registered users:', error);
    }
  };

  const setupRealtimeAttendance = () => {
    const attendanceQuery = query(
      collection(db, 'attendance'),
      where('eventId', '==', eventId),
      orderBy('timestamp', 'desc')
    );

    return onSnapshot(
      attendanceQuery,
      (snapshot) => {
        const records = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate?.()
        }));
        setAttendanceRecords(records);
      },
      (error) => {
        console.warn('Realtime listener error (ignored):', error);
      }
    );
  };

  const markAttendance = async (userIdInput, status = 'present') => {
    try {
      console.log('Starting markAttendance for:', { userIdInput, status, eventId });
      setIsProcessing(true);
      setError('');
      
      if (!userIdInput || !userIdInput.trim()) {
        setError('User ID is required');
        setIsProcessing(false);
        return;
      }
      
      let trimmedInput = userIdInput.trim();
      let userDocSnap = await getDoc(doc(db, 'users', trimmedInput));
      let userData = null;
      let firebaseUid = trimmedInput;
      
      // Try direct Firebase UID lookup
      if (userDocSnap.exists()) {
        userData = userDocSnap.data();
        firebaseUid = trimmedInput;
      } else {
        // Try custom ID lookup
        const customUser = await findUserByCustomId(trimmedInput);
        if (customUser) {
          userData = customUser;
          firebaseUid = customUser.id; // actual Firebase UID
          console.log(`Found user by custom ID: ${trimmedInput} -> Firebase UID: ${firebaseUid}`);
        } else {
          setError('User not found in system. Please check the ID.');
          setIsProcessing(false);
          return;
        }
      }
      
      console.log('User found:', userData.displayName || userData.name);
      
      const isRegistered = event?.attendees?.includes(firebaseUid);
      console.log('Is user registered?', isRegistered);
      
      const batch = writeBatch(db);
      
      if (!isRegistered) {
        const shouldRegister = window.confirm(
          `${userData.displayName || 'User'} is not registered for this event. Register them first?`
        );
        
        if (!shouldRegister) {
          setError('User must be registered before marking attendance');
          setIsProcessing(false);
          return;
        }
        
        const eventRef = doc(db, 'events', eventId);
        batch.update(eventRef, {
          attendees: arrayUnion(firebaseUid),
          attendeesCount: increment(1)
        });
        
        setEvent(prev => ({
          ...prev,
          attendees: [...(prev?.attendees || []), firebaseUid],
          attendeesCount: (prev?.attendeesCount || 0) + 1
        }));
        
        setRegisteredUsers(prev => [...prev, {
          id: firebaseUid,
          name: userData.displayName || userData.name || 'New User',
          email: userData.email || 'N/A',
          registered: true,
          customUserId: userData.userId || null
        }]);
      }

      const attendanceId = `${eventId}_${firebaseUid}`;
      const attendanceRef = doc(db, 'attendance', attendanceId);
      
      const existingRecord = attendanceRecords.find(r => r.userId === firebaseUid);
      const shouldIncrementCount = status === 'present' && (!existingRecord || existingRecord.status !== 'present');
      
      const attendanceData = {
        eventId,
        userId: firebaseUid,
        userName: userData.displayName || userData.name || 'Unknown User',
        userEmail: userData.email || 'N/A',
        status,
        timestamp: serverTimestamp(),
        markedBy: user?.uid || 'system',
        markedByName: user?.displayName || user?.name || 'Organizer',
        updatedAt: serverTimestamp()
      };
      
      batch.set(attendanceRef, attendanceData, { merge: true });
      
      if (shouldIncrementCount) {
        const eventRef = doc(db, 'events', eventId);
        batch.update(eventRef, {
          attendedCount: increment(1)
        });
        
        setEvent(prev => ({
          ...prev,
          attendedCount: (prev?.attendedCount || 0) + 1
        }));
      }

      await batch.commit();
      console.log('Batch committed successfully');
      
      const newRecord = {
        id: attendanceId,
        ...attendanceData,
        timestamp: new Date()
      };
      
      setAttendanceRecords(prev => {
        const filtered = prev.filter(r => r.userId !== firebaseUid);
        return [newRecord, ...filtered];
      });

      const successMessage = `✅ Attendance marked as ${status} for ${userData.displayName || firebaseUid}`;
      console.log(successMessage);
      
      setManualUserId('');
      alert(successMessage);
      
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 500);
      
    } catch (error) {
      console.error('Error in markAttendance:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      if (error.code === 'permission-denied') {
        setError('Permission denied. Check Firebase security rules.');
      } else {
        setError(`Failed to mark attendance: ${error.message}`);
      }
      alert('Failed to mark attendance. Please check console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  const registerUserForEvent = async (userId, userData = null) => {
    try {
      console.log('Registering user for event:', userId);
      
      if (!userData) {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }
        userData = userDoc.data();
      }
      
      const eventRef = doc(db, 'events', eventId);
      await updateDoc(eventRef, {
        attendees: arrayUnion(userId),
        attendeesCount: increment(1)
      });

      setEvent(prev => ({
        ...prev,
        attendees: [...(prev?.attendees || []), userId],
        attendeesCount: (prev?.attendeesCount || 0) + 1
      }));

      setRegisteredUsers(prev => [...prev, {
        id: userId,
        name: userData.displayName || userData.name || 'New User',
        email: userData.email || 'N/A',
        registered: true,
        customUserId: userData.userId || null
      }]);

      console.log('✅ User registered successfully:', userId);
      
      setRefreshTrigger(prev => prev + 1);
      
      return true;
      
    } catch (error) {
      console.error('Error in registerUserForEvent:', error);
      throw error;
    }
  };

  const refreshData = async () => {
    setRefreshTrigger(prev => prev + 1);
    alert('Data refreshed!');
  };

  const exportAttendance = () => {
    try {
      if (attendanceRecords.length === 0) {
        alert('No attendance records to export');
        return;
      }

      const headers = ['User ID', 'Custom ID', 'Name', 'Email', 'Status', 'Timestamp', 'Marked By'];
      const csvContent = [
        headers.join(','),
        ...attendanceRecords.map(record => {
          const user = registeredUsers.find(u => u.id === record.userId);
          const customId = user?.customUserId || '';
          return [
            record.userId,
            `"${customId}"`,
            `"${record.userName || 'N/A'}"`,
            `"${record.userEmail || 'N/A'}"`,
            record.status,
            record.timestamp ? record.timestamp.toLocaleString() : 'N/A',
            `"${record.markedByName || 'System'}"`
          ].join(',');
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance_${event?.eventCode || eventId}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      console.log('✅ Attendance exported successfully');
      alert('✅ Attendance exported successfully!');
      
    } catch (error) {
      console.error('Error exporting attendance:', error);
      alert('Failed to export attendance');
    }
  };

  const getAttendanceStatus = (userId) => {
    const record = attendanceRecords.find(r => r.userId === userId);
    return record ? record.status : 'not_marked';
  };

  const getAttendanceRecord = (userId) => {
    return attendanceRecords.find(r => r.userId === userId);
  };

  const filteredAttendees = registeredUsers.filter(attendee => {
    const matchesSearch = 
      attendee.id?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      attendee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      attendee.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (attendee.customUserId && attendee.customUserId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const status = getAttendanceStatus(attendee.id);
    const matchesFilter = filter === 'all' || status === filter;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'present': return '#28a745';
      case 'late': return '#ffc107';
      case 'absent': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'present': return <FaUserCheck />;
      case 'late': return <FaClock />;
      case 'absent': return <FaUserTimes />;
      default: return <FaExclamationTriangle />;
    }
  };

  const handleManualAttendance = (status) => {
    if (!manualUserId.trim()) {
      setError('Please enter a User ID');
      return;
    }
    
    if (isProcessing) {
      setError('Please wait, processing previous request...');
      return;
    }
    
    markAttendance(manualUserId.trim(), status);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <h3>Loading Attendance Management...</h3>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button 
          onClick={() => navigate(`/events/${eventId}`)}
          style={styles.backButton}
        >
          <FaArrowLeft style={{ marginRight: '8px' }} />
          Back to Event
        </button>
        <div style={styles.headerRight}>
          <h2 style={styles.title}>Attendance Management</h2>
          <div style={styles.headerStats}>
            <div style={styles.statBadge}>
              <FaUsers />
              <span>Registered: {registeredUsers.length}</span>
            </div>
            <div style={styles.statBadge}>
              <FaCheckCircle />
              <span>Present: {attendanceRecords.filter(r => r.status === 'present').length}</span>
            </div>
            <div style={styles.statBadge}>
              <FaClock />
              <span>Late: {attendanceRecords.filter(r => r.status === 'late').length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Event Info */}
      {event && (
        <div style={styles.eventInfo}>
          <div style={styles.eventHeader}>
            <div>
              <h3 style={styles.eventTitle}>{event.title}</h3>
              <p style={styles.eventCode}>Event Code: <strong>{event.eventCode}</strong></p>
            </div>
            <button 
              onClick={refreshData}
              style={styles.refreshButton}
              disabled={isProcessing}
            >
              <FaSync style={{ marginRight: '8px' }} />
              Refresh Data
            </button>
          </div>
          <div style={styles.eventDetails}>
            <p><strong>Date:</strong> {event.date?.toLocaleDateString()}</p>
            <p><strong>Venue:</strong> {event.venue}</p>
            <p><strong>Capacity:</strong> {event.capacity} • <strong>Registered:</strong> {event.attendeesCount || 0} • <strong>Attended:</strong> {event.attendedCount || 0}</p>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={styles.errorAlert}>
          <FaExclamationTriangle style={{ marginRight: '10px' }} />
          {error}
        </div>
      )}

      <div style={styles.mainContent}>
        {/* Left: Scanner & Manual Entry */}
        <div style={styles.scannerSection}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              <FaQrcode style={{ marginRight: '10px' }} />
              QR Code Scanner
            </h3>
            <AttendanceScanner 
              eventId={eventId} 
              event={event}
              onScanSuccess={(userId) => markAttendance(userId, 'present')}
              onScanError={(error) => setError(error)}
              disabled={isProcessing}
            />
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>
              <FaUserPlus style={{ marginRight: '10px' }} />
              Manual Attendance Entry
            </h3>
            <div style={styles.manualEntry}>
              <input
                type="text"
                placeholder="Enter Firebase UID or Custom ID (e.g., student ID)"
                value={manualUserId}
                onChange={(e) => setManualUserId(e.target.value)}
                style={styles.input}
                disabled={isProcessing}
              />
              <div style={styles.manualButtons}>
                <button 
                  onClick={() => handleManualAttendance('present')}
                  style={styles.manualButton}
                  disabled={isProcessing}
                >
                  <FaUserCheck style={{ marginRight: '8px' }} />
                  {isProcessing ? 'Processing...' : 'Mark as Present'}
                </button>
                <button 
                  onClick={() => handleManualAttendance('late')}
                  style={{ ...styles.manualButton, background: '#ffc107' }}
                  disabled={isProcessing}
                >
                  <FaClock style={{ marginRight: '8px' }} />
                  {isProcessing ? 'Processing...' : 'Mark as Late'}
                </button>
                <button 
                  onClick={() => handleManualAttendance('absent')}
                  style={{ ...styles.manualButton, background: '#dc3545' }}
                  disabled={isProcessing}
                >
                  <FaUserTimes style={{ marginRight: '8px' }} />
                  {isProcessing ? 'Processing...' : 'Mark as Absent'}
                </button>
              </div>
              <p style={styles.manualNote}>
                You can enter either the Firebase UID or the custom ID (e.g., student ID) that appears in the list below.
              </p>
            </div>
          </div>
        </div>

        {/* Right: Attendance List */}
        <div style={styles.listSection}>
          <div style={styles.card}>
            <div style={styles.listHeader}>
              <h3 style={styles.cardTitle}>
                <FaUsers style={{ marginRight: '10px' }} />
                Attendance List ({filteredAttendees.length})
              </h3>
              
              {/* Controls */}
              <div style={styles.controls}>
                <div style={styles.searchBox}>
                  <FaSearch style={styles.searchIcon} />
                  <input
                    type="text"
                    placeholder="Search by ID, Custom ID, Name, or Email"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={styles.searchInput}
                    disabled={isProcessing}
                  />
                </div>
                
                <select 
                  value={filter} 
                  onChange={(e) => setFilter(e.target.value)}
                  style={styles.filterSelect}
                  disabled={isProcessing}
                >
                  <option value="all">All Status</option>
                  <option value="present">Present</option>
                  <option value="late">Late</option>
                  <option value="absent">Absent</option>
                  <option value="not_marked">Not Marked</option>
                </select>
                
                <button 
                  onClick={exportAttendance} 
                  style={styles.exportButton}
                  disabled={isProcessing || attendanceRecords.length === 0}
                >
                  <FaDownload style={{ marginRight: '5px' }} />
                  Export CSV
                </button>
              </div>
            </div>

            {/* Attendance Table */}
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Custom ID</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Time</th>
                    <th style={styles.th}>Actions</th>
                   </tr>
                </thead>
                <tbody>
                  {filteredAttendees.map((attendee) => {
                    const attendanceStatus = getAttendanceStatus(attendee.id);
                    const record = getAttendanceRecord(attendee.id);
                    
                    return (
                      <tr key={attendee.id} style={styles.tr}>
                        <td style={styles.td}>
                          {attendee.customUserId ? (
                            <code style={styles.userId} title={attendee.id}>
                              {attendee.customUserId}
                            </code>
                          ) : (
                            <code style={styles.userId} title={attendee.id}>
                              {attendee.id.substring(0, 8)}...
                            </code>
                          )}
                        </td>
                        <td style={styles.td}>
                          <div style={styles.userInfo}>
                            <div style={styles.avatar}>
                              {attendee.name?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div style={styles.userName}>{attendee.name || 'Unknown User'}</div>
                              {!attendee.registered && (
                                <div style={styles.notRegisteredBadge}>Not Registered</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td style={styles.tdEmail}>{attendee.email || 'N/A'}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.statusBadge,
                            background: getStatusColor(attendanceStatus)
                          }}>
                            {getStatusIcon(attendanceStatus)}
                            {attendanceStatus.replace('_', ' ').toUpperCase()}
                          </span>
                        </td>
                        <td style={styles.td}>
                          {record?.timestamp 
                            ? record.timestamp.toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit',
                                second: '2-digit'
                              })
                            : '—'
                          }
                        </td>
                        <td style={styles.td}>
                          <div style={styles.actionButtons}>
                            <button 
                              onClick={() => markAttendance(attendee.id, 'present')}
                              style={{
                                ...styles.actionButton,
                                background: attendanceStatus === 'present' ? '#28a745' : '#6c757d',
                                opacity: isProcessing ? 0.5 : 1
                              }}
                              title="Mark as Present"
                              disabled={isProcessing || attendanceStatus === 'present'}
                            >
                              <FaUserCheck />
                            </button>
                            <button 
                              onClick={() => markAttendance(attendee.id, 'late')}
                              style={{
                                ...styles.actionButton,
                                background: attendanceStatus === 'late' ? '#ffc107' : '#6c757d',
                                opacity: isProcessing ? 0.5 : 1
                              }}
                              title="Mark as Late"
                              disabled={isProcessing || attendanceStatus === 'late'}
                            >
                              <FaClock />
                            </button>
                            <button 
                              onClick={() => markAttendance(attendee.id, 'absent')}
                              style={{
                                ...styles.actionButton,
                                background: attendanceStatus === 'absent' ? '#dc3545' : '#6c757d',
                                opacity: isProcessing ? 0.5 : 1
                              }}
                              title="Mark as Absent"
                              disabled={isProcessing || attendanceStatus === 'absent'}
                            >
                              <FaUserTimes />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {filteredAttendees.length === 0 && (
                <div style={styles.emptyState}>
                  {searchTerm || filter !== 'all' ? 'No matching attendees found' : 'No registered attendees yet'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    minHeight: '100vh',
    backgroundColor: '#f8f9fa'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '70vh'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '5px solid #f3f3f3',
    borderTop: '5px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    minWidth: '150px'
  },
  headerRight: {
    flex: 1,
    minWidth: '300px'
  },
  title: {
    color: '#2c3e50',
    margin: '0 0 15px 0',
    fontSize: '2rem',
    fontWeight: '600'
  },
  headerStats: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap'
  },
  statBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    background: 'white',
    borderRadius: '20px',
    color: '#495057',
    fontSize: '14px',
    fontWeight: '500',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  eventInfo: {
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    padding: '25px',
    borderRadius: '15px',
    marginBottom: '30px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.1)'
  },
  eventHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
    marginBottom: '15px'
  },
  eventTitle: {
    margin: 0,
    fontSize: '1.5rem',
    fontWeight: '600'
  },
  eventCode: {
    fontSize: '16px',
    opacity: 0.9,
    marginTop: '5px'
  },
  refreshButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    background: 'rgba(255,255,255,0.2)',
    color: 'white',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease'
  },
  eventDetails: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '20px',
    fontSize: '14px'
  },
  errorAlert: {
    background: '#f8d7da',
    color: '#721c24',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #f5c6cb'
  },
  mainContent: {
    display: 'grid',
    gridTemplateColumns: '1fr 2fr',
    gap: '30px'
  },
  scannerSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '25px'
  },
  listSection: {
    display: 'flex',
    flexDirection: 'column'
  },
  card: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.05)',
    height: 'fit-content'
  },
  cardTitle: {
    color: '#2c3e50',
    display: 'flex',
    alignItems: 'center',
    margin: '0 0 20px 0',
    fontSize: '1.3rem',
    fontWeight: '600'
  },
  manualEntry: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  input: {
    width: '100%',
    padding: '15px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '16px',
    transition: 'border-color 0.3s',
    boxSizing: 'border-box'
  },
  manualButtons: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  manualButton: {
    flex: 1,
    padding: '15px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    minWidth: '150px'
  },
  manualNote: {
    color: '#6c757d',
    fontSize: '14px',
    margin: '10px 0 0 0',
    fontStyle: 'italic',
    lineHeight: '1.5'
  },
  listHeader: {
    marginBottom: '25px'
  },
  controls: {
    display: 'flex',
    gap: '15px',
    flexWrap: 'wrap',
    alignItems: 'center'
  },
  searchBox: {
    flex: 1,
    minWidth: '250px',
    position: 'relative'
  },
  searchIcon: {
    position: 'absolute',
    left: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#6c757d'
  },
  searchInput: {
    width: '100%',
    padding: '12px 12px 12px 45px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '16px',
    transition: 'border-color 0.3s',
    boxSizing: 'border-box'
  },
  filterSelect: {
    padding: '12px 20px',
    border: '2px solid #e9ecef',
    borderRadius: '8px',
    fontSize: '16px',
    background: 'white',
    cursor: 'pointer',
    minWidth: '150px',
    boxSizing: 'border-box'
  },
  exportButton: {
    padding: '12px 24px',
    background: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    transition: 'all 0.3s ease',
    whiteSpace: 'nowrap'
  },
  tableContainer: {
    overflowX: 'auto',
    borderRadius: '8px',
    border: '1px solid #e9ecef',
    maxHeight: '600px',
    overflowY: 'auto'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '800px'
  },
  th: {
    padding: '18px 15px',
    textAlign: 'left',
    borderBottom: '2px solid #dee2e6',
    background: '#f8f9fa',
    color: '#495057',
    fontWeight: '600',
    fontSize: '14px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    wordBreak: 'break-word'
  },
  tr: {
    transition: 'background 0.3s'
  },
  td: {
    padding: '18px 15px',
    borderBottom: '1px solid #e9ecef',
    verticalAlign: 'middle',
    wordBreak: 'break-word',
    maxWidth: '250px' // Prevents extremely long strings from breaking layout
  },
  tdEmail: {
    padding: '18px 15px',
    borderBottom: '1px solid #e9ecef',
    verticalAlign: 'middle',
    wordBreak: 'break-all', // Ensures long emails wrap
    maxWidth: '200px'
  },
  userId: {
    background: '#f8f9fa',
    padding: '4px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '13px',
    color: '#495057',
    cursor: 'help',
    wordBreak: 'break-all'
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: '16px',
    flexShrink: 0
  },
  userName: {
    fontWeight: '500',
    marginBottom: '4px'
  },
  notRegisteredBadge: {
    background: '#ffc107',
    color: '#856404',
    padding: '2px 8px',
    borderRadius: '10px',
    fontSize: '11px',
    fontWeight: '600',
    display: 'inline-block'
  },
  statusBadge: {
    padding: '8px 15px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: 'fit-content',
    minWidth: '100px',
    justifyContent: 'center'
  },
  actionButtons: {
    display: 'flex',
    gap: '8px'
  },
  actionButton: {
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '16px',
    transition: 'all 0.3s ease'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: '#6c757d',
    fontSize: '16px',
    background: '#f8f9fa'
  }
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  input:focus, select:focus {
    outline: none;
    border-color: #3498db;
  }
  
  @media (max-width: 1024px) {
    .mainContent {
      grid-template-columns: 1fr !important;
    }
  }
`;
document.head.appendChild(styleSheet);

export default AttendanceManagement;