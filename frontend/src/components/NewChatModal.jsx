import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const NewChatModal = ({ show, onHide, onCreateChat }) => {
  const { token } = useAuth();
  const [chatType, setChatType] = useState('private');
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedParticipants, setSelectedParticipants] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const searchUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setSearchResults(data.data.users);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, token]);

  useEffect(() => {
    if (searchQuery.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, searchUsers]);

  const handleAddParticipant = (user) => {
    const userId = user._id || user.id;
    if (!selectedParticipants.some(participant => (participant._id || participant.id) === userId)) {
      setSelectedParticipants([...selectedParticipants, user]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleRemoveParticipant = (userId) => {
    setSelectedParticipants(selectedParticipants.filter(participant => (participant._id || participant.id) !== userId));
  };

  const handleCreateChat = async () => {
    if (selectedParticipants.length === 0) return;

    setIsCreating(true);
    try {
      const chatName = chatType === 'group' ? groupName : undefined;
      const participantIds = selectedParticipants.map(participant => participant._id || participant.id);
      const result = await onCreateChat(participantIds, chatType, chatName);
      
      if (result) {
        onHide();
        // Reset form
        setChatType('private');
        setGroupName('');
        setSelectedParticipants([]);
        setSearchQuery('');
      }
    } catch (error) {
      console.error('Error creating chat:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const isFormValid = () => {
    if (selectedParticipants.length === 0) return false;
    if (chatType === 'group' && !groupName.trim()) return false;
    return true;
  };

  return (
    <div className={`modal fade ${show ? 'show d-block' : ''}`} tabIndex={-1} style={{ backgroundColor: show ? 'rgba(0,0,0,0.5)' : 'transparent' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content bg-dark border-success">
          <div className="modal-header border-secondary">
            <h5 className="modal-title text-success">Create New Conversation</h5>
            <button type="button" className="btn-close btn-close-white" onClick={onHide}></button>
          </div>
          
          <div className="modal-body">
            {/* Chat Type Selection */}
            <div className="mb-3">
              <label className="form-label text-success">Chat Type</label>
              <div className="btn-group w-100" role="group">
                <input
                  type="radio"
                  className="btn-check"
                  name="chatType"
                  id="private"
                  value="private"
                  checked={chatType === 'private'}
                  onChange={(e) => setChatType(e.target.value)}
                />
                <label className="btn btn-outline-success" htmlFor="private">
                  <i className="bi bi-person me-2"></i>Private
                </label>
                
                <input
                  type="radio"
                  className="btn-check"
                  name="chatType"
                  id="group"
                  value="group"
                  checked={chatType === 'group'}
                  onChange={(e) => setChatType(e.target.value)}
                />
                <label className="btn btn-outline-success" htmlFor="group">
                  <i className="bi bi-people me-2"></i>Group
                </label>
              </div>
            </div>

            {/* Group Name (for group chats) */}
            {chatType === 'group' && (
              <div className="mb-3">
                <label htmlFor="groupName" className="form-label text-success">Group Name</label>
                <input
                  type="text"
                  className="form-control bg-secondary text-light border-success"
                  id="groupName"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                />
              </div>
            )}

            {/* Add Participants */}
            <div className="mb-3">
              <label className="form-label text-success">Add Participants</label>
              <div className="position-relative">
                <input
                  type="text"
                  className="form-control bg-secondary text-light border-success"
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {isLoading && (
                  <div className="position-absolute" style={{ right: '10px', top: '8px' }}>
                    <div className="spinner-border spinner-border-sm text-success" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 border border-success rounded bg-secondary">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="d-flex align-items-center p-2 border-bottom border-secondary"
                      style={{ cursor: 'pointer' }}
                      onClick={() => handleAddParticipant(user)}
                    >
                      <img
                        src={user.avatar}
                        alt={user.username}
                        className="rounded-circle me-2"
                        width="32"
                        height="32"
                      />
                      <div className="flex-grow-1">
                        <div className="text-light">{user.username}</div>
                        <small className="text-muted">
                          <span className={`me-1 ${user.status === 'online' ? 'online-indicator' : 'offline-indicator'}`}></span>
                          {user.status}
                        </small>
                      </div>
                      <i className="bi bi-plus-circle text-success"></i>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Participants */}
            {selectedParticipants.length > 0 && (
              <div className="mb-3">
                <label className="form-label text-success">Selected Participants</label>
                <div className="d-flex flex-wrap gap-2">
                  {selectedParticipants.map((participant) => {
                    const userId = participant._id || participant.id;
                    return (
                      <span key={userId} className="badge bg-success d-flex align-items-center">
                        {participant.username || `User ${userId}`}
                        <button
                          className="btn btn-sm btn-link text-light p-0 ms-2"
                          onClick={() => handleRemoveParticipant(userId)}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          <div className="modal-footer border-secondary">
            <button type="button" className="btn btn-secondary" onClick={onHide}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-success"
              onClick={handleCreateChat}
              disabled={!isFormValid() || isCreating}
            >
              {isCreating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Creating...
                </>
              ) : (
                <>
                  <i className="bi bi-chat-dots me-2"></i>
                  Create Chat
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewChatModal;
