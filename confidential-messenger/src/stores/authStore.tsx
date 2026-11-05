'use client';
import { create } from 'zustand';

interface AuthState {
  user: any;
  isAuthenticated: boolean;
}

interface AuthActions {
  login: (user: any) => void;
  logout: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  login: (user) => set({ user, isAuthenticated: true }),
  logout: () => set({ user: null, isAuthenticated: false }),
}));
