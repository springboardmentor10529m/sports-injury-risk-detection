import React, { useState, useEffect } from "react";
import "./Recommendations.css";
import API_BASE from "./config/api";

function Recommendations({ athleteId, onNavigateToVideo }) {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Custom Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [customForm, setCustomForm] = useState({
    prediction_id: "",
    exercise: "",
    mobility: "",
    strengthening: "",
    recovery: "",
    training_modification: "",
  });

  const activeAthleteId = athleteId || localStorage.getItem("athlete_id");
  const storedPredictionId = localStorage.getItem("latest_prediction_id");
  const storedRecId = localStorage.getItem("latest_recommendation_id");

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

  // Handle Custom Recommendation Submission
  const handleCustomSubmit = async (e) => {
    e.preventDefault();
    if (!customForm.prediction_id.trim()) {
      alert("Please provide a valid Prediction ID.");
      return;
    }

    setSubmitting(true);
    try {
      const formData = new URLSearchParams();
      formData.append("prediction_id", customForm.prediction_id);
      formData.append("exercise", customForm.exercise);
      formData.append("mobility", customForm.mobility);
      formData.append("strengthening", customForm.strengthening);
      formData.append("recovery", customForm.recovery);
      formData.append("training_modification", customForm.training_modification);

      const res = await fetch(`${API_BASE}/recommendation`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setRecommendation(data);
        localStorage.setItem("latest_prediction_id", customForm.prediction_id);
        setIsModalOpen(false);
      } else {
        alert(data.detail || "Failed to save recommendation.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="recommendations-page">
      <div className="rec-container">

        {/* HEADER */}
        <section className="rec-header">
          <div>
            <span className="rec-kicker">INJURY PREVENTION PROTOCOLS</span>
            <h1>Tailored Corrective Recommendations</h1>
            <p>
              AI-generated corrective exercises, mobility drills, strengthening regimens, and training load adjustments.
            </p>
          </div>

          <div className="rec-header-actions">
            <button
              className="btn btn-secondary btn-outline"
              onClick={() => {
                setCustomForm({
                  prediction_id: storedPredictionId || "",
                  exercise: recommendation?.exercise || "",
                  mobility: recommendation?.mobility || "",
                  strengthening: recommendation?.strengthening || "",
                  recovery: recommendation?.recovery || "",
                  training_modification: recommendation?.training_modification || "",
                });
                setIsModalOpen(true);
              }}
            >
              ⚙️ Custom Protocol
            </button>
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

      {/* CUSTOM RECOMMENDATION MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Custom Clinical Protocol</h2>
                <p>Submit customized recommendations for an injury prediction.</p>
              </div>
              <button
                className="close-modal-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCustomSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Prediction ID (UUID)</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
                    value={customForm.prediction_id}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, prediction_id: e.target.value })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Corrective Exercises</label>
                  <textarea
                    rows="2"
                    required
                    value={customForm.exercise}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, exercise: e.target.value })
                    }
                  ></textarea>
                </div>

                <div className="form-group">
                  <label>Mobility Improvements</label>
                  <textarea
                    rows="2"
                    required
                    value={customForm.mobility}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, mobility: e.target.value })
                    }
                  ></textarea>
                </div>

                <div className="form-group">
                  <label>Strengthening Plan</label>
                  <textarea
                    rows="2"
                    required
                    value={customForm.strengthening}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, strengthening: e.target.value })
                    }
                  ></textarea>
                </div>

                <div className="form-group">
                  <label>Recovery Protocol</label>
                  <textarea
                    rows="2"
                    required
                    value={customForm.recovery}
                    onChange={(e) =>
                      setCustomForm({ ...customForm, recovery: e.target.value })
                    }
                  ></textarea>
                </div>

                <div className="form-group">
                  <label>Training Load Modification</label>
                  <textarea
                    rows="2"
                    required
                    value={customForm.training_modification}
                    onChange={(e) =>
                      setCustomForm({
                        ...customForm,
                        training_modification: e.target.value,
                      })
                    }
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Saving..." : "Save Protocol"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Recommendations;
