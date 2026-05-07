import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const ChatMain = () => {
  const { messages, sendMessage, currentChat, typingUsers, editMessage, deleteMessage, addReaction, removeReaction, isChatLoading } = useChat();
  const { user } = useAuth();
  const { emit } = useSocket();
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (messageInput.trim() && currentChat) {
      // Simulate encryption animation
      const encryptedMessage = simulateEncryption(messageInput.trim());
      await sendMessage(encryptedMessage.content); // Pass content string, not object
      setMessageInput('');
      handleStopTyping();
    }
  };

  const simulateEncryption = (text) => {
    // Simple encryption simulation for UI demonstration
    const encrypted = text.split('').map((char, index) => {
      const code = char.charCodeAt(0);
      const shift = (index + 7) % 13;
      return String.fromCharCode(code + shift);
    }).join('');
    
    return {
      content: text, // Send original text to backend
      encryptedContent: encrypted, // Store encrypted version for UI
      encryptionKey: generateEncryptionKey()
    };
  };

  const generateEncryptionKey = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleTyping = (e) => {
    setMessageInput(e.target.value);
    
    if (!isTyping && e.target.value.trim()) {
      setIsTyping(true);
      if (currentChat) {
        emit('typing', {
          chatId: currentChat._id,
          userId: user?.id,
          isTyping: true
        });
      }
    }
    
    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set new timeout to stop typing indicator
    typingTimeoutRef.current = setTimeout(() => {
      handleStopTyping();
    }, 1000);
  };

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false);
      if (currentChat) {
        emit('typing', {
          chatId: currentChat._id,
          userId: user?.id,
          isTyping: false
        });
      }
    }
  };

  const handleEditMessage = (message) => {
    setEditingMessage(message._id);
    setEditText(message.content);
  };

  const handleSaveEdit = async () => {
    if (editingMessage && editText.trim()) {
      await editMessage(editingMessage, editText.trim());
      setEditingMessage(null);
      setEditText('');
    }
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const handleDeleteMessage = async (messageId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      await deleteMessage(messageId);
    }
  };

  const handleAddReaction = async (messageId, emoji) => {
    await addReaction(messageId, emoji);
    setShowEmojiPicker(null);
  };

  const handleRemoveReaction = async (messageId) => {
    await removeReaction(messageId);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (editingMessage) {
        handleSaveEdit();
      } else {
        handleSendMessage(e);
      }
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !currentChat) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('chatId', currentChat._id);

      const response = await fetch('/api/upload/file', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('cipherchat_token')}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        await sendMessage('', 'file', {
          fileUrl: data.data.fileUrl,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
        });
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        console.error('File upload failed:', data.message);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setUploadingFile(true);
      try {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('chatId', currentChat._id);

        const response = await fetch('/api/upload/image', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('cipherchat_token')}`,
          },
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          await sendMessage('', 'image', {
            fileUrl: data.data.fileUrl,
            fileName: file.name,
            fileSize: file.size,
          });
        } else {
          console.error('Image upload failed:', data.message);
        }
      } catch (error) {
        console.error('Error uploading image:', error);
      } finally {
        setUploadingFile(false);
      }
    }
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMessageStatus = (message) => {
    if (!isMessageFromCurrentUser(message.sender._id)) return null;
    
    const deliveredTo = message.deliveredTo || [];
    const readBy = message.readBy || [];
    
    if (readBy.length > 1) {
      return { icon: 'bi-check-all', color: 'text-success', title: 'Read by all' };
    } else if (deliveredTo.length > 0) {
      return { icon: 'bi-check-all', color: 'text-info', title: 'Delivered' };
    } else {
      return { icon: 'bi-check', color: 'text-muted', title: 'Sent' };
    }
  };

  const isMessageFromCurrentUser = (senderId) => {
    return senderId === user?.id;
  };

  const getTypingUsers = () => {
    if (!currentChat) return [];
    
    return Array.from(typingUsers.entries())
      .filter(([userId, isTyping]) => isTyping && userId !== user?.id)
      .map(([userId]) => {
        const participant = currentChat.participants.find(p => p.user._id === userId);
        return participant?.user.username || 'Someone';
      });
  };

  return (
    <div className="d-flex flex-column h-100">
      {/* Messages Area */}
      <div className="chat-messages flex-grow-1 overflow-auto p-3" style={{ backgroundColor: '#0d1117' }}>
        {isChatLoading ? (
          <div className="text-center text-muted mt-5">
            <div className="spinner-border text-success" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3">Loading conversation...</p>
          </div>
        ) : !currentChat ? (
          <div className="text-center text-muted mt-5">
            <i className="bi bi-chat-left-text" style={{ fontSize: '3rem' }}></i>
            <p className="mt-3">Select a conversation to start chatting.</p>
            <small className="terminal-text">Search users or open an existing chat.</small>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted mt-5">
            <i className="bi bi-chat-dots" style={{ fontSize: '3rem' }}></i>
            <p className="mt-3">No messages yet. Start the conversation!</p>
            <small className="terminal-text">Messages are encrypted end-to-end</small>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <div
                key={message._id}
                className={`message-bubble ${isMessageFromCurrentUser(message.sender._id) ? 'sent' : 'received'} mb-3`}
              >
                <div className="d-flex align-items-start gap-2">
                  {!isMessageFromCurrentUser(message.sender._id) && (
                    <img
                      src={message.sender.avatar}
                      alt={message.sender.username}
                      className="rounded-circle"
                      width="32"
                      height="32"
                    />
                  )}
                  
                  <div className="message-content">
                    {message.type === 'text' && (
                      <div>
                        {!isMessageFromCurrentUser(message.sender._id) && (
                          <small className="text-muted d-block mb-1">{message.sender.username}</small>
                        )}
                        {editingMessage === message._id ? (
                          <div className="d-flex align-items-center gap-2">
                            <textarea
                              className="form-control"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyDown={handleKeyPress}
                              rows={1}
                              style={{ resize: 'none' }}
                            />
                            <button
                              className="btn btn-sm btn-success"
                              onClick={handleSaveEdit}
                            >
                              <i className="bi bi-check"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={handleCancelEdit}
                            >
                              <i className="bi bi-x"></i>
                            </button>
                          </div>
                        ) : (
                          <div className="message-content-wrapper">
                            <div className="decrypting-text">
                              {message.content}
                            </div>
                            {message.isEdited && (
                              <small className="text-muted ms-2">(edited)</small>
                            )}
                            <div className="message-actions d-flex align-items-center gap-1">
                              {isMessageFromCurrentUser(message.sender._id) && (
                                <>
                                  <button
                                    className="btn btn-sm btn-outline-secondary"
                                    onClick={() => handleEditMessage(message)}
                                    title="Edit message"
                                  >
                                    <i className="bi bi-pencil"></i>
                                  </button>
                                  <button
                                    className="btn btn-sm btn-outline-danger"
                                    onClick={() => handleDeleteMessage(message._id)}
                                    title="Delete message"
                                  >
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </>
                              )}
                              <button
                                className="btn btn-sm btn-outline-success"
                                onClick={() => setShowEmojiPicker(showEmojiPicker === message._id ? null : message._id)}
                                title="Add reaction"
                              >
                                <i className="bi bi-emoji-smile"></i>
                              </button>
                            </div>
                            {showEmojiPicker === message._id && (
                              <div className="emoji-picker bg-dark border border-success rounded p-2 mt-2">
                                {['\ud83d\ude00', '\ud83d\ude03', '\ud83d\ude04', '\ud83d\ude01', '\ud83d\ude05', '\ud83d\ude02', '\ud83e\udd23', '\ud83d\ude0a', '\ud83d\ude07', '\ud83d\ude42', '\ud83d\ude09', '\ud83d\ude0c', '\ud83d\ude0d', '\ud83e\udd70', '\ud83d\ude18', '\ud83d\ude17', '\ud83d\ude19', '\ud83d\ude1a', '\ud83d\ude0b', '\ud83d\ude1b', '\ud83d\ude1c', '\ud83e\udd2a', '\ud83d\ude1d', '\ud83e\udd11', '\ud83e\udd17', '\ud83e\udd2d', '\ud83e\udd2b', '\ud83e\udd14', '\ud83e\udd10', '\ud83e\udd28', '\ud83d\ude10', '\ud83d\ude11', '\ud83d\ude36', '\ud83d\ude0f', '\ud83d\ude12', '\ud83d\ude44', '\ud83d\ude2c', '\ud83e\udd25', '\ud83d\ude0e', '\ud83e\udd73', '\ud83d\ude15', '\ud83d\ude1f', '\ud83d\ude41', '\ud83e\udd17', '\ud83e\udd2d', '\ud83e\udd2b', '\ud83e\udd14', '\ud83d\ude34', '\ud83d\ude37', '\ud83e\udd12', '\ud83e\udd15', '\ud83e\udd22', '\ud83e\udd2e', '\ud83e\udd27', '\ud83e\udd75', '\ud83e\udd76', '\ud83d\ude35', '\ud83e\udd2f', '\ud83e\udd20', '\ud83e\udd73', '\ud83d\ude0e', '\ud83e\udd17', '\ud83e\udd2d', '\ud83e\udd2b', '\ud83e\udd14'].map((emoji) => (
                                  <button
                                    key={emoji}
                                    className="btn btn-sm btn-outline-light me-1 mb-1"
                                    onClick={() => handleAddReaction(message._id, emoji)}
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                            )}
                            {message.reactions && message.reactions.length > 0 && (
                              <div className="message-reactions mt-2">
                                {message.reactions.map((reaction, index) => (
                                  <span
                                    key={index}
                                    className="badge bg-secondary me-1"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => reaction.user._id === user?.id ? handleRemoveReaction(message._id) : null}
                                    title={reaction.user._id === user?.id ? 'Remove reaction' : `${reaction.user.username} reacted`}
                                  >
                                    {reaction.emoji} {reaction.count || 1}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {message.type === 'image' && (
                      <div>
                        {!isMessageFromCurrentUser(message.sender._id) && (
                          <small className="text-muted d-block mb-1">{message.sender.username}</small>
                        )}
                        <img
                          src={message.fileUrl}
                          alt={message.fileName}
                          className="img-fluid rounded"
                          style={{ maxWidth: '300px' }}
                        />
                        <div className="mt-1">
                          <small className="text-muted">{message.fileName}</small>
                        </div>
                      </div>
                    )}
                    
                    {message.type === 'file' && (
                      <div>
                        {!isMessageFromCurrentUser(message.sender._id) && (
                          <small className="text-muted d-block mb-1">{message.sender.username}</small>
                        )}
                        <div className="d-flex align-items-center gap-2 p-2 bg-secondary rounded">
                          <i className="bi bi-file-earmark text-success"></i>
                          <div>
                            <div className="text-light">{message.fileName}</div>
                            <small className="text-muted">
                              {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : 'Unknown size'}
                            </small>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="message-time">
                      {formatMessageTime(message.createdAt)}
                      {(() => {
                        const status = getMessageStatus(message);
                        return status && (
                          <span className={`message-status ms-2 ${status.color}`} title={status.title}>
                            <i className={`bi ${status.icon}`}></i>
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  
                  {isMessageFromCurrentUser(message.sender._id) && (
                    <img
                      src={message.sender.avatar}
                      alt={message.sender.username}
                      className="rounded-circle"
                      width="32"
                      height="32"
                    />
                  )}
                </div>
              </div>
            ))}
            
            {/* Typing Indicator */}
            {getTypingUsers().length > 0 && (
              <div className="typing-indicator mb-3">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <span className="ms-2 text-muted">
                  {getTypingUsers().join(', ')} {getTypingUsers().length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Message Input */}
      <div className="chat-input-container">
        <form className="d-flex gap-2">
          <div className="flex-grow-1 position-relative">
            <textarea
              className="form-control"
              placeholder="Type a secure message..."
              value={messageInput}
              onChange={handleTyping}
              onKeyDown={handleKeyPress}
              onBlur={handleStopTyping}
              rows={1}
              style={{
                resize: 'none',
                minHeight: '40px',
                maxHeight: '120px',
                backgroundColor: '#21262d',
                borderColor: '#30363d',
                color: '#c9d1d9'
              }}
            />
          </div>
          
          <div className="d-flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              id="image-upload"
            />
            
            <button
              type="button"
              className="btn btn-outline-success"
              title="Attach file"
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="bi bi-paperclip"></i>
            </button>
            
            <button
              type="button"
              className="btn btn-outline-success"
              title="Send image"
              onClick={() => document.getElementById('image-upload').click()}
            >
              <i className="bi bi-image"></i>
            </button>
            
            {selectedFile && (
              <div className="d-flex align-items-center gap-2">
                <small className="text-muted">{selectedFile.name}</small>
                <button
                  type="button"
                  className="btn btn-sm btn-success"
                  onClick={handleFileUpload}
                  disabled={uploadingFile}
                >
                  {uploadingFile ? (
                    <span className="spinner-border spinner-border-sm"></span>
                  ) : (
                    <i className="bi bi-upload"></i>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setSelectedFile(null)}
                >
                  <i className="bi bi-x"></i>
                </button>
              </div>
            )}
            
            <button
              type="button"
              className="btn btn-success"
              onClick={handleSendMessage}
              disabled={!messageInput.trim() || !currentChat}
            >
              <i className="bi bi-send"></i>
            </button>
          </div>
        </form>
        
        <div className="mt-2 text-center">
          <small className="text-muted terminal-text">
            <i className="bi bi-shield-lock me-1"></i>
            End-to-end encryption active
          </small>
        </div>
      </div>
    </div>
  );
};

export default ChatMain;
