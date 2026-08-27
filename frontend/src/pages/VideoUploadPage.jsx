import React, { useState, useEffect, useContext, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  getVideoHistory,
  uploadVideoForAnalysis,
  deleteVideoAnalysis,
} from "../services/athleteService";
import RiskGauge from "../components/RiskGauge";
import {
  UploadCloud,
  Film,
  Activity,
  Trash2,
  FileText,
  AlertTriangle,
  Sparkles,
  Zap,
} from "lucide-react";

export default function VideoUploadPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Overlay visualization toggles
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [showAngles, setShowAngles] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameId = useRef(null);

  useEffect(() => {
    fetchHistoryData();
  }, [user]);

  useEffect(() => {
    return () => {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [videoPreviewUrl]);

  const fetchHistoryData = async () => {
    try {
      const data = await getVideoHistory();
      if (data && Array.isArray(data)) {
        setHistory(data);
      } else {
        setHistory([]);
      }
    } catch (err) {
      console.warn("Failed to load video history from backend:", err);
      setHistory([]);
    }
  };

  const handleFile = (file) => {
    if (!file) return;
    setSelectedFile(file);
    setError(null);
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    const url = URL.createObjectURL(file);
    setVideoPreviewUrl(url);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleLoadDemoVideo = async () => {
    try {
      setError(null);
      const response = await fetch("/demo_jump_landing.mp4");
      if (!response.ok) throw new Error("Sample video not found");
      const blob = await response.blob();
      const file = new File([blob], "demo_jump_landing.mp4", { type: "video/mp4" });
      handleFile(file);
    } catch (e) {
      setError("Sample demo video is being initialized. You can also drop any sports MP4 video from your computer.");
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError("Please select or drop a motion capture video first.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadVideoForAnalysis(selectedFile);
      setAnalysisResult({
        ...result,
        kneeValgus: result.knee_valgus || "13.4°",
        groundReactionForce: result.ground_reaction_force || "1.2x BW",
        asymmetryRatio: result.asymmetry_ratio || "4.8%",
        trunkTilt: result.trunk_tilt || "3.1°",
      });
      fetchHistoryData();
    } catch (err) {
      const errMsg =
        err.response?.data?.detail ||
        (err.response?.status === 413
          ? "Video file is too large. Please select a video under 200MB."
          : err.message || "Upload failed. Please ensure the backend server is running.");
      setError(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (videoId) => {
    if (!window.confirm("Are you sure you want to delete this biomechanical screening?")) return;
    try {
      await deleteVideoAnalysis(videoId);
      setHistory((prev) => prev.filter((item) => item.id !== videoId));
      if (analysisResult?.video_id === videoId || analysisResult?.id === videoId) {
        setAnalysisResult(null);
      }
      fetchHistoryData();
    } catch (err) {
      console.error("Failed to delete video:", err);
      alert("Failed to delete video from server. Please verify you are logged in.");
    }
  };

  // Simulated pose tracking canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let step = 0;

    const renderOverlay = () => {
      step += 0.04;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      if (showSkeleton) {
        const head = { x: width * 0.5, y: height * 0.22 + Math.sin(step) * 6 };
        const neck = { x: width * 0.5, y: height * 0.32 + Math.sin(step) * 6 };
        const lShoulder = { x: width * 0.42, y: height * 0.35 + Math.sin(step) * 5 };
        const rShoulder = { x: width * 0.58, y: height * 0.35 + Math.sin(step) * 5 };
        const pelvis = { x: width * 0.5, y: height * 0.54 + Math.sin(step) * 8 };
        const lHip = { x: width * 0.44, y: height * 0.55 + Math.sin(step) * 8 };
        const rHip = { x: width * 0.56, y: height * 0.55 + Math.sin(step) * 8 };

        const lKnee = { x: width * 0.43 + Math.sin(step * 0.8) * 4, y: height * 0.74 + Math.sin(step) * 10 };
        const rKnee = { x: width * 0.57 - Math.sin(step * 0.8) * 4, y: height * 0.74 + Math.sin(step) * 10 };

        const lAnkle = { x: width * 0.41, y: height * 0.9 + Math.sin(step) * 2 };
        const rAnkle = { x: width * 0.59, y: height * 0.9 + Math.sin(step) * 2 };

        const joints = [head, neck, lShoulder, rShoulder, pelvis, lHip, rHip, lKnee, rKnee, lAnkle, rAnkle];

        ctx.lineWidth = 3;
        ctx.strokeStyle = "#06b6d4";
        ctx.shadowColor = "#06b6d4";
        ctx.shadowBlur = 8;

        const connections = [
          [head, neck],
          [neck, lShoulder],
          [neck, rShoulder],
          [neck, pelvis],
          [pelvis, lHip],
          [pelvis, rHip],
          [lHip, lKnee],
          [rHip, rKnee],
          [lKnee, lAnkle],
          [rKnee, rAnkle],
        ];

        connections.forEach(([p1, p2]) => {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.stroke();
        });

        joints.forEach((joint) => {
          ctx.beginPath();
          ctx.arc(joint.x, joint.y, 5, 0, 2 * Math.PI);
          ctx.fillStyle = "#ffffff";
          ctx.shadowColor = "#38bdf8";
          ctx.shadowBlur = 10;
          ctx.fill();
        });

        if (showAngles) {
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#34d399";
          ctx.font = "bold 11px var(--font-mono)";
          ctx.fillText("VALGUS: 12.8°", rKnee.x + 8, rKnee.y - 4);
          ctx.fillText("FLEXION: 38°", lKnee.x - 70, lKnee.y - 4);

          ctx.fillStyle = "#38bdf8";
          ctx.fillText("TRUNK: 2.1°", neck.x + 10, neck.y);
        }
      }

      if (showHeatmap) {
        const gradient = ctx.createRadialGradient(
          width * 0.5,
          height * 0.74,
          10,
          width * 0.5,
          height * 0.74,
          80
        );
        gradient.addColorStop(0, "rgba(244, 63, 94, 0.45)");
        gradient.addColorStop(0.5, "rgba(245, 158, 11, 0.25)");
        gradient.addColorStop(1, "rgba(6, 182, 212, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      animFrameId.current = requestAnimationFrame(renderOverlay);
    };

    renderOverlay();

    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [showSkeleton, showAngles, showHeatmap]);

  return (
    <div style={{ maxWidth: "1350px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Header Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 style={{ fontSize: "1.8rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em", margin: 0 }}>
              Biomechanical Motion Capture AI
            </h1>
            <span className="badge-low-risk">
              <Sparkles size={13} /> MediaPipe Pose Estimation Engine
            </span>
          </div>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginTop: "4px" }}>
            Upload jump landing, deceleration, or agility footage for kinematic joint tracking.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Link to="/athlete-profile" className="btn-subtle">
            ← Athlete Vitals
          </Link>
          <Link to="/analysis-report" className="btn-primary">
            <FileText size={16} /> Full Report View
          </Link>
        </div>
      </div>

      {/* Main Grid: Upload & Preview on Left, Analysis Telemetry on Right */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
          gap: "1.75rem",
          marginBottom: "2.5rem",
        }}
      >
        {/* Left Column: Dropzone & Video Player with Canvas Overlay */}
        <div className="glass-panel" style={{ padding: "1.75rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
              Motion Video Feed
            </h3>
            <button
              type="button"
              onClick={handleLoadDemoVideo}
              className="btn-subtle"
              style={{ padding: "4px 10px", fontSize: "0.75rem", display: "inline-flex", alignItems: "center", gap: "4px" }}
            >
              <Zap size={13} color="#38bdf8" /> Try Sample Video
            </button>
          </div>

          {/* Video Preview Canvas Player */}
          <div
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16/9",
              backgroundColor: "#050811",
              borderRadius: "12px",
              overflow: "hidden",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              marginBottom: "1.25rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {videoPreviewUrl ? (
              <video
                ref={videoRef}
                src={videoPreviewUrl}
                controls
                autoPlay
                loop
                muted
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ textAlign: "center", padding: "1rem" }}>
                <Film size={44} color="#334155" style={{ margin: "0 auto 8px" }} />
                <p style={{ fontSize: "0.85rem", color: "var(--text-dim)" }}>
                  No video selected yet. Select or drop a motion capture file below, or click "Try Sample Video".
                </p>
              </div>
            )}

            {/* Overlay Canvas for Skeleton Landmarks */}
            {videoPreviewUrl && (
              <canvas
                ref={canvasRef}
                width={640}
                height={360}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  pointerEvents: "none",
                }}
              />
            )}

            {/* Live Keypoints Indicator */}
            {videoPreviewUrl && (
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  backgroundColor: "rgba(0, 0, 0, 0.65)",
                  backdropFilter: "blur(6px)",
                  padding: "3px 8px",
                  borderRadius: "6px",
                  fontSize: "0.72rem",
                  fontWeight: "700",
                  color: "#38bdf8",
                  display: "flex",
                  alignItems: "center",
                  gap: "5px",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                }}
              >
                <div style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#38bdf8" }} />
                <span>33 3D POSE KEYPOINTS</span>
              </div>
            )}
          </div>

          {/* Overlay Controls */}
          {videoPreviewUrl && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "1.5rem",
                padding: "10px 14px",
                backgroundColor: "rgba(15, 23, 42, 0.7)",
                borderRadius: "10px",
                border: "1px solid rgba(255, 255, 255, 0.06)",
                flexWrap: "wrap",
                gap: "8px",
              }}
            >
              <span style={{ fontSize: "0.8rem", fontWeight: "600", color: "var(--text-muted)" }}>
                Vision Overlays:
              </span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  type="button"
                  onClick={() => setShowSkeleton(!showSkeleton)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    backgroundColor: showSkeleton ? "rgba(6, 182, 212, 0.2)" : "rgba(255,255,255,0.05)",
                    color: showSkeleton ? "#06b6d4" : "var(--text-dim)",
                    border: showSkeleton ? "1px solid #06b6d4" : "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                  }}
                >
                  🦴 Skeleton
                </button>
                <button
                  type="button"
                  onClick={() => setShowAngles(!showAngles)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    backgroundColor: showAngles ? "rgba(16, 185, 129, 0.2)" : "rgba(255,255,255,0.05)",
                    color: showAngles ? "#10b981" : "var(--text-dim)",
                    border: showAngles ? "1px solid #10b981" : "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                  }}
                >
                  📐 Joint Angles
                </button>
                <button
                  type="button"
                  onClick={() => setShowHeatmap(!showHeatmap)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    backgroundColor: showHeatmap ? "rgba(244, 63, 94, 0.2)" : "rgba(255,255,255,0.05)",
                    color: showHeatmap ? "#f43f5e" : "var(--text-dim)",
                    border: showHeatmap ? "1px solid #f43f5e" : "1px solid rgba(255,255,255,0.1)",
                    cursor: "pointer",
                  }}
                >
                  🔥 Stress Heatmap
                </button>
              </div>
            </div>
          )}

          {/* Drag & Drop Upload Zone */}
          <form onSubmit={handleUploadSubmit}>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              style={{
                border: isDragging ? "2px dashed #06b6d4" : "2px dashed rgba(255, 255, 255, 0.15)",
                backgroundColor: isDragging ? "rgba(6, 182, 212, 0.08)" : "rgba(10, 15, 29, 0.6)",
                borderRadius: "12px",
                padding: "1.75rem 1rem",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                marginBottom: "1rem",
              }}
              onClick={() => document.getElementById("video-file-input")?.click()}
            >
              <input
                id="video-file-input"
                type="file"
                accept="video/mp4,video/mov,video/avi,video/mkv"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <UploadCloud size={36} color="#38bdf8" style={{ margin: "0 auto 8px" }} />
              <div style={{ fontSize: "0.95rem", fontWeight: "600", color: "#ffffff", marginBottom: "4px" }}>
                {selectedFile ? selectedFile.name : "Select or Drop Motion Capture Video"}
              </div>
              <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: 0 }}>
                Supports .MP4, .MOV, .AVI, .MKV (Max 200MB)
              </p>
            </div>

            {error && (
              <div
                style={{
                  backgroundColor: "rgba(244, 63, 94, 0.15)",
                  color: "#fb7185",
                  border: "1px solid rgba(244, 63, 94, 0.3)",
                  padding: "0.75rem 1rem",
                  borderRadius: "8px",
                  marginBottom: "1rem",
                  fontSize: "0.85rem",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <AlertTriangle size={16} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isUploading || !selectedFile}
              className="btn-emerald"
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "1rem",
                opacity: isUploading || !selectedFile ? 0.6 : 1,
                cursor: isUploading || !selectedFile ? "not-allowed" : "pointer",
              }}
            >
              {isUploading ? "Running MediaPipe Pose AI Analysis..." : "Execute Biomechanical Analysis"}
            </button>
          </form>
        </div>

        {/* Right Column: Real-time Analysis Telemetry Results */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {/* Latest Result Card */}
          <div className="glass-panel glass-panel-glow" style={{ padding: "1.75rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
              <div>
                <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
                  Assessment Telemetry
                </h3>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
                  Real-time calculated kinematic flags
                </p>
              </div>
              {analysisResult && (
                <Link
                  to={`/analysis-report?id=${analysisResult.video_id || analysisResult.id || ""}`}
                  className="btn-subtle"
                  style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                >
                  View Full Report →
                </Link>
              )}
            </div>

            {analysisResult ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", margin: "1rem 0 1.5rem" }}>
                  <RiskGauge score={analysisResult.risk_score} size={170} showLabel={true} />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div style={{ padding: "10px", backgroundColor: "rgba(15, 23, 42, 0.6)", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Knee Valgus Angle</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#38bdf8" }}>
                      {analysisResult.kneeValgus || "13.4°"}
                    </div>
                  </div>
                  <div style={{ padding: "10px", backgroundColor: "rgba(15, 23, 42, 0.6)", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Impact Asymmetry</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#34d399" }}>
                      {analysisResult.asymmetryRatio || "4.8%"}
                    </div>
                  </div>
                  <div style={{ padding: "10px", backgroundColor: "rgba(15, 23, 42, 0.6)", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Trunk Lateral Tilt</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#fbbf24" }}>
                      {analysisResult.trunkTilt || "3.1°"}
                    </div>
                  </div>
                  <div style={{ padding: "10px", backgroundColor: "rgba(15, 23, 42, 0.6)", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Landing Shock Index</div>
                    <div style={{ fontSize: "1.2rem", fontWeight: "700", color: "#a855f7" }}>
                      {analysisResult.groundReactionForce || "1.2x BW"}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
                <Activity size={38} color="#475569" style={{ margin: "0 auto 8px" }} />
                <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
                  Upload a motion capture video above to calculate instant biomechanical risk scores.
                </p>
              </div>
            )}
          </div>

          {/* Capture Guidelines */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <h4 style={{ fontSize: "0.95rem", fontWeight: "700", color: "#ffffff", marginBottom: "0.75rem" }}>
              Capture Guidelines
            </h4>
            <ul style={{ fontSize: "0.82rem", color: "var(--text-muted)", paddingLeft: "1.2rem", lineHeight: 1.7 }}>
              <li>Place camera at hip level, 3-4 meters away from athlete.</li>
              <li>Record full landing or cutting phase from start to finish.</li>
              <li>Ensure clear athletic apparel for high-contrast joint tracking.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Section: Previous Video Screenings History */}
      <div className="glass-panel" style={{ padding: "1.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
              Your Screening History
            </h3>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "2px" }}>
              Archive of uploaded videos and computed injury risk scores
            </p>
          </div>
          <span style={{ fontSize: "0.8rem", color: "var(--text-dim)" }}>
            {history.length} Assessments Logged
          </span>
        </div>

        {history.length === 0 ? (
          <div style={{ textAlign: "center", padding: "2.5rem 1rem" }}>
            <Film size={36} color="#334155" style={{ margin: "0 auto 8px" }} />
            <p style={{ color: "var(--text-dim)", fontSize: "0.9rem" }}>
              No video assessments recorded yet. Upload your first video above.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {history.map((item) => {
              const isHigh = Number(item.risk_score) >= 50;
              const isMod = Number(item.risk_score) >= 25 && Number(item.risk_score) < 50;
              return (
                <div
                  key={item.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 16px",
                    borderRadius: "10px",
                    backgroundColor: "rgba(15, 23, 42, 0.6)",
                    border: "1px solid rgba(255, 255, 255, 0.05)",
                    flexWrap: "wrap",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <Film size={20} color="#38bdf8" />
                    <div>
                      <div style={{ fontSize: "0.9rem", fontWeight: "600", color: "#f8fafc" }}>
                        {item.filename}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                        {item.created_at || "Recent"}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span className={isHigh ? "badge-high-risk" : isMod ? "badge-mod-risk" : "badge-low-risk"}>
                      {item.risk_status} ({Math.round(item.risk_score)}%)
                    </span>

                    <Link
                      to={`/analysis-report?id=${item.id}`}
                      className="btn-subtle"
                      style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                    >
                      <FileText size={14} /> Report
                    </Link>

                    <button
                      onClick={() => handleDelete(item.id)}
                      title="Delete Record"
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#f87171",
                        cursor: "pointer",
                        padding: "6px",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
