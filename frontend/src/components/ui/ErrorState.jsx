import React from 'react';
import { AlertTriangle, RefreshCw, Terminal } from 'lucide-react';

export const ErrorState = ({ title = 'SYSTEM ANOMALY DETECTED', message = 'A telemetry pipeline disruption occurred.', onRetry, errorDetails }) => {
  return (
    <div className="p-8 rounded-3xl bg-slate-950 border border-rose-900/60 shadow-2xl max-w-lg mx-auto text-center space-y-5 animate-fadeIn">
      <div className="w-16 h-16 rounded-2xl bg-rose-950/50 border border-rose-800/80 flex items-center justify-center mx-auto text-rose-400">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <div className="space-y-1.5">
        <h3 className="text-sm font-mono font-bold tracking-wider text-rose-300 uppercase">
          {title}
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          {message}
        </p>
      </div>

      {errorDetails && (
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-left font-mono text-[11px] text-rose-400/90 overflow-x-auto max-h-32">
          <div className="flex items-center gap-1.5 text-slate-500 mb-1 text-[10px]">
            <Terminal className="w-3 h-3" />
            <span>ERROR LOG</span>
          </div>
          <pre className="whitespace-pre-wrap break-all">{errorDetails}</pre>
        </div>
      )}

      {onRetry && (
        <button
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-900 hover:bg-rose-800 text-white font-mono text-xs font-bold rounded-xl transition-all shadow-lg cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          RETRY OPERATION
        </button>
      )}
    </div>
  );
};
