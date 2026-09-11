import React from 'react';
import { Check, Activity, Film, UserCheck, Target, Layers, BarChart2, ShieldAlert } from 'lucide-react';

const PIPELINE_STAGES = [
  { id: 'upload', label: 'VIDEO UPLOADED', icon: Film },
  { id: 'detection', label: 'ATHLETE DETECTED', icon: UserCheck },
  { id: 'pose', label: 'POSE ESTIMATED', icon: Target },
  { id: 'tracking', label: 'ATHLETE TRACKED', icon: Activity },
  { id: 'skeleton', label: 'SKELETON GENERATED', icon: Layers },
  { id: 'biomechanics', label: 'BIOMECHANICS', icon: BarChart2 },
  { id: 'risk', label: 'RISK ANALYSIS', icon: ShieldAlert }
];

export const AnalysisPipeline = ({ currentStage = 'risk', isComplete = false }) => {
  // Determine index of the current stage
  const stageIndexMap = {
    'upload': 0,
    'detection': 1,
    'pose': 2,
    'tracking': 3,
    'skeleton': 4,
    'biomechanics': 5,
    'risk': 6
  };

  const activeIdx = isComplete ? PIPELINE_STAGES.length : (stageIndexMap[currentStage] ?? 5);

  return (
    <div className="w-full p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 shadow-xl overflow-x-auto">
      <div className="flex items-center justify-between min-w-[720px] px-2">
        {PIPELINE_STAGES.map((stage, idx) => {
          const isFinished = isComplete || idx < activeIdx;
          const isCurrent = !isComplete && idx === activeIdx;
          const Icon = stage.icon;

          return (
            <React.Fragment key={stage.id}>
              {/* Pipeline Stage Node */}
              <div className="flex flex-col items-center gap-2 group relative">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    isFinished
                      ? 'bg-emerald-950/90 text-emerald-400 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                      : isCurrent
                      ? 'bg-cyan-950/90 text-cyan-300 border border-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.4)] animate-hud-pulse'
                      : 'bg-slate-900/60 text-slate-500 border border-slate-800'
                  }`}
                >
                  {isFinished ? (
                    <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>

                <span
                  className={`text-[10px] font-mono font-bold tracking-wider uppercase whitespace-nowrap ${
                    isFinished
                      ? 'text-emerald-300'
                      : isCurrent
                      ? 'text-cyan-300'
                      : 'text-slate-500'
                  }`}
                >
                  {stage.label}
                </span>

                {isCurrent && (
                  <span className="absolute -bottom-3 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                )}
              </div>

              {/* Connecting Line Between Stages */}
              {idx < PIPELINE_STAGES.length - 1 && (
                <div className="flex-1 h-[2px] mx-2 relative bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${
                      idx < activeIdx
                        ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 w-full'
                        : idx === activeIdx
                        ? 'bg-cyan-500/50 w-2/3 animate-pulse'
                        : 'w-0'
                    }`}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
