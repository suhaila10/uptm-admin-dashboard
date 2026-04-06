// src/EventAttendees.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';
import { 
  FaArrowLeft, 
  FaFileAlt, 
  FaSpinner, 
  FaCertificate,
  FaDownload,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';
import { CertificateGenerator } from './CertificateGenerator';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import './EventAttendees.css';

// Import logos (same as in CertificateGenerator)
import maraCorporationLogo from './images/maracorporation.png';
import maraLogo from './images/mara.png';
import kptmLogo from './images/kptmlogo.png';
import uptmLogo from './images/uptm.png';
import pendidikanLogo from './images/Kementerian_Pendidikan_Malaysia.png';
import madaniLogo from './images/madani.png';
import fcomLogo from './images/fcom.png';

function EventAttendees() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventTitle, setEventTitle] = useState('');
  const [eventData, setEventData] = useState(null);
  const [selectedAttendeeId, setSelectedAttendeeId] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [attendanceMap, setAttendanceMap] = useState({}); // userId -> attendance status

  // Preload images as base64 (same as CertificateGenerator)
  const [imagesLoaded, setImagesLoaded] = useState(false);
  useEffect(() => {
    const loadImagesAsBase64 = async () => {
      try {
        const images = [
          { name: 'pendidikan', path: pendidikanLogo },
          { name: 'maraCorp', path: maraCorporationLogo },
          { name: 'mara', path: maraLogo },
          { name: 'kptm', path: kptmLogo },
          { name: 'uptm', path: uptmLogo },
          { name: 'madani', path: madaniLogo },
          { name: 'fcom', path: fcomLogo }
        ];

        const loadedImages = {};
        for (const img of images) {
          const response = await fetch(img.path);
          const blob = await response.blob();
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          loadedImages[img.name] = base64;
        }
        window.certificateImages = loadedImages;
        setImagesLoaded(true);
      } catch (err) {
        console.error('Error loading images:', err);
        setImagesLoaded(true);
      }
    };
    loadImagesAsBase64();
  }, []);

  useEffect(() => {
    fetchAttendees();
  }, [id]);

  const fetchAttendees = async () => {
    try {
      const eventDoc = await getDoc(doc(db, 'events', id));
      if (!eventDoc.exists()) {
        alert('Event not found');
        navigate('/events');
        return;
      }
      const eventData = eventDoc.data();
      setEventData({ id: eventDoc.id, ...eventData });
      setEventTitle(eventData.title);

      const attendeeIds = eventData.attendees || [];
      if (attendeeIds.length === 0) {
        setAttendees([]);
        setLoading(false);
        return;
      }

      // Fetch all attendees' user data
      const users = [];
      for (const uid of attendeeIds) {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          users.push({ id: uid, ...userDoc.data() });
        } else {
          users.push({ id: uid, name: 'Unknown', email: '', userId: uid });
        }
      }
      setAttendees(users);

      // Fetch attendance records for all attendees
      const attendanceQuery = query(
        collection(db, 'attendance'),
        where('eventId', '==', id)
      );
      const attendanceSnap = await getDocs(attendanceQuery);
      const attMap = {};
      attendanceSnap.forEach(doc => {
        const data = doc.data();
        attMap[data.userId] = data;
      });
      setAttendanceMap(attMap);

    } catch (error) {
      console.error('Error fetching attendees:', error);
      alert('Failed to load attendees.');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Name', 'Email', 'Custom User ID', 'Firebase UID', 'Attendance Status'];
    const rows = attendees.map(a => {
      const att = attendanceMap[a.id];
      const status = att ? att.status : 'Not marked';
      return [
        a.name || a.displayName || '',
        a.email || '',
        a.userId || '',
        a.id,
        status
      ];
    });
    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${eventTitle.replace(/[^a-z0-9]/gi, '_')}_attendees.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Helper: format date
  const formatEventDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  // Generate HTML for a single attendee (mirrors CertificateGenerator's generateHTML)
  // Generate HTML for a single attendee (matches CertificateGenerator exactly)
const generateCertificateHTML = (user, attendanceStatus) => {
  const participantName = user.name || user.displayName || 'Participant';
  const matricNumber = user.matricNumber || user.studentId || '';
  const eventTitle = eventData?.title || 'Event';
  const eventDate = formatEventDate(eventData?.date || eventData?.startDate);
  const eventCode = eventData?.eventCode || 'N/A';
  // Add user-specific suffix to avoid duplicate certificate IDs
  const certificateId = `UPTM/CERT/${eventCode}/${Date.now().toString().slice(-6)}-${user.id.slice(-4)}`;
  const status = attendanceStatus === 'present' ? 'Present' : 'Late';

  const images = window.certificateImages || {};

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>UPTM Certificate - ${participantName}</title>
      <style>
        @page {
          size: A4 landscape;
          margin: 0;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
          background: white;
          font-family: 'Helvetica', 'Arial', sans-serif;
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
        }
        
        .certificate {
          width: 297mm;
          height: 210mm;
          background: white;
          position: relative;
          box-sizing: border-box;
          border: 12px solid #8B0000;
          outline: 2px solid #00347A;
          outline-offset: -4px;
          padding: 2mm 25mm;
          display: flex;
          flex-direction: column;
          line-height: 1.4;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 0;
        }
        
        .left-logos img {
          height: 40px;
          width: auto;
          object-fit: contain;
        }
        
        .right-logos {
          display: flex;
          gap: 20px;
        }
        
        .right-logos img {
          height: 40px;
          width: auto;
          object-fit: contain;
        }
        
        .uptm-section {
          text-align: center;
          margin: 0;
          padding: 0;
          line-height: 0;
        }
        
        .uptm-logo {
          width: 200px;
          height: auto;
          max-height: 200px;
          object-fit: contain;
          margin: 0 auto;
          display: block;
        }
        
        .decoration {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin: 4px 0;
        }
        
        .line {
          width: 120px;
          height: 2px;
          background: #FFD700;
        }
        
        .main-title {
          color: #8B0000;
          font-size: 32px;
          font-weight: bold;
          text-align: center;
          margin: 4px 0;
        }
        
        .subtitle {
          color: #00347A;
          font-size: 18px;
          font-style: italic;
          text-align: center;
          margin: 6px 0 4px;
        }
        
        .name-box {
          background: #FFF9E6;
          border: 2px solid #FFD700;
          border-radius: 50px;
          padding: 8px 40px;
          margin: 8px auto;
          display: inline-block;
          text-align: center;
        }
        
        .name {
          color: #8B0000;
          font-size: 36px;
          font-weight: bold;
          margin: 0;
        }
        
        .matric {
          color: #666;
          font-size: 14px;
          margin: 4px 0 8px;
          text-align: center;
        }
        
        .event-title {
          color: #8B0000;
          font-size: 28px;
          font-weight: bold;
          text-align: center;
          margin: 8px 0;
          padding: 0 30px;
          word-wrap: break-word;
        }
        
        .date {
          color: #8B0000;
          font-size: 20px;
          font-weight: bold;
          text-align: center;
          margin: 8px 0 15mm;
        }
        
        .content {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-start;
          margin-top: 0;
          padding-top: 0;
        }
        
        .footer {
          display: flex;
          justify-content: center;
          margin-top: 10mm;
          position: relative;
        }
        
        .signature {
          text-align: center;
          width: 250px;
        }
        
        .signature-line {
          width: 200px;
          height: 2px;
          background: #8B0000;
          margin: 0 auto 8px;
        }
        
        .signature-name {
          color: #8B0000;
          font-size: 16px;
          font-weight: bold;
          margin: 0;
        }
        
        .signature-title {
          color: #00347A;
          font-size: 14px;
          margin: 2px 0 0;
        }
        
        .fcom-logo {
          position: absolute;
          bottom: 10px;
          right: 25mm;
          width: 80px;
          height: auto;
          object-fit: contain;
        }
        
        .certificate-id {
          color: #999;
          font-size: 10px;
          text-align: center;
          margin-top: 10px;
        }
        
        .event-code {
          color: #999;
          font-size: 10px;
          position: absolute;
          bottom: 10px;
          left: 25mm;
        }
        
        .attendance-status {
          color: #999;
          font-size: 10px;
          position: absolute;
          bottom: 10px;
          right: 120px;
        }
        
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="certificate">
        <div class="header">
          <div class="left-logos">
            <img src="${images.madani || madaniLogo}" alt="Madani">
          </div>
          <div class="right-logos">
            <img src="${images.maraCorp || maraCorporationLogo}" alt="MARA Corp">
            <img src="${images.pendidikan || pendidikanLogo}" alt="Ministry">
            <img src="${images.mara || maraLogo}" alt="MARA">
            <img src="${images.kptm || kptmLogo}" alt="KPTM">
          </div>
        </div>
        
        <div class="uptm-section">
          <img src="${images.uptm || uptmLogo}" class="uptm-logo" alt="UPTM">
        </div>
        
        <div class="content">
          <div class="decoration">
            <div class="line"></div>
            <div class="main-title">CERTIFICATE OF PARTICIPATION</div>
            <div class="line"></div>
          </div>
          
          <div class="subtitle">THIS IS TO CERTIFY THAT</div>
          
          <div style="text-align: center;">
            <div class="name-box">
              <p class="name">${participantName}</p>
            </div>
          </div>
          
          ${matricNumber ? `<p class="matric">Matric No: ${matricNumber}</p>` : ''}
          
          <div class="subtitle">FOR ACTIVE PARTICIPATION IN</div>
          
          <p class="event-title">${eventTitle}</p>
          
          <div class="subtitle">HELD ON</div>
          
          <p class="date">${eventDate}</p>
          
          <div class="footer">
            <div class="signature">
              <div class="signature-line"></div>
              <p class="signature-name">PROF. MADYA DR. SAIFUDDIN BIN HJ. MOHTARAM</p>
              <p class="signature-title">Dean of FCOM</p>
            </div>
          </div>
        </div>
        
        <img src="${images.fcom || fcomLogo}" class="fcom-logo" alt="FCOM">
        
        <div class="certificate-id">Certificate ID: ${certificateId}</div>
        <div class="event-code">Event: ${eventCode}</div>
        <div class="attendance-status">Status: ${status}</div>
      </div>
    </body>
    </html>
  `;
};

  // Bulk download
  const handleBulkDownload = async () => {
    if (!imagesLoaded) {
      alert('Images are still loading. Please wait a moment.');
      return;
    }

    // Filter attendees who have attendance marked as present or late
    const eligible = attendees.filter(a => {
      const att = attendanceMap[a.id];
      return att && (att.status === 'present' || att.status === 'late');
    });

    if (eligible.length === 0) {
      alert('No attendees with marked attendance found.');
      return;
    }

    const confirm = window.confirm(
      `Generate certificates for ${eligible.length} attendees?\n\n` +
      `This will create a ZIP file containing one HTML file per attendee. ` +
      `You can open each HTML file and print/save as PDF.`
    );
    if (!confirm) return;

    setBulkLoading(true);
    setBulkProgress({ current: 0, total: eligible.length });

    const zip = new JSZip();
    const folder = zip.folder(`${eventTitle.replace(/[^a-z0-9]/gi, '_')}_certificates`);

    for (let i = 0; i < eligible.length; i++) {
      const attendee = eligible[i];
      const status = attendanceMap[attendee.id].status;
      const html = generateCertificateHTML(attendee, status);
      const fileName = `${attendee.name.replace(/[^a-z0-9]/gi, '_')}_${attendee.userId || attendee.id}.html`;
      folder.file(fileName, html);
      setBulkProgress({ current: i + 1, total: eligible.length });
      // Small delay to keep UI responsive
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    const content = await zip.generateAsync({ type: 'blob' });
    saveAs(content, `${eventTitle.replace(/[^a-z0-9]/gi, '_')}_certificates.zip`);
    setBulkLoading(false);
  };

  if (loading) {
    return (
      <div className="loading-container">
        <FaSpinner className="spinner" />
        <p>Loading attendees...</p>
      </div>
    );
  }

  return (
    <div className="attendees-page">
      <div className="page-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <FaArrowLeft /> Back
        </button>
        <h1>Registered Attendees for "{eventTitle}"</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={exportToCSV} 
            className="export-button" 
            disabled={attendees.length === 0}
          >
            <FaFileAlt /> Export CSV
          </button>
          <button
            onClick={handleBulkDownload}
            className="bulk-button"
            disabled={bulkLoading || attendees.length === 0}
          >
            {bulkLoading ? (
              <>
                <FaSpinner className="spinner" />
                {bulkProgress.current}/{bulkProgress.total}
              </>
            ) : (
              <>
                <FaDownload /> Bulk Certificates
              </>
            )}
          </button>
        </div>
      </div>

      {attendees.length === 0 ? (
        <p className="no-attendees">No registrations yet.</p>
      ) : (
        <div className="table-container">
          <table className="attendees-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Email</th>
                <th>User ID</th>
                <th>Attendance</th>
                <th>Individual Certificate</th>
              </tr>
            </thead>
            <tbody>
              {attendees.map((att, index) => {
                const attendance = attendanceMap[att.id];
                const status = attendance ? attendance.status : 'not marked';
                const isEligible = attendance && (status === 'present' || status === 'late');
                return (
                  <tr key={att.id}>
                    <td>{index + 1}</td>
                    <td>{att.name || att.displayName || 'N/A'}</td>
                    <td>{att.email || 'N/A'}</td>
                    <td className="user-id">{att.userId || att.id}</td>
                    <td>
                      {attendance ? (
                        <span className={`attendance-badge status-${status}`}>
                          {status === 'present' && <FaCheckCircle style={{ color: '#28a745' }} />}
                          {status === 'late' && <FaCheckCircle style={{ color: '#ffc107' }} />}
                          {status === 'absent' && <FaTimesCircle style={{ color: '#dc3545' }} />}
                          {status}
                        </span>
                      ) : (
                        <span className="attendance-badge status-not-marked">Not marked</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => setSelectedAttendeeId(att.id)}
                        className="action-icon-button"
                        title="Generate certificate"
                        disabled={!isEligible}
                      >
                        <FaCertificate color={isEligible ? '#8B0000' : '#ccc'} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {selectedAttendeeId && eventData && (
        <CertificateGenerator
          eventData={eventData}
          targetUserId={selectedAttendeeId}
          onClose={() => setSelectedAttendeeId(null)}
        />
      )}
    </div>
  );
}

export default EventAttendees;