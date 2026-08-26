import { ArrowDown, ArrowUp } from "lucide-react";

export default function StatCard({ icon: Icon, label, value, suffix = "", color, glow, trend }) {
  return (
    <div
      className="stat-card animate-in"
      style={{ "--stat-icon-color": color, "--stat-icon-bg": glow ? `${color}22` : undefined, "--stat-glow": glow ? `${color}33` : undefined }}
    >
      <div className="stat-card-head">
        {Icon && (
          <div className="stat-card-icon">
            <Icon size={16} strokeWidth={2} />
          </div>
        )}
      </div>
      <div className="stat-card-value" style={{ color: color || "var(--text)" }}>
        {value}
        {suffix && <span style={{ fontSize: 14, color: "var(--text-faint)", marginLeft: 2 }}>{suffix}</span>}
      </div>
      <div className="stat-card-label">{label}</div>
      {trend != null && (
        <div className="stat-card-trend" style={{ color: trend <= 0 ? "var(--risk-low)" : "var(--risk-high)" }}>
          {trend <= 0 ? <ArrowDown size={13} /> : <ArrowUp size={13} />}
          {Math.abs(trend)} pts
        </div>
      )}
    </div>
  );
}
