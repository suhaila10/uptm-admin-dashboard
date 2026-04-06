// src/EditEvent.js - with Firebase Storage upload and all sections
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './firebase';
import { 
  FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUsers, 
  FaTag, FaUniversity, FaGlobe, FaImage, 
  FaFileAlt, FaCheckCircle, FaInfoCircle,
  FaArrowLeft, FaExclamationTriangle, FaLink,
  FaUpload, FaMagic, FaCog, FaUserCheck,
  FaUserTimes, FaBan, FaChevronRight, FaChevronDown,
  FaPlus, FaTimes, FaSave, FaShieldAlt,
  FaEdit, FaEye, FaEyeSlash, FaStar, FaRegStar,
  FaBuilding, FaChalkboardTeacher, FaGraduationCap,
  FaSpinner, FaTrash, FaClipboardList
} from 'react-icons/fa';

function EditEvent() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [userData, setUserData] = useState(null);
  const [event, setEvent] = useState(null);
  const [activeSection, setActiveSection] = useState('basic');
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    media: false,
    datetime: false,
    location: false,
    category: false,
    capacity: false,
    materials: false,
    rsvp: false,
    visibility: false
  });
  // New state for collapsible tips panel
  const [showTips, setShowTips] = useState(false);

  // Form state – all fields from CreateEvent
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    eventCode: '',
    startDate: '',
    endDate: '',
    duration: 120,
    venue: 'UPTM Main Hall',
    room: '',
    isOnline: false,
    meetingLink: '',
    category: 'workshop',
    faculty: 'FCOM',
    targetAudience: ['students'],
    capacity: 50,
    minAttendees: 10,
    registrationOpen: true,
    requiresApproval: false,
    requiresRSVP: true,
    rsvpDeadline: '',
    preparationTime: 24,
    allowWalkIn: false,
    cancellationDeadline: 7,
    status: 'draft',
    isFeatured: false,
    bannerImage: '',
    
  });

  // Duration states
  const [durationHours, setDurationHours] = useState(2);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [durationMode, setDurationMode] = useState('calculate');

  // Banner states
  const [bannerPreview, setBannerPreview] = useState('');
  const [showAIOptions, setShowAIOptions] = useState(false);
  const [bannerAIUrl, setBannerAIUrl] = useState('');
  const [bannerFile, setBannerFile] = useState(null);

  // Predefined options (copied from CreateEvent)
  const categoryOptions = [
    { value: 'workshop', label: 'Workshop',  color: '#800000' },
    { value: 'seminar', label: 'Seminar',  color: '#800000' },
    { value: 'conference', label: 'Conference',  color: '#800000' },
    { value: 'competition', label: 'Competition', color: '#800000' },
    { value: 'social', label: 'Social Event',  color: '#800000' },
    { value: 'training', label: 'Training',  color: '#800000' },
    { value: 'lecture', label: 'Lecture',  color: '#800000' },
    { value: 'webinar', label: 'Webinar',  color: '#800000' },
  ];

  const facultyOptions = [
    { value: 'FCOM', label: 'Faculty of Computing (FCOM)'},
    { value: 'FABA', label: 'Faculty of Business (FABA)' },
    { value: 'FESSH', label: 'Faculty of Education (FESSH)' },
    { value: 'IPS', label: 'Institute of Professional Studies (IPS)' },
    { value: 'IGS', label: 'Institute of Graduate Studies (IGS)'},
    { value: 'CIGLS', label: 'CENTRE OF ISLAMIC, GENERAL AND LANGUAGE STUDIES (CIGLS)'},
    { value: 'GENERAL', label: 'General (All Faculties)' },
  ];

  const audienceOptions = [
    { value: 'students', label: 'Students' },
    { value: 'lecturers', label: 'Lecturers' },
    { value: 'staff', label: 'Staff' },
    { value: 'alumni', label: 'Alumni' },
    { value: 'public', label: 'Public' },
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: '#95a5a6' },
    { value: 'published', label: 'Published',  color: '#27ae60' },
    { value: 'cancelled', label: 'Cancelled',  color: '#e74c3c' },
  ];

  // Helper functions
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
    setActiveSection(sectionId);
  };

  // Fetch event data on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setMessage({ type: 'error', text: 'You must be logged in' });
          setTimeout(() => navigate('/login'), 2000);
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (!userDoc.exists()) {
          setMessage({ type: 'error', text: 'User data not found' });
          return;
        }
        const userData = userDoc.data();
        setUserData(userData);

        if (userData.role !== 'organizer' && userData.role !== 'admin') {
          setMessage({ type: 'error', text: 'Only organizers or admins can edit events' });
          return;
        }

        const eventDoc = await getDoc(doc(db, 'events', id));
        if (!eventDoc.exists()) {
          setMessage({ type: 'error', text: 'Event not found' });
          return;
        }
        const eventData = eventDoc.data();

        if (eventData.organizerId !== user.uid && userData.role !== 'admin') {
          setMessage({ type: 'error', text: 'You can only edit events you created' });
          return;
        }

        setEvent({ id: eventDoc.id, ...eventData });

        const formatForInput = (timestamp) => {
          if (!timestamp) return '';
          const date = timestamp.toDate();
          return date.toISOString().slice(0, 16);
        };

        const duration = eventData.duration || 120;
        setDurationHours(Math.floor(duration / 60));
        setDurationMinutes(duration % 60);

        setFormData({
          title: eventData.title || '',
          description: eventData.description || '',
          shortDescription: eventData.shortDescription || '',
          eventCode: eventData.eventCode || '',
          startDate: formatForInput(eventData.startDate || eventData.date),
          endDate: formatForInput(eventData.endDate),
          duration: duration,
          venue: eventData.venue || 'UPTM Main Hall',
          room: eventData.room || '',
          isOnline: eventData.isOnline || false,
          meetingLink: eventData.meetingLink || '',
          category: eventData.category || 'workshop',
          faculty: eventData.faculty || 'FCOM',
          targetAudience: eventData.targetAudience || ['students'],
          capacity: eventData.capacity || 50,
          minAttendees: eventData.minAttendees || 10,
          registrationOpen: eventData.registrationOpen !== false,
          requiresApproval: eventData.requiresApproval || false,
          requiresRSVP: eventData.requiresRSVP ?? true,
          rsvpDeadline: formatForInput(eventData.rsvpDeadline) || '',
          preparationTime: eventData.preparationTime || 24,
          allowWalkIn: eventData.allowWalkIn || false,
          cancellationDeadline: eventData.cancellationDeadline || 7,
          status: eventData.status || 'draft',
          isFeatured: eventData.isFeatured || false,
          bannerImage: eventData.bannerImage || '',
          
        });

        setBannerPreview(eventData.bannerImage || '');

      } catch (error) {
        console.error('Error fetching data:', error);
        setMessage({ type: 'error', text: 'Failed to load event data' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, navigate]);

  // Event Handlers
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleAudienceChange = (value) => {
    setFormData(prev => {
      const audiences = [...prev.targetAudience];
      if (audiences.includes(value))
        return { ...prev, targetAudience: audiences.filter(a => a !== value) };
      else
        return { ...prev, targetAudience: [...audiences, value] };
    });
  };

  

  // Duration functions
  const calculateDurationFromDates = () => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffMs = end - start;
      if (diffMs > 0) {
        const totalMinutes = Math.round(diffMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        setDurationHours(hours);
        setDurationMinutes(minutes);
        setFormData(prev => ({ ...prev, duration: totalMinutes }));
      }
    }
  };

  const handleDurationManualChange = () => {
    const totalMinutes = (durationHours * 60) + durationMinutes;
    setFormData(prev => ({ ...prev, duration: totalMinutes }));
    if (formData.startDate) {
      const start = new Date(formData.startDate);
      const end = new Date(start.getTime() + totalMinutes * 60000);
      const endDateStr = end.toISOString().slice(0, 16);
      setFormData(prev => ({ ...prev, endDate: endDateStr }));
    }
  };

  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffMs = end - start;
      if (diffMs > 0) {
        const totalMinutes = Math.round(diffMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        setDurationHours(hours);
        setDurationMinutes(minutes);
        setFormData(prev => ({ ...prev, duration: totalMinutes }));
      }
    }
  }, [formData.startDate, formData.endDate]);

  // File upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        setMessage({ type: 'error', text: 'Please upload an image file' });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size should be less than 5MB' });
        return;
      }
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setBannerPreview(reader.result);
      reader.readAsDataURL(file);
      setFormData(prev => ({ ...prev, bannerImage: '' }));
    }
  };

  const handleAIUpload = () => {
    if (!bannerAIUrl.trim()) {
      setMessage({ type: 'error', text: 'Please enter an AI-generated image URL' });
      return;
    }
    try {
      new URL(bannerAIUrl);
      setFormData(prev => ({ ...prev, bannerImage: bannerAIUrl }));
      setBannerPreview(bannerAIUrl);
      setShowAIOptions(false);
      setMessage({ type: 'success', text: 'AI-generated image URL added successfully' });
    } catch {
      setMessage({ type: 'error', text: 'Please enter a valid URL' });
    }
  };

  const validateForm = () => {
    const requiredFields = ['title', 'description', 'shortDescription', 'startDate', 'endDate', 'venue'];
    const missing = requiredFields.filter(f => !formData[f]?.trim());
    if (missing.length) return `Please fill: ${missing.join(', ')}`;
    if (formData.isOnline && !formData.meetingLink) return 'Meeting link required for online events';
    if (new Date(formData.endDate) <= new Date(formData.startDate)) return 'End date must be after start date';
    if (formData.capacity < (event?.attendeesCount || 1)) {
      return `Capacity cannot be lower than current registrations (${event?.attendeesCount || 0})`;
    }
    if (formData.minAttendees > formData.capacity) return 'Minimum attendees cannot exceed capacity';
    return null;
  };

  // Submit with Firebase Storage upload
  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setMessage({ type: 'error', text: validationError });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      let bannerImageUrl = formData.bannerImage.trim();

      if (bannerFile) {
        const timestamp = Date.now();
        const safeFileName = `${timestamp}_${bannerFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, `event-banners/${auth.currentUser.uid}/${id}/${safeFileName}`);

        setMessage({ type: 'info', text: 'Uploading new image...' });
        const uploadTask = uploadBytesResumable(storageRef, bannerFile);

        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            null,
            (error) => reject(error),
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              bannerImageUrl = downloadURL;
              resolve();
            }
          );
        });
      }

      const eventRef = doc(db, 'events', id);
      const updatedData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        shortDescription: formData.shortDescription.trim(),
        eventCode: formData.eventCode.trim(),
        date: Timestamp.fromDate(new Date(formData.startDate)),
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        duration: parseInt(formData.duration),
        durationHours,
        durationMinutes,
        durationDisplay: `${durationHours}h ${durationMinutes}m`,
        venue: formData.venue.trim(),
        room: formData.room.trim(),
        isOnline: formData.isOnline,
        meetingLink: formData.isOnline ? formData.meetingLink.trim() : '',
        category: formData.category,
        faculty: formData.faculty,
        targetAudience: formData.targetAudience,
        capacity: parseInt(formData.capacity),
        minAttendees: parseInt(formData.minAttendees),
        registrationOpen: formData.registrationOpen,
        requiresApproval: formData.requiresApproval,
        requiresRSVP: formData.requiresRSVP,
        rsvpDeadline: formData.rsvpDeadline ? Timestamp.fromDate(new Date(formData.rsvpDeadline)) : null,
        preparationTime: parseInt(formData.preparationTime),
        allowWalkIn: formData.allowWalkIn,
        cancellationDeadline: parseInt(formData.cancellationDeadline),
        status: formData.status,
        isFeatured: formData.isFeatured,
        updatedAt: Timestamp.now(),
        publishedAt: formData.status === 'published' && event?.status !== 'published' ? Timestamp.now() : event?.publishedAt || null,
        bannerImage: bannerImageUrl,
        
      };

      await updateDoc(eventRef, updatedData);

      setMessage({ type: 'success', text: `Event "${formData.title}" updated successfully!` });
      setTimeout(() => navigate(`/events/${id}`), 2000);
    } catch (error) {
      console.error('Error updating event:', error);
      setMessage({ type: 'error', text: `Failed to update event: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  // Cancel event
  const handleCancelEvent = async () => {
    if (!window.confirm('Are you sure you want to cancel this event? This action cannot be undone.')) return;
    try {
      const eventRef = doc(db, 'events', id);
      await updateDoc(eventRef, {
        status: 'cancelled',
        updatedAt: Timestamp.now(),
        registrationOpen: false
      });
      setMessage({ type: 'success', text: 'Event cancelled successfully.' });
      setFormData(prev => ({ ...prev, status: 'cancelled', registrationOpen: false }));
    } catch (error) {
      console.error('Error cancelling event:', error);
      setMessage({ type: 'error', text: 'Failed to cancel event' });
    }
  };

  // Delete event – now active
  const handleDeleteEvent = async () => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete this event and all associated data. This action cannot be undone. Are you sure?')) return;
    if (!window.confirm('Final confirmation: Delete this event permanently?')) return;

    setSaving(true);
    try {
      const eventRef = doc(db, 'events', id);
      await deleteDoc(eventRef);   // ✅ Uncommented
      setMessage({ type: 'success', text: 'Event deleted successfully.' });
      setTimeout(() => navigate('/events'), 2000);
    } catch (error) {
      console.error('Error deleting event:', error);
      setMessage({ type: 'error', text: 'Failed to delete event' });
    } finally {
      setSaving(false);
    }
  };

  // Loading and access checks
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <FaSpinner style={styles.spinner} />
        <h3 style={{ color: '#800000', marginTop: '20px' }}>Loading Event Data...</h3>
      </div>
    );
  }

  if (!userData || (userData.role !== 'organizer' && userData.role !== 'admin')) {
    return (
      <div style={styles.accessDenied}>
        <FaShieldAlt size={64} color="#800000" />
        <h3 style={{ color: '#800000', margin: '20px 0 10px' }}>Access Denied</h3>
        <p>Only <strong>Event Organizers</strong> or <strong>Admins</strong> can edit events.</p>
        <p>Your current role: <strong>{userData?.role || 'None'}</strong></p>
        <button onClick={() => navigate('/dashboard')} style={styles.returnButton}>
          Return to Dashboard
        </button>
      </div>
    );
  }

  if (!event) {
    return (
      <div style={styles.notFound}>
        <FaExclamationTriangle size={48} color="#800000" />
        <h2 style={{ color: '#800000', margin: '20px 0' }}>Event Not Found</h2>
        <button onClick={() => navigate('/events')} style={styles.backButton}>
          <FaArrowLeft /> Back to Events
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate(`/events/${id}`)} style={styles.backButton}>
          <FaArrowLeft size={20} /> Back to Event
        </button>
        <div style={styles.headerContent}>
          <h1 style={styles.title}><FaEdit style={{ marginRight: '15px', color: '#800000' }} />Edit Event</h1>
          <p style={styles.subtitle}>Updating: <strong>{event.title}</strong></p>
        </div>
        <div style={styles.eventCode}>
          <FaClipboardList /> Code: <strong>{event.eventCode}</strong>
        </div>
      </div>

      {/* Status Messages */}
      {message.text && (
        <div style={{...styles.message, background: message.type === 'success' ? '#d4edda' : '#f8d7da', color: message.type === 'success' ? '#155724' : '#721c24'}}>
          {message.type === 'success' ? <FaCheckCircle size={20} /> : <FaExclamationTriangle size={20} />}
          <strong>{message.type === 'success' ? 'Success!' : 'Error:'}</strong> {message.text}
        </div>
      )}

      {/* Event Stats */}
      <div style={styles.statsBar}>
        <div style={styles.statItem}><span style={styles.statLabel}>Registered</span><span style={styles.statValue}>{event.attendeesCount || 0}</span></div>
        <div style={styles.statItem}><span style={styles.statLabel}>Capacity</span><span style={styles.statValue}>{event.capacity}</span></div>
        <div style={styles.statItem}><span style={styles.statLabel}>Available</span><span style={styles.statValue}>{event.capacity - (event.attendeesCount || 0)}</span></div>
        <div style={styles.statItem}>
          <span style={styles.statLabel}>Status</span>
          <span style={{...styles.statValue, color: formData.status === 'published' ? '#27ae60' : formData.status === 'cancelled' ? '#e74c3c' : '#95a5a6', fontSize: '16px'}}>
            {formData.status === 'published' && <FaEye style={{ marginRight: '5px' }} />}
            {formData.status === 'draft' && <FaEyeSlash style={{ marginRight: '5px' }} />}
            {formData.status === 'cancelled' && <FaBan style={{ marginRight: '5px' }} />}
            {formData.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Section Navigation */}
      <div style={styles.sectionNav}>
        <button onClick={() => scrollToSection('basic')} style={{...styles.navButton, backgroundColor: activeSection === 'basic' ? '#800000' : 'transparent', color: activeSection === 'basic' ? 'white' : '#800000'}}><FaFileAlt size={14} />Basic</button>
        <button onClick={() => scrollToSection('media')} style={{...styles.navButton, backgroundColor: activeSection === 'media' ? '#800000' : 'transparent', color: activeSection === 'media' ? 'white' : '#800000'}}><FaImage size={14} />Media</button>
        <button onClick={() => scrollToSection('datetime')} style={{...styles.navButton, backgroundColor: activeSection === 'datetime' ? '#800000' : 'transparent', color: activeSection === 'datetime' ? 'white' : '#800000'}}><FaCalendarAlt size={14} />Time</button>
        <button onClick={() => scrollToSection('location')} style={{...styles.navButton, backgroundColor: activeSection === 'location' ? '#800000' : 'transparent', color: activeSection === 'location' ? 'white' : '#800000'}}><FaMapMarkerAlt size={14} />Location</button>
        <button onClick={() => scrollToSection('category')} style={{...styles.navButton, backgroundColor: activeSection === 'category' ? '#800000' : 'transparent', color: activeSection === 'category' ? 'white' : '#800000'}}><FaTag size={14} />Category</button>
        <button onClick={() => scrollToSection('capacity')} style={{...styles.navButton, backgroundColor: activeSection === 'capacity' ? '#800000' : 'transparent', color: activeSection === 'capacity' ? 'white' : '#800000'}}><FaUsers size={14} />Capacity</button>
        
        <button onClick={() => scrollToSection('rsvp')} style={{...styles.navButton, backgroundColor: activeSection === 'rsvp' ? '#800000' : 'transparent', color: activeSection === 'rsvp' ? 'white' : '#800000'}}><FaUserCheck size={14} />RSVP</button>
        <button onClick={() => scrollToSection('visibility')} style={{...styles.navButton, backgroundColor: activeSection === 'visibility' ? '#800000' : 'transparent', color: activeSection === 'visibility' ? 'white' : '#800000'}}><FaGlobe size={14} />Visibility</button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Section 1: Basic Information */}
        <div id="basic" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection('basic')}>
            <div style={styles.sectionTitle}><FaFileAlt size={20} color="#800000" /><h3>Basic Information</h3></div>
            {expandedSections.basic ? <FaChevronDown size={16} /> : <FaChevronRight size={16} />}
          </div>
          {expandedSections.basic && (
            <div style={styles.sectionContent}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Event Title <span style={styles.required}>*</span></label>
                <input type="text" name="title" value={formData.title} onChange={handleChange} required disabled={saving} style={styles.input} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Short Description <span style={styles.required}>*</span><span style={styles.badge}>For listings</span></label>
                <textarea name="shortDescription" value={formData.shortDescription} onChange={handleChange} rows="2" maxLength="150" required disabled={saving} style={styles.textarea} />
                <div style={styles.charCount}>{formData.shortDescription.length}/150</div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Full Description <span style={styles.required}>*</span><span style={styles.badge}>Event page</span></label>
                <textarea name="description" value={formData.description} onChange={handleChange} rows="6" required disabled={saving} style={styles.textarea} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Event Code <span style={styles.required}>*</span></label>
                <input type="text" name="eventCode" value={formData.eventCode} onChange={handleChange} required disabled={saving} style={styles.input} />
              </div>
            </div>
          )}
        </div>

        {/* Section 2: Media */}
        <div id="media" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection('media')}>
            <div style={styles.sectionTitle}><FaImage size={20} color="#800000" /><h3>Banner Image</h3></div>
            {expandedSections.media ? <FaChevronDown size={16} /> : <FaChevronRight size={16} />}
          </div>
          {expandedSections.media && (
            <div style={styles.sectionContent}>
              {bannerPreview && (
                <div style={styles.bannerPreviewSection}>
                  <div style={styles.bannerPreviewContainer}>
                    <img src={bannerPreview} alt="Banner" style={styles.bannerPreview} />
                  </div>
                </div>
              )}
              <div style={styles.mediaOptions}>
                <div style={styles.mediaCard}>
                  <FaUpload size={24} color="#800000" />
                  <h4>Upload New Image</h4>
                  <input type="file" id="bannerUpload" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} disabled={saving} />
                  <label htmlFor="bannerUpload" style={styles.mediaButton}>Choose File</label>
                  {bannerFile && <span>{bannerFile.name}</span>}
                </div>
                <div style={styles.mediaCard}>
                  <FaLink size={24} color="#800000" />
                  <h4>Image URL</h4>
                  <input type="url" name="bannerImage" value={formData.bannerImage} onChange={handleChange} disabled={saving} style={styles.mediaInput} />
                </div>
                <div style={styles.mediaCard}>
                  <FaMagic size={24} color="#800000" />
                  <h4>AI Generation</h4>
                  {!showAIOptions ? (
                    <button type="button" onClick={() => setShowAIOptions(true)} style={styles.mediaButton}>Generate</button>
                  ) : (
                    <div style={styles.aiOptions}>
                      <input type="url" placeholder="Paste AI image URL..." value={bannerAIUrl} onChange={(e) => setBannerAIUrl(e.target.value)} style={styles.mediaInput} />
                      <div style={styles.aiActions}>
                        <button type="button" onClick={handleAIUpload} style={styles.aiConfirmButton}>Use</button>
                        <button type="button" onClick={() => setShowAIOptions(false)} style={styles.aiCancelButton}>Cancel</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 3: Date & Time */}
        <div id="datetime" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection('datetime')}>
            <div style={styles.sectionTitle}><FaCalendarAlt size={20} color="#800000" /><h3>Date & Time</h3></div>
            {expandedSections.datetime ? <FaChevronDown size={16} /> : <FaChevronRight size={16} />}
          </div>
          {expandedSections.datetime && (
            <div style={styles.sectionContent}>
              <div style={styles.compactGrid2}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Start <span style={styles.required}>*</span></label>
                  <input type="datetime-local" name="startDate" value={formData.startDate} onChange={handleChange} required style={styles.input} />
                </div>
                <div style={styles.formGroup}>
                  <label style={styles.label}>End <span style={styles.required}>*</span></label>
                  <input type="datetime-local" name="endDate" value={formData.endDate} onChange={handleChange} required style={styles.input} />
                </div>
              </div>
              <div style={styles.durationCard}>
                <div style={styles.durationHeader}>
                  <FaClock size={20} color="#800000" />
                  <span style={styles.durationLabel}>Duration:</span>
                  <span style={styles.durationValue}>{durationHours}h {durationMinutes}m</span>
                </div>
                <div style={styles.durationTabs}>
                  <button type="button" onClick={() => { setDurationMode('calculate'); calculateDurationFromDates(); }} style={{...styles.durationTab, backgroundColor: durationMode === 'calculate' ? '#800000' : '#f8f9fa', color: durationMode === 'calculate' ? 'white' : '#800000'}}>Calculate from Dates</button>
                  <button type="button" onClick={() => setDurationMode('manual')} style={{...styles.durationTab, backgroundColor: durationMode === 'manual' ? '#800000' : '#f8f9fa', color: durationMode === 'manual' ? 'white' : '#800000'}}>Set Manually</button>
                </div>
                {durationMode === 'manual' && (
                  <div style={styles.manualDuration}>
                    <div style={styles.durationInputs}>
                      <div style={styles.durationInputGroup}>
                        <input type="number" min="0" max="24" value={durationHours} onChange={(e) => { setDurationHours(parseInt(e.target.value) || 0); handleDurationManualChange(); }} style={styles.durationNumberInput} /><span>hours</span>
                      </div>
                      <div style={styles.durationInputGroup}>
                        <input type="number" min="0" max="59" step="5" value={durationMinutes} onChange={(e) => { setDurationMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0))); handleDurationManualChange(); }} style={styles.durationNumberInput} /><span>minutes</span>
                      </div>
                    </div>
                    <div style={styles.presetButtons}>
                      <button type="button" onClick={() => { setDurationHours(1); setDurationMinutes(0); handleDurationManualChange(); }}>1h</button>
                      <button type="button" onClick={() => { setDurationHours(2); setDurationMinutes(0); handleDurationManualChange(); }}>2h</button>
                      <button type="button" onClick={() => { setDurationHours(3); setDurationMinutes(0); handleDurationManualChange(); }}>3h</button>
                      <button type="button" onClick={() => { setDurationHours(4); setDurationMinutes(0); handleDurationManualChange(); }}>4h</button>
                      <button type="button" onClick={() => { setDurationHours(8); setDurationMinutes(0); handleDurationManualChange(); }}>Full Day</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Section 4: Location */}
        <div id="location" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection('location')}>
            <div style={styles.sectionTitle}><FaMapMarkerAlt size={20} color="#800000" /><h3>Location</h3></div>
            {expandedSections.location ? <FaChevronDown size={16} /> : <FaChevronRight size={16} />}
          </div>
          {expandedSections.location && (
            <div style={styles.sectionContent}>
              <div style={styles.toggleCard}>
                <label style={styles.toggleLabel}>
                  <input type="checkbox" name="isOnline" checked={formData.isOnline} onChange={handleChange} style={styles.toggleCheckbox} />
                  <div style={{...styles.toggleSwitch, backgroundColor: formData.isOnline ? '#800000' : '#cbd5e1'}}>
                    <div style={{...styles.toggleSlider, transform: formData.isOnline ? 'translateX(24px)' : 'translateX(0)'}} />
                  </div>
                  <span style={styles.toggleText}>{formData.isOnline ? '🌐 Online Event' : '📍 Physical Event'}</span>
                </label>
              </div>
              {!formData.isOnline ? (
                <div style={styles.locationGrid}>
                  <div style={styles.locationInputGroup}>
                    <label style={styles.locationLabel}>Venue <span style={styles.required}>*</span></label>
                    <input type="text" name="venue" value={formData.venue} onChange={handleChange} required style={styles.locationInput} />
                  </div>
                  <div style={styles.locationInputGroup}>
                    <label style={styles.locationLabel}>Room / Building</label>
                    <input type="text" name="room" value={formData.room} onChange={handleChange} style={styles.locationInput} />
                  </div>
                </div>
              ) : (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Meeting Link <span style={styles.required}>*</span></label>
                  <input type="url" name="meetingLink" value={formData.meetingLink} onChange={handleChange} required={formData.isOnline} style={styles.input} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 5: Category */}
        <div id="category" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection('category')}>
            <div style={styles.sectionTitle}><FaTag size={20} color="#800000" /><h3>Category</h3></div>
            {expandedSections.category ? <FaChevronDown size={16} /> : <FaChevronRight size={16} />}
          </div>
          {expandedSections.category && (
            <div style={styles.sectionContent}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Event Type</label>
                <div style={styles.categoryGrid}>
                  {categoryOptions.map(opt => (
                    <button type="button" key={opt.value} onClick={() => setFormData(prev => ({ ...prev, category: opt.value }))}
                      style={{...styles.categoryButton, backgroundColor: formData.category === opt.value ? '#800000' : '#f8f9fa', color: formData.category === opt.value ? 'white' : '#800000', borderColor: formData.category === opt.value ? '#800000' : '#ddd'}}>
                      <span style={styles.categoryIcon}>{opt.icon}</span>{opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Faculty</label>
                <div style={styles.facultyGrid}>
                  {facultyOptions.map(opt => (
                    <button type="button" key={opt.value} onClick={() => setFormData(prev => ({ ...prev, faculty: opt.value }))}
                      style={{...styles.facultyButton, backgroundColor: formData.faculty === opt.value ? '#800000' : 'white', color: formData.faculty === opt.value ? 'white' : '#800000', borderColor: formData.faculty === opt.value ? '#800000' : '#ddd'}}>
                      <span>{opt.icon}</span>{opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>Target Audience</label>
                <div style={styles.audienceGrid}>
                  {audienceOptions.map(opt => (
                    <label key={opt.value} style={styles.audienceCheckbox}>
                      <input type="checkbox" checked={formData.targetAudience.includes(opt.value)} onChange={() => handleAudienceChange(opt.value)} style={styles.checkbox} />
                      <span>{opt.icon} {opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Section 6: Capacity */}
        <div id="capacity" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection('capacity')}>
            <div style={styles.sectionTitle}><FaUsers size={20} color="#800000" /><h3>Capacity</h3></div>
            {expandedSections.capacity ? <FaChevronDown size={16} /> : <FaChevronRight size={16} />}
          </div>
          {expandedSections.capacity && (
            <div style={styles.sectionContent}>
              <div style={styles.capacityGrid}>
                <div style={styles.capacityItem}>
                  <label style={styles.capacityItemLabel}>Maximum Capacity</label>
                  <div style={styles.capacityInputWrapper}>
                    <input type="number" name="capacity" min="1" value={formData.capacity} onChange={handleChange} style={styles.capacityNumberInput} />
                    <span style={styles.capacityUnit}>people</span>
                  </div>
                </div>
                <div style={styles.capacityItem}>
                  <label style={styles.capacityItemLabel}>Minimum Attendees</label>
                  <div style={styles.capacityInputWrapper}>
                    <input type="number" name="minAttendees" min="1" max={formData.capacity} value={formData.minAttendees} onChange={handleChange} style={styles.capacityNumberInput} />
                    <span style={styles.capacityUnit}>to proceed</span>
                  </div>
                </div>
              </div>
              <div style={styles.registrationOptions}>
                <label style={styles.compactOptionLabel}>
                  <input type="checkbox" name="registrationOpen" checked={formData.registrationOpen} onChange={handleChange} style={styles.checkbox} />
                  <div style={styles.optionText}><strong>Open registration immediately</strong><span style={styles.optionHint}>Students can register right away</span></div>
                </label>
                <label style={styles.compactOptionLabel}>
                  <input type="checkbox" name="requiresApproval" checked={formData.requiresApproval} onChange={handleChange} style={styles.checkbox} />
                  <div style={styles.optionText}><strong>Require approval for registration</strong><span style={styles.optionHint}>Manually approve each attendee</span></div>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Section 7: Materials - kept commented as original */}
        {/* <div id="materials" style={styles.section}>
          ...
        </div> */}

        {/* Section 8: RSVP Settings */}
        <div id="rsvp" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection('rsvp')}>
            <div style={styles.sectionTitle}><FaUserCheck size={20} color="#800000" /><h3>RSVP Settings</h3></div>
            {expandedSections.rsvp ? <FaChevronDown size={16} /> : <FaChevronRight size={16} />}
          </div>
          {expandedSections.rsvp && (
            <div style={styles.sectionContent}>
              <div style={styles.rsvpCards}>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, requiresRSVP: true }))}
                  style={{...styles.rsvpCard, borderColor: formData.requiresRSVP ? '#800000' : '#ddd', backgroundColor: formData.requiresRSVP ? '#fff5f5' : 'white'}}>
                  {formData.requiresRSVP ? <FaCheckCircle size={32} color="#800000" /> : <FaUserCheck size={32} color="#95a5a6" />}
                  <h3>Students MUST RSVP</h3><p>Track attendance, manage capacity</p>
                </button>
                <button type="button" onClick={() => setFormData(prev => ({ ...prev, requiresRSVP: false }))}
                  style={{...styles.rsvpCard, borderColor: !formData.requiresRSVP ? '#800000' : '#ddd', backgroundColor: !formData.requiresRSVP ? '#fff5f5' : 'white'}}>
                  {!formData.requiresRSVP ? <FaCheckCircle size={32} color="#800000" /> : <FaUserTimes size={32} color="#95a5a6" />}
                  <h3>Optional Attendance</h3><p>Open to walk-ins, casual gatherings</p>
                </button>
              </div>
              {formData.requiresRSVP && (
                <div style={styles.rsvpDetails}>
                  <h4 style={styles.rsvpDetailsTitle}><FaCog size={18} color="#800000" /> RSVP Configuration</h4>
                  <div style={styles.compactGrid2}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>RSVP Deadline <span style={styles.badge}>Optional</span></label>
                      <input type="datetime-local" name="rsvpDeadline" value={formData.rsvpDeadline} onChange={handleChange} min={new Date().toISOString().slice(0,16)} max={formData.startDate} style={styles.input} />
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Cancellation Deadline</label>
                      <select name="cancellationDeadline" value={formData.cancellationDeadline} onChange={handleChange} style={styles.select}>
                        <option value="1">1 day before</option><option value="2">2 days before</option><option value="3">3 days before</option>
                        <option value="7">7 days before</option><option value="14">14 days before</option>
                      </select>
                    </div>
                  </div>
                  <div style={styles.compactGrid2}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>Preparation Time</label>
                      <select name="preparationTime" value={formData.preparationTime} onChange={handleChange} style={styles.select}>
                        <option value="1">1 hour before</option><option value="2">2 hours before</option><option value="4">4 hours before</option>
                        <option value="12">12 hours before</option><option value="24">1 day before</option><option value="48">2 days before</option>
                      </select>
                    </div>
                    <div style={styles.formGroup}>
                      <label style={styles.checkboxLabel}>
                        <input type="checkbox" name="allowWalkIn" checked={formData.allowWalkIn} onChange={handleChange} style={styles.checkbox} />
                        <div><strong>Allow walk-ins after deadline</strong></div>
                      </label>
                    </div>
                  </div>
                  <div style={styles.rulesPreview}><FaBan size={16} color="#800000" />Cancellation blocked after {formData.cancellationDeadline} day(s) before event</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 9: Visibility */}
        <div id="visibility" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection('visibility')}>
            <div style={styles.sectionTitle}><FaGlobe size={20} color="#800000" /><h3>Visibility</h3></div>
            {expandedSections.visibility ? <FaChevronDown size={16} /> : <FaChevronRight size={16} />}
          </div>
          {expandedSections.visibility && (
            <div style={styles.sectionContent}>
              <div style={styles.statusGrid}>
                {statusOptions.map(opt => (
                  <button type="button" key={opt.value} onClick={() => setFormData(prev => ({ ...prev, status: opt.value }))}
                    style={{...styles.statusButton, borderColor: opt.color, backgroundColor: formData.status === opt.value ? `${opt.color}20` : 'white'}}>
                    <span style={{ fontSize: '24px', marginBottom: '5px' }}>{opt.icon}</span>
                    <strong style={{ color: opt.color }}>{opt.label}</strong>
                  </button>
                ))}
              </div>
              
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={styles.actionButtons}>
          <button type="submit" disabled={saving} style={styles.saveButton}>
            {saving ? <><FaSpinner style={styles.buttonSpinner} /> Saving...</> : <><FaSave size={16} /> Save Changes</>}
          </button>
          <button type="button" onClick={() => navigate(`/events/${id}`)} style={styles.cancelButton} disabled={saving}>
            <FaTimes size={16} /> Cancel
          </button>
          {formData.status !== 'cancelled' && (
            <button type="button" onClick={handleCancelEvent} style={styles.cancelEventButton} disabled={saving}>
              <FaBan size={16} /> Cancel Event
            </button>
          )}
          {/* Fixed: optional chaining to avoid null error */}
          {userData?.role === 'admin' && (
            <button type="button" onClick={handleDeleteEvent} style={styles.deleteButton} disabled={saving}>
              <FaTrash size={16} /> Delete Event
            </button>
          )}
        </div>
      </form>

      {/* Collapsible Tips Panel */}
      {!showTips && (
        <button onClick={() => setShowTips(true)} style={styles.tipsToggleButton}>
          <FaInfoCircle size={20} color="#800000" />
        </button>
      )}
      {showTips && (
        <div style={styles.tipsPanel}>
          <div style={styles.tipsHeader}>
            <h4 style={styles.tipsTitle}><FaInfoCircle size={18} color="#800000" /> Editing Tips</h4>
            <button onClick={() => setShowTips(false)} style={styles.tipsCloseButton}>×</button>
          </div>
          <ul style={styles.tipsList}>
            <li>⚠️ Capacity can't be lower than current registrations</li>
            <li>📝 Published events are immediately visible to users</li>
            <li>🕒 Date changes affect existing registrations</li>
            <li>🎯 Keep event code unique and consistent</li>
          </ul>
        </div>
      )}
    </div>
  );
}

// Styles
const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    position: 'relative'
  },
  header: {
    marginBottom: '30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px'
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'transparent',
    color: '#800000',
    border: '1px solid #800000',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  headerContent: {
    flex: 1,
    textAlign: 'center'
  },
  title: {
    color: '#800000',
    fontSize: '2rem',
    fontWeight: '700',
    marginBottom: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  subtitle: {
    color: '#64748b',
    fontSize: '14px'
  },
  eventCode: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#f1f5f9',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#1e293b'
  },
  message: {
    padding: '16px',
    marginBottom: '25px',
    borderRadius: '12px',
    border: '1px solid',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    fontWeight: '500'
  },
  statsBar: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '15px',
    background: 'white',
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '30px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  statItem: {
    textAlign: 'center',
    padding: '0 10px',
    borderRight: '1px solid #e9ecef',
    ':last-child': { borderRight: 'none' }
  },
  statLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginBottom: '5px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  },
  statValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '700',
    color: '#1e293b'
  },
  sectionNav: {
    display: 'flex',
    gap: '6px',
    marginBottom: '20px',
    flexWrap: 'wrap',
    justifyContent: 'center',
    background: 'white',
    padding: '15px',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
  },
  navButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    border: '1px solid #800000',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  form: {
    background: 'white',
    borderRadius: '16px',
    padding: '25px',
    boxShadow: '0 4px 20px rgba(128,0,0,0.08)',
    marginBottom: '30px'
  },
  section: {
    marginBottom: '15px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e9ecef',
    overflow: 'hidden'
  },
  sectionHeader: {
    padding: '12px 16px',
    background: '#f8fafc',
    borderBottom: '1px solid #e9ecef',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer'
  },
  sectionTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    '& h3': {
      fontSize: '15px',
      fontWeight: '600',
      color: '#1e293b',
      margin: 0
    }
  },
  sectionContent: {
    padding: '16px'
  },
  formGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px',
    fontWeight: '500',
    color: '#1e293b',
    fontSize: '13px'
  },
  required: {
    color: '#e74c3c',
    fontSize: '13px'
  },
  badge: {
    background: '#f1f5f9',
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '500',
    color: '#64748b'
  },
  hint: {
    display: 'block',
    fontSize: '11px',
    color: '#64748b',
    marginTop: '4px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'all 0.2s'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit'
  },
  charCount: {
    textAlign: 'right',
    fontSize: '11px',
    color: '#64748b',
    marginTop: '4px'
  },
  compactGrid2: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  // Media styles
  bannerPreviewSection: {
    marginBottom: '16px'
  },
  bannerPreviewContainer: {
    position: 'relative',
    marginTop: '8px'
  },
  bannerPreview: {
    width: '100%',
    maxHeight: '200px',
    borderRadius: '8px',
    objectFit: 'cover',
    border: '1px solid #e2e8f0'
  },
  mediaOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px'
  },
  mediaCard: {
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '8px',
    textAlign: 'center'
  },
  mediaButton: {
    display: 'inline-block',
    padding: '6px 12px',
    background: '#800000',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    marginTop: '8px'
  },
  mediaInput: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    marginTop: '8px'
  },
  aiOptions: {
    marginTop: '8px'
  },
  aiActions: {
    display: 'flex',
    gap: '6px',
    marginTop: '6px'
  },
  aiConfirmButton: {
    flex: 1,
    padding: '6px',
    background: '#800000',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  aiCancelButton: {
    flex: 1,
    padding: '6px',
    background: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  // Duration styles
  durationCard: {
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    marginTop: '8px'
  },
  durationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '12px'
  },
  durationLabel: {
    fontSize: '13px',
    fontWeight: '500',
    color: '#1e293b'
  },
  durationValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#800000'
  },
  durationTabs: {
    display: 'flex',
    gap: '6px',
    marginBottom: '12px'
  },
  durationTab: {
    flex: 1,
    padding: '6px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  manualDuration: {
    padding: '12px',
    background: 'white',
    borderRadius: '6px'
  },
  durationInputs: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px'
  },
  durationInputGroup: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  durationNumberInput: {
    width: '60px',
    padding: '6px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    textAlign: 'center',
    fontSize: '13px'
  },
  presetButtons: {
    display: 'flex',
    gap: '6px',
    flexWrap: 'wrap',
    '& button': {
      padding: '4px 8px',
      background: '#f8f9fa',
      border: '1px solid #800000',
      color: '#800000',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '11px'
    }
  },
  // Location styles
  toggleCard: {
    marginBottom: '16px'
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer'
  },
  toggleCheckbox: {
    display: 'none'
  },
  toggleSwitch: {
    width: '44px',
    height: '22px',
    borderRadius: '11px',
    position: 'relative',
    transition: 'background 0.3s'
  },
  toggleSlider: {
    width: '18px',
    height: '18px',
    background: 'white',
    borderRadius: '50%',
    position: 'absolute',
    top: '2px',
    left: '2px',
    transition: 'transform 0.3s'
  },
  toggleText: {
    fontSize: '13px',
    fontWeight: '500'
  },
  locationGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px'
  },
  locationInputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  locationLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#1e293b'
  },
  locationInput: {
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px'
  },
  // Category styles
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '6px',
    marginBottom: '12px'
  },
  categoryButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    padding: '8px 4px',
    border: '1px solid',
    borderRadius: '6px',
    fontSize: '11px',
    cursor: 'pointer'
  },
  categoryIcon: {
    fontSize: '16px'
  },
  facultyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '6px',
    marginBottom: '12px'
  },
  facultyButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px',
    border: '1px solid',
    borderRadius: '6px',
    fontSize: '11px',
    cursor: 'pointer',
    textAlign: 'left'
  },
  audienceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    padding: '10px',
    background: '#f8f9fa',
    borderRadius: '6px'
  },
  audienceCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  checkbox: {
    width: '14px',
    height: '14px',
    accentColor: '#800000'
  },
  // Capacity styles
  capacityGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px'
  },
  capacityItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  capacityItemLabel: {
    fontSize: '12px',
    fontWeight: '500',
    color: '#1e293b'
  },
  capacityInputWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    padding: '0 10px'
  },
  capacityNumberInput: {
    width: '80px',
    padding: '8px 0',
    border: 'none',
    background: 'transparent',
    fontSize: '14px',
    fontWeight: '500',
    outline: 'none'
  },
  capacityUnit: {
    fontSize: '12px',
    color: '#64748b',
    whiteSpace: 'nowrap'
  },
  capacityHint: {
    fontSize: '11px',
    color: '#e74c3c'
  },
  registrationOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  compactOptionLabel: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    padding: '8px',
    background: '#f8fafc',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  optionText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '12px'
  },
  optionHint: {
    fontSize: '10px',
    color: '#64748b'
  },
  // Materials styles (commented out, but kept for completeness)
  materialRow: {
    marginBottom: '12px'
  },
  materialLabel: {
    display: 'block',
    fontSize: '11px',
    fontWeight: '500',
    color: '#64748b',
    marginBottom: '4px'
  },
  materialInputGroup: {
    display: 'flex',
    gap: '6px'
  },
  materialInput: {
    flex: 1,
    padding: '8px 10px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px'
  },
  materialRemoveButton: {
    width: '32px',
    height: '32px',
    background: '#fee2e2',
    color: '#e74c3c',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  addButton: {
    padding: '8px 12px',
    background: 'transparent',
    color: '#800000',
    border: '1px solid #800000',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  },
  // RSVP styles
  rsvpCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    marginBottom: '20px'
  },
  rsvpCard: {
    padding: '16px',
    border: '2px solid',
    borderRadius: '8px',
    background: 'white',
    cursor: 'pointer',
    textAlign: 'center'
  },
  rsvpDetails: {
    marginTop: '16px',
    padding: '16px',
    background: '#fdf5f5',
    borderRadius: '8px'
  },
  rsvpDetailsTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
    color: '#800000'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer'
  },
  select: {
    width: '100%',
    padding: '8px',
    border: '1px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '13px'
  },
  rulesPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
    padding: '12px',
    background: 'white',
    borderRadius: '8px',
    fontSize: '13px'
  },
  // Status styles
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginBottom: '16px'
  },
  statusButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '10px',
    border: '2px solid',
    borderRadius: '8px',
    background: 'white',
    cursor: 'pointer'
  },
  featuredLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  // Action buttons
  actionButtons: {
    display: 'flex',
    gap: '12px',
    marginTop: '30px',
    flexWrap: 'wrap'
  },
  saveButton: {
    flex: 2,
    padding: '14px 20px',
    background: '#800000',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minWidth: '180px'
  },
  cancelButton: {
    flex: 1,
    padding: '14px 20px',
    background: 'transparent',
    color: '#6c757d',
    border: '1px solid #6c757d',
    borderRadius: '10px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minWidth: '120px'
  },
  cancelEventButton: {
    flex: 1,
    padding: '14px 20px',
    background: 'transparent',
    color: '#e74c3c',
    border: '1px solid #e74c3c',
    borderRadius: '10px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minWidth: '140px'
  },
  deleteButton: {
    flex: 1,
    padding: '14px 20px',
    background: 'transparent',
    color: '#dc3545',
    border: '1px solid #dc3545',
    borderRadius: '10px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    minWidth: '140px'
  },
  buttonSpinner: {
    animation: 'spin 1s linear infinite'
  },
  // Tips panel new styles
  tipsToggleButton: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: 'white',
    border: '1px solid #800000',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    transition: 'all 0.2s'
  },
  tipsPanel: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '240px',
    padding: '16px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    border: '1px solid #80000020',
    zIndex: 100
  },
  tipsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  tipsTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    margin: 0,
    color: '#800000',
    fontSize: '14px',
    fontWeight: '600'
  },
  tipsCloseButton: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#800000',
    padding: '0 4px'
  },
  tipsList: {
    margin: 0,
    paddingLeft: '18px',
    fontSize: '12px',
    color: '#495057',
    lineHeight: '1.8'
  },
  // Loading and error states
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: '70vh',
    textAlign: 'center'
  },
  spinner: {
    fontSize: '40px',
    color: '#800000',
    animation: 'spin 1s linear infinite'
  },
  accessDenied: {
    maxWidth: '400px',
    margin: '60px auto',
    textAlign: 'center',
    padding: '40px',
    background: 'white',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  returnButton: {
    marginTop: '20px',
    padding: '10px 20px',
    background: '#800000',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  notFound: {
    textAlign: 'center',
    padding: '60px 20px'
  }
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(styleSheet);

export default EditEvent;