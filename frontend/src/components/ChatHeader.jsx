import React, { useState } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const ChatHeader = ({ chat }) => {
  const { leaveChat } = useChat();
  const { user } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);

  const getChatDisplayName = () => {
    if (chat.type === 'private') {
      const otherUser = chat.participants.find(p => p.user._id !== user?.id);
      return otherUser?.user.username || 'Unknown User';
    }
    return chat.name || 'Group Chat';
  };

  const getChatAvatar = () => {
    if (chat.type === 'private') {
      const otherUser = chat.participants.find(p => p.user._id !== user?.id);
      return otherUser?.user.avatar || 'https://ui-avatars.com/api/?name=User&background=0d1117&color=00ff41&bold=true';
    }
    return chat.avatar || 'https://ui-avatars.com/api/?name=Group&background=0d1117&color=00ff41&bold=true';
  };

  const getChatStatus = () => {
    if (chat.type === 'private') {
      const otherUser = chat.participants.find(p => p.user._id !== user?.id);
      return otherUser?.user.status || 'offline';
    }
    return 'online'; // Groups are always "online"
  };

  const getParticipantCount = () => {
    return chat.participants.length;
  };

  const handleLeaveChat = () => {
    if (window.confirm('Are you sure you want to leave this conversation?')) {
      leaveChat(chat._id);
    }
  };

  const handleGroupSettings = () => {
    setShowGroupSettings(true);
    setShowDropdown(false);
  };

  const handleShowMembers = () => {
    setShowMembersModal(true);
    setShowDropdown(false);
  };

  const isGroupAdmin = () => {
    return chat.type === 'group' && chat.createdBy === user?.id;
  };

  return (
    <div className="d-flex justify-content-between align-items-center p-3 border-bottom border-secondary">
      <div className="d-flex align-items-center">
        <div className="position-relative me-3">
          <img
            src={getChatAvatar()}
            alt="Avatar"
            className="rounded-circle"
            width="40"
            height="40"
          />
          <div
            className={`position-absolute bottom-0 end-0 rounded-circle ${
              getChatStatus() === 'online' ? 'online-indicator' : 'offline-indicator'
            }`}
            style={{ width: '12px', height: '12px' }}
          ></div>
        </div>
        
        <div>
          <h6 className="mb-0 text-success fw-bold">{getChatDisplayName()}</h6>
          <small className="text-muted">
            {chat.type === 'group' ? (
              <>
                <i className="bi bi-people me-1"></i>
                {getParticipantCount()} members
              </>
            ) : (
              <>
                <span className={`me-1 ${getChatStatus() === 'online' ? 'online-indicator' : 'offline-indicator'}`}></span>
                {getChatStatus() === 'online' ? 'Active now' : 'Offline'}
              </>
            )}
          </small>
        </div>
      </div>

      <div className="position-relative">
        <button
          className="btn btn-outline-success btn-sm"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <i className="bi bi-three-dots-vertical"></i>
        </button>

        {showDropdown && (
          <div className="dropdown-menu show position-absolute end-0 bg-dark border-success" style={{ zIndex: 1000 }}>
            {chat.type === 'group' && (
              <>
                <button className="dropdown-item text-light" type="button" onClick={handleShowMembers}>
                  <i className="bi bi-people me-2"></i>View Members ({getParticipantCount()})
                </button>
                {isGroupAdmin() && (
                  <>
                    <button className="dropdown-item text-light" type="button" onClick={handleGroupSettings}>
                      <i className="bi bi-gear me-2"></i>Group Settings
                    </button>
                    <button className="dropdown-item text-light" type="button">
                      <i className="bi bi-person-plus me-2"></i>Add Members
                    </button>
                  </>
                )}
                <hr className="dropdown-divider text-secondary" />
              </>
            )}
            
            <button className="dropdown-item text-light" type="button">
              <i className="bi bi-search me-2"></i>Search Messages
            </button>
            
            <button className="dropdown-item text-light" type="button">
              <i className="bi bi-bell me-2"></i>Notification Settings
            </button>
            
            <button className="dropdown-item text-light" type="button">
              <i className="bi bi-shield-lock me-2"></i>Encryption Info
            </button>
            
            <hr className="dropdown-divider text-secondary" />
            
            <button 
              className="dropdown-item text-danger" 
              onClick={handleLeaveChat}
            >
              <i className="bi bi-door-open me-2"></i>
              {chat.type === 'private' ? 'Delete Chat' : 'Leave Group'}
            </button>
          </div>
        )}
      </div>
      )}

      {/* Group Members Modal */}
      {showMembersModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border-success">
              <div className="modal-header border-secondary">
                <h5 className="modal-title text-success">Group Members</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowMembersModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="list-group">
                  {chat.participants.map((participant, index) => (
                    <div key={index} className="list-group-item bg-dark text-light border-secondary">
                      <div className="d-flex align-items-center">
                        <img
                          src={participant.user.avatar}
                          alt={participant.user.username}
                          className="rounded-circle me-3"
                          width="40"
                          height="40"
                        />
                        <div className="flex-grow-1">
                          <div className="fw-bold">{participant.user.username}</div>
                          <small className="text-muted">
                            <span className={`me-1 ${participant.user.status === 'online' ? 'online-indicator' : 'offline-indicator'}`}></span>
                            {participant.user.status}
                            {chat.createdBy === participant.user._id && (
                              <span className="badge bg-success ms-2">Admin</span>
                            )}
                          </small>
                        </div>
                        {isGroupAdmin() && chat.createdBy !== participant.user._id && (
                          <button className="btn btn-sm btn-outline-danger">
                            <i className="bi bi-person-dash"></i> Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer border-secondary">
                <button type="button" className="btn btn-secondary" onClick={() => setShowMembersModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Settings Modal */}
      {showGroupSettings && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content bg-dark border-success">
              <div className="modal-header border-secondary">
                <h5 className="modal-title text-success">Group Settings</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowGroupSettings(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="groupName" className="form-label text-success">Group Name</label>
                  <input
                    type="text"
                    className="form-control bg-secondary text-light border-success"
                    id="groupName"
                    defaultValue={chat.name}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="groupDescription" className="form-label text-success">Description</label>
                  <textarea
                    className="form-control bg-secondary text-light border-success"
                    id="groupDescription"
                    rows={3}
                    defaultValue={chat.description || ''}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label text-success">Group Avatar</label>
                  <div className="d-flex align-items-center gap-3">
                    <img
                      src={getChatAvatar()}
                      alt="Group Avatar"
                      className="rounded-circle"
                      width="60"
                      height="60"
                    />
                    <button className="btn btn-outline-success">
                      <i className="bi bi-upload me-2"></i>Change Avatar
                    </button>
                  </div>
                </div>
              </div>
              <div className="modal-footer border-secondary">
                <button type="button" className="btn btn-secondary" onClick={() => setShowGroupSettings(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-success">
                  <i className="bi bi-check me-2"></i>Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;
