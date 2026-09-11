import React, { useState } from 'react';
import { AthleteSkeleton3D } from './AthleteSkeleton3D';
import { ShieldAlert } from 'lucide-react';

/**
 * Maps backend anatomical risk predictions to the 17 COCO keypoint joint names.
 */
function getJointRiskMapping(injuryPreds) {
  if (!injuryPreds) return null;

  const kneeRisk = injuryPreds.acl ?? 20;
  const hamstringRisk = injuryPreds.hamstring ?? 15;
  const ankleRisk = injuryPreds.ankle ?? 15;
  const shoulderRisk = injuryPreds.shoulder ?? 10;

  const map = {};

  const getLevel = (score) => {
    if (score >= 60) return 'HIGH';
    if (score >= 35) return 'MODERATE';
    return 'SAFE';
  };

  // Knees
  map['left_knee'] = { score: kneeRisk, level: getLevel(kneeRisk), label: 'Knee / ACL Complex' };
  map['right_knee'] = { score: kneeRisk, level: getLevel(kneeRisk), label: 'Knee / ACL Complex' };

  // Ankles
  map['left_ankle'] = { score: ankleRisk, level: getLevel(ankleRisk), label: 'Ankle / Subtalar Joint' };
  map['right_ankle'] = { score: ankleRisk, level: getLevel(ankleRisk), label: 'Ankle / Subtalar Joint' };

  // Hips
  map['left_hip'] = { score: hamstringRisk, level: getLevel(hamstringRisk), label: 'Hip / Hamstring Origin' };
  map['right_hip'] = { score: hamstringRisk, level: getLevel(hamstringRisk), label: 'Hip / Hamstring Origin' };

  // Shoulders
  map['left_shoulder'] = { score: shoulderRisk, level: getLevel(shoulderRisk), label: 'Shoulder Joint' };
  map['right_shoulder'] = { score: shoulderRisk, level: getLevel(shoulderRisk), label: 'Shoulder Joint' };

  // Default upper head/spine
  map['nose'] = { score: 5, level: 'SAFE', label: 'Cervical Spine' };
  map['left_elbow'] = { score: 10, level: 'SAFE', label: 'Elbow Joint' };
  map['right_elbow'] = { score: 10, level: 'SAFE', label: 'Elbow Joint' };
  map['left_wrist'] = { score: 10, level: 'SAFE', label: 'Wrist Joint' };
  map['right_wrist'] = { score: 10, level: 'SAFE', label: 'Wrist Joint' };

  return map;
}

export const RiskSkeleton3D = ({
  injuryPredictions = null
}) => {
  const [selectedJoint, setSelectedJoint] = useState('left_knee');
  const riskMap = getJointRiskMapping(injuryPredictions);

  if (!injuryPredictions && !riskMap) {
    return (
      <div className="p-8 rounded-3xl bg-slate-950/70 border border-slate-800 text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-slate-500 mx-auto" />
        <h4 className="text-sm font-mono font-bold text-slate-300">Risk Model Unavailable</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          No trained injury risk predictions available for this session. Complete a video analysis to generate predictions.
        </p>
      </div>
    );
  }

  const activeJointData = (riskMap && selectedJoint) ? riskMap[selectedJoint] : null;

  return (
    <div className="space-y-4">
      {/* Header telemetry summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-5 h-5 text-cyan-400" />
          <div>
            <h4 className="text-sm font-bold text-white">3D Anatomical Risk Heatmap</h4>
            <p className="text-[11px] text-slate-400">Color-coded joint risk overlay with localized halos</p>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-slate-300">Safe (&lt;35%)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <span className="text-slate-300">Moderate (35-60%)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            <span className="text-rose-400 font-bold">High (&gt;60%)</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* 3D Skeleton Viewer */}
        <div className="lg:col-span-8 h-[400px]">
          <AthleteSkeleton3D
            mode="demo"
            highlightRisk={true}
            selectedJoint={selectedJoint}
            onSelectJoint={setSelectedJoint}
            className="w-full h-full"
            showHudLabels={false}
          />
        </div>

        {/* Joint Risk Inspector Panel */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold uppercase text-slate-400">Selected Joint</span>
              <span className="text-xs font-mono font-bold text-cyan-400 uppercase">
                {selectedJoint.replace(/_/g, ' ')}
              </span>
            </div>

            {activeJointData ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300 font-semibold">{activeJointData.label}</span>
                  <span
                    className={`px-2.5 py-0.5 text-[10px] font-mono font-black rounded-full uppercase border ${
                      activeJointData.level === 'HIGH'
                        ? 'bg-rose-950 text-rose-400 border-rose-800'
                        : activeJointData.level === 'MODERATE'
                        ? 'bg-amber-950 text-amber-400 border-amber-800'
                        : 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    }`}
                  >
                    {activeJointData.level} RISK
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-400">Probability Rating</span>
                    <span className="text-white font-bold">{activeJointData.score.toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div
                      className={`h-full transition-all duration-500 ${
                        activeJointData.level === 'HIGH'
                          ? 'bg-rose-500'
                          : activeJointData.level === 'MODERATE'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(5, activeJointData.score))}%` }}
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                  Click any joint on the 3D skeleton to inspect localized risk telemetry and joint-specific mechanics.
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-500">Click a joint to inspect risk rating.</p>
            )}
          </div>

          {/* Quick Joint Selector Chips */}
          <div className="flex flex-wrap gap-1.5">
            {['left_knee', 'right_knee', 'left_hip', 'right_hip', 'left_ankle', 'right_ankle'].map((j) => (
              <button
                key={j}
                onClick={() => setSelectedJoint(j)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition-all cursor-pointer ${
                  selectedJoint === j
                    ? 'bg-cyan-500 text-white font-bold shadow-md shadow-cyan-950'
                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {j.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
