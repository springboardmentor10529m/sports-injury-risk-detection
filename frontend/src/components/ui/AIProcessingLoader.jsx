import React, { useState, useEffect } from 'react';
import { Sparkles, Activity, ShieldAlert, CheckCircle2 } from 'lucide-react';

const STAGES = [
  { text: 'Detecting athlete...', delay: 0 },
  { text: 'Estimating pose (COCO 17 Keypoints)...', delay: 1800 },
  { text: 'Tracking joints across temporal frames...', delay: 3800 },
  { text: 'Calculating biomechanics & angular velocities...', delay: 6000 },
  { text: 'Evaluating movement risk & anomaly scores...', delay: 8500 }
];

export const AIProcessingLoader = ({ currentStageText }) => {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStageIdx((prev) => (prev < STAGES.length - 1 ? prev + 1 : prev));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const activeText = currentStageText || STAGES[currentStageIdx]?.text || 'Processing motion data...';

  return (
    <div className="relative p-8 rounded-3xl bg-slate-950/90 border border-cyan-500/30 shadow-2xl flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6 overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Rotating Digital Skeleton Silhouette Scanner */}
      <div className="relative w-36 h-48 flex items-center justify-center">
        {/* Animated Scanline overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent w-full h-12 animate-scanline pointer-events-none rounded-2xl" />

        {/* 2D Digital Biomechanical Skeleton Silhouette */}
        <svg viewBox="0 0 100 140" className="w-full h-full text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]">
          {/* Head */}
          <circle cx="50" cy="20" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="50" cy="20" r="2.5" fill="#22d3ee" className="animate-ping" style={{ transformOrigin: '50px 20px' }} />
          
          {/* Spine & Torso */}
          <line x1="50" y1="27" x2="50" y2="65" stroke="currentColor" strokeWidth="2.5" strokeDasharray="3 1" />

          {/* Shoulders */}
          <line x1="32" y1="36" x2="68" y2="36" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="32" cy="36" r="3" fill="#06b6d4" />
          <circle cx="68" cy="36" r="3" fill="#06b6d4" />

          {/* Arms & Elbows */}
          <line x1="32" y1="36" x2="22" y2="52" stroke="currentColor" strokeWidth="2" />
          <circle cx="22" cy="52" r="2.5" fill="#38bdf8" />
          <line x1="22" y1="52" x2="16" y2="68" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="16" cy="68" r="2.5" fill="#22d3ee" />

          <line x1="68" y1="36" x2="78" y2="52" stroke="currentColor" strokeWidth="2" />
          <circle cx="78" cy="52" r="2.5" fill="#38bdf8" />
          <line x1="78" y1="52" x2="84" y2="68" stroke="currentColor" strokeWidth="1.8" />
          <circle cx="84" cy="68" r="2.5" fill="#22d3ee" />

          {/* Pelvis & Hips */}
          <line x1="38" y1="65" x2="62" y2="65" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="38" cy="65" r="3.5" fill="#818cf8" />
          <circle cx="62" cy="65" r="3.5" fill="#818cf8" />

          {/* Left Leg: Hip -> Knee -> Ankle */}
          <line x1="38" y1="65" x2="34" y2="95" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="34" cy="95" r="3" fill="#34d399" />
          <line x1="34" y1="95" x2="32" y2="125" stroke="currentColor" strokeWidth="2" />
          <circle cx="32" cy="125" r="3" fill="#38bdf8" />

          {/* Right Leg: Hip -> Knee -> Ankle */}
          <line x1="62" y1="65" x2="66" y2="95" stroke="currentColor" strokeWidth="2.2" />
          <circle cx="66" cy="95" r="3" fill="#34d399" />
          <line x1="66" y1="95" x2="68" y2="125" stroke="currentColor" strokeWidth="2" />
          <circle cx="68" cy="125" r="3" fill="#38bdf8" />
        </svg>

        {/* Orbiting coordinate reticle */}
        <div className="absolute inset-0 rounded-2xl border border-cyan-500/20 pointer-events-none">
          <div className="absolute -top-1 -left-1 w-2 h-2 border-t-2 border-l-2 border-cyan-400" />
          <div className="absolute -top-1 -right-1 w-2 h-2 border-t-2 border-r-2 border-cyan-400" />
          <div className="absolute -bottom-1 -left-1 w-2 h-2 border-b-2 border-l-2 border-cyan-400" />
          <div className="absolute -bottom-1 -right-1 w-2 h-2 border-b-2 border-r-2 border-cyan-400" />
        </div>
      </div>

      {/* Status Progress Details */}
      <div className="space-y-2 w-full">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
          <span className="text-sm font-mono font-black tracking-wider text-white uppercase">
            ANALYZING MOVEMENT
          </span>
        </div>

        <div className="h-6 flex items-center justify-center">
          <p className="text-xs font-mono text-cyan-300 animate-fadeIn key={activeText}">
            {activeText}
          </p>
        </div>

        {/* Technical stage indicators */}
        <div className="flex justify-center gap-1.5 pt-2">
          {STAGES.map((s, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                idx <= currentStageIdx ? 'w-6 bg-cyan-400' : 'w-2 bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
