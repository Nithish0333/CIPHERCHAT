import React, { createContext, useContext, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(undefined);

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = React.useState(false);

  useEffect(() => {
    // Always disconnect existing socket first
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    }

    if (isAuthenticated && token) {
      // Initialize socket connection
      const serverUrl = process.env.REACT_APP_SERVER_URL || 'http://localhost:5001';

      const socket = io(serverUrl, {
        auth: {
          token
        },
        forceNew: true, // Force new connection
        timeout: 20000, // 20 seconds timeout
        transports: ['websocket', 'polling'], // Fallback transports
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000
      });

      socket.on('connect', () => {
        console.log('Connected to server');
        setIsConnected(true);
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from server');
        setIsConnected(false);
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setIsConnected(false);
        
        // Show user-friendly error message
        if (error.message?.includes('ECONNREFUSED')) {
          console.log('Server is not running or not accepting connections');
        } else if (error.message?.includes('timeout')) {
          console.log('Connection timeout, please check your internet connection');
        } else {
          console.log('Connection error:', error.message);
        }
      });
      
      socket.on('reconnect', (attemptNumber) => {
        console.log('Reconnecting to server...', attemptNumber);
      });
      
      socket.on('reconnect_failed', () => {
        console.error('Failed to reconnect to server');
        setIsConnected(false);
      });

      socketRef.current = socket;

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
          setIsConnected(false);
        }
      };
    }
  }, [isAuthenticated, token]);

  const emit = (event, data) => {
    if (socketRef.current && isConnected) {
      socketRef.current.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        emit,
        on,
        off,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
