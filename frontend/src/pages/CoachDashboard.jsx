import React, { useState, useEffect } from "react";
import { getAllAthletes } from "../services/athleteService";
import MetricCard from "../components/MetricCard";
import {
  Users,
  AlertTriangle,
  Flame,
  Activity,
  Search,
  ChevronRight,
  ShieldAlert,
  Dumbbell,
  Sparkles,
} from "lucide-react";

export default function CoachDashboard() {
  const [squad, setSquad] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSport, setSelectedSport] = useState("all");
  const [selectedAthlete, setSelectedAthlete] = useState(null);

  useEffect(() => {
    fetchSquad();
  }, []);

  const fetchSquad = async () => {
    try {
      setLoading(true);
      const data = await getAllAthletes();
      setSquad(data || []);
    } catch (err) {
      console.warn("Failed to load athletes:", err);
      setSquad([]);
    } finally {
      setLoading(false);
    }
  };

  // Get distinct sports from real registered athletes
  const registeredSports = Array.from(
    new Set(squad.map((a) => a.sport).filter((s) => s && s.trim() !== ""))
  );
  const sportsList = ["all", ...registeredSports];

  const filteredSquad = squad.filter((ath) => {
    const matchesSearch =
      (ath.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ath.position || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ath.sport || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSport =
      selectedSport === "all" ||
      (ath.sport || "").toLowerCase() === selectedSport.toLowerCase();
    return matchesSearch && matchesSport;
  });

  const highRiskCount = squad.filter((a) => Number(a.riskScore) >= 60).length;
  const modRiskCount = squad.filter(
    (a) => Number(a.riskScore) >= 30 && Number(a.riskScore) < 60
  ).length;
  const avgLoad =
    squad.length > 0
      ? Math.round(
          squad.reduce((acc, a) => acc + (Number(a.trainingLoad) || 0), 0) /
            squad.length
        )
      : 0;

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
              Coach Command Center
            </h1>
            <span
              style={{
                backgroundColor: "rgba(6, 182, 212, 0.15)",
                color: "#06b6d4",
                padding: "2px 10px",
                borderRadius: "20px",
                fontSize: "0.75rem",
                fontWeight: "700",
                border: "1px solid rgba(6, 182, 212, 0.3)",
              }}
            >
              Squad Telemetry
            </span>
          </div>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Real-time squad roster, training load distribution, and injury vulnerability alerts.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={fetchSquad}
            className="btn-subtle"
            style={{ padding: "8px 16px", fontSize: "0.85rem" }}
          >
            Refresh Roster
          </button>
        </div>
      </div>

      {/* Critical Alert Banner if High Risk Athletes Exist */}
      {highRiskCount > 0 && (
        <div
          style={{
            backgroundColor: "rgba(244, 63, 94, 0.12)",
            border: "1px solid rgba(244, 63, 94, 0.35)",
            padding: "1rem 1.5rem",
            borderRadius: "14px",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                padding: "8px",
                borderRadius: "10px",
                backgroundColor: "rgba(244, 63, 94, 0.2)",
                color: "#f43f5e",
              }}
            >
              <ShieldAlert size={24} />
            </div>
            <div>
              <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "0.95rem" }}>
                {highRiskCount} Athlete{highRiskCount > 1 ? "s" : ""} Flagged with High Injury Risk
              </div>
              <div style={{ fontSize: "0.8rem", color: "#fca5a5" }}>
                Significant biomechanical landing stress or fatigue detected.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Metric Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        <MetricCard
          title="Registered Athletes"
          value={squad.length}
          unit="Athletes"
          subtitle={squad.length > 0 ? "Active squad" : "No athletes registered"}
          icon={Users}
          color="cyan"
        />
        <MetricCard
          title="High-Risk Flags"
          value={highRiskCount}
          unit="Athletes"
          subtitle="Score ≥ 60%"
          icon={AlertTriangle}
          color="rose"
        />
        <MetricCard
          title="Average Squad Load"
          value={avgLoad > 0 ? avgLoad : "--"}
          unit={avgLoad > 0 ? "/ 100" : ""}
          subtitle={avgLoad > 0 ? "Workload exertion" : "No telemetry logged"}
          icon={Flame}
          progress={avgLoad}
          color={avgLoad > 80 ? "amber" : "emerald"}
        />
        <MetricCard
          title="Screened Athletes"
          value={squad.filter((a) => a.riskStatus !== "Not Screened").length}
          unit={`/ ${squad.length}`}
          subtitle="Completed motion screening"
          icon={Activity}
          color="emerald"
        />
      </div>

      {/* Squad Roster Table */}
      <div className="glass-panel" style={{ padding: "1.75rem", marginBottom: "2rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
              Squad Telemetry Roster
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Click any athlete to view their biometrics and screening history
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div style={{ position: "relative" }}>
              <Search
                size={16}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "50%",
                  transform: "translateY(-50)",
                  color: "var(--text-dim)",
                }}
              />
              <input
                type="text"
                placeholder="Search athlete..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: "7px 12px 7px 2.2rem",
                  borderRadius: "8px",
                  backgroundColor: "rgba(10, 15, 29, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#fff",
                  fontSize: "0.85rem",
                  outline: "none",
                  width: "220px",
                }}
              />
            </div>

            {registeredSports.length > 1 && (
              <select
                value={selectedSport}
                onChange={(e) => setSelectedSport(e.target.value)}
                style={{
                  padding: "7px 12px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(10, 15, 29, 0.8)",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  color: "#fff",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              >
                {sportsList.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All Sports" : s}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <Activity size={32} color="#06b6d4" className="animate-pulse-slow" style={{ margin: "0 auto 8px" }} />
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>Loading Squad Telemetry...</p>
          </div>
        ) : filteredSquad.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <Users size={40} color="#334155" style={{ margin: "0 auto 10px" }} />
            <h4 style={{ color: "#ffffff", fontSize: "1rem", marginBottom: "4px" }}>
              {squad.length === 0 ? "No Athletes Registered Yet" : "No Athletes Matched Search"}
            </h4>
            <p style={{ color: "var(--text-dim)", fontSize: "0.85rem", maxWidth: "450px", margin: "0 auto" }}>
              {squad.length === 0
                ? "When athletes register on KineticAI and input their vitals, they will automatically appear on your squad dashboard here."
                : "Try adjusting your search filter."}
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
                  <th style={{ padding: "12px 10px" }}>Training Load</th>
                  <th style={{ padding: "12px 10px" }}>Strength / Flex</th>
                  <th style={{ padding: "12px 10px" }}>Last Assessed</th>
                  <th style={{ padding: "12px 10px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSquad.map((ath) => {
                  const isHigh = Number(ath.riskScore) >= 60;
                  const isMod = Number(ath.riskScore) >= 30 && Number(ath.riskScore) < 60;
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
                      <td style={{ padding: "12px 10px", fontWeight: "600", color: "#ffffff" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <div
                            style={{
                              width: "28px",
                              height: "28px",
                              borderRadius: "50%",
                              backgroundColor: isHigh ? "#f43f5e" : isMod ? "#f59e0b" : "#0284c7",
                              color: "#fff",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontSize: "0.75rem",
                              fontWeight: "bold",
                            }}
                          >
                            {ath.name ? ath.name.charAt(0).toUpperCase() : "A"}
                          </div>
                          <span>{ath.name || ath.email}</span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 10px", color: "var(--text-muted)" }}>
                        {ath.sport || "Unspecified"} •{" "}
                        <span style={{ color: "#cbd5e1" }}>{ath.position || "N/A"}</span>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <span className={isHigh ? "badge-high-risk" : isMod ? "badge-mod-risk" : "badge-low-risk"}>
                          {ath.riskStatus} {ath.riskScore > 0 ? `(${Math.round(ath.riskScore)}%)` : ""}
                        </span>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        {ath.trainingLoad > 0 ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div
                              style={{
                                width: "60px",
                                height: "6px",
                                backgroundColor: "rgba(255,255,255,0.1)",
                                borderRadius: "4px",
                                overflow: "hidden",
                              }}
                            >
                              <div
                                style={{
                                  width: `${ath.trainingLoad}%`,
                                  height: "100%",
                                  backgroundColor: ath.trainingLoad > 80 ? "#f43f5e" : "#06b6d4",
                                }}
                              />
                            </div>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>{ath.trainingLoad}%</span>
                          </div>
                        ) : (
                          <span style={{ color: "var(--text-dim)", fontSize: "0.8rem" }}>Not set</span>
                        )}
                      </td>
                      <td style={{ padding: "12px 10px", color: "#34d399", fontWeight: "600", fontSize: "0.82rem" }}>
                        {ath.strength > 0 ? `${ath.strength}% / ${ath.flexibility}%` : "Not set"}
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
                          Inspect <ChevronRight size={14} />
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

      {/* Selected Athlete Inspector Modal */}
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
          <div className="glass-panel" style={{ width: "100%", maxWidth: "550px", padding: "2rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h3 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#ffffff", margin: 0 }}>
                  {selectedAthlete.name || selectedAthlete.email}
                </h3>
                <span className={Number(selectedAthlete.riskScore) >= 60 ? "badge-high-risk" : "badge-low-risk"}>
                  {selectedAthlete.riskStatus}
                </span>
              </div>
              <button
                onClick={() => setSelectedAthlete(null)}
                style={{ background: "transparent", border: "none", color: "#94a3b8", fontSize: "1.5rem", cursor: "pointer" }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "1.5rem", fontSize: "0.88rem" }}>
              <div style={{ padding: "10px", backgroundColor: "rgba(10,15,29,0.8)", borderRadius: "8px" }}>
                <span style={{ color: "var(--text-dim)", fontSize: "0.75rem", display: "block" }}>Sport & Position</span>
                <strong>{selectedAthlete.sport || "N/A"} ({selectedAthlete.position || "N/A"})</strong>
              </div>
              <div style={{ padding: "10px", backgroundColor: "rgba(10,15,29,0.8)", borderRadius: "8px" }}>
                <span style={{ color: "var(--text-dim)", fontSize: "0.75rem", display: "block" }}>Training Load</span>
                <strong style={{ color: "#38bdf8" }}>{selectedAthlete.trainingLoad || 0} / 100</strong>
              </div>
              <div style={{ padding: "10px", backgroundColor: "rgba(10,15,29,0.8)", borderRadius: "8px" }}>
                <span style={{ color: "var(--text-dim)", fontSize: "0.75rem", display: "block" }}>Strength / Flex</span>
                <strong style={{ color: "#34d399" }}>{selectedAthlete.strength || 0}% / {selectedAthlete.flexibility || 0}%</strong>
              </div>
              <div style={{ padding: "10px", backgroundColor: "rgba(10,15,29,0.8)", borderRadius: "8px" }}>
                <span style={{ color: "var(--text-dim)", fontSize: "0.75rem", display: "block" }}>Last Assessment</span>
                <strong>{selectedAthlete.lastAssessment}</strong>
              </div>
            </div>

            {selectedAthlete.coachNotes && (
              <div style={{ padding: "12px", backgroundColor: "rgba(15, 23, 42, 0.8)", borderRadius: "8px", border: "1px solid rgba(255, 255, 255, 0.08)", marginBottom: "1.5rem" }}>
                <strong style={{ color: "#f59e0b", fontSize: "0.85rem" }}>Coach Observations:</strong>
                <p style={{ margin: "4px 0 0 0", color: "#cbd5e1", fontSize: "0.85rem" }}>
                  {selectedAthlete.coachNotes}
                </p>
              </div>
            )}

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
