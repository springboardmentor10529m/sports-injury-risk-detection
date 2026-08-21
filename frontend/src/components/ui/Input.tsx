import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export function Input({ label, error, helperText, className = '', ...props }: InputProps) {
  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input
        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary sm:text-sm ${
          error ? 'border-brand-danger focus:ring-brand-danger' : 'border-slate-300'
        }`}
        {...props}
      />
      {error && <span className="text-xs text-brand-danger">{error}</span>}
      {helperText && !error && <span className="text-xs text-slate-500">{helperText}</span>}
    </div>
  );
}
