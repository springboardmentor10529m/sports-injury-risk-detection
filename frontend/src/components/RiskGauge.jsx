const CATEGORY_COLOR = {
  LOW: "var(--risk-low)",
  MODERATE: "var(--risk-moderate)",
  HIGH: "var(--risk-high)",
  CRITICAL: "var(--risk-critical)",
};

// A 270-degree instrument dial (like a lab gauge, not a generic progress
// ring) with tick marks at the four risk-category boundaries from the spec:
// LOW 0-35, MODERATE 36-60, HIGH 61-80, CRITICAL 81-100.
export default function RiskGauge({ score, category, size = 200 }) {
  const startAngle = -225;
  const sweep = 270;
  const r = 80;
  const cx = 100, cy = 100;

  const angleForValue = (v) => startAngle + (v / 100) * sweep;
  const polar = (angleDeg, radius) => {
    const rad = (angleDeg * Math.PI) / 180;
    return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
  };
  const arcPath = (fromV, toV, radius) => {
    const [x1, y1] = polar(angleForValue(fromV), radius);
    const [x2, y2] = polar(angleForValue(toV), radius);
    const large = toV - fromV > 50 / (100 / sweep) ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  const color = CATEGORY_COLOR[category] || "var(--text-dim)";
  const boundaries = [0, 35, 60, 80, 100];

  return (
    <svg viewBox="0 0 200 200" width={size} height={size}>
      {/* track */}
      <path d={arcPath(0, 100, r)} stroke="var(--border)" strokeWidth="10" fill="none" strokeLinecap="round" />
      {/* category bands, thin, behind the value arc */}
      {boundaries.slice(0, -1).map((b, i) => {
        const next = boundaries[i + 1];
        const bandColor = [CATEGORY_COLOR.LOW, CATEGORY_COLOR.MODERATE, CATEGORY_COLOR.HIGH, CATEGORY_COLOR.CRITICAL][i];
        return (
          <path key={b} d={arcPath(b, next, r)} stroke={bandColor} strokeOpacity="0.18" strokeWidth="10" fill="none" />
        );
      })}
      {/* value arc */}
      <path d={arcPath(0, score, r)} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color})` }} />
      {/* needle tip marker */}
      {(() => {
        const [nx, ny] = polar(angleForValue(score), r);
        return <circle cx={nx} cy={ny} r="6" fill={color} style={{ filter: `drop-shadow(0 0 4px ${color})` }} />;
      })()}
      <text x="100" y="93" textAnchor="middle" fontSize="36" fontWeight="500" fontFamily="var(--font-mono)" fill="var(--text)">
        {score}
      </text>
      <text x="100" y="116" textAnchor="middle" fontSize="12" letterSpacing="0.1em" fontWeight="600" fontFamily="var(--font-body)" fill={color}>
        {category} RISK
      </text>
    </svg>
  );
}
