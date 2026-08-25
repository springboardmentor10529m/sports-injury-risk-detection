import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { addPhysioPatient, getPhysioPatients, removePhysioPatient } from "../api/client";
import AddAthleteForm from "../components/AddAthleteForm";
import RiskPill from "../components/RiskPill";

export default function PhysioPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  function refresh() {
    return getPhysioPatients().then((res) => setPatients(res.data));
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  async function handleAdd(email) {
    await addPhysioPatient(email);
    await refresh();
  }
  async function handleRemove(athleteId) {
    await removePhysioPatient(athleteId);
    await refresh();
  }

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Patients</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 20 }}>Add a patient by the email they registered with.</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <AddAthleteForm onAdd={handleAdd} buttonLabel="Add patient" />
      </div>

      <div className="card">
        {loading ? (
          <p style={{ color: "var(--text-dim)" }}>Loading...</p>
        ) : patients.length === 0 ? (
          <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No patients yet.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ color: "var(--text-dim)", textAlign: "left" }}>
                <th style={{ padding: "6px 4px", fontWeight: 500 }}>Name</th>
                <th style={{ padding: "6px 4px", fontWeight: 500 }}>Sport</th>
                <th style={{ padding: "6px 4px", fontWeight: 500 }}>Latest risk</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.athlete_id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "10px 4px" }}>{p.full_name}<div style={{ fontSize: 11, color: "var(--text-faint)" }}>{p.email}</div></td>
                  <td style={{ padding: "10px 4px" }}>{p.sport}</td>
                  <td style={{ padding: "10px 4px" }}><RiskPill category={p.latest_risk_category} score={p.latest_risk_score} /></td>
                  <td style={{ padding: "10px 4px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <Link to={`/physio/patients/${p.athlete_id}`} style={{ color: "var(--accent)", marginRight: 12 }}>View →</Link>
                    <button
                      onClick={() => handleRemove(p.athlete_id)}
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
