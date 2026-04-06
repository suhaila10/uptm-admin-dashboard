import React, { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { 
  doc, 
  getDoc, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { FaQrcode, FaCamera, FaCheckCircle, FaTimes, FaLock, FaGlobe, FaPrint } from 'react-icons/fa';

function AttendanceScanner({ eventId, event, onScanSuccess, onScanError, disabled }) {
  const [scanResult, setScanResult] = useState('');
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [eventDetails, setEventDetails] = useState(event || null);
  const [loading, setLoading] = useState(!event);

  // QR Code Value
  const staticQRValue = `EVENT:${eventId}:${event?.eventCode || 'STATIC'}:${eventId.substring(0, 8)}`;

  // Fetch event details
  useEffect(() => {
    if (!event && eventId) {
      const fetchEventDetails = async () => {
        try {
          const eventDoc = await getDoc(doc(db, 'events', eventId));
          if (eventDoc.exists()) {
            setEventDetails(eventDoc.data());
          }
        } catch (error) {
          console.error('Error fetching event:', error);
        } finally {
          setLoading(false);
        }
      };
      
      fetchEventDetails();
    } else {
      setLoading(false);
    }
  }, [eventId, event]);

  const checkAttendancePermission = async (userId) => {
    if (!eventDetails) return false;

    if (!eventDetails.requiresRSVP) {
      return true;
    }

    if (eventDetails.requiresRSVP) {
      const userRSVPd = eventDetails.attendees?.includes(userId) || false;
      
      if (!userRSVPd) {
        setScanResult('❌ This event requires RSVP. User has not RSVP\'d.');
        return false;
      }
      return true;
    }

    return false;
  };

  const markAttendance = async (userId, method = 'qr') => {
    if (!userId || !eventDetails || disabled) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        setScanResult(`❌ User ${userId} not found`);
        if (onScanError) onScanError(`User not found: ${userId}`);
        return;
      }

      const userData = userDoc.data();

      const hasPermission = await checkAttendancePermission(userId);
      if (!hasPermission) {
        if (onScanError) onScanError('RSVP required for this event');
        return;
      }

      const attendanceRef = doc(db, 'attendance', `${eventId}_${userId}`);
      
      const existingAttendance = await getDoc(attendanceRef);
      if (existingAttendance.exists()) {
        setScanResult(`⚠️ ${userData.name} already marked as ${existingAttendance.data().status}`);
        return;
      }

      await setDoc(attendanceRef, {
        eventId,
        userId,
        userName: userData.name || userData.displayName || 'Unknown',
        userEmail: userData.email || 'N/A',
        userMatric: userData.matricNumber || userData.studentId || 'N/A',
        timestamp: serverTimestamp(),
        status: 'present',
        method: method,
        markedBy: auth.currentUser?.uid || 'system',
        markedByName: auth.currentUser?.displayName || auth.currentUser?.email || 'Organizer',
        eventType: eventDetails.requiresRSVP ? 'rsvp_required' : 'open_event'
      });

      setScanResult(`✅ Attendance recorded for ${userData.name || userData.displayName}`);
      setLastScan({
        userId,
        userName: userData.name || userData.displayName,
        matric: userData.matricNumber || userData.studentId || 'N/A',
        time: new Date().toLocaleTimeString()
      });
      
      if (onScanSuccess) onScanSuccess(userId);
      
      setTimeout(() => setScanResult(''), 5000);
      
    } catch (error) {
      console.error('Error recording attendance:', error);
      setScanResult('❌ Error recording attendance');
      if (onScanError) onScanError(error.message);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualInput.trim()) {
      setScanResult('❌ Please enter a User ID');
      return;
    }
    
    setScanning(true);
    setTimeout(() => {
      markAttendance(manualInput.trim(), 'manual');
      setManualInput('');
      setScanning(false);
    }, 500);
  };

  const printQRCode = () => {
  const qrElement = document.querySelector('.qr-code-svg');
  if (!qrElement) {
    alert('QR Code not ready');
    return;
  }

  const svgData = new XMLSerializer().serializeToString(qrElement);

  const eventName = eventDetails?.title || 'Event';
  const eventCode = eventDetails?.eventCode || 'N/A';
  const date = eventDetails?.date?.toDate?.()
    ? new Date(eventDetails.date.toDate()).toLocaleDateString()
    : eventDetails?.startDate?.toDate?.()
      ? new Date(eventDetails.startDate.toDate()).toLocaleDateString()
      : 'N/A';
  const venue = eventDetails?.venue || 'N/A';
  const requiresRSVP = eventDetails?.requiresRSVP || false;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to print QR code');
    return;
  }

  printWindow.document.write(`
    <html>
      <head>
        <title>Print QR Code - ${eventName}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 40px;
            background: white;
            margin: 0;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            padding: 30px;
            border: 2px solid #2c3e50;
            border-radius: 20px;
            background: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          }
          h1 {
            color: #2c3e50;
            margin-bottom: 10px;
            font-size: 28px;
          }
          .event-details {
            margin: 20px 0;
            color: #666;
            text-align: left;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 10px;
            border-left: 4px solid #3498db;
          }
          .event-details p {
            margin: 8px 0;
            font-size: 16px;
          }
          .event-code-large {
            margin: 15px 0;
            padding: 20px;
            background: #2c3e50;
            border-radius: 12px;
            text-align: center;
          }
          .event-code-large .label {
            font-size: 14px;
            color: #ecf0f1;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: 10px;
          }
          .event-code-large .code {
            font-size: 48px;
            font-weight: bold;
            color: #f1c40f;
            font-family: monospace;
            letter-spacing: 4px;
          }
          .qr-container {
            margin: 30px 0;
            padding: 25px;
            background: white;
            border: 2px dashed #e9ecef;
            border-radius: 15px;
            display: flex;
            justify-content: center;
          }
          .qr-code {
            width: 300px;
            height: 300px;
          }
          .qr-code svg {
            width: 100%;
            height: 100%;
          }
          .instructions {
            margin-top: 25px;
            color: #27ae60;
            font-weight: bold;
            font-size: 18px;
            padding: 15px;
            background: #d4edda;
            border-radius: 8px;
          }
          .attendance-type {
            display: inline-block;
            padding: 8px 20px;
            background: ${requiresRSVP ? '#f1c40f' : '#2ecc71'};
            color: white;
            border-radius: 25px;
            font-size: 16px;
            font-weight: bold;
            margin: 15px 0;
          }
          .warning {
            color: ${requiresRSVP ? '#e74c3c' : '#27ae60'};
            font-size: 14px;
            margin-top: 15px;
            font-weight: 500;
          }
          .footer {
            margin-top: 30px;
            color: #999;
            font-size: 12px;
          }
          @media print {
            body { padding: 20px; }
            .container { box-shadow: none; border: 2px solid #000; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🎟️ Event Attendance QR Code</h1>
          <div class="attendance-type">
            ${requiresRSVP ? '🔒 RSVP REQUIRED' : '🌐 OPEN EVENT'}
          </div>

          <!-- Large event code display -->
          <div class="event-code-large">
            <div class="label">EVENT CODE</div>
            <div class="code">${eventCode}</div>
          </div>

          <div class="event-details">
            <p><strong>📌 Event:</strong> ${eventName}</p>
            <p><strong>📅 Date:</strong> ${date}</p>
            <p><strong>📍 Venue:</strong> ${venue}</p>
          </div>

          <div class="qr-container">
            <div class="qr-code">
              ${svgData}
            </div>
          </div>

          <div class="instructions">
            ⚡ SCAN THIS QR CODE AT THE EVENT ENTRANCE
          </div>

          <div class="warning">
            ${requiresRSVP
              ? '⚠️ IMPORTANT: Only students who have RSVP\'d can scan this code'
              : '✅ All students can scan this code (RSVP optional)'}
          </div>

          <div class="footer">
            Generated on ${new Date().toLocaleString()}<br>
            ⭐ This QR code is PERMANENT - you can reuse it for the entire event
          </div>

          <div class="no-print" style="margin-top: 20px;">
            <button onclick="window.print()" style="
              padding: 12px 30px;
              background: #3498db;
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              cursor: pointer;
            ">
              🖨️ Print QR Code
            </button>
          </div>
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
};

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading event details...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>
          <FaQrcode style={{ marginRight: '10px' }} />
          Attendance QR Code
        </h3>
        <div style={styles.status}>
          <span style={{
            ...styles.eventType,
            background: eventDetails?.requiresRSVP ? '#f1c40f' : '#2ecc71'
          }}>
            {eventDetails?.requiresRSVP ? (
              <><FaLock /> RSVP Required</>
            ) : (
              <><FaGlobe /> Open Event</>
            )}
          </span>
        </div>
      </div>

      <div style={styles.content}>
        {/* Static QR Code - Never Changes */}
        <div style={styles.qrSection}>
          <div style={styles.qrContainer}>
            <div style={styles.qrWrapper}>
              <QRCode 
                value={staticQRValue}
                size={250}
                level="H"
                bgColor="white"
                fgColor="#2c3e50"
                className="qr-code-svg"
                style={{ 
                  padding: '15px', 
                  background: 'white',
                  border: '2px solid #e9ecef',
                  borderRadius: '10px'
                }}
              />
            </div>
            
            <div style={styles.qrInfo}>
              <p style={styles.qrTitle}>
                <strong>Event:</strong> {eventDetails?.title || 'N/A'}
              </p>
              <p style={styles.qrCode}>
                <strong>Code:</strong> {eventDetails?.eventCode || 'N/A'}
              </p>
              <p style={styles.qrNote}>
                {eventDetails?.requiresRSVP 
                  ? '🔒 Only RSVP\'d students can scan this QR code' 
                  : '🌐 All students can scan this QR code'}
              </p>
              <p style={styles.qrPermanent}>
                ⭐ This QR code is <strong>permanent</strong> - you can print it, share it, or display it on screen
              </p>
            </div>

            {/* Print Button Only */}
            <div style={styles.qrActions}>
              <button 
                onClick={printQRCode}
                style={styles.printButton}
                disabled={disabled}
              >
                <FaPrint style={{ marginRight: '8px' }} />
                Print QR Code
              </button>
            </div>
          </div>
        </div>

        
        

        {/* Scan Results */}
        {scanResult && (
          <div style={{
            ...styles.resultMessage,
            background: scanResult.includes('✅') ? '#d4edda' : 
                       scanResult.includes('⚠️') ? '#fff3cd' : '#f8d7da',
            color: scanResult.includes('✅') ? '#155724' : 
                   scanResult.includes('⚠️') ? '#856404' : '#721c24'
          }}>
            {scanResult.includes('✅') && <FaCheckCircle style={{ marginRight: '10px' }} />}
            {scanResult.includes('⚠️') && <FaTimes style={{ marginRight: '10px' }} />}
            {scanResult.includes('❌') && <FaTimes style={{ marginRight: '10px' }} />}
            <span>{scanResult}</span>
          </div>
        )}

        {/* Last Scan Info */}
        {lastScan && (
          <div style={styles.lastScan}>
            <h5>Last Scan:</h5>
            <div style={styles.lastScanInfo}>
              <div><strong>Name:</strong> {lastScan.userName}</div>
              <div><strong>Matric:</strong> {lastScan.matric}</div>
              <div><strong>Time:</strong> {lastScan.time}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: {
    background: 'white',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  },
  header: {
    background: '#2c3e50',
    color: 'white',
    padding: '15px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center'
  },
  status: {
    fontSize: '12px'
  },
  eventType: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600'
  },
  content: {
    padding: '25px'
  },
  loadingContainer: {
    padding: '40px',
    textAlign: 'center'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #f3f3f3',
    borderTop: '3px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    margin: '0 auto 15px'
  },
  spinnerSmall: {
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '8px'
  },
  qrSection: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '25px'
  },
  qrContainer: {
    textAlign: 'center',
    maxWidth: '400px',
    width: '100%'
  },
  qrWrapper: {
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '12px',
    marginBottom: '15px'
  },
  qrInfo: {
    marginBottom: '20px',
    padding: '15px',
    background: '#f8f9fa',
    borderRadius: '8px'
  },
  qrTitle: {
    fontSize: '16px',
    color: '#2c3e50',
    margin: '5px 0'
  },
  qrCode: {
    fontSize: '14px',
    color: '#7f8c8d',
    margin: '5px 0'
  },
  qrNote: {
    fontSize: '14px',
    fontWeight: '500',
    margin: '10px 0 5px',
    padding: '8px',
    background: '#e7f5ff',
    borderRadius: '4px',
    color: '#004085'
  },
  qrPermanent: {
    fontSize: '13px',
    color: '#27ae60',
    marginTop: '10px',
    padding: '8px',
    background: '#d4edda',
    borderRadius: '4px'
  },
  qrActions: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px',
    justifyContent: 'center'
  },
  printButton: {
    padding: '12px 30px',
    background: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    minWidth: '200px'
  },
  controls: {
    marginBottom: '20px'
  },
  manualToggle: {
    width: '100%',
    padding: '15px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease'
  },
  manualSection: {
    padding: '20px',
    background: '#f8f9fa',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  form: {
    display: 'flex',
    gap: '10px',
    marginTop: '15px'
  },
  input: {
    flex: 1,
    padding: '15px',
    border: '2px solid #e9ecef',
    borderRadius: '6px',
    fontSize: '16px',
    transition: 'border-color 0.3s'
  },
  submitButton: {
    padding: '15px 25px',
    background: '#28a745',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '150px',
    transition: 'all 0.3s ease'
  },
  resultMessage: {
    padding: '15px',
    borderRadius: '8px',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '14px'
  },
  lastScan: {
    padding: '15px',
    background: '#e9ecef',
    borderRadius: '8px',
    fontSize: '14px'
  },
  lastScanInfo: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '10px',
    marginTop: '10px'
  }
};

// Add CSS animation
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  button:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  }
  
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  input:focus {
    outline: none;
    border-color: #3498db;
  }
`;
document.head.appendChild(styleSheet);

export default AttendanceScanner;