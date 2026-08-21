'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../lib/types';
import {
  ActivityIcon,
  UsersIcon,
  VideoIcon,
  FileTextIcon,
  BarChart3Icon,
  SettingsIcon,
  ShieldCheckIcon,
  UserIcon,
  LogOutIcon,
  XIcon,
} from '../ui/Icons';
import { Badge } from '../ui/Badge';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const getNavItems = () => {
    if (!user) return [];

    const role = user.role;

    const commonItems = [
      {
        label: 'Athletes Directory',
        href: '/athletes',
        icon: <UsersIcon className="w-4 h-4" />,
      },
    ];

    if (role === UserRole.ATHLETE) {
      return [
        { label: 'My Dashboard', href: '/dashboard/athlete', icon: <ActivityIcon className="w-4 h-4" /> },
        { label: 'Upload Movement', href: '/upload', icon: <VideoIcon className="w-4 h-4" /> },
        { label: 'Assessment Reports', href: '/reports', icon: <FileTextIcon className="w-4 h-4" /> },
        { label: 'My Profile', href: '/profile', icon: <UserIcon className="w-4 h-4" /> },
      ];
    }

    if (role === UserRole.COACH) {
      return [
        { label: 'Team Dashboard', href: '/dashboard/coach', icon: <ActivityIcon className="w-4 h-4" /> },
        ...commonItems,
        { label: 'Upload Session', href: '/upload', icon: <VideoIcon className="w-4 h-4" /> },
        { label: 'Team Reports', href: '/reports', icon: <FileTextIcon className="w-4 h-4" /> },
        { label: 'My Profile', href: '/profile', icon: <UserIcon className="w-4 h-4" /> },
      ];
    }

    if (role === UserRole.PHYSIOTHERAPIST) {
      return [
        { label: 'Clinical Dashboard', href: '/dashboard/physiotherapist', icon: <ShieldCheckIcon className="w-4 h-4" /> },
        ...commonItems,
        { label: 'Upload Assessment', href: '/upload', icon: <VideoIcon className="w-4 h-4" /> },
        { label: 'Rehab Reports', href: '/reports', icon: <FileTextIcon className="w-4 h-4" /> },
        { label: 'My Profile', href: '/profile', icon: <UserIcon className="w-4 h-4" /> },
      ];
    }

    if (role === UserRole.SPORTS_SCIENTIST) {
      return [
        { label: 'Analytics Dashboard', href: '/dashboard/sports-scientist', icon: <BarChart3Icon className="w-4 h-4" /> },
        ...commonItems,
        { label: 'Upload Video', href: '/upload', icon: <VideoIcon className="w-4 h-4" /> },
        { label: 'Cohort Reports', href: '/reports', icon: <FileTextIcon className="w-4 h-4" /> },
        { label: 'My Profile', href: '/profile', icon: <UserIcon className="w-4 h-4" /> },
      ];
    }

    if (role === UserRole.ADMIN) {
      return [
        { label: 'Admin Dashboard', href: '/dashboard/admin', icon: <SettingsIcon className="w-4 h-4" /> },
        ...commonItems,
        { label: 'All Reports', href: '/reports', icon: <FileTextIcon className="w-4 h-4" /> },
        { label: 'My Profile', href: '/profile', icon: <UserIcon className="w-4 h-4" /> },
      ];
    }

    return commonItems;
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-slate-950 text-white z-50 transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 flex flex-col justify-between border-r border-slate-800 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo Brand Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/80">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-brand-primary flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                S
              </div>
              <div>
                <span className="font-bold text-lg tracking-tight text-white block leading-tight">SafeMove</span>
                <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 block">Sports Tech & Clinical</span>
              </div>
            </Link>
            <button
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              onClick={onClose}
              aria-label="Close navigation menu"
            >
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* User Brief Info */}
          {user && (
            <div className="px-6 py-4 border-b border-slate-800/50 bg-slate-900/40">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-sm font-semibold text-brand-primary shrink-0">
                  {user.full_name?.charAt(0) || 'U'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-sm font-semibold text-white truncate">{user.full_name}</p>
                  <Badge variant="info" size="sm" className="mt-0.5 text-[10px] py-0 px-1.5">
                    {user.role}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Nav List */}
          <nav className="p-4 space-y-1.5">
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Navigation
            </div>
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-brand-primary text-white shadow-sm shadow-blue-500/20'
                      : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-slate-400'}>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer actions */}
        <div className="p-4 border-t border-slate-800/80">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 transition-colors"
          >
            <LogOutIcon className="w-4 h-4 text-rose-400" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
