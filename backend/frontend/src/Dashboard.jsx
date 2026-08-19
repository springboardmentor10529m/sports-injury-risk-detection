import React, { useState, useEffect } from "react";
import "./Dashboard.css";
import Performance from "./Performance";
import VideoAnalysis from "./VideoAnalysis";
import Recommendations from "./Recommendations";
import API_BASE from "./config/api";

function Dashboard({ athleteData, onNavigate, onLogout }) {
  const [currentTab, setCurrentTab] = useState("overview"); // "overview" | "performance" | "video" | "recommendations"
  const [liveAthlete, setLiveAthlete] = useState(athleteData || null);
  const [recentRecords, setRecentRecords] = useState([]);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const athleteId = athleteData?.athlete_id || localStorage.getItem("athlete_id");
  const userId = athleteData?.user_id || localStorage.getItem("user_id");

  // Fetch live athlete data if not already fully populated
  useEffect(() => {
    const fetchAthleteDetails = async () => {
      const targetId = athleteId || userId;
      if (!targetId) return;

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
    };

    const fetchAthleteRecords = async () => {
      if (!athleteId) return;
      try {
        const res = await fetch(`${API_BASE}/performance/${athleteId}`);
        if (res.ok) {
          const records = await res.json();
          setRecentRecords(records);
        }
      } catch (err) {
        console.error("Error fetching performance records:", err);
      }
    };

    const fetchAnalysisSummary = async () => {
      if (!athleteId) return;
      try {
        const res = await fetch(`${API_BASE}/analysis/${athleteId}`);
        if (res.ok) {
          const analyses = await res.json();
          if (analyses.length > 0) {
            setLatestAnalysis(analyses[0]);
          }
        }
      } catch (err) {
        console.error("Error fetching analysis summary:", err);
      }
    };

    fetchAthleteDetails();
    fetchAthleteRecords();
    fetchAnalysisSummary();
  }, [athleteId, userId]);

  // Derived display values
  const athleteName = liveAthlete?.name || athleteData?.name || "Athlete";
  const userInitials = athleteName ? athleteName.charAt(0).toUpperCase() : "A";

  const trainingLoadVal = liveAthlete?.training_load ?? athleteData?.training_load ?? 70;
  const strengthVal = liveAthlete?.strength ?? athleteData?.strength ?? 80;
  const flexibilityVal = liveAthlete?.flexibility ?? athleteData?.flexibility ?? 75;
  const balanceVal = liveAthlete?.balance ?? athleteData?.balance ?? 82;
  const enduranceVal = liveAthlete?.endurance ?? athleteData?.endurance ?? 72;

  const performanceScore = recentRecords.length > 0
    ? Math.round(recentRecords.reduce((acc, r) => acc + (r.score || 0), 0) / recentRecords.length)
    : Math.round((strengthVal + flexibilityVal + balanceVal + enduranceVal) / 4);

  const riskLevel = latestAnalysis?.risk_level || "Low";

  // Chart Bars for Overview
  const chartBars = recentRecords.length > 0
    ? recentRecords.slice(0, 7).reverse().map((r, i) => ({
        day: r.recorded_at ? new Date(r.recorded_at).toLocaleDateString("en-US", { weekday: "short" }) : `S${i + 1}`,
        height: `${Math.min(100, Math.max(10, Math.round(r.score)))}%`,
        score: r.score,
        activity: r.activity,
      }))
    : [
        { day: "Mon", height: "52%", score: 52 },
        { day: "Tue", height: "65%", score: 65 },
        { day: "Wed", height: "58%", score: 58 },
        { day: "Thu", height: "76%", score: 76 },
        { day: "Fri", height: "68%", score: 68 },
        { day: "Sat", height: "84%", score: 84 },
        { day: "Today", height: `${performanceScore}%`, score: performanceScore, isToday: true },
      ];

  return (
    <div className="dashboard">

      {/* NAVBAR */}
      <nav className="dashboard-nav">
        <div
          className="brand"
          style={{ cursor: "pointer" }}
          onClick={() => setCurrentTab("overview")}
        >
          <div className="brand-icon">🏃</div>
          <span>SportShield</span>
        </div>

        <div className="nav-links">
          <a
            className={currentTab === "overview" ? "active" : ""}
            onClick={() => setCurrentTab("overview")}
          >
            Dashboard
          </a>
          <a
            className={currentTab === "performance" ? "active" : ""}
            onClick={() => setCurrentTab("performance")}
          >
            Performance
          </a>
          <a
            className={currentTab === "video" ? "active" : ""}
            onClick={() => setCurrentTab("video")}
          >
            Video Analysis
          </a>
          <a
            className={currentTab === "recommendations" ? "active" : ""}
            onClick={() => setCurrentTab("recommendations")}
          >
            Recommendations
          </a>
        </div>

        {/* PROFILE & LOGOUT DROPDOWN */}
        <div className="profile-container">
          <button
            className="profile-circle"
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            title={`${athleteName} (Click for options)`}
          >
            {userInitials}
          </button>

          {showProfileMenu && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-header">
                <strong>{athleteName}</strong>
                <span>{liveAthlete?.sport ? `${liveAthlete.sport} · ${liveAthlete.position || "Athlete"}` : "Athlete Profile"}</span>
              </div>
              <button
                className="dropdown-item"
                onClick={() => {
                  setShowProfileMenu(false);
                  if (onNavigate) onNavigate("athlete");
                }}
              >
                ✏️ Edit Profile
              </button>
              <button
                className="dropdown-item logout"
                onClick={() => {
                  setShowProfileMenu(false);
                  if (onLogout) onLogout();
                }}
              >
                🚪 Log Out
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* SUBVIEW ROUTING */}
      {currentTab === "performance" && (
        <Performance
          athleteId={athleteId}
          athleteData={liveAthlete || athleteData}
          onNavigate={onNavigate}
        />
      )}

      {currentTab === "video" && (
        <VideoAnalysis
          athleteId={athleteId}
          onNavigateToRecommendations={() => setCurrentTab("recommendations")}
        />
      )}

      {currentTab === "recommendations" && (
        <Recommendations
          athleteId={athleteId}
          onNavigateToVideo={() => setCurrentTab("video")}
        />
      )}

      {/* MAIN OVERVIEW VIEW */}
      {currentTab === "overview" && (
        <main className="dashboard-content">

          {/* WELCOME */}
          <section className="welcome-section">
            <div>
              <p className="welcome-small">ATHLETE DASHBOARD</p>
              <h1>
                Good day, {athleteName} 👋
              </h1>
              <p className="welcome-description">
                Monitor your performance, analyze movement kinematics, and stay ahead of potential injuries.
              </p>
            </div>

            <button
              className="primary-button"
              onClick={() => setCurrentTab("performance")}
            >
              + Add Performance
            </button>
          </section>

          {/* STAT CARDS */}
          <section className="stats-grid">
            <div className="stat-card" onClick={() => setCurrentTab("performance")} style={{ cursor: "pointer" }}>
              <div className="stat-top">
                <span className="stat-icon blue">📊</span>
                <span className="stat-label">PERFORMANCE</span>
              </div>
              <h2>{performanceScore}%</h2>
              <div className="stat-bottom">
                <span className="positive">↑ 8%</span>
                <span>{recentRecords.length > 0 ? `${recentRecords.length} sessions logged` : "from baseline"}</span>
              </div>
            </div>

            <div className="stat-card" onClick={() => setCurrentTab("video")} style={{ cursor: "pointer" }}>
              <div className="stat-top">
                <span className="stat-icon green">🛡️</span>
                <span className="stat-label">INJURY RISK</span>
              </div>
              <h2 className={`risk-${riskLevel.toLowerCase()}`}>{riskLevel.toUpperCase()}</h2>
              <div className="stat-bottom">
                <span className="positive">{riskLevel === "Low" ? "Healthy" : "Attention"}</span>
                <span>current status</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-icon orange">🏋️</span>
                <span className="stat-label">TRAINING</span>
              </div>
              <h2>{trainingLoadVal > 80 ? "High" : trainingLoadVal > 50 ? "Normal" : "Light"}</h2>
              <div className="stat-bottom">
                <span>{trainingLoadVal}</span>
                <span>training load index</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-top">
                <span className="stat-icon purple">🎯</span>
                <span className="stat-label">BALANCE</span>
              </div>
              <h2>{balanceVal}%</h2>
              <div className="stat-bottom">
                <span className="positive">Optimal</span>
                <span>stability score</span>
              </div>
            </div>
          </section>

          {/* MAIN GRID */}
          <section className="dashboard-grid">

            {/* PERFORMANCE OVERVIEW */}
            <div className="dashboard-card performance-card">
              <div className="card-header">
                <div>
                  <h3>Performance Overview</h3>
                  <p>Recent athletic performance outputs</p>
                </div>
                <button
                  className="view-button"
                  onClick={() => setCurrentTab("performance")}
                >
                  View details →
                </button>
              </div>

              <div className="chart-container">
                <div className="chart-y">
                  <span>100</span>
                  <span>75</span>
                  <span>50</span>
                  <span>25</span>
                  <span>0</span>
                </div>

                <div className="chart">
                  <div className="grid-line line-1"></div>
                  <div className="grid-line line-2"></div>
                  <div className="grid-line line-3"></div>
                  <div className="grid-line line-4"></div>

                  <div className="bars">
                    {chartBars.map((bar, i) => (
                      <div key={i} className="bar-column" title={`${bar.activity || "Session"}: ${bar.score}%`}>
                        <div
                          className={`bar ${bar.isToday || i === chartBars.length - 1 ? "today" : ""}`}
                          style={{ height: bar.height }}
                        ></div>
                        <span>{bar.day}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* RISK CARD */}
            <div className="dashboard-card risk-card">
              <div className="card-header">
                <div>
                  <h3>Injury Risk</h3>
                  <p>Biomechanical assessment</p>
                </div>
                <span className={`status-dot ${riskLevel.toLowerCase()}`}></span>
              </div>

              <div className="risk-circle">
                <div className="circle-inner">
                  <strong className={`risk-text-${riskLevel.toLowerCase()}`}>{riskLevel.toUpperCase()}</strong>
                  <span>Risk Level</span>
                </div>
              </div>

              <div className="risk-message">
                <span>{riskLevel === "Low" ? "✓" : "⚠️"}</span>
                <div>
                  <strong>{riskLevel === "Low" ? "You're doing well!" : "Caution advised"}</strong>
                  <p>
                    {riskLevel === "Low"
                      ? "Keep maintaining your current training and recovery routine."
                      : "Joint deviation detected. Review corrective exercises."}
                  </p>
                </div>
              </div>
            </div>

          </section>

          {/* QUICK ACTIONS */}
          <section className="section-heading">
            <div>
              <h2>Quick Actions</h2>
              <p>Tools to help you monitor and improve your performance</p>
            </div>
          </section>

          <section className="action-grid">
            <div className="action-card" onClick={() => setCurrentTab("video")} style={{ cursor: "pointer" }}>
              <div className="action-icon blue-bg">🎥</div>
              <div className="action-content">
                <h3>Analyze Movement</h3>
                <p>Upload a training video and analyze your movement kinematic patterns.</p>
                <button onClick={() => setCurrentTab("video")}>
                  Upload Video →
                </button>
              </div>
            </div>

            <div className="action-card" onClick={() => setCurrentTab("performance")} style={{ cursor: "pointer" }}>
              <div className="action-icon green-bg">📈</div>
              <div className="action-content">
                <h3>Record Performance</h3>
                <p>Add your latest training score and track longitudinal progress.</p>
                <button onClick={() => setCurrentTab("performance")}>
                  Add Performance →
                </button>
              </div>
            </div>

            <div className="action-card" onClick={() => setCurrentTab("recommendations")} style={{ cursor: "pointer" }}>
              <div className="action-icon orange-bg">💡</div>
              <div className="action-content">
                <h3>View Recommendations</h3>
                <p>Access customized injury prevention drills and recovery guidance.</p>
                <button onClick={() => setCurrentTab("recommendations")}>
                  View Recommendations →
                </button>
              </div>
            </div>
          </section>

          {/* BOTTOM GRID */}
          <section className="bottom-grid">
            <div className="dashboard-card training-card">
              <div className="card-header">
                <div>
                  <h3>Training Capability Summary</h3>
                  <p>Current athlete baseline scores</p>
                </div>
              </div>

              <div className="training-items">
                <div>
                  <span>Training Load</span>
                  <strong>{trainingLoadVal}</strong>
                </div>
                <div>
                  <span>Flexibility</span>
                  <strong>{flexibilityVal}%</strong>
                </div>
                <div>
                  <span>Strength</span>
                  <strong>{strengthVal}%</strong>
                </div>
                <div>
                  <span>Endurance</span>
                  <strong>{enduranceVal}%</strong>
                </div>
              </div>
            </div>

            <div className="dashboard-card account-card">
              <div className="account-icon">👤</div>
              <div>
                <span>ATHLETE ACCOUNT</span>
                <h3>{liveAthlete?.sport ? `${liveAthlete.sport} Profile Active` : "Profile Active"}</h3>
                <p>
                  {liveAthlete?.position ? `Playing Position: ${liveAthlete.position}` : "Keep your athlete information updated for accurate predictions."}
                </p>
                <button
                  className="secondary-button"
                  onClick={() => {
                    if (onNavigate) onNavigate("athlete");
                  }}
                >
                  Edit Profile →
                </button>
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer>
            <p>© 2026 SportShield · Sports Injury Risk Detection Platform</p>
            <p>Train smarter. Stay stronger. 💙</p>
          </footer>

        </main>
      )}

    </div>
  );
}

export default Dashboard;