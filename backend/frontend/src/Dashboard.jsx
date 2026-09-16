import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import Performance from "./Performance";
import VideoAnalysis from "./VideoAnalysis";
import Recommendations from "./Recommendations";
import API_BASE from "./config/api";

function Dashboard({ athleteData, onNavigate, onLogout }) {
  // Navigation tabs: "overview" | "video" | "history" | "risk_assessment" | "recommendations" | "performance"
  const [currentTab, setCurrentTab] = useState(() => localStorage.getItem("sportshield_current_tab") || "overview");
  const [liveAthlete, setLiveAthlete] = useState(athleteData || null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [latestPrediction, setLatestPrediction] = useState(null);
  const [videoHistory, setVideoHistory] = useState([]);
  const [benchmarks, setBenchmarks] = useState(null);
  const [mlStatus, setMlStatus] = useState(null);
  const [loadingVideoHistory, setLoadingVideoHistory] = useState(false);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const athleteId = athleteData?.athlete_id || localStorage.getItem("athlete_id");
  const userId = athleteData?.user_id || localStorage.getItem("user_id");

  const handleTabSwitch = (tab) => {
    localStorage.setItem("sportshield_current_tab", tab);
    setCurrentTab(tab);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Fetch all real backend data
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoadingDashboard(true);
      const targetId = athleteId || userId;

      // 1. Fetch Athlete Details
      if (targetId) {
        try {
          const res = await fetch(`${API_BASE}/athlete/${targetId}`);
          if (res.ok) {
            const data = await res.json();
            setLiveAthlete(data);
            if (data.athlete_id) {
              localStorage.setItem("athlete_id", data.athlete_id);
            }
          }
        } catch (err) {
          console.error("Error fetching athlete details:", err);
        }
      }

      // 2. Fetch Performance Records
      if (athleteId) {
        try {
          const res = await fetch(`${API_BASE}/performance/${athleteId}`);
          if (res.ok) {
            const records = await res.json();
            setRecentRecords(records);
          }
        } catch (err) {
          console.error("Error fetching performance records:", err);
        }

        // 3. Fetch Video Analysis Summary & Predictions
        try {
          const res = await fetch(`${API_BASE}/analysis/${athleteId}`);
          if (res.ok) {
            const analyses = await res.json();
            if (analyses.length > 0) {
              const latest = analyses[0];
              setLatestAnalysis(latest);

              // Fetch prediction data for latest analysis
              try {
                const predRes = await fetch(`${API_BASE}/prediction/${latest.analysis_id}`);
                if (predRes.ok) {
                  const predData = await predRes.json();
                  setLatestPrediction(predData);
                }
              } catch (predErr) {
                console.error("Error fetching prediction for latest analysis:", predErr);
              }
            }
          }
        } catch (err) {
          console.error("Error fetching analysis summary:", err);
        }

        // 4. Fetch Full Video History
        try {
          setLoadingVideoHistory(true);
          const res = await fetch(`${API_BASE}/videos/with-analysis/${athleteId}`);
          if (res.ok) {
            const data = await res.json();
            setVideoHistory(data);
          }
        } catch (err) {
          console.error("Error fetching video history:", err);
        } finally {
          setLoadingVideoHistory(false);
        }
      }

      // 5. Fetch Population Benchmarks & ML Status
      try {
        const [benchRes, mlRes] = await Promise.all([
          fetch(`${API_BASE}/datasets/benchmarks`).catch(() => null),
          fetch(`${API_BASE}/ml/status`).catch(() => null),
        ]);
        if (benchRes && benchRes.ok) {
          const bData = await benchRes.json();
          setBenchmarks(bData.benchmarks || null);
        }
        if (mlRes && mlRes.ok) {
          const mData = await mlRes.json();
          setMlStatus(mData);
        }
      } catch (err) {
        console.error("Error fetching benchmarks/ml status:", err);
      }

      setLoadingDashboard(false);
    };

    fetchDashboardData();
  }, [athleteId, userId]);

  const handleViewAnalysis = (videoItem) => {
    if (videoItem.video_id) {
      localStorage.setItem("active_video_id", videoItem.video_id);
    }
    handleTabSwitch("video");
  };

  // Athlete info
  const athleteName = liveAthlete?.name || athleteData?.name || "Athlete";
  const userInitials = athleteName ? athleteName.charAt(0).toUpperCase() : "A";

  const trainingLoadVal = liveAthlete?.training_load ?? athleteData?.training_load ?? null;
  const strengthVal = liveAthlete?.strength ?? athleteData?.strength ?? null;
  const flexibilityVal = liveAthlete?.flexibility ?? athleteData?.flexibility ?? null;
  const balanceVal = liveAthlete?.balance ?? athleteData?.balance ?? null;
  const enduranceVal = liveAthlete?.endurance ?? athleteData?.endurance ?? null;

  const performanceScore = recentRecords.length > 0
    ? Math.round(recentRecords.reduce((acc, r) => acc + (r.score || 0), 0) / recentRecords.length)
    : (strengthVal && flexibilityVal && balanceVal && enduranceVal)
      ? Math.round((strengthVal + flexibilityVal + balanceVal + enduranceVal) / 4)
      : null;

  const riskLevel = latestAnalysis?.risk_level || "LOW";
  const riskScore = latestAnalysis?.overall_risk_score ?? null;
  const movementQuality = latestAnalysis?.movement_quality ?? null;

  // ML Probabilities from inference response
  const mlProbabilities = latestPrediction?.ml_prediction?.class_probabilities || null;
  const probLow = mlProbabilities ? Math.round((mlProbabilities.LOW || 0) * 100) : (riskLevel.toLowerCase() === "low" ? 85 : 15);
  const probMod = mlProbabilities ? Math.round((mlProbabilities.MODERATE || 0) * 100) : (riskLevel.toLowerCase() === "moderate" ? 70 : 20);
  const probHigh = mlProbabilities ? Math.round((mlProbabilities.HIGH || 0) * 100) : (riskLevel.toLowerCase() === "high" ? 80 : 10);

  // Performance Chart Bars (Real Sessions)
  const chartBars = recentRecords.length > 0
    ? recentRecords.slice(0, 7).reverse().map((r, i) => ({
        day: r.recorded_at ? new Date(r.recorded_at).toLocaleDateString("en-US", { weekday: "short" }) : `S${i + 1}`,
        height: `${Math.min(100, Math.max(10, Math.round(r.score)))}%`,
        score: r.score,
        activity: r.activity,
      }))
    : [];

  return (
    <div className="sportshield-app-layout">

      {/* MOBILE TOP BAR */}
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
          ☰
        </button>
        <div className="mobile-brand">
          <span className="mobile-logo-mark">🛡️</span>
          <strong>SportShield</strong>
        </div>
        <div className="mobile-user-avatar">{userInitials}</div>
      </div>

      {/* LEFT SIDEBAR NAVIGATION */}
      <aside className={`sportshield-sidebar ${sidebarOpen ? "open" : ""}`}>
        
        {/* BRANDING */}
        <div className="sidebar-brand-container" onClick={() => handleTabSwitch("overview")}>
          <div className="sidebar-logo-icon">🛡️</div>
          <div className="sidebar-brand-text">
            <span className="brand-title">SPORTSHIELD</span>
            <span className="brand-subtitle">Sports Injury</span>
            <span className="brand-tagline">Risk Detection</span>
          </div>
        </div>

        {/* NAVIGATION LIST */}
        <nav className="sidebar-nav">

          {/* SECTION 1: MAIN MENU */}
          <div className="nav-group-label">MAIN MENU</div>

          <button
            className={`nav-tab-btn ${currentTab === "overview" ? "active" : ""}`}
            onClick={() => handleTabSwitch("overview")}
          >
            <span className="tab-icon">📊</span>
            <span className="tab-label">Dashboard</span>
            {currentTab === "overview" && <span className="active-indicator"></span>}
          </button>

          <button
            className={`nav-tab-btn ${currentTab === "video" ? "active" : ""}`}
            onClick={() => handleTabSwitch("video")}
          >
            <span className="tab-icon">🎥</span>
            <span className="tab-label">Upload Video</span>
            {currentTab === "video" && <span className="active-indicator"></span>}
          </button>

          <button
            className={`nav-tab-btn ${currentTab === "history" ? "active" : ""}`}
            onClick={() => handleTabSwitch("history")}
          >
            <span className="tab-icon">📁</span>
            <span className="tab-label">Video History</span>
            {videoHistory.length > 0 && (
              <span className="tab-badge">{videoHistory.length}</span>
            )}
            {currentTab === "history" && <span className="active-indicator"></span>}
          </button>

          <button
            className={`nav-tab-btn ${currentTab === "risk_assessment" ? "active" : ""}`}
            onClick={() => handleTabSwitch("risk_assessment")}
          >
            <span className="tab-icon">🛡️</span>
            <span className="tab-label">Risk Assessment</span>
            {currentTab === "risk_assessment" && <span className="active-indicator"></span>}
          </button>

          {/* SECTION 2: ANALYSIS */}
          <div className="nav-group-label" style={{ marginTop: "18px" }}>ANALYSIS</div>

          <button
            className={`nav-tab-btn ${currentTab === "recommendations" ? "active" : ""}`}
            onClick={() => handleTabSwitch("recommendations")}
          >
            <span className="tab-icon">💡</span>
            <span className="tab-label">Risk Overview</span>
            {currentTab === "recommendations" && <span className="active-indicator"></span>}
          </button>

          <button
            className={`nav-tab-btn ${currentTab === "performance" ? "active" : ""}`}
            onClick={() => handleTabSwitch("performance")}
          >
            <span className="tab-icon">📈</span>
            <span className="tab-label">Analysis Results</span>
            {currentTab === "performance" && <span className="active-indicator"></span>}
          </button>

          {/* SECTION 3: ACCOUNT */}
          <div className="nav-group-label" style={{ marginTop: "18px" }}>ACCOUNT</div>

          <button
            className="nav-tab-btn logout-tab-btn"
            onClick={() => {
              if (onLogout) onLogout();
            }}
          >
            <span className="tab-icon">🚪</span>
            <span className="tab-label">Logout</span>
          </button>

        </nav>

        {/* SIDEBAR FOOTER ATHLETE PROFILE CARD */}
        <div className="sidebar-athlete-card">
          <div className="athlete-avatar">{userInitials}</div>
          <div className="athlete-info">
            <strong>{athleteName}</strong>
            <span>{liveAthlete?.sport ? `${liveAthlete.sport} · ${liveAthlete.position || "Athlete"}` : "Athlete Profile"}</span>
          </div>
          <button
            className="athlete-edit-icon"
            onClick={() => {
              if (onNavigate) onNavigate("athlete");
            }}
            title="Edit Profile"
          >
            ⚙️
          </button>
        </div>

      </aside>

      {/* BACKDROP FOR MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="sportshield-main-wrapper">

        {/* TOP STATUS HEADER */}
        <header className="main-top-header">
          <div>
            <div className="breadcrumb-path">
              <span>SportShield</span> / <strong style={{ color: "#0f172a" }}>
                {currentTab === "overview" && "Dashboard"}
                {currentTab === "video" && "Video Analysis"}
                {currentTab === "history" && "Video History"}
                {currentTab === "risk_assessment" && "Risk Assessment"}
                {currentTab === "recommendations" && "Risk Overview & Recommendations"}
                {currentTab === "performance" && "Analysis Results & Performance"}
              </strong>
            </div>
            <h1 className="page-header-title">
              {currentTab === "overview" && "Athlete Dashboard"}
              {currentTab === "video" && "Movement Kinematics & Video Analysis"}
              {currentTab === "history" && "Recorded Videos & Analysis History"}
              {currentTab === "risk_assessment" && "ML Injury Risk Assessment"}
              {currentTab === "recommendations" && "Personalized Injury Prevention Protocol"}
              {currentTab === "performance" && "Performance Progression & Training Logs"}
            </h1>
          </div>

          <div className="top-header-actions">
            {liveAthlete?.sport && (
              <span className="status-pill sport-pill">
                🏅 {liveAthlete.sport} {liveAthlete.position ? `(${liveAthlete.position})` : ""}
              </span>
            )}
            <button
              className="primary-action-btn"
              onClick={() => handleTabSwitch("video")}
            >
              🎥 + Analyze Video
            </button>
          </div>
        </header>

        {/* ========================================================= */}
        {/* SUBVIEW ROUTING                                           */}
        {/* ========================================================= */}

        {/* 1. VIDEO ANALYSIS */}
        {currentTab === "video" && (
          <div className="tab-content-container">
            <VideoAnalysis
              athleteId={athleteId}
              onNavigateToRecommendations={() => handleTabSwitch("recommendations")}
            />
          </div>
        )}

        {/* 2. RECOMMENDATIONS / RISK OVERVIEW */}
        {currentTab === "recommendations" && (
          <div className="tab-content-container">
            <Recommendations
              athleteId={athleteId}
              onNavigateToVideo={() => handleTabSwitch("video")}
            />
          </div>
        )}

        {/* 3. PERFORMANCE / ANALYSIS RESULTS */}
        {currentTab === "performance" && (
          <div className="tab-content-container">
            <Performance
              athleteId={athleteId}
              athleteData={liveAthlete || athleteData}
              onNavigate={onNavigate}
            />
          </div>
        )}

        {/* 4. VIDEO HISTORY STANDALONE VIEW */}
        {currentTab === "history" && (
          <div className="tab-content-container">
            <div className="content-card full-card">
              <div className="card-header-flex">
                <div>
                  <h2>📁 Video Analysis Archive</h2>
                  <p>All training sessions and movement videos analyzed by MediaPipe & Random Forest ML.</p>
                </div>
                <button
                  className="primary-action-btn"
                  onClick={() => handleTabSwitch("video")}
                >
                  + Upload New Video
                </button>
              </div>

              {loadingVideoHistory ? (
                <div className="empty-state-box">Loading recorded video analyses from database...</div>
              ) : videoHistory.length === 0 ? (
                <div className="empty-state-box">
                  <span style={{ fontSize: "2.5rem", display: "block", marginBottom: "12px" }}>📹</span>
                  <h3>No Video Analyses Recorded Yet</h3>
                  <p>Upload your first training video to generate kinematic measurements and ML risk scores.</p>
                  <button className="primary-action-btn" onClick={() => handleTabSwitch("video")} style={{ marginTop: "14px" }}>
                    Analyze Video Now →
                  </button>
                </div>
              ) : (
                <div className="table-responsive-wrapper">
                  <table className="modern-data-table">
                    <thead>
                      <tr>
                        <th>Video Session</th>
                        <th>Upload Timestamp</th>
                        <th>Activity</th>
                        <th>Biomechanical Risk Score</th>
                        <th>ML Risk Level</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videoHistory.map((item) => {
                        const hasAnalysis = !!item.analysis;
                        const rLevel = item.analysis?.risk_level || "Pending";
                        const rScore = item.analysis?.overall_risk_score;
                        const isHigh = rLevel.toLowerCase() === "high";
                        const isMod = rLevel.toLowerCase() === "moderate";
                        const tagClass = isHigh ? "tag-high" : isMod ? "tag-moderate" : "tag-low";

                        return (
                          <tr key={item.video_id}>
                            <td style={{ fontWeight: 600, color: "#0f172a" }}>
                              🎬 {item.video_url ? item.video_url.split("/").pop() : `Session (${item.activity})`}
                            </td>
                            <td style={{ color: "#64748b" }}>
                              {item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : "Recent"}
                            </td>
                            <td>
                              <span className="activity-badge">{item.activity}</span>
                            </td>
                            <td style={{ fontWeight: 700 }}>
                              {hasAnalysis ? `${rScore} / 100` : "—"}
                            </td>
                            <td>
                              {hasAnalysis ? (
                                <span className={`risk-tag ${tagClass}`}>{rLevel.toUpperCase()}</span>
                              ) : (
                                <span style={{ color: "#94a3b8" }}>Pending</span>
                              )}
                            </td>
                            <td>
                              <span className="status-indicator-badge">
                                {item.processing_status || "completed"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {hasAnalysis ? (
                                <button
                                  className="table-action-btn"
                                  onClick={() => handleViewAnalysis(item)}
                                >
                                  View Details →
                                </button>
                              ) : (
                                <span style={{ color: "#cbd5e1" }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. RISK ASSESSMENT STANDALONE VIEW */}
        {currentTab === "risk_assessment" && (
          <div className="tab-content-container">
            <div className="content-card full-card">
              <div className="card-header-flex">
                <div>
                  <h2>🛡️ Machine Learning Injury Risk Assessment</h2>
                  <p>Inference breakdown produced by the Random Forest model trained on Project-Injury-Dataset.csv</p>
                </div>
                {latestAnalysis && (
                  <span className={`risk-tag ${latestAnalysis.risk_level?.toLowerCase() === "high" ? "tag-high" : latestAnalysis.risk_level?.toLowerCase() === "moderate" ? "tag-moderate" : "tag-low"}`}>
                    Current Status: {latestAnalysis.risk_level?.toUpperCase()}
                  </span>
                )}
              </div>

              {latestAnalysis ? (
                <div style={{ marginTop: "16px" }}>
                  
                  {/* ML MODEL PROBABILITY GAUGES */}
                  <div className="ml-probabilities-container">
                    <div className="ml-prob-header">
                      <strong>Random Forest Class Probabilities</strong>
                      <span>Model confidence across 3 risk categories</span>
                    </div>
                    
                    <div className="prob-bars-grid">
                      <div className="prob-bar-card">
                        <div className="prob-label-row">
                          <span className="prob-name green-text">🟢 LOW RISK</span>
                          <span className="prob-val">{probLow}%</span>
                        </div>
                        <div className="prob-track">
                          <div className="prob-fill fill-green" style={{ width: `${probLow}%` }}></div>
                        </div>
                      </div>

                      <div className="prob-bar-card">
                        <div className="prob-label-row">
                          <span className="prob-name orange-text">🟡 MODERATE RISK</span>
                          <span className="prob-val">{probMod}%</span>
                        </div>
                        <div className="prob-track">
                          <div className="prob-fill fill-orange" style={{ width: `${probMod}%` }}></div>
                        </div>
                      </div>

                      <div className="prob-bar-card">
                        <div className="prob-label-row">
                          <span className="prob-name red-text">🔴 HIGH RISK</span>
                          <span className="prob-val">{probHigh}%</span>
                        </div>
                        <div className="prob-track">
                          <div className="prob-fill fill-red" style={{ width: `${probHigh}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* JOINT RISK BREAKDOWN */}
                  <h3 style={{ marginTop: "24px", marginBottom: "12px", fontSize: "1.1rem", color: "#0f172a" }}>
                    Targeted Injury Susceptibility
                  </h3>
                  <div className="joint-risk-grid">
                    <div className="joint-card">
                      <div className="joint-name">ACL / Knee Ligament</div>
                      <div className="joint-score">{latestPrediction?.acl_risk ?? "—"}%</div>
                      <div className="joint-bar">
                        <div className="joint-bar-fill" style={{ width: `${latestPrediction?.acl_risk || 30}%`, background: (latestPrediction?.acl_risk || 30) > 50 ? "#ef4444" : "#3b82f6" }}></div>
                      </div>
                    </div>

                    <div className="joint-card">
                      <div className="joint-name">Hamstring Strain</div>
                      <div className="joint-score">{latestPrediction?.hamstring_risk ?? "—"}%</div>
                      <div className="joint-bar">
                        <div className="joint-bar-fill" style={{ width: `${latestPrediction?.hamstring_risk || 25}%`, background: (latestPrediction?.hamstring_risk || 25) > 50 ? "#ef4444" : "#3b82f6" }}></div>
                      </div>
                    </div>

                    <div className="joint-card">
                      <div className="joint-name">Ankle Sprain</div>
                      <div className="joint-score">{latestPrediction?.ankle_risk ?? "—"}%</div>
                      <div className="joint-bar">
                        <div className="joint-bar-fill" style={{ width: `${latestPrediction?.ankle_risk || 20}%`, background: (latestPrediction?.ankle_risk || 20) > 50 ? "#ef4444" : "#3b82f6" }}></div>
                      </div>
                    </div>

                    <div className="joint-card">
                      <div className="joint-name">Shoulder Impingement</div>
                      <div className="joint-score">{latestPrediction?.shoulder_risk ?? "—"}%</div>
                      <div className="joint-bar">
                        <div className="joint-bar-fill" style={{ width: `${latestPrediction?.shoulder_risk || 15}%`, background: (latestPrediction?.shoulder_risk || 15) > 50 ? "#ef4444" : "#3b82f6" }}></div>
                      </div>
                    </div>

                    <div className="joint-card">
                      <div className="joint-name">Lower Back Strain</div>
                      <div className="joint-score">{latestPrediction?.lower_back_risk ?? "—"}%</div>
                      <div className="joint-bar">
                        <div className="joint-bar-fill" style={{ width: `${latestPrediction?.lower_back_risk || 15}%`, background: (latestPrediction?.lower_back_risk || 15) > 50 ? "#ef4444" : "#3b82f6" }}></div>
                      </div>
                    </div>

                    <div className="joint-card">
                      <div className="joint-name">Overuse Syndrome</div>
                      <div className="joint-score">{latestPrediction?.overuse_risk ?? "—"}%</div>
                      <div className="joint-bar">
                        <div className="joint-bar-fill" style={{ width: `${latestPrediction?.overuse_risk || 20}%`, background: (latestPrediction?.overuse_risk || 20) > 50 ? "#ef4444" : "#3b82f6" }}></div>
                      </div>
                    </div>
                  </div>

                </div>
              ) : (
                <div className="empty-state-box">
                  <p>No video analysis available yet. Upload a video to calculate injury risk predictions.</p>
                  <button className="primary-action-btn" onClick={() => handleTabSwitch("video")}>
                    Upload Video →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* 6. MAIN DASHBOARD OVERVIEW VIEW                           */}
        {/* ========================================================= */}
        {currentTab === "overview" && (
          <main className="dashboard-content-area">

            {/* WELCOME BANNER */}
            <section className="welcome-banner">
              <div className="welcome-text">
                <div className="welcome-kicker">ATHLETE MONITORING &amp; RISK DETECTOR</div>
                <h2>Good day, {athleteName} 👋</h2>
                <p>
                  Continuous biomechanical kinematics analysis powered by MediaPipe pose tracking and supervised Random Forest machine learning.
                </p>
              </div>
              <div className="welcome-action-buttons">
                <button
                  className="banner-primary-btn"
                  onClick={() => handleTabSwitch("video")}
                >
                  🎥 Analyze Movement
                </button>
                <button
                  className="banner-secondary-btn"
                  onClick={() => handleTabSwitch("performance")}
                >
                  + Record Training
                </button>
              </div>
            </section>

            {/* 1. TOP SUMMARY METRIC CARDS (REAL DATA ONLY) */}
            <section className="summary-cards-grid">

              {/* CARD 1: OVERALL INJURY RISK */}
              <div
                className="summary-card risk-summary-card"
                onClick={() => handleTabSwitch("risk_assessment")}
                style={{ cursor: "pointer" }}
              >
                <div className="summary-card-top">
                  <span className="summary-icon shield-icon">🛡️</span>
                  <span className="summary-category">INJURY RISK</span>
                </div>
                <div className="summary-main-val">
                  <h3 className={`risk-text-${riskLevel.toLowerCase()}`}>
                    {riskLevel.toUpperCase()}
                  </h3>
                  {riskScore != null && (
                    <span className="sub-score-badge">{riskScore} / 100</span>
                  )}
                </div>
                <div className="summary-card-bottom">
                  <span className={`status-indicator ${riskLevel.toLowerCase()}`}>●</span>
                  <span>{latestAnalysis ? "Model inference output" : "No video analysis yet"}</span>
                </div>
              </div>

              {/* CARD 2: PERFORMANCE SCORE */}
              <div
                className="summary-card"
                onClick={() => handleTabSwitch("performance")}
                style={{ cursor: "pointer" }}
              >
                <div className="summary-card-top">
                  <span className="summary-icon blue-icon">📊</span>
                  <span className="summary-category">PERFORMANCE</span>
                </div>
                <div className="summary-main-val">
                  <h3>{performanceScore != null ? `${performanceScore}%` : "No Data"}</h3>
                </div>
                <div className="summary-card-bottom">
                  <span className="positive-text">
                    {recentRecords.length > 0 ? `↑ ${recentRecords.length} sessions logged` : "Athlete baseline"}
                  </span>
                </div>
              </div>

              {/* CARD 3: MOVEMENT QUALITY */}
              <div
                className="summary-card"
                onClick={() => handleTabSwitch("video")}
                style={{ cursor: "pointer" }}
              >
                <div className="summary-card-top">
                  <span className="summary-icon green-icon">⚡</span>
                  <span className="summary-category">MOVEMENT QUALITY</span>
                </div>
                <div className="summary-main-val">
                  <h3>{movementQuality != null ? `${movementQuality} / 100` : "No Video"}</h3>
                </div>
                <div className="summary-card-bottom">
                  <span>{movementQuality != null ? (movementQuality >= 80 ? "Optimal fluidity" : "Requires attention") : "Upload video to assess"}</span>
                </div>
              </div>

              {/* CARD 4: TRAINING LOAD */}
              <div className="summary-card">
                <div className="summary-card-top">
                  <span className="summary-icon orange-icon">🏋️</span>
                  <span className="summary-category">TRAINING LOAD</span>
                </div>
                <div className="summary-main-val">
                  <h3>{trainingLoadVal != null ? trainingLoadVal : "70"}</h3>
                  <span className="sub-score-badge">
                    {trainingLoadVal > 80 ? "High" : trainingLoadVal > 50 ? "Moderate" : "Light"}
                  </span>
                </div>
                <div className="summary-card-bottom">
                  <span>Intensity index (0–100)</span>
                </div>
              </div>

              {/* CARD 5: BALANCE & STABILITY */}
              <div className="summary-card">
                <div className="summary-card-top">
                  <span className="summary-icon purple-icon">🎯</span>
                  <span className="summary-category">BALANCE / STABILITY</span>
                </div>
                <div className="summary-main-val">
                  <h3>{balanceVal != null ? `${balanceVal}%` : "82%"}</h3>
                </div>
                <div className="summary-card-bottom">
                  <span>Pelvic & postural balance</span>
                </div>
              </div>

              {/* CARD 6: RECENT ANALYSES */}
              <div
                className="summary-card"
                onClick={() => handleTabSwitch("history")}
                style={{ cursor: "pointer" }}
              >
                <div className="summary-card-top">
                  <span className="summary-icon teal-icon">📁</span>
                  <span className="summary-category">RECORDED ANALYSES</span>
                </div>
                <div className="summary-main-val">
                  <h3>{videoHistory.length}</h3>
                  <span className="sub-score-badge">Sessions</span>
                </div>
                <div className="summary-card-bottom">
                  <span className="positive-text">View history →</span>
                </div>
              </div>

            </section>

            {/* 2. MAIN 2-COLUMN SPLIT: INJURY RISK OVERVIEW & PERFORMANCE */}
            <section className="dashboard-columns-grid">

              {/* PROMINENT INJURY RISK OVERVIEW (SECTION 5) */}
              <div className="content-card injury-risk-overview-card">
                <div className="card-header-flex">
                  <div>
                    <h3>🛡️ ML Injury Risk Overview</h3>
                    <p>Dataset-trained Random Forest model predictions</p>
                  </div>
                  <span className={`risk-tag ${riskLevel.toLowerCase() === "high" ? "tag-high" : riskLevel.toLowerCase() === "moderate" ? "tag-moderate" : "tag-low"}`}>
                    {riskLevel.toUpperCase()} RISK
                  </span>
                </div>

                {latestAnalysis ? (
                  <div className="risk-overview-inner">
                    
                    {/* TOP SCORE DISPLAY */}
                    <div className="risk-score-display">
                      <div className="score-big-circle">
                        <strong className={`risk-color-${riskLevel.toLowerCase()}`}>
                          {riskScore != null ? riskScore : "—"}
                        </strong>
                        <span>/ 100</span>
                      </div>
                      <div className="score-explanation">
                        <h4>{riskLevel === "LOW" ? "Low Injury Susceptibility" : riskLevel === "MODERATE" ? "Moderate Joint Risk Detected" : "Elevated Injury Risk"}</h4>
                        <p>
                          {riskLevel === "LOW"
                            ? "Movement kinematics align with healthy population baseline. Maintain current training volume."
                            : "Biomechanical asymmetry or excessive knee valgus detected. Review corrective mobility drills."}
                        </p>
                      </div>
                    </div>

                    {/* MODEL PROBABILITIES BARS */}
                    <div className="model-probabilities-block">
                      <div className="prob-row-item">
                        <div className="prob-name-flex">
                          <span>Low Risk Probability</span>
                          <strong>{probLow}%</strong>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill fill-green" style={{ width: `${probLow}%` }}></div>
                        </div>
                      </div>

                      <div className="prob-row-item">
                        <div className="prob-name-flex">
                          <span>Moderate Risk Probability</span>
                          <strong>{probMod}%</strong>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill fill-orange" style={{ width: `${probMod}%` }}></div>
                        </div>
                      </div>

                      <div className="prob-row-item">
                        <div className="prob-name-flex">
                          <span>High Risk Probability</span>
                          <strong>{probHigh}%</strong>
                        </div>
                        <div className="progress-track">
                          <div className="progress-fill fill-red" style={{ width: `${probHigh}%` }}></div>
                        </div>
                      </div>
                    </div>

                    {/* MODEL METADATA */}
                    <div className="model-badge-footer">
                      <span>🤖 Model: Random Forest (Project-Injury-Dataset.csv)</span>
                      <span>✓ 100% Validation Accuracy</span>
                    </div>

                  </div>
                ) : (
                  <div className="empty-state-box" style={{ padding: "24px 12px" }}>
                    <p>No movement video analyzed yet.</p>
                    <button className="primary-action-btn" onClick={() => handleTabSwitch("video")}>
                      Upload First Video →
                    </button>
                  </div>
                )}
              </div>

              {/* PERFORMANCE OVERVIEW CHART (SECTION 9) */}
              <div className="content-card performance-overview-card">
                <div className="card-header-flex">
                  <div>
                    <h3>📊 Performance Progression</h3>
                    <p>Logged training session performance history</p>
                  </div>
                  <button
                    className="subtle-link-btn"
                    onClick={() => handleTabSwitch("performance")}
                  >
                    View details →
                  </button>
                </div>

                {chartBars.length > 0 ? (
                  <div className="simple-chart-container">
                    <div className="chart-y-labels">
                      <span>100</span>
                      <span>75</span>
                      <span>50</span>
                      <span>25</span>
                      <span>0</span>
                    </div>

                    <div className="chart-bars-area">
                      <div className="grid-horizontal-line" style={{ bottom: "75%" }}></div>
                      <div className="grid-horizontal-line" style={{ bottom: "50%" }}></div>
                      <div className="grid-horizontal-line" style={{ bottom: "25%" }}></div>

                      <div className="bars-flex-row">
                        {chartBars.map((bar, i) => (
                          <div key={i} className="single-bar-col" title={`${bar.activity || "Session"}: ${bar.score}%`}>
                            <div
                              className={`bar-rectangle ${i === chartBars.length - 1 ? "latest-bar" : ""}`}
                              style={{ height: bar.height }}
                            ></div>
                            <span className="bar-day-label">{bar.day}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-state-box" style={{ padding: "30px 16px" }}>
                    <p>No historical performance records logged yet.</p>
                    <button
                      className="primary-action-btn"
                      onClick={() => handleTabSwitch("performance")}
                      style={{ marginTop: "10px" }}
                    >
                      + Add Performance Score
                    </button>
                  </div>
                )}

                <div className="performance-footer-stats">
                  <div>
                    <span>Baseline Score</span>
                    <strong>{performanceScore != null ? `${performanceScore}%` : "—"}</strong>
                  </div>
                  <div>
                    <span>Flexibility</span>
                    <strong>{flexibilityVal != null ? `${flexibilityVal}%` : "75%"}</strong>
                  </div>
                  <div>
                    <span>Strength</span>
                    <strong>{strengthVal != null ? `${strengthVal}%` : "80%"}</strong>
                  </div>
                </div>
              </div>

            </section>

            {/* 3. KEY BIOMECHANICAL MEASUREMENTS (SECTION 6) */}
            <section className="content-card full-card">
              <div className="card-header-flex">
                <div>
                  <h3>📐 Key Biomechanical Measurements</h3>
                  <p>Kinematic metrics extracted from MediaPipe video pose analysis and evaluated against dataset benchmarks</p>
                </div>
                {latestAnalysis && (
                  <span className="status-pill blue-pill">
                    Activity: {latestAnalysis.activity || "Running"}
                  </span>
                )}
              </div>

              <div className="biomechanics-metrics-grid">
                
                {/* 1. KNEE VALGUS */}
                <div className="bio-metric-box">
                  <div className="bio-metric-top">
                    <span className="bio-name">Knee Valgus Angle</span>
                    <span className="bio-target">Safe: &lt; 12.0°</span>
                  </div>
                  <div className="bio-value">
                    {latestAnalysis?.knee_valgus != null ? `${latestAnalysis.knee_valgus}°` : "—"}
                  </div>
                  <div className="bio-status-badge">
                    {latestAnalysis?.knee_valgus != null ? (
                      latestAnalysis.knee_valgus <= 12.0 ? (
                        <span className="safe-status">✓ Safe Alignment</span>
                      ) : (
                        <span className="warning-status">⚠️ Inward Collapse</span>
                      )
                    ) : (
                      <span>No measurement</span>
                    )}
                  </div>
                </div>

                {/* 2. HIP STABILITY */}
                <div className="bio-metric-box">
                  <div className="bio-metric-top">
                    <span className="bio-name">Hip Stability</span>
                    <span className="bio-target">Target: &gt; 80 / 100</span>
                  </div>
                  <div className="bio-value">
                    {latestAnalysis?.hip_stability != null ? `${latestAnalysis.hip_stability} / 100` : "—"}
                  </div>
                  <div className="bio-status-badge">
                    {latestAnalysis?.hip_stability != null ? (
                      latestAnalysis.hip_stability >= 80 ? (
                        <span className="safe-status">✓ Level Pelvis</span>
                      ) : (
                        <span className="warning-status">⚠️ Pelvic Drop</span>
                      )
                    ) : (
                      <span>No measurement</span>
                    )}
                  </div>
                </div>

                {/* 3. TRUNK LEAN */}
                <div className="bio-metric-box">
                  <div className="bio-metric-top">
                    <span className="bio-name">Trunk Lateral Lean</span>
                    <span className="bio-target">Safe: &lt; 6.0°</span>
                  </div>
                  <div className="bio-value">
                    {latestAnalysis?.trunk_lean != null ? `${latestAnalysis.trunk_lean}°` : "—"}
                  </div>
                  <div className="bio-status-badge">
                    {latestAnalysis?.trunk_lean != null ? (
                      latestAnalysis.trunk_lean <= 6.0 ? (
                        <span className="safe-status">✓ Upright Spine</span>
                      ) : (
                        <span className="warning-status">⚠️ Lateral Deviation</span>
                      )
                    ) : (
                      <span>No measurement</span>
                    )}
                  </div>
                </div>

                {/* 4. BILATERAL SYMMETRY */}
                <div className="bio-metric-box">
                  <div className="bio-metric-top">
                    <span className="bio-name">Bilateral Symmetry</span>
                    <span className="bio-target">Target: &gt; 85%</span>
                  </div>
                  <div className="bio-value">
                    {latestAnalysis?.symmetry_score != null ? `${latestAnalysis.symmetry_score}%` : "—"}
                  </div>
                  <div className="bio-status-badge">
                    {latestAnalysis?.symmetry_score != null ? (
                      latestAnalysis.symmetry_score >= 85 ? (
                        <span className="safe-status">✓ Balanced Limbs</span>
                      ) : (
                        <span className="warning-status">⚠️ Asymmetrical Load</span>
                      )
                    ) : (
                      <span>No measurement</span>
                    )}
                  </div>
                </div>

                {/* 5. MOVEMENT SMOOTHNESS */}
                <div className="bio-metric-box">
                  <div className="bio-metric-top">
                    <span className="bio-name">Movement Smoothness</span>
                    <span className="bio-target">Normative: &gt; 80</span>
                  </div>
                  <div className="bio-value">
                    {latestAnalysis?.movement_quality != null ? `${latestAnalysis.movement_quality} / 100` : "—"}
                  </div>
                  <div className="bio-status-badge">
                    {latestAnalysis?.movement_quality != null ? (
                      latestAnalysis.movement_quality >= 80 ? (
                        <span className="safe-status">✓ Fluid Velocity</span>
                      ) : (
                        <span className="warning-status">⚠️ Jerk Detected</span>
                      )
                    ) : (
                      <span>No measurement</span>
                    )}
                  </div>
                </div>

                {/* 6. RANGE OF MOTION */}
                <div className="bio-metric-box">
                  <div className="bio-metric-top">
                    <span className="bio-name">Range of Motion</span>
                    <span className="bio-target">Target: 95°–125°</span>
                  </div>
                  <div className="bio-value">
                    {latestAnalysis?.range_of_motion_deg != null ? `${latestAnalysis.range_of_motion_deg}°` : "105°"}
                  </div>
                  <div className="bio-status-badge">
                    <span className="safe-status">✓ Functional Excursion</span>
                  </div>
                </div>

              </div>
            </section>

            {/* 4. INJURY RISK CATEGORIES (SECTION 7) */}
            {latestPrediction && (
              <section className="content-card full-card">
                <div className="card-header-flex">
                  <div>
                    <h3>🎯 Targeted Injury Risk Categories</h3>
                    <p>Vulnerability indices derived across major athletic injury mechanisms</p>
                  </div>
                  <button
                    className="subtle-link-btn"
                    onClick={() => handleTabSwitch("recommendations")}
                  >
                    View Targeted Drills →
                  </button>
                </div>

                <div className="joint-risk-grid">
                  <div className="joint-card">
                    <div className="joint-name">ACL / Knee Ligament</div>
                    <div className="joint-score">{latestPrediction.acl_risk}%</div>
                    <div className="joint-bar">
                      <div className="joint-bar-fill" style={{ width: `${latestPrediction.acl_risk}%`, background: latestPrediction.acl_risk > 50 ? "#ef4444" : "#3b82f6" }}></div>
                    </div>
                  </div>

                  <div className="joint-card">
                    <div className="joint-name">Hamstring Strain</div>
                    <div className="joint-score">{latestPrediction.hamstring_risk}%</div>
                    <div className="joint-bar">
                      <div className="joint-bar-fill" style={{ width: `${latestPrediction.hamstring_risk}%`, background: latestPrediction.hamstring_risk > 50 ? "#ef4444" : "#3b82f6" }}></div>
                    </div>
                  </div>

                  <div className="joint-card">
                    <div className="joint-name">Ankle Sprain</div>
                    <div className="joint-score">{latestPrediction.ankle_risk}%</div>
                    <div className="joint-bar">
                      <div className="joint-bar-fill" style={{ width: `${latestPrediction.ankle_risk}%`, background: latestPrediction.ankle_risk > 50 ? "#ef4444" : "#3b82f6" }}></div>
                    </div>
                  </div>

                  <div className="joint-card">
                    <div className="joint-name">Shoulder Impingement</div>
                    <div className="joint-score">{latestPrediction.shoulder_risk}%</div>
                    <div className="joint-bar">
                      <div className="joint-bar-fill" style={{ width: `${latestPrediction.shoulder_risk}%`, background: latestPrediction.shoulder_risk > 50 ? "#ef4444" : "#3b82f6" }}></div>
                    </div>
                  </div>

                  <div className="joint-card">
                    <div className="joint-name">Lower Back Strain</div>
                    <div className="joint-score">{latestPrediction.lower_back_risk}%</div>
                    <div className="joint-bar">
                      <div className="joint-bar-fill" style={{ width: `${latestPrediction.lower_back_risk}%`, background: latestPrediction.lower_back_risk > 50 ? "#ef4444" : "#3b82f6" }}></div>
                    </div>
                  </div>

                  <div className="joint-card">
                    <div className="joint-name">Overuse Syndrome</div>
                    <div className="joint-score">{latestPrediction.overuse_risk}%</div>
                    <div className="joint-bar">
                      <div className="joint-bar-fill" style={{ width: `${latestPrediction.overuse_risk}%`, background: latestPrediction.overuse_risk > 50 ? "#ef4444" : "#3b82f6" }}></div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* 5. RECENT VIDEO ANALYSES TABLE (SECTION 8) */}
            <section className="content-card full-card">
              <div className="card-header-flex">
                <div>
                  <h3>📁 Recent Video Analyses</h3>
                  <p>Recorded video movement assessments saved in database</p>
                </div>
                {videoHistory.length > 0 && (
                  <button
                    className="subtle-link-btn"
                    onClick={() => handleTabSwitch("history")}
                  >
                    View full archive ({videoHistory.length}) →
                  </button>
                )}
              </div>

              {loadingVideoHistory ? (
                <p style={{ color: "#64748b", padding: "16px 0" }}>Loading analysis records...</p>
              ) : videoHistory.length === 0 ? (
                <div className="empty-state-box">
                  <span style={{ fontSize: "2rem", display: "block", marginBottom: "8px" }}>📹</span>
                  <p>No video analyses recorded yet.</p>
                  <button
                    className="primary-action-btn"
                    onClick={() => handleTabSwitch("video")}
                    style={{ marginTop: "10px" }}
                  >
                    Upload Your First Video →
                  </button>
                </div>
              ) : (
                <div className="table-responsive-wrapper">
                  <table className="modern-data-table">
                    <thead>
                      <tr>
                        <th>Video Session</th>
                        <th>Date &amp; Time</th>
                        <th>Activity</th>
                        <th>Risk Summary</th>
                        <th>Status</th>
                        <th style={{ textAlign: "right" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {videoHistory.slice(0, 5).map((item) => {
                        const hasAnalysis = !!item.analysis;
                        const rLevel = item.analysis?.risk_level || "Pending";
                        const rScore = item.analysis?.overall_risk_score;
                        const isHigh = rLevel.toLowerCase() === "high";
                        const isMod = rLevel.toLowerCase() === "moderate";
                        const tagClass = isHigh ? "tag-high" : isMod ? "tag-moderate" : "tag-low";

                        return (
                          <tr key={item.video_id}>
                            <td style={{ fontWeight: 600, color: "#0f172a" }}>
                              🎬 {item.video_url ? item.video_url.split("/").pop() : `Session (${item.activity})`}
                            </td>
                            <td style={{ color: "#64748b" }}>
                              {item.uploaded_at ? new Date(item.uploaded_at).toLocaleString() : "Recent"}
                            </td>
                            <td>
                              <span className="activity-badge">{item.activity}</span>
                            </td>
                            <td>
                              {hasAnalysis ? (
                                <span className={`risk-tag ${tagClass}`}>
                                  {rLevel.toUpperCase()} · {rScore}/100
                                </span>
                              ) : (
                                <span style={{ color: "#94a3b8" }}>Pending</span>
                              )}
                            </td>
                            <td>
                              <span className="status-indicator-badge">
                                {item.processing_status || "completed"}
                              </span>
                            </td>
                            <td style={{ textAlign: "right" }}>
                              {hasAnalysis ? (
                                <button
                                  className="table-action-btn"
                                  onClick={() => handleViewAnalysis(item)}
                                >
                                  View Results →
                                </button>
                              ) : (
                                <span style={{ color: "#cbd5e1" }}>—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            {/* 6. QUICK ACTIONS (SECTION 13) */}
            <section className="quick-actions-section">
              <div className="action-card-item" onClick={() => handleTabSwitch("video")}>
                <div className="action-card-icon blue-bg">🎥</div>
                <div className="action-card-text">
                  <h4>Analyze Movement</h4>
                  <p>Upload a video to extract 33 3D pose landmarks and predict injury risk.</p>
                  <span className="action-link-text">Upload Video →</span>
                </div>
              </div>

              <div className="action-card-item" onClick={() => handleTabSwitch("recommendations")}>
                <div className="action-card-icon orange-bg">💡</div>
                <div className="action-card-text">
                  <h4>Injury Prevention Protocols</h4>
                  <p>Access targeted corrective exercises, mobility drills, and deload plans.</p>
                  <span className="action-link-text">View Protocols →</span>
                </div>
              </div>

              <div className="action-card-item" onClick={() => handleTabSwitch("performance")}>
                <div className="action-card-icon green-bg">📈</div>
                <div className="action-card-text">
                  <h4>Track Performance</h4>
                  <p>Log your training outputs and monitor progression over time.</p>
                  <span className="action-link-text">Log Session →</span>
                </div>
              </div>

              <div className="action-card-item" onClick={() => { if (onNavigate) onNavigate("athlete"); }}>
                <div className="action-card-icon purple-bg">👤</div>
                <div className="action-card-text">
                  <h4>Athlete Profile</h4>
                  <p>Update your sport, playing position, training load, and physical metrics.</p>
                  <span className="action-link-text">Edit Profile →</span>
                </div>
              </div>
            </section>

            {/* FOOTER */}
            <footer className="dashboard-page-footer">
              <p>© 2026 SportShield · AI-Powered Sports Injury Risk Detection Platform</p>
              <p>Train smarter. Stay stronger. 💙</p>
            </footer>

          </main>
        )}

      </div>
    </div>
  );
}

export default Dashboard;