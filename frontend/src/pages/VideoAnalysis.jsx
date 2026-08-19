import { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import RiskBadge from "../components/RiskBadge";

import { uploadVideoFile } from "../api/videos";
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

function VideoAnalysis() {
    // ── Profile state ─────────────────────────────────────────
    const [profile, setProfile]               = useState(null);
    const [profileLoading, setProfileLoading] = useState(true);
    const [profileError, setProfileError]     = useState("");

    // ── Upload state ──────────────────────────────────────────
    const [file, setFile]           = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadPct, setUploadPct] = useState(0);   // 0-100
    const [uploadedVideo, setUploadedVideo] = useState(null); // server metadata
    const [error, setError]         = useState("");

    // ── Legacy analysis-result state (kept for future AI integration) ──
    const [result, setResult] = useState(null);

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

    function handleFileChange(event) {
        const selectedFile = event.target.files?.[0];
        if (!selectedFile) return;
        setFile(selectedFile);
        setError("");
        setUploadedVideo(null);  // clear previous result
        setUploadPct(0);
    }

    const handleUpload = useCallback(async () => {
        if (!file) {
            setError("Please select a video first.");
            return;
        }

        setUploading(true);
        setError("");
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
            setResult(data);          // forward to analysis panel
            setFile(null);            // clear file picker after success
        } catch (err) {
            const detail =
                err.response?.data?.detail ||
                "Video upload failed. Please try again.";
            setError(detail);
        } finally {
            setUploading(false);
            setUploadPct(0);
        }
    }, [file]);

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
                                    id="start-analysis-btn"
                                >
                                    <Upload size={15} />
                                    Upload &amp; Analyse
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

                            {error && (
                                <div className="error-box">{error}</div>
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
                                </div>
                            </section>
                        )}

                        {/* ── Analysis result (future AI integration) ──── */}
                        {result && result.risk_score !== undefined && (
                            <section className="analysis-result-panel">
                                <div className="panel-header">
                                    <div>
                                        <h2>Analysis Results</h2>
                                        <p>AI-generated movement assessment</p>
                                    </div>

                                    <Activity />
                                </div>

                                <div className="result-grid">
                                    <ResultCard
                                        title="Risk Score"
                                        value={`${result.risk_score ?? 0}%`}
                                        icon={ShieldAlert}
                                    />

                                    <ResultCard
                                        title="Risk Level"
                                        value={
                                            <RiskBadge
                                                level={
                                                    result.risk_level || "Low"
                                                }
                                            />
                                        }
                                        icon={Activity}
                                    />
                                </div>

                                <div className="findings">
                                    <h3>Movement Findings</h3>
                                    <p>
                                        {result.findings ||
                                            "No detailed findings available yet."}
                                    </p>
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

function ResultCard({ title, value, icon: Icon }) {
    return (
        <div className="result-card">
            <div className="result-card-icon">
                <Icon size={21} />
            </div>

            <span>{title}</span>

            <strong>{value}</strong>
        </div>
    );
}

export default VideoAnalysis;