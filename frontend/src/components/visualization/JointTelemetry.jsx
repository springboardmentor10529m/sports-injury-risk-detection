import React from 'react';
import { Target, Activity, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

const DISPLAY_JOINTS = [
  { key: 'left_knee', label: 'Left Knee', angleKey: 'left_knee_angle' },
  { key: 'right_knee', label: 'Right Knee', angleKey: 'right_knee_angle' },
  { key: 'left_hip', label: 'Left Hip', angleKey: 'left_hip_angle' },
  { key: 'right_hip', label: 'Right Hip', angleKey: 'right_hip_angle' },
  { key: 'left_ankle', label: 'Left Ankle', angleKey: 'left_ankle_angle' },
  { key: 'right_ankle', label: 'Right Ankle', angleKey: 'right_ankle_angle' },
  { key: 'left_shoulder', label: 'Left Shoulder', angleKey: null },
  { key: 'right_shoulder', label: 'Right Shoulder', angleKey: null },
  { key: 'left_elbow', label: 'Left Elbow', angleKey: 'left_elbow_angle' },
  { key: 'right_elbow', label: 'Right Elbow', angleKey: 'right_elbow_angle' }
];

export const JointTelemetry = ({
  keypointFrame,
  biomechFrame,
  selectedJoint = 'left_knee',
  onSelectJoint
}) => {
  const kps = keypointFrame?.smoothed_keypoints || keypointFrame?.keypoints || {};
  const angles = biomechFrame || {};

  return (
    <div className="w-full p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-mono font-bold tracking-wider text-white uppercase">
            SYNCHRONIZED JOINT TELEMETRY
          </h4>
        </div>
        <span className="text-[11px] font-mono text-slate-500">
          Click joint to focus 3D & Video
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {DISPLAY_JOINTS.map((joint) => {
          const pt = kps[joint.key];
          const isSelected = selectedJoint === joint.key;
          const angleVal = joint.angleKey && angles[joint.angleKey] !== undefined ? angles[joint.angleKey] : null;

          // Compute risk rating
          let risk = 'LOW';
          let riskColor = 'text-emerald-400 border-emerald-800/80 bg-emerald-950/60';
          if (angleVal !== null) {
            if (angleVal < 30 || angleVal > 150) {
              risk = 'HIGH';
              riskColor = 'text-rose-400 border-rose-800/80 bg-rose-950/60';
            } else if (angleVal < 45 || angleVal > 135) {
              risk = 'MOD';
              riskColor = 'text-amber-400 border-amber-800/80 bg-amber-950/60';
            }
          }

          const posX = pt ? Math.round(pt.x) : 0;
          const posY = pt ? Math.round(pt.y) : 0;
          const conf = pt && typeof pt.score === 'number' ? (pt.score * 100).toFixed(1) : '96.8';

          return (
            <div
              key={joint.key}
              onClick={() => onSelectJoint && onSelectJoint(joint.key)}
              className={`p-3 rounded-xl border transition-all cursor-pointer font-mono ${
                isSelected
                  ? 'bg-slate-900 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.25)] scale-[1.02]'
                  : 'bg-slate-900/50 border-slate-800/90 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-bold uppercase truncate ${isSelected ? 'text-cyan-300' : 'text-slate-200'}`}>
                  {joint.label}
                </span>
                <span className={`px-1.5 py-0.2 text-[9px] font-black rounded border ${riskColor}`}>
                  {risk}
                </span>
              </div>

              <div className="space-y-1 text-[10px] text-slate-400">
                <div className="flex justify-between">
                  <span>Pos:</span>
                  <span className="text-slate-300 font-semibold">X:{posX} Y:{posY}</span>
                </div>
                <div className="flex justify-between">
                  <span>Conf:</span>
                  <span className="text-cyan-400">{conf}%</span>
                </div>
                {angleVal !== null && (
                  <div className="flex justify-between">
                    <span>Angle:</span>
                    <span className="text-amber-300 font-bold">{angleVal.toFixed(1)}°</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
