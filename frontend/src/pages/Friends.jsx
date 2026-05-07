import React, { useState } from 'react';
import UserSearch from '../components/UserSearch';
import FriendRequests from '../components/FriendRequests';
import FriendsList from '../components/FriendsList';
import { useChat } from '../contexts/ChatContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const Friends = () => {
  const [activeTab, setActiveTab] = useState('search');
  const { selectChat } = useChat();

  const handleSelectFriend = (friend) => {
    // Create or select a chat with this friend
    selectChat(friend._id);
    // You could navigate to the chat page here if needed
  };

  const tabs = [
    { id: 'search', label: 'Search Users', icon: 'bi-search' },
    { id: 'requests', label: 'Friend Requests', icon: 'bi-person-plus' },
    { id: 'friends', label: 'My Friends', icon: 'bi-people' }
  ];

  return (
    <div className="friends-page vh-100">
      <div className="container-fluid h-100">
        <div className="row h-100">
          <div className="col-12 col-md-8 mx-auto h-100">
            <div className="d-flex flex-column h-100">
              {/* Header */}
              <div className="text-center py-3">
                <h2 className="text-success cyber-title">Friends</h2>
                <p className="text-muted">Connect with other users</p>
              </div>

              {/* Navigation Tabs */}
              <div className="mb-3">
                <ul className="nav nav-tabs border-secondary">
                  {tabs.map((tab) => (
                    <li className="nav-item" key={tab.id}>
                      <button
                        className={`nav-link ${activeTab === tab.id ? 'active bg-success text-dark' : 'text-success'}`}
                        onClick={() => setActiveTab(tab.id)}
                        style={{ border: '1px solid #00ff41' }}
                      >
                        <i className={`bi ${tab.icon} me-2`}></i>
                        {tab.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Content */}
              <div className="flex-grow-1 overflow-auto">
                {activeTab === 'search' && <UserSearch />}
                {activeTab === 'requests' && <FriendRequests />}
                {activeTab === 'friends' && <FriendsList onSelectFriend={handleSelectFriend} />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Friends;
