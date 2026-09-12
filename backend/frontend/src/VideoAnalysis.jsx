import React, { useState, useEffect, useRef } from "react";
import "./VideoAnalysis.css";
import API_BASE from "./config/api";

const PROCESSING_STEPS = [
  { id: 1, label: "Uploading Video" },
  { id: 2, label: "Processing Movement" },
  { id: 3, label: "Calculating Risk" },
  { id: 4, label: "Analysis Complete" },
];

function VideoAnalysis({ athleteId, onNavigateToRecommendations }) {
  const activeAthleteId = athleteId || localStorage.getItem("athlete_id");

  // Upload & Video Player State
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Analysis & Prediction Results
  const [analysisResult, setAnalysisResult] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [viewingHistory, setViewingHistory] = useState(false);

  // Notifications
  const [errorMsg, setErrorMsg] = useState("");

  // Video History from Database
  const [videoHistory, setVideoHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fileInputRef = useRef(null);

  // Helper to load analysis results from an item into active state
  const loadHistoryItem = (item) => {
    if (!item) return;
    localStorage.setItem("active_video_id", item.video_id);

    if (item.video_url) {
      setVideoPreviewUrl(`${API_BASE}${item.video_url}`);
    }

    if (!item.analysis) return;

    setViewingHistory(true);
    setErrorMsg("");
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
  const handleFileSelect = (file) => {
    if (file) {
      setSelectedFile(file);
      setErrorMsg("");
      setAnalysisResult(null);
      setPredictionResult(null);
      setViewingHistory(false);
      const localUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(localUrl);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };

  const delay = (ms) => new Promise((res) => setTimeout(res, ms));

  // Run full video analysis pipeline: Upload -> Analysis (MediaPipe) -> Prediction
  const handleAnalyzeVideo = async () => {
    if (!activeAthleteId) {
      setErrorMsg("Athlete profile missing. Please complete your profile setup first.");
      return;
    }
    if (!selectedFile) {
      setErrorMsg("Please select a video file (.mp4, .mov, etc.) to analyze.");
      return;
    }

    setProcessing(true);
    setCurrentStep(1); // Stage 1: Video Uploaded (in progress)
    setErrorMsg("");
    setAnalysisResult(null);
    setPredictionResult(null);
    setViewingHistory(false);

    try {
      // 1. Upload Video
      const formData = new FormData();
      formData.append("athlete_id", activeAthleteId);
      formData.append("activity", "Movement Analysis"); // Auto-detected from video kinematics
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

      // Move to Stage 2: Processing Video
      setCurrentStep(2);

      // 2. Run MediaPipe Pose Estimation & Biomechanics
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

      // Move to Stage 3: AI Movement Analysis
      setCurrentStep(3);

      // 3. Run Injury Risk Models (Random Forest + Biomechanical Rules)
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

      // Move to Stage 4: Analysis Complete
      setCurrentStep(4);
      await delay(400);

      // Finish successfully
      setAnalysisResult(analysisData);
      setPredictionResult(predData);
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
    setProcessing(false);
    setCurrentStep(1);
    setErrorMsg("");
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
        <section className="va-header" style={{ marginBottom: "24px" }}>
          <div>
            <h1 style={{ margin: "0 0 6px 0", fontSize: "2rem", color: "#0f172a", fontWeight: 800 }}>
              Movement Video Analysis
            </h1>
            <p style={{ margin: 0, fontSize: "0.95rem", color: "#64748b" }}>
              Upload your movement video to analyze biomechanics, joint kinematics, and injury risk.
            </p>
          </div>

          {/* If viewing completed results, show the ONLY primary action button */}
          {(analysisResult || viewingHistory) && !processing && (
            <button
              className="btn btn-primary"
              onClick={handleResetAnalysis}
              style={{ padding: "10px 20px", fontSize: "0.9rem", fontWeight: 700 }}
            >
              + Analyze New Video
            </button>
          )}
        </section>

        {/* ── NOTIFICATIONS ── */}
        {errorMsg && (
          <div className="va-alert error" style={{ marginBottom: "20px" }}>
            {errorMsg}
          </div>
        )}

        {/* =========================================================================
            STATE 1: PROCESSING / LOADING STATE (Simple 4-Step Indicator)
            ========================================================================= */}
        {processing && (
          <div style={{ maxWidth: "720px", margin: "30px auto" }}>
            <div className="va-card" style={{ padding: "36px 28px", textAlign: "center" }}>
              <h2 style={{ margin: "0 0 24px 0", fontSize: "1.3rem", color: "#0f172a" }}>
                Analyzing Movement Video
              </h2>

              {/* 4-Step Progress Stepper */}
              <div className="va-stepper" style={{ marginBottom: "28px", background: "#f8fafc", padding: "18px 24px" }}>
                {PROCESSING_STEPS.map((step, idx) => {
                  const isDone = currentStep > step.id;
                  const isActive = currentStep === step.id;
                  return (
                    <React.Fragment key={step.id}>
                      <div
                        className={`step-item ${isDone ? "completed" : isActive ? "active" : ""}`}
                        style={{ flexDirection: "column", gap: "6px", flex: 1, textAlign: "center" }}
                      >
                        <div
                          className="step-circle"
                          style={{
                            margin: "0 auto",
                            width: "32px",
                            height: "32px",
                            fontSize: "13px",
                            fontWeight: 800,
                            background: isDone ? "#16a34a" : (isActive ? "#2563eb" : "#e2e8f0"),
                            color: isDone || isActive ? "#ffffff" : "#64748b"
                          }}
                        >
                          {isDone ? "✓" : isActive ? "●" : step.id}
                        </div>
                        <span style={{ fontSize: "0.78rem", fontWeight: isActive ? 700 : 600, color: isDone ? "#16a34a" : (isActive ? "#1e40af" : "#94a3b8") }}>
                          {step.label}
                        </span>
                      </div>
                      {idx < PROCESSING_STEPS.length - 1 && (
                        <div
                          className="step-line"
                          style={{
                            height: "2px",
                            background: isDone ? "#16a34a" : "#e2e8f0",
                            margin: "0 8px",
                            marginBottom: "20px"
                          }}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Video Preview during processing */}
              {videoPreviewUrl && (
                <video
                  src={videoPreviewUrl}
                  controls
                  muted
                  style={{
                    width: "100%",
                    maxHeight: "260px",
                    borderRadius: "10px",
                    background: "#000",
                    marginBottom: "16px"
                  }}
                />
              )}

              <div style={{ fontSize: "0.9rem", color: "#2563eb", fontWeight: 600 }}>
                {currentStep === 1 && "Uploading video file to server..."}
                {currentStep === 2 && "Processing movement kinematics..."}
                {currentStep === 3 && "Calculating risk assessment with AI..."}
                {currentStep === 4 && "Analysis complete! Finalizing results..."}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE 2: BEFORE VIDEO UPLOAD (Clean, Large Dropzone)
            ========================================================================= */}
        {!processing && !analysisResult && (
          <div style={{ maxWidth: "720px", margin: "20px auto" }}>
            <div className="va-card" style={{ padding: "36px 30px", textAlign: "center" }}>

              {/* Large Drag and Drop Upload Zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    handleFileSelect(e.dataTransfer.files[0]);
                  }
                }}
                style={{
                  border: "2px dashed #cbd5e1",
                  borderRadius: "16px",
                  padding: "48px 20px",
                  background: "#f8fafc",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                  onChange={handleFileChange}
                />

                <div style={{ fontSize: "3rem", marginBottom: "12px" }}>☁️</div>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>
                  Drag and drop your movement video here
                </h3>
                <div style={{ fontSize: "0.9rem", color: "#94a3b8", margin: "6px 0" }}>or</div>

                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: "10px 24px", fontSize: "0.9rem", pointerEvents: "none" }}
                >
                  Choose Video
                </button>

                <div style={{ marginTop: "16px", fontSize: "0.8rem", color: "#64748b" }}>
                  Supports MP4, MOV, WEBM (Max 50 MB)
                </div>
              </div>

              {/* Selected File Details & Preview */}
              {selectedFile && (
                <div style={{ marginTop: "24px", textAlign: "left" }}>
                  <div style={{
                    background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "10px",
                    padding: "12px 16px", display: "flex", justifyContent: "space-between",
                    alignItems: "center", marginBottom: "16px"
                  }}>
                    <div>
                      <strong style={{ fontSize: "0.9rem", color: "#1e40af" }}>{selectedFile.name}</strong>
                      <span style={{ fontSize: "0.78rem", color: "#3b82f6", display: "block" }}>
                        {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      style={{ fontSize: "0.82rem", color: "#2563eb", background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}
                    >
                      Change Video
                    </button>
                  </div>

                  {videoPreviewUrl && (
                    <video
                      src={videoPreviewUrl}
                      controls
                      muted
                      style={{
                        width: "100%", maxHeight: "280px", borderRadius: "10px",
                        background: "#000", marginBottom: "18px"
                      }}
                    />
                  )}

                  {/* Single Clear Primary Action */}
                  <button
                    type="button"
                    className="btn btn-primary btn-full"
                    onClick={handleAnalyzeVideo}
                    style={{ padding: "14px", fontSize: "1rem", fontWeight: 700 }}
                  >
                    Analyze Video →
                  </button>
                </div>
              )}
            </div>

            {/* Recent Upload History from Database */}
            {videoHistory.length > 0 && !selectedFile && (
              <div className="va-card" style={{ marginTop: "24px", padding: "20px" }}>
                <h4 style={{ margin: "0 0 12px", fontSize: "0.95rem", color: "#475569" }}>
                  📁 Recent Video Analyses
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {videoHistory.slice(0, 5).map((v) => (
                    <div
                      key={v.video_id}
                      onClick={() => v.analysis && loadHistoryItem(v)}
                      style={{
                        padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0",
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        cursor: v.analysis ? "pointer" : "default", background: "#f8fafc"
                      }}
                    >
                      <div>
                        <strong style={{ fontSize: "0.85rem", color: "#0f172a" }}>
                          {v.activity || "Movement Analysis"}
                        </strong>
                        <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>
                          {v.uploaded_at ? new Date(v.uploaded_at).toLocaleDateString() : "Recent"}
                        </span>
                      </div>
                      {v.analysis ? (
                        <span style={{
                          fontSize: "0.78rem", fontWeight: 700, padding: "3px 8px",
                          borderRadius: "6px", backgroundColor: riskBg(v.analysis.risk_level),
                          color: riskColour(v.analysis.risk_level)
                        }}>
                          {v.analysis.risk_level} Risk · View Results →
                        </span>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Pending</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            STATE 3: COMPLETED RESULTS STATE
            ========================================================================= */}
        {!processing && analysisResult && predictionResult && (
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* Top Grid: Video Player (Left) + Overall Risk & Activity (Right) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "stretch" }}>

              {/* Video Player */}
              <div className="va-card" style={{ padding: "18px", margin: 0, display: "flex", flexDirection: "column" }}>
                <h3 style={{ margin: "0 0 10px 0", fontSize: "1rem", color: "#0f172a" }}>
                  🎥 Movement Video
                </h3>
                {videoPreviewUrl ? (
                  <video
                    src={videoPreviewUrl}
                    controls
                    muted
                    style={{
                      width: "100%", borderRadius: "10px", maxHeight: "280px",
                      background: "#000", flex: 1, objectFit: "contain"
                    }}
                  />
                ) : (
                  <div style={{ background: "#f1f5f9", borderRadius: "10px", padding: "40px 20px", textAlign: "center", color: "#94a3b8" }}>
                    Video preview not available
                  </div>
                )}
              </div>

              {/* Overall Risk & Detected Movement */}
              <div className="va-card" style={{ padding: "22px", margin: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: 800, color: "#2563eb", letterSpacing: "1px", textTransform: "uppercase" }}>
                    MOVEMENT ASSESSMENT
                  </span>
                  <h2 style={{ margin: "6px 0 16px 0", fontSize: "1.4rem", color: "#0f172a" }}>
                    Detected Activity: {analysisResult.detected_activity}
                  </h2>

                  <div style={{
                    background: riskBg(predictionResult.risk_level),
                    border: `1px solid ${riskColour(predictionResult.risk_level)}40`,
                    borderRadius: "12px", padding: "18px", display: "flex",
                    justifyContent: "space-between", alignItems: "center", marginBottom: "14px"
                  }}>
                    <div>
                      <div style={{ fontSize: "0.8rem", color: "#475569", fontWeight: 600 }}>Overall Injury Risk Score</div>
                      <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0f172a" }}>
                        {predictionResult.overall_risk_score} <span style={{ fontSize: "1rem", color: "#64748b" }}>/ 100</span>
                      </div>
                    </div>
                    <span style={{
                      padding: "8px 18px", borderRadius: "24px", fontWeight: 800, fontSize: "0.95rem",
                      backgroundColor: "white", color: riskColour(predictionResult.risk_level),
                      boxShadow: "0 2px 6px rgba(0,0,0,0.06)"
                    }}>
                      {predictionResult.risk_level} Risk
                    </span>
                  </div>
                </div>

                {/* Plain-English Assessment Explanation */}
                <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "12px 14px", fontSize: "0.82rem", color: "#475569", lineHeight: 1.5 }}>
                  <strong style={{ color: "#0f172a", display: "block", marginBottom: "3px" }}>What this result means:</strong>
                  {predictionResult.risk_level?.toLowerCase() === "high"
                    ? "High risk of musculoskeletal strain detected. Notable kinematic deviations and joint stresses were observed. Follow the targeted recovery drills and consult with your coach or trainer."
                    : predictionResult.risk_level?.toLowerCase() === "moderate"
                    ? "Moderate risk detected with mild joint strain or alignment deviations. Implement the targeted mobility and stabilization drills below into your warm-ups."
                    : "Low risk detected. Your movement mechanics show healthy alignment, balance, and bilateral symmetry. Continue your current routine to maintain peak conditioning."}
                </div>
              </div>

            </div>

            {/* Key Biomechanical Measurements */}
            <div className="va-card" style={{ padding: "20px" }}>
              <h3 style={{ margin: "0 0 14px 0", fontSize: "1.05rem", color: "#0f172a" }}>
                📐 Key Biomechanical Measurements
              </h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Knee Valgus</span>
                  <strong style={{ fontSize: "1.2rem", color: (analysisResult.knee_valgus || 0) > 12 ? "#dc2626" : "#16a34a" }}>
                    {analysisResult.knee_valgus ? `${analysisResult.knee_valgus}°` : "—"}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8", display: "block", marginTop: "2px" }}>Safe: &lt; 12°</span>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Hip Stability</span>
                  <strong style={{ fontSize: "1.2rem", color: (analysisResult.hip_stability || 0) < 75 ? "#d97706" : "#16a34a" }}>
                    {analysisResult.hip_stability ? `${analysisResult.hip_stability}/100` : "—"}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8", display: "block", marginTop: "2px" }}>Target: &gt; 75</span>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Trunk Lean</span>
                  <strong style={{ fontSize: "1.2rem", color: (analysisResult.trunk_lean || 0) > 6 ? "#d97706" : "#16a34a" }}>
                    {analysisResult.trunk_lean ? `${analysisResult.trunk_lean}°` : "—"}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8", display: "block", marginTop: "2px" }}>Safe: &lt; 6°</span>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Bilateral Symmetry</span>
                  <strong style={{ fontSize: "1.2rem", color: "#0f172a" }}>
                    {analysisResult.symmetry_score ? `${analysisResult.symmetry_score}%` : "—"}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8", display: "block", marginTop: "2px" }}>Target: &gt; 80%</span>
                </div>

                <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                  <span style={{ fontSize: "0.75rem", color: "#64748b", display: "block" }}>Movement Quality</span>
                  <strong style={{ fontSize: "1.2rem", color: "#0f172a" }}>
                    {analysisResult.movement_quality ? `${analysisResult.movement_quality}%` : "—"}
                  </strong>
                  <span style={{ fontSize: "0.7rem", color: "#94a3b8", display: "block", marginTop: "2px" }}>Target: &gt; 80%</span>
                </div>
              </div>
            </div>

            {/* Injury Risk Categories Breakdown (6 Joint Bars) */}
            <div className="va-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>
                  🛡️ Injury Risk Categories
                </h3>
                <div style={{ display: "flex", gap: "12px", fontSize: "0.75rem" }}>
                  <span style={{ color: "#16a34a", fontWeight: 600 }}>● Low &lt; 30%</span>
                  <span style={{ color: "#d97706", fontWeight: 600 }}>● Moderate 30-59%</span>
                  <span style={{ color: "#dc2626", fontWeight: 600 }}>● High ≥ 60%</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "12px" }}>
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
                    <div key={item.key} style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e2e8f0" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1e293b" }}>{item.label}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "2px 7px", borderRadius: "5px", background: bg, color: color }}>
                            {level}
                          </span>
                          <strong style={{ fontSize: "0.9rem", color: "#0f172a", minWidth: "32px", textAlign: "right" }}>
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

            {/* Personalized Recommendations */}
            <div className="va-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ margin: 0, fontSize: "1.05rem", color: "#0f172a" }}>
                  💡 Targeted Recommendations
                </h3>
                {onNavigateToRecommendations && (
                  <button
                    className="view-button"
                    onClick={onNavigateToRecommendations}
                    style={{ fontSize: "0.8rem", padding: "4px 12px", cursor: "pointer" }}
                  >
                    View Full Plan in Recommendations Tab →
                  </button>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {predictionResult.recommendations?.summary_strings ? (
                  Object.entries(predictionResult.recommendations.summary_strings).map(([cat, text]) => (
                    <div key={cat} style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.82rem" }}>
                      <strong style={{ color: "#1e40af", textTransform: "capitalize" }}>
                        {cat.replace(/_/g, " ")}:
                      </strong>{" "}
                      <span style={{ color: "#334155" }}>{text}</span>
                    </div>
                  ))
                ) : (
                  <div style={{ background: "#f8fafc", padding: "12px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.82rem", color: "#475569" }}>
                    Complete dynamic warm-up drills, focus on eccentric hamstring conditioning, and maintain bilateral alignment during landing.
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

      </div>
    </main>
  );
}

export default VideoAnalysis;
