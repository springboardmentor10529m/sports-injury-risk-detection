import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { addCoachAthlete, getCoachTeam, removeCoachAthlete } from "../api/client";
import AddAthleteForm from "../components/AddAthleteForm";
import RiskPill from "../components/RiskPill";

export default function CoachTeam() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    return getCoachTeam().then((res) => setTeam(res.data));
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function handleAdd(email) {
    await addCoachAthlete(email);
    await refresh();
  }

  async function handleRemove(athleteId) {
    await removeCoachAthlete(athleteId);
    await refresh();
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>My Team</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 20 }}>
        Add an athlete by the email they registered with.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <AddAthleteForm onAdd={handleAdd} buttonLabel="Add to team" />
      </div>

      <div className="card">
        {loading ? (
          <p style={{ color: "var(--text-dim)" }}>Loading...</p>
        ) : team.length === 0 ? (
          <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No athletes on your team yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--text-dim)", textAlign: "left" }}>
                <th style={{ padding: "6px 4px", fontWeight: 500 }}>Name</th>
                <th style={{ padding: "6px 4px", fontWeight: 500 }}>Sport</th>
                <th style={{ padding: "6px 4px", fontWeight: 500 }}>Latest risk</th>
                <th style={{ padding: "6px 4px", fontWeight: 500 }}>Analyses</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {team.map((a) => (
                <tr key={a.athlete_id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 4px" }}>{a.full_name}<div style={{ fontSize: 11, color: "var(--text-faint)" }}>{a.email}</div></td>
                  <td style={{ padding: "10px 4px" }}>{a.sport}</td>
                  <td style={{ padding: "10px 4px" }}><RiskPill category={a.latest_risk_category} score={a.latest_risk_score} /></td>
                  <td style={{ padding: "10px 4px" }}>{a.total_analyses}</td>
                  <td style={{ padding: "10px 4px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <Link to={`/coach/athletes/${a.athlete_id}`} style={{ color: "var(--accent)", marginRight: 12 }}>View →</Link>
                    <button
                      onClick={() => handleRemove(a.athlete_id)}
                      style={{ background: "none", border: "none", color: "var(--risk-critical)", fontSize: 12, cursor: "pointer" }}
                    >
                      Remove
                    </button>
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
