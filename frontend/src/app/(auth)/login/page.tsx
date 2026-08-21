'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../../hooks/useAuth';
import { EyeIcon, EyeOffIcon, ShieldAlertIcon } from '../../../components/ui/Icons';
import { Alert } from '../../../components/ui/Alert';
import { Button } from '../../../components/ui/Button';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setErrorMessage(err.message || 'Incorrect email or password. Please try again.');
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
          Sign in to your portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Sports injury risk monitoring & movement biomechanics
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl shadow-sm border border-slate-200/80 space-y-6">
          {errorMessage && (
            <Alert variant="danger" title="Authentication Failed">
              {errorMessage}
            </Alert>
          )}

          <form className="space-y-4" onSubmit={handleLogin}>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="athlete@example.com"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent transition-all"
              />
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
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
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

            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              className="w-full mt-2"
            >
              Sign In to Platform
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don't have an account yet?{' '}
              <Link href="/register" className="font-semibold text-brand-primary hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldAlertIcon className="w-3.5 h-3.5" />
            <span>SafeMove Clinical Decision Support • Encrypted Session</span>
          </div>
        </div>
      </div>
    </div>
  );
}
