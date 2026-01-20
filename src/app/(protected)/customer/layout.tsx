'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function CustomerLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && user.userType !== 'customer') {
      router.push('/driver/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.userType !== 'customer') {
    return null;
  }

  return <>{children}</>;
}
