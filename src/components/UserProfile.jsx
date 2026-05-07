import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const UserProfile = () => {
  const { user, updateProfile, updateSettings } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    avatar: user?.avatar || `https://ui-avatars.com/api/?name=${user?.username || 'User'}&background=28a745&color=fff&size=80`,
    status: user?.onlineStatus || 'online',
    bio: user?.bio || '',
  });
  const [settings, setSettings] = useState({
    notifications: user?.settings?.notifications || true,
    soundEnabled: user?.settings?.soundEnabled || true,
    theme: user?.settings?.theme || 'dark',
    language: user?.settings?.language || 'en',
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSettingsChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSaveProfile = async () => {
    setIsLoading(true);
    try {
      await updateProfile(formData);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsLoading(true);
    try {
      await updateSettings(settings);
    } catch (error) {
      console.error('Error updating settings:', error);
      alert('Failed to update settings. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Avatar image must be less than 5MB');
        return;
      }
      
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Avatar must be an image file');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, avatar: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="user-profile">
      <div className="card bg-dark border-success">
        <div className="card-header border-secondary">
          <h4 className="text-success">User Profile</h4>
        </div>
        <div className="card-body">
          {/* Profile Section */}
          <div className="mb-4">
            <div className="d-flex align-items-center mb-3">
              <div className="position-relative me-3">
                <img
                  src={formData.avatar}
                  alt="Avatar"
                  className="rounded-circle"
                  width="80"
                  height="80"
                />
                {isEditing && (
                  <label className="position-absolute bottom-0 end-0 btn btn-sm btn-success">
                    <i className="bi bi-camera"></i>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
              <div>
                <h5 className="text-success mb-1">{formData.username}</h5>
                <small className="text-muted">{formData.email}</small>
                <div className="mt-1">
                  <span className={`badge ${formData.status === 'online' ? 'bg-success' : 'bg-secondary'}`}>
                    {formData.status}
                  </span>
                </div>
              </div>
            </div>

            {isEditing ? (
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label text-success">Username</label>
                  <input
                    type="text"
                    className="form-control bg-secondary text-light border-success"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label text-success">Status</label>
                  <select
                    className="form-select bg-secondary text-light border-success"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                  >
                    <option value="online">Online</option>
                    <option value="away">Away</option>
                    <option value="busy">Busy</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
                <div className="col-12">
                  <label className="form-label text-success">Bio</label>
                  <textarea
                    className="form-control bg-secondary text-light border-success"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Tell us about yourself..."
                  />
                </div>
                <div className="col-12">
                  <button
                    className="btn btn-success me-2"
                    onClick={handleSaveProfile}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <span className="spinner-border spinner-border-sm me-2"></span>
                    ) : (
                      <i className="bi bi-check me-2"></i>
                    )}
                    Save Profile
                  </button>
                  <button
                    className="btn btn-secondary"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-light mb-2">
                  <strong>Status:</strong> {formData.status}
                </p>
                <p className="text-light mb-3">
                  <strong>Bio:</strong> {formData.bio || 'No bio set'}
                </p>
                <button
                  className="btn btn-outline-success"
                  onClick={() => setIsEditing(true)}
                >
                  <i className="bi bi-pencil me-2"></i>Edit Profile
                </button>
              </div>
            )}
          </div>

          {/* Settings Section */}
          <div className="border-top border-secondary pt-4">
            <h5 className="text-success mb-3">Settings</h5>
            <div className="row g-3">
              <div className="col-md-6">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name="notifications"
                    checked={settings.notifications}
                    onChange={handleSettingsChange}
                  />
                  <label className="form-check-label text-light">
                    Enable Notifications
                  </label>
                </div>
              </div>
              <div className="col-md-6">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name="soundEnabled"
                    checked={settings.soundEnabled}
                    onChange={handleSettingsChange}
                  />
                  <label className="form-check-label text-light">
                    Sound Effects
                  </label>
                </div>
              </div>
              <div className="col-md-6">
                <label className="form-label text-success">Theme</label>
                <select
                  className="form-select bg-secondary text-light border-success"
                  name="theme"
                  value={settings.theme}
                  onChange={handleSettingsChange}
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="cyber">Cyber</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label text-success">Language</label>
                <select
                  className="form-select bg-secondary text-light border-success"
                  name="language"
                  value={settings.language}
                  onChange={handleSettingsChange}
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                </select>
              </div>
              <div className="col-12">
                <button
                  className="btn btn-success"
                  onClick={handleSaveSettings}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="spinner-border spinner-border-sm me-2"></span>
                  ) : (
                    <i className="bi bi-gear me-2"></i>
                  )}
                  Save Settings
                </button>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="border-top border-secondary pt-4">
            <h5 className="text-success mb-3">Security</h5>
            <div className="row g-3">
              <div className="col-12">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-light">End-to-end Encryption</span>
                  <span className="badge bg-success">Active</span>
                </div>
                <small className="text-muted">
                  All messages are encrypted with military-grade encryption
                </small>
              </div>
              <div className="col-12">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <span className="text-light">Two-Factor Authentication</span>
                  <button className="btn btn-sm btn-outline-success">
                    Enable
                  </button>
                </div>
                <small className="text-muted">
                  Add an extra layer of security to your account
                </small>
              </div>
              <div className="col-12">
                <button className="btn btn-outline-danger btn-sm">
                  <i className="bi bi-shield-exclamation me-2"></i>
                  Change Password
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
