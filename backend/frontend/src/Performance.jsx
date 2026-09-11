import React, { useState, useEffect } from "react";
import "./Performance.css";
import API_BASE from "./config/api";
import { parseErrorMessage } from "./utils/validation";

function Performance({ athleteId, athleteData, onNavigate }) {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [timeFilter, setTimeFilter] = useState("7");

  // Modal State for Adding Performance
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalSuccess, setModalSuccess] = useState("");

  const [formData, setFormData] = useState({
    activity: "Sprint Drill",
    score: 80,
    remarks: "",
  });

  const activeAthleteId = athleteId || localStorage.getItem("athlete_id");

  // Fetch Performance Records
  const fetchRecords = async () => {
    if (!activeAthleteId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(`${API_BASE}/performance/${activeAthleteId}`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data);
      } else {
        // If no records or 404, fallback to empty list
        setRecords([]);
      }
    } catch (err) {
      console.error("Error fetching performance records:", err);
      setError("Unable to load performance history. Server may be offline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [activeAthleteId]);

  // Handle Submit New Performance Record
  const handleSubmitPerformance = async (e) => {
    e.preventDefault();
    setModalError("");
    setModalSuccess("");

    if (!activeAthleteId) {
      setModalError("No active athlete profile found. Please complete profile setup.");
      return;
    }

    if (!formData.activity.trim()) {
      setModalError("Please select or enter an activity.");
      return;
    }

    const scoreNum = Number(formData.score);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setModalError("Score must be a number between 0 and 100.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/performance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          athlete_id: activeAthleteId,
          activity: formData.activity,
          score: scoreNum,
          remarks: formData.remarks || "",
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        setModalSuccess("Performance record added successfully!");
        setFormData({ activity: "Sprint Drill", score: 80, remarks: "" });
        await fetchRecords();
        setTimeout(() => {
          setIsModalOpen(false);
          setModalSuccess("");
        }, 1000);
      } else {
        const errTxt = parseErrorMessage(data, "Failed to record performance.");
        setModalError(errTxt);
      }
    } catch (err) {
      console.error(err);
      setModalError("Network error: Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate Metrics from records or athleteData
  const strengthVal = athleteData?.strength || 80;
  const flexibilityVal = athleteData?.flexibility || 75;
  const balanceVal = athleteData?.balance || 82;
  const enduranceVal = athleteData?.endurance || 72;
  const trainingLoadVal = athleteData?.training_load || 70;

  const avgScore = records.length > 0
    ? Math.round(records.reduce((acc, r) => acc + (r.score || 0), 0) / records.length)
    : Math.round((strengthVal + flexibilityVal + balanceVal + enduranceVal) / 4);

  // Prepare chart bars from records (last 7 or fallback sample)
  const chartBars = records.length > 0
    ? records.slice(0, 7).reverse().map((r, i) => ({
        label: r.recorded_at ? new Date(r.recorded_at).toLocaleDateString("en-US", { weekday: "short" }) : `Sess ${i + 1}`,
        score: Math.min(100, Math.max(0, Math.round(r.score))),
        activity: r.activity,
        date: r.recorded_at ? new Date(r.recorded_at).toLocaleDateString() : "Recent"
      }))
    : [
        { label: "Mon", score: 65, activity: "Baseline", date: "Sample" },
        { label: "Tue", score: 78, activity: "Conditioning", date: "Sample" },
        { label: "Wed", score: 72, activity: "Strength", date: "Sample" },
        { label: "Thu", score: 85, activity: "Agility", date: "Sample" },
        { label: "Fri", score: 80, activity: "Recovery", date: "Sample" },
        { label: "Sat", score: 92, activity: "Speed", date: "Sample" },
        { label: "Today", score: avgScore, activity: "Current", date: "Today" },
      ];

  return (
    <main className="performance-page">
      <div className="performance-container">

        {/* HEADER */}
        <section className="performance-header">
          <div>
            <span className="performance-kicker">PERFORMANCE CENTER</span>
            <h1>Track your athletic progress.</h1>
            <p>
              Monitor session scores, physical capability baselines, and historical progress.
            </p>
          </div>

          <div className="performance-header-actions">
            <div className="performance-status">
              <span className="status-dot"></span>
              Live Tracking Active
            </div>
            <button
              className="btn btn-primary log-btn"
              onClick={() => setIsModalOpen(true)}
            >
              + Log New Session
            </button>
          </div>
        </section>

        {error && <div className="perf-banner-error">{error}</div>}

        {/* PERFORMANCE STAT CARDS */}
        <section className="performance-stats">
          <div className="performance-stat-card">
            <div className="stat-icon blue">📊</div>
            <span>Overall Score</span>
            <strong>{avgScore}%</strong>
            <small>
              <b>{records.length}</b> total sessions recorded
            </small>
          </div>

          <div className="performance-stat-card">
            <div className="stat-icon green">💪</div>
            <span>Strength Baseline</span>
            <strong>{strengthVal}%</strong>
            <small>
              <b>{strengthVal >= 75 ? "Optimal" : "Building"}</b> capacity
            </small>
          </div>

          <div className="performance-stat-card">
            <div className="stat-icon purple">⚖️</div>
            <span>Balance & Stability</span>
            <strong>{balanceVal}%</strong>
            <small>
              <b>{balanceVal >= 80 ? "Excellent" : "Moderate"}</b> stability
            </small>
          </div>

          <div className="performance-stat-card">
            <div className="stat-icon orange">🏃</div>
            <span>Endurance</span>
            <strong>{enduranceVal}%</strong>
            <small>
              <b>{enduranceVal}%</b> cardiovascular score
            </small>
          </div>
        </section>

        {/* CHART SECTION */}
        <section className="performance-card">
          <div className="performance-card-header">
            <div>
              <h2>Performance Trend</h2>
              <p>Scores from recent athletic activity sessions.</p>
            </div>

            <div className="chart-actions">
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
              >
                <option value="7">Last 7 sessions</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 3 months</option>
              </select>
              <button
                className="btn-text-action"
                onClick={() => setIsModalOpen(true)}
              >
                + Add Record
              </button>
            </div>
          </div>

          <div className="chart">
            <div className="chart-y-axis">
              <span>100</span>
              <span>75</span>
              <span>50</span>
              <span>25</span>
              <span>0</span>
            </div>

            <div className="chart-area">
              <div className="chart-grid">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
              </div>

              <div className="bars">
                {chartBars.map((bar, idx) => (
                  <div
                    key={idx}
                    className={`bar-wrapper ${idx === chartBars.length - 1 ? "today" : ""}`}
                    title={`${bar.activity}: ${bar.score}% (${bar.date})`}
                  >
                    <div
                      className="bar"
                      style={{ height: `${bar.score}%` }}
                    >
                      <span className="bar-tooltip">{bar.score}%</span>
                    </div>
                    <span>{bar.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* PHYSICAL METRICS BREAKDOWN & RECENT LOGS */}
        <div className="performance-two-col">
          {/* Physical Capabilities */}
          <section className="performance-card">
            <div className="performance-card-header">
              <div>
                <h2>Physical Capabilities</h2>
                <p>Current athlete assessment baseline scores.</p>
              </div>
            </div>

            <div className="metric-list">
              <div className="performance-metric">
                <div className="metric-info">
                  <span>Strength</span>
                  <strong>{strengthVal}%</strong>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${strengthVal}%` }}
                  ></div>
                </div>
              </div>

              <div className="performance-metric">
                <div className="metric-info">
                  <span>Flexibility</span>
                  <strong>{flexibilityVal}%</strong>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${flexibilityVal}%` }}
                  ></div>
                </div>
              </div>

              <div className="performance-metric">
                <div className="metric-info">
                  <span>Balance</span>
                  <strong>{balanceVal}%</strong>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${balanceVal}%` }}
                  ></div>
                </div>
              </div>

              <div className="performance-metric">
                <div className="metric-info">
                  <span>Endurance</span>
                  <strong>{enduranceVal}%</strong>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ width: `${enduranceVal}%` }}
                  ></div>
                </div>
              </div>

              <div className="performance-metric">
                <div className="metric-info">
                  <span>Training Load Index</span>
                  <strong>{trainingLoadVal} / 100</strong>
                </div>
                <div className="progress-track">
                  <div
                    className="progress-fill warning"
                    style={{ width: `${trainingLoadVal}%` }}
                  ></div>
                </div>
              </div>

              <div className="baseline-explanation-box" style={{ marginTop: "1.25rem", padding: "0.85rem", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.82rem", color: "#475569" }}>
                <strong style={{ color: "#1e293b", display: "block", marginBottom: "0.25rem" }}>ℹ️ Baseline & Session Log Implementation:</strong>
                <p style={{ margin: 0, lineHeight: "1.4" }}>
                  <strong>Baseline Score:</strong> Derived as a composite average of your physical capability metrics (Strength, Flexibility, Balance, Endurance). It updates dynamically as new performance logs and movement video scores are submitted.
                </p>
                <p style={{ margin: "0.4rem 0 0 0", lineHeight: "1.4" }}>
                  <strong>Session Logs Usage:</strong> Session logs store historical outputs to track longitudinal performance trends, moving averages, and training load progression over time.
                </p>
              </div>
            </div>
          </section>

          {/* Recent Performance Logs */}
          <section className="performance-card">
            <div className="performance-card-header">
              <div>
                <h2>Recent Session Logs</h2>
                <p>Saved in performance database.</p>
              </div>
              <button
                className="refresh-btn"
                onClick={fetchRecords}
                title="Refresh Records"
              >
                🔄 Refresh
              </button>
            </div>

            {loading ? (
              <div className="loading-state">Loading recorded sessions...</div>
            ) : records.length === 0 ? (
              <div className="empty-logs">
                <span className="empty-icon">📝</span>
                <p>No performance sessions recorded yet.</p>
                <button
                  className="btn btn-secondary btn-small"
                  onClick={() => setIsModalOpen(true)}
                >
                  + Add First Session
                </button>
              </div>
            ) : (
              <div className="records-table-wrapper">
                <table className="records-table">
                  <thead>
                    <tr>
                      <th>Activity</th>
                      <th>Score</th>
                      <th>Remarks</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((rec) => (
                      <tr key={rec.record_id}>
                        <td>
                          <strong>{rec.activity}</strong>
                        </td>
                        <td>
                          <span
                            className={`score-badge ${
                              rec.score >= 80 ? "high" : rec.score >= 60 ? "med" : "low"
                            }`}
                          >
                            {rec.score}%
                          </span>
                        </td>
                        <td className="remarks-cell">
                          {rec.remarks || <span className="muted-text">—</span>}
                        </td>
                        <td className="date-cell">
                          {rec.recorded_at
                            ? new Date(rec.recorded_at).toLocaleDateString()
                            : "Recent"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* INSIGHT BANNER */}
        <section className="performance-insight">
          <div className="insight-icon">💡</div>
          <div>
            <span>BIOMECHANICAL PERFORMANCE INSIGHT</span>
            <h3>
              {avgScore >= 75
                ? "Performance is trending positively."
                : "Consistency focus recommended."}
            </h3>
            <p>
              {avgScore >= 75
                ? "Your athletic performance outputs show good symmetry and strength endurance. Maintain regular mobility routines before intense drills to keep injury risks low."
                : "Your recent session scores indicate mild fatigue accumulation. Ensure adequate recovery intervals and balance drill intensity."}
            </p>
          </div>
        </section>

      </div>

      {/* LOG PERFORMANCE MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Log Performance Record</h2>
                <p>Add a new session score to your athlete history.</p>
              </div>
              <button
                className="close-modal-btn"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitPerformance}>
              <div className="modal-body">
                {modalError && <div className="modal-feedback error">{modalError}</div>}
                {modalSuccess && <div className="modal-feedback success">{modalSuccess}</div>}

                <div className="form-group">
                  <label>Activity / Drill Type</label>
                  <select
                    value={formData.activity}
                    onChange={(e) =>
                      setFormData({ ...formData, activity: e.target.value })
                    }
                    required
                  >
                    <option value="Sprint Drill">Sprint Drill</option>
                    <option value="Squat Session">Squat Session</option>
                    <option value="Agility & Cutting Drill">Agility & Cutting Drill</option>
                    <option value="Vertical Jump Test">Vertical Jump Test</option>
                    <option value="5km Endurance Run">5km Endurance Run</option>
                    <option value="Resistance Training">Resistance Training</option>
                    <option value="Recovery Workout">Recovery Workout</option>
                    <option value="Sport-Specific Match Drill">Sport-Specific Match Drill</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Performance Score (0 - 100)</label>
                  <div className="range-input-wrapper">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.score}
                      onChange={(e) =>
                        setFormData({ ...formData, score: Number(e.target.value) })
                      }
                    />
                    <span className="score-preview">{formData.score}%</span>
                  </div>
                </div>

                <div className="form-group">
                  <label>Athlete Training Remarks / Notes (Optional)</label>
                  <textarea
                    rows="3"
                    placeholder="e.g. Excellent acceleration, slight right hip fatigue in final repetition..."
                    value={formData.remarks}
                    onChange={(e) =>
                      setFormData({ ...formData, remarks: e.target.value })
                    }
                  ></textarea>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? "Saving Record..." : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

export default Performance;
