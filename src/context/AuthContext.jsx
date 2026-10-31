import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { hasPermission as evaluatePermission, getCachedUserPermissions, normalizePermissions } from '../utils/permissions';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    // If token is a fake/mock token or malformed, purge it
    if (token && (token.startsWith('mock-') || token.split('.').length !== 3)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    } else if (token && userData) {
      try {
        let parsed = JSON.parse(userData);
        if (parsed && (parsed.role || '').toUpperCase() === 'ADMIN' && !parsed.permissions) {
          const cachedPerms = getCachedUserPermissions(parsed.id, parsed.email);
          if (cachedPerms) {
            parsed.permissions = cachedPerms;
          }
        }
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, user: userData } = response.data;
      
      // If user is ADMIN and permissions aren't embedded in backend response, enrich from local RBAC cache
      if (userData && (userData.role || '').toUpperCase() === 'ADMIN') {
        const cached = getCachedUserPermissions(userData.id, userData.email);
        if (cached && !userData.permissions) {
          userData.permissions = cached;
        } else if (userData.permissions) {
          userData.permissions = normalizePermissions(userData.permissions);
        }
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  const updateCurrentUser = (updatedData) => {
    setUser((prev) => {
      const merged = { ...prev, ...updatedData };
      localStorage.setItem('user', JSON.stringify(merged));
      return merged;
    });
  };

  // Reusable Permission Helper Hook method
  const hasPermission = useCallback((moduleKey, action = 'view') => {
    return evaluatePermission(user, moduleKey, action);
  }, [user]);

  const isSuperAdmin = (user?.role || '').toUpperCase() === 'SUPER_ADMIN';
  const isAdmin = (user?.role || '').toUpperCase() === 'ADMIN';

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        loading,
        hasPermission,
        isSuperAdmin,
        isAdmin,
        updateCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

