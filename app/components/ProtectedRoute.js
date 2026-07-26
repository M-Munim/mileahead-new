'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import Skeleton from './Skeleton';

export default function ProtectedRoute({ children }) {
  const { isLoggedIn, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.push('/auth/login');
    }
  }, [isLoggedIn, loading, router]);

  if (loading) {
    return <Skeleton.PageLoader />;
  }

  return isLoggedIn ? children : null;
}
