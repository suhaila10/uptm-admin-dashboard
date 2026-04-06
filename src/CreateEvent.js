// src/CreateEvent.js - UPTM MAROON THEME - WITH FIREBASE STORAGE INTEGRATION
import React, { useState, useEffect } from 'react';
import { collection, getDocs, Timestamp, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './firebase';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { 
  FaCalendarAlt, FaClock, FaMapMarkerAlt, FaUserFriends, 
  FaTag, FaUniversity, FaUsers, FaGlobe, FaImage, 
  FaFileAlt, FaCheckCircle, FaRegCircle, FaInfoCircle,
  FaArrowLeft, FaExclamationTriangle, FaLink, FaUpload,
  FaMagic, FaCog, FaUserCheck, FaUserTimes, FaBan,
  FaChevronRight, FaChevronDown, FaPlus, FaTimes, FaSave,
  FaShieldAlt, FaBuilding, FaChalkboardTeacher, FaGraduationCap,
  FaStar, FaRegStar, FaClock as FaClockRegular
} from 'react-icons/fa';

function CreateEvent() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeSection, setActiveSection] = useState('basic');
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    media: false,
    datetime: false,
    location: false,
    category: false,
    capacity: false,
    rsvp: false,
    visibility: false
  });

  // Banner states
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState('');
  const [bannerAIUrl, setBannerAIUrl] = useState('');
  const [showAIOptions, setShowAIOptions] = useState(false);
  
  // Duration states
  const [durationHours, setDurationHours] = useState(2);
  const [durationMinutes, setDurationMinutes] = useState(0);
  const [durationMode, setDurationMode] = useState('calculate');
  
  // Form state - Comprehensive fields
  const [formData, setFormData] = useState({
    // BASIC EVENT INFO
    title: '',
    description: '',
    shortDescription: '',
    eventCode: '',
    
    // DATE & TIME
    startDate: '',
    endDate: '',
    duration: 120,
    
    // LOCATION
    venue: 'UPTM Main Hall',
    room: '',
    isOnline: false,
    meetingLink: '',
    
    // EVENT CATEGORY
    category: 'workshop',
    faculty: 'FCOM',
    targetAudience: ['students'],
    
    // CAPACITY & REGISTRATION
    capacity: 50,
    minAttendees: 10,
    registrationOpen: true,
    requiresApproval: false,
    
    // STATUS
    status: 'draft',
    isFeatured: false,
    
    // IMAGES & FILES
    bannerImage: '',
    materials: [],

    // RSVP SETTINGS
    requiresRSVP: true,
    rsvpDeadline: '',
    preparationTime: 24,
    allowWalkIn: false,
    cancellationDeadline: 7,
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setActiveSection(sectionId);
  };

  // Predefined options
  const categoryOptions = [
    { value: 'workshop', label: 'Workshop', color: '#800000' },
    { value: 'seminar', label: 'Industrial Talk', color: '#800000' },
    { value: 'conference', label: 'Conference', color: '#800000' },
    { value: 'competition', label: 'Competition', color: '#800000' },
    { value: 'social', label: 'Social Event', color: '#800000' },
    { value: 'training', label: 'Training', color: '#800000' },
    { value: 'lecture', label: 'Lecture', color: '#800000' },
    { value: 'webinar', label: 'Webinar', color: '#800000' },
  ];

  const facultyOptions = [
    { value: 'FCOM', label: 'Faculty of Computing (FCOM)' },
    { value: 'FABA', label: 'Faculty of Business (FABA)'},
    { value: 'FESSH', label: 'Faculty of Education (FESSH)' },
    { value: 'IPS', label: 'Institute of Professional Studies (IPS)' },
    { value: 'IGS', label: 'Institute of Graduate Studies (IGS)' },
    { value: 'CIGLS', label: 'CENTRE OF ISLAMIC, GENERAL AND LANGUAGE STUDIES (CIGLS)'},
    { value: 'GENERAL', label: 'General (All Faculties)'},
  ];

  const audienceOptions = [
    { value: 'students', label: 'Students' },
    { value: 'lecturers', label: 'Lecturers' },
    { value: 'staff', label: 'Staff' },
    { value: 'alumni', label: 'Alumni'},
    { value: 'public', label: 'Public' },
  ];

  const statusOptions = [
    { value: 'draft', label: 'Draft', color: '#95a5a6' },
    { value: 'published', label: 'Published', color: '#27ae60' },
    { value: 'cancelled', label: 'Cancelled', color: '#e74c3c' },
  ];

  // Check user role on component mount
  useEffect(() => {
    const checkUserRole = async () => {
      const user = auth.currentUser;
      if (!user) {
        setMessage({ type: 'error', text: 'You must be logged in' });
        setTimeout(() => navigate('/login'), 2000);
        return;
      }
      
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        let userFound = false;
        
        querySnapshot.forEach((doc) => {
          if (doc.id === user.uid || doc.data().email === user.email) {
            setUserData({ id: doc.id, ...doc.data() });
            userFound = true;
          }
        });
        
        if (!userFound) {
          setMessage({ type: 'error', text: 'User data not found in database' });
        }
      } catch (error) {
        console.error('Error checking user:', error);
        setMessage({ type: 'error', text: 'Error checking permissions' });
      }
    };
    
    checkUserRole();
  }, [navigate]);

  // Handle input changes
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Handle audience selection
  const handleAudienceChange = (value) => {
    setFormData(prev => {
      const audiences = [...prev.targetAudience];
      if (audiences.includes(value)) {
        return { ...prev, targetAudience: audiences.filter(a => a !== value) };
      } else {
        return { ...prev, targetAudience: [...audiences, value] };
      }
    });
  };

  // Banner Functions
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.match('image.*')) {
        setMessage({ type: 'error', text: 'Please upload an image file (JPEG, PNG, GIF)' });
        return;
      }
      
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size should be less than 5MB' });
        return;
      }
      
      setBannerFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setBannerPreview(reader.result);
      };
      reader.readAsDataURL(file);
      
      // Clear the URL input when a file is selected
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
      setFormData(prev => ({
        ...prev,
        bannerImage: bannerAIUrl
      }));
      setBannerPreview(bannerAIUrl);
      setShowAIOptions(false);
      setMessage({ type: 'success', text: 'AI-generated image URL added successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Please enter a valid URL' });
    }
  };

  // Duration Functions
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
      const end = new Date(start.getTime() + (totalMinutes * 60 * 1000));
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

  const generateEventCode = () => {
    const prefix = formData.category.toUpperCase().substring(0, 3);
    const year = new Date().getFullYear();
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${year}-${randomNum}`;
  };

  // UPDATED handleSubmit with Firebase Storage upload
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userData || (userData.role !== 'organizer' && userData.role !== 'admin')) {
      setMessage({ type: 'error', text: 'Only organizers or admins can create events' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    // --- Validate form ---
    const requiredFields = ['title', 'description', 'shortDescription', 'startDate', 'endDate', 'venue'];
    const missingFields = requiredFields.filter(field => !formData[field]?.trim());
    if (missingFields.length > 0) {
      setMessage({ type: 'error', text: `Please fill all required fields: ${missingFields.join(', ')}` });
      setSaving(false);
      return;
    }
    if (formData.isOnline && !formData.meetingLink) {
      setMessage({ type: 'error', text: 'Meeting link is required for online events' });
      setSaving(false);
      return;
    }
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end <= start) {
      setMessage({ type: 'error', text: 'End date must be after start date' });
      setSaving(false);
      return;
    }

    try {
      // --- Generate a unique event ID ---
      const eventId = uuidv4();
      const eventCode = formData.eventCode || generateEventCode();

      // --- Handle image upload (if a file was selected) ---
      let bannerImageUrl = formData.bannerImage.trim(); // may be empty or a URL
      if (bannerFile) {
        // Sanitize file name
        const timestamp = Date.now();
        const safeFileName = `${timestamp}_${bannerFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, `event-banners/${auth.currentUser.uid}/${eventId}/${safeFileName}`);

        setMessage({ type: 'info', text: 'Uploading image...' });
        const uploadTask = uploadBytesResumable(storageRef, bannerFile);

        // Wait for upload to complete
        await new Promise((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
              console.log(`Upload is ${progress}% done`);
            },
            (error) => {
              console.error('Upload failed:', error);
              reject(error);
            },
            async () => {
              const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
              bannerImageUrl = downloadURL;
              resolve();
            }
          );
        });
      }

      // --- Prepare event data ---
      const eventData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        shortDescription: formData.shortDescription.trim(),
        eventCode: eventCode,

        date: Timestamp.fromDate(new Date(formData.startDate)),
        startDate: Timestamp.fromDate(new Date(formData.startDate)),
        endDate: Timestamp.fromDate(new Date(formData.endDate)),
        duration: parseInt(formData.duration),
        durationHours: durationHours,
        durationMinutes: durationMinutes,
        durationDisplay: `${durationHours}h ${durationMinutes}m`,

        venue: formData.venue.trim(),
        room: formData.room.trim(),
        isOnline: formData.isOnline,
        meetingLink: formData.isOnline ? formData.meetingLink.trim() : '',

        organizerId: auth.currentUser.uid,
        organizerName: userData.name || auth.currentUser.email,
        organizerEmail: auth.currentUser.email,

        category: formData.category,
        faculty: formData.faculty,
        targetAudience: formData.targetAudience,

        capacity: parseInt(formData.capacity),
        minAttendees: parseInt(formData.minAttendees),
        registrationOpen: formData.registrationOpen,
        requiresApproval: formData.requiresApproval,

        requiresRSVP: formData.requiresRSVP,
        rsvpType: formData.requiresRSVP ? 'required' : 'optional',
        rsvpDeadline: formData.rsvpDeadline ? Timestamp.fromDate(new Date(formData.rsvpDeadline)) : null,
        preparationTime: parseInt(formData.preparationTime),
        allowWalkIn: formData.allowWalkIn,
        cancellationDeadline: parseInt(formData.cancellationDeadline),

        attendees: [],
        attendeesCount: 0,
        waitlistCount: 0,

        qrCodeString: `EVENT-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,

        status: formData.status,
        isFeatured: formData.isFeatured,

        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        publishedAt: formData.status === 'published' ? Timestamp.now() : null,

        bannerImage: bannerImageUrl,  // now a real URL
        materials: formData.materials.filter(m => m.trim() !== ''),
      };

      // --- Save to Firestore using the generated ID ---
      await setDoc(doc(db, 'events', eventId), eventData);

      setMessage({
        type: 'success',
        text: `Event "${formData.title}" created successfully! Event Code: ${eventCode}`
      });

      setTimeout(() => {
        navigate(`/events/${eventId}`);
      }, 3000);

    } catch (error) {
      console.error('Error saving event:', error);
      setMessage({ type: 'error', text: `Failed to create event: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Checking permissions...</p>
      </div>
    );
  }
  
  if (!userData) {
    return (
      <div style={styles.errorContainer}>
        <FaExclamationTriangle size={48} color="#800000" />
        <p style={{ color: '#800000', marginTop: '20px' }}>Cannot load user data. Please try logging out and back in.</p>
      </div>
    );
  }
  
  if (userData.role !== 'organizer' && userData.role !== 'admin') {
    return (
      <div style={styles.accessDenied}>
        <FaShieldAlt size={64} color="#800000" />
        <h3 style={{ color: '#800000', margin: '20px 0 10px' }}>Access Denied</h3>
        <p>Only <strong>Event Organizers</strong> or <strong>Admins</strong> can create events.</p>
        <p>Your current role: <strong>{userData.role || 'None'}</strong></p>
        <button 
          onClick={() => navigate('/dashboard')}
          style={styles.returnButton}
        >
          Return to Dashboard
        </button>
      </div>
    );
  }
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button 
          onClick={() => navigate('/dashboard')}
          style={styles.backButton}
        >
          <FaArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Create New Event</h1>
          <p style={styles.subtitle}>Fill in the details below to create your event</p>
        </div>
        <div style={styles.progressBar}>
          <div style={styles.progressSteps}>
            {['basic', 'media', 'datetime', 'location', 'category', 'capacity', 'rsvp', 'visibility'].map((section, index) => (
              <div
                key={section}
                style={{
                  ...styles.progressStep,
                  backgroundColor: activeSection === section ? '#800000' : 
                                 index < ['basic', 'media', 'datetime', 'location', 'category', 'capacity', 'rsvp', 'visibility'].indexOf(activeSection) ? '#80000040' : '#e9ecef'
                }}
                onClick={() => scrollToSection(section)}
                title={section.charAt(0).toUpperCase() + section.slice(1)}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Status Messages */}
      {message.text && (
        <div style={{
          ...styles.message,
          background: message.type === 'success' ? '#d4edda' : 
                     message.type === 'error' ? '#f8d7da' : '#fff3cd',
          color: message.type === 'success' ? '#155724' : 
                message.type === 'error' ? '#721c24' : '#856404',
          borderColor: message.type === 'success' ? '#c3e6cb' : 
                      message.type === 'error' ? '#f5c6cb' : '#ffeaa7'
        }}>
          {message.type === 'success' ? <FaCheckCircle size={20} /> : <FaExclamationTriangle size={20} />}
          <strong>{message.type === 'success' ? 'Success!' : 'Error:'}</strong> {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Section Navigation */}
        <div style={styles.sectionNav}>
          <button
            type="button"
            onClick={() => scrollToSection('basic')}
            style={{...styles.navButton, backgroundColor: activeSection === 'basic' ? '#800000' : 'transparent', color: activeSection === 'basic' ? 'white' : '#800000'}}
          >
            <FaFileAlt size={18} />
            <span>Basic</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('media')}
            style={{...styles.navButton, backgroundColor: activeSection === 'media' ? '#800000' : 'transparent', color: activeSection === 'media' ? 'white' : '#800000'}}
          >
            <FaImage size={18} />
            <span>Media</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('datetime')}
            style={{...styles.navButton, backgroundColor: activeSection === 'datetime' ? '#800000' : 'transparent', color: activeSection === 'datetime' ? 'white' : '#800000'}}
          >
            <FaCalendarAlt size={18} />
            <span>Time</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('location')}
            style={{...styles.navButton, backgroundColor: activeSection === 'location' ? '#800000' : 'transparent', color: activeSection === 'location' ? 'white' : '#800000'}}
          >
            <FaMapMarkerAlt size={18} />
            <span>Location</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('category')}
            style={{...styles.navButton, backgroundColor: activeSection === 'category' ? '#800000' : 'transparent', color: activeSection === 'category' ? 'white' : '#800000'}}
          >
            <FaTag size={18} />
            <span>Category</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('capacity')}
            style={{...styles.navButton, backgroundColor: activeSection === 'capacity' ? '#800000' : 'transparent', color: activeSection === 'capacity' ? 'white' : '#800000'}}
          >
            <FaUsers size={18} />
            <span>Capacity</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('rsvp')}
            style={{...styles.navButton, backgroundColor: activeSection === 'rsvp' ? '#800000' : 'transparent', color: activeSection === 'rsvp' ? 'white' : '#800000'}}
          >
            <FaUserCheck size={18} />
            <span>RSVP</span>
          </button>
          <button
            type="button"
            onClick={() => scrollToSection('visibility')}
            style={{...styles.navButton, backgroundColor: activeSection === 'visibility' ? '#800000' : 'transparent', color: activeSection === 'visibility' ? 'white' : '#800000'}}
          >
            <FaGlobe size={18} />
            <span>Visibility</span>
          </button>
        </div>

        {/* Section 1: Basic Information */}
        <div id="basic" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection('basic')}>
            <div style={styles.sectionTitle}>
              <FaFileAlt size={24} color="#800000" />
              <h2>Basic Information</h2>
            </div>
            {expandedSections.basic ? <FaChevronDown size={20} /> : <FaChevronRight size={20} />}
          </div>
          
          {expandedSections.basic && (
            <div style={styles.sectionContent}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Event Title <span style={styles.required}>*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  placeholder="e.g., Cybersecurity Workshop 2024"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  disabled={saving}
                  style={styles.input}
                />
                <span style={styles.hint}>Make it clear and engaging</span>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Short Description <span style={styles.required}>*</span>
                  <span style={styles.badge}>For listings</span>
                </label>
                <textarea
                  name="shortDescription"
                  placeholder="Brief description that appears in event listings..."
                  value={formData.shortDescription}
                  onChange={handleChange}
                  rows="2"
                  maxLength="150"
                  required
                  disabled={saving}
                  style={styles.textarea}
                />
                <div style={styles.charCount}>
                  <span>{formData.shortDescription.length}/150 characters</span>
                </div>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Full Description <span style={styles.required}>*</span>
                  <span style={styles.badge}>Event page</span>
                </label>
                <textarea
                  name="description"
                  placeholder="## Agenda:\n- 9:00 AM: Registration\n- 9:30 AM: Keynote\n\n## What You'll Learn:\n- Topic 1\n- Topic 2"
                  value={formData.description}
                  onChange={handleChange}
                  rows="6"
                  required
                  disabled={saving}
                  style={styles.textarea}
                />
                <span style={styles.hint}>Supports Markdown formatting</span>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Event Code
                  <span style={styles.badge}>Optional</span>
                </label>
                <div style={styles.inputGroup}>
                  <input
                    type="text"
                    name="eventCode"
                    placeholder="Auto-generated if left empty"
                    value={formData.eventCode}
                    onChange={handleChange}
                    disabled={saving}
                    style={{...styles.input, flex: 1}}
                  />
                  <button 
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, eventCode: generateEventCode() }))}
                    style={styles.generateButton}
                  >
                    <FaMagic size={16} />
                    Generate
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Section 2: Media */}
        <div id="media" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection('media')}>
            <div style={styles.sectionTitle}>
              <FaImage size={24} color="#800000" />
              <h2>Media</h2>
            </div>
            {expandedSections.media ? <FaChevronDown size={20} /> : <FaChevronRight size={20} />}
          </div>
          
          {expandedSections.media && (
            <div style={styles.sectionContent}>
              {/* Banner Preview */}
              {(bannerPreview || formData.bannerImage) && (
                <div style={styles.bannerPreviewSection}>
                  <label style={styles.label}>Current Banner:</label>
                  <div style={styles.bannerPreviewContainer}>
                    <img 
                      src={bannerPreview || formData.bannerImage} 
                      alt="Banner preview" 
                      style={styles.bannerPreview}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'https://via.placeholder.com/800x300/800000/ffffff?text=UPTM+Event+Banner';
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setBannerPreview('');
                        setBannerFile(null);
                        setFormData(prev => ({ ...prev, bannerImage: '' }));
                      }}
                      style={styles.removeImageButton}
                    >
                      <FaTimes size={16} />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Upload Options */}
              <div style={styles.mediaOptions}>
                <div style={styles.mediaCard}>
                  <FaUpload size={24} color="#800000" />
                  <h3>Upload File</h3>
                  <p>JPEG, PNG, GIF (Max 5MB)</p>
                  <input
                    type="file"
                    id="bannerUpload"
                    accept="image/*"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                    disabled={saving}
                  />
                  <label htmlFor="bannerUpload" style={styles.mediaButton}>
                    Choose File
                  </label>
                  {bannerFile && <span style={styles.fileName}>{bannerFile.name}</span>}
                </div>
                
                <div style={styles.mediaCard}>
                  <FaLink size={24} color="#800000" />
                  <h3>Image URL</h3>
                  <p>Direct link to your image</p>
                  <input
                    type="url"
                    name="bannerImage"
                    placeholder="https://example.com/image.jpg"
                    value={formData.bannerImage}
                    onChange={handleChange}
                    disabled={saving}
                    style={styles.mediaInput}
                  />
                </div>
                
                <div style={styles.mediaCard}>
                  <FaMagic size={24} color="#800000" />
                  <h3>AI Generation</h3>
                  <p>Create with AI tools</p>
                  {!showAIOptions ? (
                    <button
                      type="button"
                      onClick={() => setShowAIOptions(true)}
                      style={styles.mediaButton}
                    >
                      Generate
                    </button>
                  ) : (
                    <div style={styles.aiOptions}>
                      <input
                        type="url"
                        placeholder="Paste AI image URL..."
                        value={bannerAIUrl}
                        onChange={(e) => setBannerAIUrl(e.target.value)}
                        style={styles.mediaInput}
                      />
                      <div style={styles.aiActions}>
                        <button
                          type="button"
                          onClick={handleAIUpload}
                          style={styles.aiConfirmButton}
                        >
                          Use
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAIOptions(false)}
                          style={styles.aiCancelButton}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* AI Tools Links */}
              <div style={styles.aiTools}>
                <span>Popular AI tools:</span>
                <a href="https://www.canva.com/ai-image-generator/" target="_blank" rel="noopener noreferrer">Canva AI</a>
                <a href="https://www.bing.com/images/create" target="_blank" rel="noopener noreferrer">Bing Creator</a>
                <a href="https://ideogram.ai/" target="_blank" rel="noopener noreferrer">Ideogram</a>
                <a href="https://chatgpt.com/" target="_blank" rel="noopener noreferrer">ChatGPT</a>
              </div>
            </div>
          )}
        </div>
        
        {/* Section 3: Date & Time */}
        <div id="datetime" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection('datetime')}>
            <div style={styles.sectionTitle}>
              <FaCalendarAlt size={24} color="#800000" />
              <h2>Date & Time</h2>
            </div>
            {expandedSections.datetime ? <FaChevronDown size={20} /> : <FaChevronRight size={20} />}
          </div>
          
          {expandedSections.datetime && (
            <div style={styles.sectionContent}>
              <div style={styles.grid2}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Start Date & Time <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                    required
                    disabled={saving}
                    style={styles.input}
                  />
                </div>
                
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    End Date & Time <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="datetime-local"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                    required
                    disabled={saving}
                    style={styles.input}
                  />
                </div>
              </div>
              
              <div style={styles.durationCard}>
                <div style={styles.durationHeader}>
                  <FaClock size={20} color="#800000" />
                  <span style={styles.durationLabel}>Total Duration:</span>
                  <span style={styles.durationValue}>{durationHours}h {durationMinutes}m</span>
                </div>
                
                <div style={styles.durationTabs}>
                  <button
                    type="button"
                    onClick={() => {
                      setDurationMode('calculate');
                      calculateDurationFromDates();
                    }}
                    style={{
                      ...styles.durationTab,
                      backgroundColor: durationMode === 'calculate' ? '#800000' : '#f8f9fa',
                      color: durationMode === 'calculate' ? 'white' : '#800000'
                    }}
                  >
                    Calculate from Dates
                  </button>
                  <button
                    type="button"
                    onClick={() => setDurationMode('manual')}
                    style={{
                      ...styles.durationTab,
                      backgroundColor: durationMode === 'manual' ? '#800000' : '#f8f9fa',
                      color: durationMode === 'manual' ? 'white' : '#800000'
                    }}
                  >
                    Set Manually
                  </button>
                </div>
                
                {durationMode === 'manual' && (
                  <div style={styles.manualDuration}>
                    <div style={styles.durationInputs}>
                      <div style={styles.durationInputGroup}>
                        <input
                          type="number"
                          min="0"
                          max="24"
                          value={durationHours}
                          onChange={(e) => {
                            setDurationHours(parseInt(e.target.value) || 0);
                            handleDurationManualChange();
                          }}
                          style={styles.durationInput}
                        />
                        <span>hours</span>
                      </div>
                      <div style={styles.durationInputGroup}>
                        <input
                          type="number"
                          min="0"
                          max="59"
                          step="5"
                          value={durationMinutes}
                          onChange={(e) => {
                            setDurationMinutes(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)));
                            handleDurationManualChange();
                          }}
                          style={styles.durationInput}
                        />
                        <span>minutes</span>
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
            <div style={styles.sectionTitle}>
              <FaMapMarkerAlt size={24} color="#800000" />
              <h2>Location</h2>
            </div>
            {expandedSections.location ? <FaChevronDown size={20} /> : <FaChevronRight size={20} />}
          </div>
          
          {expandedSections.location && (
            <div style={styles.sectionContent}>
              <div style={styles.toggleCard}>
                <label style={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    name="isOnline"
                    checked={formData.isOnline}
                    onChange={handleChange}
                    disabled={saving}
                    style={styles.toggleCheckbox}
                  />
                  <div style={{
                    ...styles.toggleSwitch,
                    backgroundColor: formData.isOnline ? '#800000' : '#cbd5e1'
                  }}>
                    <div style={{
                      ...styles.toggleSlider,
                      transform: formData.isOnline ? 'translateX(24px)' : 'translateX(0)'
                    }} />
                  </div>
                  <span style={styles.toggleText}>
                    {formData.isOnline ? '🌐 Online Event' : '📍 Physical Event'}
                  </span>
                </label>
              </div>
              
              {!formData.isOnline ? (
                <div style={styles.grid2}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Venue <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      name="venue"
                      placeholder="e.g., UPTM Main Hall"
                      value={formData.venue}
                      onChange={handleChange}
                      required
                      disabled={saving}
                      style={styles.input}
                    />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Room / Building
                    </label>
                    <input
                      type="text"
                      name="room"
                      placeholder="e.g., Block C, Room 301"
                      value={formData.room}
                      onChange={handleChange}
                      disabled={saving}
                      style={styles.input}
                    />
                  </div>
                </div>
              ) : (
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Meeting Link <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="url"
                    name="meetingLink"
                    placeholder="https://meet.google.com/xxx-yyyy-zzz"
                    value={formData.meetingLink}
                    onChange={handleChange}
                    required={formData.isOnline}
                    disabled={saving}
                    style={styles.input}
                  />
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Section 5: Category */}
        <div id="category" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection('category')}>
            <div style={styles.sectionTitle}>
              <FaTag size={24} color="#800000" />
              <h2>Category</h2>
            </div>
            {expandedSections.category ? <FaChevronDown size={20} /> : <FaChevronRight size={20} />}
          </div>
          
          {expandedSections.category && (
            <div style={styles.sectionContent}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Event Type</label>
                <div style={styles.categoryGrid}>
                  {categoryOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: option.value }))}
                      style={{
                        ...styles.categoryButton,
                        backgroundColor: formData.category === option.value ? '#800000' : '#f8f9fa',
                        color: formData.category === option.value ? 'white' : '#800000',
                        borderColor: formData.category === option.value ? '#800000' : '#ddd'
                      }}
                    >
                      <span style={styles.categoryIcon}>{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Faculty</label>
                <div style={styles.facultyGrid}>
                  {facultyOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, faculty: option.value }))}
                      style={{
                        ...styles.facultyButton,
                        backgroundColor: formData.faculty === option.value ? '#800000' : 'white',
                        color: formData.faculty === option.value ? 'white' : '#800000',
                        borderColor: formData.faculty === option.value ? '#800000' : '#ddd'
                      }}
                    >
                      <span>{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Target Audience</label>
                <div style={styles.audienceGrid}>
                  {audienceOptions.map(option => (
                    <label key={option.value} style={styles.audienceCheckbox}>
                      <input
                        type="checkbox"
                        checked={formData.targetAudience.includes(option.value)}
                        onChange={() => handleAudienceChange(option.value)}
                        style={styles.checkbox}
                      />
                      <span>{option.icon} {option.label}</span>
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
            <div style={styles.sectionTitle}>
              <FaUsers size={24} color="#800000" />
              <h2>Capacity</h2>
            </div>
            {expandedSections.capacity ? <FaChevronDown size={20} /> : <FaChevronRight size={20} />}
          </div>
          
          {expandedSections.capacity && (
            <div style={styles.sectionContent}>
              <div style={styles.capacityCards}>
                <div style={styles.capacityCard}>
                  <label style={styles.capacityLabel}>Maximum Capacity</label>
                  <input
                    type="number"
                    name="capacity"
                    min="1"
                    value={formData.capacity}
                    onChange={handleChange}
                    style={styles.capacityInput}
                  />
                  <span style={styles.capacityHint}>people</span>
                </div>
                
                <div style={styles.capacityCard}>
                  <label style={styles.capacityLabel}>Minimum Attendees</label>
                  <input
                    type="number"
                    name="minAttendees"
                    min="1"
                    max={formData.capacity}
                    value={formData.minAttendees}
                    onChange={handleChange}
                    style={styles.capacityInput}
                  />
                  <span style={styles.capacityHint}>to proceed</span>
                </div>
              </div>
              
              <div style={styles.registrationOptions}>
                
                
                
              </div>
            </div>
          )}
        </div>
        
        {/* Section 7: RSVP Settings */}
        <div id="rsvp" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection('rsvp')}>
            <div style={styles.sectionTitle}>
              <FaUserCheck size={24} color="#800000" />
              <h2>RSVP Settings</h2>
            </div>
            {expandedSections.rsvp ? <FaChevronDown size={20} /> : <FaChevronRight size={20} />}
          </div>
          
          {expandedSections.rsvp && (
            <div style={styles.sectionContent}>
              <div style={styles.rsvpCards}>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, requiresRSVP: true }))}
                  style={{
                    ...styles.rsvpCard,
                    borderColor: formData.requiresRSVP ? '#800000' : '#ddd',
                    backgroundColor: formData.requiresRSVP ? '#fff5f5' : 'white'
                  }}
                >
                  {formData.requiresRSVP ? (
                    <FaCheckCircle size={32} color="#800000" />
                  ) : (
                    <FaUserCheck size={32} color="#95a5a6" />
                  )}
                  <h3>Students MUST RSVP</h3>
                  <p>Track attendance, manage capacity, prepare materials</p>
                </button>
                
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, requiresRSVP: false }))}
                  style={{
                    ...styles.rsvpCard,
                    borderColor: !formData.requiresRSVP ? '#800000' : '#ddd',
                    backgroundColor: !formData.requiresRSVP ? '#fff5f5' : 'white'
                  }}
                >
                  {!formData.requiresRSVP ? (
                    <FaCheckCircle size={32} color="#800000" />
                  ) : (
                    <FaUserTimes size={32} color="#95a5a6" />
                  )}
                  <h3>Optional Attendance</h3>
                  <p>Open to walk-ins, casual gatherings, lectures</p>
                </button>
              </div>
              
              {formData.requiresRSVP && (
                <div style={styles.rsvpDetails}>
                  <h4 style={styles.rsvpDetailsTitle}>
                    <FaCog size={18} color="#800000" />
                    RSVP Configuration
                  </h4>
                  
                  <div style={styles.grid2}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        RSVP Deadline
                        <span style={styles.badge}>Optional</span>
                      </label>
                      <input
                        type="datetime-local"
                        name="rsvpDeadline"
                        value={formData.rsvpDeadline || ''}
                        onChange={handleChange}
                        min={new Date().toISOString().slice(0, 16)}
                        max={formData.startDate}
                        style={styles.input}
                      />
                      <span style={styles.hint}>When should RSVP close?</span>
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        Cancellation Deadline
                      </label>
                      <select
                        name="cancellationDeadline"
                        value={formData.cancellationDeadline}
                        onChange={handleChange}
                        style={styles.select}
                      >
                        <option value="1">1 day before</option>
                        <option value="2">2 days before</option>
                        <option value="3">3 days before</option>
                        <option value="7">7 days before</option>
                        <option value="14">14 days before</option>
                      </select>
                    </div>
                  </div>
                  
                  <div style={styles.grid2}>
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        Preparation Time
                      </label>
                      <select
                        name="preparationTime"
                        value={formData.preparationTime}
                        onChange={handleChange}
                        style={styles.select}
                      >
                        <option value="1">1 hour before</option>
                        <option value="2">2 hours before</option>
                        <option value="4">4 hours before</option>
                        <option value="12">12 hours before</option>
                        <option value="24">1 day before</option>
                        <option value="48">2 days before</option>
                      </select>
                    </div>
                    
                    <div style={styles.formGroup}>
                      <label style={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          name="allowWalkIn"
                          checked={formData.allowWalkIn}
                          onChange={handleChange}
                          style={styles.checkbox}
                        />
                        <div>
                          <strong>Allow walk-ins after deadline</strong>
                          <span style={styles.optionHint}>Limited resources available</span>
                        </div>
                      </label>
                    </div>
                  </div>
                  
                  <div style={styles.rulesPreview}>
                    <FaBan size={16} color="#800000" />
                    <span>Cancellation blocked after {formData.cancellationDeadline} day(s) before event</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Section 8: Visibility */}
        <div id="visibility" style={styles.section}>
          <div style={styles.sectionHeader} onClick={() => toggleSection('visibility')}>
            <div style={styles.sectionTitle}>
              <FaGlobe size={24} color="#800000" />
              <h2>Visibility</h2>
            </div>
            {expandedSections.visibility ? <FaChevronDown size={20} /> : <FaChevronRight size={20} />}
          </div>
          
          {expandedSections.visibility && (
            <div style={styles.sectionContent}>
              <div style={styles.statusCards}>
                {statusOptions.map(option => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: option.value }))}
                    style={{
                      ...styles.statusCard,
                      backgroundColor: formData.status === option.value ? option.color + '20' : '#f8f9fa',
                      borderColor: formData.status === option.value ? option.color : '#ddd'
                    }}
                  >
                    <span style={{ fontSize: '24px', marginBottom: '10px' }}>{option.icon}</span>
                    <strong style={{ color: option.color }}>{option.label}</strong>
                  </button>
                ))}
              </div>
              
             
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div style={styles.actionButtons}>
          <button
            type="submit"
            disabled={saving}
            style={styles.submitButton}
          >
            {saving ? (
              <>
                <div style={styles.spinnerSmall}></div>
                Creating Event...
              </>
            ) : (
              <>
                <FaSave size={20} />
                Create Event
              </>
            )}
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
      </form>
      
      
    </div>
  );
}

