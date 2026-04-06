// src/components/CancelConfirmationModal.js
import React from 'react';
import { FaExclamationTriangle, FaTimes, FaEnvelope, FaBell, FaUserFriends } from 'react-icons/fa';

function CancelConfirmationModal({ isOpen, onClose, onConfirm, eventTitle, registeredCount }) {
  if (!isOpen) return null;

  return (
    <div style={styles.modalOverlay}>
      <div style={styles.modal}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FaExclamationTriangle style={{ color: '#e74c3c', fontSize: '24px' }} />
            <h3 style={{ margin: 0, color: '#2c3e50' }}>Cancel Event Confirmation</h3>
          </div>
          <button onClick={onClose} style={styles.closeButton}>
            <FaTimes />
          </button>
        </div>

        {/* Content */}
        <div style={styles.modalContent}>
          <p style={styles.warningText}>
            You are about to cancel: <strong>{eventTitle}</strong>
          </p>
          
          {/* Consequences List */}
          <div style={styles.consequences}>
            <h4 style={{ color: '#e74c3c', marginBottom: '10px' }}>This will:</h4>
            <ul style={styles.consequencesList}>
              <li style={styles.consequenceItem}>
                <FaTimes style={{ color: '#e74c3c', marginRight: '10px' }} />
                Close event registration immediately
              </li>
              <li style={styles.consequenceItem}>
                <FaUserFriends style={{ color: '#e74c3c', marginRight: '10px' }} />
                Cancel {registeredCount} registration(s)
              </li>
              <li style={styles.consequenceItem}>
                <FaBell style={{ color: '#e74c3c', marginRight: '10px' }} />
                Notify all registered attendees
              </li>
              <li style={styles.consequenceItem}>
                <FaEnvelope style={{ color: '#e74c3c', marginRight: '10px' }} />
                Send cancellation emails
              </li>
            </ul>
          </div>

          {/* Cancellation Reason */}
          <div style={styles.reasonSection}>
            <label style={styles.reasonLabel}>
              Cancellation Reason (Optional)
            </label>
            <textarea
              id="cancellationReason"
              placeholder="E.g., Speaker unavailable, venue issues, low registration..."
              rows="3"
              style={styles.reasonTextarea}
            />
          </div>

          {/* Notify Attendees Option */}
          <div style={styles.notifyOption}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                defaultChecked
                style={styles.checkbox}
              />
              Send notification emails to registered attendees
            </label>
          </div>

          {/* Actions */}
          <div style={styles.modalActions}>
            <button
              onClick={onClose}
              style={styles.cancelAction}
            >
              Go Back
            </button>
            <button
              onClick={() => {
                const reason = document.getElementById('cancellationReason').value;
                onConfirm(reason);
              }}
              style={styles.confirmAction}
            >
              Confirm Cancellation
            </button>
          </div>

          <p style={styles.footerNote}>
            ⚠️ This action can be undone by reopening the event from organizer tools.
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)'
  },
  modalHeader: {
    padding: '20px',
    borderBottom: '1px solid #e9ecef',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  closeButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '20px',
    color: '#6c757d',
    cursor: 'pointer',
    padding: '5px',
    ':hover': {
      color: '#e74c3c'
    }
  },
  modalContent: {
    padding: '20px'
  },
  warningText: {
    fontSize: '16px',
    color: '#2c3e50',
    marginBottom: '20px',
    textAlign: 'center'
  },
  consequences: {
    background: '#f8f9fa',
    borderRadius: '8px',
    padding: '15px',
    marginBottom: '20px'
  },
  consequencesList: {
    listStyle: 'none',
    padding: 0,
    margin: 0
  },
  consequenceItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '8px 0',
    color: '#495057',
    fontSize: '14px'
  },
  reasonSection: {
    marginBottom: '20px'
  },
  reasonLabel: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#2c3e50',
    fontSize: '14px'
  },
  reasonTextarea: {
    width: '100%',
    padding: '12px',
    border: '1px solid #ddd',
    borderRadius: '6px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
    ':focus': {
      outline: 'none',
      borderColor: '#3498db',
      boxShadow: '0 0 0 3px rgba(52, 152, 219, 0.1)'
    }
  },
  notifyOption: {
    marginBottom: '25px'
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#495057',
    fontSize: '14px',
    cursor: 'pointer'
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer'
  },
  modalActions: {
    display: 'flex',
    gap: '15px',
    justifyContent: 'flex-end'
  },
  cancelAction: {
    padding: '12px 24px',
    background: 'transparent',
    color: '#6c757d',
    border: '1px solid #6c757d',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s',
    ':hover': {
      background: '#6c757d',
      color: 'white'
    }
  },
  confirmAction: {
    padding: '12px 24px',
    background: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.3s',
    ':hover': {
      background: '#c82333',
      transform: 'translateY(-2px)'
    }
  },
  footerNote: {
    fontSize: '12px',
    color: '#7f8c8d',
    textAlign: 'center',
    marginTop: '20px',
    fontStyle: 'italic'
  }
};

export default CancelConfirmationModal;