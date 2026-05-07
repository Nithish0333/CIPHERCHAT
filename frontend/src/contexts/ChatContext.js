import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const ChatContext = createContext(undefined);

const chatReducer = (state, action) => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CHATS':
      return { ...state, chats: action.payload };
    case 'SET_CURRENT_CHAT':
      return { ...state, currentChat: action.payload, messages: [] };
    case 'SET_CHAT_LOADING':
      return { ...state, isChatLoading: action.payload };
    case 'SET_MESSAGES':
      return { ...state, messages: action.payload };
    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.payload] };
    case 'UPDATE_MESSAGE':
      return {
        ...state,
        messages: state.messages.map(msg =>
          msg._id === action.payload._id ? action.payload : msg
        ),
      };
    case 'DELETE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter(msg => msg._id !== action.payload),
      };
    case 'SET_ONLINE_USERS':
      return { ...state, onlineUsers: action.payload };
    case 'ADD_ONLINE_USER': {
      const newOnlineUsers = new Set(state.onlineUsers);
      newOnlineUsers.add(action.payload);
      return { ...state, onlineUsers: newOnlineUsers };
    }
    case 'REMOVE_ONLINE_USER': {
      const newOnlineUsers = new Set(state.onlineUsers);
      newOnlineUsers.delete(action.payload);
      return { ...state, onlineUsers: newOnlineUsers };
    }
    case 'SET_TYPING_USER':
      const newTypingUsers = new Map(state.typingUsers);
      if (action.payload.isTyping) {
        newTypingUsers.set(action.payload.userId, true);
      } else {
        newTypingUsers.delete(action.payload.userId);
      }
      return { ...state, typingUsers: newTypingUsers };
    case 'UPDATE_CHAT':
      return {
        ...state,
        chats: state.chats.map(chat =>
          chat._id === action.payload._id ? action.payload : chat
        ),
        currentChat: state.currentChat?._id === action.payload._id 
          ? action.payload 
          : state.currentChat,
      };
    default:
      return state;
  }
};

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

