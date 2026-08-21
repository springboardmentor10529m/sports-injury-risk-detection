'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { DashboardSkeleton } from '../../components/ui/Skeleton';

export default function DashboardIndex() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/login');
      } else {
        const rolePath = user.role.toLowerCase().replace('_', '-');
        router.push(`/dashboard/${rolePath}`);
      }
    }
  }, [user, isLoading, router]);

  return <DashboardSkeleton />;
}
