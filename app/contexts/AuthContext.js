'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

// Available roles in the system.
// These are the SINGLE SOURCE OF TRUTH for roles across login AND signup.
// The values MUST match what the backend accepts (see GET /api/v1/role-details).
export const ROLES = {
  CHAUFFEUR: 'chauffeurs',
  PDDRIVER: 'pddriver',
};

// Role display names
export const ROLE_NAMES = {
  [ROLES.CHAUFFEUR]: 'Chauffeur',
  [ROLES.PDDRIVER]: 'PD Driver',
};

// Role permissions.
// Both driver roles currently get full access to the admin panel. Flip any of
// these to `false` later if you want to restrict what a given role can see.
export const ROLE_PERMISSIONS = {
  [ROLES.CHAUFFEUR]: {
    canAccessDashboard: true,
    canManageUsers: true,
    canManageBookings: true,
    canManageFinance: true,
    canManagePricing: true,
    canManageFleet: true,
    canAccessReports: true,
    canManageSettings: true,
  },
  [ROLES.PDDRIVER]: {
    canAccessDashboard: true,
    canManageUsers: true,
    canManageBookings: true,
    canManageFinance: true,
    canManagePricing: true,
    canManageFleet: true,
    canAccessReports: true,
    canManageSettings: true,
  },
};

/**
 * Check if a JWT token is expired by decoding the payload.
 * Returns true if expired or unparseable.
 */
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (!payload.exp) return false;
    // Add 60s buffer so we don't use a token that's about to expire
    return Date.now() >= (payload.exp * 1000) - 60000;
  } catch {
    return true;
  }
}

/**
 * Safely read from localStorage (returns null on error or during SSR).
 */
function safeGetItem(key) {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Safely parse JSON from localStorage.
 */
function safeGetJSON(key) {
  try {
    const value = safeGetItem(key);
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage (hydration-safe)
  useEffect(() => {
    const token = safeGetItem('token');
    const userData = safeGetJSON('user');
    const userRole = safeGetItem('userRole');

    if (token && !isTokenExpired(token)) {
      setIsLoggedIn(true);
      if (userData) setUser(userData);
      if (userRole) setRole(userRole);
    } else if (token) {
      // Token exists but is expired — clear it
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
    }
    setLoading(false);
  }, []);

  const login = useCallback((token, userData = null, userRole = ROLES.CHAUFFEUR) => {
    localStorage.setItem('token', token);
    if (userData) {
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    }
    localStorage.setItem('userRole', userRole);
    setRole(userRole);
    setIsLoggedIn(true);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    setIsLoggedIn(false);
    setUser(null);
    setRole(null);
  }, []);

  const hasPermission = useCallback((permission) => {
    if (!role) return false;
    return ROLE_PERMISSIONS[role]?.[permission] || false;
  }, [role]);

  const isRole = useCallback((checkRole) => {
    return role === checkRole;
  }, [role]);

  return (
    <AuthContext.Provider value={{
      isLoggedIn,
      user,
      role,
      loading,
      login,
      logout,
      hasPermission,
      isRole,
      roleName: role ? ROLE_NAMES[role] : null
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
