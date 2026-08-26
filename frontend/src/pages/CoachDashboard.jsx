import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldAlert, ShieldCheck, TrendingUp, Users } from "lucide-react";
import { getCoachTeam, getCoachTeamSummary } from "../api/client";
import RiskPill from "../components/RiskPill";
import StatCard from "../components/StatCard";

const CATS = [
  { key: "LOW", label: "Low Risk", icon: ShieldCheck, color: "var(--risk-low)" },
  { key: "MODERATE", label: "Moderate", icon: TrendingUp, color: "var(--risk-moderate)" },
  { key: "HIGH", label: "High Risk", icon: ShieldAlert, color: "var(--risk-high)" },
  { key: "CRITICAL", label: "Critical", icon: ShieldAlert, color: "var(--risk-critical)" },
];

export default function CoachDashboard() {
  const [summary, setSummary] = useState(null);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getCoachTeamSummary(), getCoachTeam()])
      .then(([s, t]) => { setSummary(s.data); setTeam(t.data); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "var(--text-dim)" }}>Loading team data...</p>;

  const atRisk = [...team]
    .filter((a) => a.latest_risk_score != null)
    .sort((a, b) => b.latest_risk_score - a.latest_risk_score)
    .slice(0, 6);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Team Overview</div>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>Your squad, at a glance</h1>
          <p style={{ color: "var(--text-dim)" }}>{summary.total_athletes} athletes on your team.</p>
        </div>
        <Link to="/coach/team" className="btn btn-primary"><Users size={15} /> Manage team</Link>
      </div>

      {summary.total_athletes === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><Users size={22} /></div>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>Your team is empty</h3>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 20 }}>Add athletes by email to start tracking their risk.</p>
          <Link to="/coach/team" className="btn btn-primary">Add athletes</Link>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
            {CATS.map((c) => (
              <StatCard key={c.key} icon={c.icon} label={c.label} value={summary.risk_breakdown[c.key] || 0} color={c.color} glow />
            ))}
          </div>

          <div className="card animate-in">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div className="card-title" style={{ marginBottom: 0 }}><TrendingUp size={15} color="var(--accent)" /> Highest risk athletes</div>
              <Link to="/coach/team" className="btn" style={{ fontSize: 13, padding: "8px 14px" }}>View full team</Link>
            </div>
            {atRisk.length === 0 ? (
              <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No athletes have completed an analysis yet.</p>
            ) : (
              <table className="data-table">
                <tbody>
                  {atRisk.map((a) => (
                    <tr key={a.athlete_id}>
                      <td>{a.full_name}</td>
                      <td style={{ color: "var(--text-dim)" }}>{a.sport}</td>
                      <td><RiskPill category={a.latest_risk_category} score={a.latest_risk_score} /></td>
                      <td style={{ textAlign: "right" }}>
                        <Link to={`/coach/athletes/${a.athlete_id}`} style={{ color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          View <ArrowRight size={13} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  );
}
