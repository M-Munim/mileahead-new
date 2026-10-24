'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext();

// Dashboard roles (client request, 18 Oct 2026):
//   Super Admin — sees and changes everything, deletes, and approves Admins' delete requests.
//   Admin       — enters and updates orders (paid, stage, payment), Customer Data and
//                 Screen Ads, but cannot delete: they send a delete request instead.
export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
};

// Role display names
export const ROLE_NAMES = {
  [ROLES.SUPER_ADMIN]: 'Super Admin',
  [ROLES.ADMIN]: 'Admin',
};

// Role permissions.
export const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: {
    canAccessDashboard: true,
    canManageUsers: true,
    canManageBookings: true,
    canManageFinance: true,
    canManagePricing: true,
    canDeleteRecords: true,
    canReviewDeleteRequests: true,
    canRequestDelete: false, // deletes directly
    canManageFleet: true,
    canAccessReports: true,
    canManageSettings: true,
  },
  [ROLES.ADMIN]: {
    canAccessDashboard: true,
    canManageUsers: false,
    canManageBookings: true,
    canManageFinance: true,
    canManagePricing: false,
    canDeleteRecords: false,
    canReviewDeleteRequests: false,
    canRequestDelete: true,
    canManageFleet: true,
    canAccessReports: true,
    canManageSettings: true,
  },
};

/**
 * Until the backend has a super_admin role, its existing 'admin' account (the
 * owner's) is the Super Admin and 'manager' accounts are Admins. Set this to
 * true once the backend uses super_admin / admin, so 'admin' means Admin.
 */
export const BACKEND_HAS_SUPER_ADMIN_ROLE = true; // super_admin role live since 21 Oct 2026

/**
 * Dashboard role for the role name the server returns, or null for accounts
 * with no access (drivers). Normalised: the backend saved the manager role as
 * "Manager " (capital, trailing space).
 */
export function roleFromServer(serverRole) {
  const r = String(serverRole || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (r === 'super_admin' || r === 'superadmin') return ROLES.SUPER_ADMIN;
  if (r === 'admin') return BACKEND_HAS_SUPER_ADMIN_ROLE ? ROLES.ADMIN : ROLES.SUPER_ADMIN;
  if (r === 'manager') return ROLES.ADMIN;
  return null;
}

/** Roles allowed into this dashboard. */
export function isDashboardRole(value) {
  return Object.values(ROLES).includes(value);
}

// Sessions saved before the Super Admin / Admin change hold old role names; they log in again.
const ROLE_VERSION = '2';

/**
 * Check if a JWT token is expired by decoding the payload.
 * Returns true if expired or unparseable.
 */
/** The JWT's payload ({ id, username, role, exp }), or null if it can't be read. */
function tokenPayload(token) {
  try {
    const part = String(token).split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(part.padEnd(part.length + ((4 - (part.length % 4)) % 4), '=')));
  } catch {
    return null;
  }
}

function isTokenExpired(token) {
  // Sessions from the old offline demo login are not valid on the real backend.
  if (String(token).startsWith('demo.')) return true;
  try {
    const payload = tokenPayload(token);
    if (!payload) return true;
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
    // The role comes from the token itself, which is what the server checks.
    // A role saved in the browser can be stale (e.g. "admin" counted as Super
    // Admin before 21 Oct 2026) and would show buttons the server refuses.
    const userRole = token ? roleFromServer(tokenPayload(token)?.role) : null;
    const current = safeGetItem('roleVersion') === ROLE_VERSION && isDashboardRole(userRole);

    if (token && !isTokenExpired(token) && current) {
      localStorage.setItem('userRole', userRole);
      setIsLoggedIn(true);
      if (userData) setUser(userData);
      setRole(userRole);
    } else if (token) {
      // Expired, or saved with the old role names — clear it so they log in again.
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('userRole');
      localStorage.removeItem('roleVersion');
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
    localStorage.setItem('roleVersion', ROLE_VERSION);
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
