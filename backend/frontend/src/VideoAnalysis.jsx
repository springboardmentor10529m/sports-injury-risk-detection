import React, { useState, useEffect, useRef } from "react";
import "./VideoAnalysis.css";
import API_BASE from "./config/api";

function VideoAnalysis({ athleteId, onNavigateToRecommendations }) {
  const activeAthleteId = athleteId || localStorage.getItem("athlete_id");

  // Upload & Video Player State
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("");

  // Analysis & Prediction Results
  const [analysisResult, setAnalysisResult] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(false);

  // Notifications
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Video History from Database
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
    setProcessing(false);

    setAnalysisResult({
      analysis_id: item.analysis.analysis_id,
      video_id: item.video_id,
      detected_activity: item.activity || "Movement Analysis",
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
      history_notes: item.analysis.history_notes || [],
      rules_triggered: item.analysis.rules_triggered || [],
    });

    if (item.analysis.prediction) {
      setPredictionResult({
        ...item.analysis.prediction,
        overall_risk_score: item.analysis.overall_risk_score,
        risk_level: item.analysis.risk_level,
        rules_triggered: item.analysis.rules_triggered || [],
        injury_factors: item.analysis.prediction.injury_factors || {},
        recommendations: item.analysis.prediction.recommendations || null,
        ml_probability: item.analysis.prediction.ml_probability ?? null,
      });
      localStorage.setItem("latest_prediction_id", item.analysis.prediction.prediction_id);
    } else {
      setPredictionResult(null);
    }
  };

  // Fetch upload history from database and auto-restore active video on refresh
  const fetchHistory = async (autoRestore = true) => {
    if (!activeAthleteId) return;
    try {
      setLoadingHistory(true);
      const res = await fetch(`${API_BASE}/videos/with-analysis/${activeAthleteId}`);
      if (res.ok) {
        const data = await res.json();
        setVideoHistory(data);

        // Auto-restore previous analysis after page refresh
        if (autoRestore && data && data.length > 0) {
          const savedVideoId = localStorage.getItem("active_video_id");
          let match = savedVideoId ? data.find((v) => v.video_id === savedVideoId) : null;
          if (!match) {
            match = data.find((v) => v.analysis) || data[0];
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

  // Handle local file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setErrorMsg("");
      setSuccessMsg("");
      setAnalysisResult(null);
      setPredictionResult(null);
      setViewingHistory(false);
      setSelectedHistoryId(null);
      const localUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(localUrl);
    }
  };

  // Run full video analysis pipeline: Upload -> Analysis (MediaPipe) -> Prediction
  const handleAnalyzeVideo = async (e) => {
    e.preventDefault();
    if (!activeAthleteId) {
      setErrorMsg("Athlete profile missing. Please complete your profile setup first.");
      return;
    }
    if (!selectedFile) {
      setErrorMsg("Please select a video file (.mp4, .mov, etc.) to analyze.");
      return;
    }

    setProcessing(true);
    setProcessingMsg("Uploading training video to server...");
    setErrorMsg("");
    setSuccessMsg("");
    setAnalysisResult(null);
    setPredictionResult(null);
    setViewingHistory(false);

    try {
      // 1. Upload Video
      const formData = new FormData();
      formData.append("athlete_id", activeAthleteId);
      formData.append("activity", "Movement Analysis"); // Auto-classified by pose engine
      formData.append("video", selectedFile);

      const uploadRes = await fetch(`${API_BASE}/video/upload`, {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok || !uploadData.video_id) {
        throw new Error(uploadData.detail || uploadData.message || "Video upload failed. Check format and file size.");
      }

      const videoId = uploadData.video_id;
      localStorage.setItem("active_video_id", videoId);
      if (uploadData.video_url) {
        setVideoPreviewUrl(`${API_BASE}${uploadData.video_url}`);
      }

      // 2. Run MediaPipe Pose Estimation & Biomechanics
      setProcessingMsg("Extracting 33 3D skeletal landmarks and joint kinematics with MediaPipe...");
      const analysisFormData = new URLSearchParams();
      analysisFormData.append("video_id", videoId);
      analysisFormData.append("athlete_id", activeAthleteId);

      const analysisRes = await fetch(`${API_BASE}/analysis`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: analysisFormData,
      });

      const analysisData = await analysisRes.json().catch(() => ({}));
      if (!analysisRes.ok || !analysisData.analysis_id) {
        throw new Error(analysisData.detail || analysisData.message || "Biomechanical pose analysis failed.");
      }

      // 3. Run Injury Risk Models (Random Forest + Biomechanical Rules)
      setProcessingMsg("Calculating injury risk scores and targeted recommendations...");
      const predFormData = new URLSearchParams();
      predFormData.append("analysis_id", analysisData.analysis_id);

      const predRes = await fetch(`${API_BASE}/prediction`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: predFormData,
      });

      const predData = await predRes.json().catch(() => ({}));
      if (!predRes.ok || !predData.prediction_id) {
        throw new Error(predData.detail || predData.message || "Injury risk calculation failed.");
      }

      localStorage.setItem("latest_prediction_id", predData.prediction_id);

      // Finish successfully
      setAnalysisResult(analysisData);
      setPredictionResult(predData);
      setSuccessMsg("Video analysis completed successfully!");
      setProcessing(false);

      // Refresh history list so the new upload appears
      fetchHistory(false);

    } catch (err) {
      console.error("Analysis error:", err);
      setErrorMsg(err.message || "An unexpected error occurred during processing.");
      setProcessing(false);
    }
  };

  // Reset to analyze a new video
  const handleResetAnalysis = () => {
    setSelectedFile(null);
    setVideoPreviewUrl("");
    setAnalysisResult(null);
    setPredictionResult(null);
    setViewingHistory(false);
    setSelectedHistoryId(null);
    setErrorMsg("");
    setSuccessMsg("");
    setProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Color helpers
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
    if (l === "high") return "#fee2e2";
    if (l === "moderate") return "#fef3c7";
    return "#dcfce7";
  };

  return (
    <main className="video-analysis-page">
      <div className="va-container">

        {/* ── HEADER ── */}
        <section className="va-header">
          <div>
            <span className="va-kicker">ATHLETE BIOMECHANICS &amp; INJURY RISK</span>
            <h1>Movement Video Analysis</h1>
            <p>
              Upload your training video to analyze joint angles, detect biomechanical movement faults,
              and assess injury risks using computer vision and validated clinical rules.
            </p>
          </div>
        </section>

        {/* ── NOTIFICATIONS ── */}
        {errorMsg && <div className="va-alert error" style={{ marginBottom: "16px" }}>{errorMsg}</div>}
        {successMsg && <div className="va-alert success" style={{ marginBottom: "16px" }}>{successMsg}</div>}

        {/* ── VIEWING HISTORY BANNER ── */}
        {viewingHistory && (
          <div style={{
            background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px",
            padding: "10px 16px", marginBottom: "16px", fontSize: "0.85rem",
            color: "#1e40af", display: "flex", justifyContent: "space-between", alignItems: "center"
          }}>
            <span>📁 <strong>Showing past analysis record</strong> from your database history.</span>
            <button
              className="view-button"
              onClick={handleResetAnalysis}
              style={{ fontSize: "0.8rem", padding: "4px 12px", cursor: "pointer" }}
            >
              + Upload New Video
            </button>
          </div>
        )}

        <div className="va-layout">

          {/* ── LEFT COLUMN: UPLOAD & HISTORY ── */}
          <div className="va-left-panel">

            {/* Video Upload Card */}
            <div className="va-card">
              <div className="card-heading">
                <h3>📹 Video Upload</h3>
                <span className="status-badge">
                  {processing ? "Processing..." : analysisResult ? "Analysed" : "Ready"}
                </span>
              </div>

              {/* Upload Dropzone */}
              {!viewingHistory && (
                <form onSubmit={handleAnalyzeVideo} className="upload-form">
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

                  {/* Single Clean "Analyze Video" Button */}
                  <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={!selectedFile || processing}
                    style={{ marginTop: "14px" }}
                  >
                    {processing ? "Analyzing Video..." : "Analyze Video →"}
                  </button>
                </form>
              )}

              {/* Video Player Display (Always visible if video exists) */}
              {videoPreviewUrl && (
                <div style={{ marginTop: "16px" }}>
                  <div style={{ fontSize: "0.78rem", fontWeight: 700, color: "#475569", marginBottom: "6px" }}>
                    🎥 Video Player
                  </div>
                  <video
                    src={videoPreviewUrl}
                    controls
                    muted
                    style={{
                      width: "100%", borderRadius: "8px", maxHeight: "240px",
                      background: "#000", display: "block"
                    }}
                  />
                </div>
              )}

              {/* Reset action when viewing history */}
              {viewingHistory && (
                <button
                  className="btn btn-primary btn-full"
                  onClick={handleResetAnalysis}
                  style={{ marginTop: "16px" }}
                >
                  + Analyze New Video
                </button>
              )}

              {/* Compact, Non-Blocking Processing Indicator */}
              {processing && (
                <div style={{
                  background: "#f0f9ff", border: "1px solid #bae6fd",
                  borderRadius: "10px", padding: "14px", marginTop: "14px"
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{
                      width: "18px", height: "18px", border: "2px solid #bae6fd",
                      borderTopColor: "#0284c7", borderRadius: "50%",
                      animation: "spin 1s linear infinite", flexShrink: 0
                    }} />
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "#0369a1" }}>
                      {processingMsg || "Processing video..."}
                    </div>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "#64748b", marginTop: "6px" }}>
                    Pose estimation and biomechanical risk calculation in progress.
                  </div>
                </div>
              )}
            </div>

            {/* ── Upload History Card ── */}
            <div className="va-card history-card" style={{ marginTop: "16px" }}>
              <div className="card-heading">
                <h3>📁 Upload History</h3>
                <span className="badge-count">{videoHistory.length}</span>
              </div>

              {loadingHistory ? (
                <p className="loading-txt">Loading history from database...</p>
              ) : videoHistory.length === 0 ? (
                <p className="empty-txt" style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                  No previous videos found.
                </p>
              ) : (
                <div className="history-list" style={{ marginTop: "10px" }}>
                  {videoHistory.map((v) => {
                    const isSelected = selectedHistoryId === v.video_id;
                    const hasAnalysis = !!v.analysis;
                    return (
                      <div
                        key={v.video_id}
                        onClick={() => hasAnalysis && loadHistoryItem(v)}
                        style={{
                          cursor: hasAnalysis ? "pointer" : "default",
                          border: isSelected ? "2px solid #2563eb" : "1px solid #e2e8f0",
                          borderRadius: "8px",
                          padding: "8px 10px",
                          marginBottom: "6px",
                          background: isSelected ? "#eff6ff" : "white",
                          transition: "all 0.15s"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <strong style={{ fontSize: "0.82rem", color: "#0f172a", display: "block" }}>
                              {v.activity || "Movement Analysis"}
                            </strong>
                            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
                              {v.uploaded_at ? new Date(v.uploaded_at).toLocaleDateString() : "Recent"}
                            </span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            {v.analysis ? (
                              <span style={{
                                fontSize: "0.72rem", fontWeight: 700,
                                color: riskColour(v.analysis.risk_level),
                                background: riskBg(v.analysis.risk_level),
                                padding: "2px 6px", borderRadius: "6px"
                              }}>
                                {v.analysis.risk_level} · {v.analysis.overall_risk_score}
                              </span>
                            ) : (
                              <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>Pending</span>
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

          {/* ── RIGHT COLUMN: CLEAN ANALYSIS RESULTS ── */}
          <div className="va-right-panel">

            {/* Results Container */}
            {analysisResult && predictionResult ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* 1. Overall Risk Summary Card */}
                <div className="va-card" style={{ padding: "20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                      <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#2563eb", letterSpacing: "1px", textTransform: "uppercase" }}>
                        ANALYSIS SUMMARY
                      </span>
                      <h2 style={{ margin: "4px 0 0 0", fontSize: "1.4rem", color: "#0f172a" }}>
                        Detected Movement: {analysisResult.detected_activity}
                      </h2>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>Overall Risk Score</div>
                        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0f172a" }}>
                          {predictionResult.overall_risk_score} <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>/100</span>
                        </div>
                      </div>
                      <span style={{
                        padding: "6px 14px", borderRadius: "20px", fontWeight: 800, fontSize: "0.85rem",
                        backgroundColor: riskBg(predictionResult.risk_level),
                        color: riskColour(predictionResult.risk_level),
                        border: `1px solid ${riskColour(predictionResult.risk_level)}40`
                      }}>
                        {predictionResult.risk_level} Risk
                      </span>
                    </div>
                  </div>

                  {/* Transparent ML & Rule-Based Model Attribution */}
                  <div style={{
                    marginTop: "16px", background: "#f8fafc", border: "1px solid #e2e8f0",
                    borderRadius: "8px", padding: "10px 14px", fontSize: "0.78rem", color: "#475569"
                  }}>
                    <strong style={{ color: "#0f172a" }}>Model Transparency:</strong>
                    <div style={{ marginTop: "2px" }}>
                      Tabular ML Baseline: <strong>Random Forest Classifier</strong> trained on <code>Project-Injury-Dataset.csv</code>
                      {predictionResult.ml_probability != null && ` (Baseline Probability: ${Math.round(predictionResult.ml_probability * 100)}%)`}
                      . Specific anatomical joint risks are evaluated using validated biomechanical kinematic rules.
                    </div>
                  </div>
                </div>

                {/* 2. Previous Injury History Card */}
                <div className="va-card" style={{ padding: "18px 20px" }}>
                  <h3 style={{ margin: "0 0 8px 0", fontSize: "1rem", color: "#0f172a" }}>
                    📋 Previous Injury History
                  </h3>
                  {analysisResult.history_notes && analysisResult.history_notes.length > 0 ? (
                    <div style={{ background: "#fefce8", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px 14px" }}>
                      <strong style={{ fontSize: "0.8rem", color: "#92400e" }}>
                        Recorded Past Injuries (From Athlete Profile):
                      </strong>
                      <ul style={{ margin: "4px 0 0 0", paddingLeft: "18px", fontSize: "0.8rem", color: "#78350f" }}>
                        {analysisResult.history_notes.map((note, idx) => (
                          <li key={idx} style={{ marginTop: "2px" }}>{note}</li>
                        ))}
                      </ul>
                      <small style={{ display: "block", marginTop: "4px", fontSize: "0.72rem", color: "#92400e" }}>
                        * Prior injury records apply risk weighting to corresponding anatomical joints.
                      </small>
                    </div>
                  ) : (
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px 14px", fontSize: "0.82rem", color: "#64748b" }}>
                      No previous injury record available. Risk scores reflect pure movement kinematics without prior injury weightings.
                    </div>
                  )}
                </div>

                {/* 3. Key Biomechanical Features */}
                <div className="va-card" style={{ padding: "18px 20px" }}>
                  <h3 style={{ margin: "0 0 12px 0", fontSize: "1rem", color: "#0f172a" }}>
                    📐 Key Biomechanical Measurements
                  </h3>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px" }}>
                    <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", display: "block" }}>Knee Valgus</span>
                      <strong style={{ fontSize: "1.1rem", color: (analysisResult.knee_valgus || 0) > 12 ? "#dc2626" : "#16a34a" }}>
                        {analysisResult.knee_valgus ? `${analysisResult.knee_valgus}°` : "—"}
                      </strong>
                      <span style={{ fontSize: "0.68rem", color: "#94a3b8", display: "block" }}>Safe: &lt; 12°</span>
                    </div>

                    <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", display: "block" }}>Hip Stability</span>
                      <strong style={{ fontSize: "1.1rem", color: (analysisResult.hip_stability || 0) < 75 ? "#d97706" : "#16a34a" }}>
                        {analysisResult.hip_stability ? `${analysisResult.hip_stability}/100` : "—"}
                      </strong>
                      <span style={{ fontSize: "0.68rem", color: "#94a3b8", display: "block" }}>Target: &gt; 75</span>
                    </div>

                    <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", display: "block" }}>Trunk Lean</span>
                      <strong style={{ fontSize: "1.1rem", color: (analysisResult.trunk_lean || 0) > 6 ? "#d97706" : "#16a34a" }}>
                        {analysisResult.trunk_lean ? `${analysisResult.trunk_lean}°` : "—"}
                      </strong>
                      <span style={{ fontSize: "0.68rem", color: "#94a3b8", display: "block" }}>Safe: &lt; 6°</span>
                    </div>

                    <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", display: "block" }}>Bilateral Symmetry</span>
                      <strong style={{ fontSize: "1.1rem", color: "#0f172a" }}>
                        {analysisResult.symmetry_score ? `${analysisResult.symmetry_score}%` : "—"}
                      </strong>
                      <span style={{ fontSize: "0.68rem", color: "#94a3b8", display: "block" }}>Target: &gt; 80%</span>
                    </div>

                    <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                      <span style={{ fontSize: "0.72rem", color: "#64748b", display: "block" }}>Movement Quality</span>
                      <strong style={{ fontSize: "1.1rem", color: "#0f172a" }}>
                        {analysisResult.movement_quality ? `${analysisResult.movement_quality}%` : "—"}
                      </strong>
                      <span style={{ fontSize: "0.68rem", color: "#94a3b8", display: "block" }}>Target: &gt; 80%</span>
                    </div>
                  </div>
                </div>

                {/* 4. Injury Risk Categories Breakdown */}
                <div className="va-card" style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                    <h3 style={{ margin: 0, fontSize: "1rem", color: "#0f172a" }}>
                      🛡️ Injury Risk Categories
                    </h3>
                    <div style={{ display: "flex", gap: "10px", fontSize: "0.72rem" }}>
                      <span style={{ color: "#16a34a" }}>● Low &lt; 30%</span>
                      <span style={{ color: "#d97706" }}>● Moderate 30-59%</span>
                      <span style={{ color: "#dc2626" }}>● High ≥ 60%</span>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {[
                      { key: "acl", label: "🦵 ACL / Knee Ligament", value: predictionResult.acl_risk },
                      { key: "hamstring", label: "⚡ Hamstring Strain", value: predictionResult.hamstring_risk },
                      { key: "ankle", label: "🦶 Ankle Sprain", value: predictionResult.ankle_risk },
                      { key: "shoulder", label: "💪 Shoulder Impingement", value: predictionResult.shoulder_risk },
                      { key: "lower_back", label: "🛡️ Lower Back Strain", value: predictionResult.lower_back_risk },
                      { key: "overuse", label: "⚠️ Overuse Syndrome", value: predictionResult.overuse_risk },
                    ].map((item) => {
                      const val = Math.round(Number(item.value) || 0);
                      const isHigh = val >= 60;
                      const isMod = val >= 30 && val < 60;
                      const level = isHigh ? "High" : isMod ? "Moderate" : "Low";
                      const color = isHigh ? "#dc2626" : isMod ? "#d97706" : "#16a34a";
                      const bg = isHigh ? "#fee2e2" : isMod ? "#fef3c7" : "#dcfce7";

                      return (
                        <div key={item.key} style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                            <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#1e293b" }}>{item.label}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "1px 6px", borderRadius: "4px", background: bg, color: color }}>
                                {level}
                              </span>
                              <strong style={{ fontSize: "0.85rem", color: "#0f172a", minWidth: "32px", textAlign: "right" }}>
                                {val}%
                              </strong>
                            </div>
                          </div>
                          <div style={{ height: "6px", background: "#e2e8f0", borderRadius: "3px", overflow: "hidden" }}>
                            <div style={{ width: `${Math.min(100, Math.max(4, val))}%`, height: "100%", background: color, borderRadius: "3px" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 5. Targeted Recommendations */}
                <div className="va-card" style={{ padding: "18px 20px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <h3 style={{ margin: 0, fontSize: "1rem", color: "#0f172a" }}>
                      💡 Targeted Corrective Recommendations
                    </h3>
                    {onNavigateToRecommendations && (
                      <button
                        className="view-button"
                        onClick={onNavigateToRecommendations}
                        style={{ fontSize: "0.78rem", padding: "4px 10px", cursor: "pointer" }}
                      >
                        View Full Plan →
                      </button>
                    )}
                  </div>

                  <p style={{ margin: "0 0 12px 0", fontSize: "0.78rem", color: "#64748b" }}>
                    Mapped directly from your detected movement deviations and joint risk scores:
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {predictionResult.recommendations?.summary_strings ? (
                      Object.entries(predictionResult.recommendations.summary_strings).map(([cat, text]) => (
                        <div key={cat} style={{ background: "#f8fafc", padding: "8px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8rem" }}>
                          <strong style={{ color: "#1e40af", textTransform: "capitalize" }}>
                            {cat.replace(/_/g, " ")}:
                          </strong>{" "}
                          <span style={{ color: "#334155" }}>{text}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ background: "#f8fafc", padding: "10px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", fontSize: "0.8rem", color: "#475569" }}>
                        Complete dynamic warm-up drills, focus on eccentric hamstring conditioning, and maintain bilateral alignment during landing.
                      </div>
                    )}
                  </div>
                </div>

              </div>
            ) : (
              /* Empty State When Awaiting Video */
              <div className="va-card" style={{ textAlign: "center", padding: "48px 24px", color: "#94a3b8" }}>
                <div style={{ fontSize: "2.5rem", marginBottom: "12px" }}>🎯</div>
                <h3 style={{ color: "#475569", margin: "0 0 6px 0" }}>Ready for Video Analysis</h3>
                <p style={{ fontSize: "0.85rem", margin: 0, maxWidth: "420px", marginLeft: "auto", marginRight: "auto" }}>
                  Select or drag a training video on the left and click <strong>Analyze Video</strong> to run the automated biomechanical analysis, or click a previous video from your upload history.
                </p>
              </div>
            )}

          </div>

        </div>
      </div>
    </main>
  );
}

export default VideoAnalysis;
