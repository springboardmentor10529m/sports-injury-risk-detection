import React from 'react';
import { KEYPOINT_NAMES, SKELETON_CONNECTIONS } from './SkeletonTopology';

export const SkeletonViewer = ({ poseFrame }) => {
  if (!poseFrame || !poseFrame.keypoints) {
    return (
      <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-xs">
        Select or play video to view 17-keypoint skeleton tracking coords.
      </div>
    );
  }

  const keypoints = poseFrame.smoothed_keypoints || poseFrame.keypoints || {};

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
          17 COCO Body Keypoints Telemetry (Frame #{poseFrame.frame_number})
        </h4>
        <span className="text-xs text-cyan-400 font-medium">
          Timestamp: {poseFrame.timestamp?.toFixed(2)}s
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1">
        {Object.entries(keypoints).map(([kpName, data]) => (
          <div
            key={kpName}
            className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 flex items-center justify-between text-[11px]"
          >
            <span className="capitalize font-medium text-slate-300 truncate max-w-[90px]" title={kpName}>
              {kpName.replace(/_/g, ' ')}
            </span>
            <span className="font-mono text-cyan-400 font-bold">
              ({Math.round(data.x)}, {Math.round(data.y)})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
