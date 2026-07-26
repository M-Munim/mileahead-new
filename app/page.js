'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './contexts/AuthContext';
import Skeleton from './components/Skeleton';

export default function HomePage() {
  const router = useRouter();
  const { isLoggedIn, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (isLoggedIn) {
        router.replace('/dashboard');
      } else {
        router.replace('/auth/login');
      }
    }
  }, [isLoggedIn, loading, router]);

  if (loading) {
    return <Skeleton.PageLoader />;
  }

  return null;
}
