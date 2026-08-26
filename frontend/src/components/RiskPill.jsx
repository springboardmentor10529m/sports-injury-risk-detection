const COLOR = {
  LOW: "var(--risk-low)",
  MODERATE: "var(--risk-moderate)",
  HIGH: "var(--risk-high)",
  CRITICAL: "var(--risk-critical)",
};

export default function RiskPill({ category, score }) {
  if (!category) {
    return <span style={{ fontSize: 12, color: "var(--text-faint)" }}>No data yet</span>;
  }
  const color = COLOR[category] || "var(--text-dim)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: color, display: "inline-block", boxShadow: `0 0 8px ${color}` }} />
      <span style={{ color, fontWeight: 600 }}>{category}</span>
      {score != null && <span className="mono" style={{ color: "var(--text-dim)" }}>({score})</span>}
    </span>
  );
}
