import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from 'react-toastify';
import supabase from '../config/supabase';

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
  console.error('Supabase operation failed:', error);
  return 'Database operation failed. Please try again.';
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, {
    user: null,
    token: localStorage.getItem('cipherchat_token'),
    isLoading: false,
    isAuthenticated: false,
  });

  useEffect(() => {
    const token = localStorage.getItem('cipherchat_token');
    if (token) {
      fetchCurrentUser(token);
    }
  }, []);

  const fetchCurrentUser = async (token) => {
    try {
      const { data, error } = await supabase.auth.getUser(token);
      const user = data?.user || null;

      if (error || !user) {
        localStorage.removeItem('cipherchat_token');
        dispatch({ type: 'LOGIN_FAILURE' });
      } else {
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, token },
        });
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
      localStorage.removeItem('cipherchat_token');
      dispatch({ type: 'LOGIN_FAILURE' });
    }
  };

  const login = async (username, password) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      // First, look up user by username from users table
      const { data: userData, error: lookupError } = await supabase
        .from('users')
        .select('email')
        .eq('username', username)
        .single();

      if (lookupError || !userData) {
        dispatch({ type: 'LOGIN_FAILURE' });
        toast.error('Username not found');
        return false;
      }

      const email = userData.email;

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        dispatch({ type: 'LOGIN_FAILURE' });
        if (/not confirmed|confirm your email|email not confirmed|email not verified/i.test(error.message)) {
          toast.error('Your email address is not confirmed yet. Please check your inbox for the verification link before logging in.');
        } else {
          toast.error(error.message || 'Login failed');
        }
        return false;
      }

      const user = data?.user || null;
      const token = data?.session?.access_token || null;

      if (!token || !user) {
        dispatch({ type: 'LOGIN_FAILURE' });
        toast.error('Login failed');
        return false;
      }

      localStorage.setItem('cipherchat_token', token);
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            avatar: `https://ui-avatars.com/api/?name=${username}&background=28a745&color=fff&size=80`
          }
        }
      });

      if (error) {
        dispatch({ type: 'LOGIN_FAILURE' });
        console.error('Registration error:', error);
        const status = error.status || error.statusCode || error.status_code || 0;
        const isRateLimit = status === 429 || /rate limit/i.test(error.message) || /too many requests/i.test(error.message) || /email rate limit exceeded/i.test(error.message);
        const isPendingVerification = /pending|verification email|already sent|already requested|already registered but not confirmed|email not confirmed|confirm your email/i.test(error.message);
        const isAlreadyRegistered = /already registered|duplicate|already exists|user already exists|account already exists/i.test(error.message);

        if (isRateLimit || isPendingVerification) {
          toast.info('A verification email was already sent. Please check your inbox and verify your email before trying again.');
          return 'pending';
        }

        if (isAlreadyRegistered) {
          toast.error('This email is already registered. Try logging in instead.');
          return false;
        }

        toast.error(error.message || 'Registration failed');
        return false;
      }

      const user = data?.user || null;
      const token = data?.session?.access_token || null;

      if (!user) {
        dispatch({ type: 'LOGIN_FAILURE' });
        toast.error('Registration failed. Please try again.');
        return false;
      }

      if (!token) {
        dispatch({ type: 'LOGIN_FAILURE' });
        toast.success('Registration successful! Please verify your email before logging in.');
        return 'pending';
      }

      localStorage.setItem('cipherchat_token', token);
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
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Error during logout:', error);
      }
    } catch (error) {
      console.error('Error during logout:', error);
    }

    localStorage.removeItem('cipherchat_token');
    dispatch({ type: 'LOGOUT' });
    toast.info('Logged out successfully');
  };

  const updateProfile = async (data) => {
    try {
      const { data: { user }, error } = await supabase
        .from('users')
        .update(data)
        .eq('id', state.user?.id)
        .select();

      if (error) {
        toast.error(error.message || 'Failed to update profile');
      } else {
        dispatch({ type: 'UPDATE_USER', payload: user });
        toast.success('Profile updated successfully!');
      }
    } catch (error) {
      toast.error(getNetworkErrorMessage(error));
    }
  };

  const updateSettings = async (settings) => {
    try {
      const { data: { user }, error } = await supabase
        .from('users')
        .update({ settings })
        .eq('id', state.user?.id)
        .select();

      if (error) {
        toast.error(error.message || 'Failed to update settings');
      } else {
        dispatch({ type: 'UPDATE_USER', payload: { settings: user.settings } });
        toast.success('Settings updated successfully!');
      }
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
