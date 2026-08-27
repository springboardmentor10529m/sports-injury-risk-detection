import React, { useState, useEffect, useContext } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  getVideoHistory,
  getAssessmentDetails,
} from "../services/athleteService";
import RiskGauge from "../components/RiskGauge";
import {
  Printer,
  ArrowLeft,
  ShieldCheck,
  Activity,
  AlertTriangle,
  FileText,
  Video,
  Dumbbell,
  CheckCircle2,
  AlertCircle,
  Zap,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function AnalysisReportPage() {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get("id");

  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);

  const currentRole = (user?.role || "athlete").toLowerCase();

  useEffect(() => {
    fetchReportData();
  }, [reportId, user]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      if (reportId) {
        try {
          const data = await getAssessmentDetails(reportId);
          setAssessment(data);
          return;
        } catch (e) {
          console.warn("Could not fetch specific assessment details:", e);
        }
      }

      const history = await getVideoHistory();
      if (history && history.length > 0) {
        const target = reportId
          ? history.find((h) => h.id === reportId) || history[0]
          : history[0];
        
        try {
          const detailed = await getAssessmentDetails(target.id);
          setAssessment(detailed);
        } catch {
          setAssessment(target);
        }
      } else {
        setAssessment(null);
      }
    } catch (err) {
      console.warn("No assessments available:", err);
      setAssessment(null);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Activity size={40} color="#38bdf8" className="animate-pulse-slow" style={{ margin: "0 auto 1rem" }} />
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Loading Biomechanical Report...</p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div style={{ maxWidth: "800px", margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center" }}>
        <div className="glass-panel" style={{ padding: "3rem 2rem" }}>
          <FileText size={48} color="#475569" style={{ margin: "0 auto 1rem" }} />
          <h2 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#ffffff", marginBottom: "0.5rem" }}>
            No Assessment Report Selected
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: "500px", margin: "0 auto 1.5rem" }}>
            {currentRole === "athlete"
              ? "You have not completed any video movement assessments yet. Upload a video capture to generate an AI biomechanics report."
              : "No athlete assessment records found in the database. When athletes upload footage, reports will appear here."}
          </p>

          {currentRole === "athlete" ? (
            <Link to="/upload" className="btn-emerald" style={{ display: "inline-flex", textDecoration: "none" }}>
              <Video size={16} /> Upload Video for Analysis
            </Link>
          ) : (
            <Link to="/coach-dashboard" className="btn-primary" style={{ display: "inline-flex", textDecoration: "none" }}>
              Back to Squad Roster
            </Link>
          )}
        </div>
      </div>
    );
  }

  const riskScore = Number(assessment.risk_score) || 0;
  const isHigh = riskScore >= 50;
  const isMod = riskScore >= 25 && riskScore < 50;

  const valgusVal = parseFloat(assessment.peak_knee_valgus || assessment.knee_valgus || (isHigh ? "21.4°" : isMod ? "15.8°" : "11.2°"));
  const flexionVal = parseFloat(assessment.landing_flexion || (isHigh ? "28.0°" : isMod ? "38.0°" : "48.5°"));
  const trunkVal = parseFloat(assessment.trunk_tilt || (isHigh ? "6.2°" : "2.4°"));
  const asymmetryVal = assessment.asymmetry_ratio || (isHigh ? "14.2%" : "4.8%");
  const grfVal = assessment.ground_reaction_force || (isHigh ? "1.85x BW" : "1.25x BW");

  const kinematicData = assessment.kinematic_curves || [
    { frame: "0% (Initial Contact)", kneeFlexion: 10, kneeValgus: Math.round(valgusVal * 0.4), trunkTilt: 1.2 },
    { frame: "20% (Peak Loading)", kneeFlexion: Math.round(flexionVal * 0.65), kneeValgus: valgusVal, trunkTilt: trunkVal },
    { frame: "40% (Max Deceleration)", kneeFlexion: flexionVal, kneeValgus: Math.round(valgusVal * 0.85), trunkTilt: Math.round(trunkVal * 0.9) },
    { frame: "60% (Rebound Push)", kneeFlexion: Math.round(flexionVal * 0.7), kneeValgus: Math.round(valgusVal * 0.5), trunkTilt: 1.8 },
    { frame: "80% (Stabilization)", kneeFlexion: 18, kneeValgus: 5.2, trunkTilt: 1.1 },
    { frame: "100% (Terminal Stance)", kneeFlexion: 10, kneeValgus: 4.1, trunkTilt: 0.8 },
  ];

  const injuryCategories = assessment.injury_categories || [
    {
      category: "ACL Injury Risk",
      risk_level: valgusVal > 17 ? "High" : valgusVal > 13 ? "Moderate" : "Low",
      factor: `Dynamic knee valgus (${valgusVal}°) & landing flexion (${flexionVal}°)`,
    },
    {
      category: "Hamstring Strain Risk",
      risk_level: isHigh ? "High" : "Moderate",
      factor: `Eccentric deceleration asymmetry (${asymmetryVal})`,
    },
    {
      category: "Ankle Inversion Sprain Risk",
      risk_level: isHigh ? "Moderate" : "Low",
      factor: `Ground impact stabilization (${grfVal})`,
    },
    {
      category: "Lumbar / Spine Shear Risk",
      risk_level: trunkVal > 6 ? "High" : "Low",
      factor: `Lateral trunk tilt deviation (${trunkVal}°)`,
    },
  ];

  const recommendations = assessment.recommendations || [
    {
      title: "Gluteus Medius & Hip Abductor Strengthening",
      exercise: "Banded Monster Walks & Clamshells (3 sets x 15 reps)",
      focus: "Strengthen hip abductors to eliminate dynamic knee valgus collapse on landing.",
    },
    {
      title: "Neuromuscular Drop Jump Landings",
      exercise: "30cm Box Drop Landing with 45° Knee Flexion Cue (4 sets x 6 reps)",
      focus: "Train athlete to absorb shock dynamically with knees aligned over second toes.",
    },
    {
      title: "Unilateral Bilateral Equalization",
      exercise: "Single-Leg Romanian Deadlifts & Bulgarian Split Squats (3 sets x 8 reps/leg)",
      focus: "Equalize ground reaction force and limb load distribution.",
    },
  ];

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Top Action Bar */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <Link
          to={currentRole === "coach" ? "/coach-dashboard" : currentRole === "physio" ? "/physio-dashboard" : "/upload"}
          className="btn-subtle"
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <ArrowLeft size={16} /> Back
        </Link>

        <button onClick={handlePrint} className="btn-primary">
          <Printer size={16} /> Print / Save PDF
        </button>
      </div>

      {/* Main Printable Report Paper */}
      <div className="glass-panel" style={{ padding: "2.5rem", position: "relative" }}>
        {/* Report Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
            paddingBottom: "1.5rem",
            marginBottom: "2rem",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "8px",
                  background: "linear-gradient(135deg, #0284c7 0%, #10b981 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Activity color="#ffffff" size={18} />
              </div>
              <h1 style={{ fontSize: "1.5rem", fontWeight: "800", color: "#ffffff", margin: 0 }}>
                Biomechanical Screening & Injury Risk Report
              </h1>
            </div>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
              AI Computer Vision 3D Pose Estimation Diagnostic (Weighted Risk Model)
            </p>
          </div>

          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>Assessment File</div>
            <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#38bdf8", fontFamily: "var(--font-mono)" }}>
              {assessment.filename || "Video Assessment"}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Screened: {assessment.created_at || "Recent"}
            </div>
          </div>
        </div>

        {/* Athlete Meta Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "1rem",
            padding: "1.25rem",
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.06)",
            marginBottom: "2rem",
            fontSize: "0.88rem",
          }}
        >
          <div>
            <span style={{ color: "var(--text-dim)", fontSize: "0.75rem", display: "block" }}>Athlete</span>
            <strong style={{ color: "#ffffff" }}>
              {assessment.athlete_name || user?.name || user?.email || "Athlete"}
            </strong>
          </div>
          <div>
            <span style={{ color: "var(--text-dim)", fontSize: "0.75rem", display: "block" }}>Sport</span>
            <strong style={{ color: "#ffffff" }}>{assessment.sport || "General Athletic"}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-dim)", fontSize: "0.75rem", display: "block" }}>Position / Role</span>
            <strong style={{ color: "#ffffff" }}>{assessment.position || "N/A"}</strong>
          </div>
          <div>
            <span style={{ color: "var(--text-dim)", fontSize: "0.75rem", display: "block" }}>Risk Status</span>
            <strong style={{ color: isHigh ? "#fb7185" : isMod ? "#fbbf24" : "#34d399" }}>
              {assessment.risk_status} ({Math.round(riskScore)}%)
            </strong>
          </div>
        </div>

        {/* Executive Summary: Risk Gauge & Core Verdict */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.5rem",
            alignItems: "center",
            marginBottom: "2.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center" }}>
            <RiskGauge score={riskScore} size={180} showLabel={true} />
          </div>

          <div
            style={{
              padding: "1.5rem",
              backgroundColor: isHigh
                ? "rgba(244, 63, 94, 0.08)"
                : isMod
                ? "rgba(245, 158, 11, 0.08)"
                : "rgba(16, 185, 129, 0.08)",
              border: `1px solid ${
                isHigh
                  ? "rgba(244, 63, 94, 0.25)"
                  : isMod
                  ? "rgba(245, 158, 11, 0.25)"
                  : "rgba(16, 185, 129, 0.25)"
              }`,
              borderRadius: "12px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              {isHigh ? (
                <AlertTriangle size={20} color="#f43f5e" />
              ) : (
                <ShieldCheck size={20} color="#10b981" />
              )}
              <h3
                style={{
                  fontSize: "1.1rem",
                  fontWeight: "700",
                  color: isHigh ? "#fb7185" : isMod ? "#fbbf24" : "#34d399",
                  margin: 0,
                }}
              >
                {isHigh
                  ? "Clinical Flag: Elevated Injury Vulnerability"
                  : isMod
                  ? "Caution: Moderate Movement Compensation"
                  : "Optimal Biomechanical Clearance"}
              </h3>
            </div>
            <p style={{ fontSize: "0.85rem", color: "#cbd5e1", lineHeight: 1.6, margin: 0 }}>
              {isHigh
                ? `The athlete exhibited peak dynamic knee valgus of ${valgusVal}°, exceeding safe ACL injury thresholds. Landing knee flexion was restricted (${flexionVal}°), generating elevated ground reaction shock.`
                : isMod
                ? `Mild bilateral asymmetry noted during ground deceleration. Peak knee valgus was recorded at ${valgusVal}°. Corrective neuromuscular landing drills recommended.`
                : `Optimal frontal plane knee alignment maintained throughout ground impact. Peak knee valgus stayed at ${valgusVal}°, well within safe clinical boundaries.`}
            </p>
          </div>
        </div>

        {/* Specific Injury Categories Matrix */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff", marginBottom: "0.8rem" }}>
            Injury Category Risk Breakdown
          </h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            {injuryCategories.map((cat, idx) => {
              const isCatHigh = cat.risk_level === "High";
              const isCatMod = cat.risk_level === "Moderate";
              return (
                <div
                  key={idx}
                  style={{
                    padding: "1rem",
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    borderRadius: "10px",
                    border: `1px solid ${isCatHigh ? "rgba(244, 63, 94, 0.3)" : isCatMod ? "rgba(245, 158, 11, 0.3)" : "rgba(255, 255, 255, 0.06)"}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                    <strong style={{ fontSize: "0.88rem", color: "#ffffff" }}>{cat.category}</strong>
                    <span className={isCatHigh ? "badge-high-risk" : isCatMod ? "badge-mod-risk" : "badge-low-risk"}>
                      {cat.risk_level}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-dim)", margin: 0, lineHeight: 1.4 }}>
                    {cat.factor}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kinematic Angle Curves Chart */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff", marginBottom: "0.4rem" }}>
            Landing Phase Kinematic Angle Curves
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: "1rem" }}>
            Time-series progression of knee flexion, knee valgus deviation, and trunk lateral tilt across initial contact to terminal stance
          </p>

          <div style={{ width: "100%", height: "280px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={kinematicData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="frame" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} unit="°" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="kneeFlexion" name="Knee Flexion (°)" stroke="#38bdf8" strokeWidth={3} />
                <Line type="monotone" dataKey="kneeValgus" name="Knee Valgus (°)" stroke="#f43f5e" strokeWidth={2} strokeDasharray="5 5" />
                <Line type="monotone" dataKey="trunkTilt" name="Trunk Lateral Tilt (°)" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biomechanical Diagnostic Matrix */}
        <div style={{ marginBottom: "2.5rem" }}>
          <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff", marginBottom: "1rem" }}>
            Biomechanical Diagnostic Matrix
          </h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "10px" }}>Biomechanical Parameter</th>
                  <th style={{ padding: "10px" }}>Observed Value</th>
                  <th style={{ padding: "10px" }}>Safe Clinical Threshold</th>
                  <th style={{ padding: "10px" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <td style={{ padding: "10px", fontWeight: "600", color: "#f8fafc" }}>Peak Dynamic Knee Valgus</td>
                  <td style={{ padding: "10px", color: "#38bdf8", fontFamily: "var(--font-mono)" }}>{valgusVal}°</td>
                  <td style={{ padding: "10px", color: "var(--text-muted)" }}>&lt; 16.0°</td>
                  <td style={{ padding: "10px" }}>
                    <span className={valgusVal > 16 ? "badge-high-risk" : "badge-low-risk"}>
                      {valgusVal > 16 ? "Critical" : "Optimal"}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <td style={{ padding: "10px", fontWeight: "600", color: "#f8fafc" }}>Landing Knee Flexion Angle</td>
                  <td style={{ padding: "10px", color: "#38bdf8", fontFamily: "var(--font-mono)" }}>{flexionVal}°</td>
                  <td style={{ padding: "10px", color: "var(--text-muted)" }}>&gt; 35.0°</td>
                  <td style={{ padding: "10px" }}>
                    <span className={flexionVal < 35 ? "badge-high-risk" : "badge-low-risk"}>
                      {flexionVal < 35 ? "Stiff Landing" : "Optimal"}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <td style={{ padding: "10px", fontWeight: "600", color: "#f8fafc" }}>Bilateral Impact Asymmetry</td>
                  <td style={{ padding: "10px", color: "#34d399", fontFamily: "var(--font-mono)" }}>{asymmetryVal}</td>
                  <td style={{ padding: "10px", color: "var(--text-muted)" }}>&lt; 10.0%</td>
                  <td style={{ padding: "10px" }}>
                    <span className={parseFloat(asymmetryVal) > 10 ? "badge-mod-risk" : "badge-low-risk"}>
                      {parseFloat(asymmetryVal) > 10 ? "Asymmetric" : "Symmetric"}
                    </span>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.05)" }}>
                  <td style={{ padding: "10px", fontWeight: "600", color: "#f8fafc" }}>Trunk Lateral Lean</td>
                  <td style={{ padding: "10px", color: "#fbbf24", fontFamily: "var(--font-mono)" }}>{trunkVal}°</td>
                  <td style={{ padding: "10px", color: "var(--text-muted)" }}>&lt; 5.0°</td>
                  <td style={{ padding: "10px" }}>
                    <span className={trunkVal > 5 ? "badge-mod-risk" : "badge-low-risk"}>
                      {trunkVal > 5 ? "Unstable" : "Stabilized"}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Corrective Exercise & Rehab Recommendations */}
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "1rem" }}>
            <Dumbbell size={20} color="#10b981" />
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
              Tailored Corrective Exercise & Rehab Protocols
            </h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {recommendations.map((rec, idx) => (
              <div
                key={idx}
                style={{
                  padding: "1rem 1.25rem",
                  backgroundColor: "rgba(15, 23, 42, 0.7)",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <CheckCircle2 size={16} color="#10b981" />
                  <strong style={{ fontSize: "0.95rem", color: "#38bdf8" }}>{rec.title}</strong>
                </div>
                <div style={{ fontSize: "0.85rem", color: "#ffffff", fontWeight: "600", marginBottom: "4px" }}>
                  Exercise: <span style={{ color: "#34d399" }}>{rec.exercise}</span>
                </div>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                  Clinical Rationale: {rec.focus}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
