import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function StatCard({
  label,
  value,
  subtext,
  icon,
  trend,
  variant = 'default',
  className = '',
}: StatCardProps) {
  const borderVariants = {
    default: 'border-slate-100',
    success: 'border-emerald-100 bg-emerald-50/20',
    warning: 'border-amber-100 bg-amber-50/20',
    danger: 'border-rose-100 bg-rose-50/20',
  };

  const textVariants = {
    default: 'text-slate-900',
    success: 'text-emerald-700',
    warning: 'text-amber-700',
    danger: 'text-rose-700',
  };

  return (
    <div className={`p-5 sm:p-6 bg-white rounded-2xl border shadow-sm ${borderVariants[variant]} ${className}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
        {icon && (
          <div className="p-2 rounded-xl bg-slate-50 text-slate-600">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <div className={`text-2xl sm:text-3xl font-bold tracking-tight ${textVariants[variant]}`}>
          {value}
        </div>
        {trend && (
          <span
            className={`text-xs font-medium ${
              trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trend.value}
          </span>
        )}
      </div>

      {subtext && <p className="text-xs text-slate-400 mt-1.5">{subtext}</p>}
    </div>
  );
}
