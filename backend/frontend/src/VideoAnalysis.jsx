import React, { useState, useEffect, useRef } from "react";
import "./VideoAnalysis.css";
import API_BASE from "./config/api";
import { parseErrorMessage } from "./utils/validation";

const SUPPORTED_ACTIVITIES = [
  "Running",
  "Sprinting",
  "Jumping",
  "Squatting",
  "Landing Mechanics",
  "Throwing",
  "Cutting Movements",
  "Sport-Specific Drills",
];

function VideoAnalysis({ athleteId, onNavigateToRecommendations }) {
  const activeAthleteId = athleteId || localStorage.getItem("athlete_id");

  // Step Tracker: 1 = Upload, 2 = Analysis, 3 = Prediction, 4 = Completed
  const [currentStep, setCurrentStep] = useState(1);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState("");
  const [activity, setActivity] = useState("Squatting");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Pipeline Data State
  const [uploadedVideo, setUploadedVideo] = useState(null); // { video_id, video_url, processing_status }
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null); // { analysis_id, overall_risk_score, risk_level, ... }

  const [predicting, setPredicting] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null); // { prediction_id, acl_risk, ... }

  const [generatingRec, setGeneratingRec] = useState(false);
  const [recommendationResult, setRecommendationResult] = useState(null);

  // General Notification / Error State
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // History State
  const [videoHistory, setVideoHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fileInputRef = useRef(null);

  // Fetch Past Videos / Analyses
  const fetchHistory = async () => {
    if (!activeAthleteId) return;
    try {
      setLoadingHistory(true);
      const res = await fetch(`${API_BASE}/videos/${activeAthleteId}`);
      if (res.ok) {
        const data = await res.json();
        setVideoHistory(data);
      }
    } catch (err) {
      console.error("Error loading video history:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [activeAthleteId]);

  // Handle File Selection
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setErrorMsg("");
      const localUrl = URL.createObjectURL(file);
      setVideoPreviewUrl(localUrl);
    }
  };

  // STEP 1: UPLOAD VIDEO
  const handleUploadVideo = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setSuccessMsg("");

    if (!activeAthleteId) {
      setErrorMsg("Athlete ID missing. Please complete your athlete profile first.");
      return;
    }

    if (!selectedFile) {
      setErrorMsg("Please select a video file (.mp4, .mov, etc.) to upload.");
      return;
    }

    setUploading(true);
    setUploadProgress(40);

    try {
      const formData = new FormData();
      formData.append("athlete_id", activeAthleteId);
      formData.append("activity", activity);
      formData.append("video", selectedFile);

      setUploadProgress(70);

      const res = await fetch(`${API_BASE}/video/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      setUploadProgress(100);

      if (res.ok && data.video_id) {
        setUploadedVideo({
          video_id: data.video_id,
          video_url: data.video_url || videoPreviewUrl,
          activity: activity,
          processing_status: data.processing_status || "uploaded",
        });
        setSuccessMsg(`Video uploaded successfully! (ID: ${data.video_id.substring(0, 8)}...)`);
        setCurrentStep(2);
        fetchHistory();
      } else {
        setErrorMsg(data.detail || data.message || "Failed to upload video.");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setErrorMsg("Unable to connect to the backend server. Please verify it is running.");
    } finally {
      setUploading(false);
    }
  };

  // STEP 2: RUN BIOMECHANICAL ANALYSIS
  const handleRunAnalysis = async () => {
    if (!uploadedVideo?.video_id || !activeAthleteId) {
      setErrorMsg("Missing video or athlete ID for analysis.");
      return;
    }

    setAnalyzing(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const formData = new URLSearchParams();
      formData.append("video_id", uploadedVideo.video_id);
      formData.append("athlete_id", activeAthleteId);

      const res = await fetch(`${API_BASE}/analysis`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.analysis_id) {
        setAnalysisResult(data);
        setSuccessMsg("Movement pose & biomechanical analysis complete!");
        setCurrentStep(3);
      } else {
        setErrorMsg(data.detail || data.message || "Analysis failed.");
      }
    } catch (err) {
      console.error("Analysis error:", err);
      setErrorMsg("Analysis execution error. Server may be unresponsive.");
    } finally {
      setAnalyzing(false);
    }
  };

  // STEP 3: RUN INJURY RISK PREDICTION
  const handleRunPrediction = async () => {
    if (!analysisResult?.analysis_id) {
      setErrorMsg("Missing analysis ID for prediction.");
      return;
    }

    setPredicting(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      const formData = new URLSearchParams();
      formData.append("analysis_id", analysisResult.analysis_id);

      const res = await fetch(`${API_BASE}/prediction`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.prediction_id) {
        setPredictionResult(data);
        setSuccessMsg("Injury risk prediction generated successfully!");
        setCurrentStep(4);
      } else {
        setErrorMsg(data.detail || data.message || "Injury prediction failed.");
      }
    } catch (err) {
      console.error("Prediction error:", err);
      setErrorMsg("Prediction error. Could not compute risk probabilities.");
    } finally {
      setPredicting(false);
    }
  };

  // STEP 4: GENERATE RECOMMENDATIONS & REDIRECT
  const handleGenerateRecommendations = async () => {
    if (!predictionResult?.prediction_id) {
      setErrorMsg("Missing prediction ID.");
      return;
    }

    setGeneratingRec(true);
    setErrorMsg("");

    try {
      const formData = new URLSearchParams();
      formData.append("prediction_id", predictionResult.prediction_id);

      // Tailor recommendations dynamically based on the prediction scores
      const isHighAcl = (predictionResult.acl_risk || 20) >= 20;
      const isHighHamstring = (predictionResult.hamstring_risk || 15) >= 15;

      formData.append(
        "exercise",
        isHighAcl
          ? "Single-leg Bulgarian split squats (3x8) and Eccentric Nordic hamstring drops (3x6)."
          : "Standard bilateral squat progressions with tempo control (3x10)."
      );
      formData.append(
        "mobility",
        "Dynamic hip flexor lunges with thoracic reach (2x10/side) and Ankle dorsiflexion against wall."
      );
      formData.append(
        "strengthening",
        isHighHamstring
          ? "Glute bridge holds with resistance band, Romanian deadlifts (4x8 at 65% 1RM)."
          : "Quadriceps and calf isolation strengthening with focus on eccentric deceleration."
      );
      formData.append(
        "recovery",
        "15-minute contrast water hydrotherapy post-training and active foam rolling for IT band & calves."
      );
      formData.append(
        "training_modification",
        "Reduce high-velocity deceleration drills by 20% over the next 10 days to allow joint stabilization."
      );

      const res = await fetch(`${API_BASE}/recommendation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.recommendation_id) {
        setRecommendationResult(data);
        setSuccessMsg("Corrective recommendations saved!");
        // Save latest prediction & recommendation ID in localStorage for instant access
        localStorage.setItem("latest_prediction_id", predictionResult.prediction_id);
        localStorage.setItem("latest_recommendation_id", data.recommendation_id);

        if (onNavigateToRecommendations) {
          setTimeout(() => {
            onNavigateToRecommendations();
          }, 800);
        }
      } else {
        setErrorMsg(data.detail || data.message || "Failed to generate recommendation.");
      }
    } catch (err) {
      console.error("Recommendation error:", err);
      setErrorMsg("Network error saving recommendation.");
    } finally {
      setGeneratingRec(false);
    }
  };

  const resetPipeline = () => {
    setCurrentStep(1);
    setSelectedFile(null);
    setVideoPreviewUrl("");
    setUploadedVideo(null);
    setAnalysisResult(null);
    setPredictionResult(null);
    setRecommendationResult(null);
    setErrorMsg("");
    setSuccessMsg("");
  };

  return (
    <main className="video-analysis-page">
      <div className="va-container">

        {/* HEADER */}
        <section className="va-header">
          <div>
            <span className="va-kicker">COMPUTER VISION & BIOMECHANICS ENGINE</span>
            <h1>Movement Video Analysis</h1>
            <p>
              Upload training clips to extract joint biomechanics, assess movement quality, and detect injury risks.
            </p>
          </div>

          <button className="btn btn-secondary btn-outline" onClick={resetPipeline}>
            + New Analysis
          </button>
        </section>

        {/* PROGRESS STEPPER */}
        <div className="va-stepper">
          <div className={`step-item ${currentStep >= 1 ? "active" : ""} ${currentStep > 1 ? "completed" : ""}`}>
            <div className="step-circle">{currentStep > 1 ? "✓" : "1"}</div>
            <span>Upload Video</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-item ${currentStep >= 2 ? "active" : ""} ${currentStep > 2 ? "completed" : ""}`}>
            <div className="step-circle">{currentStep > 2 ? "✓" : "2"}</div>
            <span>Biomechanics Analysis</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-item ${currentStep >= 3 ? "active" : ""} ${currentStep > 3 ? "completed" : ""}`}>
            <div className="step-circle">{currentStep > 3 ? "✓" : "3"}</div>
            <span>Injury Prediction</span>
          </div>
          <div className="step-line"></div>
          <div className={`step-item ${currentStep >= 4 ? "active" : ""}`}>
            <div className="step-circle">4</div>
            <span>Recommendations</span>
          </div>
        </div>

        {/* NOTIFICATIONS */}
        {errorMsg && <div className="va-alert error">{errorMsg}</div>}
        {successMsg && <div className="va-alert success">{successMsg}</div>}

        {/* MAIN WORKFLOW GRID */}
        <div className="va-layout">

          {/* LEFT COLUMN: UPLOAD & VIDEO PREVIEW */}
          <div className="va-left-panel">
            <div className="va-card">
              <div className="card-heading">
                <h3>📹 Training Video Input</h3>
                <span className="status-badge">
                  {uploadedVideo ? "Uploaded" : "Ready for Input"}
                </span>
              </div>

              {!uploadedVideo ? (
                <form onSubmit={handleUploadVideo} className="upload-form">
                  <div
                    className="dropzone"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: "none" }}
                      accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                      onChange={handleFileChange}
                    />
                    <div className="dropzone-icon">🎥</div>
                    {selectedFile ? (
                      <div className="selected-file-info">
                        <strong>{selectedFile.name}</strong>
                        <span>{(selectedFile.size / (1024 * 1024)).toFixed(1)} MB</span>
                      </div>
                    ) : (
                      <div className="dropzone-prompt">
                        <strong>Click or Drag & Drop Training Video</strong>
                        <span>Supports MP4, MOV, WEBM (Max 50MB)</span>
                      </div>
                    )}
                  </div>

                  <div className="form-group-activity">
                    <label>Activity Drill Category</label>
                    <select
                      value={activity}
                      onChange={(e) => setActivity(e.target.value)}
                    >
                      {SUPPORTED_ACTIVITIES.map((act) => (
                        <option key={act} value={act}>
                          {act}
                        </option>
                      ))}
                    </select>
                  </div>

                  {uploading && (
                    <div className="upload-progress-bar">
                      <div
                        className="upload-progress-fill"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary btn-full"
                    disabled={!selectedFile || uploading}
                  >
                    {uploading ? "Uploading Video..." : "Upload & Prepare for Analysis →"}
                  </button>
                </form>
              ) : (
                <div className="video-uploaded-preview">
                  <div className="video-player-container">
                    <video
                      src={
                        uploadedVideo.video_url.startsWith("blob:")
                          ? uploadedVideo.video_url
                          : `${API_BASE}${uploadedVideo.video_url}`
                      }
                      controls
                      autoPlay
                      muted
                      className="video-element"
                    />
                  </div>

                  <div className="video-meta-summary">
                    <div>
                      <span>Video ID:</span>
                      <code>{uploadedVideo.video_id.substring(0, 13)}...</code>
                    </div>
                    <div>
                      <span>Activity:</span>
                      <strong>{uploadedVideo.activity}</strong>
                    </div>
                    <div>
                      <span>Status:</span>
                      <span className="status-pill-green">
                        {uploadedVideo.processing_status}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* RECENT UPLOADS HISTORY */}
            <div className="va-card history-card">
              <div className="card-heading">
                <h3>📁 Upload History</h3>
                <span className="badge-count">{videoHistory.length}</span>
              </div>

              {loadingHistory ? (
                <p className="loading-txt">Loading history...</p>
              ) : videoHistory.length === 0 ? (
                <p className="empty-txt">No previous videos recorded for this athlete.</p>
              ) : (
                <div className="history-list">
                  {videoHistory.slice(0, 4).map((v) => (
                    <div key={v.video_id} className="history-item">
                      <div className="hist-icon">🎬</div>
                      <div className="hist-info">
                        <strong>{v.activity}</strong>
                        <span>
                          {v.uploaded_at
                            ? new Date(v.uploaded_at).toLocaleString()
                            : "Recent"}
                        </span>
                      </div>
                      <span className="hist-status">{v.processing_status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: PIPELINE ACTIONS & RESULTS */}
          <div className="va-right-panel">

            {/* STAGE 2: BIOMECHANICAL ANALYSIS CARD */}
            <div className={`va-card pipeline-card ${currentStep >= 2 ? "active-stage" : "disabled-stage"}`}>
              <div className="stage-header">
                <div className="stage-number">02</div>
                <div>
                  <h3>Biomechanical Movement Analysis</h3>
                  <p>Extract joint angles, knee valgus deviation, hip stability, and movement quality.</p>
                </div>
              </div>

              {currentStep === 2 && !analysisResult && (
                <div className="stage-action-box">
                  <p>Video is ready for computer vision and pose estimation analysis.</p>
                  <button
                    className="btn btn-primary"
                    onClick={handleRunAnalysis}
                    disabled={analyzing}
                  >
                    {analyzing ? "⚡ Analyzing Joint Kinematics..." : "Run Movement Analysis →"}
                  </button>
                </div>
              )}

              {analysisResult && (
                <div className="analysis-results-grid">
                  <div className="risk-banner">
                    <div className="risk-banner-left">
                      <span>OVERALL RISK ASSESSMENT</span>
                      <h2>
                        Score: <strong>{analysisResult.overall_risk_score}</strong>/100
                      </h2>
                    </div>
                    <div className={`risk-tag ${analysisResult.risk_level?.toLowerCase()}`}>
                      {analysisResult.risk_level} Risk
                    </div>
                  </div>

                  <div className="metrics-chip-grid">
                    <div className="metric-chip">
                      <span>Knee Valgus Angle</span>
                      <strong>{analysisResult.knee_valgus}°</strong>
                    </div>
                    <div className="metric-chip">
                      <span>Hip Stability</span>
                      <strong>{analysisResult.hip_stability}%</strong>
                    </div>
                    <div className="metric-chip">
                      <span>Trunk Lean</span>
                      <strong>{analysisResult.trunk_lean}°</strong>
                    </div>
                    <div className="metric-chip">
                      <span>Joint Alignment</span>
                      <strong>{analysisResult.joint_alignment}%</strong>
                    </div>
                    <div className="metric-chip">
                      <span>Symmetry Score</span>
                      <strong>{analysisResult.symmetry_score}%</strong>
                    </div>
                    <div className="metric-chip">
                      <span>Movement Quality</span>
                      <strong>{analysisResult.movement_quality}%</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STAGE 3: INJURY RISK PREDICTION CARD */}
            <div className={`va-card pipeline-card ${currentStep >= 3 ? "active-stage" : "disabled-stage"}`}>
              <div className="stage-header">
                <div className="stage-number">03</div>
                <div>
                  <h3>Injury Risk Predictions</h3>
                  <p>Predict specific anatomical injury probabilities based on kinematic indicators.</p>
                </div>
              </div>

              {currentStep === 3 && !predictionResult && (
                <div className="stage-action-box">
                  <p>Kinematic metrics calculated. Proceed to calculate joint risk probabilities.</p>
                  <button
                    className="btn btn-primary"
                    onClick={handleRunPrediction}
                    disabled={predicting}
                  >
                    {predicting ? "🔮 Computing Risk Probabilities..." : "Generate Injury Risk Prediction →"}
                  </button>
                </div>
              )}

              {predictionResult && (
                <div className="prediction-results-box">
                  <div className="joint-risk-bars">
                    <div className="joint-bar-item">
                      <div className="joint-bar-labels">
                        <span>🦵 ACL / Knee Ligament</span>
                        <strong>{predictionResult.acl_risk}%</strong>
                      </div>
                      <div className="track"><div className="fill" style={{ width: `${predictionResult.acl_risk}%` }}></div></div>
                    </div>

                    <div className="joint-bar-item">
                      <div className="joint-bar-labels">
                        <span>⚡ Hamstring Strain</span>
                        <strong>{predictionResult.hamstring_risk}%</strong>
                      </div>
                      <div className="track"><div className="fill warning" style={{ width: `${predictionResult.hamstring_risk}%` }}></div></div>
                    </div>

                    <div className="joint-bar-item">
                      <div className="joint-bar-labels">
                        <span>🦶 Ankle Sprain</span>
                        <strong>{predictionResult.ankle_risk}%</strong>
                      </div>
                      <div className="track"><div className="fill" style={{ width: `${predictionResult.ankle_risk}%` }}></div></div>
                    </div>

                    <div className="joint-bar-item">
                      <div className="joint-bar-labels">
                        <span>💪 Shoulder Impingement</span>
                        <strong>{predictionResult.shoulder_risk}%</strong>
                      </div>
                      <div className="track"><div className="fill" style={{ width: `${predictionResult.shoulder_risk}%` }}></div></div>
                    </div>

                    <div className="joint-bar-item">
                      <div className="joint-bar-labels">
                        <span>🛡️ Lower Back Strain</span>
                        <strong>{predictionResult.lower_back_risk}%</strong>
                      </div>
                      <div className="track"><div className="fill warning" style={{ width: `${predictionResult.lower_back_risk}%` }}></div></div>
                    </div>

                    <div className="joint-bar-item">
                      <div className="joint-bar-labels">
                        <span>⚠️ Overuse Syndrome</span>
                        <strong>{predictionResult.overuse_risk}%</strong>
                      </div>
                      <div className="track"><div className="fill warning" style={{ width: `${predictionResult.overuse_risk}%` }}></div></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* STAGE 4: ACTIONABLE RECOMMENDATIONS CTA */}
            {predictionResult && (
              <div className="va-card pipeline-card active-stage cta-card">
                <div className="stage-header">
                  <div className="stage-number">04</div>
                  <div>
                    <h3>Generate Corrective Recommendations</h3>
                    <p>Formulate personalized corrective exercises, mobility drills, and load modifications.</p>
                  </div>
                </div>

                <div className="rec-cta-actions">
                  <button
                    className="btn btn-primary btn-large"
                    onClick={handleGenerateRecommendations}
                    disabled={generatingRec}
                  >
                    {generatingRec
                      ? "Generating Customized Plan..."
                      : "Generate & View Recommendations →"}
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </main>
  );
}

export default VideoAnalysis;
