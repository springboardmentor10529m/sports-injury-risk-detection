import { useEffect, useState } from "react";
import { Activity, Gauge, ShieldOff, Users } from "lucide-react";
import { getAdminStats } from "../api/client";
import StatCard from "../components/StatCard";

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

  const maxRole = Math.max(1, ...Object.values(stats.users_by_role));

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Platform Overview</div>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>System at a glance</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>Live counts from the database.</p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        <StatCard icon={Users} label="Total Users" value={stats.total_users} color="var(--accent)" glow />
        <StatCard icon={Users} label="Active" value={stats.active_users} color="var(--risk-low)" glow />
        <StatCard icon={ShieldOff} label="Deactivated" value={stats.deactivated_users} color={stats.deactivated_users > 0 ? "var(--risk-high)" : "var(--text-dim)"} glow />
        <StatCard icon={Activity} label="Videos Processed" value={stats.total_videos_processed} color="var(--accent2)" glow />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div className="card animate-in">
          <div className="card-title"><Users size={15} color="var(--accent)" /> Users by role</div>
          {Object.entries(ROLE_LABEL).map(([key, label]) => (
            <BarRow key={key} label={label} value={stats.users_by_role[key] || 0} max={maxRole} />
          ))}
        </div>

        <div className="card animate-in">
          <div className="card-title"><Activity size={15} color="var(--accent)" /> Videos by pipeline status</div>
          {Object.keys(stats.videos_by_status).length === 0 ? (
            <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No videos uploaded yet.</p>
          ) : (
            Object.entries(stats.videos_by_status).map(([key, count]) => (
              <BarRow key={key} label={STATUS_LABEL[key] || key} value={count} max={Math.max(1, ...Object.values(stats.videos_by_status))} />
            ))
          )}
        </div>
      </div>

      <div className="card animate-in">
        <div className="card-title"><Gauge size={15} color="var(--accent)" /> Average risk score, platform-wide</div>
        <div className="mono" style={{ fontSize: 32 }}>
          {stats.avg_risk_score_platform_wide ?? "—"}
        </div>
        <p style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 6 }}>
          Averaged across all completed analyses on the platform.
        </p>
      </div>
    </div>
  );
}

function BarRow({ label, value, max }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 5 }}>
        <span style={{ color: "var(--text-dim)" }}>{label}</span>
        <span className="mono">{value}</span>
      </div>
      <div style={{ height: 5, background: "var(--border-soft)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${(value / max) * 100}%`, background: "linear-gradient(90deg, var(--accent-dim), var(--accent))", borderRadius: 4 }} />
      </div>
    </div>
  );
}
