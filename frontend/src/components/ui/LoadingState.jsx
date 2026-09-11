import React from 'react';
import { Activity, Sparkles } from 'lucide-react';

export const LoadingState = ({ message = 'INITIALIZING BIOMECHANICS ENGINE...', subtext = 'Calibrating 17-point spatial coordinate framework' }) => {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-5 animate-fadeIn">
      <div className="relative w-20 h-20 flex items-center justify-center">
        {/* Outer pulsing ring */}
        <div className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ping" />
        {/* Middle rotating dashed ring */}
        <div className="absolute inset-1 rounded-full border-2 border-dashed border-cyan-500/40 animate-spin" style={{ animationDuration: '8s' }} />
        {/* Inner high-speed spin ring */}
        <div className="absolute inset-3 rounded-full border-2 border-t-cyan-400 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: '1.2s' }} />
        {/* Core icon */}
        <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
      </div>

      <div className="space-y-1 max-w-sm">
        <h4 className="text-xs font-mono font-bold tracking-widest uppercase text-cyan-400 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          {message}
        </h4>
        <p className="text-[11px] font-mono text-slate-500">{subtext}</p>
      </div>
    </div>
  );
};
