import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DemoCredentials from '../components/DemoCredentials';
import 'bootstrap/dist/css/bootstrap.min.css';

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [errors, setErrors] = useState([]);
  const { login, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setErrors([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors([]);

    // Basic validation
    const newErrors = [];
    if (!formData.username) newErrors.push('Username is required');
    if (!formData.password) newErrors.push('Password is required');
    if (formData.username && formData.username.length < 3) newErrors.push('Username must be at least 3 characters');

    if (newErrors.length > 0) {
      setErrors(newErrors);
      return;
    }

    const success = await login(formData.username, formData.password);
    if (success) {
      navigate('/chat');
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="text-center mb-4">
          <h1 className="cyber-title mb-3">CipherChat</h1>
          <p className="terminal-text">Secure Communication Terminal</p>
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
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="mb-4">
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
              placeholder="Enter your password"
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
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                Authenticating...
              </>
            ) : (
              <>
                <span className="terminal-cursor me-2"></span>
                Login
              </>
            )}
          </button>

          <div className="text-center">
            <p className="mb-0">
              Don't have an account?{' '}
              <Link to="/register" className="text-success text-decoration-none">
                Register here
              </Link>
            </p>
          </div>
        </form>

        <DemoCredentials />

        <div className="mt-4 text-center">
          <small className="text-muted">
            <span className="terminal-text">End-to-end encryption enabled</span>
          </small>
        </div>
      </div>
    </div>
  );
};

export default Login;
