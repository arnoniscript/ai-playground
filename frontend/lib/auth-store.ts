'use client';

import { create } from 'zustand';
import { User } from '@/lib/types';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  isAuthenticated: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => {
  // Initialize from localStorage if in browser
  if (typeof window !== 'undefined') {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        set({
          token: storedToken,
          user: JSON.parse(storedUser),
        });
      } catch (error) {
        console.error('Failed to restore auth state:', error);
      }
    }
  }

  return {
    user: null,
    token: null,
    isLoading: false,
    setAuth: (user, token) => {
      set({ user, token });
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    },
    setUser: (user) => {
      set({ user });
      localStorage.setItem('user', JSON.stringify(user));
    },
    logout: () => {
      set({ user: null, token: null });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    setLoading: (loading) => set({ isLoading: loading }),
    isAuthenticated: () => get().token !== null,
    isAdmin: () => get().user?.role === 'admin',
  };
});
