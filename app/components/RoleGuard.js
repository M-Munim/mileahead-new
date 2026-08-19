'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, ROLES, ROLE_NAMES } from '../contexts/AuthContext';
import { Shield, UserCog, AlertCircle } from 'lucide-react';
import Skeleton from './Skeleton';

/**
 * RoleGuard Component
 * Protects routes/components based on user roles
 * 
 * Usage:
 * <RoleGuard allowedRoles={['admin', 'manager']}>
 *   <YourProtectedComponent />
 * </RoleGuard>
 */
export default function RoleGuard({ 
  children, 
  allowedRoles = [], 
  fallback = null,
  redirectTo = '/dashboard',
  showMessage = true 
}) {
  const { role, loading, isLoggedIn } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!isLoggedIn) {
      router.push('/auth/login');
      return;
    }

    if (allowedRoles.length === 0) {
      // No role restriction
      setIsAuthorized(true);
      return;
    }

    if (allowedRoles.includes(role)) {
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
      if (!showMessage) {
        router.push(redirectTo);
      }
    }
  }, [role, loading, isLoggedIn, allowedRoles, redirectTo, showMessage, router]);

  if (loading) {
    return <Skeleton.PageLoader />;
  }

  if (!isLoggedIn) {
    return null;
  }

  if (!isAuthorized) {
    if (fallback) {
      return fallback;
    }

    if (showMessage) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
              <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" aria-hidden="true" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Access Denied
              </h2>
              <p className="text-gray-600 mb-6">
                You don't have permission to access this page.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  <span className="font-semibold">Your Role:</span>{' '}
                  {role ? ROLE_NAMES[role] : 'Unknown'}
                </p>
                <p className="text-sm text-gray-700 mt-2">
                  <span className="font-semibold">Required Roles:</span>{' '}
                  {allowedRoles.map(r => ROLE_NAMES[r]).join(', ')}
                </p>
              </div>
              <button
                onClick={() => router.push(redirectTo)}
                className="w-full py-3 px-4 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary-hover)] transition-colors font-medium"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  }

  return <>{children}</>;
}

/**
 * PermissionGuard Component
 * Protects content based on specific permissions
 * 
 * Usage:
 * <PermissionGuard permission="canManageFinance">
 *   <YourProtectedComponent />
 * </PermissionGuard>
 */
export function PermissionGuard({ children, permission, fallback = null }) {
  const { hasPermission, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!hasPermission(permission)) {
    if (fallback) {
      return fallback;
    }
    return null;
  }

  return <>{children}</>;
}

/**
 * RoleBadge Component
 * Displays a role badge
 * 
 * Usage:
 * <RoleBadge role="admin" />
 */
export function RoleBadge({ roleKey }) {
  const roleConfig = {
    [ROLES.ADMIN]: {
      icon: Shield,
      color: 'bg-purple-500',
      name: ROLE_NAMES[ROLES.ADMIN]
    },
    [ROLES.MANAGER]: {
      icon: UserCog,
      color: 'bg-blue-500',
      name: ROLE_NAMES[ROLES.MANAGER]
    }
  };

  const config = roleConfig[roleKey];
  if (!config) return null;

  const IconComponent = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full ${config.color} text-white text-xs font-medium`}>
      <IconComponent className="w-3 h-3" aria-hidden="true" />
      <span>{config.name}</span>
    </span>
  );
}

