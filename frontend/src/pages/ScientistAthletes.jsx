import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { addScientistAthlete, getScientistAthletes } from "../api/client";
import AddAthleteForm from "../components/AddAthleteForm";
import RiskPill from "../components/RiskPill";

export default function ScientistAthletes() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    return getScientistAthletes().then((res) => setAthletes(res.data));
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function handleAdd(email) {
    await addScientistAthlete(email);
    await refresh();
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Athlete Dataset</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 20 }}>
        Add athletes by email to include their completed analyses in your research dashboard.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <AddAthleteForm onAdd={handleAdd} buttonLabel="Add to dataset" />
      </div>

      <div className="card">
        {loading ? (
          <p style={{ color: "var(--text-dim)" }}>Loading...</p>
        ) : athletes.length === 0 ? (
          <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No athletes in your dataset yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--text-dim)", textAlign: "left" }}>
                <th style={{ padding: "6px 4px", fontWeight: 500 }}>Name</th>
                <th style={{ padding: "6px 4px", fontWeight: 500 }}>Sport</th>
                <th style={{ padding: "6px 4px", fontWeight: 500 }}>Analyses</th>
                <th style={{ padding: "6px 4px", fontWeight: 500 }}>Latest risk</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {athletes.map((a) => (
                <tr key={a.athlete_id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 4px" }}>{a.full_name}</td>
                  <td style={{ padding: "10px 4px" }}>{a.sport}</td>
                  <td style={{ padding: "10px 4px" }}>{a.total_analyses}</td>
                  <td style={{ padding: "10px 4px" }}><RiskPill category={a.latest_risk_category} score={a.latest_risk_score} /></td>
                  <td style={{ padding: "10px 4px", textAlign: "right" }}>
                    <Link to={`/scientist/athletes/${a.athlete_id}`} style={{ color: "var(--accent)" }}>View →</Link>
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
