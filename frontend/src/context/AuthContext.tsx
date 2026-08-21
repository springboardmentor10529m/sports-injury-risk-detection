'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User, UserRole } from '../lib/types';
import { ApiClient } from '../lib/api';
import { removeTokens, isAuthenticated } from '../lib/auth';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, pass: string) => Promise<void>;
  register: (userData: { email: string; password: string; full_name: string; role: UserRole }) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const refreshUser = async () => {
    if (!isAuthenticated()) {
      setUser(null);
      setIsLoading(false);
      return;
    }
    try {
      const userData = await ApiClient.getMe();
      setUser(userData);
      setError(null);
    } catch (err: any) {
      console.error('Failed to load user profile', err);
      setUser(null);
      removeTokens();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    setError(null);
    try {
      await ApiClient.login(email, pass);
      const userData = await ApiClient.getMe();
      setUser(userData);
      
      // Role-based redirection
      const rolePath = userData.role.toLowerCase().replace('_', '-');
      router.push(`/dashboard/${rolePath}`);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify your credentials.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: { email: string; password: string; full_name: string; role: UserRole }) => {
    setIsLoading(true);
    setError(null);
    try {
      await ApiClient.register(userData);
      // Automatically log in after registration
      await login(userData.email, userData.password);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Email may already be taken.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeTokens();
    setUser(null);
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
