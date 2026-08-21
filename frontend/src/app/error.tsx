'use client';

import React, { useEffect } from 'react';
import { Button } from '../components/ui/Button';
import { AlertTriangleIcon } from '../components/ui/Icons';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App runtime error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
      <div className="w-16 h-16 rounded-3xl bg-rose-50 text-rose-600 flex items-center justify-center mb-6 shadow-sm">
        <AlertTriangleIcon className="w-8 h-8" />
      </div>
      <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight mb-2">Something went wrong</h1>
      <p className="text-sm text-slate-500 max-w-md mb-8">
        An error occurred while rendering the clinical interface.
      </p>
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={() => window.location.href = '/'}>
          Home
        </Button>
        <Button variant="primary" onClick={() => reset()}>
          Try Again
        </Button>
      </div>
    </div>
  );
}
