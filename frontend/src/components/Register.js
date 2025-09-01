import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    // Validate password length
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setLoading(false);
      return;
    }

    const { confirmPassword, ...registerData } = formData;
    const result = await register(registerData);
    
    if (result.success) {
      navigate('/gettingstart');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      {/* Left Side - Form */}
      <div style={styles.leftSide}>
        {/* Logo Header */}
        <div style={styles.logoHeader}>
          <Link to="/" style={styles.logoLink}>
            <img src="/logo-pulsar2.png" alt="Pulsar" style={styles.logo} />
            <span style={styles.logoText}>Pulsar Analytics</span>
          </Link>
        </div>
        
        <div style={styles.formContainer}>
          <div style={styles.formWrapper}>
            <div style={styles.header}>
              <h2 style={styles.title}>Create Account</h2>
              <p style={styles.subtitle}>Join us today</p>
            </div>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              {error && (
                <div style={styles.error}>
                  {error}
                </div>
              )}
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Username</label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  required
                  style={styles.input}
                  placeholder="Choose a username"
                  minLength="3"
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  style={styles.input}
                  placeholder="Enter your email"
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  style={styles.input}
                  placeholder="Create a password"
                  minLength="6"
                />
              </div>
              
              <div style={styles.inputGroup}>
                <label style={styles.label}>Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  style={styles.input}
                  placeholder="Confirm your password"
                />
              </div>
              
              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.button,
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>
            
            <div style={styles.footer}>
              <p style={styles.footerText}>
                Already have an account?{' '}
                <Link to="/login" style={styles.link}>
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Image */}
      <div style={styles.rightSide}>
        <div style={styles.imageContainer}>
          <img 
            src="/register.png" 
            alt="Register illustration" 
            style={styles.sideImage}
          />
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'row',
    background: 'white'
  },
  leftSide: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'white',
    padding: '20px',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '50%'
  },
  rightSide: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#141517',
    minWidth: '50%'
  },
  logoHeader: {
    position: 'absolute',
    top: '30px',
    left: '30px',
    zIndex: 1000
  },
  logoLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
    textDecoration: 'none'
  },
  logo: {
    width: '50px',
    height: '60px'
  },
  logoText: {
    fontWeight: '700',
    fontSize: '24px',
    color: '#000000'
  },
  formContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%'
  },
  formWrapper: {
    backgroundColor: '#f9fafb',
    padding: '40px',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    width: '100%',
    maxWidth: '400px'
  },
  imageContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px'
  },
  sideImage: {
    maxWidth: '100%',
    maxHeight: '80vh',
    width: 'auto',
    height: 'auto',
    borderRadius: '12px',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.1)'
  },
  header: {
    textAlign: 'center',
    marginBottom: '30px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#000000',
    margin: '0 0 8px 0'
  },
  subtitle: {
    fontSize: '16px',
    color: '#000000',
    margin: 0
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px'
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  label: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#000000'
  },
  input: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '16px',
    transition: 'border-color 0.2s ease',
    outline: 'none'
  },
  select: {
    padding: '12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '16px',
    backgroundColor: '#e5e7eb',
    outline: 'none'
  },
  button: {
    backgroundColor: '#667eea',
    color: 'white',
    padding: '12px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    marginTop: '10px'
  },
  error: {
    backgroundColor: '#fed7d7',
    color: '#c53030',
    padding: '12px',
    borderRadius: '8px',
    fontSize: '14px',
    textAlign: 'center'
  },
  footer: {
    textAlign: 'center',
    marginTop: '30px'
  },
  footerText: {
    fontSize: '14px',
    color: '#000000',
    margin: 0
  },
  link: {
    color: '#667eea',
    textDecoration: 'none',
    fontWeight: '600'
  }
};

export default Register; 