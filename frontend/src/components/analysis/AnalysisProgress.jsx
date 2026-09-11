import React from 'react';
import { CheckCircle2, Circle, Loader2, AlertTriangle, ShieldAlert } from 'lucide-react';

const STAGES = [
  { id: 'uploaded', label: 'Video uploaded' },
  { id: 'processing', label: 'Athlete detected' },
  { id: 'pose_estimation', label: 'Pose estimated' },
  { id: 'tracking', label: 'Athlete tracked' },
  { id: 'rendering', label: 'Skeleton generated' },
  { id: 'biomechanics', label: 'Biomechanics calculated' },
  { id: 'completed', label: 'Analysis complete' }
];

export const AnalysisProgress = ({ status, stage, progress, errorMessage }) => {
  const isFailed = status === 'failed';

  const getStageIndex = () => {
    if (status === 'completed') return STAGES.length - 1;
    if (isFailed) return -1;
    if (status === 'queued') return 0;
    if (status === 'processing') return 1;
    if (status === 'pose_estimation') return 2;
    if (status === 'tracking') return 3;
    if (status === 'rendering') return 4;
    if (status === 'biomechanics') return 5;
    return 1;
  };

  const currentIndex = getStageIndex();

  return (
    <div className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {!isFailed && status !== 'completed' && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />}
            {status === 'completed' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {isFailed && <AlertTriangle className="w-5 h-5 text-rose-500" />}
            Analysis Status: <span className="capitalize text-cyan-400">{isFailed ? 'Failed' : stage || status}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-stage movement and computer-vision processing progress.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-32 bg-slate-800 h-3 rounded-full overflow-hidden border border-slate-700">
            <div
              className={`h-full transition-all duration-500 ${
                isFailed ? 'bg-rose-500' : 'bg-gradient-to-r from-cyan-500 to-blue-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, progress || 0))}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-300 w-12 text-right">
            {Math.round(progress || 0)}%
          </span>
        </div>
      </div>

      {/* Stepper Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {STAGES.map((stg, idx) => {
          const isDone = !isFailed && idx <= currentIndex;
          const isCurrent = !isFailed && idx === currentIndex && status !== 'completed';

          return (
            <div
              key={stg.id}
              className={`p-3 rounded-xl border transition-all flex flex-col items-center text-center space-y-2 ${
                isDone
                  ? 'bg-cyan-950/30 border-cyan-800/80 text-cyan-300'
                  : isCurrent
                  ? 'bg-blue-950/40 border-blue-500 text-blue-200 animate-pulse'
                  : isFailed
                  ? 'bg-slate-900/40 border-slate-800 text-slate-600'
                  : 'bg-slate-900/60 border-slate-800 text-slate-500'
              }`}
            >
              {isDone ? (
                <CheckCircle2 className="w-5 h-5 text-cyan-400" />
              ) : isCurrent ? (
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
              ) : (
                <Circle className="w-5 h-5 opacity-40" />
              )}
              <span className="text-xs font-semibold leading-tight">{stg.label}</span>
            </div>
          );
        })}
      </div>

      {/* Error Card */}
      {isFailed && (
        <div className="p-4 rounded-xl bg-rose-950/50 border border-rose-800/80 flex items-start gap-3 text-rose-300">
          <ShieldAlert className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-rose-200">Analysis Failed</h4>
            <p className="text-xs text-rose-300">
              {errorMessage || 'No athlete could be reliably detected in this video.'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
