'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/admin-login');
    } else if (!isAdmin) {
      router.push(`/${user.userType}/dashboard`);
    }
  }, [user, isLoading, isAdmin, router]);

  if (isLoading || !user || !isAdmin) {
    return null;
  }

  return <>{children}</>;
}
