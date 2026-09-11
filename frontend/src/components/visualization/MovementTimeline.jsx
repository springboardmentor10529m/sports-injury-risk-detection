import React, { useRef } from 'react';
import { Clock, AlertTriangle, ChevronRight, Activity, Target } from 'lucide-react';

export const MovementTimeline = ({
  currentTime = 0,
  duration = 10,
  anomalies = [],
  selectedAnomaly = null,
  onSelectAnomaly,
  onSeek
}) => {
  const trackRef = useRef(null);
  const totalDuration = Math.max(duration || 1, 1);

  // Generate second tick marks
  const secondTicks = [];
  const step = totalDuration <= 10 ? 1 : totalDuration <= 30 ? 2 : 5;
  for (let s = 0; s <= Math.floor(totalDuration); s += step) {
    secondTicks.push(s);
  }

  const handleTrackClick = (e) => {
    if (!trackRef.current || !onSeek) return;
    const rect = trackRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = pct * totalDuration;
    onSeek(targetTime);
  };

  const playheadPercent = Math.min(100, Math.max(0, (currentTime / totalDuration) * 100));

  return (
    <div className="w-full p-5 rounded-2xl bg-slate-950/80 border border-slate-800/80 shadow-xl space-y-4 font-mono">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">
            SYNCHRONIZED MOVEMENT TIMELINE
          </h4>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400">Current:</span>
          <span className="text-cyan-400 font-bold">{currentTime.toFixed(2)}s</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{totalDuration.toFixed(2)}s</span>
        </div>
      </div>

      {/* Main Timeline Scrubber Track */}
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative w-full h-14 bg-slate-900/90 rounded-xl border border-slate-800 cursor-pointer overflow-hidden group select-none"
      >
        {/* Playhead scrub line with glowing indicator */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-30 pointer-events-none transition-all duration-75 shadow-[0_0_8px_rgba(6,182,212,0.8)]"
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="absolute top-0 -left-1.5 w-3.5 h-3.5 bg-cyan-400 rounded-full border-2 border-slate-950 shadow-md" />
        </div>

        {/* Progress Fill Under Track */}
        <div
          className="absolute top-0 bottom-0 left-0 bg-cyan-500/10 pointer-events-none transition-all duration-75"
          style={{ width: `${playheadPercent}%` }}
        />

        {/* Second Ticks & Labels */}
        <div className="absolute inset-0 flex justify-between items-end px-3 pb-1 pointer-events-none">
          {secondTicks.map((sec) => {
            const leftPct = (sec / totalDuration) * 100;
            return (
              <div
                key={sec}
                className="absolute flex flex-col items-center pointer-events-none"
                style={{ left: `${leftPct}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-[1px] h-2 bg-slate-700 mb-1" />
                <span className="text-[9px] text-slate-500 font-semibold">{sec}s</span>
              </div>
            );
          })}
        </div>

        {/* Anomaly & Biomechanical Event Markers */}
        {anomalies.map((anom, idx) => {
          const markerPct = Math.min(98, Math.max(2, (anom.timestamp / totalDuration) * 100));
          const isCritical = anom.severity === 'CRITICAL' || anom.severity === 'HIGH';
          const isSelected = selectedAnomaly && selectedAnomaly.frame === anom.frame;

          return (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectAnomaly) onSelectAnomaly(anom);
                if (onSeek) onSeek(anom.timestamp);
              }}
              title={`${anom.type} (${anom.severity}) at ${anom.timestamp?.toFixed(2)}s: ${anom.explanation}`}
              className={`absolute top-2 -translate-x-1/2 z-20 rounded-full transition-transform hover:scale-150 cursor-pointer ${
                isSelected ? 'ring-2 ring-white scale-125 z-30' : ''
              } ${
                isCritical
                  ? 'bg-rose-500 w-3.5 h-3.5 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                  : 'bg-amber-400 w-2.5 h-2.5 shadow-[0_0_6px_rgba(245,158,11,0.6)]'
              }`}
              style={{ left: `${markerPct}%` }}
            />
          );
        })}
      </div>

      {/* Selected Anomaly Highlight Callout */}
      {selectedAnomaly && (
        <div className="p-3.5 rounded-xl bg-slate-900 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-white uppercase">{selectedAnomaly.type}</span>
              <span className="px-2 py-0.5 text-[9px] font-black rounded-full bg-slate-950 border border-slate-700 text-slate-300 uppercase">
                {selectedAnomaly.severity}
              </span>
              <span className="text-cyan-400 text-[11px]">
                {selectedAnomaly.timestamp?.toFixed(2)}s (Frame #{selectedAnomaly.frame})
              </span>
            </div>
            <p className="text-[11px] text-slate-300 pl-6">
              {selectedAnomaly.explanation}
            </p>
          </div>

          <button
            onClick={() => onSeek && onSeek(selectedAnomaly.timestamp)}
            className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 text-[11px] font-bold rounded-lg transition-colors shrink-0 cursor-pointer"
          >
            Seek Video
          </button>
        </div>
      )}
    </div>
  );
};
