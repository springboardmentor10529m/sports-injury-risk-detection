import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardSummary, listVideos } from "../api/client";
import { useAuth } from "../context/AuthContext";
import RiskGauge from "../components/RiskGauge";

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getDashboardSummary(), listVideos()])
      .then(([s, v]) => {
        setSummary(s.data);
        setVideos(v.data);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "var(--text-dim)" }}>Loading your movement data...</p>;

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Good to see you, {user?.full_name?.split(" ")[0]}</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>Here's your movement health overview.</p>

      {!summary?.has_data ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--text-dim)", marginBottom: 20 }}>{summary?.message}</p>
          <Link to="/analyze" className="btn btn-primary">Analyze your first video</Link>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 20, marginBottom: 20 }}>
            <div className="card" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <RiskGauge score={summary.current_risk_score} category={summary.current_risk_category} />
              {summary.risk_change_from_previous !== null && (
                <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 8 }}>
                  {summary.risk_change_from_previous > 0 ? "▲" : "▼"}{" "}
                  {Math.abs(summary.risk_change_from_previous)} pts from last assessment
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <MetricCard label="Movement Quality" value={summary.movement_quality_score} />
              <MetricCard label="Symmetry" value={summary.symmetry_score} />
              <MetricCard label="Hip Stability" value={summary.hip_stability_score} />
              <MetricCard label="Fatigue Signal" value={summary.fatigue_score} invert />
            </div>
          </div>

          {summary.recommendations && (
            <div className="card" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, marginBottom: 14 }}>Today's recommendations</h3>
              <RecoList recommendations={summary.recommendations} />
            </div>
          )}
        </>
      )}

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <h3 style={{ fontSize: 15 }}>Recent analyses</h3>
          <Link to="/analyze" className="btn" style={{ fontSize: 13, padding: "8px 14px" }}>+ New analysis</Link>
        </div>
        {videos.length === 0 ? (
          <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No videos uploaded yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <tbody>
              {videos.slice(0, 8).map((v) => (
                <tr key={v.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 4px", textTransform: "capitalize" }}>{v.activity_type}</td>
                  <td style={{ padding: "10px 4px", color: "var(--text-dim)" }}>
                    {new Date(v.created_at).toLocaleString()}
                  </td>
                  <td style={{ padding: "10px 4px" }}>
                    <StatusPill status={v.status} />
                  </td>
                  <td style={{ padding: "10px 4px", textAlign: "right" }}>
                    <Link to={`/analysis/${v.id}`} style={{ color: "var(--accent)" }}>View →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value, invert = false }) {
  const display = value === null || value === undefined ? "—" : Math.round(value);
  return (
    <div className="card">
      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
        {label}
      </div>
      <div className="mono" style={{ fontSize: 28, color: invert ? scoreColorInverted(value) : scoreColor(value) }}>
        {display}
        <span style={{ fontSize: 14, color: "var(--text-faint)" }}>/100</span>
      </div>
    </div>
  );
}

function scoreColor(v) {
  if (v === null || v === undefined) return "var(--text-dim)";
  if (v >= 80) return "var(--risk-low)";
  if (v >= 60) return "var(--risk-moderate)";
  return "var(--risk-high)";
}
function scoreColorInverted(v) {
  if (v === null || v === undefined) return "var(--text-dim)";
  if (v <= 20) return "var(--risk-low)";
  if (v <= 40) return "var(--risk-moderate)";
  return "var(--risk-high)";
}

export function StatusPill({ status }) {
  const map = {
    completed: { color: "var(--risk-low)", label: "Completed" },
    failed: { color: "var(--risk-critical)", label: "Failed" },
    uploaded: { color: "var(--text-dim)", label: "Queued" },
  };
  const s = map[status] || { color: "var(--risk-moderate)", label: status.replace(/_/g, " ") };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, textTransform: "capitalize" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, display: "inline-block" }} />
      {s.label}
    </span>
  );
}

export function RecoList({ recommendations }) {
  const categories = ["mobility", "strength", "recovery", "training"];
  const any = categories.some((c) => recommendations[c]?.length);
  if (!any) return <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No corrective actions flagged - current form looks within normal ranges.</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
      {categories.map((cat) =>
        recommendations[cat]?.length ? (
          <div key={cat}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--accent)", marginBottom: 8 }}>
              {cat}
            </div>
            {recommendations[cat].map((item, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 2 }}>{item.protocol}</div>
              </div>
            ))}
          </div>
        ) : null
      )}
    </div>
  );
}
