import React from 'react';
import { AlertTriangleIcon, CheckCircleIcon, InfoIcon, ShieldAlertIcon } from './Icons';

interface AlertProps {
  variant?: 'info' | 'warning' | 'danger' | 'success';
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Alert({ variant = 'info', title, children, className = '' }: AlertProps) {
  const styles = {
    info: {
      bg: 'bg-blue-50 border-blue-200 text-blue-900',
      icon: <InfoIcon className="w-5 h-5 text-blue-600 shrink-0" />,
      titleColor: 'text-blue-900',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 text-amber-900',
      icon: <AlertTriangleIcon className="w-5 h-5 text-amber-600 shrink-0" />,
      titleColor: 'text-amber-900',
    },
    danger: {
      bg: 'bg-rose-50 border-rose-200 text-rose-900',
      icon: <ShieldAlertIcon className="w-5 h-5 text-rose-600 shrink-0" />,
      titleColor: 'text-rose-900',
    },
    success: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircleIcon className="w-5 h-5 text-emerald-600 shrink-0" />,
      titleColor: 'text-emerald-900',
    },
  };

  const current = styles[variant];

  return (
    <div className={`flex gap-3 p-4 rounded-xl border ${current.bg} ${className}`} role="alert">
      <div className="mt-0.5">{current.icon}</div>
      <div className="text-sm">
        {title && <h4 className={`font-semibold mb-1 ${current.titleColor}`}>{title}</h4>}
        <div className="leading-relaxed opacity-95">{children}</div>
      </div>
    </div>
  );
}

export function ComingSoonNotice({
  feature = 'This feature',
  phase = 'the upcoming phase',
}: {
  feature?: string;
  phase?: string;
}) {
  return (
    <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
      <div className="w-12 h-12 mx-auto bg-blue-100/70 text-brand-primary rounded-2xl flex items-center justify-center mb-3">
        <InfoIcon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">{feature}</h3>
      <p className="text-sm text-slate-500 max-w-md mx-auto">
        The backend engine for {feature.toLowerCase()} is scheduled for {phase}. Raw data contracts and UI layouts are in place.
      </p>
    </div>
  );
}
