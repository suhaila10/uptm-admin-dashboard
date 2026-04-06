// src/EditRequest.js - with file upload and Firebase Storage
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, Timestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './firebase';
import { 
  FaCalendarAlt, 
  FaMapMarkerAlt, 
  FaUsers, 
  FaTag, 
  FaArrowLeft,
  FaSave,
  FaUpload,
  FaLink,
  FaImage,
  FaTimes
} from 'react-icons/fa';

function EditRequest() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [originalRequest, setOriginalRequest] = useState(null);
  
  // Banner states
  const [bannerFile, setBannerFile] = useState(null);
  const [bannerPreview, setBannerPreview] = useState('');
  
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

  // Fetch the existing request
  useEffect(() => {
    const fetchRequest = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          navigate('/login');
          return;
        }

        const requestDoc = await getDoc(doc(db, 'event_requests', id));
        
        if (!requestDoc.exists()) {
          setMessage({ type: 'error', text: 'Request not found' });
          setLoading(false);
          return;
        }

        const requestData = requestDoc.data();
        
        // Verify this request belongs to the current user
        if (requestData.requesterId !== user.uid) {
          setMessage({ type: 'error', text: 'You do not have permission to edit this request' });
          setLoading(false);
          return;
        }

        // Only allow editing if status is 'revision_needed'
        if (requestData.status !== 'revision_needed') {
          setMessage({ type: 'error', text: 'This request cannot be edited in its current state' });
          setLoading(false);
          return;
        }

        setOriginalRequest(requestData);

        // Format dates for datetime-local input
        const formatDateForInput = (timestamp) => {
          if (!timestamp) return '';
          const date = timestamp.toDate();
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };

        // Populate form with existing data
        setFormData({
          title: requestData.title || '',
          description: requestData.description || '',
          shortDescription: requestData.shortDescription || '',
          startDate: formatDateForInput(requestData.startDate),
          endDate: formatDateForInput(requestData.endDate),
          venue: requestData.venue || 'UPTM Main Hall',
          room: requestData.room || '',
          isOnline: requestData.isOnline || false,
          meetingLink: requestData.meetingLink || '',
          category: requestData.category || 'workshop',
          faculty: requestData.faculty || 'FCOM',
          targetAudience: requestData.targetAudience || ['students'],
          capacity: requestData.capacity || 30,
          bannerImage: requestData.bannerImage || '',
          additionalNotes: requestData.additionalNotes || ''
        });

        setBannerPreview(requestData.bannerImage || '');

        setLoading(false);
      } catch (error) {
        console.error('Error fetching request:', error);
        setMessage({ type: 'error', text: 'Failed to load request' });
        setLoading(false);
      }
    };

    fetchRequest();
  }, [id, navigate]);

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

  // Submit updated request
  const handleSubmit = async (e) => {
    e.preventDefault();

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

    setSubmitting(true);
    setMessage({ type: '', text: '' });

    try {
      let bannerImageUrl = formData.bannerImage.trim();

      // If a new file was selected, upload it to Firebase Storage
      if (bannerFile) {
        // Create a safe filename
        const timestamp = Date.now();
        const safeFileName = `${timestamp}_${bannerFile.name.replace(/[^a-zA-Z0-9.]/g, '_')}`;
        // Path: event-requests/{userId}/{requestId}/{filename}
        const storageRef = ref(storage, `event-requests/${auth.currentUser.uid}/${id}/${safeFileName}`);

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

      // Update the existing request
      const requestRef = doc(db, 'event_requests', id);
      
      await updateDoc(requestRef, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        shortDescription: formData.shortDescription.trim(),
        
        startDate: Timestamp.fromDate(start),
        endDate: Timestamp.fromDate(end),
        
        venue: formData.venue.trim(),
        room: formData.room.trim(),
        isOnline: formData.isOnline,
        meetingLink: formData.isOnline ? formData.meetingLink.trim() : '',
        
        category: formData.category,
        faculty: formData.faculty,
        targetAudience: formData.targetAudience,
        capacity: parseInt(formData.capacity) || 30,
        
        bannerImage: bannerImageUrl, // use uploaded or existing URL
        additionalNotes: formData.additionalNotes.trim(),
        
        // Reset status to pending for re-review
        status: 'pending',
        updatedAt: Timestamp.now(),
        
        // Keep the revision notes but mark as resolved
        reviewNotes: originalRequest?.reviewNotes 
          ? originalRequest.reviewNotes + '\n\n--- REVISED AND RESUBMITTED ---'
          : '--- REVISED AND RESUBMITTED ---'
      });

      setMessage({ 
        type: 'success', 
        text: '✅ Request updated successfully! It has been sent back for admin review.' 
      });

      // Redirect back to my requests after 2 seconds
      setTimeout(() => {
        navigate('/my-requests');
      }, 2000);

    } catch (error) {
      console.error('Error updating request:', error);
      setMessage({ type: 'error', text: `Failed to update request: ${error.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading request...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <button onClick={() => navigate('/my-requests')} style={styles.backButton}>
        <FaArrowLeft /> Back to My Requests
      </button>

      <h1 style={styles.title}>Edit Event Request</h1>
      
      {originalRequest?.reviewNotes && (
        <div style={styles.feedbackBanner}>
          <strong>Admin Feedback:</strong>
          <p>{originalRequest.reviewNotes}</p>
        </div>
      )}

      {/* Status Messages */}
      {message.text && (
        <div style={{
          ...styles.message,
          background: message.type === 'success' ? '#d4edda' : 
                     message.type === 'error' ? '#f8d7da' : '#fff3cd',
          color: message.type === 'success' ? '#155724' : 
                message.type === 'error' ? '#721c24' : '#856404',
        }}>
          <span>{message.text}</span>
        </div>
      )}

      {/* Edit Form */}
      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Banner Image Section (NEW) */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>Banner Image</h2>
          
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
        </div>

        {/* Event Details */}
        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>Event Details</h2>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Event Title <span style={styles.required}>*</span>
            </label>
            <input
              type="text"
              name="title"
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
              value={formData.description}
              onChange={handleChange}
              rows="4"
              required
              disabled={submitting}
              style={styles.textarea}
            />
          </div>
        </div>

        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>Date & Time</h2>
          
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
        </div>

        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>Location</h2>
          
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
                  value={formData.room}
                  onChange={handleChange}
                  disabled={submitting}
                  style={styles.input}
                />
              </div>
            </div>
          )}
        </div>

        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>Category & Audience</h2>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Event Type</label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              disabled={submitting}
              style={styles.select}
            >
              <option value="workshop">Workshop</option>
              <option value="study_group">Study Group</option>
              <option value="seminar">Seminar</option>
              <option value="competition">Competition</option>
              <option value="social">Social Event</option>
              <option value="club_meeting">Club Meeting</option>
            </select>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Target Audience</label>
            <div style={styles.audienceGroup}>
              <label style={styles.audienceLabel}>
                <input
                  type="checkbox"
                  checked={formData.targetAudience.includes('students')}
                  onChange={() => handleAudienceChange('students')}
                  disabled={submitting}
                  style={styles.checkbox}
                />
                Students
              </label>
              <label style={styles.audienceLabel}>
                <input
                  type="checkbox"
                  checked={formData.targetAudience.includes('lecturers')}
                  onChange={() => handleAudienceChange('lecturers')}
                  disabled={submitting}
                  style={styles.checkbox}
                />
                Lecturers
              </label>
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
              max="100"
              value={formData.capacity}
              onChange={handleChange}
              disabled={submitting}
              style={styles.input}
            />
          </div>
        </div>

        <div style={styles.formSection}>
          <h2 style={styles.sectionTitle}>Additional Information</h2>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>
              Additional Notes for Admin
            </label>
            <textarea
              name="additionalNotes"
              value={formData.additionalNotes}
              onChange={handleChange}
              rows="3"
              disabled={submitting}
              style={styles.textarea}
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div style={styles.buttonGroup}>
          <button
            type="submit"
            disabled={submitting}
            style={styles.submitButton}
          >
            {submitting ? 'Updating...' : 'Update & Resubmit Request'}
          </button>
          
          <button
            type="button"
            onClick={() => navigate('/my-requests')}
            style={styles.cancelButton}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

// Styles
const styles = {
  container: {
    maxWidth: '800px',
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
  feedbackBanner: {
    background: '#fff3cd',
    border: '1px solid #ffeaa7',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px',
    color: '#856404'
  },
  message: {
    padding: '15px',
    marginBottom: '20px',
    borderRadius: '8px',
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
    marginBottom: '20px'
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
  audienceGroup: {
    display: 'flex',
    gap: '20px'
  },
  audienceLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    cursor: 'pointer'
  },
  // Banner media styles
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

export default EditRequest;