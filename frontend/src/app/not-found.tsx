'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '../components/ui/Button';
import { ShieldAlertIcon } from '../components/ui/Icons';

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
      <div className="w-16 h-16 rounded-3xl bg-blue-50 text-brand-primary flex items-center justify-center mb-6 shadow-sm">
        <ShieldAlertIcon className="w-8 h-8" />
      </div>
      <h1 className="text-4xl font-extrabold text-slate-950 tracking-tight mb-2">404 — Page Not Found</h1>
      <p className="text-sm text-slate-500 max-w-md mb-8">
        The requested URL or clinical resource does not exist in the SafeMove platform.
      </p>
      <div className="flex items-center gap-4">
        <Link href="/">
          <Button variant="outline">Back to Home</Button>
        </Link>
        <Link href="/dashboard">
          <Button variant="primary">Go to Dashboard</Button>
        </Link>
      </div>
    </div>
  );
}
