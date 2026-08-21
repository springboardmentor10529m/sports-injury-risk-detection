'use client';

import React, { useState, useEffect } from 'react';
import { ApiClient } from '../../../lib/api';
import { User, UserRole } from '../../../lib/types';
import { StatCard } from '../../../components/ui/StatCard';
import { Card, CardHeader, CardBody } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { Button } from '../../../components/ui/Button';
import { Alert } from '../../../components/ui/Alert';
import { SettingsIcon, UsersIcon, ShieldCheckIcon } from '../../../components/ui/Icons';
import { DashboardSkeleton } from '../../../components/ui/Skeleton';

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadUsers = async () => {
    try {
      const data = await ApiClient.listUsers(0, 100);
      setUsers(data);
    } catch (err) {
      console.error('Failed to load user accounts', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setUpdatingUserId(userId);
    setStatusMessage(null);
    try {
      const updated = await ApiClient.changeUserRole(userId, newRole);
      setUsers(users.map((u) => (u.id === userId ? updated : u)));
      setStatusMessage(`User "${updated.full_name}" role updated to ${newRole}`);
    } catch (err: any) {
      console.error('Failed to update role', err);
    } finally {
      setUpdatingUserId(null);
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const roleCounts = {
    ATHLETE: users.filter((u) => u.role === UserRole.ATHLETE).length,
    COACH: users.filter((u) => u.role === UserRole.COACH).length,
    PHYSIOTHERAPIST: users.filter((u) => u.role === UserRole.PHYSIOTHERAPIST).length,
    SPORTS_SCIENTIST: users.filter((u) => u.role === UserRole.SPORTS_SCIENTIST).length,
    ADMIN: users.filter((u) => u.role === UserRole.ADMIN).length,
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">System Administration</span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-0.5">
            User Governance & RBAC
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage authenticated accounts, modify user roles, and monitor active sessions
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="success" size="md">
            RBAC Enforcement Active
          </Badge>
        </div>
      </div>

      {statusMessage && (
        <Alert variant="success" title="Role Updated">
          {statusMessage}
        </Alert>
      )}

      {/* Stats Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <StatCard
          label="Total Users"
          value={users.length}
          subtext="Registered accounts"
          icon={<UsersIcon className="w-5 h-5 text-brand-primary" />}
        />
        <StatCard
          label="Athletes"
          value={roleCounts.ATHLETE}
          subtext="Movement trackers"
          icon={<UsersIcon className="w-5 h-5 text-indigo-600" />}
        />
        <StatCard
          label="Coaches"
          value={roleCounts.COACH}
          subtext="Team overseers"
          icon={<UsersIcon className="w-5 h-5 text-teal-600" />}
        />
        <StatCard
          label="Physiotherapists"
          value={roleCounts.PHYSIOTHERAPIST}
          subtext="Clinical staff"
          icon={<ShieldCheckIcon className="w-5 h-5 text-rose-600" />}
        />
        <StatCard
          label="Sports Scientists"
          value={roleCounts.SPORTS_SCIENTIST}
          subtext="Analytics staff"
          icon={<SettingsIcon className="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* Real User Management Table */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-base">Registered System Users</h3>
            <p className="text-xs text-slate-500">Direct query from PostgreSQL / SQLite user database</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadUsers}>
            Refresh Users
          </Button>
        </CardHeader>
        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-6 py-3">Full Name</th>
                  <th className="px-6 py-3">Email Address</th>
                  <th className="px-6 py-3">Current Role</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Created Date</th>
                  <th className="px-6 py-3 text-right">Modify Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900">{u.full_name}</td>
                    <td className="px-6 py-3.5 text-slate-600 text-xs font-mono">{u.email}</td>
                    <td className="px-6 py-3.5">
                      <Badge variant={u.role === UserRole.ADMIN ? 'danger' : 'info'} size="sm">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5">
                      <Badge variant={u.is_active ? 'success' : 'neutral'} size="sm">
                        {u.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <select
                        value={u.role}
                        disabled={updatingUserId === u.id}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      >
                        <option value={UserRole.ATHLETE}>ATHLETE</option>
                        <option value={UserRole.COACH}>COACH</option>
                        <option value={UserRole.PHYSIOTHERAPIST}>PHYSIOTHERAPIST</option>
                        <option value={UserRole.SPORTS_SCIENTIST}>SPORTS_SCIENTIST</option>
                        <option value={UserRole.ADMIN}>ADMIN</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
