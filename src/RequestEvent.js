// src/RequestEvent.js - Enhanced with AI tools links and better UI
import React, { useState, useEffect } from 'react';
import { collection, addDoc, Timestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './firebase';
import { useNavigate } from 'react-router-dom';
import { 
  FaCalendarAlt, 
  FaMapMarkerAlt, 
  FaUsers, 
  FaTag, 
  FaImage, 
  FaFileAlt, 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaArrowLeft,
  FaGlobe, 
  FaLink,
  FaPlusCircle,
  FaUpload,
  FaTimes,
  FaClock,
  FaUniversity,
  FaChalkboardTeacher,
  FaGraduationCap,
  FaBuilding,
  FaInfoCircle,
  FaMagic
} from 'react-icons/fa';

function RequestEvent() {
  const navigate = useNavigate();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [existingRequests, setExistingRequests] = useState([]);
  
  // Banner states
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState('');
  
  // Duration calculation
  const [duration, setDuration] = useState({ hours: 0, minutes: 0 });

  // Category options
  const categoryOptions = [
    { value: 'workshop', label: 'Workshop' },
    { value: 'seminar', label: 'Industrial Talk' },
    { value: 'competition', label: 'Competition' },
    { value: 'study_group', label: 'Study Group' },
    { value: 'social', label: 'Social Event'},
    { value: 'club_meeting', label: 'Club Meeting' },
  ];

  // Faculty options
  const facultyOptions = [
    { value: 'FCOM', label: 'Faculty of Computing (FCOM)' },
    { value: 'FABA', label: 'Faculty of Business (FABA)'},
    { value: 'FESSH', label: 'Faculty of Education (FESSH)' },
    { value: 'IPS', label: 'Institute of Professional Studies' },
    { value: 'IGS', label: 'Institute of Graduate Studies' },
    { value: 'CIGLS', label: 'CENTRE OF ISLAMIC, GENERAL AND LANGUAGE STUDIES (CIGLS)' },
    { value: 'GENERAL', label: 'General (All Faculties)' },
  ];

  // Audience options
  const audienceOptions = [
    { value: 'students', label: 'Students' },
    { value: 'lecturers', label: 'Lecturers' },
    { value: 'staff', label: 'Staff' },
    { value: 'alumni', label: 'Alumni' },
  ];

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    shortDescription: '',
    startDate: '',
    endDate: '',
    venue: 'UPTM Main Hall',
    room: '',
    isOnline: false,
    meetingLink: '',
    category: 'workshop',
    faculty: 'FCOM',
    targetAudience: ['students'],
    capacity: 30,
    bannerImage: '',
    additionalNotes: ''
  });

  // Calculate duration when dates change
  useEffect(() => {
    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      const diffMs = end - start;
      if (diffMs > 0) {
        const totalMinutes = Math.round(diffMs / (1000 * 60));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        setDuration({ hours, minutes });
      } else {
        setDuration({ hours: 0, minutes: 0 });
      }
    }
  }, [formData.startDate, formData.endDate]);

  // Check user role and fetch existing requests
  useEffect(() => {
    const initialize = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/login');
          return;
        }
        
        // Get user data from Firestore
        let userDocData = null;
        const usersQuery = query(collection(db, 'users'), where('authUid', '==', user.uid));
        const userSnapshot = await getDocs(usersQuery);
        
        if (!userSnapshot.empty) {
          userDocData = { id: userSnapshot.docs[0].id, ...userSnapshot.docs[0].data() };
        } else {
          const userDocRef = doc(db, 'users', user.uid);
          const userDocSnap = await getDoc(userDocRef);
          if (userDocSnap.exists()) {
            userDocData = { id: userDocSnap.id, ...userDocSnap.data() };
          }
        }
        
        if (!userDocData) {
          setMessage({ 
            type: 'error', 
            text: 'User data not found. Please complete your profile first.' 
          });
          setLoading(false);
          return;
        }
        
        setUserData(userDocData);
        
        // Only students and lecturers can request events
        if (userDocData.role !== 'student' && userDocData.role !== 'lecturer') {
          setMessage({ 
            type: 'error', 
            text: 'Only students and lecturers can request events. Use Create Event if you are an organizer or admin.' 
          });
        }
        
        // Fetch user's existing pending requests
        const requestsQuery = query(
          collection(db, 'event_requests'),
          where('requesterId', '==', user.uid),
          where('status', 'in', ['pending', 'revision_needed'])
        );
        const requestsSnapshot = await getDocs(requestsQuery);
        const requests = requestsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setExistingRequests(requests);
        
      } catch (error) {
        console.error('Error loading user data:', error);
        setMessage({ type: 'error', text: 'Error loading user data: ' + error.message });
      } finally {
        setLoading(false);
      }
    };
    
    initialize();
  }, [navigate]);

  // Handle form changes
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

  // File upload handler
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

  // Remove uploaded image
  const handleRemoveImage = () => {
    setBannerFile(null);
    setBannerPreview('');
    setFormData(prev => ({ ...prev, bannerImage: '' }));
  };

  // Submit request
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userData) {
      setMessage({ type: 'error', text: 'User data not loaded' });
      return;
    }

    // Validate form
    const requiredFields = ['title', 'description', 'shortDescription', 'startDate', 'endDate'];
    const missingFields = requiredFields.filter(field => !formData[field]?.trim());
    
    if (missingFields.length > 0) {
      setMessage({ type: 'error', text: `Please fill all required fields: ${missingFields.join(', ')}` });
      return;
    }

    if (!formData.isOnline && !formData.venue) {
      setMessage({ type: 'error', text: 'Venue is required for physical events' });
      return;
    }

    if (formData.isOnline && !formData.meetingLink) {
      setMessage({ type: 'error', text: 'Meeting link is required for online events' });
      return;
    }

    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (end <= start) {
      setMessage({ type: 'error', text: 'End date must be after start date' });
      return;
    }

    // Check if user already has pending requests (limit to 3 pending)
    if (existingRequests.length >= 3) {
      setMessage({ 
        type: 'error', 
        text: 'You have too many pending requests. Please wait for admin to review your existing requests.' 
      });
      return;
    }

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      let bannerImageUrl = formData.bannerImage.trim();

      // If a new file was selected, upload it to Firebase Storage
      if (bannerFile) {
        const timestamp = Date.now();
        const safeFileName = `${timestamp}_${bannerFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        const storageRef = ref(storage, `event-requests/${auth.currentUser.uid}/${safeFileName}`);

        setMessage({ type: 'info', text: 'Uploading image...' });
        const uploadTask = uploadBytesResumable(storageRef, bannerFile);

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
      
      // Create event request document
      const requestData = {
        // Basic Information
        title: formData.title.trim(),
        description: formData.description.trim(),
        shortDescription: formData.shortDescription.trim(),
        
        // Requester Information
        requesterId: auth.currentUser.uid,
        requesterName: userData.name || auth.currentUser.displayName || 'Unknown',
        requesterEmail: auth.currentUser.email,
        requesterRole: userData.role,
        requesterUserId: userData.userId || userData.studentId || userData.lecturerId || '',
        
        // Event Details
        startDate: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end),
        durationHours: duration.hours,
        durationMinutes: duration.minutes,
        durationDisplay: `${duration.hours}h ${duration.minutes}m`,
        venue: formData.venue.trim(),
        room: formData.room.trim(),
        isOnline: formData.isOnline,
        meetingLink: formData.isOnline ? formData.meetingLink.trim() : '',
        category: formData.category,
        faculty: formData.faculty,
        targetAudience: formData.targetAudience,
        capacity: parseInt(formData.capacity) || 30,
        bannerImage: bannerImageUrl,
        additionalNotes: formData.additionalNotes.trim(),
        
        // Request Status
        status: 'pending',
        submittedAt: Timestamp.now(),
        
        // Tracking
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };
      
      const docRef = await addDoc(collection(db, 'event_requests'), requestData);
      
      setMessage({ 
        type: 'success', 
        text: `✅ Event request submitted successfully! Request ID: ${docRef.id}. Admin will review your request within 1-2 business days.` 
      });
      
      // Clear form
      setFormData({
        title: '',
        description: '',
        shortDescription: '',
        startDate: '',
        endDate: '',
        venue: 'UPTM Main Hall',
        room: '',
        isOnline: false,
        meetingLink: '',
        category: 'workshop',
        faculty: 'FCOM',
        targetAudience: ['students'],
        capacity: 30,
        bannerImage: '',
        additionalNotes: ''
      });
      setBannerFile(null);
      setBannerPreview('');
      
      // Refresh existing requests
      const requestsQuery = query(
        collection(db, 'event_requests'),
        where('requesterId', '==', auth.currentUser.uid),
        where('status', 'in', ['pending', 'revision_needed'])
      );
      const requestsSnapshot = await getDocs(requestsQuery);
      const requests = requestsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setExistingRequests(requests);
      
    } catch (error) {
      console.error('Error submitting request:', error);
      setMessage({ type: 'error', text: `Failed to submit request: ${error.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  // If user is admin or organizer, redirect to Create Event
  if (!loading && userData && (userData.role === 'admin' || userData.role === 'organizer')) {
    return (
      <div style={styles.redirectContainer}>
        <h2>You have event creation permissions</h2>
        <p>As an {userData.role}, you can create events directly without requesting approval.</p>
        <button 
          onClick={() => navigate('/create-event')}
          style={styles.redirectButton}
        >
          Go to Create Event
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button 
          onClick={() => navigate('/student-dashboard')}
          style={styles.backButton}
        >
          <FaArrowLeft size={20} />
          <span>Back to Dashboard</span>
        </button>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Request to Create an Event</h1>
          <p style={styles.subtitle}>
            {userData?.role === 'student' ? '🎓' : '👨‍🏫'} As a {userData?.role}, your request needs admin approval
          </p>
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
        }}>
          {message.type === 'success' ? <FaCheckCircle size={20} /> : <FaExclamationTriangle size={20} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Existing Pending Requests */}
      {existingRequests.length > 0 && (
        <div style={styles.pendingRequests}>
          <h3 style={styles.pendingTitle}>Your Pending Requests</h3>
          <div style={styles.requestList}>
            {existingRequests.map(request => (
              <div key={request.id} style={styles.requestItem}>
                <div style={styles.requestInfo}>
                  <strong>{request.title}</strong>
                  <span style={styles.requestStatus}>Pending Review</span>
                </div>
                <small>Submitted: {request.submittedAt?.toDate().toLocaleDateString()}</small>
              </div>
            ))}
          </div>
          <p style={styles.pendingNote}>
            ⓘ You have {existingRequests.length} pending request(s). Max 3 pending requests allowed.
          </p>
        </div>
      )}

      {/* Request Form */}
      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Banner Image Section */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>
            <FaImage style={styles.sectionIcon} /> Banner Image
          </h2>
          
          {bannerPreview && (
            <div style={styles.bannerPreviewContainer}>
              <img 
                src={bannerPreview} 
                alt="Banner preview" 
                style={styles.bannerPreview}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://via.placeholder.com/800x200/800000/ffffff?text=UPTM+Event+Banner';
                }}
              />
              <button
                type="button"
                onClick={handleRemoveImage}
                style={styles.removeImageButton}
              >
                <FaTimes />
              </button>
            </div>
          )}

          <div style={styles.mediaOptions}>
            {/* File Upload */}
            <div style={styles.mediaCard}>
              <FaUpload size={24} color="#800000" />
              <h4>Upload Image</h4>
              <input
                type="file"
                id="bannerUpload"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
                disabled={submitting}
              />
              <label htmlFor="bannerUpload" style={styles.mediaButton}>
                Choose File
              </label>
              {bannerFile && <span style={styles.fileName}>{bannerFile.name}</span>}
            </div>

            {/* Image URL */}
            <div style={styles.mediaCard}>
              <FaLink size={24} color="#800000" />
              <h4>Image URL</h4>
              <input
                type="url"
                name="bannerImage"
                placeholder="https://example.com/image.jpg"
                value={formData.bannerImage}
                onChange={handleChange}
                disabled={submitting}
                style={styles.mediaInput}
              />
            </div>
          </div>

          {/* 🔹 AI Tools Links (added from CreateEvent) */}
          <div style={styles.aiTools}>
            <span>Popular AI tools:</span>
            <a href="https://www.canva.com/ai-image-generator/" target="_blank" rel="noopener noreferrer">Canva AI</a>
            <a href="https://www.bing.com/images/create" target="_blank" rel="noopener noreferrer">Bing Creator</a>
            <a href="https://ideogram.ai/" target="_blank" rel="noopener noreferrer">Ideogram</a>
          </div>
        </div>

        {/* Event Details */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>
            <FaFileAlt style={styles.sectionIcon} /> Event Details
          </h2>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Event Title <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="title"
              placeholder="e.g., Study Group: Advanced JavaScript"
              value={formData.title}
              onChange={handleChange}
              required
              disabled={submitting}
              style={styles.input}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Short Description <span style={styles.required}>*</span>
            </label>
            <textarea
              name="shortDescription"
              placeholder="Brief description that appears in listings..."
              value={formData.shortDescription}
              onChange={handleChange}
              rows="2"
              maxLength="150"
              required
              disabled={submitting}
              style={styles.textarea}
            />
            <div style={styles.charCount}>
              {formData.shortDescription.length}/150
            </div>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Full Description <span style={styles.required}>*</span>
            </label>
            <textarea
              name="description"
              placeholder="Detailed description of your event..."
              value={formData.description}
              onChange={handleChange}
              rows="4"
              required
              disabled={submitting}
              style={styles.textarea}
            />
          </div>
        </div>

        {/* Date & Time */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>
            <FaCalendarAlt style={styles.sectionIcon} /> Date & Time
          </h2>
          
          <div style={styles.row}>
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
                disabled={submitting}
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
                disabled={submitting}
                style={styles.input}
              />
            </div>
          </div>

          {/* Duration Display */}
          {formData.startDate && formData.endDate && duration.hours + duration.minutes > 0 && (
            <div style={styles.durationBox}>
              <FaClock style={{ marginRight: '8px', color: '#800000' }} />
              <span>Duration: <strong>{duration.hours}h {duration.minutes}m</strong></span>
            </div>
          )}
        </div>

        {/* Location */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>
            <FaMapMarkerAlt style={styles.sectionIcon} /> Location
          </h2>
          
          <div style={styles.toggleGroup}>
            <label style={styles.toggleLabel}>
              <input
                type="checkbox"
                name="isOnline"
                checked={formData.isOnline}
                onChange={handleChange}
                disabled={submitting}
                style={styles.checkbox}
              />
              This is an online event
            </label>
          </div>
          
          {formData.isOnline ? (
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
                disabled={submitting}
                style={styles.input}
              />
            </div>
          ) : (
            <div style={styles.row}>
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
                  disabled={submitting}
                  style={styles.input}
                />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Room
                </label>
                <input
                  type="text"
                  name="room"
                  placeholder="e.g., Block C, Room 301"
                  value={formData.room}
                  onChange={handleChange}
                  disabled={submitting}
                  style={styles.input}
                />
              </div>
            </div>
          )}
        </div>

        {/* Category & Audience */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>
            <FaTag style={styles.sectionIcon} /> Category & Audience
          </h2>
          
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
            <select
              name="faculty"
              value={formData.faculty}
              onChange={handleChange}
              disabled={submitting}
              style={styles.select}
            >
              {facultyOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.icon} {option.label}
                </option>
              ))}
            </select>
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
                    disabled={submitting}
                    style={styles.checkbox}
                  />
                  <span>{option.icon} {option.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Expected Participants
            </label>
            <input
              type="number"
              name="capacity"
              min="1"
              max="500"
              value={formData.capacity}
              onChange={handleChange}
              disabled={submitting}
              style={styles.input}
            />
          </div>
        </div>

        {/* Additional Information */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>
            <FaInfoCircle style={styles.sectionIcon} /> Additional Information
          </h2>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Additional Notes for Admin
            </label>
            <textarea
              name="additionalNotes"
              placeholder="Any special requirements, equipment needed, or notes for the admin..."
              value={formData.additionalNotes}
              onChange={handleChange}
              rows="3"
              disabled={submitting}
              style={styles.textarea}
            />
          </div>
        </div>

        {/* Submission Guidelines */}
        <div style={styles.guidelines}>
          <h3 style={styles.guidelinesTitle}>Before Submitting:</h3>
          <ul style={styles.guidelinesList}>
            <li>✓ Ensure all details are accurate</li>
            <li>✓ Check date and time conflicts</li>
            <li>✓ Verify venue availability</li>
            <li>✓ Admin will review within 1-2 business days</li>
            <li>✓ You'll be notified when approved</li>
            <li>✓ You can track your request status in your dashboard</li>
          </ul>
        </div>

        {/* Submit Buttons */}
        <div style={styles.buttonGroup}>
          <button
            type="submit"
            disabled={submitting || existingRequests.length >= 3}
            style={{
              ...styles.submitButton,
              opacity: (submitting || existingRequests.length >= 3) ? 0.6 : 1,
              cursor: (submitting || existingRequests.length >= 3) ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Submitting Request...' : 'Submit Event Request'}
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/student-dashboard')}
            style={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// Styles (updated with aiTools)
const styles = {
  container: {
    maxWidth: '800px',
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
  headerContent: {
    textAlign: 'center'
  },
  title: {
    color: '#800000',
    fontSize: '2rem',
    marginBottom: '10px'
  },
  subtitle: {
    color: '#666',
    fontSize: '1rem'
  },
  message: {
    padding: '15px',
    marginBottom: '20px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  pendingRequests: {
    background: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px'
  },
  pendingTitle: {
    color: '#856404',
    marginBottom: '10px',
    fontSize: '1rem'
  },
  requestList: {
    marginBottom: '10px'
  },
  requestItem: {
    background: 'white',
    padding: '10px',
    borderRadius: '4px',
    marginBottom: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  requestStatus: {
    background: '#ffc107',
    color: '#333',
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    marginLeft: '10px'
  },
  pendingNote: {
    fontSize: '12px',
    color: '#856404',
    marginTop: '5px'
  },
  form: {
    background: 'white',
    padding: '30px',
    borderRadius: '12px',
    boxShadow: '0 2px 10px rgba(128,0,0,0.1)'
  },
  formSection: {
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '1px solid #e9ecef'
  },
  sectionTitle: {
    color: '#800000',
    fontSize: '1.2rem',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  sectionIcon: {
    fontSize: '1.2rem'
  },
  formGroup: {
    marginBottom: '15px',
    flex: 1
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    fontWeight: '500',
    color: '#333'
  },
  required: {
    color: '#e74c3c'
  },
  input: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px'
  },
  textarea: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    resize: 'vertical'
  },
  select: {
    width: '100%',
    padding: '10px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    background: 'white'
  },
  row: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px'
  },
  charCount: {
    textAlign: 'right',
    fontSize: '12px',
    color: '#666',
    marginTop: '4px'
  },
  toggleGroup: {
    marginBottom: '15px'
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#800000'
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
    transition: 'all 0.2s',
    background: '#f8f9fa',
    color: '#800000'
  },
  categoryIcon: {
    fontSize: '20px'
  },
  // Audience grid
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
  // Duration box
  durationBox: {
    marginTop: '10px',
    padding: '10px',
    background: '#f8f9fa',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px'
  },
  // Media styles
  bannerPreviewContainer: {
    position: 'relative',
    marginBottom: '20px'
  },
  bannerPreview: {
    width: '100%',
    maxHeight: '200px',
    borderRadius: '8px',
    objectFit: 'cover',
    border: '1px solid #ddd'
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
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '10px'
  },
  mediaCard: {
    padding: '15px',
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
    fontSize: '13px',
    cursor: 'pointer',
    marginTop: '8px'
  },
  mediaInput: {
    width: '100%',
    padding: '6px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '12px',
    marginTop: '8px'
  },
  fileName: {
    display: 'block',
    fontSize: '12px',
    color: '#666',
    marginTop: '5px'
  },
  // AI Tools Links (new)
  aiTools: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    fontSize: '13px',
    marginTop: '10px'
  },
  guidelines: {
    background: '#f8f9fa',
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  guidelinesTitle: {
    color: '#800000',
    marginBottom: '10px',
    fontSize: '1rem'
  },
  guidelinesList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#666',
    lineHeight: '1.8'
  },
  buttonGroup: {
    display: 'flex',
    gap: '15px',
    marginTop: '20px'
  },
  submitButton: {
    flex: 2,
    padding: '12px',
    background: '#800000',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '16px',
    fontWeight: '500',
    cursor: 'pointer'
  },
  cancelButton: {
    flex: 1,
    padding: '12px',
    background: 'white',
    color: '#800000',
    border: '1px solid #800000',
    borderRadius: '6px',
    fontSize: '16px',
    cursor: 'pointer'
  },
  redirectContainer: {
    textAlign: 'center',
    padding: '60px 20px',
    maxWidth: '500px',
    margin: '0 auto'
  },
  redirectButton: {
    padding: '12px 24px',
    background: '#800000',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    marginTop: '20px'
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

export default RequestEvent;