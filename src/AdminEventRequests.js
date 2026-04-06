// src/AdminEventRequests.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot, updateDoc, doc, addDoc, Timestamp, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import {
  FaCheckCircle,
  FaTimesCircle,
  FaExclamationTriangle,
  FaEye,
  FaCheck,
  FaBan,
  FaEdit,
  FaArrowLeft,
  FaUserGraduate,
  FaChalkboardTeacher,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaUsers,
  FaTag,
  FaSpinner,
  FaEnvelope,
  FaClock
} from 'react-icons/fa';

function AdminEventRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [filter, setFilter] = useState('pending');
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribeSnapshot = null;
    let unsubscribeAuth = null;

    const setupListener = (user) => {
      console.log("Admin check for UID:", user?.uid);

      // Query for all event requests (admin can see all)
      const q = query(collection(db, 'event_requests'));

      unsubscribeSnapshot = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          console.log("All requests:", data);
          setRequests(data);
          setLoading(false);
        },
        (error) => {
          console.error("Firestore error:", error);
          setMessage({ type: 'error', text: 'Failed to load requests' });
          setLoading(false);
        }
      );
    };

    unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      // Verify admin status
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data().role === 'admin') {
          setIsAdmin(true);
          setupListener(user);
        } else {
          setMessage({ type: 'error', text: 'Access denied. Admin only.' });
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking admin:', error);
        setMessage({ type: 'error', text: 'Failed to verify permissions' });
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [navigate]);

  const generateEventCode = (request) => {
    const prefix = request.category?.toUpperCase().substring(0, 3) || 'EVT';
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${year}-${randomNum}`;
  };

  const handleApprove = async (request) => {
    if (!window.confirm(`Approve this event request?\n\nTitle: ${request.title}\nRequester: ${request.requesterName}`)) {
      return;
    }

    setProcessing(request.id);
    setMessage({ type: '', text: '' });

    try {
      const eventCode = generateEventCode(request);
      
      // Create the actual event
      const eventData = {
        title: request.title,
        description: request.description,
        shortDescription: request.shortDescription,
        eventCode: eventCode,
        
        date: request.startDate,
        startDate: request.startDate,
        endDate: request.endDate,
        
        venue: request.venue,
        room: request.room || '',
        isOnline: request.isOnline || false,
        meetingLink: request.meetingLink || '',
        
        organizerId: request.requesterId,
        organizerName: request.requesterName,
        organizerEmail: request.requesterEmail,
        organizerRole: request.requesterRole,
        
        category: request.category,
        faculty: request.faculty || 'GENERAL',
        targetAudience: request.targetAudience || ['students'],
        
        capacity: request.capacity || 30,
        attendees: [],
        attendeesCount: 0,
        
        status: 'published',
        registrationOpen: true,
        
        bannerImage: request.bannerImage || '',
        
        createdBy: auth.currentUser.uid,
        createdVia: 'request_approval',
        originalRequestId: request.id,
        
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        publishedAt: Timestamp.now()
      };
      
      const eventRef = await addDoc(collection(db, 'events'), eventData);
      console.log('Event created with ID:', eventRef.id);
      
      // Update the request (no notes needed for approval)
      const requestRef = doc(db, 'event_requests', request.id);
      await updateDoc(requestRef, {
        status: 'approved',
        reviewedAt: Timestamp.now(),
        reviewedBy: auth.currentUser.uid,
        approvedEventId: eventRef.id,
        approvedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      setMessage({ 
        type: 'success', 
        text: `✅ Event "${request.title}" approved! Event Code: ${eventCode}` 
      });
      
      setSelectedRequest(null);
      setReviewNotes('');
      
    } catch (error) {
      console.error('Error approving request:', error);
      setMessage({ type: 'error', text: `Failed to approve: ${error.message}` });
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (request) => {
    if (!reviewNotes.trim()) {
      setMessage({ type: 'error', text: 'Please provide a reason for rejection' });
      return;
    }

    if (!window.confirm(`Reject this event request?\n\nTitle: ${request.title}`)) {
      return;
    }

    setProcessing(request.id);
    setMessage({ type: '', text: '' });

    try {
      const requestRef = doc(db, 'event_requests', request.id);
      await updateDoc(requestRef, {
        status: 'rejected',
        reviewedAt: Timestamp.now(),
        reviewedBy: auth.currentUser.uid,
        reviewNotes: reviewNotes,
        updatedAt: Timestamp.now()
      });

      setMessage({ 
        type: 'success', 
        text: `❌ Request rejected. Requester will be notified.` 
      });
      
      setSelectedRequest(null);
      setReviewNotes('');
      
    } catch (error) {
      console.error('Error rejecting request:', error);
      setMessage({ type: 'error', text: `Failed to reject: ${error.message}` });
    } finally {
      setProcessing(null);
    }
  };

  const handleRevisionNeeded = async (request) => {
    if (!reviewNotes.trim()) {
      setMessage({ type: 'error', text: 'Please provide revision instructions' });
      return;
    }

    setProcessing(request.id);

    try {
      const requestRef = doc(db, 'event_requests', request.id);
      await updateDoc(requestRef, {
        status: 'revision_needed',
        reviewedAt: Timestamp.now(),
        reviewedBy: auth.currentUser.uid,
        reviewNotes: reviewNotes,
        updatedAt: Timestamp.now()
      });

      setMessage({ 
        type: 'success', 
        text: `✏️ Revision requested. Requester will update details.` 
      });
      
      setSelectedRequest(null);
      setReviewNotes('');
      
    } catch (error) {
      console.error('Error requesting revision:', error);
      setMessage({ type: 'error', text: `Failed: ${error.message}` });
    } finally {
      setProcessing(null);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return timestamp.toDate().toLocaleString();
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return '#27ae60';
      case 'rejected': return '#e74c3c';
      case 'revision_needed': return '#f39c12';
      default: return '#3498db';
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'approved': return '#155724';
      case 'rejected': return '#721c24';
      case 'revision_needed': return '#856404';
      default: return '#004085';
    }
  };

  const getStatusBgColor = (status) => {
    switch (status) {
      case 'approved': return '#d4edda';
      case 'rejected': return '#f8d7da';
      case 'revision_needed': return '#fff3cd';
      default: return '#cce5ff';
    }
  };

  const filteredRequests = filter === 'all' 
    ? requests 
    : requests.filter(req => req.status === filter);

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading requests...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={styles.accessDenied}>
        <FaExclamationTriangle size={48} color="#800000" />
        <h2>Access Denied</h2>
        <p>You don't have permission to view this page.</p>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          <FaArrowLeft /> Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/dashboard')} style={styles.backButton}>
          <FaArrowLeft /> Back to Dashboard
        </button>
        <h1 style={styles.title}>Event Request Management</h1>
        <p style={styles.subtitle}>Review and approve event requests from students and lecturers</p>
      </div>

      {/* Message */}
      {message.text && (
        <div style={{
          ...styles.message,
          background: message.type === 'success' ? '#d4edda' : '#f8d7da',
          color: message.type === 'success' ? '#155724' : '#721c24',
        }}>
          {message.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div style={styles.filterTabs}>
        {['pending', 'approved', 'rejected', 'revision_needed', 'all'].map(status => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            style={{
              ...styles.filterTab,
              background: filter === status ? '#800000' : 'white',
              color: filter === status ? 'white' : '#800000',
              borderColor: '#800000'
            }}
          >
            {status === 'revision_needed' ? 'Revision' : status.charAt(0).toUpperCase() + status.slice(1)} 
            ({requests.filter(r => filter === 'all' ? true : r.status === status).length})
          </button>
        ))}
      </div>

      {/* Requests Grid */}
      <div style={styles.requestsGrid}>
        {filteredRequests.length === 0 ? (
          <div style={styles.noRequests}>
            <FaExclamationTriangle size={48} color="#6c757d" />
            <h3>No {filter} requests found</h3>
            <p>There are no event requests to display.</p>
          </div>
        ) : (
          filteredRequests.map(request => (
            <div key={request.id} style={styles.requestCard}>
              {/* Status Badge */}
              <div style={{
                ...styles.statusBadge,
                background: getStatusColor(request.status),
              }}>
                {request.status === 'approved' && <FaCheckCircle />}
                {request.status === 'rejected' && <FaTimesCircle />}
                {request.status === 'revision_needed' && <FaEdit />}
                {request.status === 'pending' && <FaClock />}
                <span style={{ marginLeft: '5px' }}>{request.status.toUpperCase()}</span>
              </div>

              {/* Requester Info */}
              <div style={styles.requesterInfo}>
                <div style={styles.requesterAvatar}>
                  {request.requesterRole === 'student' ? <FaUserGraduate /> : <FaChalkboardTeacher />}
                </div>
                <div>
                  <h3 style={styles.requesterName}>{request.requesterName}</h3>
                  <p style={styles.requesterEmail}>
                    <FaEnvelope style={{ marginRight: '5px' }} />
                    {request.requesterEmail}
                  </p>
                  <p style={styles.requesterRole}>
                    {request.requesterRole} • ID: {request.requesterUserId}
                  </p>
                </div>
              </div>

              {/* Event Title */}
              <h4 style={styles.eventTitle}>{request.title}</h4>

              {/* Event Details */}
              <div style={styles.detailsGrid}>
                <div style={styles.detailItem}>
                  <FaCalendarAlt style={styles.detailIcon} />
                  <span>{formatDate(request.startDate)}</span>
                </div>
                <div style={styles.detailItem}>
                  <FaMapMarkerAlt style={styles.detailIcon} />
                  <span>{request.isOnline ? 'Online' : request.venue}</span>
                </div>
                <div style={styles.detailItem}>
                  <FaUsers style={styles.detailIcon} />
                  <span>Capacity: {request.capacity || 30}</span>
                </div>
                <div style={styles.detailItem}>
                  <FaTag style={styles.detailIcon} />
                  <span>{request.category}</span>
                </div>
              </div>

              {/* Submitted Date */}
              <div style={styles.submittedDate}>
                Submitted: {formatDate(request.submittedAt)}
              </div>

              {/* Action Buttons */}
              <div style={styles.cardActions}>
                <button
                  onClick={() => {
                    if (selectedRequest?.id === request.id) {
                      setSelectedRequest(null);
                      setReviewNotes('');
                    } else {
                      setSelectedRequest(request);
                      setReviewNotes('');
                    }
                  }}
                  style={styles.viewButton}
                >
                  <FaEye /> {selectedRequest?.id === request.id ? 'Hide' : 'View Details'}
                </button>
                
                {request.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleApprove(request)}
                      disabled={processing === request.id}
                      style={styles.approveButton}
                    >
                      {processing === request.id ? <FaSpinner className="fa-spin" /> : <FaCheck />} 
                      Approve
                    </button>
                    <button
                      onClick={() => {
                        setSelectedRequest(request);
                        setReviewNotes('');
                      }}
                      style={styles.rejectButton}
                    >
                      <FaBan /> Reject
                    </button>
                  </>
                )}
              </div>

              {/* Expanded Details */}
              {selectedRequest?.id === request.id && (
                <div style={styles.expandedDetails}>
                  <h4 style={styles.expandedTitle}>Request Details</h4>
                  
                  <div style={styles.detailSection}>
                    <strong>Description:</strong>
                    <p>{request.description}</p>
                  </div>
                  
                  {request.shortDescription && (
                    <div style={styles.detailSection}>
                      <strong>Short Description:</strong>
                      <p>{request.shortDescription}</p>
                    </div>
                  )}
                  
                  {request.additionalNotes && (
                    <div style={styles.detailSection}>
                      <strong>Additional Notes:</strong>
                      <p>{request.additionalNotes}</p>
                    </div>
                  )}
                  
                  {request.reviewNotes && (
                    <div style={{
                      ...styles.detailSection,
                      background: getStatusBgColor(request.status),
                      padding: '10px',
                      borderRadius: '5px'
                    }}>
                      <strong>Previous Review Notes:</strong>
                      <p>{request.reviewNotes}</p>
                    </div>
                  )}

                  {/* Review Input for Rejection or Revision */}
                  {request.status === 'pending' && (
                    <div style={styles.reviewSection}>
                      <label style={styles.reviewLabel}>
                        <strong>Comments (required for Rejection or Revision):</strong>
                      </label>
                      <textarea
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        placeholder="Add reason for rejection or revision instructions..."
                        rows="4"
                        style={styles.reviewInput}
                      />
                      
                      <div style={styles.reviewActions}>
                        <button
                          onClick={() => handleRevisionNeeded(request)}
                          disabled={processing === request.id}
                          style={styles.revisionButton}
                        >
                          <FaEdit /> Request Revision
                        </button>
                        <button
                          onClick={() => handleReject(request)}
                          disabled={processing === request.id}
                          style={styles.rejectConfirmButton}
                        >
                          {processing === request.id ? <FaSpinner className="fa-spin" /> : <FaBan />} 
                          Confirm Rejection
                        </button>
                      </div>
                    </div>
                  )}
                  
                  {/* Review Info for Processed Requests */}
                  {request.status !== 'pending' && (
                    <div style={styles.reviewInfo}>
                      <p>
                        <strong>Reviewed by:</strong> {request.reviewedBy || 'Admin'}<br />
                        <strong>Reviewed at:</strong> {formatDate(request.reviewedAt)}
                      </p>
                      {request.reviewNotes && (
                        <p>
                          <strong>Notes:</strong> {request.reviewNotes}
                        </p>
                      )}
                      {request.approvedEventId && (
                        <p>
                          <strong>Event Created:</strong> {request.approvedEventId}
                          <button
                            onClick={() => navigate(`/events/${request.approvedEventId}`)}
                            style={styles.viewEventButton}
                          >
                            View Event
                          </button>
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f8fafc',
    minHeight: '100vh'
  },
  header: {
    marginBottom: '30px'
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'transparent',
    color: '#800000',
    border: '1px solid #800000',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    marginBottom: '20px'
  },
  title: {
    color: '#800000',
    fontSize: '2rem',
    textAlign: 'center',
    marginBottom: '10px'
  },
  subtitle: {
    textAlign: 'center',
    color: '#666'
  },
  message: {
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '60px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #800000',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  accessDenied: {
    textAlign: 'center',
    padding: '60px',
    maxWidth: '500px',
    margin: '0 auto'
  },
  filterTabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  filterTab: {
    padding: '8px 16px',
    border: '1px solid',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s'
  },
  requestsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))',
    gap: '20px'
  },
  noRequests: {
    gridColumn: '1 / -1',
    textAlign: 'center',
    padding: '60px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  requestCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    position: 'relative',
    transition: 'transform 0.2s',
    ':hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 15px rgba(128,0,0,0.15)'
    }
  },
  statusBadge: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    padding: '5px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  requesterInfo: {
    display: 'flex',
    gap: '15px',
    marginBottom: '15px',
    paddingRight: '100px'
  },
  requesterAvatar: {
    width: '50px',
    height: '50px',
    background: '#800000',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px'
  },
  requesterName: {
    margin: '0 0 5px 0',
    fontSize: '16px',
    color: '#333'
  },
  requesterEmail: {
    margin: '0 0 5px 0',
    fontSize: '13px',
    color: '#666',
    display: 'flex',
    alignItems: 'center'
  },
  requesterRole: {
    margin: 0,
    fontSize: '12px',
    color: '#999',
    textTransform: 'capitalize'
  },
  eventTitle: {
    margin: '0 0 15px 0',
    fontSize: '18px',
    color: '#800000',
    borderBottom: '2px solid #80000020',
    paddingBottom: '10px'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '10px',
    marginBottom: '15px',
    padding: '10px',
    background: '#f8f9fa',
    borderRadius: '8px'
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: '#555'
  },
  detailIcon: {
    color: '#800000',
    fontSize: '12px'
  },
  submittedDate: {
    fontSize: '11px',
    color: '#999',
    marginBottom: '15px',
    padding: '5px',
    background: '#f8f9fa',
    borderRadius: '4px'
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    borderTop: '1px solid #eee',
    paddingTop: '15px'
  },
  viewButton: {
    padding: '8px 12px',
    background: 'transparent',
    color: '#800000',
    border: '1px solid #800000',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.2s',
    ':hover': {
      background: '#800000',
      color: 'white'
    }
  },
  approveButton: {
    padding: '8px 12px',
    background: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.2s',
    ':hover': {
      background: '#219a52'
    }
  },
  rejectButton: {
    padding: '8px 12px',
    background: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.2s',
    ':hover': {
      background: '#c0392b'
    }
  },
  expandedDetails: {
    marginTop: '20px',
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '8px',
    borderTop: '3px solid #800000'
  },
  expandedTitle: {
    margin: '0 0 15px 0',
    color: '#800000',
    fontSize: '16px'
  },
  detailSection: {
    marginBottom: '15px'
  },
  reviewSection: {
    marginTop: '20px',
    padding: '15px',
    background: 'white',
    borderRadius: '8px',
    border: '1px solid #80000020'
  },
  reviewLabel: {
    display: 'block',
    marginBottom: '10px',
    color: '#333'
  },
  reviewInput: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    fontSize: '14px',
    marginBottom: '15px',
    resize: 'vertical'
  },
  reviewActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end'
  },
  revisionButton: {
    padding: '10px 20px',
    background: '#f39c12',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.2s',
    ':hover': {
      background: '#e67e22'
    }
  },
  rejectConfirmButton: {
    padding: '10px 20px',
    background: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    transition: 'all 0.2s',
    ':hover': {
      background: '#c0392b'
    }
  },
  reviewInfo: {
    marginTop: '15px',
    padding: '15px',
    background: '#e8f4f8',
    borderRadius: '5px',
    fontSize: '13px'
  },
  viewEventButton: {
    marginLeft: '10px',
    padding: '3px 10px',
    background: '#800000',
    color: 'white',
    border: 'none',
    borderRadius: '3px',
    cursor: 'pointer',
    fontSize: '11px'
  }
};

// Add CSS animations
const styleSheet = document.styleSheets[0];
try {
  styleSheet.insertRule(`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `, styleSheet.cssRules.length);
  
  styleSheet.insertRule(`
    .fa-spin {
      animation: spin 1s linear infinite;
    }
  `, styleSheet.cssRules.length);
} catch (e) {}

export default AdminEventRequests;