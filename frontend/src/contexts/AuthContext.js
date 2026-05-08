import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from 'react-toastify';
import ApiService from '../services/ApiService';

const AuthContext = createContext(undefined);

const authReducer = (state, action) => {
  switch (action.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        isAuthenticated: true,
      };
    case 'LOGIN_FAILURE':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
      };
    case 'UPDATE_USER':
      return {
        ...state,
        user: state.user ? { ...state.user, ...action.payload } : null,
      };
    default:
      return state;
  }
};

const getNetworkErrorMessage = (error) => {
  console.error('API operation failed:', error);
  return error.response?.data?.message || 'Database operation failed. Please try again.';
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: JSON.parse(localStorage.getItem('user')),
    token: localStorage.getItem('cipherchat_token'),
    isLoading: false,
    isAuthenticated: !!localStorage.getItem('cipherchat_token'),
  });

  useEffect(() => {
    const token = localStorage.getItem('cipherchat_token');
    if (token) {
      fetchCurrentUser();
    }
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const user = await ApiService.getCurrentUser();
      if (!user) {
        localStorage.removeItem('cipherchat_token');
        localStorage.removeItem('user');
        dispatch({ type: 'LOGIN_FAILURE' });
      } else {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token: localStorage.getItem('cipherchat_token') },
        });
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      localStorage.removeItem('cipherchat_token');
      localStorage.removeItem('user');
      dispatch({ type: 'LOGIN_FAILURE' });
    }
  };

  const login = async (email, password) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const data = await ApiService.signIn(email, password);
      
      const { token, ...user } = data;

      localStorage.setItem('cipherchat_token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });
      toast.success('Login successful!');
      return true;
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      toast.error(getNetworkErrorMessage(error));
      return false;
    }
  };

  const register = async (username, email, password) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const data = await ApiService.signUp(username, email, password);

      const { token, ...user } = data;

      localStorage.setItem('cipherchat_token', token);
      localStorage.setItem('user', JSON.stringify(user));
      
      dispatch({
        type: 'LOGIN_SUCCESS',
        payload: { user, token },
      });
      toast.success('Registration successful!');
      return 'success';
    } catch (error) {
      dispatch({ type: 'LOGIN_FAILURE' });
      toast.error(getNetworkErrorMessage(error));
      return false;
    }
  };

  const logout = async () => {
    localStorage.removeItem('cipherchat_token');
    localStorage.removeItem('user');
    dispatch({ type: 'LOGOUT' });
    toast.info('Logged out successfully');
  };

  const updateProfile = async (data) => {
    try {
      // Assuming we'll add an updateProfile method to ApiService later
      // For now, let's just update the local state
      dispatch({ type: 'UPDATE_USER', payload: data });
      toast.success('Profile updated successfully!');
    } catch (error) {
      toast.error(getNetworkErrorMessage(error));
    }
  };

  const updateSettings = async (settings) => {
    try {
      // Assuming we'll add an updateSettings method to ApiService later
      dispatch({ type: 'UPDATE_USER', payload: { settings } });
      toast.success('Settings updated successfully!');
    } catch (error) {
      toast.error(getNetworkErrorMessage(error));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        register,
        logout,
        updateProfile,
        updateSettings,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
