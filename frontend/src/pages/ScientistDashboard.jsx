import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, Beaker, FlaskConical, Gauge, LineChart, Scale, Zap } from "lucide-react";
import { getScientistAnalytics } from "../api/client";
import StatCard from "../components/StatCard";

const COLOR = { LOW: "var(--risk-low)", MODERATE: "var(--risk-moderate)", HIGH: "var(--risk-high)", CRITICAL: "var(--risk-critical)" };

export default function ScientistDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getScientistAnalytics().then((res) => setData(res.data));
  }, []);

  if (!data) return <p style={{ color: "var(--text-dim)" }}>Loading...</p>;

  if (!data.has_data) {
    return (
      <div>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Research Dashboard</div>
        <h1 style={{ fontSize: 26, marginBottom: 20 }}>Aggregate biomechanical analytics</h1>
        <div className="card empty-state">
          <div className="empty-state-icon"><FlaskConical size={22} /></div>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>No data yet</h3>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 20 }}>{data.message}</p>
          <Link to="/scientist/athletes" className="btn btn-primary">Manage dataset</Link>
        </div>
      </div>
    );
  }

  const dist = data.risk_category_distribution;
  const maxCount = Math.max(1, ...Object.values(dist));

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Research Dashboard</div>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Aggregate biomechanical analytics</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>
        {data.athletes_tracked} athletes · {data.videos_analyzed} analyses in your dataset.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard icon={Gauge} label="Avg Risk Score" value={data.avg_risk_score} color="var(--accent)" glow />
        <StatCard icon={Activity} label="Avg Movement Quality" value={data.avg_movement_quality_score ?? "—"} suffix="/100" color="var(--accent2)" glow />
        <StatCard icon={Scale} label="Avg Symmetry" value={data.avg_symmetry_score ?? "—"} suffix="/100" color="var(--risk-low)" glow />
        <StatCard icon={Zap} label="Avg Fatigue Signal" value={data.avg_fatigue_score ?? "—"} suffix="/100" color="var(--risk-moderate)" glow />
      </div>

      <div className="card animate-in" style={{ marginBottom: 20 }}>
        <div className="card-title"><Beaker size={15} color="var(--accent)" /> Risk category distribution</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 24, height: 150, paddingTop: 10 }}>
          {["LOW", "MODERATE", "HIGH", "CRITICAL"].map((cat) => (
            <div key={cat} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div className="mono" style={{ fontSize: 13, marginBottom: 6 }}>{dist[cat] || 0}</div>
              <div
                style={{
                  width: "100%", maxWidth: 60,
                  height: `${((dist[cat] || 0) / maxCount) * 90 + 4}px`,
                  background: `linear-gradient(180deg, ${COLOR[cat]}, ${COLOR[cat]}99)`,
                  borderRadius: "6px 6px 0 0",
                  boxShadow: `0 0 16px -4px ${COLOR[cat]}`,
                }}
              />
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 8, fontWeight: 500 }}>{cat}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card animate-in">
        <div className="card-title"><LineChart size={15} color="var(--accent)" /> Training load vs. injury risk correlation</div>
        {data.training_load_vs_risk_correlation === null ? (
          <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Not enough data yet (needs 3+ analyses with varying training load).</p>
        ) : (
          <div className="mono" style={{ fontSize: 30 }}>{data.training_load_vs_risk_correlation}</div>
        )}
        <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8 }}>{data.correlation_note}</p>
      </div>
    </div>
  );
}
