import React from 'react';

export const BiomechanicsCharts = ({ data = [], currentTime = 0, onSeek }) => {
  if (!data || data.length === 0) return null;

  const width = 600;
  const height = 180;
  const padding = { top: 20, right: 30, bottom: 30, left: 45 };

  const maxTime = Math.max(...data.map((d) => d.timestamp || 0), 1.0);
  const getX = (t) => padding.left + (t / maxTime) * (width - padding.left - padding.right);

  // 1. Trunk Lean
  const trunkPoints = data.map((d) => {
    const val = d.joint_angles?.trunk_lean_angle || 0;
    const y = padding.top + (1 - val / 90.0) * (height - padding.top - padding.bottom);
    return `${getX(d.timestamp)},${Math.max(padding.top, Math.min(height - padding.bottom, y))}`;
  }).join(' ');

  // 2. Symmetry Index
  const maxSym = Math.max(...data.map((d) => d.symmetry?.lower_limb_asymmetry_index || 0), 15.0);
  const symPoints = data.map((d) => {
    const val = d.symmetry?.lower_limb_asymmetry_index || 0;
    const y = padding.top + (1 - val / maxSym) * (height - padding.top - padding.bottom);
    return `${getX(d.timestamp)},${Math.max(padding.top, Math.min(height - padding.bottom, y))}`;
  }).join(' ');

  const currentX = getX(currentTime);

  const handleSvgClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const svgX = (clickX / rect.width) * width;
    const ratio = Math.max(0, Math.min(1, (svgX - padding.left) / (width - padding.left - padding.right)));
    if (onSeek) onSeek(ratio * maxTime);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Trunk Lean Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Trunk Lean Angle</h4>
          <span className="text-xs text-amber-400 font-semibold">Vertical Deviation (°)</span>
        </div>
        <div className="relative cursor-pointer" onClick={handleSvgClick}>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {[0, 30, 60, 90].map((val) => (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={padding.top + (1 - val / 90.0) * (height - padding.top - padding.bottom)}
                  x2={width - padding.right}
                  y2={padding.top + (1 - val / 90.0) * (height - padding.top - padding.bottom)}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={padding.top + (1 - val / 90.0) * (height - padding.top - padding.bottom) + 3}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                >
                  {val}°
                </text>
              </g>
            ))}
            <polyline
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              points={trunkPoints}
            />
            {currentTime >= 0 && currentX >= padding.left && currentX <= width - padding.right && (
              <line
                x1={currentX}
                y1={padding.top}
                x2={currentX}
                y2={height - padding.bottom}
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
            )}
          </svg>
        </div>
      </div>

      {/* Symmetry Index Chart */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Lower Limb Asymmetry</h4>
          <span className="text-xs text-emerald-400 font-semibold">L/R Delta (° Index)</span>
        </div>
        <div className="relative cursor-pointer" onClick={handleSvgClick}>
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
            {[0, Math.round(maxSym / 2), Math.round(maxSym)].map((val) => (
              <g key={val}>
                <line
                  x1={padding.left}
                  y1={padding.top + (1 - val / maxSym) * (height - padding.top - padding.bottom)}
                  x2={width - padding.right}
                  y2={padding.top + (1 - val / maxSym) * (height - padding.top - padding.bottom)}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={padding.left - 8}
                  y={padding.top + (1 - val / maxSym) * (height - padding.top - padding.bottom) + 3}
                  fill="#64748b"
                  fontSize="10"
                  textAnchor="end"
                >
                  {val}°
                </text>
              </g>
            ))}
            <polyline
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              points={symPoints}
            />
            {currentTime >= 0 && currentX >= padding.left && currentX <= width - padding.right && (
              <line
                x1={currentX}
                y1={padding.top}
                x2={currentX}
                y2={height - padding.bottom}
                stroke="#38bdf8"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
            )}
          </svg>
        </div>
      </div>
    </div>
  );
};
