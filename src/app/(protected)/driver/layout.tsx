'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export default function DriverLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && user.userType !== 'driver') {
      // User is logged in but not a driver, redirect
      router.push('/customer/dashboard');
    }
  }, [user, isLoading, router]);

  // The parent layout is already handling the loading and auth check.
  // We just need to ensure the user is a driver before rendering children.
  if (isLoading || !user || user.userType !== 'driver') {
    // Render nothing or a loading indicator while redirecting
    return null;
  }

  // Render the children directly, as the Header is in the parent layout
  return <>{children}</>;
}
