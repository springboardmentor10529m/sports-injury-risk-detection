import { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";

import {
    Upload,
    Video,
    Activity,
    ShieldAlert,
    User,
    AlertTriangle,
    CheckCircle,
    FileVideo,
    Play,
    Clock,
    Loader,
    XCircle,
    BarChart3,
    Sliders,
    Compass,
    Zap,
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import RiskBadge from "../components/RiskBadge";

import {
    uploadVideoFile,
    triggerAnalysis,
    getAnalysisStatus,
    getAnalysisFeatures,
    getLessResult,
} from "../api/videos";
import { getMyAthleteProfile } from "../api/athletes";

// All five fields must be non-null for the profile to be considered complete.
const REQUIRED_FIELDS = ["sport", "position", "age", "height", "weight"];

function isProfileComplete(profile) {
    if (!profile) return false;
    return REQUIRED_FIELDS.every(
        (f) =>
            profile[f] !== null &&
            profile[f] !== undefined &&
            profile[f] !== ""
    );
}

/** Format bytes into a human-readable string (KB / MB / GB). */
function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/** Format seconds into "Mm Ss" or "Xs" */
function formatDuration(seconds) {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
}

// Analysis status constants (must match backend)
const STATUS_PENDING    = "PENDING";
const STATUS_PROCESSING = "PROCESSING";
const STATUS_COMPLETED  = "COMPLETED";
const STATUS_FAILED     = "FAILED";

const POLL_INTERVAL_MS = 2000;  // poll every 2 seconds

function VideoAnalysis() {
    // ── Profile state ─────────────────────────────────────────
    const [profile, setProfile]               = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError]     = useState("");

    // ── Upload state ──────────────────────────────────────────
    const [file, setFile]           = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadPct, setUploadPct] = useState(0);
    const [uploadedVideo, setUploadedVideo] = useState(null); // server metadata
    const [uploadError, setUploadError]     = useState("");

    // ── Analysis state ────────────────────────────────────────
    const [analysisId, setAnalysisId]         = useState(null);
    const [analysisStatus, setAnalysisStatus] = useState(null);  // full status obj
    const [analysisFeatures, setAnalysisFeatures] = useState(null); // features obj
    const [analysisLess, setAnalysisLess]     = useState(null);     // LESS result obj
    const [analyzing, setAnalyzing]           = useState(false);
    const [analyzeError, setAnalyzeError]     = useState("");

    // Polling ref — holds the interval ID so we can clear it
    const pollRef = useRef(null);

    // ── Fetch athlete profile on mount ────────────────────────
    useEffect(() => {
        async function fetchProfile() {
            setProfileLoading(true);
            setProfileError("");

            try {
                const data = await getMyAthleteProfile();
                setProfile(data);
            } catch (err) {
                if (err.response?.status === 404) {
                    setProfile(null);
                } else if (err.response?.status === 403) {
                    setProfile(null);
                } else {
                    setProfileError(
                        err.response?.data?.detail ||
                        "Could not load athlete profile."
                    );
                }
            } finally {
                setProfileLoading(false);
            }
        }

        fetchProfile();
    }, []);

    // ── Cleanup polling on unmount ────────────────────────────
    useEffect(() => {
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    // ── Handlers ──────────────────────────────────────────────
    function handleFileChange(event) {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setUploadError("");
        setUploadedVideo(null);  // clear previous result
        setUploadPct(0);
        setAnalysisId(null);
        setAnalysisStatus(null);
        setAnalysisFeatures(null);
        setAnalysisLess(null);
        setAnalyzeError("");
        if (pollRef.current) clearInterval(pollRef.current);
    }

    const handleUpload = useCallback(async () => {
        if (!file) {
            setUploadError("Please select a video first.");
            return;
        }

        setUploading(true);
        setUploadError("");
        setUploadPct(0);
        setUploadedVideo(null);

        try {
            const data = await uploadVideoFile(file, (progressEvent) => {
                if (progressEvent.total) {
                    const pct = Math.round(
                        (progressEvent.loaded / progressEvent.total) * 100
                    );
                    setUploadPct(pct);
                }
            });

            setUploadedVideo(data);
            setFile(null);  // clear file picker after success
        } catch (err) {
            const detail =
                err.response?.data?.detail ||
                "Video upload failed. Please try again.";
            setUploadError(detail);
        } finally {
            setUploading(false);
            setUploadPct(0);
        }
    }, [file]);

    const handleAnalyze = useCallback(async () => {
        if (!uploadedVideo?.video_id) return;
        if (analyzing) return;  // prevent duplicate requests

        setAnalyzing(true);
        setAnalyzeError("");
        setAnalysisId(null);
        setAnalysisStatus(null);
        setAnalysisFeatures(null);
        setAnalysisLess(null);
        if (pollRef.current) clearInterval(pollRef.current);

        try {
            // Trigger analysis — returns {analysis_id, status: "PENDING", ...}
            const trigger = await triggerAnalysis(uploadedVideo.video_id);
            setAnalysisId(trigger.analysis_id);
            setAnalysisStatus({ status: trigger.status });

            // Start polling
            pollRef.current = setInterval(async () => {
                try {
                    const statusData = await getAnalysisStatus(uploadedVideo.video_id);
                    setAnalysisStatus(statusData);

                    if (statusData.status === STATUS_COMPLETED) {
                        clearInterval(pollRef.current);
                        pollRef.current = null;
                        setAnalyzing(false);

                        // Fetch extracted features & LESS results
                        try {
                            const featData = await getAnalysisFeatures(uploadedVideo.video_id);
                            setAnalysisFeatures(featData);
                        } catch (featErr) {
                            console.warn("Could not load features:", featErr);
                        }
                        try {
                            const lessData = await getLessResult(uploadedVideo.video_id);
                            setAnalysisLess(lessData);
                        } catch (lessErr) {
                            console.warn("Could not load LESS results:", lessErr);
                        }
                    } else if (statusData.status === STATUS_FAILED) {
                        clearInterval(pollRef.current);
                        pollRef.current = null;
                        setAnalyzing(false);
                    }
                } catch (pollErr) {
                    // Non-fatal polling error — keep trying
                    console.warn("Polling error:", pollErr);
                }
            }, POLL_INTERVAL_MS);

        } catch (err) {
            const detail =
                err.response?.data?.detail ||
                "Failed to start analysis. Please try again.";
            setAnalyzeError(detail);
            setAnalyzing(false);
        }
    }, [uploadedVideo, analyzing]);

    const complete = isProfileComplete(profile);

    return (
        <div className="app-layout">
            <Sidebar />

            <main className="dashboard">
                <div className="page-header">
                    <div>
                        <span className="eyebrow">AI ANALYSIS</span>
                        <h1>Video Movement Analysis</h1>
                        <p>
                            Upload an athlete movement video for
                            biomechanical assessment.
                        </p>
                    </div>
                </div>

                {/* ── Profile summary / gate ──────────────────────── */}
                {profileLoading ? (
                    <div className="loading-container">
                        <div className="spinner" />
                        <span>Loading athlete profile…</span>
                    </div>
                ) : profileError ? (
                    <div className="error-box">{profileError}</div>
                ) : !complete ? (
                    <section className="incomplete-profile-banner">
                        <div className="incomplete-profile-icon">
                            <AlertTriangle size={22} />
                        </div>

                        <div className="incomplete-profile-body">
                            <h3>Complete your athlete profile first</h3>
                            <p>
                                Video analysis requires your{" "}
                                <strong>
                                    Sport, Position, Age, Height,
                                </strong>{" "}
                                and <strong>Weight</strong> to be on
                                record. Please fill in your profile
                                before uploading a video.
                            </p>
                            <Link
                                to="/profile"
                                className="primary-button"
                                id="go-to-profile-btn"
                            >
                                <User size={15} />
                                Complete Profile
                            </Link>
                        </div>
                    </section>
                ) : (
                    <>
                        {/* ── Athlete details summary ─────────────────── */}
                        <section className="panel athlete-summary-panel">
                            <h2>Athlete Details</h2>

                            <div className="athlete-details-grid">
                                <DetailItem
                                    label="Sport"
                                    value={profile.sport}
                                />
                                <DetailItem
                                    label="Position"
                                    value={profile.position}
                                />
                                <DetailItem
                                    label="Age"
                                    value={`${profile.age} yrs`}
                                />
                                <DetailItem
                                    label="Height"
                                    value={`${profile.height} cm`}
                                />
                                <DetailItem
                                    label="Weight"
                                    value={`${profile.weight} kg`}
                                />
                            </div>
                        </section>

                        {/* ── Video upload ─────────────────────────────── */}
                        <section
                            className="upload-panel"
                            style={{ marginTop: "20px" }}
                        >
                            <div className="upload-icon">
                                <Video size={30} />
                            </div>

                            <h2>Upload movement video</h2>

                            <p>
                                Supported formats: MP4, MOV, AVI, WebM
                                &nbsp;·&nbsp; Max 500 MB
                            </p>

                            {/* File picker label */}
                            <label className="upload-box">
                                <Upload size={25} />

                                <span>
                                    {file ? (
                                        <>
                                            <strong>{file.name}</strong>
                                            <small
                                                style={{
                                                    display: "block",
                                                    marginTop: 4,
                                                    color: "#7b8494",
                                                    fontSize: 12,
                                                }}
                                            >
                                                {formatBytes(file.size)}
                                            </small>
                                        </>
                                    ) : (
                                        "Choose a video file"
                                    )}
                                </span>

                                <input
                                    type="file"
                                    accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/*"
                                    onChange={handleFileChange}
                                    hidden
                                    disabled={uploading}
                                />
                            </label>

                            {/* Upload button + progress bar */}
                            {file && !uploading && (
                                <button
                                    className="primary-button"
                                    onClick={handleUpload}
                                    id="start-upload-btn"
                                >
                                    <Upload size={15} />
                                    Upload Video
                                </button>
                            )}

                            {uploading && (
                                <div className="upload-progress-wrap">
                                    <div className="upload-progress-bar">
                                        <div
                                            className="upload-progress-fill"
                                            style={{ width: `${uploadPct}%` }}
                                        />
                                    </div>
                                    <span className="upload-progress-label">
                                        Uploading… {uploadPct}%
                                    </span>
                                </div>
                            )}

                            {uploadError && (
                                <div className="error-box">{uploadError}</div>
                            )}
                        </section>

                        {/* ── Upload success card ───────────────────────── */}
                        {uploadedVideo && (
                            <section className="video-success-panel">
                                <div className="video-success-icon">
                                    <CheckCircle size={22} />
                                </div>

                                <div className="video-success-body">
                                    <h3>Video saved to database</h3>

                                    <div className="video-meta-grid">
                                        <MetaItem
                                            label="File"
                                            value={
                                                <span className="video-filename">
                                                    <FileVideo size={13} />
                                                    {uploadedVideo.original_filename}
                                                </span>
                                            }
                                        />
                                        <MetaItem
                                            label="Size"
                                            value={formatBytes(
                                                uploadedVideo.file_size ?? 0
                                            )}
                                        />
                                        <MetaItem
                                            label="Type"
                                            value={uploadedVideo.content_type}
                                        />
                                        <MetaItem
                                            label="Status"
                                            value={
                                                <span className="status-complete">
                                                    ✓ {uploadedVideo.processing_status}
                                                </span>
                                            }
                                        />
                                        <MetaItem
                                            label="Video ID"
                                            value={
                                                <span className="profile-id">
                                                    {uploadedVideo.video_id}
                                                </span>
                                            }
                                        />
                                        <MetaItem
                                            label="Uploaded"
                                            value={new Date(
                                                uploadedVideo.uploaded_at
                                            ).toLocaleString()}
                                        />
                                    </div>

                                    {/* ── Analyze button ─────────────────── */}
                                    {!analysisStatus && !analyzing && (
                                        <button
                                            className="primary-button"
                                            style={{ marginTop: 16 }}
                                            onClick={handleAnalyze}
                                            id="analyze-btn"
                                            disabled={analyzing}
                                        >
                                            <Play size={15} />
                                            Analyze Pose
                                        </button>
                                    )}

                                    {analyzeError && (
                                        <div className="error-box" style={{ marginTop: 12 }}>
                                            {analyzeError}
                                        </div>
                                    )}
                                </div>
                            </section>
                        )}

                        {/* ── Analysis status panel ─────────────────────── */}
                        {analysisStatus && (
                            <section className="panel" style={{ marginTop: 20 }}>
                                <div className="panel-header">
                                    <div>
                                        <h2>Pose Estimation & Feature Extraction</h2>
                                        <p>MediaPipe BlazePose — 33 body landmarks & kinematic metrics</p>
                                    </div>
                                    <Activity size={22} />
                                </div>

                                {/* Status badge */}
                                <div style={{ margin: "16px 0" }}>
                                    <AnalysisStatusBadge status={analysisStatus.status} />
                                </div>

                                {/* Processing indicator */}
                                {(analysisStatus.status === STATUS_PENDING ||
                                    analysisStatus.status === STATUS_PROCESSING) && (
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                            color: "#7b8494",
                                            fontSize: 14,
                                        }}
                                    >
                                        <Loader
                                            size={16}
                                            style={{
                                                animation: "spin 1s linear infinite",
                                            }}
                                        />
                                        <span>
                                            {analysisStatus.status === STATUS_PENDING
                                                ? "Queued — waiting for processing to start…"
                                                : "Extracting frames, detecting landmarks, and calculating features…"}
                                        </span>
                                    </div>
                                )}

                                {/* Failure message */}
                                {analysisStatus.status === STATUS_FAILED && (
                                    <div className="error-box" style={{ marginTop: 8 }}>
                                        <XCircle
                                            size={15}
                                            style={{ marginRight: 8, verticalAlign: "middle" }}
                                        />
                                        {analysisStatus.error_message ||
                                            "Analysis failed. Please try again."}
                                    </div>
                                )}

                                {/* Completed — show metadata */}
                                {analysisStatus.status === STATUS_COMPLETED && (
                                    <div style={{ marginTop: 12 }}>
                                        <div className="video-meta-grid">
                                            <MetaItem
                                                label="FPS"
                                                value={
                                                    analysisStatus.fps != null
                                                        ? analysisStatus.fps.toFixed(2)
                                                        : "—"
                                                }
                                            />
                                            <MetaItem
                                                label="Duration"
                                                value={formatDuration(
                                                    analysisStatus.duration_seconds
                                                )}
                                            />
                                            <MetaItem
                                                label="Resolution"
                                                value={
                                                    analysisStatus.width && analysisStatus.height
                                                        ? `${analysisStatus.width}×${analysisStatus.height}`
                                                        : "—"
                                                }
                                            />
                                            <MetaItem
                                                label="Total Frames"
                                                value={
                                                    analysisStatus.frame_count ?? "—"
                                                }
                                            />
                                            <MetaItem
                                                label="Frames Analysed"
                                                value={
                                                    analysisStatus.frames_processed ?? "—"
                                                }
                                            />
                                            <MetaItem
                                                label="Landmarks/frame"
                                                value="33 (MediaPipe)"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Re-analyze button on failure */}
                                {analysisStatus.status === STATUS_FAILED && !analyzing && (
                                    <button
                                        className="primary-button"
                                        style={{ marginTop: 16 }}
                                        onClick={handleAnalyze}
                                        id="retry-analyze-btn"
                                    >
                                        <Play size={15} />
                                        Retry Analysis
                                    </button>
                                )}
                            </section>
                        )}

                        {/* ── Biomechanical Features Section ────────────────── */}
                        {analysisFeatures?.features && (
                            <section className="panel" style={{ marginTop: 20 }}>
                                <div className="panel-header">
                                    <div>
                                        <h2>Biomechanical Features</h2>
                                        <p>
                                            Extracted kinematic metrics & joint angles &nbsp;·&nbsp;
                                            <span style={{ fontWeight: 600, color: "#3b82f6" }}>
                                                Schema: {analysisFeatures.feature_version}
                                            </span>
                                        </p>
                                    </div>
                                    <Sliders size={22} />
                                </div>

                                {/* Joint Angles Grid */}
                                <div style={{ marginTop: 16 }}>
                                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
                                        Joint Angles (Flexion / Extension)
                                    </h3>
                                    <div className="athlete-details-grid">
                                        <FeatureItem
                                            label="Knee Angle (L)"
                                            value={fmtDeg(analysisFeatures.features.knee_angle_left_mean)}
                                            sub={`ROM: ${fmtDeg(analysisFeatures.features.knee_angle_left_rom)}`}
                                        />
                                        <FeatureItem
                                            label="Knee Angle (R)"
                                            value={fmtDeg(analysisFeatures.features.knee_angle_right_mean)}
                                            sub={`ROM: ${fmtDeg(analysisFeatures.features.knee_angle_right_rom)}`}
                                        />
                                        <FeatureItem
                                            label="Hip Angle (L)"
                                            value={fmtDeg(analysisFeatures.features.hip_angle_left_mean)}
                                            sub={`ROM: ${fmtDeg(analysisFeatures.features.hip_angle_left_rom)}`}
                                        />
                                        <FeatureItem
                                            label="Hip Angle (R)"
                                            value={fmtDeg(analysisFeatures.features.hip_angle_right_mean)}
                                            sub={`ROM: ${fmtDeg(analysisFeatures.features.hip_angle_right_rom)}`}
                                        />
                                        <FeatureItem
                                            label="Ankle Angle (L)"
                                            value={fmtDeg(analysisFeatures.features.ankle_angle_left_mean)}
                                            sub={`ROM: ${fmtDeg(analysisFeatures.features.ankle_angle_left_rom)}`}
                                        />
                                        <FeatureItem
                                            label="Ankle Angle (R)"
                                            value={fmtDeg(analysisFeatures.features.ankle_angle_right_mean)}
                                            sub={`ROM: ${fmtDeg(analysisFeatures.features.ankle_angle_right_rom)}`}
                                        />
                                        <FeatureItem
                                            label="Trunk Inclination"
                                            value={fmtDeg(analysisFeatures.features.trunk_angle_mean)}
                                            sub={`Max: ${fmtDeg(analysisFeatures.features.trunk_angle_max)}`}
                                        />
                                    </div>
                                </div>

                                {/* Symmetry & Kinematics Grid */}
                                <div style={{ marginTop: 20 }}>
                                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 10 }}>
                                        L/R Symmetry & Kinematics
                                    </h3>
                                    <div className="athlete-details-grid">
                                        <FeatureItem
                                            label="Knee Symmetry"
                                            value={fmtPct(analysisFeatures.features.knee_symmetry_score)}
                                            sub="Left vs Right ROM"
                                        />
                                        <FeatureItem
                                            label="Hip Symmetry"
                                            value={fmtPct(analysisFeatures.features.hip_symmetry_score)}
                                            sub="Left vs Right ROM"
                                        />
                                        <FeatureItem
                                            label="Ankle Symmetry"
                                            value={fmtPct(analysisFeatures.features.ankle_symmetry_score)}
                                            sub="Left vs Right ROM"
                                        />
                                        <FeatureItem
                                            label="3D Displacement"
                                            value={fmtVal(analysisFeatures.features.total_joint_displacement, "norm. units")}
                                            sub="Mid-hip travel"
                                        />
                                        <FeatureItem
                                            label="Max Velocity"
                                            value={fmtVal(analysisFeatures.features.max_joint_velocity, "units/s")}
                                            sub="Peak mid-hip speed"
                                        />
                                        <FeatureItem
                                            label="Mean Velocity"
                                            value={fmtVal(analysisFeatures.features.mean_joint_velocity, "units/s")}
                                            sub="Avg mid-hip speed"
                                        />
                                    </div>
                                </div>

                                {/* Information Banner */}
                                <div
                                    className="video-success-panel"
                                    style={{ marginTop: 20, padding: "14px 16px" }}
                                >
                                    <div className="video-success-icon">
                                        <BarChart3 size={18} />
                                    </div>
                                    <div className="video-success-body">
                                        <h3>Biomechanical Feature Vector Saved</h3>
                                        <p style={{ fontSize: 13, color: "#7b8494", margin: "4px 0 0" }}>
                                            Features persist in database as schema <strong>{analysisFeatures.feature_version}</strong>.
                                            Injury-risk prediction model inference will take place in the next phase.
                                        </p>
                                    </div>
                                </div>
                            </section>
                        )}

                        {/* ── LESS Risk Assessment Section ────────────────── */}
                        {analysisLess && (
                            <section className="panel" style={{ marginTop: 20 }}>
                                <div className="panel-header">
                                    <div>
                                        <h2>Rule-Based Movement Quality Assessment (LESS)</h2>
                                        <p>
                                            Padua et al., 2009 Rule-Based Jump-Landing Biomechanical Screening Protocol &nbsp;·&nbsp;
                                            <span style={{ fontWeight: 600, color: "#10b981" }}>
                                                Version: {analysisLess.source_version}
                                            </span>
                                        </p>
                                    </div>
                                    <ShieldAlert size={22} />
                                </div>

                                {/* Overview Metrics */}
                                <div className="athlete-details-grid" style={{ marginTop: 16 }}>
                                    <div className="detail-item" style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 8 }}>
                                        <span className="detail-label" style={{ fontSize: 11, textTransform: "uppercase" }}>LESS Score</span>
                                        <strong className="detail-value" style={{ fontSize: 22, color: "#1e293b" }}>
                                            {analysisLess.score} <small style={{ fontSize: 13, color: "#64748b" }}>/ {analysisLess.max_computable_score} max</small>
                                        </strong>
                                        <small style={{ color: "#64748b", fontSize: 11 }}>Lower score = better technique</small>
                                    </div>

                                    <div className="detail-item" style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 8 }}>
                                        <span className="detail-label" style={{ fontSize: 11, textTransform: "uppercase" }}>Classification</span>
                                        <div style={{ marginTop: 4 }}>
                                            <span style={{
                                                display: "inline-block",
                                                padding: "4px 10px",
                                                borderRadius: 6,
                                                fontSize: 12,
                                                fontWeight: 700,
                                                background: analysisLess.classification.includes("ELEVATED") ? "#fef2f2" : "#f0fdf4",
                                                color: analysisLess.classification.includes("ELEVATED") ? "#dc2626" : "#16a34a",
                                                border: `1px solid ${analysisLess.classification.includes("ELEVATED") ? "#fecaca" : "#bbf7d0"}`,
                                            }}>
                                                {analysisLess.classification.includes("ELEVATED") ? "ELEVATED RISK SCORE" : "LOWER RISK SCORE"}
                                            </span>
                                        </div>
                                        <small style={{ color: "#64748b", fontSize: 11, marginTop: 4, display: "block" }}>Approximation heuristic</small>
                                    </div>

                                    <div className="detail-item" style={{ background: "#f8fafc", padding: "12px 16px", borderRadius: 8 }}>
                                        <span className="detail-label" style={{ fontSize: 11, textTransform: "uppercase" }}>Item Coverage</span>
                                        <strong className="detail-value" style={{ fontSize: 16, color: "#1e293b", marginTop: 2 }}>
                                            {analysisLess.computable_items} / 17 Computable
                                        </strong>
                                        <small style={{ color: "#64748b", fontSize: 11 }}>
                                            {analysisLess.error_items} errors, {analysisLess.not_computable_items} skipped
                                        </small>
                                    </div>
                                </div>

                                {/* Disclaimer */}
                                <div className="error-box" style={{ marginTop: 16, background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" }}>
                                    <AlertTriangle size={15} style={{ marginRight: 8, verticalAlign: "middle" }} />
                                    {analysisLess.disclaimer}
                                </div>

                                {/* Item Breakdown Table */}
                                <div style={{ marginTop: 20, overflowX: "auto" }}>
                                    <h3 style={{ fontSize: 14, fontWeight: 600, color: "#374151", marginBottom: 12 }}>
                                        17-Item LESS Assessment Breakdown
                                    </h3>
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                                        <thead>
                                            <tr style={{ background: "#f1f5f9", textAlign: "left", color: "#475569" }}>
                                                <th style={{ padding: "8px 12px", borderRadius: "6px 0 0 6px" }}>#</th>
                                                <th style={{ padding: "8px 12px" }}>Item Name</th>
                                                <th style={{ padding: "8px 12px" }}>Status</th>
                                                <th style={{ padding: "8px 12px" }}>Score</th>
                                                <th style={{ padding: "8px 12px" }}>Measured Value / Note</th>
                                                <th style={{ padding: "8px 12px", borderRadius: "0 6px 6px 0" }}>Reference</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analysisLess.items?.map((item) => (
                                                <tr key={item.item_number} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                                    <td style={{ padding: "10px 12px", fontWeight: 600, color: "#64748b" }}>
                                                        {item.item_number}
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontWeight: 500, color: "#1e293b" }}>
                                                        {item.item_name}
                                                    </td>
                                                    <td style={{ padding: "10px 12px" }}>
                                                        <span style={{
                                                            padding: "2px 8px",
                                                            borderRadius: 12,
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            background: item.status === "PASS" ? "#dcfce7" : item.status === "ERROR" ? "#fee2e2" : "#f1f5f9",
                                                            color: item.status === "PASS" ? "#15803d" : item.status === "ERROR" ? "#b91c1c" : "#64748b",
                                                        }}>
                                                            {item.status}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                                                        {item.score !== null ? item.score : "—"}
                                                    </td>
                                                    <td style={{ padding: "10px 12px", color: "#475569" }}>
                                                        {item.reason ? (
                                                            <span style={{ color: "#94a3b8", fontStyle: "italic", fontSize: 12 }}>{item.reason}</span>
                                                        ) : item.measured_value !== null ? (
                                                            `${item.measured_value.toFixed(1)} ${item.unit || ""}`.trim()
                                                        ) : (
                                                            "—"
                                                        )}
                                                    </td>
                                                    <td style={{ padding: "10px 12px", color: "#94a3b8", fontSize: 11 }}>
                                                        {item.reference}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

/* ── Helper sub-components ───────────────────────────────────── */

function DetailItem({ label, value }) {
    return (
        <div className="detail-item">
            <span className="detail-label">{label}</span>
            <strong className="detail-value">{value ?? "—"}</strong>
        </div>
    );
}

function MetaItem({ label, value }) {
    return (
        <div className="video-meta-item">
            <span className="video-meta-label">{label}</span>
            <span className="video-meta-value">{value ?? "—"}</span>
        </div>
    );
}

function FeatureItem({ label, value, sub }) {
    return (
        <div className="detail-item" style={{ background: "#f8fafc", padding: "10px 14px", borderRadius: 8 }}>
            <span className="detail-label" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                {label}
            </span>
            <strong className="detail-value" style={{ fontSize: 16, color: "#1e293b", marginTop: 2 }}>
                {value}
            </strong>
            {sub && (
                <small style={{ display: "block", color: "#64748b", fontSize: 11, marginTop: 2 }}>
                    {sub}
                </small>
            )}
        </div>
    );
}

function fmtDeg(val) {
    if (val == null) return "—";
    return `${val.toFixed(1)}°`;
}

function fmtPct(val) {
    if (val == null) return "—";
    return `${val.toFixed(1)}%`;
}

function fmtVal(val, unit) {
    if (val == null) return "—";
    return `${val} ${unit}`;
}

function AnalysisStatusBadge({ status }) {
    const config = {
        [STATUS_PENDING]:    { label: "Pending",    color: "#f59e0b", icon: Clock },
        [STATUS_PROCESSING]: { label: "Processing", color: "#3b82f6", icon: Loader },
        [STATUS_COMPLETED]:  { label: "Completed",  color: "#10b981", icon: CheckCircle },
        [STATUS_FAILED]:     { label: "Failed",     color: "#ef4444", icon: XCircle },
    };

    const { label, color, icon: Icon } =
        config[status] ?? { label: status, color: "#7b8494", icon: Activity };

    const isSpinning =
        status === STATUS_PENDING || status === STATUS_PROCESSING;

    return (
        <span
            style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: `${color}22`,
                color,
                border: `1px solid ${color}55`,
                borderRadius: 20,
                padding: "4px 12px",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.02em",
            }}
        >
            <Icon
                size={13}
                style={
                    isSpinning
                        ? { animation: "spin 1s linear infinite" }
                        : {}
                }
            />
            {label}
        </span>
    );
}

export default VideoAnalysis;