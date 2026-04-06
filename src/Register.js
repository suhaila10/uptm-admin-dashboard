// src/Register.js - with show/hide password toggle and password strength indicator
import React, { useState, useCallback, useMemo } from 'react';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useNavigate } from 'react-router-dom';
import uptmLogo from '../src/images/uptm.png';

function Register() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Password validation states
  const [passwordErrors, setPasswordErrors] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    symbol: false,
  });

  // Password validation function
  const validatePassword = useCallback((pass) => {
    const errors = {
      length: pass.length >= 8,
      uppercase: /[A-Z]/.test(pass),
      lowercase: /[a-z]/.test(pass),
      number: /[0-9]/.test(pass),
      symbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass),
    };
    setPasswordErrors(errors);
    return Object.values(errors).every(Boolean);
  }, []);

  // Compute if password is valid
  const isPasswordValid = useMemo(() => {
    if (password.length === 0) return false;
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
    );
  }, [password]);

  const getUserIDPlaceholder = () => {
    switch(role) {
      case 'student': return 'AM2408016647';
      case 'lecturer': return 'LEC001234';
      case 'organizer': return 'ORG0001';
      case 'admin': return 'ADM0001';
      default: return 'Enter User ID';
    }
  };

  const getUserIDLabel = () => {
    switch(role) {
      case 'student': return 'Student ID *';
      case 'lecturer': return 'Lecturer ID *';
      case 'organizer': return 'Staff ID *';
      case 'admin': return 'Admin ID *';
      default: return 'User ID *';
    }
  };

  const validateUserID = (id) => {
    if (!id) return 'User ID is required';
    const cleanId = id.trim().toUpperCase();
    if (cleanId.length < 6 || cleanId.length > 20) {
      return 'User ID must be between 6-20 characters';
    }
    switch(role) {
      case 'student':
        if (!/^AM\d+$/.test(cleanId)) {
          return 'Student ID should start with "AM" followed by numbers';
        }
        break;
      case 'lecturer':
        if (!/^LEC\d+$/.test(cleanId)) {
          return 'Lecturer ID should start with "LEC" followed by numbers';
        }
        break;
      case 'organizer':
        if (!/^ORG\d+$/.test(cleanId)) {
          return 'Organizer ID should start with "ORG" followed by numbers';
        }
        break;
      case 'admin':
        if (!/^ADM\d+$/.test(cleanId)) {
          return 'Admin ID should start with "ADM" followed by numbers';
        }
        break;
    }
    return '';
  };

  const validateEmailDomain = (email, role) => {
    const emailDomain = email.split('@')[1];
    if (role === 'student') {
      if (!emailDomain?.includes('student.uptm.edu.my')) {
        return 'Students must use @student.uptm.edu.my email';
      }
    } else {
      if (!emailDomain?.includes('uptm.edu.my')) {
        return 'Staff must use @uptm.edu.my email';
      }
    }
    return '';
  };

  const checkUserIdExists = async (userId) => {
    try {
      const userDoc = await getDoc(doc(db, 'users_by_id', userId.toUpperCase()));
      return userDoc.exists();
    } catch (error) {
      console.error('Error checking user ID:', error);
      return false;
    }
  };

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setUserId('');
  };

  const handlePasswordChange = (e) => {
    const pass = e.target.value;
    setPassword(pass);
    validatePassword(pass);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validate all inputs
    if (!userId || !email || !password || !name) {
      setError('Please fill all required fields');
      return;
    }

    // Validate User ID format
    const idError = validateUserID(userId);
    if (idError) {
      setError(idError);
      return;
    }

    // Validate email domain
    const emailError = validateEmailDomain(email, role);
    if (emailError) {
      setError(emailError);
      return;
    }

    // Validate password strength
    if (!isPasswordValid) {
      setError(
        'Password must contain:\n' +
        '• At least 8 characters\n' +
        '• At least one uppercase letter\n' +
        '• At least one lowercase letter\n' +
        '• At least one number\n' +
        '• At least one special character (!@#$%^&*)'
      );
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if User ID already exists
      const userIdExists = await checkUserIdExists(userId);
      if (userIdExists) {
        setError('This User ID is already registered. Please use a different ID or login.');
        setLoading(false);
        return;
      }

      // Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName: name });

      // Prepare user data
      const cleanUserId = userId.trim().toUpperCase();
      const userData = {
        userId: cleanUserId,
        email: email.toLowerCase(),
        name: name.trim(),
        role: role,
        authUid: user.uid,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        isActive: true,
        emailVerified: false,
        lastLogin: null,
        profileComplete: false
      };

      // Role-specific data
      switch(role) {
        case 'student':
          userData.userType = 'student';
          userData.matricNumber = cleanUserId;
          userData.yearOfStudy = new Date().getFullYear();
          userData.semester = 1;
          userData.program = 'To be updated';
          break;
        case 'lecturer':
          userData.userType = 'staff';
          userData.position = 'Lecturer';
          userData.department = 'General';
          userData.faculty = 'To be updated';
          break;
        case 'organizer':
          userData.userType = 'staff';
          userData.position = 'Event Organizer';
          userData.canCreateEvents = true;
          userData.canManageEvents = true;
          break;
        case 'admin':
          userData.userType = 'staff';
          userData.position = 'Administrator';
          userData.canCreateEvents = true;
          userData.canManageEvents = true;
          userData.canManageUsers = true;
          userData.canManageSystem = true;
          break;
      }

      // Save to Firestore
      await setDoc(doc(db, 'users', user.uid), userData);
      await setDoc(doc(db, 'users_by_id', cleanUserId), { ...userData, uid: user.uid });

      if (role === 'student') {
        await setDoc(doc(db, 'students', cleanUserId), {
          uid: user.uid,
          userId: cleanUserId,
          name: name.trim(),
          email: email.toLowerCase(),
          matricNumber: cleanUserId,
          createdAt: Timestamp.now(),
          totalEventsAttended: 0,
          totalPoints: 0
        });
      } else if (role === 'lecturer') {
        await setDoc(doc(db, 'lecturers', cleanUserId), {
          uid: user.uid,
          userId: cleanUserId,
          name: name.trim(),
          email: email.toLowerCase(),
          position: 'Lecturer',
          createdAt: Timestamp.now()
        });
      }

      alert(`✅ Registration successful! Welcome, ${name}. Your User ID is: ${cleanUserId}`);
      navigate('/dashboard');

    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle specific Firebase auth errors
      if (error.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters.');
      } else if (error.code === 'auth/email-already-in-use') {
        setError('This email is already registered. Please login or use a different email.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(error.message);
      }
      
      // If user was created but Firestore failed, clean up auth user
      if (auth.currentUser) {
        try {
          await auth.currentUser.delete();
        } catch (deleteError) {
          console.warn('Could not delete auth user:', deleteError);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
          100% { transform: translateY(0px); }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        .register-container {
          animation: gradientShift 15s ease infinite;
        }
        .glass-card {
          backdrop-filter: blur(10px);
          background: rgba(255, 255, 255, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.5);
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.1);
        }
        .logo {
          animation: float 6s ease-in-out infinite;
        }
        input:focus, select:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(255, 107, 107, 0.3);
          border-color: #ff6b6b !important;
        }
        button:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(255, 107, 107, 0.5);
        }
        button:not(:disabled):active {
          transform: translateY(0);
        }
        .register-link-button:hover {
          color: #ff4757;
          text-decoration: underline;
        }
        
        .password-toggle-btn {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  padding: 5px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  transition: color 0.2s;
}

/* Override the default button hover for just the password toggle */
.password-toggle-btn:hover {
  transform: translateY(-50%) !important; /* Keep it centered, override the global rule */
  box-shadow: none !important;
  color: #ff6b6b;
}
        .password-strength-container {
          margin-top: 12px;
          padding: 12px;
          background: rgba(248, 249, 250, 0.8);
          border-radius: 8px;
          border: 1px solid #e9ecef;
        }

        .password-strength-title {
          font-size: 12px;
          font-weight: 600;
          color: #495057;
          margin-bottom: 8px;
        }

        .requirement-row {
          display: flex;
          align-items: center;
          margin: 4px 0;
        }

        .requirement-text {
          font-size: 11px;
          color: #868e96;
          margin-left: 6px;
        }

        .requirement-met {
          color: #4CAF50;
        }
      `}</style>

      <div className="register-container" style={styles.container}>
        <div style={styles.background}>
          <div style={styles.circle1}></div>
          <div style={styles.circle2}></div>
          <div style={styles.circle3}></div>
        </div>

        <div className="glass-card" style={styles.card}>
          <img src={uptmLogo} alt="UPTM Logo" className="logo" style={styles.logo} />
          <h2 style={styles.title}>UPTM Digital Event</h2>
          <p style={styles.subtitle}>Create your account</p>

          {error && (
            <div style={styles.errorBox}>
              <strong style={{ display: 'block', marginBottom: '5px' }}>⚠️ Registration Error</strong>
              {error.split('\n').map((line, i) => (
                <div key={i}>{line}</div>
              ))}
            </div>
          )}

          <form onSubmit={handleRegister} style={styles.form}>
            {/* User ID */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>{getUserIDLabel()}</label>
              <input
                type="text"
                placeholder={getUserIDPlaceholder()}
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                required
                disabled={loading}
                style={styles.input}
              />
              <small style={styles.hint}>This will be your permanent User ID for login</small>
            </div>

            {/* Full Name */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Full Name *</label>
              <input
                type="text"
                placeholder="e.g., Norsuhaila binti Ismail"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                style={styles.input}
              />
            </div>

            {/* Email */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Email Address *</label>
              <input
                type="email"
                placeholder={role === 'student' ? 'username@student.uptm.edu.my' : 'username@uptm.edu.my'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                style={styles.input}
              />
              <small style={styles.hint}>
                {role === 'student' ? 'Must use official UPTM student email' : 'Must use official UPTM staff email'}
              </small>
            </div>

            {/* Password with toggle and strength indicator */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Password *</label>
              <div style={styles.passwordContainer}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter strong password"
                  value={password}
                  onChange={handlePasswordChange}
                  required
                  disabled={loading}
                  minLength="8"
                  style={{
                    ...styles.passwordInput,
                    borderColor: password.length > 0 && !isPasswordValid ? '#f44336' : '#dfe6e9',
                    borderWidth: password.length > 0 && !isPasswordValid ? '2px' : '1px',
                  }}
                />
                <button
                  type="button"
                  className="password-toggle-btn"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                      <line x1="1" y1="1" x2="23" y2="23"></line>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  )}
                </button>
              </div>

              {/* Password strength indicator */}
              {password.length > 0 && (
                <div className="password-strength-container">
                  <div className="password-strength-title">Password must contain:</div>
                  
                  <div className="requirement-row">
                    {passwordErrors.length ? '✓' : '✗'}
                    <span className={`requirement-text ${passwordErrors.length ? 'requirement-met' : ''}`}>
                      At least 8 characters
                    </span>
                  </div>

                  <div className="requirement-row">
                    {passwordErrors.uppercase ? '✓' : '✗'}
                    <span className={`requirement-text ${passwordErrors.uppercase ? 'requirement-met' : ''}`}>
                      At landreast one uppercase letter (A-Z)
                    </span>
                  </div>

                  <div className="requirement-row">
                    {passwordErrors.lowercase ? '✓' : '✗'}
                    <span className={`requirement-text ${passwordErrors.lowercase ? 'requirement-met' : ''}`}>
                      At least one lowercase letter (a-z)
                    </span>
                  </div>

                  <div className="requirement-row">
                    {passwordErrors.number ? '✓' : '✗'}
                    <span className={`requirement-text ${passwordErrors.number ? 'requirement-met' : ''}`}>
                      At least one number (0-9)
                    </span>
                  </div>

                  <div className="requirement-row">
                    {passwordErrors.symbol ? '✓' : '✗'}
                    <span className={`requirement-text ${passwordErrors.symbol ? 'requirement-met' : ''}`}>
                      At least one special character (!@#$%^&*)
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Role */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>Account Type *</label>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value)}
                disabled={loading}
                style={styles.select}
              >
                <option value="student">🎓 Student</option>
                <option value="lecturer">👨‍🏫 Lecturer</option>
                
                <option value="admin">⚙️ Administrator</option>
              </select>
              <small style={styles.hint}>Select the role that matches your position at UPTM</small>
            </div>

            <button
              type="submit"
              disabled={loading || (password.length > 0 && !isPasswordValid)}
              style={{
                ...styles.button,
                backgroundColor: loading || (password.length > 0 && !isPasswordValid) ? '#ccc' : '#ff6b6b',
                cursor: loading || (password.length > 0 && !isPasswordValid) ? 'not-allowed' : 'pointer',
                opacity: loading || (password.length > 0 && !isPasswordValid) ? 0.7 : 1,
              }}
            >
              {loading ? (
                <>
                  <span style={{ marginRight: '8px' }}>⏳</span>
                  Creating Account...
                </>
              ) : (
                <>
                  <span style={{ marginRight: '8px' }}>📝</span>
                  Create Account
                </>
              )}
            </button>
          </form>

          <div style={styles.divider}>
            <span style={styles.dividerText}>Already have an account?</span>
          </div>
          <button
            onClick={() => navigate('/login')}
            disabled={loading}
            className="register-link-button"
            style={styles.loginLinkButton}
            onMouseOver={(e) => !loading && (e.target.style.backgroundColor = '#ff6b6b', e.target.style.color = 'white')}
            onMouseOut={(e) => !loading && (e.target.style.backgroundColor = 'transparent', e.target.style.color = '#ff6b6b')}
          >
            🚪 Login to Existing Account
          </button>

          <div style={styles.notes}>
            <strong style={{ display: 'block', marginBottom: '5px', color: '#2d3436' }}>ℹ️ Important Notes:</strong>
            <ul style={styles.notesList}>
              <li>Use the <strong>ID</strong> provided by UPTM </li>
              <li>Keep your password secure</li>
              <li>Use your official UPTM email address</li>
              <li>Password must be strong (8+ chars, uppercase, lowercase, numbers, symbols)</li>
              <li>Contact admin if you need assistance</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}

// Styles object
const styles = {
  container: {
    position: 'relative',
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
    fontFamily: "'Poppins', 'Segoe UI', sans-serif",
    overflow: 'hidden',
    background: 'linear-gradient(-45deg, #f9d6e0, #fbe9d7, #d4e6f1, #e0f2e9)',
    backgroundSize: '400% 400%',
  },
  background: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 0,
  },
  circle1: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255, 182, 193, 0.5) 0%, transparent 70%)',
    top: '-100px',
    right: '-50px',
    animation: 'float 8s ease-in-out infinite',
  },
  circle2: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(173, 216, 230, 0.5) 0%, transparent 70%)',
    bottom: '-150px',
    left: '-100px',
    animation: 'float 12s ease-in-out infinite reverse',
  },
  circle3: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(255, 255, 224, 0.6) 0%, transparent 70%)',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    animation: 'float 10s ease-in-out infinite',
  },
  card: {
    position: 'relative',
    zIndex: 10,
    maxWidth: '500px',
    width: '100%',
    padding: '40px 35px',
    borderRadius: '20px',
    boxShadow: '0 25px 40px -15px rgba(0, 0, 0, 0.2)',
    textAlign: 'center',
    color: '#333',
  },
  logo: {
    width: '100px',
    height: 'auto',
    marginBottom: '20px',
    filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.05))',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    margin: '10px 0 5px',
    letterSpacing: '1px',
    color: '#2d3436',
  },
  subtitle: {
    fontSize: '16px',
    margin: '0 0 30px',
    color: '#636e72',
    fontWeight: '300',
  },
  errorBox: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    backdropFilter: 'blur(5px)',
    color: '#d63031',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '25px',
    fontSize: '14px',
    border: '1px solid rgba(255, 107, 107, 0.3)',
    textAlign: 'left',
    whiteSpace: 'pre-line',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '25px',
  },
  fieldGroup: {
    textAlign: 'left',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: '#2d3436',
    fontSize: '14px',
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid #dfe6e9',
    borderRadius: '50px',
    fontSize: '15px',
    color: '#2d3436',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
  },
  passwordContainer: {
    position: 'relative',
    width: '100%',
  },
  passwordInput: {
    width: '100%',
    padding: '12px 16px',
    paddingRight: '45px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid #dfe6e9',
    borderRadius: '50px',
    fontSize: '15px',
    color: '#2d3436',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid #dfe6e9',
    borderRadius: '50px',
    fontSize: '15px',
    color: '#2d3436',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
    cursor: 'pointer',
  },
  hint: {
    display: 'block',
    marginTop: '5px',
    color: '#636e72',
    fontSize: '12px',
  },
  button: {
    width: '100%',
    padding: '14px',
    border: 'none',
    borderRadius: '50px',
    fontSize: '16px',
    fontWeight: '600',
    color: '#fff',
    transition: 'all 0.3s ease',
    marginTop: '10px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
  },
  divider: {
    position: 'relative',
    margin: '25px 0 15px',
    borderTop: '1px solid rgba(0,0,0,0.1)',
  },
  dividerText: {
    position: 'absolute',
    top: '-10px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(255,255,255,0.7)',
    padding: '0 10px',
    color: '#636e72',
    fontSize: '14px',
  },
  loginLinkButton: {
    background: 'transparent',
    border: '2px solid #ff6b6b',
    color: '#ff6b6b',
    padding: '12px 25px',
    borderRadius: '50px',
    fontWeight: 'bold',
    fontSize: '15px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    width: '100%',
    marginBottom: '20px',
  },
  notes: {
    marginTop: '20px',
    padding: '15px',
    background: 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(5px)',
    borderRadius: '12px',
    fontSize: '13px',
    color: '#4a5568',
    textAlign: 'left',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  notesList: {
    margin: '5px 0 0',
    paddingLeft: '20px',
  },
};

export default Register;