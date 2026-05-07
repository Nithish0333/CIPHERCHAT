import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const StatusManager = ({ show, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('myStatus'); // myStatus, recent, viewed
  const [statuses, setStatuses] = useState([]);
  const [myStatuses, setMyStatuses] = useState([]);
  const [viewedStatuses, setViewedStatuses] = useState([]);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [isViewingStatus, setIsViewingStatus] = useState(false);
  const [statusProgress, setStatusProgress] = useState(0);
  const [showStatusUpload, setShowStatusUpload] = useState(false);
  const [statusText, setStatusText] = useState('');
  const [statusImage, setStatusImage] = useState(null);
  const [statusDuration, setStatusDuration] = useState(5000); // 5 seconds per status

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    if (show) {
      fetchStatuses();
    }
  }, [show]);

  useEffect(() => {
    if (isViewingStatus) {
      const interval = setInterval(() => {
        setStatusProgress(prev => {
          if (prev >= 100) {
            handleNextStatus();
            return 0;
          }
          return prev + (100 / (statusDuration / 100));
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [isViewingStatus, currentStatusIndex, statusDuration]);

  const fetchStatuses = async () => {
    try {
      const token = localStorage.getItem('cipherchat_token');
      const response = await fetch(`${API_URL}/status`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setStatuses(data.data.statuses || []);
        setMyStatuses(data.data.myStatuses || []);
        setViewedStatuses(data.data.viewedStatuses || []);
      }
    } catch (error) {
      console.error('Error fetching statuses:', error);
    }
  };

  const handleUploadStatus = async () => {
    if (!statusText.trim() && !statusImage) {
      alert('Please add text or image for your status');
      return;
    }

    try {
      const token = localStorage.getItem('cipherchat_token');
      const formData = new FormData();
      
      if (statusText.trim()) {
        formData.append('text', statusText.trim());
      }
      
      if (statusImage) {
        formData.append('image', statusImage);
      }
      
      formData.append('duration', statusDuration);

      const response = await fetch(`${API_URL}/status`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();
      if (response.ok) {
        setShowStatusUpload(false);
        setStatusText('');
        setStatusImage(null);
        fetchStatuses();
      } else {
        alert(data.message || 'Failed to upload status');
      }
    } catch (error) {
      console.error('Error uploading status:', error);
      alert('Failed to upload status');
    }
  };

  const handleViewStatus = (statusList, startIndex = 0) => {
    setCurrentStatusIndex(startIndex);
    setIsViewingStatus(true);
    setStatusProgress(0);
  };

  const handleNextStatus = () => {
    const currentList = activeTab === 'myStatus' ? myStatuses : 
                        activeTab === 'recent' ? statuses.filter(s => !viewedStatuses.includes(s._id)) :
                        statuses;

    if (currentStatusIndex < currentList.length - 1) {
      setCurrentStatusIndex(currentStatusIndex + 1);
      setStatusProgress(0);
    } else {
      handleCloseStatusView();
    }
  };

  const handlePreviousStatus = () => {
    if (currentStatusIndex > 0) {
      setCurrentStatusIndex(currentStatusIndex - 1);
      setStatusProgress(0);
    }
  };

  const handleCloseStatusView = () => {
    setIsViewingStatus(false);
    setCurrentStatusIndex(0);
    setStatusProgress(0);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setStatusImage(file);
    }
  };

  const getCurrentStatus = () => {
    const currentList = activeTab === 'myStatus' ? myStatuses : 
                        activeTab === 'recent' ? statuses.filter(s => !viewedStatuses.includes(s._id)) :
                        statuses;
    return currentList[currentStatusIndex] || null;
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  if (!show) return null;

  const currentStatus = getCurrentStatus();

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content bg-dark border-success">
          <div className="modal-header border-secondary">
            <h5 className="modal-title text-success">Status</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body p-0">
            {/* Status Upload Modal */}
            {showStatusUpload && (
              <div className="p-3 border-bottom border-secondary">
                <h6 className="text-success mb-3">Upload Status</h6>
                <div className="mb-3">
                  <textarea
                    className="form-control mb-2"
                    placeholder="What's on your mind?"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    rows={3}
                    style={{ backgroundColor: '#21262d', borderColor: '#30363d', color: '#c9d1d9' }}
                  />
                </div>
                <div className="mb-3">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="form-control"
                    style={{ backgroundColor: '#21262d', borderColor: '#30363d', color: '#c9d1d9' }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-success">Duration (seconds)</label>
                  <select
                    className="form-select"
                    value={statusDuration / 1000}
                    onChange={(e) => setStatusDuration(parseInt(e.target.value) * 1000)}
                    style={{ backgroundColor: '#21262d', borderColor: '#30363d', color: '#c9d1d9' }}
                  >
                    <option value={5}>5 seconds</option>
                    <option value={10}>10 seconds</option>
                    <option value={15}>15 seconds</option>
                    <option value={30}>30 seconds</option>
                  </select>
                </div>
                <div className="d-flex gap-2">
                  <button className="btn btn-success" onClick={handleUploadStatus}>
                    Upload Status
                  </button>
                  <button className="btn btn-secondary" onClick={() => setShowStatusUpload(false)}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Status View Modal */}
            {isViewingStatus && currentStatus && (
              <div className="status-viewer bg-black d-flex flex-column align-items-center justify-content-center" style={{ height: '400px' }}>
                <div className="w-100 position-relative">
                  {/* Progress Bar */}
                  <div className="progress mb-3" style={{ height: '3px' }}>
                    <div
                      className="progress-bar bg-success"
                      style={{ width: `${statusProgress}%` }}
                    />
                  </div>

                  {/* Status Content */}
                  <div className="text-center text-white p-3">
                    {currentStatus.imageUrl && (
                      <img
                        src={currentStatus.imageUrl}
                        alt="Status"
                        className="img-fluid rounded mb-3"
                        style={{ maxHeight: '300px' }}
                      />
                    )}
                    {currentStatus.text && (
                      <p className="mb-3">{currentStatus.text}</p>
                    )}
                    <small className="text-muted">
                      {formatTimeAgo(currentStatus.createdAt)}
                    </small>
                  </div>

                  {/* Navigation Controls */}
                  <div className="position-absolute top-50 start-0 translate-middle-y">
                    <button
                      className="btn btn-outline-light btn-sm"
                      onClick={handlePreviousStatus}
                      disabled={currentStatusIndex === 0}
                    >
                      <i className="bi bi-chevron-left"></i>
                    </button>
                  </div>
                  <div className="position-absolute top-50 end-0 translate-middle-y">
                    <button
                      className="btn btn-outline-light btn-sm"
                      onClick={handleNextStatus}
                    >
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </div>
                </div>

                <button className="btn btn-outline-secondary mt-3" onClick={handleCloseStatusView}>
                  Close
                </button>
              </div>
            )}

            {/* Status Tabs */}
            {!isViewingStatus && !showStatusUpload && (
              <>
                <div className="btn-group w-100" role="group">
                  <button
                    className={`btn ${activeTab === 'myStatus' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setActiveTab('myStatus')}
                  >
                    My Status
                  </button>
                  <button
                    className={`btn ${activeTab === 'recent' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setActiveTab('recent')}
                  >
                    Recent Updates
                  </button>
                  <button
                    className={`btn ${activeTab === 'viewed' ? 'btn-success' : 'btn-outline-success'}`}
                    onClick={() => setActiveTab('viewed')}
                  >
                    Viewed Updates
                  </button>
                </div>

                <div className="p-3">
                  {/* My Status */}
                  {activeTab === 'myStatus' && (
                    <div>
                      <div className="d-flex align-items-center justify-content-between mb-3">
                        <h6 className="text-success">My Status</h6>
                        <button
                          className="btn btn-sm btn-success"
                          onClick={() => setShowStatusUpload(true)}
                        >
                          <i className="bi bi-plus"></i> Add Status
                        </button>
                      </div>
                      
                      {myStatuses.length === 0 ? (
                        <div className="text-center text-muted">
                          <i className="bi bi-image" style={{ fontSize: '3rem' }}></i>
                          <p className="mt-2">No status updates yet</p>
                          <button
                            className="btn btn-success"
                            onClick={() => setShowStatusUpload(true)}
                          >
                            Add Status
                          </button>
                        </div>
                      ) : (
                        <div className="d-flex gap-3 overflow-auto">
                          {myStatuses.map((status, index) => {
                            if (!status || !status._id) return null;
                            return (
                              <div
                                key={status._id}
                                className="status-item text-center"
                                style={{ cursor: 'pointer', minWidth: '80px' }}
                                onClick={() => handleViewStatus(myStatuses, index)}
                              >
                                <div className="status-avatar position-relative">
                                  <img
                                    src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=28a745&color=fff&size=60`}
                                    alt="My Status"
                                    className="rounded-circle"
                                    width="60"
                                    height="60"
                                  />
                                  {status.imageUrl && (
                                    <div className="status-image-preview position-absolute bottom-0 end-0">
                                      <img
                                        src={status.imageUrl}
                                        alt="Status"
                                        className="rounded-circle"
                                        width="20"
                                        height="20"
                                      />
                                    </div>
                                  )}
                                </div>
                                <small className="text-muted d-block mt-1">
                                  {formatTimeAgo(status.createdAt)}
                                </small>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Recent Updates */}
                  {activeTab === 'recent' && (
                    <div>
                      <h6 className="text-success mb-3">Recent Updates</h6>
                      {statuses.filter(s => !viewedStatuses.includes(s._id)).length === 0 ? (
                        <div className="text-center text-muted">
                          <p>No recent status updates</p>
                        </div>
                      ) : (
                        <div className="d-flex gap-3 overflow-auto">
                          {statuses.filter(s => !viewedStatuses.includes(s._id)).map((status, index) => {
                            if (!status || !status._id) return null;
                            return (
                              <div
                                key={status._id}
                                className="status-item text-center"
                                style={{ cursor: 'pointer', minWidth: '80px' }}
                                onClick={() => handleViewStatus(statuses.filter(s => !viewedStatuses.includes(s._id)), index)}
                              >
                                <div className="status-avatar position-relative">
                                  <img
                                    src={status.user.avatar || `https://ui-avatars.com/api/?name=${status.user.username}&background=28a745&color=fff&size=60`}
                                    alt={status.user.username}
                                    className="rounded-circle"
                                    width="60"
                                    height="60"
                                  />
                                  {status.imageUrl && (
                                    <div className="status-image-preview position-absolute bottom-0 end-0">
                                      <img
                                        src={status.imageUrl}
                                        alt="Status"
                                        className="rounded-circle"
                                        width="20"
                                        height="20"
                                      />
                                    </div>
                                  )}
                                </div>
                                <small className="text-muted d-block mt-1">
                                  {status.user.username}
                                </small>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Viewed Updates */}
                  {activeTab === 'viewed' && (
                    <div>
                      <h6 className="text-success mb-3">Viewed Updates</h6>
                      {viewedStatuses.length === 0 ? (
                        <div className="text-center text-muted">
                          <p>No viewed status updates</p>
                        </div>
                      ) : (
                        <div className="d-flex gap-3 overflow-auto">
                          {viewedStatuses.map((statusId) => {
                            const status = statuses.find(s => s._id === statusId);
                            if (!status) return null;
                            return (
                              <div
                                key={status._id}
                                className="status-item text-center opacity-50"
                                style={{ cursor: 'pointer', minWidth: '80px' }}
                                onClick={() => handleViewStatus([status], 0)}
                              >
                                <div className="status-avatar position-relative">
                                  <img
                                    src={status.user.avatar || `https://ui-avatars.com/api/?name=${status.user.username}&background=28a745&color=fff&size=60`}
                                    alt={status.user.username}
                                    className="rounded-circle"
                                    width="60"
                                    height="60"
                                  />
                                  {status.imageUrl && (
                                    <div className="status-image-preview position-absolute bottom-0 end-0">
                                      <img
                                        src={status.imageUrl}
                                        alt="Status"
                                        className="rounded-circle"
                                        width="20"
                                        height="20"
                                      />
                                    </div>
                                  )}
                                </div>
                                <small className="text-muted d-block mt-1">
                                  {status.user.username}
                                </small>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatusManager;
