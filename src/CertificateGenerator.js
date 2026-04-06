// src/CertificateGenerator.js
import React, { useEffect, useState } from 'react';
import {
  FaCertificate,
  FaTimes,
  FaSpinner,
  FaCheckCircle,
  FaDownload
} from 'react-icons/fa';
import { auth, db } from './firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import './CertificateGenerator.css';

// IMPORT YOUR LOGO IMAGES
import maraCorporationLogo from './images/maracorporation.png';
import maraLogo from './images/mara.png';
import kptmLogo from './images/kptmlogo.png';
import uptmLogo from './images/uptm.png';
import pendidikanLogo from './images/Kementerian_Pendidikan_Malaysia.png';
import madaniLogo from './images/madani.png';
import fcomLogo from './images/fcom.png';

function CertificateGenerator({ eventData, onClose, targetUserId }) {
  const [generating, setGenerating] = useState(false);
  const [dbUser, setDbUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [attendanceRecord, setAttendanceRecord] = useState(null);
  const [checkingAttendance, setCheckingAttendance] = useState(true);
  const [error, setError] = useState('');
  const [imagesLoaded, setImagesLoaded] = useState(false);

  // Load images as base64
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

  /* =========================
     FETCH USER FROM FIRESTORE
     (uses targetUserId if provided, otherwise current user)
  ========================= */
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userId = targetUserId || auth.currentUser?.uid;
        if (!userId) {
          setError('Please login to view certificates');
          setLoadingUser(false);
          setCheckingAttendance(false);
          return;
        }

        const snap = await getDoc(doc(db, 'users', userId));
        if (snap.exists()) {
          setDbUser(snap.data());
        } else {
          setError('User data not found');
        }
      } catch (err) {
        console.error('Failed to fetch user:', err);
        setError('Failed to load user data');
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, [targetUserId]);

  /* =========================
     CHECK ATTENDANCE FOR THE TARGET USER
  ========================= */
  useEffect(() => {
    const checkAttendance = async () => {
      if (!eventData) {
        setCheckingAttendance(false);
        return;
      }

      const userId = targetUserId || auth.currentUser?.uid;
      if (!userId) {
        setCheckingAttendance(false);
        return;
      }

      try {
        const attendanceQuery = query(
          collection(db, 'attendance'),
          where('eventId', '==', eventData.id),
          where('userId', '==', userId)
        );
        
        const attendanceSnap = await getDocs(attendanceQuery);
        
        if (!attendanceSnap.empty) {
          const record = attendanceSnap.docs[0].data();
          setAttendanceRecord(record);
          
          if (record.status !== 'present' && record.status !== 'late') {
            setError(`${dbUser?.name || 'This user'} did not attend this event (status: ${record.status})`);
          }
        } else {
          if (eventData.attendees?.includes(userId)) {
            setError(`${dbUser?.name || 'User'} registered but attendance was not marked`);
          } else {
            setError(`${dbUser?.name || 'User'} did not attend this event`);
          }
        }
      } catch (err) {
        console.error('Failed to check attendance:', err);
        setError('Failed to verify attendance');
      } finally {
        setCheckingAttendance(false);
      }
    };

    // Wait for dbUser to be available so we can use the name in error messages
    if (dbUser !== null || loadingUser === false) {
      checkAttendance();
    }
  }, [eventData, targetUserId, dbUser, loadingUser]);

  /* =========================
     FORMAT DATE FUNCTION
  ========================= */
  const formatEventDate = (date) => {
    if (!date) return 'N/A';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-MY', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  /* =========================
     GENERATE HTML FOR CERTIFICATE
  ========================= */
  const generateHTML = () => {
    const participantName = dbUser?.name || 'Participant';
    const matricNumber = dbUser?.matricNumber || dbUser?.studentId || '';
    const eventTitle = eventData?.title || 'Event';
    const eventDate = formatEventDate(eventData?.date || eventData?.startDate);
    const eventCode = eventData?.eventCode || 'N/A';
    const certificateId = `UPTM/CERT/${eventCode}/${Date.now().toString().slice(-6)}`;
    const status = attendanceRecord?.status === 'present' ? 'Present' : 'Late';

    const images = window.certificateImages || {};

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>UPTM Certificate</title>
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

  /* =========================
     GENERATE PDF USING HTML
  ========================= */
  const handleGenerateCertificate = async () => {
    if (!attendanceRecord || (attendanceRecord.status !== 'present' && attendanceRecord.status !== 'late')) {
      alert('This user is not eligible for a certificate because they did not attend the event.');
      return;
    }

    try {
      setGenerating(true);

      const htmlContent = generateHTML();
      
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      iframe.contentDocument.open();
      iframe.contentDocument.write(htmlContent);
      iframe.contentDocument.close();
      
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow.print();
          
          setTimeout(() => {
            document.body.removeChild(iframe);
            URL.revokeObjectURL(url);
          }, 1000);
        }, 500);
      };

      const fileName = `${eventData.title.replace(/\s+/g, '_')}_${dbUser.name.replace(/\s+/g, '_')}.html`;
      
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

    } catch (err) {
      console.error('Certificate generation error:', err);
      alert('Failed to generate certificate: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  /* =========================
     DOWNLOAD AS PDF (using browser print)
  ========================= */
  const handleDownloadPDF = async () => {
    if (!attendanceRecord || (attendanceRecord.status !== 'present' && attendanceRecord.status !== 'late')) {
      alert('This user is not eligible for a certificate because they did not attend the event.');
      return;
    }

    try {
      setGenerating(true);
      const htmlContent = generateHTML();
      
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      printWindow.focus();
      printWindow.print();
      
      printWindow.onafterprint = () => {
        printWindow.close();
      };
      
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to download PDF: ' + err.message);
    } finally {
      setGenerating(false);
    }
  };

  /* =========================
     UI
  ========================= */
  return (
    <div className="certificate-modal-overlay" style={styles.overlay}>
      <div className="certificate-modal" style={styles.modal}>
        <div className="certificate-modal-header" style={styles.header}>
          <div style={styles.headerTitle}>
            <FaCertificate style={{ marginRight: '10px' }} />
            <h3 style={styles.headerText}>
              {targetUserId ? 'Generate Certificate for Attendee' : 'Generate Your Certificate'}
            </h3>
          </div>
          <button onClick={onClose} style={styles.closeButton}>
            <FaTimes />
          </button>
        </div>

        <div style={styles.body}>
          {loadingUser || checkingAttendance || !imagesLoaded ? (
            <div style={styles.loadingContainer}>
              <FaSpinner className="spinner" style={styles.spinner} />
              <p>Verifying attendance...</p>
            </div>
          ) : error ? (
            <div style={styles.errorContainer}>
              <FaTimes style={styles.errorIcon} />
              <h4 style={styles.errorTitle}>Certificate Not Available</h4>
              <p style={styles.errorMessage}>{error}</p>
              <button onClick={onClose} style={styles.closeBtn}>
                Close
              </button>
            </div>
          ) : (
            <>
              <div style={styles.previewContainer}>
                <div style={styles.previewCard}>
                  <div style={styles.logoRow}>
                    <div style={styles.leftLogo}>
                      <img src={madaniLogo} alt="Madani" style={styles.logoMedium} />
                    </div>
                    <div style={styles.rightLogos}>
                      <img src={maraCorporationLogo} alt="MARA Corp" style={styles.logoSmall} />
                      <img src={pendidikanLogo} alt="Ministry" style={styles.logoSmall} />
                      <img src={maraLogo} alt="MARA" style={styles.logoSmall} />
                      <img src={kptmLogo} alt="KPTM" style={styles.logoSmall} />
                    </div>
                  </div>
                  
                  <img src={uptmLogo} alt="UPTM" style={{...styles.uptmLogo, width: '120px', height: 'auto'}} />
                  
                  <div style={styles.fcomPreview}>
                    <img src={fcomLogo} alt="FCOM" style={styles.fcomLogoPreview} />
                  </div>
                  
                  <h4 style={styles.previewTitle}>
                    CERTIFICATE OF PARTICIPATION
                  </h4>
                  
                  <p style={styles.previewSubtitle}>
                    THIS IS TO CERTIFY THAT
                  </p>
                  
                  <p style={styles.previewName}>
                    {dbUser?.name || 'Student Name'}
                  </p>
                  
                  {dbUser?.matricNumber && (
                    <p style={styles.previewMatric}>
                      Matric No: {dbUser.matricNumber}
                    </p>
                  )}
                  
                  <p style={styles.previewSubtitle}>
                    FOR ACTIVE PARTICIPATION IN
                  </p>
                  
                  <p style={styles.previewEvent}>
                    {eventData?.title || 'Event Title'}
                  </p>
                  
                  <p style={styles.previewSubtitle}>
                    HELD ON
                  </p>
                  
                  <p style={styles.previewDate}>
                    {eventData?.date
                      ? formatEventDate(eventData.date)
                      : eventData?.startDate
                      ? formatEventDate(eventData.startDate)
                      : 'Event Date'}
                  </p>
                  
                  <div style={styles.signatureRow}>
                    <div style={styles.signatureLine}>
                      <div style={styles.signatureDivider}></div>
                      <p style={styles.signatureName}>PROF. MADYA DR. SAIFUDDIN BIN HJ. MOHTARAM</p>
                      <p style={styles.signatureTitle}>Dean of FCOM</p>
                    </div>
                  </div>
                </div>
              </div>

              <div style={styles.buttonRow}>
                <button
                  onClick={handleGenerateCertificate}
                  disabled={generating}
                  style={styles.generateButton}
                >
                  {generating ? (
                    <>
                      <FaSpinner className="spinner" style={styles.buttonSpinner} />
                      Generating...
                    </>
                  ) : (
                    <>
                      <FaDownload style={{ marginRight: '8px' }} />
                      Generate & Print
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadPDF}
                  disabled={generating}
                  style={styles.downloadButton}
                >
                  <FaCertificate style={{ marginRight: '8px' }} />
                  Save as PDF
                </button>

                <button onClick={onClose} style={styles.cancelButton}>
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Styles (same as before, kept for completeness)
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modal: {
    background: 'white',
    borderRadius: '15px',
    width: '90%',
    maxWidth: '600px',
    maxHeight: '90vh',
    overflowY: 'auto',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
  },
  header: {
    background: '#8B0000',
    color: 'white',
    padding: '20px',
    borderTopLeftRadius: '15px',
    borderTopRightRadius: '15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center'
  },
  headerText: {
    margin: 0,
    fontSize: '18px'
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    color: 'white',
    fontSize: '20px',
    cursor: 'pointer'
  },
  body: {
    padding: '20px'
  },
  loadingContainer: {
    textAlign: 'center',
    padding: '40px'
  },
  spinner: {
    fontSize: '40px',
    color: '#8B0000',
    marginBottom: '20px',
    animation: 'spin 1s linear infinite'
  },
  errorContainer: {
    textAlign: 'center',
    padding: '40px',
    background: '#f8d7da',
    borderRadius: '8px',
    color: '#721c24'
  },
  errorIcon: {
    fontSize: '40px',
    marginBottom: '15px',
    color: '#8B0000'
  },
  errorTitle: {
    color: '#8B0000',
    margin: '0 0 10px 0'
  },
  errorMessage: {
    margin: '0 0 20px 0'
  },
  closeBtn: {
    padding: '10px 20px',
    background: '#8B0000',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  previewContainer: {
    marginBottom: '20px'
  },
  previewCard: {
    border: '2px solid #8B0000',
    background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
    padding: '10px 20px',
    textAlign: 'center',
    borderRadius: '8px',
    position: 'relative'
  },
  logoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '10px'
  },
  leftLogo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  logoMedium: {
    height: '30px',
    width: 'auto',
    objectFit: 'contain'
  },
  rightLogos: {
    display: 'flex',
    gap: '8px'
  },
  logoSmall: {
    height: '25px',
    width: 'auto',
    objectFit: 'contain'
  },
  uptmLogo: {
    width: '120px',
    height: 'auto',
    margin: '5px auto',
    display: 'block',
    objectFit: 'contain'
  },
  fcomPreview: {
    position: 'absolute',
    bottom: '10px',
    right: '20px'
  },
  fcomLogoPreview: {
    width: '50px',
    height: '50px',
    objectFit: 'contain',
    opacity: 0.7
  },
  previewTitle: {
    color: '#8B0000',
    fontSize: '16px',
    margin: '5px 0'
  },
  previewSubtitle: {
    color: '#00347A',
    fontSize: '12px',
    margin: '5px 0 2px'
  },
  previewName: {
    color: '#8B0000',
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '5px 0',
    padding: '8px 15px',
    background: '#fff9e6',
    border: '1px solid #FFD700',
    borderRadius: '20px',
    display: 'inline-block'
  },
  previewMatric: {
    color: '#666',
    fontSize: '11px',
    margin: '2px 0'
  },
  previewEvent: {
    color: '#8B0000',
    fontSize: '14px',
    fontWeight: 'bold',
    margin: '3px 0',
    padding: '0 10px'
  },
  previewDate: {
    color: '#8B0000',
    fontSize: '14px',
    fontWeight: 'bold',
    margin: '3px 0 10px'
  },
  signatureRow: {
    marginTop: '10px',
    display: 'flex',
    justifyContent: 'center'
  },
  signatureLine: {
    textAlign: 'center',
    width: '200px'
  },
  signatureDivider: {
    width: '150px',
    height: '2px',
    background: '#8B0000',
    margin: '0 auto 8px'
  },
  signatureName: {
    fontSize: '12px',
    fontWeight: 'bold',
    margin: 0,
    color: '#8B0000'
  },
  signatureTitle: {
    fontSize: '10px',
    margin: '2px 0 0',
    color: '#00347A'
  },
  buttonRow: {
    display: 'flex',
    gap: '10px',
    marginTop: '20px',
    flexWrap: 'wrap'
  },
  generateButton: {
    flex: 2,
    padding: '15px',
    background: '#8B0000',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '200px'
  },
  downloadButton: {
    flex: 1,
    padding: '15px',
    background: '#00347A',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '150px'
  },
  buttonSpinner: {
    animation: 'spin 1s linear infinite',
    marginRight: '8px'
  },
  cancelButton: {
    padding: '15px 25px',
    background: '#6c757d',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '16px',
    minWidth: '100px'
  },
  successMessage: {
    textAlign: 'center',
    padding: '10px',
    background: '#d4edda',
    color: '#155724',
    borderRadius: '5px',
    marginTop: '10px',
    fontSize: '14px'
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
`;
document.head.appendChild(styleSheet);

export { CertificateGenerator };