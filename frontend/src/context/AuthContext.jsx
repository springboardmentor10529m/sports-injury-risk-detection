import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[AUTH] initializing');
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
      console.log('[AUTH] authentication complete (unauthenticated)');
    }
  }, [token]);

  const fetchCurrentUser = async () => {
    try {
      setLoading(true);
      const userData = await api.get('/api/auth/me');
      setUser(userData);
      console.log('[AUTH] authentication complete (authenticated as ' + (userData?.email || 'user') + ')');
    } catch (err) {
      console.error('Failed to fetch current user:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const cleanEmail = (email || '').trim();
    const data = await api.post('/api/auth/login', { email: cleanEmail, password });
    localStorage.setItem('token', data.access_token);
    setToken(data.access_token);
    await fetchCurrentUser();
  };

  const loginWithGoogle = async (credential, role = 'ATHLETE') => {
    const data = await api.post('/api/auth/google', { credential, role });
    if (data?.access_token) {
      localStorage.setItem('token', data.access_token);
      setToken(data.access_token);
      await fetchCurrentUser();
    }
    return data;
  };

  const register = async (name, email, password, role, phone) => {
    await api.post('/api/auth/register', { name, email, password, role, phone });
    await login(email, password);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
  };

  const updateUserProfile = (updatedUser) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, fetchCurrentUser, updateUserProfile, loginWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
