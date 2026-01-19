/**
 * Auth Store mit Zustand
 * Kapitel 10: RAG-Frontend & Zugriffskontrolle
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Role = 'admin' | 'manager' | 'employee' | 'guest';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  tenantId: string;
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  clearError: () => void;
}

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      refreshToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Login fehlgeschlagen');
          }

          const data = await response.json();

          set({
            token: data.token,
            refreshToken: data.refreshToken,
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({
            isLoading: false,
            error: error instanceof Error ? error.message : 'Login fehlgeschlagen',
          });
          throw error;
        }
      },

      logout: () => {
        const { token } = get();

        // Logout auf Server (fire and forget)
        if (token) {
          fetch(`${API_URL}/auth/logout`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }).catch(() => {});
        }

        set({
          token: null,
          refreshToken: null,
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      refreshAuth: async () => {
        const { refreshToken } = get();

        if (!refreshToken) {
          get().logout();
          return;
        }

        try {
          const response = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });

          if (!response.ok) {
            throw new Error('Token refresh failed');
          }

          const data = await response.json();

          set({
            token: data.token,
            refreshToken: data.refreshToken,
          });
        } catch {
          get().logout();
        }
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'rag-auth-storage',
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Helper: Ist User mindestens Manager?
export function isManager(user: User | null): boolean {
  return user?.role === 'admin' || user?.role === 'manager';
}

// Helper: Ist User Admin?
export function isAdmin(user: User | null): boolean {
  return user?.role === 'admin';
}
