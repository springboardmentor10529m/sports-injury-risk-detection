import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getScientistAnalytics } from "../api/client";

export default function ScientistDashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getScientistAnalytics().then((res) => setData(res.data));
  }, []);

  if (!data) return <p style={{ color: "var(--text-dim)" }}>Loading...</p>;

  if (!data.has_data) {
    return (
      <div>
        <h1 style={{ fontSize: 24, marginBottom: 20 }}>Research Dashboard</h1>
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--text-dim)", marginBottom: 20 }}>{data.message}</p>
          <Link to="/scientist/athletes" className="btn btn-primary">Manage dataset</Link>
        </div>
      </div>
    );
  }

  const dist = data.risk_category_distribution;
  const maxCount = Math.max(1, ...Object.values(dist));

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Research Dashboard</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>
        {data.athletes_tracked} athletes · {data.videos_analyzed} analyses in your dataset.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <Metric label="Avg Risk Score" value={data.avg_risk_score} />
        <Metric label="Avg Movement Quality" value={data.avg_movement_quality_score} suffix="/100" />
        <Metric label="Avg Symmetry" value={data.avg_symmetry_score} suffix="/100" />
        <Metric label="Avg Fatigue Signal" value={data.avg_fatigue_score} suffix="/100" />
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 14, marginBottom: 14 }}>Risk category distribution</h3>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 20, height: 140 }}>
          {["LOW", "MODERATE", "HIGH", "CRITICAL"].map((cat) => (
            <div key={cat} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1 }}>
              <div className="mono" style={{ fontSize: 13, marginBottom: 6 }}>{dist[cat] || 0}</div>
              <div
                style={{
                  width: "100%", maxWidth: 60,
                  height: `${((dist[cat] || 0) / maxCount) * 90 + 4}px`,
                  background: COLOR[cat], borderRadius: "4px 4px 0 0",
                }}
              />
              <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 8 }}>{cat}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 10 }}>Training load vs. injury risk correlation</h3>
        {data.training_load_vs_risk_correlation === null ? (
          <p style={{ color: "var(--text-faint)", fontSize: 13 }}>Not enough data yet (needs 3+ analyses with varying training load).</p>
        ) : (
          <div className="mono" style={{ fontSize: 28 }}>{data.training_load_vs_risk_correlation}</div>
        )}
        <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8 }}>{data.correlation_note}</p>
      </div>
    </div>
  );
}

const COLOR = { LOW: "var(--risk-low)", MODERATE: "var(--risk-moderate)", HIGH: "var(--risk-high)", CRITICAL: "var(--risk-critical)" };

function Metric({ label, value, suffix = "" }) {
  return (
    <div className="card">
      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{label}</div>
      <div className="mono" style={{ fontSize: 26 }}>{value ?? "—"}{value != null ? suffix : ""}</div>
    </div>
  );
}
