import React, { useState, useEffect, useRef } from "react";
import "./VideoAnalysis.css";
import API_BASE from "./config/api";
import { parseErrorMessage } from "./utils/validation";

// Activities supported for biomechanical analysis
const SUPPORTED_ACTIVITIES = [
  "Running",
  "Sprinting",
  "Jumping",
  "Squatting",
  "Landing Mechanics",
  "Throwing",
  "Cutting Movements",
];

// 7-step pipeline stages shown during analysis
const PIPELINE_STAGES = [
  { id: 1, label: "Upload Video",                        desc: "Transferring and validating video file on server" },
  { id: 2, label: "Detecting Movement",                 desc: "Running MediaPipe pose estimation (33 3D spatial landmarks)" },
  { id: 3, label: "Extracting Features",                desc: "Calculating knee valgus, hip stability, trunk lean, ROM, symmetry" },
  { id: 4, label: "Anomaly Detection",                  desc: "Comparing kinematics against normative athlete distributions (Z-scores)" },
  { id: 5, label: "Applying Previous Injury Information", desc: "Factoring recorded athlete prior injuries into risk weighting" },
  { id: 6, label: "Calculating Risk Score",             desc: "Running deterministic 6-injury physiological scoring rules & ML inference" },
  { id: 7, label: "Generating Recommendations",         desc: "Synthesizing personalized corrective drills, recovery & workload protocols" },
];

