import React from 'react';
import { Layers, ArrowRight } from 'lucide-react';

export const EmptyState = ({
  icon: Icon = Layers,
  title = 'NO MOVEMENT TELEMETRY FOUND',
  description = 'No video sequences or analysis records currently registered in this workspace.',
  actionLabel,
  onAction
}) => {
  return (
    <div className="p-12 rounded-3xl bg-slate-950/60 border border-slate-800/80 max-w-lg mx-auto text-center space-y-5 animate-fadeIn">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-cyan-400">
        <Icon className="w-8 h-8" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-sm font-mono font-bold tracking-wider text-slate-200 uppercase">
          {title}
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
          {description}
        </p>
      </div>

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-mono text-xs font-bold rounded-xl shadow-lg shadow-cyan-950 transition-all cursor-pointer"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