// Styles (unchanged)
const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    backgroundColor: '#f8fafc',
    minHeight: '100vh',
    position: 'relative'
  },
  header: {
    marginBottom: '30px',
    position: 'relative'
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
    transition: 'all 0.2s',
    marginBottom: '20px'
  },
  headerContent: {
    textAlign: 'center',
    marginBottom: '20px'
  },
  title: {
    color: '#800000',
    fontSize: '2.5rem',
    fontWeight: '700',
    marginBottom: '10px',
    letterSpacing: '-0.02em'
  },
  subtitle: {
    color: '#64748b',
    fontSize: '1rem'
  },
  progressBar: {
    width: '100%',
    padding: '10px 0'
  },
  progressSteps: {
    display: 'flex',
    gap: '4px',
    justifyContent: 'center'
  },
  progressStep: {
    width: '40px',
    height: '4px',
    borderRadius: '2px',
    cursor: 'pointer',
    transition: 'background-color 0.3s'
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
  form: {
    background: 'white',
    borderRadius: '16px',
    padding: '30px',
    boxShadow: '0 4px 20px rgba(128,0,0,0.08)'
  },
  sectionNav: {
    display: 'flex',
    gap: '8px',
    marginBottom: '30px',
    flexWrap: 'wrap',
    justifyContent: 'center'
  },
  navButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    border: '1px solid #800000',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  section: {
    marginBottom: '20px',
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e9ecef',
    overflow: 'hidden'
  },
  sectionHeader: {
    padding: '16px 20px',
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
    gap: '12px'
  },
  sectionContent: {
    padding: '20px'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#1e293b',
    fontSize: '14px'
  },
  required: {
    color: '#e74c3c',
    fontSize: '14px'
  },
  badge: {
    background: '#f1f5f9',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: '500',
    color: '#64748b'
  },
  hint: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px'
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'all 0.2s',
    ':focus': {
      borderColor: '#800000',
      boxShadow: '0 0 0 3px rgba(128,0,0,0.1)'
    }
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
    lineHeight: '1.6'
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    background: 'white'
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px'
  },
  inputGroup: {
    display: 'flex',
    gap: '8px'
  },
  generateButton: {
    padding: '12px 20px',
    background: '#800000',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    whiteSpace: 'nowrap'
  },
  charCount: {
    textAlign: 'right',
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px'
  },
  // Media section styles
  bannerPreviewSection: {
    marginBottom: '20px'
  },
  bannerPreviewContainer: {
    position: 'relative',
    marginTop: '10px'
  },
  bannerPreview: {
    width: '100%',
    maxHeight: '250px',
    borderRadius: '12px',
    objectFit: 'cover',
    border: '1px solid #e2e8f0'
  },
  removeImageButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    width: '32px',
    height: '32px',
    background: '#800000',
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  mediaOptions: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  mediaCard: {
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '12px',
    textAlign: 'center',
    border: '1px solid #e9ecef'
  },
  mediaButton: {
    display: 'inline-block',
    padding: '8px 16px',
    background: '#800000',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '10px'
  },
  mediaInput: {
    width: '100%',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    marginTop: '10px'
  },
  fileName: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginTop: '8px'
  },
  aiOptions: {
    marginTop: '10px'
  },
  aiActions: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px'
  },
  aiConfirmButton: {
    flex: 1,
    padding: '8px',
    background: '#800000',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  aiCancelButton: {
    flex: 1,
    padding: '8px',
    background: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  aiTools: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    fontSize: '13px'
  },
  // Duration styles
  durationCard: {
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '8px',
    marginTop: '10px'
  },
  durationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px'
  },
  durationLabel: {
    fontWeight: '500',
    color: '#1e293b'
  },
  durationValue: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#800000'
  },
  durationTabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '16px'
  },
  durationTab: {
    flex: 1,
    padding: '8px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  manualDuration: {
    padding: '16px',
    background: 'white',
    borderRadius: '8px'
  },
  durationInputs: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px'
  },
  durationInputGroup: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  durationInput: {
    width: '80px',
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    textAlign: 'center'
  },
  presetButtons: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap'
  },
  // Location styles
  toggleCard: {
    marginBottom: '20px'
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer'
  },
  toggleCheckbox: {
    display: 'none'
  },
  toggleSwitch: {
    width: '48px',
    height: '24px',
    borderRadius: '12px',
    position: 'relative',
    transition: 'background 0.3s'
  },
  toggleSlider: {
    width: '20px',
    height: '20px',
    background: 'white',
    borderRadius: '50%',
    position: 'absolute',
    top: '2px',
    left: '2px',
    transition: 'transform 0.3s'
  },
  toggleText: {
    fontSize: '14px',
    fontWeight: '500'
  },
  // Category styles
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '8px',
    marginBottom: '16px'
  },
  categoryButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    padding: '12px 8px',
    border: '1px solid',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  categoryIcon: {
    fontSize: '20px'
  },
  facultyGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
    gap: '8px',
    marginBottom: '16px'
  },
  facultyButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px',
    border: '1px solid',
    borderRadius: '8px',
    fontSize: '12px',
    cursor: 'pointer'
  },
  audienceGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '8px',
    padding: '12px',
    background: '#f8f9fa',
    borderRadius: '8px'
  },
  audienceCheckbox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    cursor: 'pointer'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#800000'
  },
  // Capacity styles
  capacityCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  capacityCard: {
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '8px'
  },
  capacityLabel: {
    display: 'block',
    fontSize: '13px',
    color: '#64748b',
    marginBottom: '8px'
  },
  capacityInput: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '600'
  },
  capacityHint: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b',
    marginTop: '4px'
  },
  registrationOptions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  optionLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  optionHint: {
    display: 'block',
    fontSize: '12px',
    color: '#64748b'
  },
  // RSVP styles
  rsvpCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '20px'
  },
  rsvpCard: {
    padding: '20px',
    border: '2px solid',
    borderRadius: '12px',
    background: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  rsvpDetails: {
    marginTop: '20px',
    padding: '20px',
    background: '#fdf5f5',
    borderRadius: '12px'
  },
  rsvpDetailsTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
    color: '#800000'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer'
  },
  rulesPreview: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '20px',
    padding: '12px',
    background: 'white',
    borderRadius: '8px',
    fontSize: '13px'
  },
  // Status styles
  statusCards: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
    gap: '12px',
    marginBottom: '20px'
  },
  statusCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '16px',
    border: '2px solid',
    borderRadius: '12px',
    background: 'white',
    cursor: 'pointer'
  },
  featuredLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    background: '#f8fafc',
    borderRadius: '8px',
    cursor: 'pointer'
  },
  // Action buttons
  actionButtons: {
    display: 'flex',
    gap: '16px',
    marginTop: '40px'
  },
  submitButton: {
    flex: 1,
    padding: '16px',
    background: '#800000',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.3s'
  },
  cancelButton: {
    padding: '16px 30px',
    background: 'transparent',
    color: '#800000',
    border: '1px solid #800000',
    borderRadius: '12px',
    fontSize: '16px',
    cursor: 'pointer'
  },
  // Tips panel
  tipsPanel: {
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    width: '250px',
    padding: '20px',
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    border: '1px solid #80000020'
  },
  tipsTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '15px',
    color: '#800000'
  },
  tipsList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#495057',
    lineHeight: '2'
  },
  // Loading and error states
  loadingContainer: {
    textAlign: 'center',
    padding: '60px'
  },
  spinner: {
    width: '50px',
    height: '50px',
    border: '4px solid #f3f3f3',
    borderTop: '4px solid #800000',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 20px'
  },
  spinnerSmall: {
    width: '20px',
    height: '20px',
    border: '3px solid rgba(255,255,255,0.3)',
    borderTop: '3px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    textAlign: 'center',
    padding: '60px'
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
    padding: '12px 24px',
    background: '#800000',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer'
  }
};

// Add CSS animation for spinner
const styleSheet = document.styleSheets[0];
try {
  styleSheet.insertRule(`
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `, styleSheet.cssRules.length);
} catch (e) {
  console.log('Styles already added');
}

export default CreateEvent;