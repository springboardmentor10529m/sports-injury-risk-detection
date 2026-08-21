'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { ApiClient } from '../../lib/api';
import { Sidebar } from '../../components/layout/Sidebar';
import { Header } from '../../components/layout/Header';
import { RoleGuard } from '../../components/layout/RoleGuard';
import { Card, CardHeader, CardBody } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Alert } from '../../components/ui/Alert';
import { ShieldCheckIcon, CheckCircleIcon } from '../../components/ui/Icons';

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setEmail(user.email || '');
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);
    setIsSaving(true);

    try {
      await ApiClient.updateMe({
        full_name: fullName.trim(),
        email: email.trim(),
      });
      await refreshUser();
      setStatusMessage({ type: 'success', text: 'Profile updated successfully in the database.' });
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to update profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RoleGuard>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div className="flex flex-col flex-1 w-full overflow-hidden">
          <Header onOpenSidebar={() => setSidebarOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-4xl mx-auto space-y-6">
              {/* Header */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-bold text-xl">
                    {user?.full_name?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-950 tracking-tight">
                      {user?.full_name || 'My Profile'}
                    </h1>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="info" size="sm">
                        {user?.role}
                      </Badge>
                      <span className="text-xs text-slate-400 font-mono">
                        UUID: {user?.id}
                      </span>
                    </div>
                  </div>
                </div>

                <Badge variant={user?.is_active ? 'success' : 'neutral'} size="md">
                  {user?.is_active ? 'Active Account' : 'Inactive'}
                </Badge>
              </div>

              {statusMessage && (
                <Alert
                  variant={statusMessage.type === 'success' ? 'success' : 'danger'}
                  title={statusMessage.type === 'success' ? 'Success' : 'Error'}
                >
                  {statusMessage.text}
                </Alert>
              )}

              {/* Profile Details Card */}
              <Card>
                <CardHeader>
                  <h3 className="font-bold text-slate-900 text-base">Account Information</h3>
                  <p className="text-xs text-slate-500">Edit your user credentials and contact email</p>
                </CardHeader>
                <CardBody className="p-6 sm:p-8">
                  <form onSubmit={handleUpdateProfile} className="space-y-5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                        Platform Assigned Role
                      </label>
                      <input
                        type="text"
                        disabled
                        value={user?.role || ''}
                        className="w-full px-3.5 py-2.5 text-sm bg-slate-100 border border-slate-200 rounded-xl text-slate-500 cursor-not-allowed font-semibold"
                      />
                      <p className="text-[11px] text-slate-400 mt-1">
                        Role modifications must be administered by a platform Administrator.
                      </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                      <Button type="submit" variant="primary" isLoading={isSaving}>
                        Save Profile Changes
                      </Button>
                    </div>
                  </form>
                </CardBody>
              </Card>

              {/* Security & Access Overview */}
              <Card>
                <CardHeader>
                  <h3 className="font-bold text-slate-900 text-base">Security & Role Permissions</h3>
                  <p className="text-xs text-slate-500">FastAPI RBAC authorization enforcement</p>
                </CardHeader>
                <CardBody className="p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                      <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                        <ShieldCheckIcon className="w-4 h-4 text-brand-primary" />
                        <span>Authentication Protocol</span>
                      </div>
                      <p>JWT HS256 access tokens with bcrypt 4.0.1 salted password hashing.</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80">
                      <div className="flex items-center gap-2 font-bold text-slate-900 mb-1">
                        <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                        <span>Account Verified</span>
                      </div>
                      <p>Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'Active session'}.</p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
