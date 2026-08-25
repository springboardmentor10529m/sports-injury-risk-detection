import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPhysioPatients } from "../api/client";
import RiskPill from "../components/RiskPill";

export default function PhysioDashboard() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPhysioPatients().then((res) => setPatients(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: "var(--text-dim)" }}>Loading...</p>;

  const inPain = patients.filter((p) => p.latest_risk_category === "HIGH" || p.latest_risk_category === "CRITICAL");

  return (
    <div>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>Patient Overview</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 28 }}>{patients.length} patients under your care.</p>

      {patients.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: 48 }}>
          <p style={{ color: "var(--text-dim)", marginBottom: 20 }}>No patients yet.</p>
          <Link to="/physio/patients" className="btn btn-primary">Add a patient</Link>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
            <StatCard label="Active patients" value={patients.length} />
            <StatCard label="High/critical risk" value={inPain.length} color="var(--risk-high)" />
            <StatCard label="Assessed" value={patients.filter((p) => p.total_analyses > 0).length} />
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 14 }}>Patients needing attention</h3>
            {inPain.length === 0 ? (
              <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No high or critical risk patients right now.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <tbody>
                  {inPain.map((p) => (
                    <tr key={p.athlete_id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td style={{ padding: "10px 4px" }}>{p.full_name}</td>
                      <td style={{ padding: "10px 4px" }}><RiskPill category={p.latest_risk_category} score={p.latest_risk_score} /></td>
                      <td style={{ padding: "10px 4px", textAlign: "right" }}>
                        <Link to={`/physio/patients/${p.athlete_id}`} style={{ color: "var(--accent)" }}>View →</Link>
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

function StatCard({ label, value, color }) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div className="mono" style={{ fontSize: 28, color: color || "var(--text)" }}>{value}</div>
      <div style={{ fontSize: 11, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 4 }}>{label}</div>
    </div>
  );
}
