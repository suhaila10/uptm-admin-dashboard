// Add this to your Firebase setup or create a new file: src/firebase/collections.js

// Collection structure for event requests
const eventRequestSchema = {
  // Basic Information
  title: '',
  description: '',
  shortDescription: '',
  eventCode: '', // Auto-generated when approved
  
  // Requester Information
  requesterId: '', // User's auth UID
  requesterName: '',
  requesterEmail: '',
  requesterRole: '', // 'student' or 'lecturer'
  requesterUserId: '', // Their Student/Lecturer ID (e.g., AM2408016647)
  
  // Event Details (same as regular event)
  startDate: null, // Timestamp
  endDate: null,
  duration: 0,
  venue: '',
  room: '',
  isOnline: false,
  meetingLink: '',
  category: '',
  faculty: '',
  targetAudience: [],
  capacity: 0,
  bannerImage: '',
  
  // Request Status
  status: 'pending', // 'pending', 'approved', 'rejected', 'revision_needed'
  submittedAt: null, // Timestamp
  reviewedAt: null, // Timestamp
  reviewedBy: '', // Admin's UID who reviewed
  reviewNotes: '', // Admin's feedback if rejected/revision needed
  
  // If approved
  approvedEventId: '', // Reference to the created event
  approvedAt: null, // Timestamp
  
  // Tracking
  createdAt: null,
  updatedAt: null
};