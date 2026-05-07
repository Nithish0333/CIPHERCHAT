import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const UserProfileModal = ({ user, show, onClose, onSendFriendRequest, isFriend = false }) => {
  const { user: currentUser } = useAuth();
  const { selectChat } = useChat();
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  const handleStartChat = async () => {
    try {
      // Create a private chat with this user
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';
      const token = localStorage.getItem('cipherchat_token');
      
      const response = await fetch(`${API_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'private',
          participants: [user._id],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Select the created chat
        await selectChat(data.data.chat._id);
        onClose();
      } else {
        // If chat already exists, try to find and select it
        if (data.message && data.message.includes('already exists')) {
          await selectChat(data.data.chat._id);
          onClose();
        } else {
          console.error('Error creating chat:', data.message);
        }
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const handleSendFriendRequest = async () => {
    if (isSendingRequest || requestSent) return;
    
    setIsSendingRequest(true);
    try {
      await onSendFriendRequest(user._id);
      setRequestSent(true);
    } catch (error) {
      console.error('Error sending friend request:', error);
    } finally {
      setIsSendingRequest(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-success';
      case 'away':
        return 'bg-warning';
      case 'busy':
        return 'bg-danger';
      default:
        return 'bg-secondary';
    }
  };

  if (!show || !user) return null;

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content bg-dark border-success">
          <div className="modal-header border-secondary">
            <h5 className="modal-title text-success">User Profile</h5>
            <button 
              type="button" 
              className="btn-close btn-close-white" 
              onClick={onClose}
            ></button>
          </div>
          
          <div className="modal-body">
            {/* Profile Header */}
            <div className="text-center mb-4">
              <div className="position-relative d-inline-block">
                <img
                  src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=28a745&color=fff&size=80`}
                  alt={user.username}
                  className="rounded-circle mb-3"
                  width="120"
                  height="120"
                />
                <span className={`position-absolute bottom-3 end-0 badge ${getStatusColor(user.status)}`} 
                      style={{ fontSize: '0.8rem', padding: '4px 8px' }}>
                  {user.status}
                </span>
              </div>
              
              <h4 className="text-success mb-1">{user.username}</h4>
              <p className="text-muted mb-2">{user.email}</p>
              
              {user.bio && (
                <p className="text-light mb-3">{user.bio}</p>
              )}
            </div>

            {/* User Stats */}
            <div className="row text-center mb-4">
              <div className="col-4">
                <div className="text-success fw-bold">
                  {user.friendsCount || 0}
                </div>
                <small className="text-muted">Friends</small>
              </div>
              <div className="col-4">
                <div className="text-success fw-bold">
                  {user.status === 'online' ? 'Active' : 'Offline'}
                </div>
                <small className="text-muted">Status</small>
              </div>
              <div className="col-4">
                <div className="text-success fw-bold">
                  {new Date(user.createdAt || Date.now()).toLocaleDateString()}
                </div>
                <small className="text-muted">Joined</small>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="d-grid gap-2">
              <button
                className="btn btn-success"
                onClick={handleStartChat}
                disabled={currentUser?._id === user._id}
              >
                <i className="bi bi-chat-dots me-2"></i>
                {currentUser?._id === user._id ? 'This is you' : 'Start Chat'}
              </button>

              {!isFriend && currentUser?._id !== user._id && (
                <button
                  className={`btn ${requestSent ? 'btn-outline-secondary' : 'btn-outline-success'}`}
                  onClick={handleSendFriendRequest}
                  disabled={isSendingRequest || requestSent}
                >
                  {isSendingRequest ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Sending...
                    </>
                  ) : requestSent ? (
                    <>
                      <i className="bi bi-check-circle me-2"></i>
                      Request Sent
                    </>
                  ) : (
                    <>
                      <i className="bi bi-person-plus me-2"></i>
                      Send Friend Request
                    </>
                  )}
                </button>
              )}

              {isFriend && (
                <div className="text-center text-muted">
                  <i className="bi bi-check-circle-fill text-success me-2"></i>
                  Already friends
                </div>
              )}
            </div>
          </div>

          <div className="modal-footer border-secondary">
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;
