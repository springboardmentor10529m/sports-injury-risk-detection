'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';
import { UserRole } from '../../../lib/types';
import { EyeIcon, EyeOffIcon, ShieldAlertIcon } from '../../../components/ui/Icons';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    role: UserRole.ATHLETE,
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { register } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (formData.password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (formData.password !== formData.confirm_password) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        full_name: formData.full_name.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role,
      });
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. Email may already be registered.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center mb-3">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-brand-primary flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20 text-lg">
              S
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">SafeMove</span>
          </Link>
        </div>
        <h2 className="text-center text-2xl font-bold text-slate-900 tracking-tight">
          Create your account
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Select your sports medicine or performance role
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-sm border border-slate-200/80 space-y-6">
          {errorMessage && (
            <Alert variant="danger" title="Registration Error">
              {errorMessage}
            </Alert>
          )}

          <form className="space-y-4" onSubmit={handleRegister}>
            <div>
              <label htmlFor="full_name" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                id="full_name"
                name="full_name"
                type="text"
                required
                value={formData.full_name}
                onChange={handleChange}
                placeholder="Marcus Vance"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="marcus@athlete.com"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Platform Role
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
              >
                <option value={UserRole.ATHLETE}>Athlete (Track Risk & Upload Sessions)</option>
                <option value={UserRole.COACH}>Coach (Team Roster & Workload)</option>
                <option value={UserRole.PHYSIOTHERAPIST}>Physiotherapist (Clinical & Injury Rehab)</option>
                <option value={UserRole.SPORTS_SCIENTIST}>Sports Scientist (Analytics & Research)</option>
                <option value={UserRole.ADMIN}>Administrator (System Governance)</option>
              </select>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 6 characters"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirm_password" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                value={formData.confirm_password}
                onChange={handleChange}
                placeholder="Re-enter password"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              className="w-full mt-2"
            >
              Complete Registration
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link href="/login" className="font-semibold text-brand-primary hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldAlertIcon className="w-3.5 h-3.5" />
            <span>Role-Based Permissions Enforced via Backend RBAC</span>
          </div>
        </div>
      </div>
    </div>
  );
}
