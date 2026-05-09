import React, { useState, useEffect } from 'react';
import ApiService from '../services/ApiService';
import UserProfileModal from './UserProfileModal';
import 'bootstrap/dist/css/bootstrap.min.css';

const UserSearch = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sendingRequests, setSendingRequests] = useState(new Set());
  const [selectedUser, setSelectedUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Search users
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const data = await ApiService.getUsers(searchQuery);
        if (data.status === 'success') {
          setSearchResults(data.data.users);
        }
      } catch (error) {
        console.error('Search error:', error);
        setError('Failed to search users');
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // Send friend request
  const handleSendFriendRequest = async (receiverId) => {
    if (sendingRequests.has(receiverId)) return;

    setSendingRequests(prev => new Set(prev).add(receiverId));

    try {
      await ApiService.sendFriendRequest(receiverId);

      // Remove from search results after sending request
      setSearchResults(prev => prev.filter(user => user._id !== receiverId));
    } catch (error) {
      console.error('Send friend request error:', error);
      setError('Failed to send friend request');
    } finally {
      setSendingRequests(prev => {
        const newSet = new Set(prev);
        newSet.delete(receiverId);
        return newSet;
      });
    }
  };

  const handleViewProfile = (user) => {
    setSelectedUser(user);
    setShowProfileModal(true);
  };

  const handleCloseProfile = () => {
    setShowProfileModal(false);
    setSelectedUser(null);
  };

  return (
    <div className="user-search">
      <div className="card bg-dark border-success">
        <div className="card-header border-secondary">
          <h5 className="text-success mb-0">Search Users</h5>
        </div>
        <div className="card-body">
          <div className="mb-3">
            <input
              type="text"
              className="form-control bg-secondary text-light border-success"
              placeholder="Search users by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {loading && (
            <div className="text-center text-success">
              <div className="spinner-border spinner-border-sm me-2"></div>
              Searching...
            </div>
          )}

          <div className="search-results">
            {searchResults.map((user) => (
              <div key={user._id} className="d-flex align-items-center justify-content-between p-2 mb-2 bg-secondary rounded">
                <div 
                  className="d-flex align-items-center flex-grow-1"
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleViewProfile(user)}
                >
                  <img
                    src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=28a745&color=fff&size=40`}
                    alt={user.username}
                    className="rounded-circle me-2"
                    width="40"
                    height="40"
                  />
                  <div>
                    <div className="text-light fw-bold">{user.username}</div>
                    <div className="text-muted small">
                      <span className={`badge ${user.status === 'online' ? 'bg-success' : 'bg-secondary'}`}>
                        {user.status}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <button
                    className="btn btn-outline-success btn-sm"
                    onClick={() => handleViewProfile(user)}
                    title="View Profile"
                  >
                    <i className="bi bi-person"></i>
                  </button>
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => handleSendFriendRequest(user._id)}
                    disabled={sendingRequests.has(user._id)}
                  >
                    {sendingRequests.has(user._id) ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-1"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person-plus me-1"></i>
                        Send Request
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {searchQuery.trim().length >= 2 && !loading && searchResults.length === 0 && !error && (
            <div className="text-center text-muted">
              No users found matching "{searchQuery}"
            </div>
          )}
        </div>
      </div>
      
      {/* Profile Modal */}
      <UserProfileModal
        user={selectedUser}
        show={showProfileModal}
        onClose={handleCloseProfile}
        onSendFriendRequest={handleSendFriendRequest}
        isFriend={false}
      />
    </div>
  );
};

export default UserSearch;
