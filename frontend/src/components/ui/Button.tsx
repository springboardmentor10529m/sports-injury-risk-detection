import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  children,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100 shadow-sm';

  const variants = {
    primary: 'bg-brand-primary text-white hover:bg-blue-700 focus:ring-brand-primary border border-transparent shadow-blue-500/10',
    secondary: 'bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900 border border-transparent',
    danger: 'bg-brand-danger text-white hover:bg-red-700 focus:ring-brand-danger border border-transparent',
    warning: 'bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500 border border-transparent',
    outline: 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 focus:ring-slate-300 shadow-sm',
    ghost: 'bg-transparent text-slate-700 hover:bg-slate-100 focus:ring-slate-300 shadow-none',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-base gap-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : leftIcon ? (
        <span className="inline-flex shrink-0">{leftIcon}</span>
      ) : null}
      {children}
      {!isLoading && rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
    </button>
  );
}
