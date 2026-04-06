import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { useNavigate } from 'react-router-dom';
import uptmLogo from '../src/images/uptm.png';
import CanvasCaptcha from './SimpleCaptcha';


// Simple numeric CAPTCHA component (built‑in)
function SimpleCaptcha({ onVerify }) {
  const [captcha, setCaptcha] = useState('');
  const [userInput, setUserInput] = useState('');
  const [error, setError] = useState('');

  const generateCaptcha = () => {
    const num = Math.floor(100000 + Math.random() * 900000);
    setCaptcha(num.toString());
    setUserInput('');
    setError('');
  };

  React.useEffect(() => {
    generateCaptcha();
  }, []);

  const handleVerify = () => {
    if (userInput === captcha) {
      onVerify(true);
      setError('');
    } else {
      onVerify(false);
      setError('❌ Incorrect code. Please try again.');
      generateCaptcha(); // refresh
    }
  };

  return (
    <div style={{ margin: '10px 0' }}>
      <div style={{
        background: '#f0f0f0',
        padding: '10px',
        fontSize: '24px',
        fontFamily: 'monospace',
        letterSpacing: '4px',
        textAlign: 'center',
        border: '1px dashed #ccc',
        borderRadius: '4px',
        userSelect: 'none'
      }}>
        {captcha}
      </div>
      <input
        type="text"
        placeholder="Enter the numbers above"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        style={{ marginTop: '8px', width: '100%', padding: '8px', boxSizing: 'border-box' }}
      />
      <button
        type="button"
        onClick={handleVerify}
        style={{ marginTop: '8px', width: '100%', padding: '8px', background: '#800000', color: 'white', border: 'none', cursor: 'pointer' }}
      >
        Verify
      </button>
      {error && <p style={{ color: 'red', fontSize: '12px', marginTop: '5px' }}>{error}</p>}
    </div>
  );
}

function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [captchaVerified, setCaptchaVerified] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!captchaVerified) {
      alert('Please complete the CAPTCHA');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('✅ Firebase Auth Success:', userCredential.user.uid);

      // Optional Firestore fetch
      try {
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        console.log('📄 Firestore User Data:', userDoc.exists() ? userDoc.data() : 'No user data');
      } catch (firestoreError) {
        console.warn('Could not fetch user data:', firestoreError.message);
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('❌ Login failed:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Inject global styles for animations and keyframes */}
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
        .login-container {
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
        input:focus {
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
        .register-button:hover {
          color: #ff4757;
          text-decoration: underline;
        }
        .password-toggle-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .password-toggle-btn:hover {
          transform: none;
          box-shadow: none;
        }
      `}</style>

      <div className="login-container" style={styles.container}>
        {/* Animated background elements */}
        <div style={styles.background}>
          <div style={styles.circle1}></div>
          <div style={styles.circle2}></div>
          <div style={styles.circle3}></div>
        </div>

        <div className="glass-card" style={styles.card}>
          <img src={uptmLogo} alt="UPTM Logo" className="logo" style={styles.logo} />
          <h2 style={styles.title}>UPTM Digital Event</h2>
          <p style={styles.subtitle}>Bright moments await you</p>

          {error && <div style={styles.errorBox}>{error}</div>}

          <form onSubmit={handleLogin} style={styles.form}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={styles.input}
            />
            
            {/* Password field with toggle */}
            <div style={styles.passwordContainer}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.passwordInput}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.toggleButton}
                tabIndex="-1"
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                )}
              </button>
            </div>

            {/* CAPTCHA component */}
            <CanvasCaptcha onVerify={setCaptchaVerified} />

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                backgroundColor: loading ? '#ccc' : '#ff6b6b',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          <p style={styles.registerText}>
            New to UPTM Digital?{' '}
            <button
              onClick={() => navigate('/register')}
              className="register-button"
              style={styles.registerButton}
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </>
  );
}

// Styles object for most inline styles
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
    maxWidth: '420px',
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
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '18px',
    marginBottom: '25px',
  },
  input: {
    width: '100%',
    padding: '14px 18px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid #dfe6e9',
    borderRadius: '50px',
    fontSize: '16px',
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
    padding: '14px 18px',
    paddingRight: '50px',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    border: '1px solid #dfe6e9',
    borderRadius: '50px',
    fontSize: '16px',
    color: '#2d3436',
    transition: 'all 0.3s ease',
    boxSizing: 'border-box',
  },
  toggleButton: {
    position: 'absolute',
    right: '15px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#666',
    transition: 'color 0.2s',
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
  registerText: {
    margin: '0',
    fontSize: '15px',
    color: '#636e72',
  },
  registerButton: {
    background: 'none',
    border: 'none',
    color: '#ff6b6b',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: '500',
    padding: 0,
    transition: 'color 0.2s',
  },
};

export default Login;