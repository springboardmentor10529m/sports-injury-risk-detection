import React from 'react';

interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined';
  className?: string;
  children: React.ReactNode;
}

export function Card({ variant = 'default', className = '', children }: CardProps) {
  const baseStyles = 'bg-white rounded-2xl';
  const variants = {
    default: 'shadow-sm border border-slate-100',
    elevated: 'shadow-md border border-transparent',
    outlined: 'border-2 border-slate-200',
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-6 py-4 border-b border-slate-100 ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-6 ${className}`}>{children}</div>;
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-6 py-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl ${className}`}>{children}</div>;
}
