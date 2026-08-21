import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionHref?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionHref,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white border border-slate-100 rounded-2xl ${className}`}>
      {icon && (
        <div className="w-14 h-14 bg-slate-100/80 rounded-2xl flex items-center justify-center text-slate-400 mb-4 shadow-inner">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-semibold text-slate-800 mb-1">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">{description}</p>
      {actionLabel && (
        onAction ? (
          <Button onClick={onAction}>{actionLabel}</Button>
        ) : actionHref ? (
          <a href={actionHref}>
            <Button>{actionLabel}</Button>
          </a>
        ) : null
      )}
    </div>
  );
}
