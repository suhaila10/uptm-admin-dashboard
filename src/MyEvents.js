// src/MyEvents.js - Updated with UPTM dashboard colors
import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  doc, 
  arrayRemove,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Link, useNavigate } from 'react-router-dom';
import { CertificateGenerator } from './CertificateGenerator';
import { 
  FaCalendarAlt, 
  FaMapMarkerAlt, 
  FaUsers, 
  FaUserTie, 
  FaEnvelope, 
  FaClock,
  FaTag, 
  FaUniversity, 
  FaCertificate, 
  FaArrowLeft, 
  FaCheckCircle, 
  FaRegCalendarCheck, 
  FaRegCalendarTimes,
  FaGlobe,
  FaUserFriends,
  FaUserCheck,
  FaLink,
  FaLock,
  FaFileAlt,
  FaBuilding,
  FaListAlt,
  FaChartBar,
  FaPrint,
  FaShareAlt,
  FaEdit,
  FaExclamationTriangle,
  FaTimes,
  FaTrash,
  FaSpinner,
  FaInfoCircle,
  FaUtensils,
  FaChair,
  FaFilePdf
} from 'react-icons/fa';

// UPTM Color Palette (matches Dashboard)
const colors = {
  maroon: '#800000',      // Primary UPTM maroon
  darkMaroon: '#5a0000',   // Darker maroon for gradients
  navy: '#1a2b4c',        // Navy blue
  darkNavy: '#0f1a30',     // Darker navy
  white: '#ffffff',
  lightGray: '#f5f5f5',
  borderGray: '#e0e0e0'
};

