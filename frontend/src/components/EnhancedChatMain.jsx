import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../contexts/ChatContext';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import 'bootstrap/dist/css/bootstrap.min.css';

const EnhancedChatMain = () => {
  const { messages, sendMessage, currentChat, typingUsers, editMessage, deleteMessage, removeReaction, isChatLoading } = useChat();
  const { user } = useAuth();
  const { emit } = useSocket();
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const recordingIntervalRef = useRef(null);
  const mediaRecorderRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (messageInput.trim() && currentChat) {
      const messageData = {
        content: messageInput.trim(),
        type: 'text',
        replyTo: replyingTo?._id,
      };
      
      await sendMessage(messageData.content, messageData.type, { replyTo: messageData.replyTo });
      setMessageInput('');
      handleStopTyping();
      setReplyingTo(null);
    }
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
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
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

  const handleStartVoiceRecording = () => {
    setShowVoiceRecorder(true);
    setIsRecording(true);
    setRecordingTime(0);
    
    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    
    // Start actual recording logic here
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        mediaRecorderRef.current = new MediaRecorder(stream);
        mediaRecorderRef.current.start();
      })
      .catch(err => console.error('Error accessing microphone:', err));
  };

  const handleStopVoiceRecording = () => {
    setIsRecording(false);
    setShowVoiceRecorder(false);
    
    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
    }
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      // Handle voice message upload here
    }
    
    setRecordingTime(0);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      // Handle file upload
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file || !currentChat) return;

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('chatId', currentChat._id);

      const response = await fetch('http://localhost:5001/api/upload/file', {
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
          fileName: file.name,
          fileSize: file.size,
        });
      }
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setUploadingFile(false);
      setSelectedFile(null);
    }
  };

  const handleEmojiSelect = (emoji) => {
    if (editingMessage) {
      setEditText(editText + emoji);
    } else {
      setMessageInput(messageInput + emoji);
    }
    setShowEmojiPicker(null);
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    // Focus on input
    document.getElementById('message-input')?.focus();
  };

  const handleForward = (message) => {
    setForwardingMessage(message);
    // Show forward modal or list
  };

  const handleDelete = async (messageId) => {
    if (window.confirm('Delete this message?')) {
      await deleteMessage(messageId);
    }
  };

  const handleEdit = (message) => {
    setEditingMessage(message._id);
    setEditText(message.content);
  };

  const handleCancelEdit = () => {
    setEditingMessage(null);
    setEditText('');
  };

  const handleSaveEdit = async () => {
    if (editingMessage && editText.trim()) {
      await editMessage(editingMessage, editText.trim());
      setEditingMessage(null);
      setEditText('');
    }
  };

  const formatMessageTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatRecordingTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const emojis = ['\ud83d\ude00', '\ud83d\ude03', '\ud83d\ude04', '\ud83d\ude01', '\ud83d\ude05', '\ud83d\ude02', '\ud83e\udd23', '\ud83d\ude0a', '\ud83d\ude07', '\ud83d\ude42', '\ud83d\ude09', '\ud83d\ude0c', '\ud83d\ude0d', '\ud83e\udd70', '\ud83d\ude18', '\ud83d\ude17', '\ud83d\ude19', '\ud83d\ude1a', '\ud83d\ude0b', '\ud83d\ude1b', '\ud83d\ude1c', '\ud83e\udd2a', '\ud83d\ude1d', '\ud83e\udd11', '\ud83e\udd17', '\ud83e\udd2d', '\ud83e\udd2b', '\ud83e\udd14', '\ud83e\udd10', '\ud83e\udd28', '\ud83d\ude10', '\ud83d\ude11', '\ud83d\ude36', '\ud83d\ude0f', '\ud83d\ude12', '\ud83d\ude44', '\ud83d\ude2c', '\ud83e\udd25', '\ud83d\ude0e', '\ud83e\udd73', '\ud83d\ude15', '\ud83d\ude1f', '\ud83d\ude41', '\ud83e\udd17', '\ud83e\udd2d', '\ud83e\udd2b', '\ud83e\udd14', '\ud83d\ude34', '\ud83d\ude37', '\ud83e\udd12', '\ud83e\udd15', '\ud83e\udd22', '\ud83e\udd2e', '\ud83e\udd27', '\ud83e\udd75', '\ud83e\udd76', '\ud83d\ude35', '\ud83e\udd2f', '\ud83e\udd20', '\ud83e\udd73', '\ud83d\ude0e', '\ud83e\udd17', '\ud83e\udd2d', '\ud83e\udd2b', '\ud83e\udd14'];

  return (
    <div className="d-flex flex-column h-100" style={{ backgroundColor: '#0d1117' }}>
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
            <i className="bi bi-chat-dots" style={{ fontSize: '4rem', color: '#00ff41' }}></i>
            <h3 className="mt-3 text-success">Welcome to CipherChat</h3>
            <p className="terminal-text">Select a conversation to start secure messaging</p>
            <div className="cyber-border p-3">
              <small className="text-muted">
                <span className="terminal-text">End-to-end encryption active</span>
              </small>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted mt-5">
            <i className="bi bi-chat-dots" style={{ fontSize: '3rem', color: '#00ff41' }}></i>
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
                      src={message.sender.avatar || `https://ui-avatars.com/api/?name=${message.sender.username}&background=28a745&color=fff&size=40`}
                      alt={message.sender.username}
                      className="rounded-circle"
                      width="32"
                      height="32"
                    />
                  )}
                  
                  <div className="message-content">
                    {message.replyTo && (
                      <div className="reply-preview bg-secondary p-2 rounded mb-2">
                        <small className="text-muted">Replying to {message.replyTo.sender?.username}</small>
                        <div className="text-truncate">{message.replyTo.content}</div>
                      </div>
                    )}
                    
                    {message.type === 'text' && (
                      <div>
                        {!isMessageFromCurrentUser(message.sender._id) && (
                          <small className="text-muted d-block mb-1">{message.sender.username}</small>
                        )}
                        {editingMessage === message._id ? (
                          <div className="d-flex align-items-center gap-2">
                            <input
                              type="text"
                              className="form-control"
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              onKeyPress={(e) => e.key === 'Enter' && handleSaveEdit()}
                              style={{ backgroundColor: '#21262d', borderColor: '#30363d', color: '#c9d1d9' }}
                            />
                            <button className="btn btn-sm btn-success" onClick={handleSaveEdit}>
                              <i className="bi bi-check"></i>
                            </button>
                            <button className="btn btn-sm btn-secondary" onClick={handleCancelEdit}>
                              <i className="bi bi-x"></i>
                            </button>
                          </div>
                        ) : (
                          <div className="message-content-wrapper">
                            <div className="message-text">{message.content}</div>
                            {message.isEdited && (
                              <small className="text-muted ms-2">(edited)</small>
                            )}
                            <div className="message-actions d-flex align-items-center gap-1 mt-2">
                              {isMessageFromCurrentUser(message.sender._id) && (
                                <>
                                  <button className="btn btn-sm btn-outline-secondary" onClick={() => handleEdit(message)}>
                                    <i className="bi bi-pencil"></i>
                                  </button>
                                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(message._id)}>
                                    <i className="bi bi-trash"></i>
                                  </button>
                                </>
                              )}
                              <button className="btn btn-sm btn-outline-success" onClick={() => handleReply(message)}>
                                <i className="bi bi-reply"></i>
                              </button>
                              <button className="btn btn-sm btn-outline-primary" onClick={() => handleForward(message)}>
                                <i className="bi bi-forward"></i>
                              </button>
                              <button className="btn btn-sm btn-outline-warning" onClick={() => setShowEmojiPicker(message._id)}>
                                <i className="bi bi-emoji-smile"></i>
                              </button>
                            </div>
                            {showEmojiPicker === message._id && (
                              <div className="emoji-picker bg-dark border border-success rounded p-2 mt-2">
                                <div className="d-flex flex-wrap gap-1">
                                  {emojis.map((emoji) => (
                                    <button
                                      key={emoji}
                                      className="btn btn-sm btn-outline-light"
                                      onClick={() => handleEmojiSelect(emoji)}
                                    >
                                      {emoji}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {message.reactions && message.reactions.length > 0 && (
                              <div className="message-reactions mt-2">
                                {message.reactions.map((reaction, index) => (
                                  <span
                                    key={index}
                                    className="badge bg-secondary me-1"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => reaction.user._id === user?.id ? removeReaction(message._id) : null}
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
                    </div>
                  </div>
                  
                  {isMessageFromCurrentUser(message.sender._id) && (
                    <img
                      src={message.sender.avatar || `https://ui-avatars.com/api/?name=${message.sender.username}&background=28a745&color=fff&size=40`}
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
                <div className="d-flex align-items-center gap-2">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span className="text-muted">
                    {getTypingUsers().join(', ')} {getTypingUsers().length === 1 ? 'is' : 'are'} typing...
                  </span>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Reply Preview */}
      {replyingTo && (
        <div className="reply-preview bg-secondary p-2 border-top border-secondary">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <small className="text-muted">Replying to {replyingTo.sender?.username}</small>
              <div className="text-truncate">{replyingTo.content}</div>
            </div>
            <button className="btn btn-sm btn-outline-secondary" onClick={() => setReplyingTo(null)}>
              <i className="bi bi-x"></i>
            </button>
          </div>
        </div>
      )}

      {/* Voice Recorder */}
      {showVoiceRecorder && (
        <div className="voice-recorder bg-secondary p-3 border-top border-secondary">
          <div className="d-flex align-items-center gap-3">
            <div className="recording-indicator">
              <div className="recording-dot"></div>
              <span className="text-danger">Recording {formatRecordingTime(recordingTime)}</span>
            </div>
            <button className="btn btn-danger" onClick={handleStopVoiceRecording}>
              <i className="bi bi-stop-fill"></i> Stop
            </button>
          </div>
        </div>
      )}

      {/* Message Input - Enhanced Text Space */}
      <div className="chat-input-container bg-dark border-top border-success p-3">
        <form className="d-flex gap-2 align-items-end">
          <div className="flex-grow-1 position-relative">
            <textarea
              id="message-input"
              className="form-control message-input-field"
              placeholder="Type your message here..."
              value={messageInput}
              onChange={handleTyping}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              onBlur={handleStopTyping}
              rows={1}
              autoFocus
              style={{
                resize: 'none',
                minHeight: '50px',
                maxHeight: '150px',
                backgroundColor: 'rgba(33, 37, 41, 0.8)',
                borderColor: '#28a745',
                borderWidth: '2px',
                color: '#f8f9fa',
                fontSize: '16px',
                padding: '12px 16px',
                borderRadius: '8px',
                transition: 'all 0.3s ease'
              }}
            />
            <div className="text-muted small mt-1 text-end">
              {messageInput.length > 0 && (
                <span>{messageInput.length} characters</span>
              )}
            </div>
          </div>
          
          <div className="d-flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              multiple
            />
            
            <button
              type="button"
              className="btn btn-outline-success"
              onClick={() => fileInputRef.current?.click()}
              title="Attach file"
            >
              <i className="bi bi-paperclip"></i>
            </button>
            
            <button
              type="button"
              className="btn btn-outline-success"
              onClick={() => setShowEmojiPicker('input')}
              title="Add emoji"
            >
              <i className="bi bi-emoji-smile"></i>
            </button>
            
            <button
              type="button"
              className="btn btn-outline-success"
              onClick={handleStartVoiceRecording}
              title="Voice message"
            >
              <i className="bi bi-mic"></i>
            </button>
            
            <button
              type="button"
              className="btn btn-outline-success"
              onClick={() => setShowGifPicker(!showGifPicker)}
              title="Send GIF"
            >
              <i className="bi bi-gif"></i>
            </button>
            
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
        
        {/* Emoji Picker for Input */}
        {showEmojiPicker === 'input' && (
          <div className="emoji-picker bg-dark border border-success rounded p-2 mt-2">
            <div className="d-flex flex-wrap gap-1">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  className="btn btn-sm btn-outline-light"
                  onClick={() => handleEmojiSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedChatMain;
