'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../hooks/useAuth';
import { MenuIcon, ShieldAlertIcon } from '../ui/Icons';

interface HeaderProps {
  onOpenSidebar: () => void;
}

export function Header({ onOpenSidebar }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary"
          aria-label="Open sidebar"
        >
          <MenuIcon className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200/70 px-3 py-1.5 rounded-full">
          <ShieldAlertIcon className="w-3.5 h-3.5 text-brand-primary" />
          <span>Decision Support Platform (Non-diagnostic)</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {user ? (
          <Link
            href="/profile"
            className="flex items-center gap-2.5 p-1.5 pr-3 rounded-full hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
          >
            <div className="w-8 h-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center text-brand-primary font-semibold text-xs">
              {user.full_name?.charAt(0) || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <span className="text-xs font-semibold text-slate-900 block leading-tight">{user.full_name}</span>
              <span className="text-[10px] text-slate-500 font-medium capitalize">{user.role.toLowerCase()}</span>
            </div>
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="text-xs font-medium text-slate-700 hover:text-brand-primary px-3 py-1.5 rounded-lg"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-xs font-medium bg-brand-primary text-white hover:bg-blue-700 px-3 py-1.5 rounded-lg shadow-sm"
            >
              Register
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
