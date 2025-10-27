import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, AuthSession } from '@shared/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_KEY = 'auth_session';
const TIMEOUT_DURATION = 60 * 60 * 1000; // 1 hour

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  // Initialize session from localStorage
  useEffect(() => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const session: AuthSession = JSON.parse(savedSession);
        // Check if session is still valid
        if (session.expiresAt > Date.now()) {
          setUser(session.user);
          setupTimeout();
        } else {
          // Session expired
          localStorage.removeItem(SESSION_KEY);
        }
      } catch (error) {
        console.error('Error parsing saved session:', error);
        localStorage.removeItem(SESSION_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const setupTimeout = useCallback(() => {
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout for 1 hour of inactivity
    const newTimeoutId = setTimeout(() => {
      console.log('Session expired due to inactivity');
      logout();
    }, TIMEOUT_DURATION);

    setTimeoutId(newTimeoutId);
  }, [timeoutId]);

  // Reset timeout on user activity
  useEffect(() => {
    if (!user) return;

    const resetTimeout = () => {
      setupTimeout();
    };

    // Listen for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach((event) => {
      window.addEventListener(event, resetTimeout);
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, resetTimeout);
      });
    };
  }, [user, setupTimeout]);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      const session: AuthSession = {
        user: data.user,
        token: data.token,
        expiresAt: Date.now() + data.expiresIn * 1000,
      };

      setUser(data.user);
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem('auth_token', data.token);
      setupTimeout();
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();
      const session: AuthSession = {
        user: data.user,
        token: data.token,
        expiresAt: Date.now() + data.expiresIn * 1000,
      };

      setUser(data.user);
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
      localStorage.setItem('auth_token', data.token);
      setupTimeout();
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem('auth_token');
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
