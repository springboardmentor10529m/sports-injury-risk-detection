import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Users } from "lucide-react";
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
      <div className="eyebrow" style={{ marginBottom: 6 }}>Roster</div>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>My Team</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 20 }}>Add an athlete by the email they registered with.</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <AddAthleteForm onAdd={handleAdd} buttonLabel="Add to team" />
      </div>

      <div className="card animate-in">
        {loading ? (
          <p style={{ color: "var(--text-dim)" }}>Loading...</p>
        ) : team.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Users size={20} /></div>
            <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No athletes on your team yet.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th><th>Sport</th><th>Latest risk</th><th>Analyses</th><th></th>
              </tr>
            </thead>
            <tbody>
              {team.map((a) => (
                <tr key={a.athlete_id}>
                  <td>{a.full_name}<div style={{ fontSize: 11, color: "var(--text-faint)" }}>{a.email}</div></td>
                  <td>{a.sport}</td>
                  <td><RiskPill category={a.latest_risk_category} score={a.latest_risk_score} /></td>
                  <td>{a.total_analyses}</td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <Link to={`/coach/athletes/${a.athlete_id}`} style={{ color: "var(--accent)", marginRight: 16, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      View <ArrowRight size={13} />
                    </Link>
                    <button onClick={() => handleRemove(a.athlete_id)} style={{ background: "none", border: "none", color: "var(--risk-critical)", fontSize: 12, cursor: "pointer" }}>
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
