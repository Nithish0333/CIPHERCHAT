import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState([]);
  const [cooldown, setCooldown] = useState(0);
  const { register, isLoading } = useAuth();
  const navigate = useNavigate();
  const submitTimeRef = useRef(0);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    // Check cooldown (prevent rapid successive submissions)
    const now = Date.now();
    if (now - submitTimeRef.current < 3000) {
      setErrors(['Please wait a moment before trying again']);
      return;
    }

    // Validation
    const newErrors = [];
    if (!formData.username) newErrors.push('Username is required');
    if (formData.username && formData.username.length < 3) newErrors.push('Username must be at least 3 characters');
    if (formData.username && !/^[a-zA-Z0-9_]+$/.test(formData.username)) {
      newErrors.push('Username can only contain letters, numbers, and underscores');
    }
    if (!formData.email) newErrors.push('Email is required');
    if (formData.email && !formData.email.includes('@')) newErrors.push('Invalid email format');
    if (!formData.password) newErrors.push('Password is required');
    if (formData.password && formData.password.length < 6) newErrors.push('Password must be at least 6 characters');
    if (
      formData.password &&
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)
    ) {
      newErrors.push('Password must include uppercase, lowercase, and a number');
    }
    if (formData.password !== formData.confirmPassword) newErrors.push('Passwords do not match');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    submitTimeRef.current = now;
    const registrationResult = await register(formData.username, formData.email, formData.password);

    if (registrationResult === 'success') {
      navigate('/chat');
      return;
    }

    if (registrationResult === 'pending') {
      navigate('/login');
      return;
    }

    // Start cooldown on error
    setCooldown(3);
    const interval = setInterval(() => {
      setCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="text-center mb-4">
          <h1 className="cyber-title mb-3">CipherChat</h1>
          <p className="terminal-text">Create Secure Identity</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="username" className="form-label text-success">
              Username
            </label>
            <input
              type="text"
              className="form-control"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Choose a username"
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="email" className="form-label text-success">
              Email Address
            </label>
            <input
              type="email"
              className="form-control"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="mb-3">
            <label htmlFor="password" className="form-label text-success">
              Password
            </label>
            <input
              type="password"
              className="form-control"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Create a password"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="confirmPassword" className="form-label text-success">
              Confirm Password
            </label>
            <input
              type="password"
              className="form-control"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
            />
          </div>

          {errors.length > 0 && (
            <div className="alert alert-danger" role="alert">
              {errors.map((error, index) => (
                <div key={index} className="small">{error}</div>
              ))}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary w-100 mb-3"
            disabled={isLoading || cooldown > 0}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Creating Account...
              </>
            ) : cooldown > 0 ? (
              <>
                <span className="me-2">⏳</span>
                Wait {cooldown}s...
              </>
            ) : (
              <>
                <span className="terminal-cursor me-2"></span>
                Register
              </>
            )}
          </button>

          <div className="text-center">
            <p className="mb-0">
              Already have an account?{' '}
              <Link to="/login" className="text-success text-decoration-none">
                Login here
              </Link>
            </p>
          </div>
        </form>

        <div className="mt-4 text-center">
          <small className="text-muted">
            <span className="terminal-text">Military-grade encryption activated</span>
          </small>
        </div>
      </div>
    </div>
  );
};

export default Register;
