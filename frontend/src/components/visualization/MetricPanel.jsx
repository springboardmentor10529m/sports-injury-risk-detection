import React from 'react';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { Target, Layers, CheckCircle2, Zap } from 'lucide-react';

export const MetricPanel = ({
  poseConfidence = 94.2,
  trackedFrames = 120,
  validPoseFrames = 116,
  analysisRate = 15
}) => {
  const metrics = [
    {
      id: 'conf',
      label: 'POSE CONFIDENCE',
      val: poseConfidence,
      decimals: 1,
      suffix: '%',
      subtext: 'RTMPose-M COCO Keypoint Mean',
      icon: Target,
      color: 'text-cyan-400',
      glow: 'hud-glow-cyan'
    },
    {
      id: 'tracked',
      label: 'TRACKED FRAMES',
      val: trackedFrames,
      decimals: 0,
      suffix: '',
      subtext: 'Consecutive Temporal Sequence',
      icon: Layers,
      color: 'text-indigo-400'
    },
    {
      id: 'valid',
      label: 'VALID POSE FRAMES',
      val: validPoseFrames,
      decimals: 0,
      suffix: '',
      subtext: 'Spatial Quality Check Passed',
      icon: CheckCircle2,
      color: 'text-emerald-400'
    },
    {
      id: 'rate',
      label: 'ANALYSIS RATE',
      val: analysisRate,
      decimals: 0,
      suffix: ' FPS',
      subtext: 'High-Throughput CV Engine',
      icon: Zap,
      color: 'text-amber-400'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      {metrics.map((m) => {
        const Icon = m.icon;
        return (
          <div
            key={m.id}
            className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/90 flex flex-col justify-between font-mono space-y-2 hover:border-slate-700 transition-colors"
          >
            <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold tracking-wider">
              <span>{m.label}</span>
              <Icon className={`w-3.5 h-3.5 ${m.color}`} />
            </div>

            <div>
              <div className={`text-2xl sm:text-3xl font-black ${m.color}`}>
                <AnimatedNumber value={m.val} decimals={m.decimals} suffix={m.suffix} />
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">{m.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
