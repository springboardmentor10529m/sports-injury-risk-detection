import { useEffect, useState } from "react";
import { getAdminStats } from "../api/client";

const ROLE_LABEL = {
  athlete: "Athletes", coach: "Coaches", physiotherapist: "Physiotherapists",
  sports_scientist: "Sports Scientists", admin: "Administrators",
};
const STATUS_LABEL = {
  uploaded: "Uploaded", extracting_frames: "Extracting frames", running_pose: "Running pose",
  analyzing_biomechanics: "Analyzing biomechanics", scoring_risk: "Scoring risk",
  generating_recommendations: "Generating recommendations", completed: "Completed", failed: "Failed",
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    getAdminStats().then((res) => setStats(res.data));
  }, []);

  if (!stats) return <p style={{ color: "var(--text-dim)" }}>Loading...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Platform Overview</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>Live counts from the database.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <Metric label="Total Users" value={stats.total_users} />
        <Metric label="Active" value={stats.active_users} />
        <Metric label="Deactivated" value={stats.deactivated_users} color={stats.deactivated_users > 0 ? "var(--risk-high)" : undefined} />
        <Metric label="Videos Processed" value={stats.total_videos_processed} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div className="card">
          <h3 style={{ fontSize: 14, marginBottom: 14 }}>Users by role</h3>
          {Object.entries(ROLE_LABEL).map(([key, label]) => (
            <Row key={key} label={label} value={stats.users_by_role[key] || 0} />
          ))}
        </div>

        <div className="card">
          <h3 style={{ fontSize: 14, marginBottom: 14 }}>Videos by pipeline status</h3>
          {Object.keys(stats.videos_by_status).length === 0 ? (
            <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No videos uploaded yet.</p>
          ) : (
            Object.entries(stats.videos_by_status).map(([key, count]) => (
              <Row key={key} label={STATUS_LABEL[key] || key} value={count} />
            ))
          )}
        </div>
      </div>

      <div className="card">
        <h3 style={{ fontSize: 14, marginBottom: 10 }}>Average risk score, platform-wide</h3>
        <div className="mono" style={{ fontSize: 30 }}>
          {stats.avg_risk_score_platform_wide ?? "—"}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6 }}>
          Averaged across all completed analyses on the platform.
        </p>
      </div>
    </div>
  );
}

function Metric({ label, value, color }) {
  return (
    <div className="card">
      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>{label}</div>
      <div className="mono" style={{ fontSize: 26, color: color || "var(--text)" }}>{value}</div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid var(--border)", fontSize: 13 }}>
      <span style={{ color: "var(--text-dim)" }}>{label}</span>
      <span className="mono">{value}</span>
    </div>
  );
}
