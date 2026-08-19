import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  getMyProfile,
  updateMyProfile,
} from "../services/athleteService";
import MetricCard from "../components/MetricCard";
import RiskGauge from "../components/RiskGauge";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import {
  Edit3,
  Video,
  Flame,
  Shield,
  Activity,
  Award,
  Scale,
  CheckCircle2,
  FileText,
  AlertCircle,
  Sparkles,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Zap,
} from "lucide-react";

export default function AthleteProfilePage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState(null);
  const [showQuickGuide, setShowQuickGuide] = useState(false);

  const [profileData, setProfileData] = useState({
    name: "",
    email: "",
    phone: "",
    sport: "",
    position: "",
    age: 0,
    height: 0,
    weight: 0,
    training_load: 0,
    flexibility: 0,
    strength: 0,
    balance: 0,
    endurance: 0,
    coach_notes: "",
    riskScore: 0,
    riskStatus: "Not Screened",
    lastAssessment: "Never",
  });

  useEffect(() => {
    fetchProfileData();
  }, [user]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const data = await getMyProfile();
      if (data) {
        setProfileData({
          name: data.name || user?.name || "",
          email: data.email || user?.email || "",
          phone: data.phone || "",
          sport: data.sport || "",
          position: data.position || "",
          age: Number(data.age) || 0,
          height: Number(data.height) || 0,
          weight: Number(data.weight) || 0,
          training_load: Number(data.training_load) || 0,
          flexibility: Number(data.flexibility) || 0,
          strength: Number(data.strength) || 0,
          balance: Number(data.balance) || 0,
          endurance: Number(data.endurance) || 0,
          coach_notes: data.coach_notes || "",
          riskScore: Number(data.riskScore) || 0,
          riskStatus: data.riskStatus || "Not Screened",
          lastAssessment: data.lastAssessment || "Never",
        });
      }
    } catch (err) {
      console.warn("Failed to fetch athlete profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const setPreset = (field, value) => {
    setProfileData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...profileData,
        age: profileData.age ? Number(profileData.age) : null,
        height: profileData.height ? Number(profileData.height) : null,
        weight: profileData.weight ? Number(profileData.weight) : null,
        training_load: Number(profileData.training_load) || 0,
        flexibility: Number(profileData.flexibility) || 0,
        strength: Number(profileData.strength) || 0,
        balance: Number(profileData.balance) || 0,
        endurance: Number(profileData.endurance) || 0,
      };
      const updated = await updateMyProfile(payload);
      setProfileData((prev) => ({
        ...prev,
        ...updated,
        age: Number(updated.age) || 0,
        height: Number(updated.height) || 0,
        weight: Number(updated.weight) || 0,
      }));
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert("Failed to save changes. Please check your backend connection.");
    } finally {
      setSaving(false);
    }
  };

  // Calculate BMI if height and weight exist
  const heightM = Number(profileData.height) > 0 ? Number(profileData.height) / 100 : 0;
  const weightKg = Number(profileData.weight) || 0;
  const bmi = heightM > 0 && weightKg > 0 ? (weightKg / (heightM * heightM)).toFixed(1) : "--";

  // Radar chart capacity data
  const hasPhysicalData =
    Number(profileData.strength) > 0 ||
    Number(profileData.flexibility) > 0 ||
    Number(profileData.balance) > 0 ||
    Number(profileData.endurance) > 0;

  const radarData = [
    { metric: "Strength", value: Number(profileData.strength) || 0, fullMark: 100 },
    { metric: "Flexibility", value: Number(profileData.flexibility) || 0, fullMark: 100 },
    { metric: "Balance", value: Number(profileData.balance) || 0, fullMark: 100 },
    { metric: "Endurance", value: Number(profileData.endurance) || 0, fullMark: 100 },
    { metric: "Load Mgmt", value: Math.max(100 - (Number(profileData.training_load) || 0), 0), fullMark: 100 },
  ];

  const isProfileComplete = Boolean(
    profileData.sport &&
    profileData.sport.trim() !== "" &&
    profileData.sport !== "Not Specified" &&
    profileData.position &&
    profileData.position.trim() !== "" &&
    profileData.position !== "N/A"
  );

  // Self-assessment parameter guide descriptions
  const metricGuides = {
    training_load: {
      title: "Training Load (0–100)",
      desc: "Measures your current weekly fatigue and exertion.",
      test: "Weekly Session-RPE (Intensity × Hours)",
      levels: [
        { label: "Light / Recovery", value: 30, text: "Active rest, light stretching, low soreness" },
        { label: "Regular Training", value: 65, text: "Normal team practice & gym sessions (Optimal)" },
        { label: "High Overload", value: 85, text: "Double sessions, heavy tournaments, high fatigue" },
      ],
    },
    flexibility: {
      title: "Flexibility Score (0–100%)",
      desc: "Measures muscle elasticity and joint range of motion.",
      test: "Sit-and-Reach Test (Hamstrings & Lower Back)",
      levels: [
        { label: "Stiff (<50%)", value: 40, text: "Cannot reach toes with straight knees" },
        { label: "Athletic (75%)", value: 75, text: "Can touch toes comfortably with fingers" },
        { label: "Hyper-Mobile (90%)", value: 90, text: "Can place full palms flat past toes" },
      ],
    },
    strength: {
      title: "Strength Score (0–100%)",
      desc: "Measures force output relative to your bodyweight.",
      test: "1RM Squat / Push-ups / Single-Leg Squat",
      levels: [
        { label: "Beginner (50%)", value: 50, text: "<15 push-ups, squat < bodyweight" },
        { label: "Good Baseline (75%)", value: 75, text: "Squat 1.2x–1.5x bodyweight, 30+ push-ups" },
        { label: "Elite (90%)", value: 90, text: "Squat 1.8x+ bodyweight, pistol squats on both legs" },
      ],
    },
    balance: {
      title: "Neuromuscular Balance (0–100%)",
      desc: "Measures single-leg joint stabilization and proprioception.",
      test: "Single-Leg Eyes-Closed Stance Test",
      levels: [
        { label: "Unstable (<50%)", value: 40, text: "Wobbles or drops foot in under 10 seconds" },
        { label: "Good Balance (75%)", value: 75, text: "Holds single-leg stance 15–25s eyes closed" },
        { label: "Rock-Solid (90%)", value: 90, text: "Holds 30+ seconds effortlessly on both legs" },
      ],
    },
    endurance: {
      title: "Endurance Score (0–100%)",
      desc: "Measures aerobic stamina and fatigue resistance (VO2 Max).",
      test: "12-Min Cooper Run or Yo-Yo / Beep Test",
      levels: [
        { label: "Basic (50%)", value: 50, text: "Cooper run < 2.0 km, gasses out quickly" },
        { label: "Match Fit (75%)", value: 75, text: "Cooper run 2.4–2.7 km, solid 90-min stamina" },
        { label: "Elite Cardio (90%)", value: 90, text: "Cooper run > 2.8 km, superior high-speed recovery" },
      ],
    },
  };

  if (loading) {
    return (
      <div style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <Activity size={40} color="#38bdf8" className="animate-pulse-slow" style={{ margin: "0 auto 1rem" }} />
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>Loading Athlete Profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "1350px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Top Athlete Hero Banner */}
      <div
        className="glass-panel glass-panel-glow"
        style={{
          padding: "2rem",
          marginBottom: "2rem",
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <div
            style={{
              width: "76px",
              height: "76px",
              borderRadius: "20px",
              background: "linear-gradient(135deg, #0284c7 0%, #10b981 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "2rem",
              fontWeight: "800",
              color: "#ffffff",
              boxShadow: "0 0 25px rgba(2, 132, 199, 0.4)",
            }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : "A"}
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "4px" }}>
              <h1 style={{ fontSize: "1.8rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em", margin: 0 }}>
                {user?.name || "Athlete Profile"}
              </h1>
              {isProfileComplete ? (
                <span className="badge-low-risk">
                  <CheckCircle2 size={13} /> Active Profile
                </span>
              ) : (
                <span className="badge-mod-risk">
                  <AlertCircle size={13} /> Incomplete Profile
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", color: "var(--text-muted)", fontSize: "0.9rem" }}>
              <span style={{ color: "#38bdf8", fontWeight: "600" }}>
                {profileData.sport || "Sport Not Set"}
              </span>
              <span>•</span>
              <span>{profileData.position || "Position Not Set"}</span>
              <span>•</span>
              <span>{profileData.age ? `Age ${profileData.age}` : "Age Not Set"}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
          <button onClick={() => setIsEditing(true)} className="btn-subtle">
            <Edit3 size={16} />
            <span>{isProfileComplete ? "Edit Vitals & Capacity" : "Complete Profile"}</span>
          </button>
          <button
            onClick={() => {
              if (!isProfileComplete) {
                alert("Please complete your sport and position details before uploading video for analysis.");
                setIsEditing(true);
              } else {
                navigate("/upload");
              }
            }}
            className="btn-emerald"
          >
            <Video size={16} />
            <span>Upload Movement Video</span>
          </button>
        </div>
      </div>

      {/* Prompt banner if profile is not configured */}
      {!isProfileComplete && (
        <div
          style={{
            backgroundColor: "rgba(56, 189, 248, 0.12)",
            border: "1px solid rgba(56, 189, 248, 0.3)",
            padding: "1.25rem 1.5rem",
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
            <Info size={24} color="#38bdf8" />
            <div>
              <div style={{ fontWeight: "700", color: "#ffffff", fontSize: "0.95rem" }}>
                Welcome to KineticAI! Complete Your Athlete Profile
              </div>
              <div style={{ fontSize: "0.82rem", color: "#cbd5e1" }}>
                Set your sport, position, and physical capabilities to unlock video motion capture and biomechanical risk assessment.
              </div>
            </div>
          </div>
          <button onClick={() => setIsEditing(true)} className="btn-primary" style={{ padding: "8px 16px", fontSize: "0.85rem" }}>
            Enter Profile Details →
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        <MetricCard
          title="Training Load"
          value={profileData.training_load > 0 ? profileData.training_load : "--"}
          unit={profileData.training_load > 0 ? "/ 100" : ""}
          subtitle={profileData.training_load > 0 ? "Current Workload" : "Click 'Edit' to set"}
          icon={Flame}
          progress={profileData.training_load}
          color="cyan"
        />
        <MetricCard
          title="Flexibility Index"
          value={profileData.flexibility > 0 ? `${profileData.flexibility}%` : "--"}
          subtitle={profileData.flexibility > 0 ? "Sit & Reach ROM" : "Click 'Edit' to set"}
          icon={Activity}
          progress={profileData.flexibility}
          color="emerald"
        />
        <MetricCard
          title="Strength Score"
          value={profileData.strength > 0 ? `${profileData.strength}%` : "--"}
          subtitle={profileData.strength > 0 ? "Relative 1RM / Power" : "Click 'Edit' to set"}
          icon={Shield}
          progress={profileData.strength}
          color="purple"
        />
        <MetricCard
          title="Body Mass Index"
          value={bmi}
          unit={bmi !== "--" ? "kg/m²" : ""}
          subtitle={
            profileData.weight && profileData.height
              ? `${profileData.weight}kg / ${profileData.height}cm`
              : "Set height & weight"
          }
          icon={Scale}
          color="cyan"
        />
        <MetricCard
          title="Balance Score"
          value={profileData.balance > 0 ? `${profileData.balance}%` : "--"}
          subtitle={profileData.balance > 0 ? "Single-Leg Stance" : "Click 'Edit' to set"}
          icon={Award}
          progress={profileData.balance}
          color="amber"
        />
      </div>

      {/* Main Split: Radar Capacity & Injury Risk Status */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
          gap: "1.5rem",
          marginBottom: "2rem",
        }}
      >
        {/* Radar Chart Panel */}
        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
                Athletic Capacity Radar
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                Multi-axial physical capability balance
              </p>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="btn-subtle"
              style={{ padding: "4px 10px", fontSize: "0.75rem" }}
            >
              Update Metrics
            </button>
          </div>

          {hasPhysicalData ? (
            <div style={{ width: "100%", height: "290px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="rgba(255, 255, 255, 0.1)" />
                  <PolarAngleAxis dataKey="metric" stroke="#94a3b8" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="rgba(255, 255, 255, 0.2)" tick={false} />
                  <Radar
                    name="Capacity"
                    dataKey="value"
                    stroke="#06b6d4"
                    fill="#06b6d4"
                    fillOpacity={0.4}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "3.5rem 1rem" }}>
              <Activity size={36} color="#475569" style={{ margin: "0 auto 8px" }} />
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem" }}>
                No physical capacity scores recorded yet.
              </p>
              <button
                onClick={() => setIsEditing(true)}
                className="btn-subtle"
                style={{ marginTop: "10px", fontSize: "0.8rem" }}
              >
                + Enter Strength & Flexibility
              </button>
            </div>
          )}
        </div>

        {/* Risk Gauge & Biomechanical Evaluation */}
        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
            <div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
                Kinetic Risk Evaluation
              </h3>
              <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                AI predictive injury risk rating
              </p>
            </div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
              {profileData.lastAssessment !== "Never" ? `Last Screened: ${profileData.lastAssessment}` : "No video assessed"}
            </span>
          </div>

          {profileData.riskScore > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <RiskGauge score={profileData.riskScore} size={190} showLabel={true} />
              <button
                onClick={() => navigate("/analysis-report")}
                className="btn-primary"
                style={{ marginTop: "1.5rem", padding: "8px 16px", fontSize: "0.85rem" }}
              >
                <FileText size={16} /> View Biomechanical Report
              </button>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "3rem 1rem" }}>
              <Video size={40} color="#475569" style={{ margin: "0 auto 10px" }} />
              <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "1rem" }}>
                You haven't uploaded a movement capture video yet.
              </p>
              <button
                onClick={() => {
                  if (!isProfileComplete) {
                    alert("Please complete your profile first.");
                    setIsEditing(true);
                  } else {
                    navigate("/upload");
                  }
                }}
                className="btn-emerald"
                style={{ padding: "10px 18px", fontSize: "0.9rem" }}
              >
                📹 Upload Video for AI Analysis
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Athlete Vitals Summary & Coach Guidance */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {/* Physical Bio Details */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#ffffff", marginBottom: "1rem" }}>
            Biometric Profile Details
          </h3>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1rem",
              fontSize: "0.88rem",
            }}
          >
            <div>
              <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>Sport</span>
              <strong style={{ color: profileData.sport ? "#f8fafc" : "var(--text-dim)" }}>
                {profileData.sport || "Not specified"}
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>Position</span>
              <strong style={{ color: profileData.position ? "#f8fafc" : "var(--text-dim)" }}>
                {profileData.position || "Not specified"}
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>Height</span>
              <strong style={{ color: profileData.height ? "#f8fafc" : "var(--text-dim)" }}>
                {profileData.height ? `${profileData.height} cm` : "Not set"}
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>Weight</span>
              <strong style={{ color: profileData.weight ? "#f8fafc" : "var(--text-dim)" }}>
                {profileData.weight ? `${profileData.weight} kg` : "Not set"}
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>Phone Number</span>
              <strong style={{ color: profileData.phone ? "#f8fafc" : "var(--text-dim)" }}>
                {profileData.phone || "Not set"}
              </strong>
            </div>
            <div>
              <span style={{ color: "var(--text-dim)", display: "block", fontSize: "0.75rem" }}>Last Assessment</span>
              <strong style={{ color: "#f8fafc" }}>
                {profileData.lastAssessment}
              </strong>
            </div>
          </div>
        </div>

        {/* Coach / Clinical Guidance */}
        <div className="glass-panel" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.8rem" }}>
            <Sparkles size={18} color="#f59e0b" />
            <h3 style={{ fontSize: "1.05rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
              Coach & Performance Guidance
            </h3>
          </div>
          <div
            style={{
              backgroundColor: "rgba(15, 23, 42, 0.6)",
              padding: "1rem",
              borderRadius: "10px",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              color: profileData.coach_notes ? "#cbd5e1" : "var(--text-dim)",
              fontSize: "0.88rem",
              lineHeight: 1.6,
              minHeight: "80px",
            }}
          >
            {profileData.coach_notes || "No coach observations or feedback recorded yet."}
          </div>
        </div>
      </div>

      {/* Edit Profile Modal with Interactive Benchmark Helpers */}
      {isEditing && (
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
          <div
            className="glass-panel"
            style={{
              width: "100%",
              maxWidth: "720px",
              padding: "2rem",
              maxHeight: "92vh",
              overflowY: "auto",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h3 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#38bdf8", margin: 0 }}>
                  Update Athlete Biometrics & Vitals
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "2px 0 0 0" }}>
                  Use the ℹ️ benchmark helpers or quick presets below each field to set your scores.
                </p>
              </div>
              <button
                onClick={() => setIsEditing(false)}
                style={{
                  background: "transparent",
                  border: "none",
                  color: "var(--text-muted)",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
            </div>

            {/* Quick 30-Second Self-Assessment Explainer Banner */}
            <div
              style={{
                backgroundColor: "rgba(56, 189, 248, 0.08)",
                border: "1px solid rgba(56, 189, 248, 0.25)",
                borderRadius: "10px",
                padding: "10px 14px",
                marginBottom: "1.5rem",
              }}
            >
              <div
                onClick={() => setShowQuickGuide(!showQuickGuide)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8", fontSize: "0.85rem", fontWeight: "700" }}>
                  <Zap size={16} /> How to calculate your scores (Testing Guide)
                </div>
                {showQuickGuide ? <ChevronUp size={16} color="#38bdf8" /> : <ChevronDown size={16} color="#38bdf8" />}
              </div>

              {showQuickGuide && (
                <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid rgba(56, 189, 248, 0.15)", fontSize: "0.8rem", color: "#cbd5e1", lineHeight: 1.5 }}>
                  <p style={{ margin: "0 0 6px 0" }}>
                    • <strong>Strength (1RM Ratio)</strong>: Can you squat/deadlift 1.5x bodyweight or do 30+ push-ups? (Yes = 75-90%, Beginner = 50%)
                  </p>
                  <p style={{ margin: "0 0 6px 0" }}>
                    • <strong>Flexibility (Sit & Reach)</strong>: Can you touch your toes with straight knees? (Cannot = 40%, Toes = 75%, Palms past toes = 90%)
                  </p>
                  <p style={{ margin: "0 0 6px 0" }}>
                    • <strong>Balance (Single-Leg Eyes Closed)</strong>: Stand on one leg with eyes closed. (&lt;10s = 40%, 15-25s = 75%, 30s+ = 90%)
                  </p>
                  <p style={{ margin: "0 0 6px 0" }}>
                    • <strong>Endurance (12-Min Run / Beep Test)</strong>: Cooper run distance. (&lt;2.0km = 50%, 2.4-2.7km = 75%, &gt;2.8km = 90%)
                  </p>
                  <p style={{ margin: 0 }}>
                    • <strong>Training Load (Weekly Fatigue)</strong>: Light/Recovery = 30 | Normal Training = 65 | Peak/Exhaustion = 85
                  </p>
                </div>
              )}
            </div>

            <form onSubmit={handleSave}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1.25rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Sport / Discipline *
                  </label>
                  <input
                    type="text"
                    name="sport"
                    placeholder="e.g. Basketball, Soccer"
                    value={profileData.sport || ""}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(10, 15, 29, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Position / Role *
                  </label>
                  <input
                    type="text"
                    name="position"
                    placeholder="e.g. Point Guard, Midfielder"
                    value={profileData.position || ""}
                    onChange={handleInputChange}
                    required
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(10, 15, 29, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Age (Years)
                  </label>
                  <input
                    type="number"
                    name="age"
                    placeholder="e.g. 21"
                    value={profileData.age || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(10, 15, 29, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    placeholder="+91..."
                    value={profileData.phone || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(10, 15, 29, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="height"
                    placeholder="e.g. 180"
                    value={profileData.height || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(10, 15, 29, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    name="weight"
                    placeholder="e.g. 75"
                    value={profileData.weight || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(10, 15, 29, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                    }}
                  />
                </div>

                {/* 1. Training Load with Tooltip and Presets */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>Training Load (0–100)</span>
                      <button
                        type="button"
                        onClick={() => setActiveTooltip(activeTooltip === "load" ? null : "load")}
                        style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", padding: 0 }}
                      >
                        <HelpCircle size={14} />
                      </button>
                    </label>
                    <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#38bdf8" }}>
                      {profileData.training_load || 0}/100
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="training_load"
                    placeholder="0-100"
                    value={profileData.training_load || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(10, 15, 29, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                      marginBottom: "6px",
                    }}
                  />
                  {/* Preset chips */}
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {metricGuides.training_load.levels.map((lvl) => (
                      <button
                        key={lvl.label}
                        type="button"
                        onClick={() => setPreset("training_load", lvl.value)}
                        style={{
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "0.7rem",
                          fontWeight: "600",
                          backgroundColor: profileData.training_load === lvl.value ? "rgba(56, 189, 248, 0.25)" : "rgba(255,255,255,0.05)",
                          color: profileData.training_load === lvl.value ? "#38bdf8" : "var(--text-dim)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          cursor: "pointer",
                        }}
                      >
                        {lvl.label} ({lvl.value})
                      </button>
                    ))}
                  </div>
                  {activeTooltip === "load" && (
                    <div style={{ marginTop: "6px", padding: "8px", backgroundColor: "rgba(15, 23, 42, 0.9)", borderRadius: "6px", border: "1px solid rgba(56, 189, 248, 0.3)", fontSize: "0.72rem", color: "#cbd5e1" }}>
                      {metricGuides.training_load.desc} <em>Test: {metricGuides.training_load.test}</em>
                    </div>
                  )}
                </div>

                {/* 2. Flexibility Score with Tooltip and Presets */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>Flexibility Score (0–100%)</span>
                      <button
                        type="button"
                        onClick={() => setActiveTooltip(activeTooltip === "flex" ? null : "flex")}
                        style={{ background: "none", border: "none", color: "#10b981", cursor: "pointer", padding: 0 }}
                      >
                        <HelpCircle size={14} />
                      </button>
                    </label>
                    <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#34d399" }}>
                      {profileData.flexibility || 0}%
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="flexibility"
                    placeholder="0-100"
                    value={profileData.flexibility || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(10, 15, 29, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                      marginBottom: "6px",
                    }}
                  />
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {metricGuides.flexibility.levels.map((lvl) => (
                      <button
                        key={lvl.label}
                        type="button"
                        onClick={() => setPreset("flexibility", lvl.value)}
                        style={{
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "0.7rem",
                          fontWeight: "600",
                          backgroundColor: profileData.flexibility === lvl.value ? "rgba(16, 185, 129, 0.25)" : "rgba(255,255,255,0.05)",
                          color: profileData.flexibility === lvl.value ? "#34d399" : "var(--text-dim)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          cursor: "pointer",
                        }}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                  {activeTooltip === "flex" && (
                    <div style={{ marginTop: "6px", padding: "8px", backgroundColor: "rgba(15, 23, 42, 0.9)", borderRadius: "6px", border: "1px solid rgba(16, 185, 129, 0.3)", fontSize: "0.72rem", color: "#cbd5e1" }}>
                      {metricGuides.flexibility.desc} <em>Test: {metricGuides.flexibility.test}</em>
                    </div>
                  )}
                </div>

                {/* 3. Strength Score with Tooltip and Presets */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>Strength Score (0–100%)</span>
                      <button
                        type="button"
                        onClick={() => setActiveTooltip(activeTooltip === "str" ? null : "str")}
                        style={{ background: "none", border: "none", color: "#a855f7", cursor: "pointer", padding: 0 }}
                      >
                        <HelpCircle size={14} />
                      </button>
                    </label>
                    <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#c084fc" }}>
                      {profileData.strength || 0}%
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="strength"
                    placeholder="0-100"
                    value={profileData.strength || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(10, 15, 29, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                      marginBottom: "6px",
                    }}
                  />
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {metricGuides.strength.levels.map((lvl) => (
                      <button
                        key={lvl.label}
                        type="button"
                        onClick={() => setPreset("strength", lvl.value)}
                        style={{
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "0.7rem",
                          fontWeight: "600",
                          backgroundColor: profileData.strength === lvl.value ? "rgba(168, 85, 247, 0.25)" : "rgba(255,255,255,0.05)",
                          color: profileData.strength === lvl.value ? "#c084fc" : "var(--text-dim)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          cursor: "pointer",
                        }}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                  {activeTooltip === "str" && (
                    <div style={{ marginTop: "6px", padding: "8px", backgroundColor: "rgba(15, 23, 42, 0.9)", borderRadius: "6px", border: "1px solid rgba(168, 85, 247, 0.3)", fontSize: "0.72rem", color: "#cbd5e1" }}>
                      {metricGuides.strength.desc} <em>Test: {metricGuides.strength.test}</em>
                    </div>
                  )}
                </div>

                {/* 4. Neuromuscular Balance with Tooltip and Presets */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>Neuromuscular Balance (0–100%)</span>
                      <button
                        type="button"
                        onClick={() => setActiveTooltip(activeTooltip === "bal" ? null : "bal")}
                        style={{ background: "none", border: "none", color: "#f59e0b", cursor: "pointer", padding: 0 }}
                      >
                        <HelpCircle size={14} />
                      </button>
                    </label>
                    <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#fbbf24" }}>
                      {profileData.balance || 0}%
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="balance"
                    placeholder="0-100"
                    value={profileData.balance || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(10, 15, 29, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                      marginBottom: "6px",
                    }}
                  />
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {metricGuides.balance.levels.map((lvl) => (
                      <button
                        key={lvl.label}
                        type="button"
                        onClick={() => setPreset("balance", lvl.value)}
                        style={{
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "0.7rem",
                          fontWeight: "600",
                          backgroundColor: profileData.balance === lvl.value ? "rgba(245, 158, 11, 0.25)" : "rgba(255,255,255,0.05)",
                          color: profileData.balance === lvl.value ? "#fbbf24" : "var(--text-dim)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          cursor: "pointer",
                        }}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                  {activeTooltip === "bal" && (
                    <div style={{ marginTop: "6px", padding: "8px", backgroundColor: "rgba(15, 23, 42, 0.9)", borderRadius: "6px", border: "1px solid rgba(245, 158, 11, 0.3)", fontSize: "0.72rem", color: "#cbd5e1" }}>
                      {metricGuides.balance.desc} <em>Test: {metricGuides.balance.test}</em>
                    </div>
                  )}
                </div>

                {/* 5. Endurance Score with Tooltip and Presets */}
                <div style={{ gridColumn: "span 2" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label style={{ fontSize: "0.78rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>Endurance Score (0–100%)</span>
                      <button
                        type="button"
                        onClick={() => setActiveTooltip(activeTooltip === "end" ? null : "end")}
                        style={{ background: "none", border: "none", color: "#38bdf8", cursor: "pointer", padding: 0 }}
                      >
                        <HelpCircle size={14} />
                      </button>
                    </label>
                    <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#38bdf8" }}>
                      {profileData.endurance || 0}%
                    </span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    name="endurance"
                    placeholder="0-100"
                    value={profileData.endurance || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(10, 15, 29, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                      marginBottom: "6px",
                    }}
                  />
                  <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
                    {metricGuides.endurance.levels.map((lvl) => (
                      <button
                        key={lvl.label}
                        type="button"
                        onClick={() => setPreset("endurance", lvl.value)}
                        style={{
                          padding: "2px 8px",
                          borderRadius: "6px",
                          fontSize: "0.7rem",
                          fontWeight: "600",
                          backgroundColor: profileData.endurance === lvl.value ? "rgba(56, 189, 248, 0.25)" : "rgba(255,255,255,0.05)",
                          color: profileData.endurance === lvl.value ? "#38bdf8" : "var(--text-dim)",
                          border: "1px solid rgba(255,255,255,0.08)",
                          cursor: "pointer",
                        }}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                  {activeTooltip === "end" && (
                    <div style={{ marginTop: "6px", padding: "8px", backgroundColor: "rgba(15, 23, 42, 0.9)", borderRadius: "6px", border: "1px solid rgba(56, 189, 248, 0.3)", fontSize: "0.72rem", color: "#cbd5e1" }}>
                      {metricGuides.endurance.desc} <em>Test: {metricGuides.endurance.test}</em>
                    </div>
                  )}
                </div>

                <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", color: "var(--text-muted)", marginBottom: "4px" }}>
                    Coach & Guidance Notes
                  </label>
                  <textarea
                    rows={2}
                    name="coach_notes"
                    placeholder="Any notes from coach or physiotherapist..."
                    value={profileData.coach_notes || ""}
                    onChange={handleInputChange}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: "8px",
                      backgroundColor: "rgba(10, 15, 29, 0.8)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      color: "#fff",
                      fontFamily: "inherit",
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" onClick={() => setIsEditing(false)} className="btn-subtle">
                  Cancel
                </button>
                <button type="submit" disabled={saving} className="btn-emerald">
                  {saving ? "Saving Changes..." : "Save Bio-Metrics"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
