'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

// Available roles in the system.
// These are the SINGLE SOURCE OF TRUTH for roles across login AND signup.
// The values MUST match what the backend accepts (see GET /api/v1/role-details).
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
};

// Role display names
export const ROLE_NAMES = {
  [ROLES.ADMIN]: 'Admin',
  [ROLES.MANAGER]: 'Manager',
};

// Role permissions.
// Flip any of these to change what a Manager can do.
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
    canAccessDashboard: true,
    canManageUsers: true,
    canManageBookings: true,
    canManageFinance: true,
    canManagePricing: true,
    canDeleteRecords: true,
    canManageFleet: true,
    canAccessReports: true,
    canManageSettings: true,
  },
  [ROLES.MANAGER]: {
    canAccessDashboard: true,
    canManageUsers: true,
    canManageBookings: true,
    canManageFinance: true,
    // Client request: only Admin changes prices for now. Managers still see them.
    canManagePricing: false,
    // Deleting records (data cleanup) is Admin only.
    canDeleteRecords: false,
    canManageFleet: true,
    canAccessReports: true,
    canManageSettings: true,
  },
};

/**
 * Roles allowed into this dashboard. Driver accounts (chauffeurs / pddriver)
 * still exist in the backend but have no business in the admin panel.
 */
export function isDashboardRole(value) {
  return Object.values(ROLES).includes(value);
}

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
      // Ignore roles saved before the Chauffeur/PD Driver -> Admin/Manager
      // rename; fall back to Admin so old sessions aren't locked out.
      const validRole = isDashboardRole(userRole) ? userRole : ROLES.ADMIN;
      setRole(validRole);
      localStorage.setItem('userRole', validRole);
    } else if (token) {
      // Token exists but is expired — clear it
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
    }
    setLoading(false);
  }, []);

  const login = useCallback((token, userData = null, userRole = ROLES.ADMIN) => {
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
