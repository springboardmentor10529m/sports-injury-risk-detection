import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Stethoscope } from "lucide-react";
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
      <div className="eyebrow" style={{ marginBottom: 6 }}>Roster</div>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Patients</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 20 }}>Add a patient by the email they registered with.</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <AddAthleteForm onAdd={handleAdd} buttonLabel="Add patient" />
      </div>

      <div className="card animate-in">
        {loading ? (
          <p style={{ color: "var(--text-dim)" }}>Loading...</p>
        ) : patients.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><Stethoscope size={20} /></div>
            <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No patients yet.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Name</th><th>Sport</th><th>Latest risk</th><th></th></tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.athlete_id}>
                  <td>{p.full_name}<div style={{ fontSize: 11, color: "var(--text-faint)" }}>{p.email}</div></td>
                  <td>{p.sport}</td>
                  <td><RiskPill category={p.latest_risk_category} score={p.latest_risk_score} /></td>
                  <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    <Link to={`/physio/patients/${p.athlete_id}`} style={{ color: "var(--accent)", marginRight: 16, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      View <ArrowRight size={13} />
                    </Link>
                    <button onClick={() => handleRemove(p.athlete_id)} style={{ background: "none", border: "none", color: "var(--risk-critical)", fontSize: 12, cursor: "pointer" }}>
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
