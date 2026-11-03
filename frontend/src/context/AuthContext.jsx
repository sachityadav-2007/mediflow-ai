import { createContext, useContext, useState, useEffect } from 'react';
import {
  getCurrentUser,
  loginUser,
  registerUser,
  logoutUser,
} from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if an existing session cookie is valid on application startup
  const checkAuth = async () => {
    try {
      const data = await getCurrentUser();
      if (data && data.success && data.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (error) {
      setUser(null);
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
      setUser(data.user);
      return data.user;
    }
    throw new Error(data?.message || 'Login failed');
  };

  // Register handler
  const register = async (userData) => {
    const data = await registerUser(userData);
    if (data && data.success && data.user) {
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

