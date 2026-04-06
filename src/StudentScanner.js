// src/StudentScanner.js - COMPLETE FIXED VERSION
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, arrayUnion } from 'firebase/firestore';
import { db, auth } from './firebase';
import { 
  FaQrcode, 
  FaCamera, 
  FaCheckCircle, 
  FaTimes, 
  FaArrowLeft,
  FaSpinner,
  FaInfoCircle,
  FaExclamationTriangle
} from 'react-icons/fa';

function StudentScanner() {
  const [scanResult, setScanResult] = useState('');
  const [scanning, setScanning] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraPermission, setCameraPermission] = useState(null);
  const scannerRef = useRef(null);
  const qrReaderRef = useRef(null);
  const navigate = useNavigate();
  const { eventId } = useParams();

  // Initialize scanner when component mounts
  useEffect(() => {
    return () => {
      // Clean up scanner on unmount
      if (scannerRef.current) {
        scannerRef.current.clear();
        scannerRef.current = null;
      }
    };
  }, []);

  const startScanner = async () => {
    if (scanning) return;
    
    try {
      // Check camera permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission(true);
      
      setScanning(true);
      setScanResult('');
      setAttendanceStatus(null);
      
      // Dynamically import the scanner to avoid SSR issues
      const { Html5QrcodeScanner } = await import('html5-qrcode');
      
      // Wait for next render cycle to ensure DOM is ready
      setTimeout(() => {
        if (!qrReaderRef.current) return;
        
        const scanner = new Html5QrcodeScanner('qr-reader', {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          disableFlip: false,
          showTorchButtonIfSupported: true,
          showZoomSliderIfSupported: true,
          defaultZoomValueIfSupported: 2,
        }, false);
        
        scannerRef.current = scanner;
        
        const onScanSuccess = (decodedText) => {
          scanner.clear();
          scannerRef.current = null;
          setScanning(false);
          processQRCode(decodedText);
        };
        
        const onScanFailure = (error) => {
          // Optional: Handle scan failure
          console.log('Scan error:', error);
        };
        
        scanner.render(onScanSuccess, onScanFailure);
      }, 100);
      
    } catch (error) {
      console.error('Camera error:', error);
      setCameraPermission(false);
      setScanResult('❌ Camera access denied. Please allow camera permissions.');
    }
  };

  const processQRCode = async (qrData) => {
    setLoading(true);
    
    try {
      // Parse QR code data
      const parts = qrData.split(':');
      
      if (parts.length !== 3 || parts[0] !== 'ATTEND') {
        setScanResult('❌ Invalid QR code format');
        setLoading(false);
        return;
      }

      const scannedEventId = parts[1];
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        setScanResult('❌ Please login first');
        navigate('/login');
        return;
      }

      // Check if user exists
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (!userDoc.exists()) {
        setScanResult('❌ User not found');
        return;
      }

      const userData = userDoc.data();
      
      // Check event exists
      const eventDoc = await getDoc(doc(db, 'events', scannedEventId));
      if (!eventDoc.exists()) {
        setScanResult('❌ Event not found');
        return;
      }

      const eventData = eventDoc.data();
      
      // Check if already registered
      if (!eventData.attendees?.includes(userId)) {
        setScanResult(`❌ You are not registered for: ${eventData.title}`);
        return;
      }

      // Check if already attended
      const attendanceRef = doc(db, 'attendance', `${scannedEventId}_${userId}`);
      const existingAttendance = await getDoc(attendanceRef);
      
      if (existingAttendance.exists()) {
        const existingData = existingAttendance.data();
        setAttendanceStatus({
          status: existingData.status,
          timestamp: existingData.timestamp?.toDate().toLocaleString(),
          eventTitle: eventData.title
        });
        setScanResult(`⚠️ You already marked attendance for: ${eventData.title}`);
        return;
      }

      // Mark attendance
      await setDoc(attendanceRef, {
        eventId: scannedEventId,
        userId,
        userName: userData.name,
        userEmail: userData.email,
        timestamp: serverTimestamp(),
        status: 'present',
        method: 'qr_scan',
        scannedAt: new Date().toISOString()
      });

      // Update event attended count
      await updateDoc(doc(db, 'events', scannedEventId), {
        attended: arrayUnion(userId),
        attendedCount: (eventData.attendedCount || 0) + 1
      });

      setAttendanceStatus({
        status: 'present',
        timestamp: new Date().toLocaleString(),
        eventTitle: eventData.title
      });
      
      setScanResult(`✅ Attendance marked for: ${eventData.title}`);
      
    } catch (error) {
      console.error('Error processing QR code:', error);
      setScanResult('❌ Error processing QR code');
    } finally {
      setLoading(false);
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setScanning(false);
  };

  const checkCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermission(true);
      startScanner();
    } catch (error) {
      setCameraPermission(false);
      setScanResult('❌ Please enable camera permissions in your browser settings.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button 
          onClick={() => navigate(-1)}
          style={styles.backButton}
        >
          <FaArrowLeft style={{ marginRight: '8px' }} />
          Back
        </button>
        <h2 style={styles.title}>
          <FaQrcode style={{ marginRight: '10px' }} />
          QR Code Scanner
        </h2>
        <div style={{ width: '80px' }}></div>
      </div>

      <div style={styles.content}>
        {/* Scanner Section */}
        <div style={styles.scannerSection}>
          <h3 style={styles.sectionTitle}>Scan Event QR Code</h3>
          <p style={styles.instructions}>
            Point your camera at the event's QR code to mark your attendance
          </p>

          <div style={styles.scannerContainer}>
            {cameraPermission === false && (
              <div style={styles.permissionError}>
                <FaExclamationTriangle size={48} color="#e74c3c" />
                <h4>Camera Access Required</h4>
                <p>Please enable camera permissions to use the scanner</p>
                <button 
                  onClick={checkCameraPermission}
                  style={styles.permissionButton}
                >
                  Request Camera Access
                </button>
              </div>
            )}

            {!scanning && cameraPermission !== false && (
              <div style={styles.scannerPlaceholder}>
                <div style={styles.cameraIcon}>
                  <FaCamera size={64} color="#3498db" />
                </div>
                <p>Ready to scan</p>
                <button 
                  onClick={startScanner}
                  style={styles.startButton}
                  disabled={loading}
                >
                  Start Scanner
                </button>
              </div>
            )}

            {scanning && (
              <div 
                ref={qrReaderRef}
                id="qr-reader" 
                style={styles.qrReader}
              ></div>
            )}
          </div>

          {/* Scanner Controls */}
          <div style={styles.controls}>
            {scanning && (
              <button 
                onClick={stopScanner}
                style={styles.stopButton}
              >
                Stop Scanner
              </button>
            )}
            
            {!scanning && cameraPermission !== false && (
              <button 
                onClick={startScanner}
                style={styles.restartButton}
              >
                Restart Scanner
              </button>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div style={styles.resultsSection}>
          <h3 style={styles.sectionTitle}>Scan Results</h3>
          
          {loading && (
            <div style={styles.loading}>
              <FaSpinner style={{ 
                animation: 'spin 1s linear infinite', 
                fontSize: '24px',
                marginRight: '10px'
              }} />
              <p>Processing QR code...</p>
            </div>
          )}

          {scanResult && !loading && (
            <div style={{
              ...styles.resultCard,
              background: scanResult.includes('✅') ? '#d4edda' : 
                         scanResult.includes('⚠️') ? '#fff3cd' : '#f8d7da',
              border: scanResult.includes('✅') ? '1px solid #c3e6cb' :
                     scanResult.includes('⚠️') ? '1px solid #ffeaa7' : '1px solid #f5c6cb'
            }}>
              <div style={styles.resultHeader}>
                {scanResult.includes('✅') && <FaCheckCircle style={styles.successIcon} />}
                {scanResult.includes('⚠️') && <FaInfoCircle style={styles.warningIcon} />}
                {scanResult.includes('❌') && <FaTimes style={styles.errorIcon} />}
                <h4>Scan Result</h4>
              </div>
              <p style={styles.resultText}>{scanResult}</p>
              
              {attendanceStatus && (
                <div style={styles.attendanceDetails}>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Event:</span>
                    <span style={styles.detailValue}>{attendanceStatus.eventTitle}</span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Status:</span>
                    <span style={{
                      ...styles.statusBadge,
                      background: attendanceStatus.status === 'present' ? '#28a745' : '#dc3545'
                    }}>
                      {attendanceStatus.status.toUpperCase()}
                    </span>
                  </div>
                  <div style={styles.detailRow}>
                    <span style={styles.detailLabel}>Time:</span>
                    <span style={styles.detailValue}>{attendanceStatus.timestamp}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div style={styles.instructionsCard}>
            <h4><FaInfoCircle style={{ marginRight: '8px' }} /> How to use:</h4>
            <ol style={styles.instructionsList}>
              <li>Click "Start Scanner" to activate your camera</li>
              <li>Point camera at the event's QR code</li>
              <li>Hold steady until scanner detects the code</li>
              <li>Attendance will be marked automatically</li>
              <li>Click "Stop Scanner" when done</li>
            </ol>
            
            <div style={styles.tips}>
              <h5><FaCamera style={{ marginRight: '8px' }} /> Tips:</h5>
              <ul>
                <li>Ensure good lighting</li>
                <li>Hold phone 6-12 inches from QR code</li>
                <li>Make sure QR code is fully visible</li>
                <li>Allow camera permissions if prompted</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '30px',
    paddingBottom: '20px',
    borderBottom: '2px solid #e9ecef'
  },
  backButton: {
    display: 'flex',
    alignItems: 'center',
    padding: '10px 20px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    ':hover': {
      background: '#5a6268'
    }
  },
  title: {
    color: '#2c3e50',
    display: 'flex',
    alignItems: 'center',
    margin: 0,
    fontSize: '1.8rem'
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '30px',
    '@media (max-width: 1024px)': {
      gridTemplateColumns: '1fr'
    }
  },
  scannerSection: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
    border: '1px solid #e9ecef'
  },
  sectionTitle: {
    color: '#2c3e50',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    fontSize: '1.3rem'
  },
  instructions: {
    color: '#6c757d',
    marginBottom: '25px',
    fontSize: '15px',
    lineHeight: '1.5'
  },
  scannerContainer: {
    width: '100%',
    minHeight: '400px',
    background: '#f8f9fa',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '20px',
    overflow: 'hidden',
    position: 'relative'
  },
  scannerPlaceholder: {
    textAlign: 'center',
    color: '#6c757d',
    padding: '40px'
  },
  cameraIcon: {
    marginBottom: '20px',
    opacity: 0.7
  },
  startButton: {
    padding: '12px 24px',
    background: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    marginTop: '20px',
    transition: 'all 0.3s',
    ':hover': {
      background: '#2980b9',
      transform: 'translateY(-2px)',
      boxShadow: '0 4px 12px rgba(52, 152, 219, 0.3)'
    },
    ':disabled': {
      background: '#95a5a6',
      cursor: 'not-allowed',
      transform: 'none',
      boxShadow: 'none'
    }
  },
  qrReader: {
    width: '100%',
    height: '100%',
    minHeight: '400px'
  },
  permissionError: {
    textAlign: 'center',
    padding: '40px',
    color: '#721c24'
  },
  permissionButton: {
    padding: '12px 24px',
    background: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    marginTop: '20px',
    transition: 'all 0.3s',
    ':hover': {
      background: '#c0392b',
      transform: 'translateY(-2px)'
    }
  },
  controls: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    marginTop: '20px'
  },
  stopButton: {
    padding: '12px 24px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s',
    ':hover': {
      background: '#c82333',
      transform: 'translateY(-2px)'
    }
  },
  restartButton: {
    padding: '12px 24px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    transition: 'all 0.3s',
    ':hover': {
      background: '#5a6268',
      transform: 'translateY(-2px)'
    }
  },
  resultsSection: {
    background: 'white',
    borderRadius: '15px',
    padding: '25px',
    boxShadow: '0 5px 15px rgba(0,0,0,0.1)',
    border: '1px solid #e9ecef'
  },
  loading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px',
    color: '#3498db',
    fontSize: '16px'
  },
  resultCard: {
    padding: '20px',
    borderRadius: '10px',
    marginBottom: '25px',
    animation: 'fadeIn 0.5s ease'
  },
  resultHeader: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '15px'
  },
  successIcon: {
    fontSize: '24px',
    color: '#28a745',
    marginRight: '10px'
  },
  warningIcon: {
    fontSize: '24px',
    color: '#ffc107',
    marginRight: '10px'
  },
  errorIcon: {
    fontSize: '24px',
    color: '#dc3545',
    marginRight: '10px'
  },
  resultText: {
    margin: '0 0 10px 0',
    fontSize: '16px',
    fontWeight: '500',
    lineHeight: '1.5'
  },
  attendanceDetails: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid rgba(0,0,0,0.1)'
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px',
    padding: '8px 0'
  },
  detailLabel: {
    color: '#6c757d',
    fontWeight: '500',
    fontSize: '14px'
  },
  detailValue: {
    color: '#2c3e50',
    fontWeight: '600',
    fontSize: '14px',
    textAlign: 'right'
  },
  statusBadge: {
    padding: '5px 15px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: 'bold',
    display: 'inline-block'
  },
  instructionsCard: {
    background: '#f8f9fa',
    padding: '20px',
    borderRadius: '10px',
    marginTop: '30px'
  },
  instructionsList: {
    paddingLeft: '20px',
    color: '#495057',
    lineHeight: '1.8',
    marginBottom: '20px'
  },
  tips: {
    marginTop: '20px',
    paddingTop: '20px',
    borderTop: '1px solid #dee2e6'
  }
};

// Add CSS animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
  
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(styleSheet);

export default StudentScanner;