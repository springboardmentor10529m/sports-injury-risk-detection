import React from 'react';
import { RiskCategory } from '../../lib/types';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', size = 'md', children, className = '' }: BadgeProps) {
  const baseStyles = 'inline-flex items-center font-medium rounded-full border';
  
  const variants = {
    default: 'bg-blue-50 text-blue-700 border-blue-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
    info: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}

export function RiskBadge({ category, className = '' }: { category?: RiskCategory | string | null; className?: string }) {
  if (!category) {
    return <Badge variant="neutral" className={className}>Pending Analysis</Badge>;
  }

  const cat = String(category).toUpperCase();

  switch (cat) {
    case 'LOW':
      return <Badge variant="success" className={`font-semibold ${className}`}>Low Risk</Badge>;
    case 'MODERATE':
      return <Badge variant="warning" className={`font-semibold ${className}`}>Moderate Risk</Badge>;
    case 'HIGH':
      return <Badge variant="danger" className={`font-semibold ${className}`}>High Risk</Badge>;
    case 'CRITICAL':
      return <Badge variant="danger" className={`font-semibold bg-rose-600 text-white border-rose-700 animate-pulse ${className}`}>Critical Risk</Badge>;
    default:
      return <Badge variant="neutral" className={className}>{category}</Badge>;
  }
}
