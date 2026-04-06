// src/EventDetails.js - COMPREHENSIVE VERSION WITH RSVP DEADLINE & CANCELLATION RULES
// (Attendees list removed – now a button links to a separate page)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { db, auth } from './firebase';
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
  FaQrcode, 
  FaCertificate, 
  FaArrowLeft, 
  FaCheckCircle, 
  FaRegCalendarCheck, 
  FaRegCalendarTimes,
  FaGlobe,
  FaUserFriends,
  FaUserCheck,
  FaLink,
  FaImage,
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
  FaCamera,
  FaInfoCircle,
  FaUtensils,
  FaChair,
  FaFilePdf,
  FaShieldAlt,
  FaList
} from 'react-icons/fa';
import './EventDetails.css';

function EventDetails({ user, userData }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isRegistered, setIsRegistered] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showCertificateModal, setShowCertificateModal] = useState(false);
  const [attendanceStats, setAttendanceStats] = useState({
    registered: 0,
    attended: 0,
    attendanceRate: 0
  });
  const [cancelling, setCancelling] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false); // New state for share button

  useEffect(() => {
    fetchEvent();
  }, [id]);

  // Helper function to check if user can see organizer tools
  const canSeeOrganizerTools = () => {
    if (!user || !event) return false;
    
    // User is the event creator
    if (user.uid === event.organizerId) return true;
    
    // User is an admin (check userData role)
    if (userData?.role === 'admin') return true;
    
    return false;
  };

  // Helper function to calculate days until event
  const getDaysUntilEvent = () => {
    if (!event) return 0;
    const eventStart = (event.startDate || event.date).toDate();
    const now = new Date();
    const diffTime = eventStart - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Helper function to check if cancellation is allowed
  const canCancelRegistration = () => {
    if (!event || !isRegistered) return false;
    
    const eventStartDate = (event.startDate || event.date).toDate();
    const now = new Date();
    const daysUntilEvent = Math.ceil((eventStartDate - now) / (1000 * 60 * 60 * 24));
    const cancellationDeadline = event.cancellationDeadline || 7; // Default 7 days
    
    return daysUntilEvent >= cancellationDeadline && eventStartDate > now;
  };

  // Helper function to get cancellation deadline date
  const getCancellationDeadlineDate = () => {
    if (!event) return null;
    const eventStartDate = (event.startDate || event.date).toDate();
    const cancellationDeadline = event.cancellationDeadline || 7;
    return new Date(eventStartDate.getTime() - (cancellationDeadline * 24 * 60 * 60 * 1000));
  };

  const fetchEvent = async () => {
    try {
      const eventDoc = await getDoc(doc(db, 'events', id));
      if (eventDoc.exists()) {
        const eventData = eventDoc.data();
        setEvent({ id: eventDoc.id, ...eventData });
        
        // Check if current user is registered
        const userId = auth.currentUser?.uid;
        if (userId && eventData.attendees && Array.isArray(eventData.attendees)) {
          setIsRegistered(eventData.attendees.includes(userId));
        }

        // Calculate attendance stats
        const registered = eventData.attendeesCount || 0;
        const attended = eventData.attendedCount || 0;
        const attendanceRate = registered > 0 ? Math.round((attended / registered) * 100) : 0;
        
        setAttendanceStats({
          registered,
          attended,
          attendanceRate
        });
      } else {
        alert('Event not found');
        navigate('/events');
      }
    } catch (error) {
      console.error('Error fetching event:', error);
      alert('Failed to load event details');
    } finally {
      setLoading(false);
    }
  };

  // ========== CANCEL EVENT FUNCTION ==========
  const handleCancelEvent = async () => {
    if (!window.confirm('Are you sure you want to cancel this event?\n\n• All registrations will be cancelled\n• Event will be marked as cancelled\n• Registration will be closed\n\nThis action can be reversed later.')) {
      return;
    }

    setCancelling(true);
    
    try {
      const eventRef = doc(db, 'events', id);
      
      // Update event status to cancelled
      await updateDoc(eventRef, {
        status: 'cancelled',
        registrationOpen: false,
        updatedAt: Timestamp.now(),
        cancellationReason: 'Cancelled by organizer',
        cancelledAt: Timestamp.now()
      });

      alert('✅ Event cancelled successfully.');
      
      // Refresh event data
      await fetchEvent();
    } catch (error) {
      console.error('Error cancelling event:', error);
      alert('Failed to cancel event. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  // ========== REOPEN EVENT FUNCTION ==========
  const handleReopenEvent = async () => {
    if (!window.confirm('Reopen this event for registration?\n\n• Event will be marked as published\n• Registration will be reopened\n• Previous attendees will need to re-register')) {
      return;
    }

    setCancelling(true);
    
    try {
      const eventRef = doc(db, 'events', id);
      
      await updateDoc(eventRef, {
        status: 'published',
        registrationOpen: true,
        updatedAt: Timestamp.now(),
        cancellationReason: null
      });

      alert('✅ Event reopened successfully. Registration is now open.');
      await fetchEvent();
    } catch (error) {
      console.error('Error reopening event:', error);
      alert('Failed to reopen event. Please try again.');
    } finally {
      setCancelling(false);
    }
  };

  const handleRSVP = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      navigate('/login');
      return;
    }

    setUpdating(true);
    
    try {
      const eventRef = doc(db, 'events', id);
      
      if (!isRegistered) {
        // === REGISTER FOR EVENT ===
        
        // Check if RSVP deadline has passed
        if (event.rsvpDeadline) {
          const deadlineDate = event.rsvpDeadline.toDate();
          if (deadlineDate < new Date()) {
            if (event.allowWalkIn) {
              const confirmWalkIn = window.confirm(
                '⚠️ RSVP deadline has passed, but this event allows walk-ins.\n\n' +
                '• You can still attend\n' +
                '• Food/materials may be limited\n' +
                '• Registration is still recommended\n\n' +
                'Do you want to continue as a walk-in?'
              );
              if (!confirmWalkIn) {
                setUpdating(false);
                return;
              }
            } else {
              alert('❌ RSVP deadline has passed. Registration is closed.');
              setUpdating(false);
              return;
            }
          }
        }

        await updateDoc(eventRef, {
          attendees: arrayUnion(userId),
          attendeesCount: (event.attendeesCount || 0) + 1,
          registeredAt: Timestamp.now()
        });
        setIsRegistered(true);
        
        // Show appropriate success message
        if (event.rsvpDeadline && event.rsvpDeadline.toDate() < new Date()) {
          alert('✅ You have been registered as a walk-in! Please note that food/materials may be limited.');
        } else {
          alert('🎉 Successfully registered for event!');
        }
      } else {
        // === CANCEL REGISTRATION ===
        
        // Check if cancellation is allowed
        const eventStartDate = (event.startDate || event.date).toDate();
        const now = new Date();
        const daysUntilEvent = Math.ceil((eventStartDate - now) / (1000 * 60 * 60 * 24));
        const cancellationDeadline = event.cancellationDeadline || 7;
        
        if (daysUntilEvent < cancellationDeadline) {
          alert(`❌ You cannot cancel your registration less than ${cancellationDeadline} days before the event.\n\nThis helps organizers prepare food and materials.`);
          setUpdating(false);
          return;
        }

        // Check if event has already started
        if (eventStartDate < now) {
          alert('❌ Cannot cancel registration after event has started.');
          setUpdating(false);
          return;
        }

        // Ask for confirmation
        const confirmCancel = window.confirm(
          'Are you sure you want to cancel your registration?\n\n' +
          '• Your spot will be given to someone else\n' +
          '• You will not receive a certificate\n' +
          '• You can re-register if spots are still available'
        );

        if (!confirmCancel) {
          setUpdating(false);
          return;
        }

        await updateDoc(eventRef, {
          attendees: arrayRemove(userId),
          attendeesCount: (event.attendeesCount || 0) - 1,
          cancelledAt: Timestamp.now()
        });
        setIsRegistered(false);
        alert('Registration cancelled successfully');
      }

      // Refresh event data
      await fetchEvent();
    } catch (error) {
      console.error('Error updating RSVP:', error);
      alert('Failed to update registration. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  // ========== SHARE EVENT LINK HANDLER ==========
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/event/${id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Unable to copy link. Please copy manually.');
    }
  };

  // Helper functions
  const formatDate = (timestamp) => {
    if (!timestamp) return 'Date not set';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return {
      full: date.toLocaleDateString('en-MY', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      time: date.toLocaleTimeString('en-MY', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      dateOnly: date.toLocaleDateString('en-MY', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }),
      dateObj: date
    };
  };

  const startDate = event ? formatDate(event.startDate || event.date) : null;
  const endDate = event ? formatDate(event.endDate) : null;
  const rsvpDeadline = event?.rsvpDeadline ? formatDate(event.rsvpDeadline) : null;
  const cancellationDeadline = getCancellationDeadlineDate();
  
  // Loading state
  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <h3>Loading Event Details...</h3>
        <p>Fetching comprehensive event information</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="not-found-container">
        <div className="not-found">
          <div className="not-found-icon">📄</div>
          <h2>Event Not Found</h2>
          <p>The event you're looking for doesn't exist or has been removed.</p>
          <button 
            onClick={() => navigate('/events')}
            className="back-button"
          >
            <FaArrowLeft className="button-icon" />
            Back to Events
          </button>
        </div>
      </div>
    );
  }

  const isPastEvent = startDate.dateObj < new Date();
  const isFull = event.attendeesCount >= event.capacity;
  const isCancelled = event.status === 'cancelled';
  const canRegister = !isPastEvent && !isFull && !isCancelled && event.registrationOpen && userData?.role !== 'guest';
  const availableSpots = event.capacity - (event.attendeesCount || 0);
  const isRsvpDeadlinePassed = event.rsvpDeadline ? event.rsvpDeadline.toDate() < new Date() : false;

  // Render markdown-like description
  const renderDescription = (text) => {
    if (!text) return null;
    
    return text.split('\n').map((paragraph, index) => {
      if (paragraph.startsWith('## ')) {
        return <h4 key={index} className="sub-heading">{paragraph.substring(3)}</h4>;
      } else if (paragraph.startsWith('- ')) {
        return <li key={index} className="bullet-item">{paragraph.substring(2)}</li>;
      } else if (paragraph.startsWith('### ')) {
        return <h5 key={index} className="sub-sub-heading">{paragraph.substring(4)}</h5>;
      } else if (paragraph.trim() === '') {
        return <br key={index} />;
      } else {
        return <p key={index} className="description-paragraph">{paragraph}</p>;
      }
    });
  };

  const categoryColors = {
    workshop: '#3498db',
    seminar: '#9b59b6',
    conference: '#2ecc71',
    competition: '#e74c3c',
    social: '#f39c12',
    training: '#1abc9c',
    lecture: '#34495e',
    webinar: '#e84393'
  };

  const statusColors = {
    draft: '#95a5a6',
    published: '#27ae60',
    ongoing: '#3498db',
    completed: '#7f8c8d',
    cancelled: '#e74c3c'
  };

  const statusLabels = {
    draft: 'Draft',
    published: 'Published',
    ongoing: 'Ongoing',
    completed: 'Completed',
    cancelled: 'Cancelled'
  };

  return (
    <div className="event-details-container">
      {/* Header with Back Button */}
      <div className="event-header">
        <button 
          onClick={() => navigate('/events')}
          className="back-button"
        >
          <FaArrowLeft className="button-icon" />
          Back to Events
        </button>
        
        <div className="header-actions">
          {/* Show edit button for event creator or admin */}
          {(user?.uid === event.organizerId || userData?.role === 'admin') && (
            <button 
              onClick={() => navigate(`/edit-event/${id}`)}
              className="edit-button"
            >
              <FaEdit className="button-icon" />
              Edit Event
            </button>
          )}
          <button 
            onClick={() => window.print()}
            className="print-button"
          >
            <FaPrint className="button-icon" />
            Print
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className={`hero-section ${isCancelled ? 'hero-cancelled' : ''}`}
        style={{
          background: event.bannerImage 
            ? `linear-gradient(rgba(0,0,0,0.7), rgba(0,0,0,0.7)), url(${event.bannerImage})`
            : isCancelled ? 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)' :
              'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="hero-content">
          {/* Event Status & Category */}
          <div className="event-category-row">
            <span 
              className="category-badge"
              style={{ background: categoryColors[event.category] || '#3498db' }}
            >
              <FaTag className="badge-icon" />
              {event.category?.charAt(0).toUpperCase() + event.category?.slice(1) || 'Event'}
            </span>
            
            <span 
              className="status-badge"
              style={{ background: statusColors[event.status] || '#95a5a6' }}
            >
              {statusLabels[event.status] || event.status}
            </span>

            {event.isFeatured && !isCancelled && (
              <span className="featured-badge">
                ⭐ Featured
              </span>
            )}
          </div>
          
          <h1 className="event-title">{event.title}</h1>
          
          {/* Event Code */}
          <div className="event-code">
            <FaTag className="event-code-icon" />
            Event Code: <strong>{event.eventCode}</strong>
          </div>
          
          <div className="event-meta">
            <div className="meta-item">
              <FaCalendarAlt className="meta-icon" />
              <div>
                <div className="meta-label">Start Date</div>
                <div className="meta-value">{startDate.full}</div>
              </div>
            </div>
            
            <div className="meta-item">
              <FaClock className="meta-icon" />
              <div>
                <div className="meta-label">End Date</div>
                <div className="meta-value">{endDate.full || 'Same day'}</div>
              </div>
            </div>
            
            <div className="meta-item">
              {event.isOnline ? (
                <>
                  <FaGlobe className="meta-icon" />
                  <div>
                    <div className="meta-label">Location</div>
                    <div className="meta-value">Online Event</div>
                  </div>
                </>
              ) : (
                <>
                  <FaMapMarkerAlt className="meta-icon" />
                  <div>
                    <div className="meta-label">Venue</div>
                    <div className="meta-value">
                      {event.venue}
                      {event.room && <div className="venue-room">{event.room}</div>}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Quick Stats */}
          <div className="quick-stats">
            <div className="stat-item">
              <FaUsers className="stat-icon" />
              <div className="stat-number">{event.attendeesCount || 0}</div>
              <div className="stat-label">Registered</div>
            </div>
            
            <div className="stat-item">
              <FaUserCheck className="stat-icon" />
              <div className="stat-number">{attendanceStats.attended}</div>
              <div className="stat-label">Attended</div>
            </div>
            
            <div className="stat-item">
              <FaChartBar className="stat-icon" />
              <div className="stat-number">{attendanceStats.attendanceRate}%</div>
              <div className="stat-label">Rate</div>
            </div>
            
            <div className="stat-item">
              <FaUserFriends className="stat-icon" />
              <div className="stat-number">{event.capacity}</div>
              <div className="stat-label">Capacity</div>
            </div>
          </div>

          {/* Cancellation Notice */}
          {isCancelled && (
            <div className="cancellation-notice">
              <FaExclamationTriangle className="warning-icon" />
              <div>
                <h4>Event Cancelled</h4>
                <p>
                  This event has been cancelled by the organizer.
                  {event.cancellationReason && ` Reason: ${event.cancellationReason}`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Left Column */}
        <div className="left-column">
          {/* Tabs Navigation */}
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'overview' ? 'active-tab' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <FaListAlt className="tab-icon" />
              Overview
            </button>
            <button 
              className={`tab ${activeTab === 'description' ? 'active-tab' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              <FaFileAlt className="tab-icon" />
              Description
            </button>
            <button 
              className={`tab ${activeTab === 'details' ? 'active-tab' : ''}`}
              onClick={() => setActiveTab('details')}
            >
              <FaBuilding className="tab-icon" />
              Details
            </button>
            {/* Show Organizer Tools for event creator OR admin */}
            {canSeeOrganizerTools() && (
              <button 
                className={`tab ${activeTab === 'organizer' ? 'active-tab' : ''}`}
                onClick={() => setActiveTab('organizer')}
              >
                {userData?.role === 'admin' ? (
                  <>
                    <FaShieldAlt className="tab-icon" />
                    Admin Tools
                  </>
                ) : (
                  <>
                    <FaUserTie className="tab-icon" />
                    Organizer Tools
                  </>
                )}
              </button>
            )}
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                <h3 className="section-title">Event Overview</h3>
                
                <div className="overview-card">
                  <h4 className="card-subtitle">Short Description</h4>
                  <p className="short-description">
                    {event.shortDescription || 'No short description provided.'}
                  </p>
                </div>

                {/* Key Information Grid */}
                <div className="info-grid">
                  <div className="info-card">
                    <FaUniversity className="info-icon faculty-icon" />
                    <h4 className="info-title">Faculty</h4>
                    <p className="info-text">{event.faculty || 'All Faculties'}</p>
                  </div>
                  
                  <div className="info-card">
                    <FaClock className="info-icon clock-icon" />
                    <h4 className="info-title">Duration</h4>
                    <p className="info-text">
                      {event.duration ? `${event.duration} minutes` : 'Not specified'}
                    </p>
                  </div>
                  
                  <div className="info-card">
                    <FaUserFriends className="info-icon audience-icon" />
                    <h4 className="info-title">Audience</h4>
                    <p className="info-text">
                      {event.targetAudience?.join(', ') || 'All users'}
                    </p>
                  </div>
                  
                  <div className="info-card">
                    <FaCheckCircle className="info-icon registration-icon" />
                    <h4 className="info-title">Registration</h4>
                    <p className="info-text">
                      {event.requiresApproval ? 'Approval Required' : 'Open Registration'}
                    </p>
                  </div>
                </div>

                {/* Event Highlights */}
                <div className="highlights-section">
                  <h4 className="card-subtitle">Event Highlights</h4>
                  <ul className="highlights-list">
                    <li>Digital Certificate of Participation</li>
                    <li>Networking opportunities with peers and professionals</li>
                    <li>Practical hands-on sessions (if applicable)</li>
                    <li>Refreshments provided</li>
                    <li>Learning materials and resources</li>
                  </ul>
                </div>
              </div>
            )}

            {/* Description Tab */}
            {activeTab === 'description' && (
              <div>
                <h3 className="section-title">Full Event Description</h3>
                <div className="description-content">
                  {event.description ? renderDescription(event.description) : (
                    <p className="no-content">No detailed description provided.</p>
                  )}
                </div>

                {/* Additional Materials */}
                {event.materials && event.materials.length > 0 && (
                  <div className="materials-section">
                    <h4 className="card-subtitle">
                      <FaFileAlt className="material-icon" />
                      Event Materials
                    </h4>
                    <div className="materials-list">
                      {event.materials.map((material, index) => (
                        <a 
                          key={index} 
                          href={material} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="material-link"
                        >
                          📄 Material {index + 1}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div>
                <h3 className="section-title">Event Details</h3>
                
                <div className="details-grid">
                  {/* Location Details */}
                  <div className="detail-section">
                    <h4 className="card-subtitle">
                      {event.isOnline ? (
                        <><FaGlobe className="detail-icon" /> Online Event Details</>
                      ) : (
                        <><FaMapMarkerAlt className="detail-icon" /> Venue Details</>
                      )}
                    </h4>
                    
                    {event.isOnline ? (
                      <div>
                        <p><strong>Meeting Platform:</strong> Google Meet / Zoom</p>
                        <p><strong>Join Link:</strong> 
                          <a href={event.meetingLink} target="_blank" rel="noopener noreferrer" className="link">
                            <FaLink className="link-icon" /> Click here to join
                          </a>
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p><strong>Venue:</strong> {event.venue}</p>
                        {event.room && <p><strong>Room:</strong> {event.room}</p>}
                        <p><strong>Campus:</strong> UPTM University</p>
                      </div>
                    )}
                  </div>

                  {/* Timing Details */}
                  <div className="detail-section">
                    <h4 className="card-subtitle">
                      <FaClock className="detail-icon" />
                      Timing Details
                    </h4>
                    <p><strong>Start:</strong> {startDate.full}</p>
                    <p><strong>End:</strong> {endDate.full || 'Same day'}</p>
                    <p><strong>Duration:</strong> {event.duration} minutes</p>
                    <p><strong>Check-in:</strong> 30 minutes before start</p>
                  </div>

                  {/* Registration Details */}
                  <div className="detail-section">
                    <h4 className="card-subtitle">
                      <FaUserFriends className="detail-icon" />
                      Registration Details
                    </h4>
                    <p><strong>Capacity:</strong> {event.capacity} attendees</p>
                    <p><strong>Minimum Required:</strong> {event.minAttendees || 5} attendees</p>
                    <p><strong>Registration Status:</strong> {event.registrationOpen ? 'Open' : 'Closed'}</p>
                    <p><strong>Approval Required:</strong> {event.requiresApproval ? 'Yes' : 'No'}</p>
                    {event.requiresRSVP && (
                      <>
                        <p><strong>RSVP Required:</strong> Yes</p>
                        {rsvpDeadline && (
                          <p><strong>RSVP Deadline:</strong> {rsvpDeadline.full}</p>
                        )}
                        <p><strong>Cancellation Deadline:</strong> {event.cancellationDeadline || 7} days before event</p>
                      </>
                    )}
                  </div>

                  {/* Requirements */}
                  <div className="detail-section">
                    <h4 className="card-subtitle">
                      <FaCheckCircle className="detail-icon" />
                      Requirements
                    </h4>
                    <ul className="requirements-list">
                      <li>Valid UPTM Student/Staff ID</li>
                      <li>Registration confirmation (if required)</li>
                      {event.isOnline && <li>Stable internet connection</li>}
                      {!event.isOnline && <li>Face mask (if required by policy)</li>}
                      <li>Punctuality - Arrive 15 minutes early</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Organizer/Admin Tools Tab - Now accessible to both event creator and admin */}
            {activeTab === 'organizer' && canSeeOrganizerTools() && (
              <div>
                <h3 className="section-title">
                  {userData?.role === 'admin' ? 'Admin Dashboard' : 'Organizer Dashboard'}
                </h3>
                
                {/* Admin Notice - Show if user is admin but not creator */}
                {userData?.role === 'admin' && user.uid !== event.organizerId && (
                  <div className="admin-notice">
                    <FaShieldAlt className="admin-icon" />
                    <div>
                      <h4>Admin Access</h4>
                      <p>You are viewing this event as an administrator. You have full management permissions.</p>
                    </div>
                  </div>
                )}
                
                {/* Event Status Alert */}
                {isCancelled ? (
                  <div className="cancelled-alert">
                    <FaExclamationTriangle className="alert-icon" />
                    <div>
                      <h4>Event Cancelled</h4>
                      <p>
                        This event has been cancelled. You can reopen it if needed.
                        {event.cancelledAt && ` Cancelled on: ${formatDate(event.cancelledAt).dateOnly}`}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="active-event-alert">
                    <FaCheckCircle className="alert-icon success-icon" />
                    <div>
                      <h4>Event Active</h4>
                      <p>
                        Event is currently {event.registrationOpen ? 'open' : 'closed'} for registration.
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Quick Actions */}
                <div className="quick-actions">
                  <h4 className="card-subtitle">Quick Actions</h4>
                  <div className="action-buttons-grid">
                    <button 
                      onClick={() => navigate(`/attendance/${event.id}`)}
                      className="action-button"
                    >
                      <FaQrcode className="action-icon" />
                      Manage Attendance
                    </button>
                    
                    
                    
                    <button 
                      onClick={() => setShowCertificateModal(true)}  
                      className="action-button"
                    >
                      <FaCertificate className="action-icon" />
                      Generate Certificates
                    </button>
                    
                    <button 
                      onClick={() => navigate(`/edit-event/${event.id}`)}
                      className="action-button"
                    >
                      <FaEdit className="action-icon" />
                      Edit Event
                    </button>

                    {/* NEW BUTTON: View Registered Attendees (RSVP List) */}
                    <button 
                      onClick={() => navigate(`/event/${event.id}/attendees`)}
                      className="action-button"
                    >
                      <FaList className="action-icon" />
                      View Registered Attendees
                    </button>
                  </div>
                </div>
                
                {/* Event Management */}
                <div className="event-management">
                  <h4 className="card-subtitle">Event Management</h4>
                  
                  {!isCancelled ? (
                    <div className="cancel-section">
                      <h5>
                        <FaExclamationTriangle className="warning-icon" />
                        Cancel Event
                      </h5>
                      <p className="cancel-description">
                        Cancelling will close registration and notify all registered attendees.
                        This action is reversible.
                      </p>
                      <button 
                        onClick={handleCancelEvent}
                        disabled={cancelling}
                        className={`cancel-button ${cancelling ? 'disabled' : ''}`}
                      >
                        {cancelling ? (
                          <>
                            <FaSpinner className="spinner-icon" />
                            Cancelling...
                          </>
                        ) : (
                          'Cancel This Event'
                        )}
                      </button>
                    </div>
                  ) : (
                    <div className="reopen-section">
                      <h5>
                        <FaCheckCircle className="success-icon" />
                        Reopen Event
                      </h5>
                      <p className="reopen-description">
                        Reopen this event to allow new registrations. Previous registrations
                        will need to re-register.
                      </p>
                      <button 
                        onClick={handleReopenEvent}
                        disabled={cancelling}
                        className={`reopen-button ${cancelling ? 'disabled' : ''}`}
                      >
                        {cancelling ? (
                          <>
                            <FaSpinner className="spinner-icon" />
                            Reopening...
                          </>
                        ) : (
                          'Reopen This Event'
                        )}
                      </button>
                    </div>
                  )}
                </div>
                
                {/* Statistics Card */}
                <div className="stats-card">
                  <h4 className="card-subtitle">Event Statistics</h4>
                  <div className="stats-grid">
                    <div className="stat-box">
                      <div className="stat-number-large">{event.attendeesCount || 0}</div>
                      <div className="stat-label">Registered</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-number-large">{availableSpots}</div>
                      <div className="stat-label">Available</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-number-large">
                        {Math.round(((event.attendeesCount || 0) / event.capacity) * 100)}%
                      </div>
                      <div className="stat-label">Capacity</div>
                    </div>
                    <div className="stat-box">
                      <div className="stat-number-large">
                        {attendanceStats.attendanceRate}%
                      </div>
                      <div className="stat-label">Attendance</div>
                    </div>
                  </div>
                  
                  {/* Registration Status */}
                  <div className="registration-status">
                    <h5>Registration Status: <span className={`status-text ${event.registrationOpen ? 'status-open' : 'status-closed'}`}>
                      {event.registrationOpen ? 'OPEN' : 'CLOSED'}
                    </span></h5>
                    {event.requiresApproval && (
                      <p className="approval-note">
                        ⓘ Registration requires organizer approval
                      </p>
                    )}
                  </div>
                </div>
                
               
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Registration & Info Panel */}
        <div className="right-column">
          {/* Registration Card */}
          <div className="registration-card">
            <div className="registration-header">
              <h3 className="registration-title">
                <FaRegCalendarCheck className="registration-icon" />
                Registration
              </h3>
              
              <span className={`status-indicator ${
                isCancelled ? 'status-cancelled' :
                isPastEvent ? 'status-ended' : 
                !event.registrationOpen ? 'status-closed' :
                isFull ? 'status-full' : 
                'status-open'
              }`}>
                {isCancelled ? 'Cancelled' :
                 isPastEvent ? 'Ended' : 
                 !event.registrationOpen ? 'Closed' :
                 isFull ? 'Full' : 
                 'Open'}
              </span>
            </div>
            
            <div className="registration-body">
              {isCancelled ? (
                <div className="cancelled-event-message">
                  <div className="cancelled-icon">❌</div>
                  <h4>Event Cancelled</h4>
                  <p>
                    This event has been cancelled by the organizer.
                  </p>
                  {isRegistered && (
                    <button className="refund-button">
                      <FaTimes className="button-icon" />
                      Request Refund
                    </button>
                  )}
                </div>
              ) : isPastEvent ? (
                <div className="past-event-message">
                  <div className="past-icon">📅</div>
                  <h4>Event Completed</h4>
                  <p>
                    This event has already taken place.
                  </p>
                  {isRegistered && (
                    <button className="certificate-button">
                      <FaCertificate className="button-icon" />
                      Download Certificate
                    </button>
                  )}
                </div>
              ) : !event.registrationOpen ? (
                <div className="closed-event-message">
                  <div className="closed-icon">🔒</div>
                  <h4>Registration Closed</h4>
                  <p>
                    Registration is no longer open for this event.
                  </p>
                </div>
              ) : (
                <>
                  {/* RSVP Deadline Info - NEW */}
                  {event.requiresRSVP && rsvpDeadline && (
                    <div className={`deadline-info ${isRsvpDeadlinePassed ? 'deadline-passed' : ''}`}>
                      <div className="deadline-header">
                        <FaClock className="deadline-icon" />
                        <span className="deadline-title">RSVP Deadline</span>
                      </div>
                      <div className="deadline-datetime">
                        {rsvpDeadline.full}
                      </div>
                      <div className="deadline-purpose">
                        <FaUtensils className="purpose-icon" /> Food preparation
                        <FaChair className="purpose-icon" /> Seating arrangement
                        <FaFilePdf className="purpose-icon" /> Materials printing
                      </div>
                      {isRsvpDeadlinePassed ? (
                        <div className="deadline-status status-passed">
                          ❌ Deadline has passed
                          {event.allowWalkIn && (
                            <span className="walkin-allowed"> (Walk-ins allowed)</span>
                          )}
                        </div>
                      ) : (
                        <div className="deadline-status status-active">
                          ⏳ Closes in {Math.ceil((event.rsvpDeadline.toDate() - new Date()) / (1000 * 60 * 60))} hours
                        </div>
                      )}
                    </div>
                  )}

                  {/* Preparation Time Info - NEW */}
                  {event.preparationTime && !event.rsvpDeadline && (
                    <div className="preparation-info">
                      <FaClock className="preparation-icon" />
                      <span>
                        <strong>Please register by:</strong>{' '}
                        {formatDate(new Date((event.startDate || event.date).toDate() - 
                          (event.preparationTime * 60 * 60 * 1000))).full}
                      </span>
                      <p className="preparation-note">
                        (This gives us {event.preparationTime} hours to prepare food and materials)
                      </p>
                    </div>
                  )}

                  {/* Capacity Progress */}
                  <div className="capacity-info">
                    <div className="capacity-header">
                      <span>Available Spots: </span>
                      <span className={`available-spots ${
                        availableSpots <= 5 ? 'spots-critical' : 
                        availableSpots <= 10 ? 'spots-warning' : 'spots-good'
                      }`}>
                        {availableSpots} / {event.capacity}
                      </span>
                    </div>
                    
                    <div className="capacity-bar">
                      <div 
                        className={`capacity-fill ${
                          availableSpots <= 5 ? 'fill-critical' : 
                          availableSpots <= 10 ? 'fill-warning' : 'fill-good'
                        }`}
                        style={{
                          width: `${Math.min(100, ((event.attendeesCount || 0) / event.capacity) * 100)}%`
                        }}
                      ></div>
                    </div>
                    
                    <div className="capacity-text">
                      <span>
                        {event.attendeesCount || 0} registered • {availableSpots} remaining
                      </span>
                    </div>
                  </div>
                  
                  {/* Registration Button */}
                  <button
                    onClick={handleRSVP}
                    disabled={updating || !canRegister || event.requiresApproval}
                    className={`register-button ${isRegistered ? 'button-cancel' : 'button-register'} ${
                      (!canRegister || updating || event.requiresApproval) ? 'button-disabled' : ''
                    }`}
                  >
                    {updating ? (
                      <>
                        <div className="spinner-small"></div>
                        Processing...
                      </>
                    ) : isRegistered ? (
                      'Cancel Registration'
                    ) : event.requiresApproval ? (
                      'Request Approval'
                    ) : isRsvpDeadlinePassed && event.allowWalkIn ? (
                      'Register as Walk-in'
                    ) : (
                      'Register Now'
                    )}
                  </button>
                  
                  {/* Cancellation Rules - NEW */}
                  {isRegistered && (
                    <div className="cancellation-rules">
                      {canCancelRegistration() ? (
                        <p className="cancellation-allowed">
                          ✅ You can cancel until{' '}
                          <strong>{cancellationDeadline ? formatDate(cancellationDeadline).full : 'the deadline'}</strong>
                        </p>
                      ) : (
                        <p className="cancellation-blocked">
                          🔒 Cannot cancel - less than {event.cancellationDeadline || 7} days before event
                          <br />
                          <small>(This helps us prepare food and materials)</small>
                        </p>
                      )}
                    </div>
                  )}

                  {/* Walk-in Notice - NEW */}
                  {!isRegistered && isRsvpDeadlinePassed && event.allowWalkIn && (
                    <p className="walkin-notice">
                      ✅ Walk-ins allowed! You can still attend, but food/materials may be limited.
                    </p>
                  )}
                  
                  {/* Status Messages */}
                  {!canRegister && userData?.role !== 'guest' && !event.requiresApproval && (
                    <p className="warning-text">
                      {isFull ? 'Event is fully booked' : 'Registration closed for this event'}
                    </p>
                  )}
                  
                  {event.requiresApproval && !isRegistered && (
                    <p className="info-text">
                      ⓘ Registration requires organizer approval
                    </p>
                  )}
                  
                  {userData?.role === 'guest' && (
                    <p className="warning-text">
                      You need a valid role to register for events
                    </p>
                  )}
                  
                  {/* Registration Benefits */}
                  <div className="benefits-section">
                    <h4 className="benefits-title">Registration Includes:</h4>
                    <ul className="benefits-list">
                      <li>Full event access</li>
                      <li>Digital certificate</li>
                      <li>Refreshments</li>
                      <li>Learning materials</li>
                      <li>Networking opportunities</li>
                    </ul>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Organizer Info Card */}
          <div className="organizer-card">
            <h4 className="card-title">
              <FaUserTie className="card-title-icon" />
              Event Organizer
            </h4>
            <div className="organizer-info">
              <div className="organizer-avatar">
                {event.organizerName?.charAt(0) || event.organizerEmail?.charAt(0).toUpperCase()}
              </div>
              <div className="organizer-details">
                <h5 className="organizer-name">{event.organizerName || 'UPTM Organizer'}</h5>
                <p className="organizer-email">
                  <FaEnvelope className="email-icon" />
                  {event.organizerEmail || 'organizer@uptm.edu.my'}
                </p>
                <p className="organizer-role">Event Organizer</p>
              </div>
            </div>
            {/* Show contact button for organizer or admin */}
            {(user?.uid === event.organizerId || userData?.role === 'admin') && (
              <div className="organizer-actions">
                
              </div>
            )}
          </div>

          {/* Quick Info Card */}
          <div className="info-card">
            <h4 className="card-title">
              <FaCheckCircle className="card-title-icon" />
              Important Information
            </h4>
            <ul className="notes-list">
              <li>Bring your student/staff ID for verification</li>
              <li>Attendance via QR code scanning</li>
              <li>Arrive 15 minutes before event starts</li>
              <li>Digital certificate issued 48 hours after event</li>
              {event.requiresRSVP && !isPastEvent && !isCancelled && (
                <li>Cancellation allowed up to {event.cancellationDeadline || 7} days before</li>
              )}
              {event.isOnline && <li>Test your connection 10 minutes before</li>}
            </ul>
          </div>

          {/* Event Links Card - with working share button */}
          <div className="links-card">
            <h4 className="card-title">
              <FaShareAlt className="card-title-icon" />
              Share Event
            </h4>
            <div className="share-buttons">
              <button onClick={handleCopyLink} className="share-button">
                {copySuccess ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <div className="footer-content">
          <p className="footer-text">
            UPTM Event Management System • {event.eventCode} • Created: {formatDate(event.createdAt).dateOnly}
          </p>
          <p className="footer-subtext">
            Need help? Contact: {event.organizerEmail} or events@uptm.edu.my
          </p>
        </div>
        {showCertificateModal && (
        <CertificateGenerator
          eventData={event}
          userData={user}
          onClose={() => setShowCertificateModal(false)}
        />
      )}
      </div>
    </div>
  );
}

export default EventDetails;