import React, { useState, useEffect, useContext, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  getVideoHistory,
  uploadBatchVideosForAnalysis,
  deleteVideoAnalysis,
} from "../services/athleteService";
import {
  getPoseLandmarker,
  calculate2DAngle,
  POSE_CONNECTIONS,
} from "../services/poseTracker";
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
  Plus,
  Layers,
  CheckCircle2,
  Eye,
  Camera,
  Compass,
  ChevronRight,
} from "lucide-react";

export default function VideoUploadPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Multi-video selection queue
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  const [isUploading, setIsUploading] = useState(false);
  const [batchAnalysisResult, setBatchAnalysisResult] = useState(null);
  const [activeResultTab, setActiveResultTab] = useState("composite"); // "composite" or index '0', '1'...

  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [displayMode, setDisplayMode] = useState("annotated"); // "annotated" or "raw"
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, filename } or null
  const [isDeleting, setIsDeleting] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const animFrameId = useRef(null);
  const landmarkerRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchHistoryData();
  }, [user]);

  // Load client-side MediaPipe landmarker for real-time video skeleton overlay
  useEffect(() => {
    let isMounted = true;
    getPoseLandmarker().then((landmarker) => {
      if (isMounted && landmarker) {
        landmarkerRef.current = landmarker;
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Real-time live skeleton tracking loop on active video
  useEffect(() => {
    let lastTime = -1;

    const trackLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      if (
        video &&
        canvas &&
        landmarkerRef.current &&
        video.readyState >= 2 &&
        !video.paused &&
        !video.ended
      ) {
        if (video.currentTime !== lastTime) {
          lastTime = video.currentTime;
          try {
            const nowMs = performance.now();
            const results = landmarkerRef.current.detectForVideo(video, nowMs);

            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (results && results.landmarks && results.landmarks.length > 0) {
              const landmarks = results.landmarks[0];
              const videoW = video.videoWidth || 640;
              const videoH = video.videoHeight || 480;
              const canvasW = canvas.width;
              const canvasH = canvas.height;

              const scale = Math.min(canvasW / videoW, canvasH / videoH);
              const renderW = videoW * scale;
              const renderH = videoH * scale;
              const offsetX = (canvasW - renderW) / 2;
              const offsetY = (canvasH - renderH) / 2;

              const toCanvas = (pt) => ({
                x: offsetX + pt.x * renderW,
                y: offsetY + pt.y * renderH,
                visibility: pt.visibility ?? 1,
              });

              // Draw skeleton connections
              ctx.lineWidth = 3;
              ctx.strokeStyle = "#06b6d4";
              ctx.shadowColor = "#38bdf8";
              ctx.shadowBlur = 8;

              POSE_CONNECTIONS.forEach(([i, j]) => {
                const p1 = toCanvas(landmarks[i]);
                const p2 = toCanvas(landmarks[j]);
                if (
                  (p1.visibility > 0.3 || p1.visibility === undefined) &&
                  (p2.visibility > 0.3 || p2.visibility === undefined)
                ) {
                  ctx.beginPath();
                  ctx.moveTo(p1.x, p1.y);
                  ctx.lineTo(p2.x, p2.y);
                  ctx.stroke();
                }
              });

              // Draw key joints
              landmarks.forEach((lm, idx) => {
                if ([11, 12, 13, 14, 23, 24, 25, 26, 27, 28].includes(idx)) {
                  const pt = toCanvas(lm);
                  ctx.beginPath();
                  ctx.arc(pt.x, pt.y, 5, 0, 2 * Math.PI);
                  ctx.fillStyle = "#ffffff";
                  ctx.fill();
                  ctx.lineWidth = 2;
                  ctx.strokeStyle = "#38bdf8";
                  ctx.stroke();
                }
              });

              // Calculate and display live knee flexion
              const lHip = landmarks[23];
              const rHip = landmarks[24];
              const lKnee = landmarks[25];
              const rKnee = landmarks[26];
              const lAnkle = landmarks[27];
              const rAnkle = landmarks[28];

              if (lHip && lKnee && lAnkle && rHip && rKnee && rAnkle) {
                const lAngle = calculate2DAngle(lHip, lKnee, lAnkle);
                const rAngle = calculate2DAngle(rHip, rKnee, rAnkle);
                const lFlex = Math.max(0, 180 - lAngle);
                const rFlex = Math.max(0, 180 - rAngle);

                const lKneeCanvas = toCanvas(lKnee);
                const rKneeCanvas = toCanvas(rKnee);

                ctx.shadowBlur = 0;
                ctx.font = "bold 12px Inter, sans-serif";
                ctx.fillStyle = "#34d399";
                ctx.fillText(`${lFlex.toFixed(0)}°`, lKneeCanvas.x - 30, lKneeCanvas.y - 6);
                ctx.fillText(`${rFlex.toFixed(0)}°`, rKneeCanvas.x + 10, rKneeCanvas.y - 6);
              }
            }
          } catch (trackErr) {
            // Ignore frame detection skips
          }
        }
      }

      animFrameId.current = requestAnimationFrame(trackLoop);
    };

    animFrameId.current = requestAnimationFrame(trackLoop);
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      selectedVideos.forEach((v) => {
        if (v.previewUrl) URL.revokeObjectURL(v.previewUrl);
      });
    };
  }, []);

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

  const addFilesToQueue = (files) => {
    if (!files || files.length === 0) return;
    setError(null);

    const fileList = Array.from(files);
    const newItems = fileList.map((file, idx) => {
      const currentCount = selectedVideos.length + idx;
      const defaultAngle =
        currentCount === 0
          ? "Frontal View (Coronal)"
          : currentCount === 1
          ? "Sagittal View (Side Profile)"
          : `Angle Perspective #${currentCount + 1}`;

      return {
        id: `${file.name}-${Date.now()}-${idx}`,
        file: file,
        name: file.filename || file.name,
        size: (file.size / (1024 * 1024)).toFixed(1),
        previewUrl: URL.createObjectURL(file),
        angleLabel: defaultAngle,
      };
    });

    const allVideos = [...selectedVideos, ...newItems];
    setSelectedVideos(allVideos);
    setActivePreviewIndex(selectedVideos.length);
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(e.target.files);
    }
  };

  const handleLoadDemoVideo = async () => {
    try {
      setError(null);
      const response = await fetch("/demo_jump_landing.mp4");
      if (!response.ok) throw new Error("Sample video not found");
      const blob = await response.blob();
      const file = new File([blob], "demo_jump_landing.mp4", { type: "video/mp4" });
      const demoItem = {
        id: `demo-${Date.now()}`,
        file: file,
        name: "demo_jump_landing.mp4",
        size: (file.size / (1024 * 1024)).toFixed(1),
        previewUrl: URL.createObjectURL(file),
        angleLabel: "Frontal View (Coronal)",
      };
      setSelectedVideos([demoItem]);
      setActivePreviewIndex(0);
    } catch (e) {
      console.error("Demo video load error:", e);
      setError("Sample demo video is being initialized. You can also select sports MP4 videos from your device.");
    }
  };

  const handleRemoveFromQueue = (indexToRemove) => {
    setSelectedVideos((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      if (prev[indexToRemove]?.previewUrl) {
        URL.revokeObjectURL(prev[indexToRemove].previewUrl);
      }
      return updated;
    });
    setActivePreviewIndex(0);
  };

  const handleAngleLabelChange = (index, newLabel) => {
    setSelectedVideos((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, angleLabel: newLabel } : item))
    );
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFilesToQueue(e.dataTransfer.files);
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (selectedVideos.length === 0) {
      setError("Please select or drop at least one movement video first.");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const filesToUpload = selectedVideos.map((v) => v.file);
      const result = await uploadBatchVideosForAnalysis(filesToUpload);

      setBatchAnalysisResult(result);
      setActiveResultTab("composite");
      fetchHistoryData();
    } catch (err) {
      const errMsg =
        err.response?.data?.detail ||
        (err.response?.status === 413
          ? "Video file is too large. Please select videos under 200MB."
          : err.message || "Upload failed. Please ensure the backend server is running.");
      setError(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteVideoAnalysis(deleteTarget.id);
      setHistory((prev) => prev.filter((item) => item.id !== deleteTarget.id));
      setDeleteTarget(null);
      fetchHistoryData();
    } catch (err) {
      console.error("Failed to delete video:", err);
      setError("Failed to delete video from server. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const activeVideoItem = selectedVideos[activePreviewIndex] || selectedVideos[0];
  const activeAnalyzedVideo =
    batchAnalysisResult && activeResultTab !== "composite"
      ? batchAnalysisResult.videos[parseInt(activeResultTab, 10)]
      : batchAnalysisResult?.videos?.[0] || null;

  const hasRealAnnotation = Boolean(activeAnalyzedVideo && activeAnalyzedVideo.annotated_video_url);
  const currentPlayingUrl =
    hasRealAnnotation && displayMode === "annotated"
      ? activeAnalyzedVideo.annotated_video_url
      : activeVideoItem?.previewUrl || null;

  return (
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem 1.5rem" }}>
      {/* Top Banner */}
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "0.5rem" }}>
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: "700",
              color: "#38bdf8",
              backgroundColor: "rgba(56, 189, 248, 0.15)",
              padding: "3px 8px",
              borderRadius: "4px",
              textTransform: "uppercase",
            }}
          >
            Multi-Angle AI Engine
          </span>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Frontal, Sagittal & Batch Movement Screening
          </span>
        </div>
        <h1 style={{ fontSize: "2rem", fontWeight: "800", color: "#ffffff", letterSpacing: "-0.02em" }}>
          Biomechanical Motion Capture & Multi-Video Screening
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
          Upload single or multiple videos from different camera perspectives (Frontal, Side profile, 45°) for AI 3D joint kinematic tracking and multi-angle risk prediction.
        </p>
      </div>

      {error && (
        <div
          style={{
            backgroundColor: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "#f87171",
            padding: "1rem 1.25rem",
            borderRadius: "12px",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          <AlertTriangle size={20} />
          <div style={{ fontSize: "0.9rem" }}>{error}</div>
        </div>
      )}

      {/* Main Multi-Video Workspace */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
          gap: "2rem",
          marginBottom: "3rem",
        }}
      >
        {/* Left Column: Video Feed & Multi-Angle Queue */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          <div className="glass-panel" style={{ padding: "1.5rem", position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <Film color="#38bdf8" size={20} />
                <h2 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff", margin: 0 }}>
                  Active Video Feed
                </h2>
                {activeVideoItem && (
                  <span
                    style={{
                      fontSize: "0.75rem",
                      backgroundColor: "rgba(56, 189, 248, 0.2)",
                      color: "#38bdf8",
                      padding: "2px 8px",
                      borderRadius: "6px",
                      fontWeight: "600",
                    }}
                  >
                    {activeVideoItem.angleLabel}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleLoadDemoVideo}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  color: "#38bdf8",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                <Zap size={14} /> Try Sample Video
              </button>
            </div>

            {/* Video Player Display */}
            <div
              style={{
                width: "100%",
                height: "330px",
                backgroundColor: "#050811",
                borderRadius: "12px",
                overflow: "hidden",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid rgba(255, 255, 255, 0.08)",
              }}
            >
              {currentPlayingUrl ? (
                <>
                  <video
                    key={currentPlayingUrl}
                    ref={videoRef}
                    src={currentPlayingUrl}
                    controls
                    autoPlay
                    loop
                    muted
                    playsInline
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />

                  {/* Live Real-time Skeleton Overlay Canvas */}
                  {(!hasRealAnnotation || displayMode === "raw") && (
                    <canvas
                      ref={canvasRef}
                      width={520}
                      height={330}
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: "100%",
                        height: "100%",
                        pointerEvents: "none",
                        zIndex: 4,
                      }}
                    />
                  )}

                  {/* Status Badge */}
                  <div
                    style={{
                      position: "absolute",
                      top: "12px",
                      left: "12px",
                      backgroundColor: "rgba(10, 15, 29, 0.85)",
                      backdropFilter: "blur(8px)",
                      border: "1px solid rgba(56, 189, 248, 0.4)",
                      padding: "4px 10px",
                      borderRadius: "20px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      fontSize: "0.75rem",
                      fontWeight: "700",
                      color: "#38bdf8",
                      zIndex: 6,
                    }}
                  >
                    <span
                      style={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: "#38bdf8",
                      }}
                    />
                    33 3D POSE KEYPOINTS TRACKED
                  </div>

                  {/* Real-time AI Processing Overlay */}
                  {isUploading && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: "rgba(5, 8, 22, 0.85)",
                        backdropFilter: "blur(6px)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "12px",
                        zIndex: 10,
                        padding: "1.5rem",
                        textAlign: "center",
                      }}
                    >
                      <Activity className="animate-spin" size={32} color="#38bdf8" />
                      <div style={{ color: "#ffffff", fontWeight: "700", fontSize: "0.95rem" }}>
                        Tracking 33 3D Joint Landmarks with MediaPipe...
                      </div>
                      <div style={{ color: "#94a3b8", fontSize: "0.8rem", maxWidth: "340px" }}>
                        Computing dynamic knee valgus, landing flexion angles & biomechanical risk profile...
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "2rem" }}>
                  <Camera size={44} style={{ marginBottom: "0.75rem", opacity: 0.5 }} />
                  <div style={{ fontSize: "0.95rem", color: "var(--text-muted)", fontWeight: "600" }}>
                    No Video Selected
                  </div>
                  <div style={{ fontSize: "0.8rem", marginTop: "4px" }}>
                    Select single or multiple videos below to preview and analyze
                  </div>
                </div>
              )}
            </div>

            {/* Video Mode Selector (When Annotated Video Exists) */}
            {hasRealAnnotation && (
              <div style={{ display: "flex", gap: "10px", marginTop: "1rem", flexWrap: "wrap", alignItems: "center" }}>
                <button
                  type="button"
                  onClick={() => setDisplayMode("annotated")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    cursor: "pointer",
                    backgroundColor: displayMode === "annotated" ? "rgba(16, 185, 129, 0.2)" : "rgba(255, 255, 255, 0.04)",
                    border: displayMode === "annotated" ? "1px solid #10b981" : "1px solid rgba(255, 255, 255, 0.08)",
                    color: displayMode === "annotated" ? "#34d399" : "var(--text-muted)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <CheckCircle2 size={14} /> AI Tracked Skeleton Video
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode("raw")}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "7px 14px",
                    borderRadius: "8px",
                    fontSize: "0.8rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    backgroundColor: displayMode === "raw" ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.04)",
                    border: displayMode === "raw" ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                    color: displayMode === "raw" ? "#38bdf8" : "var(--text-muted)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <Film size={14} /> Original Video
                </button>
              </div>
            )}

            {/* Clean Polished Info / Status Banner */}
            <div
              style={{
                marginTop: "1rem",
                padding: "10px 14px",
                borderRadius: "10px",
                backgroundColor: currentPlayingUrl ? "rgba(16, 185, 129, 0.08)" : "rgba(56, 189, 248, 0.06)",
                border: currentPlayingUrl ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(56, 189, 248, 0.15)",
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              <Sparkles size={16} color={currentPlayingUrl ? "#34d399" : "#38bdf8"} style={{ flexShrink: 0 }} />
              <div style={{ fontSize: "0.82rem", color: "#cbd5e1", lineHeight: 1.45 }}>
                {currentPlayingUrl ? (
                  <span>
                    <strong style={{ color: "#34d399", fontWeight: "700" }}>Live 33-Point Pose Tracking:</strong> MediaPipe is overlaying dynamic joints. Click <strong style={{ color: "#38bdf8", fontWeight: "700" }}>"Run AI Motion Analysis"</strong> below to generate full ACL risk metrics.
                  </span>
                ) : (
                  <span>
                    Select or upload video files below to activate live 3D joint tracking and motion screening.
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Multi-Video Drag & Drop and Queue Box */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#ffffff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Layers size={18} color="#38bdf8" /> Video Batch & Angle Queue ({selectedVideos.length})
              </h3>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  border: "1px solid rgba(56, 189, 248, 0.3)",
                  color: "#38bdf8",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "0.8rem",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                <Plus size={14} /> Add Videos / Angles
              </button>
            </div>

            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: isDragging ? "2px dashed #38bdf8" : "2px dashed rgba(255, 255, 255, 0.15)",
                backgroundColor: isDragging ? "rgba(56, 189, 248, 0.08)" : "rgba(10, 15, 29, 0.5)",
                borderRadius: "12px",
                padding: "1.5rem",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
                marginBottom: selectedVideos.length > 0 ? "1.25rem" : "0",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="video/mp4,video/mov,video/avi,video/mkv,video/webm"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <UploadCloud size={36} color="#38bdf8" style={{ marginBottom: "0.5rem" }} />
              <div style={{ color: "#ffffff", fontWeight: "600", fontSize: "0.95rem" }}>
                Select or Drag & Drop Multiple Videos
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: "0.78rem", marginTop: "4px" }}>
                Upload multiple angles (e.g. Frontal + Side view) • MP4, WEBM, MOV (Max 200MB each)
              </div>
            </div>

            {/* Queued Videos List */}
            {selectedVideos.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "1.5rem" }}>
                {selectedVideos.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => setActivePreviewIndex(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      borderRadius: "10px",
                      backgroundColor: activePreviewIndex === idx ? "rgba(56, 189, 248, 0.12)" : "rgba(15, 23, 42, 0.6)",
                      border: activePreviewIndex === idx ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", flex: 1, overflow: "hidden" }}>
                      <Film size={18} color={activePreviewIndex === idx ? "#38bdf8" : "var(--text-dim)"} />
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#ffffff", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
                          {item.size} MB
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <select
                        value={item.angleLabel}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => handleAngleLabelChange(idx, e.target.value)}
                        style={{
                          backgroundColor: "rgba(7, 11, 20, 0.9)",
                          border: "1px solid rgba(255, 255, 255, 0.12)",
                          color: "#38bdf8",
                          borderRadius: "6px",
                          padding: "4px 8px",
                          fontSize: "0.75rem",
                          fontWeight: "600",
                          outline: "none",
                        }}
                      >
                        <option value="Frontal View (Coronal)">Frontal View</option>
                        <option value="Sagittal View (Side Profile)">Sagittal Side View</option>
                        <option value="45° Antero-Lateral View">45° Dynamic Angle</option>
                        <option value="Posterior View (Back)">Posterior View</option>
                        <option value="Drill Sequence Test">Drill Sequence</option>
                      </select>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFromQueue(idx);
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#f87171",
                          cursor: "pointer",
                          padding: "4px",
                        }}
                        title="Remove from queue"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Run Analysis Submit Button */}
            <button
              type="button"
              disabled={isUploading || selectedVideos.length === 0}
              onClick={handleUploadSubmit}
              className="btn-emerald"
              style={{
                width: "100%",
                padding: "14px",
                fontSize: "1rem",
                opacity: selectedVideos.length === 0 ? 0.6 : 1,
              }}
            >
              {isUploading
                ? `Analyzing ${selectedVideos.length} Video${selectedVideos.length > 1 ? "s" : ""} with MediaPipe AI...`
                : `Run AI Motion Analysis on ${selectedVideos.length > 0 ? selectedVideos.length : ""} Video${selectedVideos.length > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>

        {/* Right Column: Multi-Angle Results & Composite Risk Assessment */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {batchAnalysisResult ? (
            <div className="glass-panel glass-panel-glow" style={{ padding: "1.75rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
                <div>
                  <span style={{ fontSize: "0.75rem", fontWeight: "700", color: "#10b981", textTransform: "uppercase" }}>
                    Screening Diagnostic
                  </span>
                  <h2 style={{ fontSize: "1.4rem", fontWeight: "800", color: "#ffffff", margin: 0 }}>
                    AI Biomechanical Assessment
                  </h2>
                </div>

                <Link
                  to="/analysis-report"
                  className="btn-primary"
                  style={{ textDecoration: "none", padding: "6px 14px", fontSize: "0.8rem" }}
                >
                  Full Report <FileText size={14} />
                </Link>
              </div>

              {/* Multi-Angle Tab Selector if multiple videos were analyzed */}
              {batchAnalysisResult.videos && batchAnalysisResult.videos.length > 1 && (
                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    overflowX: "auto",
                    paddingBottom: "8px",
                    marginBottom: "1.5rem",
                    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setActiveResultTab("composite")}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "8px",
                      fontSize: "0.82rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      backgroundColor: activeResultTab === "composite" ? "rgba(56, 189, 248, 0.2)" : "rgba(15, 23, 42, 0.6)",
                      border: activeResultTab === "composite" ? "1px solid #38bdf8" : "1px solid rgba(255, 255, 255, 0.08)",
                      color: activeResultTab === "composite" ? "#38bdf8" : "var(--text-muted)",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Compass size={15} /> 🌟 Multi-Angle Fusion
                  </button>

                  {batchAnalysisResult.videos.map((vid, idx) => (
                    <button
                      key={vid.video_id}
                      type="button"
                      onClick={() => setActiveResultTab(idx.toString())}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "8px",
                        fontSize: "0.82rem",
                        fontWeight: "700",
                        cursor: "pointer",
                        backgroundColor: activeResultTab === idx.toString() ? "rgba(16, 185, 129, 0.2)" : "rgba(15, 23, 42, 0.6)",
                        border: activeResultTab === idx.toString() ? "1px solid #10b981" : "1px solid rgba(255, 255, 255, 0.08)",
                        color: activeResultTab === idx.toString() ? "#34d399" : "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Film size={14} /> {vid.angle_label || `Video ${idx + 1}`}
                    </button>
                  ))}
                </div>
              )}

              {/* View 1: Composite Multi-Angle Fusion View */}
              {activeResultTab === "composite" ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem" }}>
                    <RiskGauge
                      score={batchAnalysisResult.composite.risk_score}
                      status={batchAnalysisResult.composite.risk_status}
                    />
                  </div>

                  {/* 4 Core Kinematic Telemetry Matrix */}
                  {(() => {
                    const compValgus = parseFloat(batchAnalysisResult.composite.peak_knee_valgus) || 0;
                    const compFlexion = parseFloat(batchAnalysisResult.composite.landing_flexion) || 0;
                    const compAsym = parseFloat(batchAnalysisResult.composite.asymmetry_ratio) || 0;
                    const compGrf = parseFloat(batchAnalysisResult.composite.ground_reaction_force) || 0;

                    return (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "1.5rem" }}>
                        {/* 1. Peak Dynamic Knee Valgus */}
                        <div
                          style={{
                            backgroundColor: "rgba(10, 15, 29, 0.75)",
                            border: compValgus > 15 ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(56, 189, 248, 0.25)",
                            borderRadius: "12px",
                            padding: "1rem 1.15rem",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "6px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "700" }}>
                              Peak Knee Valgus (θ)
                            </span>
                            <span style={{ fontSize: "0.68rem", fontWeight: "700", color: "#94a3b8", backgroundColor: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: "4px" }}>
                              Ideal &lt;12°
                            </span>
                          </div>
                          <div style={{ fontSize: "1.5rem", fontWeight: "800", color: compValgus > 15 ? "#f87171" : "#38bdf8", lineHeight: 1.1 }}>
                            {batchAnalysisResult.composite.peak_knee_valgus}
                          </div>
                          <div>
                            <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", marginBottom: "4px" }}>
                              <div style={{ width: `${Math.min(Math.round((compValgus / 30) * 100), 100)}%`, height: "100%", backgroundColor: compValgus > 15 ? "#ef4444" : "#38bdf8" }} />
                            </div>
                            <span style={{ fontSize: "0.72rem", fontWeight: "600", color: compValgus > 15 ? "#f87171" : "#34d399" }}>
                              {compValgus > 15 ? "⚠ Medial Collapse Flag" : "✓ Optimal Alignment"}
                            </span>
                          </div>
                        </div>

                        {/* 2. Landing Knee Flexion */}
                        <div
                          style={{
                            backgroundColor: "rgba(10, 15, 29, 0.75)",
                            border: compFlexion < 35 ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(16, 185, 129, 0.25)",
                            borderRadius: "12px",
                            padding: "1rem 1.15rem",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "6px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "700" }}>
                              Landing Flexion
                            </span>
                            <span style={{ fontSize: "0.68rem", fontWeight: "700", color: "#94a3b8", backgroundColor: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: "4px" }}>
                              Target &gt;45°
                            </span>
                          </div>
                          <div style={{ fontSize: "1.5rem", fontWeight: "800", color: compFlexion < 35 ? "#f87171" : "#10b981", lineHeight: 1.1 }}>
                            {batchAnalysisResult.composite.landing_flexion}
                          </div>
                          <div>
                            <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", marginBottom: "4px" }}>
                              <div style={{ width: `${Math.min(Math.round((compFlexion / 60) * 100), 100)}%`, height: "100%", backgroundColor: compFlexion < 35 ? "#ef4444" : "#10b981" }} />
                            </div>
                            <span style={{ fontSize: "0.72rem", fontWeight: "600", color: compFlexion < 35 ? "#f87171" : "#34d399" }}>
                              {compFlexion < 35 ? "⚠ Stiff Contact Shock" : "✓ Soft Dynamic Shock"}
                            </span>
                          </div>
                        </div>

                        {/* 3. Bilateral Movement Asymmetry */}
                        <div
                          style={{
                            backgroundColor: "rgba(10, 15, 29, 0.75)",
                            border: compAsym > 10 ? "1px solid rgba(168, 85, 247, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "12px",
                            padding: "1rem 1.15rem",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "6px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "700" }}>
                              Bilateral Asymmetry
                            </span>
                            <span style={{ fontSize: "0.68rem", fontWeight: "700", color: "#94a3b8", backgroundColor: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: "4px" }}>
                              Safe &lt;8%
                            </span>
                          </div>
                          <div style={{ fontSize: "1.5rem", fontWeight: "800", color: "#a855f7", lineHeight: 1.1 }}>
                            {batchAnalysisResult.composite.asymmetry_ratio}
                          </div>
                          <div>
                            <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", marginBottom: "4px" }}>
                              <div style={{ width: `${Math.min(Math.round((compAsym / 25) * 100), 100)}%`, height: "100%", backgroundColor: compAsym > 10 ? "#a855f7" : "#38bdf8" }} />
                            </div>
                            <span style={{ fontSize: "0.72rem", fontWeight: "600", color: compAsym > 10 ? "#c084fc" : "#34d399" }}>
                              {compAsym > 10 ? "⚠ Unilateral Bias" : "✓ Balanced Limb Symmetry"}
                            </span>
                          </div>
                        </div>

                        {/* 4. Ground Reaction Force (GRF) */}
                        <div
                          style={{
                            backgroundColor: "rgba(10, 15, 29, 0.75)",
                            border: compGrf > 1.8 ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                            borderRadius: "12px",
                            padding: "1rem 1.15rem",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            gap: "6px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: "700" }}>
                              Ground Impact Shock (GRF)
                            </span>
                            <span style={{ fontSize: "0.68rem", fontWeight: "700", color: "#94a3b8", backgroundColor: "rgba(255,255,255,0.06)", padding: "1px 6px", borderRadius: "4px" }}>
                              Safe &lt;1.5x BW
                            </span>
                          </div>
                          <div style={{ fontSize: "1.5rem", fontWeight: "800", color: compGrf > 1.8 ? "#f87171" : "#38bdf8", lineHeight: 1.1 }}>
                            {batchAnalysisResult.composite.ground_reaction_force}
                          </div>
                          <div>
                            <div style={{ width: "100%", height: "4px", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: "2px", overflow: "hidden", marginBottom: "4px" }}>
                              <div style={{ width: `${Math.min(Math.round((compGrf / 4) * 100), 100)}%`, height: "100%", backgroundColor: compGrf > 1.8 ? "#ef4444" : "#38bdf8" }} />
                            </div>
                            <span style={{ fontSize: "0.72rem", fontWeight: "600", color: compGrf > 1.8 ? "#f87171" : "#34d399" }}>
                              {compGrf > 1.8 ? "⚠ High Ground Force" : "✓ Controlled Impact"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Specific Injury Categories Matrix */}
                  {batchAnalysisResult.composite.injury_categories?.length > 0 && (
                    <div style={{ marginBottom: "1.5rem" }}>
                      <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#ffffff", marginBottom: "8px" }}>
                        Multi-Vector Injury Vulnerability Breakdown
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {batchAnalysisResult.composite.injury_categories.map((cat, i) => (
                          <div
                            key={i}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              padding: "8px 12px",
                              backgroundColor: "rgba(15, 23, 42, 0.6)",
                              borderRadius: "8px",
                              border: "1px solid rgba(255, 255, 255, 0.06)",
                            }}
                          >
                            <span style={{ fontSize: "0.82rem", color: "#ffffff", fontWeight: "600" }}>{cat.category}</span>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                padding: "2px 8px",
                                borderRadius: "4px",
                                backgroundColor:
                                  cat.risk_level === "High"
                                    ? "rgba(239, 68, 68, 0.2)"
                                    : cat.risk_level === "Moderate"
                                    ? "rgba(245, 158, 11, 0.2)"
                                    : "rgba(16, 185, 129, 0.2)",
                                color:
                                  cat.risk_level === "High"
                                    ? "#f87171"
                                    : cat.risk_level === "Moderate"
                                    ? "#fbbf24"
                                    : "#34d399",
                              }}
                            >
                              {cat.risk_level} Risk
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tailored Corrective Exercises */}
                  {batchAnalysisResult.composite.recommendations?.length > 0 && (
                    <div>
                      <div style={{ fontSize: "0.85rem", fontWeight: "700", color: "#ffffff", marginBottom: "8px" }}>
                        Prescribed Corrective Protocols
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        {batchAnalysisResult.composite.recommendations.slice(0, 2).map((rec, i) => (
                          <div
                            key={i}
                            style={{
                              padding: "10px 12px",
                              backgroundColor: "rgba(16, 185, 129, 0.08)",
                              border: "1px solid rgba(16, 185, 129, 0.2)",
                              borderRadius: "8px",
                            }}
                          >
                            <div style={{ fontSize: "0.82rem", fontWeight: "700", color: "#34d399" }}>{rec.title}</div>
                            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: "2px" }}>
                              {rec.exercise}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* View 2: Individual Video Perspective View */
                activeAnalyzedVideo && (
                  <div>
                    <div style={{ marginBottom: "1rem" }}>
                      <span style={{ fontSize: "0.78rem", color: "#38bdf8", fontWeight: "700" }}>
                        {activeAnalyzedVideo.angle_label}
                      </span>
                      <div style={{ fontSize: "0.95rem", fontWeight: "700", color: "#ffffff" }}>
                        {activeAnalyzedVideo.filename}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem" }}>
                      <RiskGauge score={activeAnalyzedVideo.risk_score} status={activeAnalyzedVideo.risk_status} />
                    </div>

                    {(() => {
                      const vValgus = parseFloat(activeAnalyzedVideo.knee_valgus) || 0;
                      const vFlexion = parseFloat(activeAnalyzedVideo.landing_flexion) || 0;
                      const vTrunk = parseFloat(activeAnalyzedVideo.trunk_tilt) || 0;
                      const vAsym = parseFloat(activeAnalyzedVideo.asymmetry_ratio) || 0;

                      return (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px", marginBottom: "1.5rem" }}>
                          {/* Knee Valgus */}
                          <div
                            style={{
                              backgroundColor: "rgba(10, 15, 29, 0.75)",
                              border: vValgus > 15 ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(56, 189, 248, 0.25)",
                              borderRadius: "12px",
                              padding: "10px 12px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "700" }}>Knee Valgus</span>
                              <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>&lt;12°</span>
                            </div>
                            <div style={{ fontSize: "1.35rem", fontWeight: "800", color: vValgus > 15 ? "#f87171" : "#38bdf8" }}>
                              {activeAnalyzedVideo.knee_valgus}
                            </div>
                            <span style={{ fontSize: "0.68rem", fontWeight: "600", color: vValgus > 15 ? "#f87171" : "#34d399" }}>
                              {vValgus > 15 ? "⚠ Collapse Flag" : "✓ Optimal"}
                            </span>
                          </div>

                          {/* Flexion Depth */}
                          <div
                            style={{
                              backgroundColor: "rgba(10, 15, 29, 0.75)",
                              border: vFlexion < 35 ? "1px solid rgba(239, 68, 68, 0.35)" : "1px solid rgba(16, 185, 129, 0.25)",
                              borderRadius: "12px",
                              padding: "10px 12px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "700" }}>Landing Flexion</span>
                              <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>&gt;45°</span>
                            </div>
                            <div style={{ fontSize: "1.35rem", fontWeight: "800", color: vFlexion < 35 ? "#f87171" : "#10b981" }}>
                              {activeAnalyzedVideo.landing_flexion}
                            </div>
                            <span style={{ fontSize: "0.68rem", fontWeight: "600", color: vFlexion < 35 ? "#f87171" : "#34d399" }}>
                              {vFlexion < 35 ? "⚠ Stiff Contact" : "✓ Soft Cushioning"}
                            </span>
                          </div>

                          {/* Trunk Tilt */}
                          <div
                            style={{
                              backgroundColor: "rgba(10, 15, 29, 0.75)",
                              border: vTrunk > 5 ? "1px solid rgba(245, 158, 11, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                              borderRadius: "12px",
                              padding: "10px 12px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "700" }}>Trunk Lean</span>
                              <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>&lt;5°</span>
                            </div>
                            <div style={{ fontSize: "1.35rem", fontWeight: "800", color: vTrunk > 5 ? "#fbbf24" : "#38bdf8" }}>
                              {activeAnalyzedVideo.trunk_tilt}
                            </div>
                            <span style={{ fontSize: "0.68rem", fontWeight: "600", color: vTrunk > 5 ? "#fbbf24" : "#34d399" }}>
                              {vTrunk > 5 ? "⚠ Shear Deviation" : "✓ Stable Spine"}
                            </span>
                          </div>

                          {/* Asymmetry */}
                          <div
                            style={{
                              backgroundColor: "rgba(10, 15, 29, 0.75)",
                              border: vAsym > 10 ? "1px solid rgba(168, 85, 247, 0.35)" : "1px solid rgba(255, 255, 255, 0.08)",
                              borderRadius: "12px",
                              padding: "10px 12px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: "700" }}>Asymmetry</span>
                              <span style={{ fontSize: "0.65rem", color: "#94a3b8" }}>&lt;8%</span>
                            </div>
                            <div style={{ fontSize: "1.35rem", fontWeight: "800", color: "#a855f7" }}>
                              {activeAnalyzedVideo.asymmetry_ratio}
                            </div>
                            <span style={{ fontSize: "0.68rem", fontWeight: "600", color: vAsym > 10 ? "#c084fc" : "#34d399" }}>
                              {vAsym > 10 ? "⚠ Unilateral Bias" : "✓ Symmetric"}
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="glass-panel" style={{ padding: "2rem", textAlign: "center", color: "var(--text-dim)" }}>
              <Compass size={48} style={{ marginBottom: "1rem", color: "#38bdf8", opacity: 0.6 }} />
              <h3 style={{ fontSize: "1.1rem", fontWeight: "700", color: "#ffffff", marginBottom: "0.5rem" }}>
                Multi-Angle Telemetry Standby
              </h3>
              <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: "340px", margin: "0 auto" }}>
                Upload one or multiple movement videos on the left to extract 33-point 3D skeleton kinematics and composite risk metrics.
              </p>
            </div>
          )}

          {/* Screening History Archive */}
          <div className="glass-panel" style={{ padding: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: "700", color: "#ffffff", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                <Activity size={18} color="#10b981" /> Screening History Archive ({history.length})
              </h3>
            </div>

            {history.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-dim)", fontSize: "0.85rem" }}>
                No video screenings recorded yet.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "240px", overflowY: "auto" }}>
                {history.map((item) => (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 12px",
                      backgroundColor: "rgba(15, 23, 42, 0.6)",
                      borderRadius: "8px",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                    }}
                  >
                    <Link
                      to={`/analysis-report?id=${item.id}`}
                      style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "10px", flex: 1, overflow: "hidden" }}
                    >
                      <Film size={16} color="#38bdf8" />
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: "600", color: "#ffffff", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                          {item.filename}
                        </div>
                        <div style={{ fontSize: "0.72rem", color: "var(--text-dim)" }}>
                          {item.created_at} • {item.risk_status || "Completed"}
                        </div>
                      </div>
                    </Link>

                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <Link
                        to={`/analysis-report?id=${item.id}`}
                        style={{
                          textDecoration: "none",
                          fontSize: "0.72rem",
                          fontWeight: "700",
                          color: "#38bdf8",
                          backgroundColor: "rgba(56, 189, 248, 0.12)",
                          padding: "3px 8px",
                          borderRadius: "4px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        Report <ChevronRight size={12} />
                      </Link>

                      <span
                        style={{
                          fontSize: "0.78rem",
                          fontWeight: "800",
                          color: (item.risk_score || 0) > 50 ? "#f87171" : "#34d399",
                        }}
                      >
                        {item.risk_score}%
                      </span>

                      <button
                        type="button"
                        onClick={() => setDeleteTarget({ id: item.id, filename: item.filename })}
                        style={{
                          background: "none",
                          border: "none",
                          color: "#f87171",
                          cursor: "pointer",
                          padding: "4px",
                        }}
                        title="Delete screening"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Custom Dark Glassmorphism Delete Confirmation Modal */}
      {deleteTarget && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(3, 7, 18, 0.78)",
            backdropFilter: "blur(8px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
          onClick={() => !isDeleting && setDeleteTarget(null)}
        >
          <div
            style={{
              backgroundColor: "#0b1329",
              border: "1px solid rgba(239, 68, 68, 0.35)",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.7), 0 0 30px rgba(239, 68, 68, 0.15)",
              borderRadius: "16px",
              padding: "1.75rem",
              maxWidth: "460px",
              width: "100%",
              position: "relative",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Icon Badge */}
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                backgroundColor: "rgba(239, 68, 68, 0.12)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.25rem",
                color: "#f87171",
              }}
            >
              <Trash2 size={24} />
            </div>

            {/* Title & Body */}
            <h3 style={{ fontSize: "1.2rem", fontWeight: "800", color: "#ffffff", margin: "0 0 0.5rem 0" }}>
              Delete Biomechanical Screening?
            </h3>
            <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.5, margin: "0 0 1rem 0" }}>
              Are you sure you want to permanently delete this screening record? This action will remove all recorded joint kinematic angles and motion capture data.
            </p>

            {/* Video Filename Chip */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 12px",
                backgroundColor: "rgba(15, 23, 42, 0.8)",
                borderRadius: "8px",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                marginBottom: "1.5rem",
                fontSize: "0.8rem",
                color: "#94a3b8",
                overflow: "hidden",
              }}
            >
              <Film size={15} color="#38bdf8" />
              <span style={{ fontWeight: "600", color: "#e2e8f0", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                {deleteTarget.filename || "Screening Video"}
              </span>
            </div>

            {/* Modal Action Buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteTarget(null)}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: "600",
                  cursor: "pointer",
                  backgroundColor: "rgba(255, 255, 255, 0.06)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  color: "#cbd5e1",
                }}
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                style={{
                  padding: "9px 18px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: "700",
                  cursor: isDeleting ? "not-allowed" : "pointer",
                  backgroundColor: "#dc2626",
                  backgroundImage: "linear-gradient(135deg, #ef4444, #b91c1c)",
                  border: "none",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "0 4px 14px rgba(220, 38, 38, 0.4)",
                  opacity: isDeleting ? 0.7 : 1,
                }}
              >
                <Trash2 size={15} /> {isDeleting ? "Deleting..." : "Delete Screening"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