function MyEvents({ user, userData }) {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('upcoming');
  const [cancelling, setCancelling] = useState(null);
  const [showCancelReason, setShowCancelReason] = useState(null);
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  useEffect(() => {
    fetchMyEvents();
  }, [filter]);

  // Helper functions (unchanged)
  const getDaysUntilEvent = (eventDate) => {
    const eventStart = eventDate?.toDate();
    const now = new Date();
    const diffTime = eventStart - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const canCancelRegistration = (event) => {
    if (!event) return false;
    const eventStartDate = (event.startDate || event.date).toDate();
    const now = new Date();
    const daysUntilEvent = Math.ceil((eventStartDate - now) / (1000 * 60 * 60 * 24));
    const cancellationDeadline = event.cancellationDeadline || 7;
    return daysUntilEvent >= cancellationDeadline && eventStartDate > now;
  };

  const getCancellationDeadlineDate = (event) => {
    if (!event) return null;
    const eventStartDate = (event.startDate || event.date).toDate();
    const cancellationDeadline = event.cancellationDeadline || 7;
    return new Date(eventStartDate.getTime() - (cancellationDeadline * 24 * 60 * 60 * 1000));
  };

  const fetchMyEvents = async () => {
    try {
      setLoading(true);
      const userId = auth.currentUser?.uid;
      if (!userId) {
        navigate('/login');
        return;
      }

      let baseQuery = query(
        collection(db, 'events'),
        where('attendees', 'array-contains', userId)
      );

      const querySnapshot = await getDocs(baseQuery);
      const eventsData = [];
      querySnapshot.forEach((docSnap) => {
        const eventData = docSnap.data();
        eventsData.push({ id: docSnap.id, ...eventData });
      });

      const now = new Date();
      const filteredEvents = eventsData.filter(event => {
        const eventDate = event.date?.toDate();
        switch(filter) {
          case 'upcoming': return eventDate >= now;
          case 'past': return eventDate < now;
          default: return true;
        }
      });

      filteredEvents.sort((a, b) => {
        const dateA = a.date?.toDate() || new Date(0);
        const dateB = b.date?.toDate() || new Date(0);
        return dateA - dateB;
      });

      setEvents(filteredEvents);
    } catch (error) {
      console.error('Error fetching my events:', error);
      alert('Failed to load your events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelRegistration = async (event) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    if (!canCancelRegistration(event)) {
      const daysUntil = getDaysUntilEvent(event.date);
      const deadline = event.cancellationDeadline || 7;
      alert(`❌ You cannot cancel your registration less than ${deadline} days before the event.\n\n` +
            `This helps organizers prepare food, materials, and seating arrangements.\n\n` +
            `If you have an emergency, please contact the organizer directly.`);
      return;
    }

    const confirmCancel = window.confirm(
      'Are you sure you want to cancel your registration?\n\n' +
      '• Your spot will be given to someone else\n' +
      '• You will not receive a certificate\n' +
      '• You can re-register if spots are still available\n\n' +
      'Do you want to continue?'
    );

    if (!confirmCancel) return;

    setCancelling(event.id);
    try {
      const eventRef = doc(db, 'events', event.id);
      await updateDoc(eventRef, {
        attendees: arrayRemove(userId),
        attendeesCount: (event.attendeesCount || 1) - 1,
        cancelledAt: Timestamp.now()
      });
      await fetchMyEvents();
      alert('✅ Registration cancelled successfully.');
    } catch (error) {
      console.error('Error cancelling registration:', error);
      alert('❌ Failed to cancel registration. Please try again.');
    } finally {
      setCancelling(null);
      setShowCancelReason(null);
    }
  };

  const getEventStatus = (eventDate, event) => {
    const now = new Date();
    const eventDateObj = eventDate?.toDate();
    if (!eventDateObj) return 'Unknown';
    if (eventDateObj < now) return 'Completed';
    const daysUntil = getDaysUntilEvent(eventDate);
    const cancellationDeadline = event.cancellationDeadline || 7;
    if (daysUntil < cancellationDeadline) return 'Locked';
    if (daysUntil < 1) return 'Today';
    if (daysUntil < 2) return 'Tomorrow';
    return 'Upcoming';
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'Completed': return colors.navy;
      case 'Locked': return colors.maroon;
      case 'Today': return '#dc3545';
      case 'Tomorrow': return '#fd7e14';
      case 'Upcoming': return '#28a745';
      default: return '#6c757d';
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date not set';
    const date = timestamp.toDate();
    return date.toLocaleDateString('en-MY', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDeadline = (date) => {
    return date.toLocaleDateString('en-MY', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  // Calculate stats
  const stats = {
    total: events.length,
    upcoming: events.filter(e => e.date?.toDate() >= new Date()).length,
    past: events.filter(e => e.date?.toDate() < new Date()).length,
    locked: events.filter(e => {
      if (e.date?.toDate() < new Date()) return false;
      const daysUntil = getDaysUntilEvent(e.date);
      const deadline = e.cancellationDeadline || 7;
      return daysUntil < deadline;
    }).length
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '50vh' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ 
            width: '50px', 
            height: '50px', 
            border: `5px solid ${colors.lightGray}`, 
            borderTop: `5px solid ${colors.maroon}`, 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: colors.navy }}>Loading your events...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: 'auto', padding: '20px', backgroundColor: colors.lightGray, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ 
        marginBottom: '30px',
        padding: '20px',
        backgroundColor: colors.white,
        borderRadius: '10px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        border: `1px solid ${colors.borderGray}`
      }}>
        <h1 style={{ margin: '0 0 10px 0', color: colors.maroon }}>My Events</h1>
        <p style={{ color: colors.navy, margin: 0 }}>
          Manage your event registrations and view attendance history
        </p>
      </div>

      {/* Stats Cards - Updated to match Dashboard gradients */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <div style={{ 
          background: `linear-gradient(135deg, ${colors.maroon} 0%, ${colors.darkMaroon} 100%)`,
          color: colors.white,
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(128,0,0,0.2)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>TOTAL REGISTERED</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>{stats.total}</p>
        </div>

        <div style={{ 
          background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.darkNavy} 100%)`,
          color: colors.white,
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(26,43,76,0.2)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>UPCOMING</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>{stats.upcoming}</p>
        </div>

        <div style={{ 
          background: `linear-gradient(135deg, ${colors.maroon} 0%, ${colors.navy} 100%)`,
          color: colors.white,
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(128,0,0,0.2)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>PAST EVENTS</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>{stats.past}</p>
        </div>

        <div style={{ 
          background: `linear-gradient(135deg, ${colors.navy} 0%, ${colors.maroon} 100%)`,
          color: colors.white,
          padding: '20px',
          borderRadius: '10px',
          boxShadow: '0 4px 6px rgba(26,43,76,0.2)'
        }}>
          <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', opacity: 0.9 }}>LOCKED</h3>
          <p style={{ margin: 0, fontSize: '32px', fontWeight: 'bold' }}>{stats.locked}</p>
        </div>
      </div>

      {/* Filter Tabs - Updated with UPTM colors */}
      <div style={{ 
        display: 'flex', 
        gap: '10px', 
        marginBottom: '20px',
        paddingBottom: '15px',
        borderBottom: `1px solid ${colors.borderGray}`,
        flexWrap: 'wrap'
      }}>
        <button
          onClick={() => setFilter('upcoming')}
          style={{
            padding: '10px 20px',
            background: filter === 'upcoming' ? colors.maroon : 'transparent',
            color: filter === 'upcoming' ? colors.white : colors.maroon,
            border: `1px solid ${colors.maroon}`,
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: filter === 'upcoming' ? 'bold' : 'normal'
          }}
        >
          Upcoming ({stats.upcoming})
        </button>
        <button
          onClick={() => setFilter('past')}
          style={{
            padding: '10px 20px',
            background: filter === 'past' ? colors.navy : 'transparent',
            color: filter === 'past' ? colors.white : colors.navy,
            border: `1px solid ${colors.navy}`,
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: filter === 'past' ? 'bold' : 'normal'
          }}
        >
          Past ({stats.past})
        </button>
        <button
          onClick={() => setFilter('all')}
          style={{
            padding: '10px 20px',
            background: filter === 'all' ? colors.maroon : 'transparent',
            color: filter === 'all' ? colors.white : colors.maroon,
            border: `1px solid ${colors.maroon}`,
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: filter === 'all' ? 'bold' : 'normal'
          }}
        >
          All ({stats.total})
        </button>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div style={{ 
          textAlign: 'center', 
          padding: '50px 20px',
          background: colors.white,
          borderRadius: '10px',
          border: `2px dashed ${colors.borderGray}`,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', opacity: 0.5 }}>📅</div>
          <h3 style={{ color: colors.navy }}>No Events Found</h3>
          <p style={{ color: colors.navy, marginBottom: '20px' }}>
            {filter === 'upcoming' 
              ? "You haven't registered for any upcoming events."
              : filter === 'past'
              ? "You haven't attended any events yet."
              : "You haven't registered for any events."}
          </p>
          <Link to="/events">
            <button style={{
              padding: '12px 24px',
              background: colors.maroon,
              color: colors.white,
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontSize: '16px'
            }}>
              Browse Events
            </button>
          </Link>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '20px' }}>
          {events.map(event => {
            const status = getEventStatus(event.date, event);
            const isPast = event.date?.toDate() < new Date();
            const canCancel = canCancelRegistration(event);
            const daysUntil = getDaysUntilEvent(event.date);
            const deadline = event.cancellationDeadline || 7;
            const deadlineDate = getCancellationDeadlineDate(event);
            
            return (
              <div key={event.id} style={{ 
                background: colors.white,
                borderRadius: '10px',
                padding: '20px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
                border: `1px solid ${colors.borderGray}`,
                position: 'relative',
                borderLeft: `4px solid ${status === 'Locked' ? colors.maroon : colors.navy}`
              }}>
                {/* Status Badge - updated with maroon/navy */}
                <div style={{
                  position: 'absolute',
                  top: '15px',
                  right: '15px',
                  background: getStatusColor(status),
                  color: colors.white,
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {status}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '20px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 10px 0', color: colors.maroon }}>
                      <Link 
                        to={`/events/${event.id}`}
                        style={{ color: colors.maroon, textDecoration: 'none' }}
                      >
                        {event.title}
                      </Link>
                    </h3>
                    
                    <div style={{ marginBottom: '15px' }}>
                      <p style={{ margin: '5px 0', color: colors.navy }}>
                        <span style={{ marginRight: '10px' }}>📅 {formatDate(event.date)}</span>
                        <span>📍 {event.venue}</span>
                      </p>
                      <p style={{ margin: '5px 0', color: colors.navy }}>
                        👥 {event.attendeesCount || 0} attending • Capacity: {event.capacity}
                      </p>
                    </div>

                    {event.description && (
                      <p style={{ 
                        color: colors.navy, 
                        lineHeight: '1.6',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {event.description}
                      </p>
                    )}

                    {/* Cancellation Info */}
                    {!isPast && (
                      <div style={{ 
                        marginTop: '15px',
                        padding: '12px',
                        background: canCancel ? '#d4edda' : '#f8d7da',
                        borderRadius: '6px',
                        fontSize: '13px',
                        color: canCancel ? '#155724' : '#721c24',
                        borderLeft: `3px solid ${colors.maroon}`
                      }}>
                        {canCancel ? (
                          <>
                            <FaCheckCircle style={{ marginRight: '5px', color: colors.maroon }} />
                            You can cancel until{' '}
                            <strong>{deadlineDate ? formatDeadline(deadlineDate) : `${deadline} days before`}</strong>
                          </>
                        ) : (
                          <>
                            <FaExclamationTriangle style={{ marginRight: '5px', color: colors.maroon }} />
                            Cannot cancel - less than {deadline} days before event
                            {daysUntil <= 0 ? '' : ` (${daysUntil} days left)`}
                            <br />
                            <small>This helps organizers prepare food and materials</small>
                          </>
                        )}
                      </div>
                    )}

                    <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                      <Link to={`/events/${event.id}`}>
                        <button style={{
                          padding: '8px 16px',
                          background: 'transparent',
                          color: colors.maroon,
                          border: `1px solid ${colors.maroon}`,
                          borderRadius: '5px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}>
                          View Details
                        </button>
                      </Link>

                      {isPast && (
                        <button 
                          onClick={() => {
                            const checkAttendanceAndShowCertificate = async () => {
                              const userId = auth.currentUser?.uid;
                              const attendanceQuery = query(
                                collection(db, 'attendance'),
                                where('eventId', '==', event.id),
                                where('userId', '==', userId)
                              );
                              const attendanceSnap = await getDocs(attendanceQuery);
                              if (attendanceSnap.empty) {
                                alert('You did not attend this event. Certificate is only available for attendees.');
                                return;
                              }
                              const record = attendanceSnap.docs[0].data();
                              if (record.status !== 'present' && record.status !== 'late') {
                                alert('Certificate is only available for attendees who were present or excused late.');
                                return;
                              }
                              setSelectedEvent(event);
                              setShowCertificateModal(true);
                            };
                            checkAttendanceAndShowCertificate();
                          }}
                          style={{
                            padding: '8px 16px',
                            background: colors.navy,
                            color: colors.white,
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                          }}
                        >
                          <FaCertificate /> View Certificate
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '180px' }}>
                    {!isPast && (
                      <button
                        onClick={() => handleCancelRegistration(event)}
                        disabled={cancelling === event.id || !canCancel}
                        style={{
                          padding: '12px 20px',
                          background: cancelling === event.id ? colors.navy : 
                                     !canCancel ? colors.maroon : colors.maroon,
                          color: colors.white,
                          border: 'none',
                          borderRadius: '5px',
                          cursor: cancelling === event.id || !canCancel ? 'not-allowed' : 'pointer',
                          fontSize: '14px',
                          opacity: cancelling === event.id || !canCancel ? 0.7 : 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px'
                        }}
                      >
                        {cancelling === event.id ? (
                          <>
                            <FaSpinner className="spinner-icon" />
                            Cancelling...
                          </>
                        ) : !canCancel ? (
                          <>
                            <FaLock style={{ marginRight: '5px' }} />
                            Cancellation Locked
                          </>
                        ) : (
                          'Cancel Registration'
                        )}
                      </button>
                    )}

                    {isPast && (
                      <div style={{ 
                        background: colors.lightGray, 
                        padding: '15px', 
                        borderRadius: '8px',
                        textAlign: 'center',
                        border: `1px solid ${colors.borderGray}`
                      }}>
                        <p style={{ margin: '0 0 10px 0', fontSize: '14px', color: colors.navy }}>
                          <strong>Event Completed</strong>
                        </p>
                      </div>
                    )}

                    <div style={{ 
                      background: colors.lightGray, 
                      padding: '15px', 
                      borderRadius: '8px',
                      border: `1px solid ${colors.borderGray}`
                    }}>
                      <p style={{ margin: '0 0 5px 0', fontSize: '14px', color: colors.maroon }}>
                        <strong>Organizer</strong>
                      </p>
                      <p style={{ margin: 0, fontSize: '13px', color: colors.navy }}>
                        {event.organizerName || 'UPTM'}
                      </p>
                      <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: colors.navy }}>
                        {event.organizerEmail || ''}
                      </p>
                    </div>

                    {event.requiresRSVP && (
                      <div style={{ 
                        background: '#fff3cd', 
                        padding: '8px', 
                        borderRadius: '5px',
                        fontSize: '11px',
                        color: '#856404',
                        textAlign: 'center'
                      }}>
                        🔒 RSVP Required
                      </div>
                    )}
                  </div>
                </div>

                {/* Additional Info */}
                <div style={{ 
                  display: 'flex', 
                  gap: '10px', 
                  marginTop: '15px',
                  paddingTop: '15px',
                  borderTop: `1px solid ${colors.borderGray}`,
                  flexWrap: 'wrap'
                }}>
                  {event.category && (
                    <span style={{
                      background: colors.lightGray,
                      color: colors.maroon,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      {event.category}
                    </span>
                  )}
                  {event.faculty && (
                    <span style={{
                      background: colors.lightGray,
                      color: colors.navy,
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      {event.faculty}
                    </span>
                  )}
                  {event.requiresRSVP && event.rsvpDeadline && (
                    <span style={{
                      background: '#fff3cd',
                      color: '#856404',
                      padding: '3px 10px',
                      borderRadius: '12px',
                      fontSize: '12px'
                    }}>
                      📅 RSVP: {formatDate(event.rsvpDeadline)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Certificate Modal */}
      {showCertificateModal && selectedEvent && (
        <CertificateGenerator
          eventData={selectedEvent}
          onClose={() => {
            setShowCertificateModal(false);
            setSelectedEvent(null);
          }}
        />
      )}

      {/* Help Section */}
      {filter === 'upcoming' && events.length > 0 && (
        <div style={{ 
          marginTop: '40px',
          padding: '20px',
          background: colors.white,
          borderRadius: '10px',
          borderLeft: `4px solid ${colors.maroon}`,
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
        }}>
          <h4 style={{ margin: '0 0 10px 0', color: colors.maroon }}>
            <FaInfoCircle style={{ marginRight: '8px', color: colors.maroon }} />
            Important Reminders
          </h4>
          <ul style={{ color: colors.navy, margin: 0, paddingLeft: '20px' }}>
            <li>Make sure to arrive at least 15 minutes before the event starts</li>
            <li>Bring your student ID for verification</li>
            <li>Attendance will be taken via QR code scanning at the venue</li>
            <li><strong>Cancellation policy:</strong> You can only cancel up to {events[0]?.cancellationDeadline || 7} days before the event</li>
            <li>Contact the organizer if you have any questions or emergencies</li>
          </ul>
        </div>
      )}

      {/* Quick Actions */}
      <div style={{ 
        marginTop: '30px',
        display: 'flex',
        justifyContent: 'center',
        gap: '15px',
        flexWrap: 'wrap'
      }}>
        <Link to="/events">
          <button style={{
            padding: '12px 24px',
            background: 'transparent',
            color: colors.maroon,
            border: `1px solid ${colors.maroon}`,
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px'
          }}>
            Browse More Events
          </button>
        </Link>
      </div>

      {/* Spinner animation */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .spinner-icon {
            animation: spin 1s linear infinite;
          }
        `}
      </style>
    </div>
  );
}

export default MyEvents;