import React, { useState, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const GroupChatManager = ({ show, onClose }) => {
  const { createChat, chats } = useChat();
  const { user } = useAuth();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Basic info, 2: Add members, 3: Settings

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  useEffect(() => {
    if (userSearch.length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [userSearch]);

  const searchUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('cipherchat_token');
      const response = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(userSearch)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        // Filter out current user and already selected users
        const filtered = data.data.users.filter(u => 
          u._id !== user?.id && !selectedUsers.some(su => su._id === u._id)
        );
        setSearchResults(filtered);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUser = (userToAdd) => {
    setSelectedUsers([...selectedUsers, userToAdd]);
    setUserSearch('');
    setSearchResults([]);
  };

  const handleRemoveUser = (userToRemove) => {
    setSelectedUsers(selectedUsers.filter(u => u._id !== userToRemove._id));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      alert('Please enter a group name and add at least one member');
      return;
    }

    try {
      const token = localStorage.getItem('cipherchat_token');
      const response = await fetch(`${API_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'group',
          name: groupName.trim(),
          description: groupDescription.trim(),
          participants: selectedUsers.map(u => u._id),
        }),
      });

      const data = await response.json();
      if (response.ok) {
        onClose();
        // Reset form
        setGroupName('');
        setGroupDescription('');
        setSelectedUsers([]);
        setStep(1);
      } else {
        alert(data.message || 'Failed to create group');
      }
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    }
  };

  if (!show) return null;

  return (
    <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered modal-lg">
        <div className="modal-content bg-dark border-success">
          <div className="modal-header border-secondary">
            <h5 className="modal-title text-success">
              {step === 1 && 'Create Group Chat'}
              {step === 2 && 'Add Members'}
              {step === 3 && 'Group Settings'}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div>
                <div className="mb-3">
                  <label className="form-label text-success">Group Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name"
                    style={{ backgroundColor: '#21262d', borderColor: '#30363d', color: '#c9d1d9' }}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-success">Group Description</label>
                  <textarea
                    className="form-control"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Enter group description (optional)"
                    rows={3}
                    style={{ backgroundColor: '#21262d', borderColor: '#30363d', color: '#c9d1d9' }}
                  />
                </div>
                <div className="d-flex justify-content-between">
                  <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
                  <button 
                    className="btn btn-success" 
                    onClick={() => setStep(2)}
                    disabled={!groupName.trim()}
                  >
                    Next: Add Members
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Add Members */}
            {step === 2 && (
              <div>
                <div className="mb-3">
                  <label className="form-label text-success">Add Members</label>
                  <input
                    type="text"
                    className="form-control"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search users to add..."
                    style={{ backgroundColor: '#21262d', borderColor: '#30363d', color: '#c9d1d9' }}
                  />
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mb-3">
                    <small className="text-muted">Search Results:</small>
                    <div className="list-group">
                      {searchResults.map((searchUser) => (
                        <div key={searchUser._id} className="list-group-item bg-dark border-secondary">
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="d-flex align-items-center">
                              <img
                                src={searchUser.avatar || `https://ui-avatars.com/api/?name=${searchUser.username}&background=28a745&color=fff&size=32`}
                                alt={searchUser.username}
                                className="rounded-circle me-2"
                                width="32"
                                height="32"
                              />
                              <div>
                                <div className="text-light">{searchUser.username}</div>
                                <small className="text-muted">{searchUser.status}</small>
                              </div>
                            </div>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleAddUser(searchUser)}
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Members */}
                {selectedUsers.length > 0 && (
                  <div className="mb-3">
                    <small className="text-success">Selected Members ({selectedUsers.length}):</small>
                    <div className="d-flex flex-wrap gap-2 mt-2">
                      {selectedUsers.map((selectedUser) => (
                        <div key={selectedUser._id} className="badge bg-success d-flex align-items-center gap-1">
                          <img
                            src={selectedUser.avatar || `https://ui-avatars.com/api/?name=${selectedUser.username}&background=28a745&color=fff&size=20`}
                            alt={selectedUser.username}
                            className="rounded-circle"
                            width="20"
                            height="20"
                          />
                          {selectedUser.username}
                          <button
                            className="btn btn-sm btn-outline-light p-0"
                            onClick={() => handleRemoveUser(selectedUser)}
                            style={{ fontSize: '12px', lineHeight: '1' }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="d-flex justify-content-between">
                  <button className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
                  <button 
                    className="btn btn-success" 
                    onClick={() => setStep(3)}
                    disabled={selectedUsers.length === 0}
                  >
                    Next: Settings
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Settings */}
            {step === 3 && (
              <div>
                <div className="mb-3">
                  <h6 className="text-success">Group Summary</h6>
                  <div className="bg-secondary p-3 rounded">
                    <p><strong>Name:</strong> {groupName}</p>
                    <p><strong>Description:</strong> {groupDescription || 'None'}</p>
                    <p><strong>Members:</strong> {selectedUsers.length + 1} (including you)</p>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label text-success">Group Settings</label>
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="allowInvites" defaultChecked />
                    <label className="form-check-label text-light" htmlFor="allowInvites">
                      Allow members to invite others
                    </label>
                  </div>
                  <div className="form-check">
                    <input className="form-check-input" type="checkbox" id="allowEdit" defaultChecked />
                    <label className="form-check-label text-light" htmlFor="allowEdit">
                      Allow members to edit group info
                    </label>
                  </div>
                </div>

                <div className="d-flex justify-content-between">
                  <button className="btn btn-secondary" onClick={() => setStep(2)}>Back</button>
                  <button className="btn btn-success" onClick={handleCreateGroup}>
                    Create Group
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GroupChatManager;
