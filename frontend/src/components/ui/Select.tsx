import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, error, options, className = '', ...props }: SelectProps) {
  return (
    <div className={`flex flex-col space-y-1 ${className}`}>
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <select
        className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary sm:text-sm bg-white ${
          error ? 'border-brand-danger focus:ring-brand-danger' : 'border-slate-300'
        }`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="text-xs text-brand-danger">{error}</span>}
    </div>
  );
}