export const ChatProvider = ({ children }) => {
  const { token, user } = useAuth();
  const { socket, isConnected } = useSocket();
  const [state, dispatch] = useReducer(chatReducer, {
    chats: [],
    currentChat: null,
    messages: [],
    onlineUsers: new Set(),
    typingUsers: new Map(),
    isLoading: false,
    isChatLoading: false,
    error: null,
  });

  useEffect(() => {
    if (isConnected && socket && user) {
      // Set up socket event listeners
      // User is already authenticated at connection time

      const handleReceiveMessage = (data) => {
        if (data.chatId === state.currentChat?._id) {
          dispatch({ type: 'ADD_MESSAGE', payload: data });
        }
      };

      const handleUserOnline = (userId) => {
        dispatch({ type: 'ADD_ONLINE_USER', payload: userId });
      };

      const handleUserOffline = (userId) => {
        dispatch({ type: 'REMOVE_ONLINE_USER', payload: userId });
      };

      const handleUserTyping = (data) => {
        dispatch({ type: 'SET_TYPING_USER', payload: data });
      };

      const handleMessageReadReceipt = (data) => {
        // Update message read status
        dispatch({
          type: 'UPDATE_MESSAGE',
          payload: { _id: data.messageId, readBy: [{ user: { _id: data.userId, username: '' }, readAt: new Date().toISOString() }] },
        });
      };

      // Add event listeners
      socket.on('receive_message', handleReceiveMessage);
      socket.on('user_online', handleUserOnline);
      socket.on('user_offline', handleUserOffline);
      socket.on('user_typing', handleUserTyping);
      socket.on('message_read_receipt', handleMessageReadReceipt);

      // Cleanup function
      return () => {
        socket.off('receive_message', handleReceiveMessage);
        socket.off('user_online', handleUserOnline);
        socket.off('user_offline', handleUserOffline);
        socket.off('user_typing', handleUserTyping);
        socket.off('message_read_receipt', handleMessageReadReceipt);
      };
    }
  }, [isConnected, socket, user, dispatch, state.currentChat?._id]);

  // Fetch chats on initial load
  const fetchChats = useCallback(async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const response = await fetch(`${API_BASE_URL}/chats`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        dispatch({ type: 'SET_CHATS', payload: data.data.chats });
      } else {
        dispatch({ type: 'SET_ERROR', payload: data.message || 'Failed to fetch chats' });
      }
    } catch (error) {
      console.error('Fetch chats error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch chats' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [token, dispatch]);

  useEffect(() => {
    if (user && token) {
      fetchChats();
    }
  }, [user, token, fetchChats]);

  const selectChat = async (chatId) => {
    console.log('Selecting chat:', chatId);
    dispatch({ type: 'SET_CHAT_LOADING', payload: true });
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const chatData = await response.json();
      console.log('Chat selection response:', response.status, chatData);

      if (response.ok) {
        console.log('Setting current chat:', chatData.data.chat);
        dispatch({ type: 'SET_CURRENT_CHAT', payload: chatData.data.chat });
        
        // Fetch messages for this chat
        const messagesResponse = await fetch(`${API_BASE_URL}/messages/chat/${chatId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const messagesData = await messagesResponse.json();

        if (messagesResponse.ok) {
          dispatch({ type: 'SET_MESSAGES', payload: messagesData.data.messages });
        }

        // Join chat room
        if (socket && isConnected) {
          socket.emit('join_chat', chatId);
        }

        // Mark chat as read
        await fetch(`${API_BASE_URL}/chats/${chatId}/read`, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to select chat' });
    } finally {
      dispatch({ type: 'SET_CHAT_LOADING', payload: false });
    }
  };

  const sendMessage = async (content, type = 'text', fileData) => {
    if (!state.currentChat) return;

    try {
      const messageData = {
        chatId: state.currentChat._id,
        content,
        type,
        ...(fileData && {
          fileUrl: fileData.fileUrl,
          fileName: fileData.fileName,
          fileSize: fileData.fileSize,
        }),
      };

      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(messageData),
      });

      const data = await response.json();

      if (response.ok) {
        dispatch({ type: 'ADD_MESSAGE', payload: data.data.message });
        
        // Emit socket event
        if (socket && isConnected) {
          socket.emit('send_message', {
            chatId: state.currentChat._id,
            message: data.data.message,
            senderId: user?.id,
            type,
          });
        }
      } else {
        dispatch({ type: 'SET_ERROR', payload: data.message });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to send message' });
    }
  };

  const editMessage = async (messageId, content) => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();

      if (response.ok) {
        dispatch({ type: 'UPDATE_MESSAGE', payload: data.data.message });
      } else {
        dispatch({ type: 'SET_ERROR', payload: data.message });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to edit message' });
    }
  };

  const deleteMessage = async (messageId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        dispatch({ type: 'DELETE_MESSAGE', payload: messageId });
      } else {
        const data = await response.json();
        dispatch({ type: 'SET_ERROR', payload: data.message });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to delete message' });
    }
  };

  const addReaction = async (messageId, emoji) => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/${messageId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ emoji }),
      });

      const data = await response.json();

      if (response.ok) {
        dispatch({ type: 'UPDATE_MESSAGE', payload: { _id: messageId, reactions: data.data.reactions } });
      } else {
        dispatch({ type: 'SET_ERROR', payload: data.message });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to add reaction' });
    }
  };

  const removeReaction = async (messageId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/messages/${messageId}/react`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Update message locally to remove reaction
        const message = state.messages.find(m => m._id === messageId);
        if (message) {
          const updatedMessage = {
            ...message,
            reactions: message.reactions.filter(r => r.user._id !== user?.id),
          };
          dispatch({ type: 'UPDATE_MESSAGE', payload: updatedMessage });
        }
      } else {
        const data = await response.json();
        dispatch({ type: 'SET_ERROR', payload: data.message });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to remove reaction' });
    }
  };

  const markMessageAsRead = async (messageId) => {
    try {
      await fetch(`${API_BASE_URL}/messages/${messageId}/read`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error('Failed to mark message as read:', error);
    }
  };

  const searchMessages = async (query) => {
    if (!state.currentChat) return [];

    try {
      const response = await fetch(`${API_BASE_URL}/messages/search/${state.currentChat._id}?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        return data.data.messages;
      }
      return [];
    } catch (error) {
      console.error('Failed to search messages:', error);
      return [];
    }
  };

  const createChat = async (participants, type, name) => {
    console.log('Creating chat with:', { participants, type, name, API_BASE_URL, token });
    try {
      const response = await fetch(`${API_BASE_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ type, participants, name }),
      });

      const data = await response.json();
      console.log('Chat creation response:', response.status, data);

      if (response.ok) {
        dispatch({ type: 'SET_CHATS', payload: [data.data.chat, ...state.chats] });
        console.log('Chat created successfully:', data.data.chat);
        return data.data.chat;
      } else {
        console.log('Chat creation failed:', data.message);
        if (data.message === 'Private chat already exists' && data.data?.chat) {
          const existingChat = data.data.chat;
          dispatch({ type: 'SET_CHATS', payload: [existingChat, ...state.chats.filter(chat => chat._id !== existingChat._id)] });
          console.log('Returning existing chat:', existingChat);
          return existingChat;
        }
        dispatch({ type: 'SET_ERROR', payload: data.message });
        return null;
      }
    } catch (error) {
      console.error('Chat creation error:', error);
      dispatch({ type: 'SET_ERROR', payload: 'Failed to create chat' });
      return null;
    }
  };

  const leaveChat = async (chatId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        dispatch({ type: 'SET_CHATS', payload: state.chats.filter(chat => chat._id !== chatId) });
        if (state.currentChat?._id === chatId) {
          dispatch({ type: 'SET_CURRENT_CHAT', payload: null });
          dispatch({ type: 'SET_MESSAGES', payload: [] });
        }
        
        // Leave chat room
        if (socket && isConnected) {
          socket.emit('leave_chat', chatId);
        }
      } else {
        const data = await response.json();
        dispatch({ type: 'SET_ERROR', payload: data.message });
      }
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: 'Failed to leave chat' });
    }
  };

  return (
    <ChatContext.Provider
      value={{
        ...state,
        fetchChats,
        selectChat,
        sendMessage,
        editMessage,
        deleteMessage,
        addReaction,
        removeReaction,
        markMessageAsRead,
        searchMessages,
        createChat,
        leaveChat,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
