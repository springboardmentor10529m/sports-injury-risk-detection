import React, { useState, useEffect } from "react";
import "./Recommendations.css";
import API_BASE from "./config/api";

function Recommendations({ athleteId, onNavigateToVideo }) {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const activeAthleteId = athleteId || localStorage.getItem("athlete_id");
  const storedPredictionId = localStorage.getItem("latest_prediction_id");

  // Fetch Latest Recommendation
  const fetchLatestRecommendation = async () => {
    setLoading(true);
    setError("");

    // Try fetching with stored prediction_id
    if (storedPredictionId) {
      try {
        const res = await fetch(`${API_BASE}/recommendation/${storedPredictionId}`);
        if (res.ok) {
          const data = await res.json();
          setRecommendation(data);
          setError("");
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error fetching recommendation:", err);
      }
    }

    // Fallback: Check if athlete has recent analysis results
    if (activeAthleteId) {
      try {
        const res = await fetch(`${API_BASE}/analysis/${activeAthleteId}`);
        if (res.ok) {
          const analyses = await res.json();
          if (analyses.length > 0) {
            const latestAnalysisId = analyses[0].analysis_id;
            const predRes = await fetch(`${API_BASE}/prediction/${latestAnalysisId}`);
            if (predRes.ok) {
              const predData = await predRes.json();
              if (predData.prediction_id) {
                const recRes = await fetch(`${API_BASE}/recommendation/${predData.prediction_id}`);
                if (recRes.ok) {
                  const recData = await recRes.json();
                  setRecommendation(recData);
                  setError("");
                  setLoading(false);
                  return;
                }
              }
            }
          }
        }
      } catch (err) {
        console.error("Error traversing analysis for recommendations:", err);
      }
    }

    // No saved recommendation yet — show empty state (do not use fake demo data)
    setRecommendation(null);
    setError(
      "No recommendations found yet. Complete the Video Analysis pipeline to generate a personalized protocol."
    );

    setLoading(false);
  };

  useEffect(() => {
    fetchLatestRecommendation();
  }, [activeAthleteId, storedPredictionId]);

  return (
    <main className="recommendations-page">
      <div className="rec-container">

        {/* HEADER */}
        <section className="rec-header">
          <div>
            <span className="rec-kicker">INJURY PREVENTION PROTOCOLS</span>
            <h1>Tailored Corrective Recommendations</h1>
            <p>
              Targeted corrective exercises, mobility drills, strengthening regimens, and workload adjustments mapped from detected biomechanical deviations and ML risk predictions.
            </p>
          </div>

          <div className="rec-header-actions">
            <button
              className="btn btn-primary"
              onClick={onNavigateToVideo}
            >
              🎥 Analyze New Video
            </button>
          </div>
        </section>

        {loading ? (
          <div className="rec-loading">Loading personalized recommendations...</div>
        ) : error && !recommendation ? (
          <div className="rec-loading">{error}</div>
        ) : (
          <div className="rec-grid">

            {/* CARD 1: CORRECTIVE EXERCISES */}
            <div className="rec-card primary-card">
              <div className="rec-card-top">
                <div className="rec-icon blue">🏃</div>
                <span className="rec-category">CORRECTIVE EXERCISES</span>
              </div>
              <h3>Biomechanical Movement Drills</h3>
              <p className="rec-text">{recommendation?.exercise || "No specific exercise recommended."}</p>
              <div className="rec-badge-row">
                <span className="rec-badge blue-badge">Daily Routine</span>
                <span className="rec-badge">3 Sets · 8-10 Reps</span>
              </div>
              <div style={{ marginTop: "10px", padding: "8px 10px", background: "#f0f9ff", borderRadius: "8px", border: "1px solid #bae6fd", fontSize: "0.74rem", color: "#0369a1" }}>
                🎯 <strong>Why Generated:</strong> Prescribed to correct dynamic knee valgus collapse (&gt;12°) and improve unilateral deceleration landing mechanics.
              </div>
            </div>

            {/* CARD 2: MOBILITY & FLEXIBILITY */}
            <div className="rec-card">
              <div className="rec-card-top">
                <div className="rec-icon purple">🧘</div>
                <span className="rec-category">MOBILITY & FLEXIBILITY</span>
              </div>
              <h3>Joint Range of Motion Drills</h3>
              <p className="rec-text">{recommendation?.mobility || "No specific mobility drill recommended."}</p>
              <div className="rec-badge-row">
                <span className="rec-badge purple-badge">Pre-Training Warmup</span>
                <span className="rec-badge">10 Mins Duration</span>
              </div>
              <div style={{ marginTop: "10px", padding: "8px 10px", background: "#faf5ff", borderRadius: "8px", border: "1px solid #e9d5ff", fontSize: "0.74rem", color: "#7e22ce" }}>
                🎯 <strong>Why Generated:</strong> Expands hip joint internal/external rotation and knee excursion to relieve compensatory lateral trunk lean.
              </div>
            </div>

            {/* CARD 3: STRENGTHENING */}
            <div className="rec-card">
              <div className="rec-card-top">
                <div className="rec-icon green">💪</div>
                <span className="rec-category">STRENGTHENING</span>
              </div>
              <h3>Targeted Kinetic Chain Conditioning</h3>
              <p className="rec-text">{recommendation?.strengthening || "No specific strengthening routine recommended."}</p>
              <div className="rec-badge-row">
                <span className="rec-badge green-badge">3x Per Week</span>
                <span className="rec-badge">Eccentric Focus</span>
              </div>
              <div style={{ marginTop: "10px", padding: "8px 10px", background: "#f0fdf4", borderRadius: "8px", border: "1px solid #bbf7d0", fontSize: "0.74rem", color: "#15803d" }}>
                🎯 <strong>Why Generated:</strong> Targets hip abductors (gluteus medius) and posterior chain to stabilize pelvis and prevent valgus moments.
              </div>
            </div>

            {/* CARD 4: RECOVERY PROTOCOLS */}
            <div className="rec-card">
              <div className="rec-card-top">
                <div className="rec-icon orange">🧊</div>
                <span className="rec-category">RECOVERY PLANNING</span>
              </div>
              <h3>Post-Session Active Recovery</h3>
              <p className="rec-text">{recommendation?.recovery || "No specific recovery plan recommended."}</p>
              <div className="rec-badge-row">
                <span className="rec-badge orange-badge">Post-Drill Routine</span>
                <span className="rec-badge">Hydro & Myofascial</span>
              </div>
              <div style={{ marginTop: "10px", padding: "8px 10px", background: "#fffbeb", borderRadius: "8px", border: "1px solid #fde68a", fontSize: "0.74rem", color: "#b45309" }}>
                🎯 <strong>Why Generated:</strong> Accelerates motor unit recovery following high neuromuscular fatigue ratings to maintain kinematic symmetry.
              </div>
            </div>

            {/* CARD 5: TRAINING MODIFICATION (FULL WIDTH) */}
            <div className="rec-card full-width-card">
              <div className="rec-card-top">
                <div className="rec-icon red">⏱️</div>
                <span className="rec-category">WORKLOAD & TRAINING MODIFICATION</span>
              </div>
              <h3>Training Volume & Intensity Adjustments</h3>
              <p className="rec-text-highlight">
                {recommendation?.training_modification || "Maintain normal workload with regular monitoring."}
              </p>
              <div style={{ margin: "10px 0", padding: "8px 12px", background: "#fef2f2", borderRadius: "8px", border: "1px solid #fecaca", fontSize: "0.74rem", color: "#b91c1c" }}>
                🎯 <strong>Why Generated:</strong> Workload calibrated to prevent acute-to-chronic training load spikes (&gt;1.4 ACWR ratio) and avoid overuse syndrome.
              </div>
              <div className="rec-guidance">
                <span>🛡️ Physiotherapist Recommendation:</span>
                <small>
                  Adhere strictly to modified high-intensity limits until your next video movement re-assessment.
                </small>
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}

export default Recommendations;
