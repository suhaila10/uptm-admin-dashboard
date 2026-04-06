// src/MyEventRequests.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from './firebase';
import {
  FaClock,
  FaCheckCircle,
  FaTimesCircle,
  FaEdit,
  FaArrowLeft,
  FaExclamationTriangle,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaTag,
  FaUsers,
  FaEye,
  FaComment
} from 'react-icons/fa';

function MyEventRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribeSnapshot = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate('/login');
        return;
      }

      console.log("Authenticated UID:", user.uid);

      // Real-time listener for user's requests
      const q = query(
        collection(db, 'event_requests'),
        where('requesterId', '==', user.uid)
      );

      unsubscribeSnapshot = onSnapshot(
        q,
        (snapshot) => {
          const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          console.log("Fetched requests:", data);
          setRequests(data);
          setLoading(false);
        },
        (error) => {
          console.error("Firestore error:", error);
          setLoading(false);
        }
      );
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, [navigate]);

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
      case 'approved': return '#d4edda'; // light green
      case 'rejected': return '#f8d7da'; // light red
      case 'revision_needed': return '#fff3cd'; // light yellow
      default: return '#cce5ff'; // light blue for pending
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'approved': return '#155724'; // dark green
      case 'rejected': return '#721c24'; // dark red
      case 'revision_needed': return '#856404'; // dark yellow/brown
      default: return '#004085'; // dark blue
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <FaCheckCircle style={{ marginRight: '5px' }} />;
      case 'rejected': return <FaTimesCircle style={{ marginRight: '5px' }} />;
      case 'revision_needed': return <FaEdit style={{ marginRight: '5px' }} />;
      default: return <FaClock style={{ marginRight: '5px' }} />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Approved ✓';
      case 'rejected': return 'Rejected ✗';
      case 'revision_needed': return 'Revision Needed ✏️';
      default: return 'Pending Review ⏳';
    }
  };

  const filteredRequests =
    filter === 'all'
      ? requests
      : requests.filter(req => req.status === filter);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px' }}>
        <div style={styles.spinner}></div>
        <h3>Loading your requests...</h3>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      
      {/* Header */}
      <button onClick={() => navigate('/student-dashboard')} style={styles.backButton}>
        <FaArrowLeft /> Back to Dashboard
      </button>

      <h1 style={styles.title}>My Event Requests</h1>

      {/* Filter Buttons - Now includes 'revision_needed' */}
      <div style={styles.filterContainer}>
        {['all', 'pending', 'approved', 'rejected', 'revision_needed'].map(type => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            style={{
              ...styles.filterButton,
              background: filter === type ? '#800000' : '#fff',
              color: filter === type ? '#fff' : '#800000',
              borderColor: '#800000'
            }}
          >
            {type === 'revision_needed' ? 'REVISION' : type.toUpperCase()} (
            {type === 'all'
              ? requests.length
              : requests.filter(r => r.status === type).length}
            )
          </button>
        ))}
      </div>

      {/* Empty State */}
      {filteredRequests.length === 0 ? (
        <div style={styles.emptyState}>
          <FaExclamationTriangle size={48} color="#6c757d" />
          <h3>No {filter} requests found</h3>
          <p>You haven't submitted any {filter !== 'all' ? filter : ''} event requests.</p>
          <button onClick={() => navigate('/request-event')} style={styles.requestButton}>
            Request an Event
          </button>
        </div>
      ) : (
        filteredRequests.map(request => (
          <div key={request.id} style={styles.requestCard}>
            
            {/* Status Badge */}
            <div style={{
              ...styles.statusBadge,
              background: getStatusColor(request.status),
              color: getStatusTextColor(request.status)
            }}>
              {getStatusIcon(request.status)}
              {getStatusText(request.status)}
            </div>

            {/* Event Title */}
            <h3 style={styles.eventTitle}>{request.title}</h3>

            {/* Event Details Grid */}
            <div style={styles.detailsGrid}>
              <div style={styles.detailItem}>
                <FaCalendarAlt style={styles.detailIcon} />
                <span>{formatDate(request.startDate)}</span>
              </div>

              <div style={styles.detailItem}>
                <FaMapMarkerAlt style={styles.detailIcon} />
                <span>{request.isOnline ? 'Online Event' : request.venue}</span>
              </div>

              <div style={styles.detailItem}>
                <FaTag style={styles.detailIcon} />
                <span>{request.category?.replace('_', ' ') || 'Event'}</span>
              </div>

              <div style={styles.detailItem}>
                <FaUsers style={styles.detailIcon} />
                <span>{request.capacity || 30} participants</span>
              </div>
            </div>

            {/* Description */}
            <p style={styles.description}>
              {request.shortDescription || request.description?.substring(0, 100)}
              {request.description?.length > 100 && '...'}
            </p>

            {/* Admin Feedback - Only show if there are review notes */}
            {request.reviewNotes && (
              <div style={{
                ...styles.feedback,
                background: getStatusColor(request.status),
                borderLeft: `4px solid ${getStatusTextColor(request.status)}`
              }}>
                <FaComment style={{ marginRight: '8px', color: getStatusTextColor(request.status) }} />
                <strong>Admin Feedback:</strong> {request.reviewNotes}
              </div>
            )}

            {/* Action Buttons */}
            <div style={styles.actionButtons}>
              <button
                onClick={() => navigate(`/request-event?id=${request.id}`)}
                style={styles.viewButton}
              >
                <FaEye /> View Details
              </button>

              {request.status === 'revision_needed' && (
  <button
    onClick={() => navigate(`/edit-request/${request.id}`)} // Changed from ?edit=
    style={styles.reviseButton}
  >
    <FaEdit /> Revise Request
  </button>
)}

              {/* Show "View Event" button for approved requests */}
              {request.status === 'approved' && request.approvedEventId && (
                <button
                  onClick={() => navigate(`/events/${request.approvedEventId}`)}
                  style={styles.eventButton}
                >
                  View Event
                </button>
              )}
            </div>

            {/* Submission Date */}
            <div style={styles.submittedDate}>
              Submitted: {formatDate(request.submittedAt)}
              {request.reviewedAt && ` • Reviewed: ${formatDate(request.reviewedAt)}`}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '20px',
    backgroundColor: '#f8fafc',
    minHeight: '100vh'
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
    marginBottom: '20px',
    textAlign: 'center'
  },
  filterContainer: {
    display: 'flex',
    gap: '10px',
    marginBottom: '30px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  filterButton: {
    padding: '8px 16px',
    border: '1px solid',
    borderRadius: '20px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s'
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  requestButton: {
    marginTop: '20px',
    padding: '12px 24px',
    background: '#800000',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500'
  },
  requestCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '25px',
    marginBottom: '20px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
    position: 'relative'
  },
  statusBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 15px',
    borderRadius: '25px',
    fontSize: '14px',
    fontWeight: '500',
    marginBottom: '15px'
  },
  eventTitle: {
    fontSize: '20px',
    color: '#333',
    marginBottom: '15px',
    borderBottom: '2px solid #80000020',
    paddingBottom: '10px'
  },
  detailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '15px',
    marginBottom: '15px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px'
  },
  detailItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#555'
  },
  detailIcon: {
    color: '#800000'
  },
  description: {
    color: '#666',
    lineHeight: '1.6',
    marginBottom: '20px',
    padding: '10px',
    background: '#f8f9fa',
    borderRadius: '8px'
  },
  feedback: {
    display: 'flex',
    alignItems: 'center',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px'
  },
  actionButtons: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px',
    flexWrap: 'wrap'
  },
  viewButton: {
    padding: '10px 20px',
    background: '#800000',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  reviseButton: {
    padding: '10px 20px',
    background: '#f39c12',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  eventButton: {
    padding: '10px 20px',
    background: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  submittedDate: {
    fontSize: '12px',
    color: '#999',
    padding: '10px',
    background: '#f8f9fa',
    borderRadius: '6px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #800000',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
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

export default MyEventRequests;