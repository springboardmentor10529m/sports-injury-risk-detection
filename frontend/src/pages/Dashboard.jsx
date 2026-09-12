import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowRight, Gauge, HeartPulse, Scale, Sparkles, Video, Zap,
} from "lucide-react";
import { getDashboardSummary, listVideos, peekData } from "../api/client";
import { useAuth } from "../context/AuthContext";
import RiskGauge from "../components/RiskGauge";
import StatCard from "../components/StatCard";

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(() => peekData("/api/analysis/dashboard-summary") ?? null);
  const [videos, setVideos] = useState(() => peekData("/api/videos") ?? []);
  const [loading, setLoading] = useState(() => !peekData("/api/analysis/dashboard-summary"));
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const refresh = () => Promise.all([getDashboardSummary(), listVideos()])
      .then(([s, v]) => {
        if (!active) return;
        setSummary(s.data);
        setVideos(v.data);
        setError("");
      })
      .catch(() => { if (active) setError("Could not refresh your data. Please retry shortly."); })
      .finally(() => { if (active) setLoading(false); });
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  if (loading) return <p style={{ color: "var(--text-dim)" }}>Loading your movement data...</p>;
  const recommendationSource = videos.find((item) => item.id === summary?.latest_video_id);

  return (
    <div>
      {error && <p role="alert">{error}</p>}
      {["HIGH", "CRITICAL"].includes(String(summary?.current_risk_category).toUpperCase()) &&
        <div role="alert" className="card" style={{ border: "1px solid var(--risk-high)", marginBottom: 20 }}>
          <strong>Your latest assessment shows {summary.current_risk_category} risk.</strong>
          <p>Review your latest analysis and recommendations. This is not a medical diagnosis.</p>
        </div>}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Overview</div>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>
            Good to see you, {user?.full_name?.split(" ")[0]}
          </h1>
          <p style={{ color: "var(--text-dim)" }}>Here's your movement health overview.</p>
        </div>
        <Link to="/analyze" className="btn btn-primary">
          <Video size={15} /> New analysis
        </Link>
      </div>

      {!summary?.has_data ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><Sparkles size={22} /></div>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>No analyses yet</h3>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 20, maxWidth: 360 }}>
            {summary?.message}
          </p>
          <Link to="/analyze" className="btn btn-primary">Analyze your first video</Link>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 20, marginBottom: 20 }}>
            <div
              className="card animate-in"
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: "radial-gradient(circle at 50% 0%, var(--accent-soft), var(--surface) 70%)",
              }}
            >
              <div className="eyebrow" style={{ marginBottom: 8 }}>Current Injury Risk</div>
              <RiskGauge score={summary.current_risk_score} category={summary.current_risk_category} />
              {summary.risk_change_from_previous !== null && (
                <div
                  style={{
                    fontSize: 12, marginTop: 6, display: "flex", alignItems: "center", gap: 4,
                    color: summary.risk_change_from_previous <= 0 ? "var(--risk-low)" : "var(--risk-high)",
                    fontWeight: 500,
                  }}
                >
                  {summary.risk_change_from_previous > 0 ? "▲" : "▼"}{" "}
                  {Math.abs(summary.risk_change_from_previous)} pts since last assessment
                </div>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <StatCard icon={Activity} label="Movement Quality" value={fmt(summary.movement_quality_score)} suffix="/100" color="var(--accent)" glow />
              <StatCard icon={Scale} label="Symmetry" value={fmt(summary.symmetry_score)} suffix="/100" color="var(--accent2)" glow />
              <StatCard icon={Gauge} label="Hip Stability" value={fmt(summary.hip_stability_score)} suffix="/100" color="var(--risk-low)" glow />
              <StatCard icon={Zap} label="Fatigue Signal" value={fmt(summary.fatigue_score)} suffix="/100" color={fatigueColor(summary.fatigue_score)} glow />
            </div>
          </div>

          {summary.recommendations && (
            <div className="card animate-in" style={{ marginBottom: 20 }}>
              <div className="card-title"><HeartPulse size={15} color="var(--accent)" /> Recommendations from your latest analysis</div>
              {recommendationSource && <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 16 }}>
                <span style={{ textTransform: "capitalize" }}>{recommendationSource.activity_type}</span>
                {recommendationSource.completed_at && <> · Completed {new Date(recommendationSource.completed_at).toLocaleString()}</>}
                {" · "}<Link to={`/analysis/${recommendationSource.id}`} style={{ color: "var(--accent)" }}>View analysis</Link>
              </p>}
              <RecoList recommendations={summary.recommendations} />
            </div>
          )}
        </>
      )}

      <div className="card animate-in">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="card-title" style={{ marginBottom: 0 }}><Video size={15} color="var(--accent)" /> Recent analyses</div>
          <Link to="/analyze" className="btn" style={{ fontSize: 13, padding: "8px 14px" }}>+ New analysis</Link>
        </div>
        {videos.length === 0 ? (
          <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No videos uploaded yet.</p>
        ) : (
          <table className="data-table">
            <tbody>
              {videos.slice(0, 8).map((v) => (
                <tr key={v.id}>
                  <td style={{ textTransform: "capitalize", width: 140 }}>{v.activity_type}</td>
                  <td style={{ color: "var(--text-dim)" }}>{new Date(v.created_at).toLocaleString()}</td>
                  <td><StatusPill status={v.status} /></td>
                  <td style={{ textAlign: "right" }}>
                    <Link to={`/analysis/${v.id}`} style={{ color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                      View <ArrowRight size={13} />
                    </Link>
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

function fmt(v) {
  return v === null || v === undefined ? "—" : Math.round(v);
}
function fatigueColor(v) {
  if (v === null || v === undefined) return "var(--text-dim)";
  if (v <= 20) return "var(--risk-low)";
  if (v <= 40) return "var(--risk-moderate)";
  return "var(--risk-high)";
}

export function StatusPill({ status }) {
  const map = {
    completed: { color: "var(--risk-low)", label: "Completed" },
    failed: { color: "var(--risk-critical)", label: "Failed" },
    insufficient_data: { color: "var(--risk-moderate)", label: "Insufficient data" },
    uploaded: { color: "var(--text-dim)", label: "Queued" },
  };
  const s = map[status] || { color: "var(--risk-moderate)", label: status.replace(/_/g, " ") };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, textTransform: "capitalize" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, display: "inline-block", boxShadow: `0 0 8px ${s.color}` }} />
      {s.label}
    </span>
  );
}

export function RecoList({ recommendations }) {
  const categories = ["mobility", "strength", "recovery", "training"];
  const any = categories.some((c) => recommendations[c]?.length);
  if (!any) return <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No corrective actions flagged - current form looks within normal ranges.</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 18 }}>
      {categories.map((cat) =>
        recommendations[cat]?.length ? (
          <div key={cat}>
            <div className="eyebrow" style={{ color: "var(--accent)", marginBottom: 10 }}>{cat}</div>
            {recommendations[cat].map((item, i) => (
              <div key={i} style={{ marginBottom: 14, paddingLeft: 10, borderLeft: "2px solid var(--border)" }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 3 }}>{item.protocol}</div>
              </div>
            ))}
          </div>
        ) : null
      )}
    </div>
  );
}
