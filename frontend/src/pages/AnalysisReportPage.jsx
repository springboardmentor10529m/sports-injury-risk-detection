import React, { useState, useEffect, useContext } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  getVideoHistory,
  getAssessmentDetails,
  deleteVideoAnalysis,
} from "../services/athleteService";
import RiskGauge from "../components/RiskGauge";
import BrandLogo from "../components/BrandLogo";
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
  Film,
  Layers,
  ChevronRight,
  Search,
  Calendar,
  BarChart3,
  Clock,
  Eye,
  Check,
  Trash2,
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
  const [searchParams, setSearchParams] = useSearchParams();
  const reportId = searchParams.get("id");
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState("report"); // "report" or "archive"
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const currentRole = (user?.role || "athlete").toLowerCase();

  useEffect(() => {
    fetchReportData();
  }, [reportId, user]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const history = await getVideoHistory();
      const validHistory = Array.isArray(history) ? history : [];
      setHistoryList(validHistory);

      if (validHistory.length === 0) {
        setAssessment(null);
        return;
      }

      const targetId = reportId || validHistory[0].id;
      try {
        const detailed = await getAssessmentDetails(targetId);
        setAssessment(detailed);
      } catch {
        const fallbackTarget = validHistory.find((h) => h.id === targetId) || validHistory[0];
        setAssessment(fallbackTarget);
      }
    } catch (err) {
      console.warn("No assessments available:", err);
      setAssessment(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectReport = (newId) => {
    setSearchParams({ id: newId });
    setViewMode("report");
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteVideoAnalysis(deleteTarget.id);
      const updatedList = historyList.filter((item) => item.id !== deleteTarget.id);
      setHistoryList(updatedList);

      // If the currently viewed assessment is deleted, switch to the next report or reset
      if (assessment && (assessment.id === deleteTarget.id || assessment.id === deleteTarget._id)) {
        if (updatedList.length > 0) {
          const nextReport = updatedList[0];
          setSearchParams({ id: nextReport.id });
          try {
            const detailed = await getAssessmentDetails(nextReport.id);
            setAssessment(detailed);
          } catch {
            setAssessment(nextReport);
          }
        } else {
          setAssessment(null);
          setSearchParams({});
        }
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete report:", err);
      setDeleteError("Failed to delete report from the server. Please try again.");
    } finally {
      setIsDeleting(false);
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
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Loading Biomechanical Reports...</p>
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
            No Assessment Reports Found
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", maxWidth: "500px", margin: "0 auto 1.5rem" }}>
            {currentRole === "athlete"
              ? "You have not completed any video movement assessments yet. Upload movement videos to generate an AI biomechanics report."
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

  const filteredHistory = historyList.filter((item) => {
    return (
      (item.filename || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.created_at || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.risk_status || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div style={{ maxWidth: "1250px", margin: "0 auto", padding: "2rem 1.5rem" }}>
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
          to={currentRole === "coach" ? "/coach-dashboard" : "/athlete-profile"}
          className="btn-subtle"
          style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </Link>

        {/* View Switcher Pills */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            padding: "4px",
            borderRadius: "10px",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            gap: "4px",
          }}
        >
          <button
            type="button"
            onClick={() => setViewMode("report")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: "700",
              cursor: "pointer",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: viewMode === "report" ? "#38bdf8" : "transparent",
              color: viewMode === "report" ? "#070b14" : "var(--text-muted)",
              transition: "all 0.2s ease",
            }}
          >
            <BarChart3 size={15} /> Diagnostic Deep Dive
          </button>
          <button
            type="button"
            onClick={() => setViewMode("archive")}
            style={{
              padding: "6px 14px",
              borderRadius: "8px",
              fontSize: "0.82rem",
              fontWeight: "700",
              cursor: "pointer",
              border: "none",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: viewMode === "archive" ? "#38bdf8" : "transparent",
              color: viewMode === "archive" ? "#070b14" : "var(--text-muted)",
              transition: "all 0.2s ease",
            }}
          >
            <Layers size={15} /> All Screenings Archive ({historyList.length})
          </button>
        </div>

        {/* Action Buttons (Only relevant in Diagnostic Report view) */}
        {viewMode === "report" && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            {assessment && (
              <button
                type="button"
                onClick={() => setDeleteTarget(assessment)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  fontWeight: "600",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
                  e.currentTarget.style.borderColor = "#ef4444";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.1)";
                  e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
                }}
              >
                <Trash2 size={15} /> Delete Report
              </button>
            )}
            <button
              onClick={handlePrint}
              className="btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "8px 16px" }}
            >
              <Printer size={16} /> Print / Save PDF
            </button>
          </div>
        )}
      </div>

      {/* VIEW 1: Main Printable Diagnostic Deep Dive Report */}
      {viewMode === "report" && (
        <>
          {/* Clean Session Switcher Strip (Only shown when multiple historical sessions exist) */}
          {historyList.length > 1 && (
            <div
              className="glass-panel no-print"
              style={{
                padding: "1rem 1.25rem",
                marginBottom: "1.5rem",
                border: "1px solid rgba(56, 189, 248, 0.2)",
                backgroundColor: "rgba(10, 15, 29, 0.7)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "0.75rem",
                }}
              >
                <Film size={16} color="#38bdf8" />
                <h3 style={{ fontSize: "0.88rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
                  Recorded Screening Sessions ({historyList.length})
                </h3>
                <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                  • Click to switch active report
                </span>
              </div>

              {/* Spacious Non-Congested Cards */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                  gap: "12px",
                }}
              >
                {historyList.map((h, idx) => {
                  const isSelected = (assessment.id || "") === (h.id || "");
                  const scoreNum = Number(h.risk_score) || 0;
                  const cardIsHigh = scoreNum >= 50;
                  const cardIsMod = scoreNum >= 25 && scoreNum < 50;
                  const reportNum = historyList.length - historyList.findIndex((item) => item.id === h.id);

                  return (
                    <div
                      key={h.id}
                      onClick={() => handleSelectReport(h.id)}
                      style={{
                        padding: "12px 14px",
                        borderRadius: "10px",
                        cursor: "pointer",
                        backgroundColor: isSelected
                          ? "rgba(56, 189, 248, 0.14)"
                          : "rgba(15, 23, 42, 0.6)",
                        border: isSelected
                          ? "1.5px solid #38bdf8"
                          : "1px solid rgba(255, 255, 255, 0.08)",
                        boxShadow: isSelected
                          ? "0 0 15px rgba(56, 189, 248, 0.25)"
                          : "none",
                        transition: "all 0.2s ease",
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                      onMouseOver={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = "rgba(30, 41, 59, 0.8)";
                      }}
                      onMouseOut={(e) => {
                        if (!isSelected) e.currentTarget.style.backgroundColor = "rgba(15, 23, 42, 0.6)";
                      }}
                    >
                      {/* Top Row: Report Number & Date */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            style={{
                              fontSize: "0.72rem",
                              fontWeight: "800",
                              color: isSelected ? "#38bdf8" : "#94a3b8",
                              backgroundColor: isSelected ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.06)",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              whiteSpace: "nowrap",
                            }}
                          >
                            Report #{reportNum}
                          </span>
                          {idx === 0 && (
                            <span
                              style={{
                                fontSize: "0.68rem",
                                fontWeight: "700",
                                color: "#10b981",
                                backgroundColor: "rgba(16, 185, 129, 0.15)",
                                padding: "1px 5px",
                                borderRadius: "4px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              LATEST
                            </span>
                          )}
                        </div>

                        <span style={{ fontSize: "0.72rem", color: "var(--text-dim)", whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "4px" }}>
                          <Clock size={11} /> {h.created_at || "Recent"}
                        </span>
                      </div>

                      {/* Middle: Filename */}
                      <div
                        style={{
                          fontSize: "0.82rem",
                          fontWeight: "600",
                          color: "#ffffff",
                          whiteSpace: "nowrap",
                          textOverflow: "ellipsis",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                        title={h.filename}
                      >
                        <Film size={14} color={isSelected ? "#38bdf8" : "var(--text-dim)"} style={{ flexShrink: 0 }} />
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{h.filename}</span>
                      </div>

                      {/* Bottom: Risk Level Badge */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "2px" }}>
                        <span
                          style={{
                            fontSize: "0.72rem",
                            fontWeight: "700",
                            padding: "2px 8px",
                            borderRadius: "4px",
                            backgroundColor: cardIsHigh
                              ? "rgba(239, 68, 68, 0.2)"
                              : cardIsMod
                              ? "rgba(245, 158, 11, 0.2)"
                              : "rgba(16, 185, 129, 0.2)",
                            color: cardIsHigh
                              ? "#f87171"
                              : cardIsMod
                              ? "#fbbf24"
                              : "#34d399",
                          }}
                        >
                          {scoreNum}% • {h.risk_status || "Screened"}
                        </span>

                        {isSelected ? (
                          <span style={{ fontSize: "0.72rem", color: "#38bdf8", fontWeight: "700", display: "flex", alignItems: "center", gap: "3px" }}>
                            <Check size={12} /> Viewing
                          </span>
                        ) : (
                          <span style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                            Click to load →
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div
            className="glass-panel printable-area"
            style={{
              padding: "2.5rem 2rem",
              backgroundColor: "#070b14",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
          {/* Report Header */}
          <div
            className="report-section report-header"
            style={{
              borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
              paddingBottom: "1.5rem",
              marginBottom: "2rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              flexWrap: "wrap",
              gap: "1.5rem",
            }}
          >
            <div>
              <div style={{ marginBottom: "0.5rem" }}>
                <BrandLogo size={36} badgeText="MOTION DIAGNOSTIC" subtitle={null} />
              </div>
              <h1 className="report-main-title" style={{ fontSize: "1.8rem", fontWeight: "800", color: "#ffffff", margin: "0.5rem 0 0 0" }}>
                Biomechanical Motion Assessment Report
              </h1>
              <p className="report-meta-text" style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "4px" }}>
                Screening ID: {assessment.id || "N/A"} • Video: <span style={{ color: "#38bdf8" }}>{assessment.filename}</span>
              </p>
            </div>

            <div
              className="report-athlete-profile-card"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "1rem 1.25rem",
                borderRadius: "12px",
                minWidth: "220px",
              }}
            >
              <div className="athlete-profile-label" style={{ fontSize: "0.75rem", color: "var(--text-dim)", textTransform: "uppercase", fontWeight: "700" }}>
                Athlete Profile
              </div>
              <div className="athlete-profile-name" style={{ fontSize: "1.1rem", fontWeight: "800", color: "#ffffff", marginTop: "2px" }}>
                {assessment.athlete_name || user?.name || "Aadrika Singh"}
              </div>
              <div className="athlete-profile-sport" style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {assessment.sport || "Basketball"} • {assessment.position || "Point Guard"}
              </div>
              <div className="athlete-profile-date" style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "4px" }}>
                Screened: {assessment.created_at || "Recent Session"}
              </div>
            </div>
          </div>

          {/* Primary Telemetry Grid: Balanced Left Gauge & Right 4-Vector Breakdown */}
          <div
            className="report-section report-telemetry-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: "1.5rem",
              marginBottom: "2rem",
              alignItems: "stretch",
            }}
          >
            {/* Left: Overall Risk Gauge */}
            <div
              className="report-gauge-card"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "1.75rem",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
              }}
            >
              <div style={{ width: "100%" }}>
                <div className="report-gauge-title" style={{ fontSize: "0.78rem", fontWeight: "800", color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.75rem" }}>
                  Composite Injury Vulnerability Score
                </div>
                <RiskGauge score={riskScore} status={assessment.risk_status} />
              </div>

              <div
                className="report-weighted-card"
                style={{
                  marginTop: "1.25rem",
                  padding: "10px 14px",
                  backgroundColor: "rgba(0, 0, 0, 0.3)",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  width: "100%",
                }}
              >
                <div className="report-weighted-text" style={{ fontSize: "0.74rem", color: "var(--text-dim)", lineHeight: 1.4 }}>
                  Weighted Index: <span style={{ color: "#94a3b8" }}>35% Kinematics • 20% History • 20% Asymmetry • 15% Load • 10% Fatigue</span>
                </div>
              </div>
            </div>

            {/* Right: 4-Metric Kinematic Matrix Unified Card */}
            <div
              className="report-matrix-card"
              style={{
                backgroundColor: "rgba(15, 23, 42, 0.75)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "16px",
                padding: "1.5rem",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <Activity size={16} color="#38bdf8" />
                  <span className="report-matrix-title" style={{ fontSize: "0.85rem", fontWeight: "800", color: "#ffffff", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Core Kinematic Features
                  </span>
                </div>
                <span className="report-benchmark-badge" style={{ fontSize: "0.72rem", color: "var(--text-dim)", backgroundColor: "rgba(255,255,255,0.05)", padding: "2px 8px", borderRadius: "4px" }}>
                  Target Benchmarks
                </span>
              </div>

              {/* 2x2 Grid of Polished Feature Cards */}
              <div className="feature-cards-grid" style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px" }}>
                {/* 1. Peak Knee Valgus */}
                <div
                  className="feature-card"
                  style={{
                    backgroundColor: "rgba(10, 15, 29, 0.75)",
                    border: valgusVal > 15 ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(56, 189, 248, 0.25)",
                    borderRadius: "12px",
                    padding: "1rem 1.15rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="feature-card-title" style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "700" }}>
                      Peak Knee Valgus (θ)
                    </span>
                    <span className="feature-benchmark-tag" style={{ fontSize: "0.68rem", fontWeight: "700", color: "#94a3b8", backgroundColor: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: "4px" }}>
                      Ideal &lt;12°
                    </span>
                  </div>
                  <div className="feature-card-val" style={{ fontSize: "1.65rem", fontWeight: "800", color: valgusVal > 15 ? "#f87171" : "#38bdf8", lineHeight: 1.1 }}>
                    {assessment.peak_knee_valgus || `${valgusVal}°`}
                  </div>
                  <div>
                    <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", marginBottom: "4px" }}>
                      <div style={{ width: `${Math.min(Math.round((valgusVal / 30) * 100), 100)}%`, height: "100%", backgroundColor: valgusVal > 15 ? "#ef4444" : "#38bdf8" }} />
                    </div>
                    <span className="feature-card-flag" style={{ fontSize: "0.72rem", fontWeight: "600", color: valgusVal > 15 ? "#f87171" : "#34d399" }}>
                      {valgusVal > 15 ? "⚠ Medial Collapse Flag" : "✓ Optimal Frontal Axis"}
                    </span>
                  </div>
                </div>

                {/* 2. Landing Flexion */}
                <div
                  className="feature-card"
                  style={{
                    backgroundColor: "rgba(10, 15, 29, 0.75)",
                    border: flexionVal < 35 ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(16, 185, 129, 0.25)",
                    borderRadius: "12px",
                    padding: "1rem 1.15rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="feature-card-title" style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "700" }}>
                      Landing Flexion
                    </span>
                    <span className="feature-benchmark-tag" style={{ fontSize: "0.68rem", fontWeight: "700", color: "#94a3b8", backgroundColor: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: "4px" }}>
                      Target &gt;45°
                    </span>
                  </div>
                  <div className="feature-card-val" style={{ fontSize: "1.65rem", fontWeight: "800", color: flexionVal < 35 ? "#f87171" : "#10b981", lineHeight: 1.1 }}>
                    {assessment.landing_flexion || `${flexionVal}°`}
                  </div>
                  <div>
                    <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", marginBottom: "4px" }}>
                      <div style={{ width: `${Math.min(Math.round((flexionVal / 60) * 100), 100)}%`, height: "100%", backgroundColor: flexionVal < 35 ? "#ef4444" : "#10b981" }} />
                    </div>
                    <span className="feature-card-flag" style={{ fontSize: "0.72rem", fontWeight: "600", color: flexionVal < 35 ? "#f87171" : "#34d399" }}>
                      {flexionVal < 35 ? "⚠ Stiff Contact Shock" : "✓ Soft Dynamic Shock"}
                    </span>
                  </div>
                </div>

                {/* 3. Trunk Lateral Tilt */}
                <div
                  className="feature-card"
                  style={{
                    backgroundColor: "rgba(10, 15, 29, 0.75)",
                    border: trunkVal > 5 ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "1rem 1.15rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="feature-card-title" style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "700" }}>
                      Trunk Lateral Tilt
                    </span>
                    <span className="feature-benchmark-tag" style={{ fontSize: "0.68rem", fontWeight: "700", color: "#94a3b8", backgroundColor: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: "4px" }}>
                      Safe &lt;5°
                    </span>
                  </div>
                  <div className="feature-card-val" style={{ fontSize: "1.65rem", fontWeight: "800", color: trunkVal > 5 ? "#fbbf24" : "#38bdf8", lineHeight: 1.1 }}>
                    {assessment.trunk_tilt || `${trunkVal}°`}
                  </div>
                  <div>
                    <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", marginBottom: "4px" }}>
                      <div style={{ width: `${Math.min(Math.round((trunkVal / 15) * 100), 100)}%`, height: "100%", backgroundColor: trunkVal > 5 ? "#f59e0b" : "#38bdf8" }} />
                    </div>
                    <span className="feature-card-flag" style={{ fontSize: "0.72rem", fontWeight: "600", color: trunkVal > 5 ? "#fbbf24" : "#34d399" }}>
                      {trunkVal > 5 ? "⚠ Spinal Shear Deviation" : "✓ Stable Torso Alignment"}
                    </span>
                  </div>
                </div>

                {/* 4. Bilateral Asymmetry */}
                <div
                  className="feature-card"
                  style={{
                    backgroundColor: "rgba(10, 15, 29, 0.75)",
                    border: parseFloat(asymmetryVal) > 10 ? "1px solid rgba(168, 85, 247, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "1rem 1.15rem",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: "6px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="feature-card-title" style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "700" }}>
                      Bilateral Asymmetry
                    </span>
                    <span className="feature-benchmark-tag" style={{ fontSize: "0.68rem", fontWeight: "700", color: "#94a3b8", backgroundColor: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: "4px" }}>
                      Safe &lt;8%
                    </span>
                  </div>
                  <div className="feature-card-val" style={{ fontSize: "1.65rem", fontWeight: "800", color: "#a855f7", lineHeight: 1.1 }}>
                    {asymmetryVal}
                  </div>
                  <div>
                    <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", marginBottom: "4px" }}>
                      <div style={{ width: `${Math.min(Math.round((parseFloat(asymmetryVal) / 25) * 100), 100)}%`, height: "100%", backgroundColor: parseFloat(asymmetryVal) > 10 ? "#a855f7" : "#38bdf8" }} />
                    </div>
                    <span className="feature-card-flag" style={{ fontSize: "0.72rem", fontWeight: "600", color: parseFloat(asymmetryVal) > 10 ? "#c084fc" : "#34d399" }}>
                      {parseFloat(asymmetryVal) > 10 ? "⚠ Unilateral Bias" : "✓ Balanced Limb Symmetry"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Time-Series Kinematic Angle Curves Chart */}
          <div
            className="report-section report-chart-container"
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.75)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: "16px",
              padding: "1.5rem",
              marginBottom: "2rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 className="chart-title" style={{ fontSize: "1rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
                  Time-Series Kinematic Movement Curves
                </h3>
                <p className="chart-subtitle" style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
                  Joint angle progression across Ground Contact, Peak Deceleration, and Stabilization phases.
                </p>
              </div>
            </div>

            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kinematicData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                  <XAxis dataKey="frame" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} unit="°" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(10, 15, 29, 0.95)",
                      border: "1px solid rgba(56, 189, 248, 0.3)",
                      borderRadius: "8px",
                      color: "#ffffff",
                      fontSize: "0.8rem",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "0.8rem", color: "#e2e8f0" }} />
                  <Line type="monotone" dataKey="kneeValgus" name="Knee Valgus (θ)" stroke="#38bdf8" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="kneeFlexion" name="Knee Flexion" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="trunkTilt" name="Trunk Lateral Tilt" stroke="#fbbf24" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Multi-Vector Injury Categories Matrix */}
          <div className="report-section report-injury-section" style={{ marginBottom: "2rem" }}>
            <h3 className="section-title" style={{ fontSize: "1.1rem", fontWeight: "800", color: "#ffffff", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={20} color="#38bdf8" /> Multi-Vector Injury Vulnerability Breakdown
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem" }}>
              {injuryCategories.map((item, idx) => (
                <div
                  key={idx}
                  className="report-injury-card"
                  style={{
                    backgroundColor: "rgba(15, 23, 42, 0.75)",
                    border: "1px solid rgba(255, 255, 255, 0.08)",
                    borderRadius: "12px",
                    padding: "1.2rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                    <span className="injury-card-title" style={{ fontSize: "0.85rem", fontWeight: "700", color: "#ffffff" }}>{item.category}</span>
                    <span
                      style={{
                        fontSize: "0.72rem",
                        fontWeight: "700",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        backgroundColor:
                          item.risk_level === "High"
                            ? "rgba(239, 68, 68, 0.2)"
                            : item.risk_level === "Moderate"
                            ? "rgba(245, 158, 11, 0.2)"
                            : "rgba(16, 185, 129, 0.2)",
                        color:
                          item.risk_level === "High"
                            ? "#f87171"
                            : item.risk_level === "Moderate"
                            ? "#fbbf24"
                            : "#34d399",
                      }}
                    >
                      {item.risk_level} Risk
                    </span>
                  </div>
                  <div className="injury-card-trigger" style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                    Primary Trigger: <span style={{ color: "#cbd5e1" }}>{item.factor}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Corrective Prescriptions */}
          <div className="report-section report-rehab-section">
            <h3 className="section-title" style={{ fontSize: "1.1rem", fontWeight: "800", color: "#ffffff", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "8px" }}>
              <Dumbbell size={20} color="#10b981" /> Tailored Corrective Rehabilitation Protocols
            </h3>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {recommendations.map((rec, idx) => (
                <div
                  key={idx}
                  className="report-rehab-card"
                  style={{
                    backgroundColor: "rgba(16, 185, 129, 0.08)",
                    border: "1px solid rgba(16, 185, 129, 0.25)",
                    borderRadius: "10px",
                    padding: "1rem 1.25rem",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "12px",
                  }}
                >
                  <CheckCircle2 size={18} color="#34d399" style={{ marginTop: "2px", flexShrink: 0 }} />
                  <div>
                    <div className="rehab-card-title" style={{ fontSize: "0.9rem", fontWeight: "700", color: "#ffffff" }}>
                      {rec.title}
                    </div>
                    <div className="rehab-card-exercise" style={{ fontSize: "0.82rem", color: "#34d399", fontWeight: "600", marginTop: "2px" }}>
                      {rec.exercise}
                    </div>
                    <div className="rehab-card-focus" style={{ fontSize: "0.78rem", color: "#cbd5e1", marginTop: "4px" }}>
                      {rec.focus}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </>
    )}

      {/* VIEW 2: All Screenings Comparison & History Table */}
      {viewMode === "archive" && (
        <div
          className="glass-panel"
          style={{
            padding: "2rem",
            backgroundColor: "#070b14",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h2 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#ffffff", margin: 0 }}>
                All Historical Screening Reports
              </h2>
              <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: "4px" }}>
                Complete archive of video motion screenings with comparative risk scores and timestamps.
              </p>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {/* Search Filter */}
              <div style={{ position: "relative" }}>
                <Search
                  size={14}
                  style={{
                    position: "absolute",
                    left: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-dim)",
                  }}
                />
                <input
                  type="text"
                  placeholder="Filter archive..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: "6px 12px 6px 2.1rem",
                    borderRadius: "8px",
                    backgroundColor: "rgba(15, 23, 42, 0.9)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    color: "#fff",
                    fontSize: "0.82rem",
                    outline: "none",
                    width: "200px",
                  }}
                />
              </div>

              <span
                style={{
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  color: "#38bdf8",
                  backgroundColor: "rgba(56, 189, 248, 0.12)",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(56, 189, 248, 0.25)",
                  whiteSpace: "nowrap",
                }}
              >
                {historyList.length} Reports Recorded
              </span>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.88rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.1)", color: "var(--text-muted)" }}>
                  <th style={{ padding: "12px 10px" }}>#</th>
                  <th style={{ padding: "12px 10px" }}>Video Source</th>
                  <th style={{ padding: "12px 10px" }}>Date & Time</th>
                  <th style={{ padding: "12px 10px" }}>Vulnerability Score</th>
                  <th style={{ padding: "12px 10px" }}>Risk Classification</th>
                  <th style={{ padding: "12px 10px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredHistory.map((item, idx) => {
                  const score = Number(item.risk_score) || 0;
                  const itemIsHigh = score >= 50;
                  const itemIsMod = score >= 25 && score < 50;
                  const reportNum = historyList.length - historyList.findIndex((h) => h.id === item.id);
                  const isCurrent = (assessment.id || "") === (item.id || "");

                  return (
                    <tr
                      key={item.id}
                      style={{
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                        backgroundColor: isCurrent ? "rgba(56, 189, 248, 0.08)" : "transparent",
                        cursor: "pointer",
                        transition: "background 0.2s ease",
                      }}
                      onMouseOver={(e) => {
                        if (!isCurrent) e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.03)";
                      }}
                      onMouseOut={(e) => {
                        if (!isCurrent) e.currentTarget.style.backgroundColor = "transparent";
                      }}
                      onClick={() => handleSelectReport(item.id)}
                    >
                      <td style={{ padding: "12px 10px", fontWeight: "700", color: isCurrent ? "#38bdf8" : "#94a3b8" }}>
                        #{reportNum}
                      </td>
                      <td style={{ padding: "12px 10px", color: "#ffffff", fontWeight: "600" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Film size={15} color={isCurrent ? "#38bdf8" : "var(--text-dim)"} />
                          <span style={{ maxWidth: "260px", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                            {item.filename}
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: "12px 10px", color: "var(--text-dim)", fontSize: "0.82rem" }}>
                        {item.created_at || "Recent Session"}
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <span style={{ fontSize: "0.95rem", fontWeight: "800", color: itemIsHigh ? "#f87171" : itemIsMod ? "#fbbf24" : "#34d399" }}>
                          {score}%
                        </span>
                      </td>
                      <td style={{ padding: "12px 10px" }}>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: "700",
                            padding: "3px 8px",
                            borderRadius: "4px",
                            backgroundColor: itemIsHigh
                              ? "rgba(239, 68, 68, 0.2)"
                              : itemIsMod
                              ? "rgba(245, 158, 11, 0.2)"
                              : "rgba(16, 185, 129, 0.2)",
                            color: itemIsHigh
                              ? "#f87171"
                              : itemIsMod
                              ? "#fbbf24"
                              : "#34d399",
                          }}
                        >
                          {item.risk_status || "Screened"}
                        </span>
                      </td>
                      <td style={{ padding: "12px 10px", textAlign: "right" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "6px" }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectReport(item.id);
                            }}
                            className={isCurrent ? "btn-primary" : "btn-subtle"}
                            style={{ padding: "4px 12px", fontSize: "0.78rem" }}
                          >
                            <Eye size={13} /> {isCurrent ? "Viewing" : "Open Report"}
                          </button>
                          <button
                            type="button"
                            title="Delete report"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(item);
                            }}
                            style={{
                              padding: "4px 10px",
                              fontSize: "0.78rem",
                              borderRadius: "6px",
                              border: "1px solid rgba(239, 68, 68, 0.25)",
                              backgroundColor: "rgba(239, 68, 68, 0.08)",
                              color: "#f87171",
                              cursor: "pointer",
                              display: "flex",
                              alignItems: "center",
                              gap: "4px",
                              transition: "all 0.2s ease",
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
                              e.currentTarget.style.borderColor = "#ef4444";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.08)";
                              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.25)";
                            }}
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Custom Confirmation Modal for Deleting Report */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: "1rem",
          }}
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <div
            className="glass-panel"
            style={{
              maxWidth: "480px",
              width: "100%",
              padding: "2rem",
              backgroundColor: "#0d1322",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(239, 68, 68, 0.15)",
              borderRadius: "16px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Icon Header */}
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
                color: "#f87171",
              }}
            >
              <Trash2 size={24} />
            </div>

            {/* Title & Body */}
            <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", margin: "0 0 0.5rem 0" }}>
              Delete Biomechanical Screening Report?
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 1rem 0" }}>
              Are you sure you want to permanently delete this screening report? All associated kinematic angles, AI risk evaluations, and motion recordings will be purged.
            </p>

            {/* Target Report Details Chip */}
            <div
              style={{
                padding: "10px 14px",
                backgroundColor: "rgba(15, 23, 42, 0.8)",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                marginBottom: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "4px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#ffffff", fontWeight: "600" }}>
                <Film size={15} color="#38bdf8" />
                <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {deleteTarget.filename || "Screening Video"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "var(--text-dim)", marginTop: "2px" }}>
                <span>{deleteTarget.created_at || "Recent"}</span>
                <span style={{ color: "#f87171", fontWeight: "700" }}>
                  {deleteTarget.risk_score ? `${deleteTarget.risk_score}% Vulnerability` : ""}
                </span>
              </div>
            </div>

            {deleteError && (
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "6px",
                  backgroundColor: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#f87171",
                  fontSize: "0.82rem",
                  marginBottom: "1rem",
                }}
              >
                {deleteError}
              </div>
            )}

            {/* Modal Action Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#cbd5e1",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  backgroundColor: "#dc2626",
                  backgroundImage: "linear-gradient(135deg, #ef4444, #b91c1c)",
                  border: "none",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)",
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                <Trash2 size={15} /> {isDeleting ? "Deleting..." : "Delete Report"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