function VideoAnalysis({ athleteId, onNavigateToRecommendations }) {
  const activeAthleteId = athleteId || localStorage.getItem("athlete_id");

  // ─── Upload form state ───────────────────────────────────────────
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [activity, setActivity] = useState("Running");

  // ─── Pipeline state ──────────────────────────────────────────────
  const [processing, setProcessing] = useState(false);   // true while auto-run is active
  const [pipelineStage, setPipelineStage] = useState(0); // 0 = idle, 1–7 = current stage, 8 = complete
  const [pipelineError, setPipelineError] = useState(""); // stage-level error message

  // ─── Results from completed analysis ─────────────────────────────
  const [analysisResult, setAnalysisResult] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(false); // true when showing a past result

  // ─── General notifications ────────────────────────────────────────
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // ─── Video upload history ─────────────────────────────────────────
  const [videoHistory, setVideoHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState(null);

  const fileInputRef = useRef(null);

  // Helper to load analysis results from an item into active state
  const loadHistoryItem = (item) => {
    if (!item) return;
    setSelectedHistoryId(item.video_id);
    localStorage.setItem("active_video_id", item.video_id);
    if (item.video_url) {
      setVideoPreviewUrl(`${API_BASE}${item.video_url}`);
    }
    if (!item.analysis) return;
    setViewingHistory(true);
    setErrorMsg("");
    setSuccessMsg("");
    setPipelineError("");
    setProcessing(false);
    setPipelineStage(8); // Mark all stages completed for past result

    const kv = item.analysis.knee_valgus || 12.0;
    const hs = item.analysis.hip_stability || 80.0;
    const tl = item.analysis.trunk_lean || 8.0;

    // Build or recover anomaly indicators
    const derivedAnomalies = item.analysis.anomalies && item.analysis.anomalies.length > 0
      ? item.analysis.anomalies
      : [
          {
            metric: "knee_valgus",
            status: kv > 15.0 ? "ANOMALOUS" : (kv > 12.0 ? "BORDERLINE" : "OPTIMAL"),
            observed_value: `${kv}°`,
            expected_range: "< 12.0°",
            z_score: Number(((kv - 16.5) / 4.46).toFixed(2)),
            severity: kv > 15.0 ? "HIGH" : (kv > 12.0 ? "MODERATE" : "LOW"),
            is_anomaly: kv > 15.0,
            clinical_concern: kv > 15.0 ? "Medial knee collapse elevates non-contact ACL strain." : "Frontal plane knee alignment stable."
          },
          {
            metric: "hip_stability",
            status: hs < 65.0 ? "ANOMALOUS" : (hs < 75.0 ? "BORDERLINE" : "OPTIMAL"),
            observed_value: `${hs}/100`,
            expected_range: "> 80.0",
            z_score: Number(((hs - 72.57) / 12.04).toFixed(2)),
            severity: hs < 65.0 ? "HIGH" : (hs < 75.0 ? "MODERATE" : "LOW"),
            is_anomaly: hs < 65.0,
            clinical_concern: hs < 65.0 ? "Pelvic drop indicates gluteus medius weakness." : "Level pelvis maintained during stance."
          },
          {
            metric: "trunk_lean",
            status: tl > 10.0 ? "ANOMALOUS" : (tl > 7.0 ? "BORDERLINE" : "OPTIMAL"),
            observed_value: `${tl}°`,
            expected_range: "< 6.0°",
            z_score: Number(((tl - 7.74) / 3.33).toFixed(2)),
            severity: tl > 10.0 ? "HIGH" : (tl > 7.0 ? "MODERATE" : "LOW"),
            is_anomaly: tl > 10.0,
            clinical_concern: tl > 10.0 ? "Lateral trunk sway increases lumbar shear forces." : "Torso alignment upright."
          }
        ];

    setAnalysisResult({
      analysis_id: item.analysis.analysis_id,
      video_id: item.video_id,
      detected_activity: item.activity,
      overall_risk_score: item.analysis.overall_risk_score,
      risk_level: item.analysis.risk_level,
      knee_valgus: item.analysis.knee_valgus,
      hip_stability: item.analysis.hip_stability,
      trunk_lean: item.analysis.trunk_lean,
      stride_length: item.analysis.stride_length,
      joint_alignment: item.analysis.joint_alignment,
      symmetry_score: item.analysis.symmetry_score,
      fatigue_score: item.analysis.fatigue_score,
      movement_quality: item.analysis.movement_quality,
      anomalies: derivedAnomalies,
      history_notes: item.analysis.history_notes || [],
      rules_triggered: item.analysis.rules_triggered || [],
      position_applied_msg: item.analysis.position_applied_msg || "",
    });

    if (item.analysis.prediction) {
      setPredictionResult({
        ...item.analysis.prediction,
        overall_risk_score: item.analysis.overall_risk_score,
        risk_level: item.analysis.risk_level,
        rules_triggered: item.analysis.rules_triggered || [],
        injury_factors: item.analysis.prediction.injury_factors || {},
        position_applied_msg: item.analysis.position_applied_msg || "",
      });
      localStorage.setItem("latest_prediction_id", item.analysis.prediction.prediction_id);
    } else {
      setPredictionResult(null);
    }
  };

  // ─── Fetch history (videos with analysis data joined) ─────────────
  const fetchHistory = async (autoRestore = true) => {
    if (!activeAthleteId) return;
    try {
      setLoadingHistory(true);
      const res = await fetch(`${API_BASE}/videos/with-analysis/${activeAthleteId}`);
      if (res.ok) {
        const data = await res.json();
        setVideoHistory(data);

        // Auto-restore previous analysis after page refresh or initial load
        if (autoRestore && data && data.length > 0) {
          const savedVideoId = localStorage.getItem("active_video_id");
          let match = savedVideoId ? data.find((v) => v.video_id === savedVideoId && v.analysis) : null;
          if (!match) {
            match = data.find((v) => v.analysis);
          }
          if (match && !selectedFile && !processing) {
            loadHistoryItem(match);
          }
        }
      }
    } catch (err) {
      console.error("Error loading video history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory(true);
  }, [activeAthleteId]);

  // ─── File selection ───────────────────────────────────────────────
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setErrorMsg("");
      setSuccessMsg("");
      setPipelineError("");
      setAnalysisResult(null);
      setPredictionResult(null);
      setViewingHistory(false);
      setSelectedHistoryId(null);
      const localUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(localUrl);
    }
  };

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  // ─── Full auto-run pipeline ───────────────────────────────────────
  // Runs all 7 stages sequentially with live status updates without freeze
  const handleAnalyzeVideo = async (e) => {
    e.preventDefault();
    if (!activeAthleteId) {
      setErrorMsg("Athlete profile missing. Please complete your profile setup first.");
      return;
    }
    if (!selectedFile) {
      setErrorMsg("Please select a video file (.mp4, .mov, etc.) to upload.");
      return;
    }

    setProcessing(true);
    setPipelineStage(1);
    setPipelineError("");
    setErrorMsg("");
    setSuccessMsg("");
    setAnalysisResult(null);
    setPredictionResult(null);
    setViewingHistory(false);

    let progressInterval = null;

    try {
      // ── STAGE 1: Upload Video ─────────────────────────────────────
      setPipelineStage(1);
      const formData = new FormData();
      formData.append("athlete_id", activeAthleteId);
      formData.append("activity", activity);
      formData.append("video", selectedFile);

      const uploadRes = await fetch(`${API_BASE}/video/upload`, {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadData.video_id) {
        throw new Error(uploadData.detail || uploadData.message || "Video upload failed. Check file format and size.");
      }
      const videoId = uploadData.video_id;
      localStorage.setItem("active_video_id", videoId);
      if (uploadData.video_url) {
        setVideoPreviewUrl(`${API_BASE}${uploadData.video_url}`);
      }

      // ── STAGES 2 to 5: Run video analysis on backend ─────────────
      setPipelineStage(2);

      // Smooth progression through backend sub-stages (2 -> 3 -> 4 -> 5)
      let currentStage = 2;
      progressInterval = setInterval(() => {
        if (currentStage < 5) {
          currentStage += 1;
          setPipelineStage(currentStage);
        }
      }, 1400);

      const analysisFormData = new URLSearchParams();
      analysisFormData.append("video_id", videoId);
      analysisFormData.append("athlete_id", activeAthleteId);

      const analysisRes = await fetch(`${API_BASE}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: analysisFormData,
      });

      if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
      }

      const analysisData = await analysisRes.json().catch(() => ({}));
      if (!analysisRes.ok || !analysisData.analysis_id) {
        throw new Error(analysisData.detail || analysisData.message || "Video biomechanical analysis failed on backend.");
      }

      // Mark Stage 5 complete, advance to Stage 6
      setPipelineStage(6);

      // ── STAGE 6: Calculate Risk Score (Multi-rule & ML) ───────────
      const predFormData = new URLSearchParams();
      predFormData.append("analysis_id", analysisData.analysis_id);

      const predRes = await fetch(`${API_BASE}/prediction`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: predFormData,
      });

      const predData = await predRes.json().catch(() => ({}));
      if (!predRes.ok || !predData.prediction_id) {
        throw new Error(predData.detail || predData.message || "Injury risk score calculation failed.");
      }

      // ── STAGE 7: Generate Recommendations ─────────────────────────
      setPipelineStage(7);
      localStorage.setItem("latest_prediction_id", predData.prediction_id);
      localStorage.setItem("active_video_id", videoId);

      // Small visual pause so the user sees Stage 7 finalize
      await delay(400);

      // ── STAGE 8: All Stages Complete ──────────────────────────────
      setPipelineStage(8);
      setAnalysisResult(analysisData);
      setPredictionResult(predData);
      setSuccessMsg("Video analysis complete! All 7 processing stages finished successfully.");
      setProcessing(false);

      // Refresh upload history so this new video and its analysis appear immediately
      fetchHistory(false);

    } catch (err) {
      if (progressInterval) {
        clearInterval(progressInterval);
      }
      console.error("Pipeline error:", err);
      setPipelineError(err.message || "An unexpected error occurred during processing.");
      setProcessing(false);
      // NOTE: We do not reset pipelineStage to 0, so user sees which stage had an issue!
    }
  };

  // ─── Click-to-view previous analysis from history ─────────────────
  const handleViewHistoryItem = (item) => {
    loadHistoryItem(item);
  };

  // ─── Reset to new upload ──────────────────────────────────────────
  const handleResetAnalysis = () => {
    setSelectedFile(null);
    setVideoPreviewUrl("");
    setAnalysisResult(null);
    setPredictionResult(null);
    setPipelineStage(0);
    setPipelineError("");
    setErrorMsg("");
    setSuccessMsg("");
    setViewingHistory(false);
    setSelectedHistoryId(null);
    setProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ─── Risk colour helper ───────────────────────────────────────────
  const riskColour = (level) => {
    if (!level) return "#64748b";
    const l = level.toLowerCase();
    if (l === "high") return "#dc2626";
    if (l === "moderate") return "#d97706";
    return "#16a34a";
  };

  const riskBg = (level) => {
    if (!level) return "#f1f5f9";
    const l = level.toLowerCase();
    if (l === "high") return "#fecaca";
    if (l === "moderate") return "#fef3c7";
    return "#dcfce7";
  };

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────

  return (
    <main className="video-analysis-page">
      <div className="va-container">

        {/* ── HEADER ── */}
        <section className="va-header">
          <div>
            <span className="va-kicker">COMPUTER VISION & BIOMECHANICS ENGINE</span>
            <h1>Movement Video Analysis</h1>
            <p>
              Upload a training video to extract joint biomechanics, assess movement quality,
              and evaluate injury risks. Complete video analysis and risk calculation with a single click.
            </p>
          </div>
        </section>

        {/* ── PIPELINE ARCHITECTURE FLOW ── */}
        <div style={{
          background: "white", padding: "18px 24px", borderRadius: "14px",
          border: "1px solid #e2e8f0", marginBottom: "24px",
          boxShadow: "0 4px 12px rgba(15, 23, 42, 0.03)"
        }}>
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            marginBottom: "12px", borderBottom: "1px solid #f1f5f9", paddingBottom: "8px"
          }}>
            <span style={{ fontSize: "11px", fontWeight: 800, color: "#2457d6", letterSpacing: "1px", textTransform: "uppercase" }}>
              🔬 End-to-End Processing Architecture
            </span>
            <span style={{ fontSize: "11px", color: "#64748b" }}>
              {processing
                ? `Running Stage ${pipelineStage}/7: ${PIPELINE_STAGES[pipelineStage - 1]?.label || "Processing..."}`
                : pipelineStage === 8 ? "All stages complete ✓"
                : "Awaiting video upload"}
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "8px" }}>
            {[
              { num: "01", name: "Video Input",        desc: "MP4/MOV upload" },
              { num: "02", name: "MediaPipe Pose",     desc: "Vision ML (33 pts)" },
              { num: "03", name: "Feature Extract",    desc: "Angles & ROM" },
              { num: "04", name: "Anomaly Detect",     desc: "Z-score analysis" },
              { num: "05", name: "Prior Injuries",     desc: "Recorded info" },
              { num: "06", name: "Risk Rules & ML",    desc: "6-injury scoring" },
              { num: "07", name: "Recommendations",    desc: "5 prescriptions" },
            ].map((step, idx) => {
              const stageNum = idx + 1;
              const isDone = pipelineStage > stageNum || pipelineStage === 8 || (viewingHistory && analysisResult);
              const isActive = pipelineStage === stageNum;
              return (
                <div
                  key={idx}
                  style={{
                    background: isDone ? "#f0fdf4" : (isActive ? "#eff6ff" : "#f8fafc"),
                    border: `1px solid ${isDone ? "#86efac" : (isActive ? "#93c5fd" : "#e2e8f0")}`,
                    borderRadius: "10px",
                    padding: "10px 8px",
                    textAlign: "center",
                    transition: "all 0.3s ease",
                    animation: isActive ? "pulse 1s ease-in-out infinite" : "none",
                  }}
                >
                  <div style={{
                    width: "22px", height: "22px", borderRadius: "50%",
                    background: isDone ? "#22c55e" : (isActive ? "#2563eb" : "#cbd5e1"),
                    color: "white", fontSize: "11px", fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 6px"
                  }}>
                    {isDone ? "✓" : step.num}
                  </div>
                  <div style={{
                    fontSize: "12px", fontWeight: 700,
                    color: isDone ? "#166534" : (isActive ? "#1e40af" : "#475569"),
                    marginBottom: "2px"
                  }}>
                    {step.name}
                  </div>
                  <div style={{ fontSize: "10px", color: "#64748b" }}>
                    {step.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="va-content">

          {/* ── NOTIFICATIONS ── */}
          {pipelineError && (
            <div className="va-alert error">
              <strong>Processing failed:</strong> {pipelineError}
              <br />
              <small>Please check the backend terminal for details, then try again.</small>
            </div>
          )}
          {errorMsg && <div className="va-alert error">{errorMsg}</div>}
          {successMsg && <div className="va-alert success">{successMsg}</div>}

          {/* ── VIEWING HISTORY BANNER ── */}
          {viewingHistory && (
            <div style={{
              background: "#fefce8", border: "1px solid #fde68a", borderRadius: "10px",
              padding: "10px 16px", marginBottom: "16px", fontSize: "0.82rem",
              color: "#92400e"
            }}>
              📁 <strong>Viewing past analysis</strong> — loaded from database history. Click &ldquo;+ Analyze New Video&rdquo; below to start a new analysis.
            </div>
          )}

          <div className="va-layout">

            {/* ── LEFT COLUMN: UPLOAD FORM + HISTORY ── */}
            <div className="va-left-panel">

              {/* Upload card */}
              <div className="va-card">
                <div className="card-heading">
                  <h3>📹 Training Video Input</h3>
                  <span className="status-badge">
                    {processing ? "Processing..." : analysisResult ? "Analysed" : "Ready"}
                  </span>
                </div>

                {!viewingHistory && (
                  <form onSubmit={handleAnalyzeVideo} className="upload-form">
                    {/* Drop zone */}
                    <div
                      className="dropzone"
                      onClick={() => !processing && fileInputRef.current?.click()}
                      style={{ cursor: processing ? "not-allowed" : "pointer", opacity: processing ? 0.6 : 1 }}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                        onChange={handleFileChange}
                        disabled={processing}
                      />
                      <div className="dropzone-icon">🎥</div>
                      {selectedFile ? (
                        <div className="selected-file-info">
                          <strong>{selectedFile.name}</strong>
                          <span>{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                        </div>
                      ) : (
                        <div className="dropzone-prompt">
                          <strong>Click or Drag &amp; Drop Training Video</strong>
                          <span>Supports MP4, MOV, WEBM (Max 50 MB)</span>
                        </div>
                      )}
                    </div>

                    {/* Preview */}
                    {videoPreviewUrl && (
                      <video
                        src={videoPreviewUrl}
                        controls
                        muted
                        style={{ width: "100%", borderRadius: "8px", marginTop: "10px", maxHeight: "180px" }}
                      />
                    )}

                    {/* Activity selector */}
                    <div className="form-group-activity">
                      <label>Activity Type</label>
                      <select
                        value={activity}
                        onChange={(e) => setActivity(e.target.value)}
                        disabled={processing}
                      >
                        {SUPPORTED_ACTIVITIES.map((act) => (
                          <option key={act} value={act}>{act}</option>
                        ))}
                      </select>
                      <small style={{ display: "block", marginTop: "0.35rem", fontSize: "0.75rem", color: "#64748b" }}>
                        Actual movement activity is also auto-detected from video pose kinematics.
                      </small>
                    </div>

                    {/* 7-step progress indicator during processing */}
                    {processing && (
                      <div style={{
                        background: "#f0f9ff", border: "1px solid #bae6fd",
                        borderRadius: "10px", padding: "14px 16px", marginTop: "12px"
                      }}>
                        <div style={{ fontSize: "12px", fontWeight: 700, color: "#0369a1", marginBottom: "10px" }}>
                          ⚡ Processing your video — please wait...
                        </div>
                        {PIPELINE_STAGES.map((stage) => {
                          const done = pipelineStage > stage.id;
                          const active = pipelineStage === stage.id;
                          return (
                            <div key={stage.id} style={{
                              display: "flex", alignItems: "flex-start", gap: "10px",
                              marginBottom: "8px", opacity: done || active ? 1 : 0.4,
                              transition: "opacity 0.3s"
                            }}>
                              <div style={{
                                width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                                background: done ? "#22c55e" : (active ? "#2563eb" : "#e2e8f0"),
                                color: "white", fontSize: "10px", fontWeight: 800,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                animation: active ? "pulse 1s infinite" : "none"
                              }}>
                                {done ? "✓" : active ? "●" : "○"}
                              </div>
                              <div>
                                <div style={{
                                  fontSize: "12px", fontWeight: active ? 700 : 600,
                                  color: done ? "#166534" : (active ? "#1e40af" : "#94a3b8")
                                }}>
                                  {stage.label}
                                </div>
                                {active && (
                                  <div style={{ fontSize: "11px", color: "#64748b" }}>{stage.desc}</div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="btn btn-primary btn-full"
                      disabled={!selectedFile || processing}
                      style={{ marginTop: "14px" }}
                    >
                      {processing
                        ? `Stage ${pipelineStage}/7 — ${PIPELINE_STAGES[Math.max(0, pipelineStage - 1)]?.label || "Processing"}...`
                        : "Analyze Video →"}
                    </button>
                  </form>
                )}

                {/* When viewing a history item — show its video player & summary */}
                {viewingHistory && analysisResult && (
                  <div style={{ padding: "12px 0" }}>
                    {videoPreviewUrl && (
                      <div style={{ marginBottom: "12px" }}>
                        <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                          📹 Video Recording
                        </div>
                        <video
                          src={videoPreviewUrl}
                          controls
                          muted
                          style={{ width: "100%", borderRadius: "8px", maxHeight: "200px", background: "#000" }}
                        />
                      </div>
                    )}
                    <div style={{
                      background: "#f8fafc", borderRadius: "8px", padding: "12px",
                      fontSize: "0.82rem", color: "#475569"
                    }}>
                      <strong style={{ color: "#0f172a" }}>Past Analysis Loaded</strong>
                      <div style={{ marginTop: "6px" }}>
                        Activity: <strong>{analysisResult.detected_activity || "—"}</strong>
                      </div>
                      <div>
                        Overall Risk: <strong style={{ color: riskColour(analysisResult.risk_level) }}>
                          {analysisResult.risk_level} ({analysisResult.overall_risk_score}/100)
                        </strong>
                      </div>
                    </div>
                    <button
                      className="btn btn-primary btn-full"
                      onClick={handleResetAnalysis}
                      style={{ marginTop: "12px" }}
                    >
                      + Analyze New Video
                    </button>
                  </div>
                )}
              </div>

              {/* ── Upload History Card ── */}
              <div className="va-card history-card">
                <div className="card-heading">
                  <h3>📁 Upload History</h3>
                  <span className="badge-count">{videoHistory.length}</span>
                </div>

                {loadingHistory ? (
                  <p className="loading-txt">Loading history...</p>
                ) : videoHistory.length === 0 ? (
                  <p className="empty-txt">No previous videos for this athlete.</p>
                ) : (
                  <div className="history-list">
                    {videoHistory.map((v) => {
                      const isSelected = selectedHistoryId === v.video_id;
                      const hasAnalysis = !!v.analysis;
                      return (
                        <div
                          key={v.video_id}
                          className={`history-item ${isSelected ? "history-item-selected" : ""} ${hasAnalysis ? "clickable" : ""}`}
                          onClick={() => hasAnalysis && handleViewHistoryItem(v)}
                          title={hasAnalysis ? "Click to view analysis results" : "Analysis pending"}
                          style={{
                            cursor: hasAnalysis ? "pointer" : "default",
                            border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                            borderRadius: "10px",
                            padding: "10px 12px",
                            marginBottom: "8px",
                            background: isSelected ? "#eff6ff" : "white",
                            transition: "all 0.2s"
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                            <div className="hist-icon">🎬</div>
                            <div className="hist-info" style={{ flex: 1, minWidth: 0 }}>
                              <strong style={{ fontSize: "13px", color: "#0f172a" }}>{v.activity}</strong>
                              <span style={{ fontSize: "11px", color: "#64748b", display: "block" }}>
                                {v.uploaded_at ? new Date(v.uploaded_at).toLocaleString() : "Recent"}
                              </span>
                              {v.analysis && (
                                <span style={{
                                  display: "inline-block", fontSize: "11px", fontWeight: 700,
                                  color: riskColour(v.analysis.risk_level),
                                  background: riskBg(v.analysis.risk_level),
                                  padding: "1px 7px", borderRadius: "8px", marginTop: "3px"
                                }}>
                                  {v.analysis.risk_level} Risk · {v.analysis.overall_risk_score}/100
                                </span>
                              )}
                            </div>
                            <div style={{ textAlign: "right", flexShrink: 0 }}>
                              <span className="hist-status" style={{
                                fontSize: "10px",
                                background: v.processing_status === "completed" ? "#f0fdf4" : "#f8fafc",
                                color: v.processing_status === "completed" ? "#166534" : "#64748b",
                                padding: "2px 8px", borderRadius: "6px", border: "1px solid",
                                borderColor: v.processing_status === "completed" ? "#bbf7d0" : "#e2e8f0"
                              }}>
                                {v.processing_status}
                              </span>
                              {hasAnalysis && (
                                <div style={{ fontSize: "10px", color: "#2563eb", marginTop: "4px" }}>
                                  {isSelected ? "Viewing ✓" : "View →"}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── RIGHT COLUMN: RESULTS ── */}
            <div className="va-right-panel">

              {/* Stage 2: Analysis Results */}
              {analysisResult && (
                <div className="va-card pipeline-card active-stage">
                  <div className="stage-header">
                    <div className="stage-number">02</div>
                    <div>
                      <h3>Biomechanical Analysis Results</h3>
                      <p>Joint kinematics extracted via MediaPipe Pose. Rule-based scoring applied.</p>
                    </div>
                  </div>

                  <div className="analysis-results-grid">
                    {/* Risk Banner */}
                    <div className="risk-banner">
                      <div className="risk-banner-left">
                        <span>OVERALL RISK ASSESSMENT</span>
                        <h2>Score: <strong>{analysisResult.overall_risk_score}</strong>/100</h2>
                        <small style={{ color: "#94a3b8", fontSize: "0.72rem", display: "block", marginTop: "0.2rem" }}>
                          Formula: 0.35 × Max Risk + 0.35 × Mean Risk + 0.30 × (100 − Movement Quality)
                        </small>
                      </div>
                      <div
                        className={`risk-tag ${analysisResult.risk_level?.toLowerCase()}`}
                        style={{ color: riskColour(analysisResult.risk_level), background: riskBg(analysisResult.risk_level) }}
                      >
                        {analysisResult.risk_level} Risk
                      </div>
                    </div>

                    {/* Detected Activity */}
                    {analysisResult.detected_activity && (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", margin: "0.5rem 0 0.75rem 0", flexWrap: "wrap" }}>
                        <span style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>DETECTED ACTIVITY:</span>
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: "0.35rem",
                          padding: "0.3rem 0.85rem",
                          backgroundColor: analysisResult.detected_activity === "Squatting" ? "#fef3c7" : "#dbeafe",
                          color: analysisResult.detected_activity === "Squatting" ? "#92400e" : "#1e40af",
                          borderRadius: "20px", fontWeight: 700, fontSize: "0.85rem",
                          border: analysisResult.detected_activity === "Squatting" ? "1px solid #fde68a" : "1px solid #bfdbfe"
                        }}>
                          {analysisResult.detected_activity === "Squatting" ? "🏋️ Squatting" : "🏃 Running"}
                        </span>
                        <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>Dynamically detected from video pose kinematics</span>
                      </div>
                    )}

                    {/* Position effect */}
                    {analysisResult.position_applied_msg && (
                      <div style={{ padding: "0.6rem 0.85rem", backgroundColor: "#fefce8", border: "1px solid #fde68a", borderRadius: "8px", fontSize: "0.8rem", color: "#92400e", marginBottom: "0.75rem" }}>
                        ⚙️ <strong>Position Effect:</strong> {analysisResult.position_applied_msg}
                      </div>
                    )}

                    {/* 6 Core Biomechanical Features */}
                    <div style={{ margin: "1rem 0 0.5rem 0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                        <h4 style={{ margin: 0, fontSize: "0.9rem", color: "#1e293b", fontWeight: 700 }}>
                          📐 Core Biomechanical Features
                        </h4>
                        <span style={{ fontSize: "0.72rem", color: "#64748b" }}>Calculated via MediaPipe Pose & Joint Angle Kinematics</span>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "10px" }}>
                        {[
                          { label: "Knee Valgus Angle", value: `${analysisResult.knee_valgus}°`, unit: "Degrees (°) · Optimal: < 12°", desc: "Frontal knee medial collapse. Values > 15° elevate non-contact ACL strain.", bad: (analysisResult.knee_valgus || 0) > 15, warn: (analysisResult.knee_valgus || 0) > 12 },
                          { label: "Hip Stability", value: `${analysisResult.hip_stability}/100`, unit: "Score (0–100) · Optimal: > 80", desc: "Pelvic level & gluteus medius control. Low values cause pelvic drop.", bad: (analysisResult.hip_stability || 0) < 65, warn: (analysisResult.hip_stability || 0) < 75 },
                          { label: "Trunk Lateral Lean", value: `${analysisResult.trunk_lean}°`, unit: "Degrees (°) · Optimal: < 6°", desc: "Lateral torso displacement. Excessive lean spikes lumbar shear stress.", bad: (analysisResult.trunk_lean || 0) > 10, warn: (analysisResult.trunk_lean || 0) > 7 },
                          { label: "Range of Motion", value: `${analysisResult.joint_alignment || 105}°`, unit: "Degrees (°) · Optimal: 95°–125°", desc: "Functional flexion/extension excursion. Restricted ROM tightens hamstrings.", bad: false, warn: false },
                          { label: "Bilateral Symmetry", value: `${analysisResult.symmetry_score}%`, unit: "Percentage (%) · Optimal: > 85%", desc: "Kinetic symmetry between limbs. Asymmetry indicates compensatory loading.", bad: (analysisResult.symmetry_score || 0) < 75, warn: (analysisResult.symmetry_score || 0) < 82 },
                          { label: "Movement Quality", value: `${analysisResult.movement_quality}/100`, unit: "Index (0–100) · Optimal: > 80", desc: "Deceleration control and smoothness (inverse jerk) across frames.", bad: (analysisResult.movement_quality || 0) < 65, warn: (analysisResult.movement_quality || 0) < 78 },
                        ].map((feat, fi) => (
                          <div key={fi} style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "10px 12px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
                              <span style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>{feat.label}</span>
                              <strong style={{ fontSize: "1.1rem", color: feat.bad ? "#dc2626" : feat.warn ? "#d97706" : "#16a34a" }}>
                                {feat.value}
                              </strong>
                            </div>
                            <div style={{ fontSize: "0.68rem", color: "#64748b", marginBottom: "4px" }}>{feat.unit}</div>
                            <div style={{ fontSize: "0.7rem", color: "#334155", lineHeight: 1.3 }}>{feat.desc}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Anomaly Detection */}
                    {analysisResult.anomalies && analysisResult.anomalies.length > 0 && (
                      <div style={{ marginTop: "1rem", background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                          <h4 style={{ margin: 0, fontSize: "0.85rem", color: "#0f172a", fontWeight: 700 }}>
                            ⚠️ Biomechanical Anomaly & Deviation Detection
                          </h4>
                          <span style={{ fontSize: "0.7rem", color: "#64748b" }}>Calibrated to Project-Injury-Dataset.csv benchmarks</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "8px" }}>
                          {analysisResult.anomalies.map((anom, aIdx) => (
                            <div key={aIdx} style={{
                              background: anom.severity === "HIGH" ? "#fef2f2" : (anom.severity === "MODERATE" ? "#fffbeb" : "#f0fdf4"),
                              border: `1px solid ${anom.severity === "HIGH" ? "#fecaca" : (anom.severity === "MODERATE" ? "#fde68a" : "#bbf7d0")}`,
                              borderRadius: "8px", padding: "8px 10px", fontSize: "0.75rem"
                            }}>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}>
                                <strong style={{ color: "#1e293b", textTransform: "capitalize" }}>{anom.metric.replace(/_/g, " ")}</strong>
                                <span style={{
                                  padding: "2px 6px", borderRadius: "10px", fontSize: "0.65rem", fontWeight: 800,
                                  background: anom.severity === "HIGH" ? "#ef4444" : (anom.severity === "MODERATE" ? "#f59e0b" : "#22c55e"),
                                  color: "white"
                                }}>{anom.status}</span>
                              </div>
                              <div style={{ color: "#475569", marginBottom: "2px" }}>
                                Observed: <b>{anom.observed_value}</b> (Normal: {anom.expected_range}) · Z-score: <b>{anom.z_score}σ</b>
                              </div>
                              <div style={{ color: anom.is_anomaly ? "#991b1b" : "#166534", fontSize: "0.7rem" }}>
                                {anom.clinical_concern}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Fatigue Monitoring */}
                    <div style={{ marginTop: "0.85rem", background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "10px", padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
                      <div>
                        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#0369a1", textTransform: "uppercase" }}>
                          🔋 Fatigue Monitoring & Kinematic Variance Decay
                        </span>
                        <div style={{ fontSize: "0.78rem", color: "#0c4a6e", marginTop: "2px" }}>
                          Motor fatigue index: <strong>{analysisResult.fatigue_score || 20}%</strong> · Session Exertion RPE: <strong>{Math.round((analysisResult.fatigue_score || 20) / 10)}/10</strong>
                        </div>
                      </div>
                      <span style={{ fontSize: "0.7rem", color: "#0284c7", background: "white", padding: "4px 8px", borderRadius: "6px", border: "1px solid #7dd3fc" }}>
                        {(analysisResult.fatigue_score || 20) > 50 ? "High fatigue detected" : "Dynamic form stability maintained"}
                      </span>
                    </div>

                    {/* Prior Injury Notes */}
                    {analysisResult.history_notes && analysisResult.history_notes.length > 0 ? (
                      <div style={{ marginTop: "0.75rem", background: "#fefce8", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px", fontSize: "0.78rem", color: "#92400e" }}>
                        🩹 <strong>Recorded Prior Injury Information Applied:</strong>
                        <div style={{ fontSize: "0.72rem", color: "#78350f", marginTop: "2px", marginBottom: "4px" }}>
                          (Retrieved from athlete medical record profile — not visually inferred from video)
                        </div>
                        <ul style={{ margin: "4px 0 0 0", paddingLeft: "16px" }}>
                          {analysisResult.history_notes.map((h, hIdx) => (<li key={hIdx}>{h}</li>))}
                        </ul>
                      </div>
                    ) : (
                      <div style={{ marginTop: "0.75rem", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", fontSize: "0.78rem", color: "#64748b" }}>
                        ℹ️ <strong>Previous Injury History:</strong> No prior injuries recorded for this athlete profile. Current risk scores reflect pure video kinematic indicators without historical injury weighting.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stage 3: Prediction Results */}
              {predictionResult && (
                <div className="va-card pipeline-card active-stage">
                  <div className="stage-header">
                    <div className="stage-number">03</div>
                    <div>
                      <h3>Injury Risk Predictions</h3>
                      <p>6-injury rule-based probability scores based on kinematic indicators.</p>
                    </div>
                  </div>

                  <div className="prediction-results-box">
                    {/* Overall score */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", padding: "0.6rem 0.85rem", backgroundColor: "#f0f9ff", borderRadius: "8px", border: "1px solid #bae6fd" }}>
                      <div>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.5px" }}>Overall Risk Score</span>
                        <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0c4a6e" }}>
                          {predictionResult.overall_risk_score}<span style={{ fontSize: "0.85rem", fontWeight: 500 }}>/100</span>
                        </div>
                      </div>
                      <span style={{
                        padding: "0.25rem 0.7rem", borderRadius: "20px", fontWeight: 700, fontSize: "0.8rem",
                        backgroundColor: riskBg(predictionResult.risk_level),
                        color: riskColour(predictionResult.risk_level)
                      }}>
                        {predictionResult.risk_level} Risk
                      </span>
                    </div>

                    {predictionResult.position_applied_msg && (
                      <div style={{ padding: "0.5rem 0.75rem", backgroundColor: "#fefce8", border: "1px solid #fde68a", borderRadius: "8px", fontSize: "0.78rem", color: "#92400e", marginBottom: "0.75rem" }}>
                        ⚙️ <strong>Position Effect:</strong> {predictionResult.position_applied_msg}
                      </div>
                    )}

                    {/* Machine Learning Model & Biomechanical Rule Engine Distinction */}
                    <div style={{
                      background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px",
                      padding: "10px 14px", marginBottom: "12px", fontSize: "0.78rem"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px", flexWrap: "wrap", gap: "6px" }}>
                        <strong style={{ color: "#166534" }}>🤖 Machine Learning &amp; Biomechanical Rules Integration</strong>
                        {predictionResult.ml_probability != null && (
                          <span style={{ background: "#dcfce7", color: "#15803d", fontWeight: 700, padding: "2px 8px", borderRadius: "6px", fontSize: "0.75rem" }}>
                            Tabular ML Risk Probability: {Math.round(predictionResult.ml_probability * 100)}%
                          </span>
                        )}
                      </div>
                      <p style={{ margin: 0, color: "#14532d", fontSize: "0.74rem", lineHeight: "1.4" }}>
                        <strong>Tabular ML Model:</strong> Random Forest classifier trained on <code>Project-Injury-Dataset.csv</code> provides baseline overall probability.
                        <br />
                        <strong>Anatomical Rule Engine:</strong> Deterministic validated kinematic thresholds evaluate the 6 specific joint injury risks below, factoring in recorded prior injury history.
                      </p>
                    </div>

                    {/* Risk Classification Legend */}
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px",
                      padding: "8px 12px", marginBottom: "12px", fontSize: "0.75rem", flexWrap: "wrap", gap: "8px"
                    }}>
                      <span style={{ fontWeight: 700, color: "#475569" }}>RISK CLASSIFICATION THRESHOLDS:</span>
                      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#166534" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e" }}></span>
                          <strong>Low:</strong> &lt; 30%
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#92400e" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#f59e0b" }}></span>
                          <strong>Moderate:</strong> 30%–59%
                        </span>
                        <span style={{ display: "flex", alignItems: "center", gap: "4px", color: "#991b1b" }}>
                          <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#ef4444" }}></span>
                          <strong>High:</strong> ≥ 60%
                        </span>
                      </div>
                    </div>

                    <div className="joint-risk-bars">
                      {[
                        { key: "acl",        label: "🦵 ACL / Knee Ligament",     value: predictionResult.acl_risk },
                        { key: "hamstring",  label: "⚡ Hamstring Strain",         value: predictionResult.hamstring_risk },
                        { key: "ankle",      label: "🦶 Ankle Sprain",             value: predictionResult.ankle_risk },
                        { key: "shoulder",   label: "💪 Shoulder Impingement",     value: predictionResult.shoulder_risk },
                        { key: "lower_back", label: "🛡️ Lower Back Strain",        value: predictionResult.lower_back_risk },
                        { key: "overuse",    label: "⚠️ Overuse Syndrome",         value: predictionResult.overuse_risk },
                      ].map((injury) => {
                        const val = Math.round(Number(injury.value) || 0);
                        const isHigh = val >= 60;
                        const isMod = val >= 30 && val < 60;
                        const riskLabel = isHigh ? "High" : isMod ? "Moderate" : "Low";
                        const badgeBg = isHigh ? "#fee2e2" : isMod ? "#fef3c7" : "#dcfce7";
                        const badgeColor = isHigh ? "#b91c1c" : isMod ? "#b45309" : "#15803d";
                        const barColor = isHigh ? "#dc2626" : isMod ? "#d97706" : "#16a34a";

                        return (
                          <div className="joint-bar-item" key={injury.key} style={{
                            background: "#f8fafc", border: "1px solid #e2e8f0",
                            borderRadius: "10px", padding: "12px 14px", marginBottom: "10px"
                          }}>
                            <div className="joint-bar-labels" style={{
                              display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px"
                            }}>
                              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1e293b" }}>
                                {injury.label}
                              </span>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <span
                                  className={`risk-badge risk-${riskLabel.toLowerCase()}`}
                                  style={{
                                    fontSize: "0.72rem",
                                    fontWeight: 800,
                                    letterSpacing: "0.5px",
                                    textTransform: "uppercase",
                                    padding: "3px 9px",
                                    borderRadius: "6px",
                                    backgroundColor: badgeBg,
                                    color: badgeColor,
                                    border: `1px solid ${badgeColor}50`
                                  }}
                                >
                                  {riskLabel} Risk
                                </span>
                                <strong style={{ fontSize: "1rem", color: "#0f172a", minWidth: "38px", textAlign: "right" }}>
                                  {val}%
                                </strong>
                              </div>
                            </div>

                            {/* Visible risk label bar */}
                            <div className="track" style={{
                              height: "10px", background: "#e2e8f0", borderRadius: "6px", overflow: "hidden", position: "relative"
                            }}>
                              <div
                                className="fill"
                                style={{
                                  width: `${Math.min(100, Math.max(4, val))}%`,
                                  height: "100%",
                                  backgroundColor: barColor,
                                  borderRadius: "6px",
                                  transition: "width 0.6s ease"
                                }}
                              />
                            </div>

                            {predictionResult.injury_factors?.[injury.key]?.length > 0 && (
                              <div style={{ marginTop: "0.5rem", paddingLeft: "0.2rem" }}>
                                <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#64748b" }}>Primary contributing factors:</span>
                                <ul style={{ margin: "0.2rem 0 0 0", paddingLeft: "1.2rem", fontSize: "0.73rem", color: "#475569", listStyle: "disc" }}>
                                  {predictionResult.injury_factors[injury.key].map((factor, fIdx) => (
                                    <li key={fIdx} style={{ marginBottom: "0.15rem" }}>{factor}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {predictionResult.rules_triggered?.length > 0 && (
                      <div style={{ marginTop: "1rem", padding: "1rem", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                        <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "0.9rem", color: "#334155" }}>📋 Biomechanical Rule Trigger Explanations:</h4>
                        <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.85rem", color: "#475569" }}>
                          {predictionResult.rules_triggered.map((rule, idx) => (
                            <li key={idx} style={{ marginBottom: "0.25rem" }}>{rule}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Stage 4: Go to Recommendations CTA */}
              {predictionResult && (
                <div className="va-card pipeline-card active-stage cta-card">
                  <div className="stage-header">
                    <div className="stage-number">04</div>
                    <div>
                      <h3>Personalised Recommendations Ready</h3>
                      <p>Corrective exercises, mobility drills, and load modifications generated.</p>
                    </div>
                  </div>
                  <div className="rec-cta-actions">
                    <button
                      className="btn btn-primary btn-large"
                      onClick={() => {
                        if (onNavigateToRecommendations) onNavigateToRecommendations();
                      }}
                    >
                      View Recommendations →
                    </button>
                  </div>
                </div>
              )}

              {/* Empty state when no results yet */}
              {!analysisResult && !processing && (
                <div className="va-card" style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
                  <div style={{ fontSize: "3rem", marginBottom: "12px" }}>🎯</div>
                  <h3 style={{ color: "#475569" }}>Ready for Analysis</h3>
                  <p style={{ fontSize: "0.85rem" }}>
                    Select a video and click <strong>Analyze Video</strong> to run the full 7-stage biomechanical pipeline,
                    or click a history item on the left to view previous results.
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

    </main>
  );
}

export default VideoAnalysis;
