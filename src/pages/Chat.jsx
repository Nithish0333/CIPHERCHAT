import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useChat } from '../contexts/ChatContext';
import ChatSidebar from '../components/ChatSidebar';
import EnhancedChatMain from '../components/EnhancedChatMain';
import ChatHeader from '../components/ChatHeader';
import Notifications from '../components/Notifications';
import UserProfile from '../components/UserProfile';
import GroupChatManager from '../components/GroupChatManager';
import VoiceVideoCall from '../components/VoiceVideoCall';
import StatusManager from '../components/StatusManager';
import 'bootstrap/dist/css/bootstrap.min.css';
import '../styles/icon-enhancements.css';

const Chat = () => {
  const { user, logout } = useAuth();
  const { currentChat, selectChat } = useChat();
  const [showSidebar, setShowSidebar] = useState(true);
  const [showProfile, setShowProfile] = useState(false);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [showVoiceCall, setShowVoiceCall] = useState(false);
  const [showVideoCall, setShowVideoCall] = useState(false);
  const [showStatusManager, setShowStatusManager] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMenu && !event.target.closest('.dropdown')) {
        setShowMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleLogout = () => {
    logout();
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div className="chat-container vh-100">
      {/* Header */}
      <div className="chat-header d-flex justify-content-between align-items-center px-3">
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-outline-primary btn-sm me-3 d-md-none"
            onClick={toggleSidebar}
          >
            <i className="bi bi-list"></i>
          </button>
          <div className="d-flex align-items-center">
            <img 
              src={user?.avatar || 'https://ui-avatars.com/api/?name=User&background=0d1117&color=00ff41&bold=true'} 
              alt="Avatar" 
              className="rounded-circle me-2"
              width="40"
              height="40"
            />
            <div>
              <div className="fw-bold text-success">{user?.username}</div>
              <small className="text-muted">
                <span className="online-indicator me-1"></span>
                Online
              </small>
            </div>
          </div>
        </div>
        
        <div className="d-flex align-items-center gap-2">
          <span className="terminal-text small">CipherChat v2.0</span>
          
          {/* Status Button - Enhanced with clear label */}
          <button 
            className="btn btn-outline-success btn-sm d-flex align-items-center gap-1"
            onClick={() => setShowStatusManager(true)}
            title="View and manage your status updates"
            aria-label="Status Updates"
          >
            <i className="bi bi-clock-history"></i>
            <span className="d-none d-lg-inline small">Status</span>
          </button>
          
          {/* Group Chat Button - Enhanced with clear label */}
          <button 
            className="btn btn-outline-success btn-sm d-flex align-items-center gap-1"
            onClick={() => setShowGroupManager(true)}
            title="Create or manage group chats"
            aria-label="Group Chat"
          >
            <i className="bi bi-people-fill"></i>
            <span className="d-none d-lg-inline small">Groups</span>
          </button>
          
          {/* Voice Call Button - Enhanced with disabled state indicator */}
          <button 
            className={`btn btn-sm d-flex align-items-center gap-1 ${currentChat ? 'btn-outline-success' : 'btn-outline-secondary disabled'}`}
            onClick={() => currentChat && setShowVoiceCall(true)}
            disabled={!currentChat}
            title={currentChat ? "Start voice call with current chat" : "Select a chat to start voice call"}
            aria-label="Voice Call"
          >
            <i className="bi bi-telephone"></i>
            <span className="d-none d-lg-inline small">Voice</span>
          </button>
          
          {/* Video Call Button - Enhanced with disabled state indicator */}
          <button 
            className={`btn btn-sm d-flex align-items-center gap-1 ${currentChat ? 'btn-outline-success' : 'btn-outline-secondary disabled'}`}
            onClick={() => currentChat && setShowVideoCall(true)}
            disabled={!currentChat}
            title={currentChat ? "Start video call with current chat" : "Select a chat to start video call"}
            aria-label="Video Call"
          >
            <i className="bi bi-camera-video"></i>
            <span className="d-none d-lg-inline small">Video</span>
          </button>
          
          {/* Profile Button - Enhanced with active state indicator */}
          <button 
            className={`btn btn-sm d-flex align-items-center gap-1 ${showProfile ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setShowProfile(!showProfile)}
            title="View and edit your profile settings"
            aria-label="Profile"
          >
            <i className="bi bi-person"></i>
            <span className="d-none d-lg-inline small">Profile</span>
          </button>
          
          {/* Notifications - Enhanced */}
          <Notifications />
          
          {/* Three Dots Menu */}
          <div className="dropdown">
            <button 
              className="btn btn-outline-success btn-sm d-flex align-items-center gap-1"
              type="button"
              onClick={() => setShowMenu(!showMenu)}
              title="More options"
              aria-expanded={showMenu}
            >
              <div className="three-dots">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </button>
            
            {showMenu && (
              <ul className="dropdown-menu dropdown-menu-end show bg-dark border-success" style={{ zIndex: 1000 }}>
                <li>
                  <button 
                    className="dropdown-item text-light d-flex align-items-center gap-2"
                    onClick={() => {
                      setShowProfile(!showProfile);
                      setShowMenu(false);
                    }}
                  >
                    <i className="bi bi-person"></i>
                    Profile
                  </button>
                </li>
                <li>
                  <button 
                    className="dropdown-item text-light d-flex align-items-center gap-2"
                    onClick={() => {
                      setShowStatusManager(true);
                      setShowMenu(false);
                    }}
                  >
                    <i className="bi bi-clock-history"></i>
                    Status
                  </button>
                </li>
                <li>
                  <button 
                    className="dropdown-item text-light d-flex align-items-center gap-2"
                    onClick={() => {
                      setShowGroupManager(true);
                      setShowMenu(false);
                    }}
                  >
                    <i className="bi bi-people-fill"></i>
                    Groups
                  </button>
                </li>
                <li><hr className="dropdown-divider border-secondary" /></li>
                <li>
                  <button 
                    className="dropdown-item text-danger d-flex align-items-center gap-2"
                    onClick={handleLogout}
                  >
                    <i className="bi bi-power"></i>
                    Logout
                  </button>
                </li>
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="d-flex flex-grow-1 overflow-hidden">
        {/* Sidebar */}
        <div className={`chat-sidebar ${showSidebar ? 'd-block' : 'd-none'} d-md-block`}>
          <ChatSidebar 
            onSelectChat={selectChat}
            selectedChatId={currentChat?._id}
          />
        </div>

        {/* Chat Area */}
        <div className="chat-main flex-grow-1">
          {currentChat ? (
            <>
              <ChatHeader chat={currentChat} />
              <EnhancedChatMain />
            </>
          ) : (
            <div className="d-flex flex-column justify-content-center align-items-center h-100 text-center">
              <div className="mb-4">
                <i className="bi bi-chat-dots" style={{ fontSize: '4rem', color: '#00ff41' }}></i>
              </div>
              <h2 className="cyber-title mb-3">Welcome to CipherChat</h2>
              <p className="terminal-text mb-4">Select a conversation to start secure messaging</p>
              <div className="cyber-border p-3">
                <small className="text-muted">
                  <span className="terminal-text">All messages are encrypted end-to-end</span>
                </small>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Modal */}
      {showProfile && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content bg-dark border-success">
              <div className="modal-header border-secondary">
                <h5 className="modal-title text-success">User Profile</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowProfile(false)}></button>
              </div>
              <div className="modal-body">
                <UserProfile />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Group Chat Manager */}
      <GroupChatManager
        show={showGroupManager}
        onClose={() => setShowGroupManager(false)}
      />

      {/* Voice Call */}
      <VoiceVideoCall
        chat={currentChat}
        show={showVoiceCall}
        onClose={() => setShowVoiceCall(false)}
        callType="voice"
      />

      {/* Video Call */}
      <VoiceVideoCall
        chat={currentChat}
        show={showVideoCall}
        onClose={() => setShowVideoCall(false)}
        callType="video"
      />

      {/* Status Manager */}
      <StatusManager
        show={showStatusManager}
        onClose={() => setShowStatusManager(false)}
      />
    </div>
  );
};

export default Chat;
