import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
    } catch (error) {
      setUser(null);
      localStorage.removeItem('session_token');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const response = await authAPI.login({ email, password });
    const { user: userData, token } = response.data;
    localStorage.setItem('session_token', token);
    setUser(userData);
    return userData;
  };

  const register = async (email, password, name) => {
    const response = await authAPI.register({ email, password, name });
    const { user: userData, token } = response.data;
    localStorage.setItem('session_token', token);
    setUser(userData);
    return userData;
  };

  const processGoogleAuth = async (sessionId) => {
    const response = await authAPI.processGoogleSession(sessionId);
    const { user: userData, token } = response.data;
    localStorage.setItem('session_token', token);
    setUser(userData);
    return userData;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Ignore logout errors
    }
    localStorage.removeItem('session_token');
    setUser(null);
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getMe();
      setUser(response.data);
    } catch (error) {
      // Ignore
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    processGoogleAuth,
    refreshUser,
    isAuthenticated: !!user,
    isAdmin: user?.is_admin || false,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
