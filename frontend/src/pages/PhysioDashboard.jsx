import React, { useState, useEffect } from "react";
import { getAllAthletes } from "../services/athleteService";
import MetricCard from "../components/MetricCard";
import {
  Stethoscope,
  Activity,
  Award,
  CheckCircle2,
  AlertCircle,
  Plus,
  ChevronRight,
  HeartPulse,
} from "lucide-react";

export default function PhysioDashboard() {
  const [athletes, setAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [prescriptions, setPrescriptions] = useState({});
  const [newDrill, setNewDrill] = useState("");

  useEffect(() => {
    fetchAthletes();
  }, []);

  const fetchAthletes = async () => {
    try {
      setLoading(true);
      const data = await getAllAthletes();
      setAthletes(data || []);
    } catch (err) {
      console.warn("Failed to load athletes for clinical hub:", err);
      setAthletes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDrill = (e) => {
    e.preventDefault();
    if (!newDrill.trim() || !selectedAthlete) return;

    const athId = selectedAthlete.id;
    const currentDrills = prescriptions[athId] || [];
    const updated = [...currentDrills, newDrill.trim()];

    setPrescriptions((prev) => ({
      ...prev,
      [athId]: updated,
    }));
    setNewDrill("");
  };

  // Identify athletes with elevated risk or physical deficits as clinical cases
  const clinicalCases = athletes.filter(
    (a) => Number(a.riskScore) > 0 || (a.sport && a.sport !== "")
  );

  return (
    <div style={{ maxWidth: "1350px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1
              style={{
                fontSize: "1.8rem",
                fontWeight: "800",
                color: "#ffffff",
                letterSpacing: "-0.02em",
                margin: 0,
              }}
            >
              Physiotherapy & Clinical Hub
            </h1>
            <span
              style={{
                backgroundColor: "rgba(168, 85, 247, 0.15)",
                color: "#a855f7",
                padding: "2px 10px",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: "700",
                border: "1px solid rgba(168, 85, 247, 0.3)",
              }}
            >
              Medical Telemetry
            </span>
          </div>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Musculoskeletal screening review and corrective exercise prescription.
          </p>
        </div>

        <button
          onClick={fetchAthletes}
          className="btn-subtle"
          style={{ padding: "8px 16px", fontSize: "0.85rem" }}
        >
          Refresh Cases
        </button>
      </div>

      {/* Clinical Metrics Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        <MetricCard
          title="Monitored Athletes"
          value={athletes.length}
          unit="Athletes"
          subtitle="In squad care"
          icon={Stethoscope}
          color="purple"
        />
        <MetricCard
          title="Elevated Risk Cases"
          value={athletes.filter((a) => Number(a.riskScore) >= 50).length}
          unit="Athletes"
          subtitle="Score ≥ 50%"
          icon={HeartPulse}
          color="rose"
        />
        <MetricCard
          title="Screened Cases"
          value={athletes.filter((a) => a.riskStatus !== "Not Screened").length}
          unit={`/ ${athletes.length}`}
          subtitle="Motion assessments completed"
          icon={Activity}
          color="cyan"
        />
        <MetricCard
          title="Prescriptions Issued"
          value={Object.keys(prescriptions).length}
          unit="Athletes"
          subtitle="Active corrective protocols"
          icon={Award}
          color="emerald"
        />
      </div>

      {/* 4-Stage Return-to-Play Framework */}
      <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "2rem" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
            Standardized 4-Phase Return-to-Play (RTP) Framework
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
            Clinical milestones required before clearance
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
          <div style={{ padding: "1rem", backgroundColor: "rgba(15, 23, 42, 0.6)", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#38bdf8", marginBottom: "4px" }}>PHASE 1</div>
            <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "0.9rem", marginBottom: "4px" }}>Acute & Pain Control</div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
              Zero joint effusion, passive range of motion recovery, normal gait cycle.
            </p>
          </div>

          <div style={{ padding: "1rem", backgroundColor: "rgba(15, 23, 42, 0.6)", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#38bdf8", marginBottom: "4px" }}>PHASE 2</div>
            <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "0.9rem", marginBottom: "4px" }}>Heavy Slow Resistance (HSR)</div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
              Isometric strength &gt;80% of uninjured limb, bilateral squat symmetry.
            </p>
          </div>

          <div style={{ padding: "1rem", backgroundColor: "rgba(6, 182, 212, 0.1)", borderRadius: "10px", border: "1px solid rgba(6, 182, 212, 0.3)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#06b6d4", marginBottom: "4px" }}>PHASE 3</div>
            <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "0.9rem", marginBottom: "4px" }}>Neuromuscular Landing</div>
            <p style={{ fontSize: "0.78rem", color: "#cbd5e1", lineHeight: 1.4 }}>
              Knee valgus angle &lt;15° on jump landing, dynamic postural stability.
            </p>
          </div>

          <div style={{ padding: "1rem", backgroundColor: "rgba(15, 23, 42, 0.6)", borderRadius: "10px", border: "1px solid rgba(255, 255, 255, 0.06)" }}>
            <div style={{ fontSize: "0.75rem", fontWeight: "700", color: "#94a3b8", marginBottom: "4px" }}>PHASE 4</div>
            <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "0.9rem", marginBottom: "4px" }}>Return to Max Speed</div>
            <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
              Full sprint deceleration, reactive agility drill match clearance.
            </p>
          </div>
        </div>
      </div>

      {/* Clinical Athlete Cases Table */}
      <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
              Athlete Clinical Telemetry
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Prescribe corrective drills based on recorded biomechanical screening results
            </p>
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
            {athletes.length} Registered Athletes
          </span>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <Activity size={32} color="#a855f7" className="animate-pulse-slow" style={{ margin: "0 auto 8px" }} />
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Loading Clinical Records...</p>
          </div>
        ) : athletes.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <Stethoscope size={40} color="#334155" style={{ margin: "0 auto 10px" }} />
            <h4 style={{ color: "#ffffff", fontSize: "1rem", marginBottom: "4px" }}>
              No Athletes in Squad Registry Yet
            </h4>
            <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", maxWidth: "450px", margin: "0 auto" }}>
              When athletes create accounts and log their physical vitals or motion screenings, their clinical profiles will populate here.
            </p>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "12px 10px" }}>Athlete</th>
                  <th style={{ padding: "12px 10px" }}>Sport & Position</th>
                  <th style={{ padding: "12px 10px" }}>Risk Status</th>
                  <th style={{ padding: "12px 10px" }}>Flexibility / Balance</th>
                  <th style={{ padding: "12px 10px" }}>Last Screening</th>
                  <th style={{ padding: "12px 10px", textAlign: "right" }}>Corrective Protocol</th>
                </tr>
              </thead>
              <tbody>
                {athletes.map((ath) => {
                  const isHigh = Number(ath.riskScore) >= 60;
                  const isMod = Number(ath.riskScore) >= 30 && Number(ath.riskScore) < 60;
                  const drillCount = (prescriptions[ath.id] || []).length;
                  return (
                    <tr
                      key={ath.id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        cursor: "pointer",
                        transition: "background 0.2s ease",
                      }}
                      onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)")}
                      onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      onClick={() => setSelectedAthlete(ath)}
                    >
                      <td style={{ padding: "12px 10px", fontWeight: "700", color: "#ffffff" }}>
                        {ath.name || ath.email}
                      </td>
                      <td style={{ padding: "12px 10px", color: "var(--text-muted)" }}>
                        {ath.sport || "Unspecified"} ({ath.position || "N/A"})
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <span className={isHigh ? "badge-high-risk" : isMod ? "badge-mod-risk" : "badge-low-risk"}>
                          {ath.riskStatus} {ath.riskScore > 0 ? `(${Math.round(ath.riskScore)}%)` : ""}
                        </span>
                      </td>
                      <td style={{ padding: "12px 10px", color: "#34d399", fontWeight: "600" }}>
                        {ath.flexibility > 0 ? `${ath.flexibility}% / ${ath.balance}%` : "Not set"}
                      </td>
                      <td style={{ padding: "12px 10px", color: "var(--text-dim)", fontSize: "0.82rem" }}>
                        {ath.lastAssessment}
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "right" }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAthlete(ath);
                          }}
                          className="btn-subtle"
                          style={{ padding: "4px 10px", fontSize: "0.75rem" }}
                        >
                          {drillCount > 0 ? `Prescribed (${drillCount})` : "+ Prescribe"} <ChevronRight size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Case Prescription Modal */}
      {selectedAthlete && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem",
          }}
        >
          <div className="glass-panel" style={{ width: "100%", maxWidth: "600px", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#38bdf8", margin: 0 }}>
                  Rehab Protocol: {selectedAthlete.name || selectedAthlete.email}
                </h3>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Sport: {selectedAthlete.sport || "General Athletics"} • Risk: {selectedAthlete.riskStatus}
                </span>
              </div>
              <button
                onClick={() => setSelectedAthlete(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.5rem", cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: "700", color: "var(--text-muted)", marginBottom: "8px" }}>
                Prescribed Corrective Drills:
              </label>
              {(prescriptions[selectedAthlete.id] || []).length === 0 ? (
                <p style={{ color: "var(--text-dim)", fontSize: "0.82rem" }}>
                  No corrective exercises prescribed yet for this athlete. Add a drill below.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {(prescriptions[selectedAthlete.id] || []).map((drill, index) => (
                    <div
                      key={index}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "8px 12px",
                        backgroundColor: "rgba(10, 15, 29, 0.8)",
                        borderRadius: "8px",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                        fontSize: "0.85rem",
                        color: "#f8fafc",
                      }}
                    >
                      <CheckCircle2 size={16} color="#10b981" />
                      <span>{drill}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add New Drill Form */}
            <form onSubmit={handleAddDrill} style={{ marginBottom: "1.5rem" }}>
              <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                Add Corrective Drill or Movement Cue
              </label>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="text"
                  placeholder="e.g. Single-Leg Drop Jump with 20° Knee Flexion Cue (3x10)"
                  value={newDrill}
                  onChange={(e) => setNewDrill(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "8px 12px",
                    borderRadius: "8px",
                    backgroundColor: "rgba(10, 15, 29, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                    fontSize: "0.85rem",
                  }}
                />
                <button type="submit" className="btn-emerald" style={{ padding: "8px 14px", fontSize: "0.85rem" }}>
                  <Plus size={16} /> Add
                </button>
              </div>
            </form>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button onClick={() => setSelectedAthlete(null)} className="btn-subtle">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
