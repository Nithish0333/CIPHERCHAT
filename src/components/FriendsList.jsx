import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import UserProfileModal from './UserProfileModal';
import 'bootstrap/dist/css/bootstrap.min.css';

const FriendsList = ({ onSelectFriend }) => {
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingFriend, setRemovingFriend] = useState(new Set());
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [contextMenuFriend, setContextMenuFriend] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  const fetchFriends = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('cipherchat_token');
      const response = await axios.get(`${API_URL}/friends/list`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setFriends(response.data);
    } catch (error) {
      console.error('Fetch friends error:', error);
      setError('Failed to fetch friends');
    } finally {
      setLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchFriends();
  }, [fetchFriends]);

  const removeFriend = async (friendId) => {
    if (removingFriend.has(friendId)) return;

    if (!window.confirm('Are you sure you want to remove this friend?')) {
      return;
    }

    setRemovingFriend(prev => new Set(prev).add(friendId));

    try {
      const token = localStorage.getItem('cipherchat_token');
      await axios.delete(`${API_URL}/friends/friends/${friendId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      // Remove from friends list
      setFriends(prev => prev.filter(friend => friend._id !== friendId));
    } catch (error) {
      console.error('Remove friend error:', error);
      setError('Failed to remove friend');
    } finally {
      setRemovingFriend(prev => {
        const newSet = new Set(prev);
        newSet.delete(friendId);
        return newSet;
      });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'online':
        return 'bg-success';
      case 'away':
        return 'bg-warning';
      default:
        return 'bg-secondary';
    }
  };

  const handleViewProfile = (friend) => {
    setSelectedFriend(friend);
    setShowProfileModal(true);
  };

  const handleCloseProfile = () => {
    setShowProfileModal(false);
    setSelectedFriend(null);
  };

  const handleContextMenu = (e, friend) => {
    e.preventDefault();
    e.stopPropagation();
    
    setContextMenuFriend(friend);
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleStartChatFromMenu = (friend) => {
    setShowContextMenu(false);
    handleStartChat(friend);
  };

  const handleViewProfileFromMenu = (friend) => {
    setShowContextMenu(false);
    handleViewProfile(friend);
  };

  const closeContextMenu = () => {
    setShowContextMenu(false);
    setContextMenuFriend(null);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      closeContextMenu();
    };

    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [showContextMenu]);

  const handleStartChat = async (friend) => {
    try {
      // Create a private chat with this friend
      const token = localStorage.getItem('cipherchat_token');
      
      const response = await fetch(`${API_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'private',
          participants: [friend._id],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Select the created chat
        await onSelectFriend(data.data.chat);
      } else {
        // If chat already exists, try to find and select it
        if (data.message && data.message.includes('already exists')) {
          await onSelectFriend(data.data.chat);
        } else {
          console.error('Error creating chat:', data.message);
        }
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  return (
    <div className="friends-list">
      <div className="card bg-dark border-success">
        <div className="card-header border-secondary">
          <h5 className="text-success mb-0">Friends</h5>
        </div>
        <div className="card-body">
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center text-success">
              <div className="spinner-border spinner-border-sm me-2"></div>
              Loading...
            </div>
          ) : (
            <div className="friends-container">
              {friends.map((friend) => (
                <div key={friend._id} className="d-flex align-items-center justify-content-between p-2 mb-2 bg-secondary rounded friend-item">
                  <div 
                    className="d-flex align-items-center flex-grow-1"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleStartChat(friend)}
                    onContextMenu={(e) => handleContextMenu(e, friend)}
                  >
                    <div className="position-relative me-2">
                      <img
                        src={friend.avatar || `https://ui-avatars.com/api/?name=${friend.username}&background=28a745&color=fff&size=40`}
                        alt={friend.username}
                        className="rounded-circle"
                        width="40"
                        height="40"
                      />
                      <span className={`position-absolute bottom-0 end-0 badge ${getStatusColor(friend.onlineStatus)}`} 
                            style={{ fontSize: '0.6rem', padding: '2px 4px' }}>
                      </span>
                    </div>
                    <div>
                      <div className="text-light fw-bold">{friend.username}</div>
                      <div className="text-muted small">{friend.email}</div>
                    </div>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => handleStartChat(friend)}
                      title="Start chat"
                    >
                      <i className="bi bi-chat-dots-fill"></i>
                    </button>
                    <button
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => removeFriend(friend._id)}
                      disabled={removingFriend.has(friend._id)}
                      title="Remove friend"
                    >
                      {removingFriend.has(friend._id) ? (
                        <span className="spinner-border spinner-border-sm"></span>
                      ) : (
                        <i className="bi bi-person-dash"></i>
                      )}
                    </button>
                  </div>
                </div>
              ))}

              {friends.length === 0 && (
                <div className="text-center text-muted">
                  <i className="bi bi-people" style={{ fontSize: '2rem' }}></i>
                  <p className="mb-0 mt-2">No friends yet</p>
                  <small>Search for users and send friend requests to get started!</small>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showProfileModal && selectedFriend && (
        <UserProfileModal
          user={selectedFriend}
          show={showProfileModal}
          onClose={handleCloseProfile}
        />
      )}

      {/* WhatsApp-style Context Menu */}
      {showContextMenu && contextMenuFriend && (
        <div
          className="whatsapp-context-menu"
          style={{
            position: 'fixed',
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
            zIndex: 1000
          }}
        >
          <div className="context-menu-header">
            <img
              src={contextMenuFriend.avatar || `https://ui-avatars.com/api/?name=${contextMenuFriend.username}&background=28a745&color=fff&size=40`}
              alt={contextMenuFriend.username}
              className="rounded-circle me-2"
              width="30"
              height="30"
            />
            <div>
              <div className="fw-bold text-light">{contextMenuFriend.username}</div>
              <div className="text-muted small">
                {contextMenuFriend.onlineStatus === 'online' ? 'Online' : 'Offline'}
              </div>
            </div>
          </div>
          
          <div className="context-menu-divider"></div>
          
          <div className="context-menu-items">
            <button
              className="context-menu-item"
              onClick={() => handleStartChatFromMenu(contextMenuFriend)}
            >
              <i className="bi bi-chat-dots-fill me-2"></i>
              <span>Message</span>
            </button>
            
            <button
              className="context-menu-item"
              onClick={() => handleViewProfileFromMenu(contextMenuFriend)}
            >
              <i className="bi bi-person me-2"></i>
              <span>View Profile</span>
            </button>
            
            <button
              className="context-menu-item"
              onClick={() => {
                closeContextMenu();
                // Copy phone number or other info if available
                navigator.clipboard.writeText(contextMenuFriend.email);
              }}
            >
              <i className="bi bi-clipboard me-2"></i>
              <span>Copy Email</span>
            </button>
            
            <div className="context-menu-divider"></div>
            
            <button
              className="context-menu-item text-danger"
              onClick={() => removeFriend(contextMenuFriend._id)}
            >
              <i className="bi bi-person-dash me-2"></i>
              <span>Remove Friend</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FriendsList;
