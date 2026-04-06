import React, { useState, useEffect, useRef } from 'react';

function CanvasCaptcha({ onVerify }) {
  const [captcha, setCaptcha] = useState('');
  const [userInput, setUserInput] = useState('');
  const [error, setError] = useState('');
  const canvasRef = useRef(null);

  // Generate random alphanumeric CAPTCHA
  const generateCaptcha = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(result);
    setUserInput('');
    setError('');
  };

  // Draw CAPTCHA on canvas
  const drawCaptcha = (text) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Glass-style background
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.font = '28px monospace';
    ctx.fillStyle = '#2d3436';

    for (let i = 0; i < text.length; i++) {
      const x = 20 + i * 25;
      const y = 40 + Math.random() * 5;
      const angle = (Math.random() - 0.5) * 0.5;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }

    // Soft noise lines
    for (let i = 0; i < 4; i++) {
      ctx.strokeStyle = 'rgba(255,107,107,0.2)';
      ctx.beginPath();
      ctx.moveTo(Math.random() * 200, Math.random() * 70);
      ctx.lineTo(Math.random() * 200, Math.random() * 70);
      ctx.stroke();
    }
  };

  useEffect(() => {
    generateCaptcha();
  }, []);

  useEffect(() => {
    if (captcha) drawCaptcha(captcha);
  }, [captcha]);

  // ✅ Auto verification logic
  useEffect(() => {
    if (userInput.length < 6) {
      setError('');
      onVerify(false);
      return;
    }

    if (userInput.toUpperCase() === captcha) {
      onVerify(true);
      setError('');
    } else {
      onVerify(false);
      setError('Incorrect code. Try again.');

      // 🔄 Auto refresh after wrong input
      setTimeout(() => {
        generateCaptcha();
      }, 800);
    }
  }, [userInput, captcha]);

  return (
    <div style={styles.wrapper}>
      
      {/* Canvas */}
      <div style={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          width={200}
          height={70}
          style={styles.canvas}
        />

        {/* Refresh button */}
        <button
          type="button"
          onClick={generateCaptcha}
          style={styles.refresh}
        >
          ↻
        </button>
      </div>

      {/* Input */}
      <input
        type="text"
        placeholder="Enter CAPTCHA"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        style={styles.input}
        maxLength={6}
      />

      {/* Error */}
      {error && <p style={styles.error}>{error}</p>}
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },

  canvasContainer: {
    position: 'relative',
    borderRadius: '15px',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.5)',
    backdropFilter: 'blur(8px)',
    background: 'rgba(255,255,255,0.6)',
  },

  canvas: {
    display: 'block',
    width: '100%',
  },

  refresh: {
    position: 'absolute',
    top: '8px',
    right: '10px',
    border: 'none',
    background: 'rgba(255,255,255,0.8)',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: '0.2s',
  },

  input: {
    width: '100%',
    padding: '14px 18px',
    borderRadius: '50px',
    border: '1px solid #dfe6e9',
    fontSize: '16px',
    background: 'rgba(255,255,255,0.9)',
    boxSizing: 'border-box',
  },

  error: {
    color: '#d63031',
    fontSize: '13px',
    textAlign: 'left',
  },
};

export default CanvasCaptcha;