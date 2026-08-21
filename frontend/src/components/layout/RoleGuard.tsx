'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../lib/types';
import { DashboardSkeleton } from '../ui/Skeleton';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="p-6 sm:p-8 max-w-7xl mx-auto">
        <DashboardSkeleton />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6">
        <Alert variant="danger" title="Access Denied (403 Forbidden)">
          <p className="mb-4">
            Your current role (<strong className="capitalize">{user.role}</strong>) does not have authorization to view this clinical or analytical area.
          </p>
          <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/${user.role.toLowerCase().replace('_', '-')}`)}>
            Return to My Dashboard
          </Button>
        </Alert>
      </div>
    );
  }

  return <>{children}</>;
}
