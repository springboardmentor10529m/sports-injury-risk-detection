import React from 'react';

export const JointAngleChart = ({
  data = [],
  currentTime = 0,
  onSeek,
  leftKey = "left_knee_angle",
  rightKey = "right_knee_angle",
  title = "Knee Joint Angles",
  leftLabel = "Left Knee",
  rightLabel = "Right Knee",
  unit = "°"
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-6 text-center text-slate-500 text-xs">
        No joint angle data recorded yet.
      </div>
    );
  }

  // Dimensions
  const width = 600;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };

  const maxTime = Math.max(...data.map((d) => d.timestamp || 0), 1.0);
  const minAngle = 0;
  const maxAngle = 180;

  const getX = (t) => padding.left + (t / maxTime) * (width - padding.left - padding.right);
  const getY = (val) => padding.top + (1 - (val - minAngle) / (maxAngle - minAngle)) * (height - padding.top - padding.bottom);

  // Generate SVG path strings
  const leftPoints = data.map((d) => `${getX(d.timestamp)},${getY(d.joint_angles?.[leftKey] ?? 0)}`).join(' ');
  const rightPoints = data.map((d) => `${getX(d.timestamp)},${getY(d.joint_angles?.[rightKey] ?? 0)}`).join(' ');

  const currentX = getX(currentTime);

  const handleSvgClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const svgX = (clickX / rect.width) * width;
    const ratio = Math.max(0, Math.min(1, (svgX - padding.left) / (width - padding.left - padding.right)));
    const targetTime = ratio * maxTime;
    if (onSeek) onSeek(targetTime);
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-white uppercase tracking-wider">{title}</h4>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 font-semibold text-cyan-400">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block" />
            {leftLabel}
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-rose-400">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
            {rightLabel}
          </span>
        </div>
      </div>

      <div className="relative cursor-pointer" onClick={handleSvgClick}>
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Y Axis Grid Lines */}
          {[0, 45, 90, 135, 180].map((val) => (
            <g key={val}>
              <line
                x1={padding.left}
                y1={getY(val)}
                x2={width - padding.right}
                y2={getY(val)}
                stroke="#1e293b"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={getY(val) + 3}
                fill="#64748b"
                fontSize="10"
                textAnchor="end"
              >
                {val}{unit}
              </text>
            </g>
          ))}

          {/* X Axis Labels */}
          {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
            const t = ratio * maxTime;
            return (
              <text
                key={ratio}
                x={getX(t)}
                y={height - 8}
                fill="#64748b"
                fontSize="10"
                textAnchor="middle"
              >
                {t.toFixed(1)}s
              </text>
            );
          })}

          {/* Left Side Angle Polyline */}
          <polyline
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={leftPoints}
          />

          {/* Right Side Angle Polyline */}
          <polyline
            fill="none"
            stroke="#fb7185"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={rightPoints}
          />

          {/* Moving Video Timestamp Synchronized Vertical Marker */}
          {currentTime >= 0 && currentX >= padding.left && currentX <= width - padding.right && (
            <g>
              <line
                x1={currentX}
                y1={padding.top}
                x2={currentX}
                y2={height - padding.bottom}
                stroke="#f59e0b"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <circle cx={currentX} cy={padding.top} r="4" fill="#f59e0b" />
            </g>
          )}
        </svg>
      </div>

      <p className="text-[10px] text-slate-500 text-center">
        💡 Click anywhere on the chart line to seek video playback directly to that timestamp.
      </p>
    </div>
  );
};
