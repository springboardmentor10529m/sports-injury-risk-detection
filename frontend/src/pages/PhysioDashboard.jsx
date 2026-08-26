import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, HeartPulse, Stethoscope, Users } from "lucide-react";
import { getPhysioPatients } from "../api/client";
import RiskPill from "../components/RiskPill";
import StatCard from "../components/StatCard";

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 6 }}>Patient Overview</div>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>Who needs your attention</h1>
          <p style={{ color: "var(--text-dim)" }}>{patients.length} patients under your care.</p>
        </div>
        <Link to="/physio/patients" className="btn btn-primary"><Stethoscope size={15} /> Manage patients</Link>
      </div>

      {patients.length === 0 ? (
        <div className="card empty-state">
          <div className="empty-state-icon"><Users size={22} /></div>
          <h3 style={{ fontSize: 16, marginBottom: 4 }}>No patients yet</h3>
          <p style={{ color: "var(--text-dim)", fontSize: 13, marginBottom: 20 }}>Add a patient by their email to start tracking recovery.</p>
          <Link to="/physio/patients" className="btn btn-primary">Add a patient</Link>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 20 }}>
            <StatCard icon={Users} label="Active patients" value={patients.length} color="var(--accent)" glow />
            <StatCard icon={HeartPulse} label="High / critical risk" value={inPain.length} color="var(--risk-high)" glow />
            <StatCard icon={Stethoscope} label="Assessed" value={patients.filter((p) => p.total_analyses > 0).length} color="var(--accent2)" glow />
          </div>

          <div className="card animate-in">
            <div className="card-title"><HeartPulse size={15} color="var(--risk-high)" /> Patients needing attention</div>
            {inPain.length === 0 ? (
              <p style={{ color: "var(--text-faint)", fontSize: 13 }}>No high or critical risk patients right now.</p>
            ) : (
              <table className="data-table">
                <tbody>
                  {inPain.map((p) => (
                    <tr key={p.athlete_id}>
                      <td>{p.full_name}</td>
                      <td><RiskPill category={p.latest_risk_category} score={p.latest_risk_score} /></td>
                      <td style={{ textAlign: "right" }}>
                        <Link to={`/physio/patients/${p.athlete_id}`} style={{ color: "var(--accent)", display: "inline-flex", alignItems: "center", gap: 4 }}>
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
