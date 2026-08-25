import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getCoachTeam, getCoachTeamSummary } from "../api/client";
import RiskPill from "../components/RiskPill";

const CATEGORY_ORDER = ["CRITICAL", "HIGH", "MODERATE", "LOW"];
const CATEGORY_COLOR = { LOW: "var(--risk-low)", MODERATE: "var(--risk-moderate)", HIGH: "var(--risk-high)", CRITICAL: "var(--risk-critical)" };

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
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Team Overview</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>{summary.total_athletes} athletes on your team.</p>

      {summary.total_athletes === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--text-dim)", marginBottom: 20 }}>Your team is empty.</p>
          <Link to="/coach/team" className="btn btn-primary">Add athletes</Link>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
            {CATEGORY_ORDER.map((cat) => (
              <div key={cat} className="card" style={{ textAlign: "center" }}>
                <div className="mono" style={{ fontSize: 30, color: CATEGORY_COLOR[cat] }}>
                  {summary.risk_breakdown[cat] || 0}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>
                  {cat}
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <h3 style={{ fontSize: 15 }}>Highest risk athletes</h3>
              <Link to="/coach/team" className="btn" style={{ fontSize: 13, padding: "8px 14px" }}>View full team</Link>
            </div>
            {atRisk.length === 0 ? (
              <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No athletes have completed an analysis yet.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  {atRisk.map((a) => (
                    <tr key={a.athlete_id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 4px" }}>{a.full_name}</td>
                      <td style={{ padding: "10px 4px", color: "var(--text-dim)" }}>{a.sport}</td>
                      <td style={{ padding: "10px 4px" }}><RiskPill category={a.latest_risk_category} score={a.latest_risk_score} /></td>
                      <td style={{ padding: "10px 4px", textAlign: "right" }}>
                        <Link to={`/coach/athletes/${a.athlete_id}`} style={{ color: "var(--accent)" }}>View →</Link>
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
