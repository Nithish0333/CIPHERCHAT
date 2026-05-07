import React, { useState, useEffect, useCallback } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import NewChatModal from './NewChatModal';
import { toast } from 'react-toastify';
import 'bootstrap/dist/css/bootstrap.min.css';

const ChatSidebar = ({ onSelectChat, selectedChatId }) => {
  const { chats, isLoading, createChat } = useChat();
  const { user, token } = useAuth();
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [activeTab, setActiveTab] = useState('chats');
  const [searchQuery, setSearchQuery] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchError, setUserSearchError] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [friendAdding, setFriendAdding] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

  const filteredChats = chats.filter(chat => {
    if (!user?.id) return true; // If user not loaded, show all chats
    if (!searchQuery) return true; // If no search query, show all chats
    
    if (chat.type === 'private') {
      const otherUser = chat.participants?.find(p => p.user?._id !== user.id);
      const username = otherUser?.user?.username;
      return username ? username.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    } else {
      const chatName = chat.name;
      return chatName ? chatName.toLowerCase().includes(searchQuery.toLowerCase()) : false;
    }
  });

  const searchUsers = useCallback(async () => {
    if (userSearchQuery.length < 2) {
      setUserSearchResults([]);
      setUserSearchError(null);
      return;
    }

    setUserSearchLoading(true);
    setUserSearchError(null);

    try {
      const response = await fetch(`${API_URL}/users/search?q=${encodeURIComponent(userSearchQuery)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setUserSearchResults(data.data.users || []);
      } else {
        setUserSearchResults([]);
        setUserSearchError(data.message || 'Unable to search users');
      }
    } catch (error) {
      setUserSearchError('Unable to search users');
      setUserSearchResults([]);
    } finally {
      setUserSearchLoading(false);
    }
  }, [token, API_URL, userSearchQuery]);

  const fetchContacts = useCallback(async () => {
    if (!token) return;
    setContactsLoading(true);

    try {
      const response = await fetch(`${API_URL}/users/contacts`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (response.ok) {
        setContacts(data.data.contacts.map((contact) => contact.user));
      }
    } catch (error) {
      console.error('Failed to fetch contacts:', error);
    } finally {
      setContactsLoading(false);
    }
  }, [token, API_URL]);

  const getChatDisplayName = (chat) => {
    if (!chat || !user?.id) return 'Loading...';
    
    if (chat.type === 'private') {
      const otherUser = chat.participants?.find(p => p.user?._id !== user.id);
      return otherUser?.user?.username || 'Unknown User';
    }
    return chat.name || 'Group Chat';
  };

  const getChatAvatar = (chat) => {
    if (!chat) return 'https://ui-avatars.com/api/?name=Chat&background=0d1117&color=00ff41&bold=true';
    
    if (chat.type === 'private') {
      const otherUser = chat.participants?.find(p => p.user?._id !== user.id);
      return otherUser?.user?.avatar || 'https://ui-avatars.com/api/?name=User&background=0d1117&color=00ff41&bold=true';
    }
    return chat.avatar || 'https://ui-avatars.com/api/?name=Group&background=0d1117&color=00ff41&bold=true';
  };

  const getChatStatus = (chat) => {
    if (!chat) return 'offline';
    
    if (chat.type === 'private') {
      const otherUser = chat.participants?.find(p => p.user?._id !== user.id);
      return otherUser?.user?.status || 'offline';
    }
    return 'online'; // Groups are always "online"
  };

  const getLastMessage = (chat) => {
    if (chat.lastMessage) {
      const lastContent = chat.lastMessage.content || '';
      const senderId =
        typeof chat.lastMessage.sender === 'string'
          ? chat.lastMessage.sender
          : chat.lastMessage.sender?._id;

      const truncated =
        lastContent.length > 30
          ? lastContent.substring(0, 30) + '...'
          : lastContent;

      // WhatsApp-style: show "You:" when the last message was sent by the logged-in user
      if (user?.id && senderId && senderId.toString() === user.id.toString()) {
        return `You: ${truncated}`;
      }

      return truncated;
    }
    return 'No messages yet';
  };

  const getUnreadCount = (chat) => {
    if (!chat || !user?.id) return 0;
    
    const currentUserParticipant = chat.participants?.find(p => p.user?._id === user.id);
    return currentUserParticipant?.unreadCount || 0;
  };

  const formatLastActivity = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes === 0 ? 'Just now' : `${minutes}m ago`;
      }
      return `${hours}h ago`;
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return `${days} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers();
    }, 250);

    return () => clearTimeout(timer);
  }, [userSearchQuery, searchUsers]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const handleStartChatWithUser = async (userToChat) => {
    const participantId = userToChat._id || userToChat.id;
    console.log('Starting chat with user:', userToChat, 'participantId:', participantId);
    if (!participantId) return;

    try {
      console.log('Creating chat...');
      const chat = await createChat([participantId], 'private');
      console.log('Chat created:', chat);
      if (chat) {
        console.log('Selecting chat:', chat._id);
        console.log('onSelectChat function:', onSelectChat);
        // Select the chat immediately
        await onSelectChat(chat._id);
        setUserSearchQuery('');
        setUserSearchResults([]);
        setActiveTab('chats'); // Switch to chats tab
        console.log('Chat selection completed');
      } else {
        console.log('Chat creation returned null, trying to find existing chat...');
        // Try to find existing chat in the chats list
        const existingChat = chats.find(chat => {
          if (chat.type === 'private') {
            const otherUser = chat.participants?.find(p => p.user?._id === participantId);
            return otherUser;
          }
          return false;
        });
        
        if (existingChat) {
          console.log('Found existing chat:', existingChat);
          await onSelectChat(existingChat._id);
          setUserSearchQuery('');
          setUserSearchResults([]);
          setActiveTab('chats');
        }
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    }
  };

  const handleAddFriend = async (userToAdd) => {
    const userId = userToAdd._id || userToAdd.id;
    if (!userId) return;
    setFriendAdding(userId);

    try {
      const response = await fetch(`${API_URL}/users/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId }),
      });

      const data = await response.json();
      if (response.ok) {
        setContacts((prev) => [...prev, userToAdd]);
        toast.success(`${userToAdd.username} added to friend list.`);
      } else {
        toast.error(data.message || 'Unable to add friend');
      }
    } catch (error) {
      toast.error('Unable to add friend. Please try again.');
    } finally {
      setFriendAdding(null);
    }
  };

  return (
    <div className="d-flex flex-column h-100">
      {/* Header */}
      <div className="p-3 border-bottom border-secondary">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="text-success mb-0">CipherChat</h5>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-outline-success btn-sm"
              onClick={() => window.location.href = '/friends'}
            >
              <i className="bi bi-people me-1"></i>
              Friends
            </button>
            <button 
              className="btn btn-success btn-sm"
              onClick={() => setShowNewChatModal(true)}
            >
              <i className="bi bi-plus-lg me-1"></i>
              New
            </button>
                      </div>
        </div>

        <div className="btn-group w-100 mb-3" role="group">
          <button
            type="button"
            className={`btn ${activeTab === 'chats' ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setActiveTab('chats')}
          >
            Chats
          </button>
          <button
            type="button"
            className={`btn ${activeTab === 'friends' ? 'btn-success' : 'btn-outline-success'}`}
            onClick={() => setActiveTab('friends')}
          >
            Friends
          </button>
        </div>
        {activeTab === 'chats' && (
          <div className="position-relative">
            <input
              type="text"
              className="form-control"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <i className="bi bi-search position-absolute" style={{ right: '10px', top: '8px', color: '#8b949e' }}></i>
          </div>
        )}

        {activeTab === 'friends' && (
          <>
            <div className="mt-3 position-relative">
              <input
                type="text"
                className="form-control"
                placeholder="Search users to add..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
              />
              {userSearchLoading ? (
                <div className="position-absolute" style={{ right: '10px', top: '8px' }}>
                  <div className="spinner-border spinner-border-sm text-success" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : (
                <i className="bi bi-search position-absolute" style={{ right: '10px', top: '8px', color: '#8b949e' }}></i>
              )}
            </div>
            {userSearchResults.length > 0 && (
              <div className="mt-2 border border-success rounded bg-secondary">
                {userSearchResults.map((searchUser) => {
                  const userId = searchUser._id || searchUser.id;
                  const isFriend = contacts.some(contact => (contact._id || contact.id) === userId);
                  return (
                    <div
                      key={userId}
                      className="d-flex align-items-center p-2 border-bottom border-secondary"
                    >
                      <div
                        className="d-flex align-items-center flex-grow-1"
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleStartChatWithUser(searchUser)}
                      >
                        <img
                          src={searchUser.avatar}
                          alt={searchUser.username}
                          className="rounded-circle me-2"
                          width="32"
                          height="32"
                        />
                        <div className="flex-grow-1 text-light">
                          <div>{searchUser.username}</div>
                          <small className="text-muted">{searchUser.status}</small>
                        </div>
                      </div>
                      <div className="d-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-success"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartChatWithUser(searchUser);
                          }}
                          title="Start chat"
                        >
                          <i className="bi bi-chat-dots"></i>
                        </button>
                        <button
                          type="button"
                          className={`btn btn-sm ${isFriend ? 'btn-secondary' : 'btn-outline-success'}`}
                          disabled={isFriend || friendAdding === userId}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddFriend(searchUser);
                          }}
                        >
                          {isFriend ? 'Friend' : friendAdding === userId ? 'Adding...' : 'Add'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {userSearchError && <div className="mt-2 text-danger small">{userSearchError}</div>}

            <div className="mt-3 border border-secondary rounded bg-dark p-2">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="text-success mb-0">Friends</h6>
                {contactsLoading && <div className="spinner-border spinner-border-sm text-success" role="status"><span className="visually-hidden">Loading...</span></div>}
              </div>
              {contacts.length === 0 ? (
                <div className="text-muted small">No friends yet. Search users above to add.</div>
              ) : (
                contacts.map((contact) => (
                  <div 
                    key={contact._id || contact.id} 
                    className="d-flex align-items-center justify-content-between p-2 border-top border-secondary text-light"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleStartChatWithUser(contact)}
                  >
                    <div className="d-flex align-items-center gap-2">
                      <img src={contact.avatar} alt={contact.username} className="rounded-circle" width="32" height="32" />
                      <div>
                        <div>{contact.username}</div>
                        <small className="text-muted">{contact.status}</small>
                      </div>
                    </div>
                    <button
                      className="btn btn-sm btn-success"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartChatWithUser(contact);
                      }}
                      title="Start chat"
                    >
                      <i className="bi bi-chat-dots"></i>
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>

      {/* Chat List */}
      <div className="flex-grow-1 overflow-auto">
        {!user ? (
          <div className="text-center p-4">
            <div className="loading-spinner mx-auto"></div>
            <p className="text-muted mt-2">Loading user...</p>
          </div>
        ) : isLoading ? (
          <div className="text-center p-4">
            <div className="loading-spinner mx-auto"></div>
            <p className="text-muted mt-2">Loading conversations...</p>
          </div>
        ) : filteredChats.length === 0 ? (
          <div className="text-center p-4">
            <i className="bi bi-chat-dots" style={{ fontSize: '2rem', color: '#8b949e' }}></i>
            <p className="text-muted mt-2">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="list-group list-group-flush">
            {filteredChats.map((chat) => (
              <div
                key={chat._id}
                className={`list-group-item list-group-item-action d-flex align-items-center p-3 ${
                  selectedChatId === chat._id ? 'active' : ''
                }`}
                style={{
                  backgroundColor: selectedChatId === chat._id ? '#00ff41' : 'transparent',
                  color: selectedChatId === chat._id ? '#0d1117' : '#c9d1d9',
                  border: 'none',
                  borderBottom: '1px solid #30363d',
                  cursor: 'pointer'
                }}
                onClick={() => onSelectChat(chat._id)}
              >
                <div className="position-relative me-3">
                  <img
                    src={getChatAvatar(chat)}
                    alt="Avatar"
                    className="rounded-circle"
                    width="48"
                    height="48"
                  />
                  <div
                    className={`position-absolute bottom-0 end-0 rounded-circle ${
                      getChatStatus(chat) === 'online' ? 'online-indicator' : 'offline-indicator'
                    }`}
                    style={{ width: '12px', height: '12px' }}
                  ></div>
                </div>
                
                <div className="flex-grow-1 min-w-0">
                  <div className="d-flex justify-content-between align-items-start">
                    <h6 className="mb-1 text-truncate">
                      {getChatDisplayName(chat)}
                    </h6>
                    <small className={`text-nowrap ${selectedChatId === chat._id ? 'text-dark' : 'text-muted'}`}>
                      {formatLastActivity(chat.lastActivity)}
                    </small>
                  </div>
                  
                  <div className="d-flex justify-content-between align-items-center">
                    <small className={`text-truncate ${selectedChatId === chat._id ? 'text-dark' : 'text-muted'}`}>
                      {getLastMessage(chat)}
                    </small>
                    
                    {getUnreadCount(chat) > 0 && (
                      <span
                        className={`badge rounded-pill ${
                          selectedChatId === chat._id ? 'bg-dark' : 'bg-success'
                        }`}
                      >
                        {getUnreadCount(chat)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      <NewChatModal
        show={showNewChatModal}
        onHide={() => setShowNewChatModal(false)}
        onCreateChat={createChat}
      />
    </div>
  );
};

export default ChatSidebar;
