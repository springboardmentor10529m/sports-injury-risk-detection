import React from 'react';
import { Activity, UserCheck, Eye, Cpu } from 'lucide-react';

export const ConfidenceIndicator = ({ totalFrames = 0, averageConfidence = 0, processedFps = 15, isTracked = true }) => {
  const confPct = Math.round((averageConfidence || 0.88) * 100);

  const getScoreColor = () => {
    if (confPct >= 80) return 'text-emerald-400 border-emerald-800 bg-emerald-950/40';
    if (confPct >= 60) return 'text-amber-400 border-amber-800 bg-amber-950/40';
    return 'text-rose-400 border-rose-800 bg-rose-950/40';
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {/* Pose Confidence */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-cyan-950/60 border border-cyan-800/80 text-cyan-400">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium">Pose Confidence</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-base font-extrabold px-2 py-0.5 rounded-md border ${getScoreColor()}`}>
              {confPct}%
            </span>
          </div>
        </div>
      </div>

      {/* Tracked Frames */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-blue-950/60 border border-blue-800/80 text-blue-400">
          <Eye className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium">Tracked Frames</span>
          <p className="text-base font-extrabold text-white mt-0.5">{totalFrames} frames</p>
        </div>
      </div>

      {/* Detected Athlete */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-400">
          <UserCheck className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium">Detected Athlete</span>
          <p className="text-base font-extrabold text-emerald-400 mt-0.5">
            {isTracked ? 'Athlete #1 (Locked)' : 'None'}
          </p>
        </div>
      </div>

      {/* Processed FPS */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
        <div className="p-2.5 rounded-lg bg-purple-950/60 border border-purple-800/80 text-purple-400">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <span className="text-xs text-slate-400 font-medium">Analysis Rate</span>
          <p className="text-base font-extrabold text-white mt-0.5">{processedFps} FPS</p>
        </div>
      </div>
    </div>
  );
};
