import { createContext, useContext, useState, useEffect } from 'react';
import {
  getCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('mediflow_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // Check if an existing session is valid on application startup
  const checkAuth = async () => {
    const token =
      localStorage.getItem('mediflow_token') ||
      localStorage.getItem('token');
    const cachedUser = localStorage.getItem('mediflow_user');

    // If there is no token and no cached user, no session to verify
    if (!token && !cachedUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await getCurrentUser();
      if (data && data.success && data.user) {
        setUser(data.user);
        try {
          localStorage.setItem('mediflow_user', JSON.stringify(data.user));
        } catch {
          // Ignore storage quota errors
        }
      } else {
        setUser(null);
        try {
          localStorage.removeItem('mediflow_token');
          localStorage.removeItem('token');
          localStorage.removeItem('mediflow_user');
        } catch {
          // Ignore
        }
      }
    } catch (error) {
      // If server explicitly responded 401 Unauthorized, token is expired/invalid
      if (error.response && error.response.status === 401) {
        setUser(null);
        try {
          localStorage.removeItem('mediflow_token');
          localStorage.removeItem('token');
          localStorage.removeItem('mediflow_user');
        } catch {
          // Ignore
        }
      } else {
        // For temporary network glitches or Render cold-start latency,
        // preserve existing cached session so user is not abruptly logged out
        if (cachedUser && token) {
          try {
            setUser(JSON.parse(cachedUser));
          } catch {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  // Login handler
  const login = async (email, password) => {
    const data = await loginUser({ email, password });
    if (data && data.success && data.user) {
      if (data.token) {
        try {
          localStorage.setItem('mediflow_token', data.token);
          localStorage.setItem('token', data.token);
        } catch {
          // Ignore
        }
      }
      try {
        localStorage.setItem('mediflow_user', JSON.stringify(data.user));
      } catch {
        // Ignore
      }
      setUser(data.user);
      return data.user;
    }
    throw new Error(data?.message || 'Login failed');
  };

  // Register handler
  const register = async (userData) => {
    const data = await registerUser(userData);
    if (data && data.success && data.user) {
      if (data.token) {
        try {
          localStorage.setItem('mediflow_token', data.token);
          localStorage.setItem('token', data.token);
        } catch {
          // Ignore
        }
      }
      try {
        localStorage.setItem('mediflow_user', JSON.stringify(data.user));
      } catch {
        // Ignore
      }
      setUser(data.user);
      return data.user;
    }
    throw new Error(data?.message || 'Registration failed');
  };

  // Logout handler
  const logout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      try {
        localStorage.removeItem('mediflow_token');
        localStorage.removeItem('token');
        localStorage.removeItem('mediflow_user');
      } catch {
        // Ignore
      }
      setUser(null);
    }
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to consume authentication context easily
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

