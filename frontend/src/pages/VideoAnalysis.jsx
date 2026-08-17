import { useState } from "react";

import {
    Upload,
    Video,
    Activity,
    ShieldAlert
} from "lucide-react";

import Sidebar from "../components/Sidebar";
import RiskBadge from "../components/RiskBadge";

import { uploadVideo } from "../api/assessments";

function VideoAnalysis() {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    function handleFileChange(event) {
        const selectedFile =
            event.target.files?.[0];

        if (!selectedFile) return;

        setFile(selectedFile);
        setError("");
    }

    async function handleUpload() {
        if (!file) {
            setError("Please select a video first.");
            return;
        }

        setUploading(true);
        setError("");

        try {
            const data = await uploadVideo(file);

            setResult(data);
        } catch (err) {
            setError(
                err.response?.data?.detail ||
                "Video upload failed."
            );
        } finally {
            setUploading(false);
        }
    }

    return (
        <div className="app-layout">
            <Sidebar />

            <main className="dashboard">
                <div className="page-header">
                    <div>
                        <span className="eyebrow">
                            AI ANALYSIS
                        </span>

                        <h1>Video Movement Analysis</h1>

                        <p>
                            Upload an athlete movement video for
                            biomechanical assessment.
                        </p>
                    </div>
                </div>

                <section className="upload-panel">
                    <div className="upload-icon">
                        <Video size={30} />
                    </div>

                    <h2>
                        Upload movement video
                    </h2>

                    <p>
                        Supported formats: MP4, MOV, AVI
                    </p>

                    <label className="upload-box">
                        <Upload size={25} />

                        <span>
                            {file
                                ? file.name
                                : "Choose a video file"}
                        </span>

                        <input
                            type="file"
                            accept="video/*"
                            onChange={handleFileChange}
                            hidden
                        />
                    </label>

                    {file && (
                        <button
                            className="primary-button"
                            onClick={handleUpload}
                            disabled={uploading}
                        >
                            {uploading
                                ? "Uploading..."
                                : "Start Analysis"}
                        </button>
                    )}

                    {error && (
                        <div className="error-box">
                            {error}
                        </div>
                    )}
                </section>

                {result && (
                    <section className="analysis-result-panel">
                        <div className="panel-header">
                            <div>
                                <h2>
                                    Analysis Results
                                </h2>

                                <p>
                                    AI-generated movement assessment
                                </p>
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
                            <h3>
                                Movement Findings
                            </h3>

                            <p>
                                {result.findings ||
                                    "No detailed findings available yet."}
                            </p>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}

function ResultCard({
    title,
    value,
    icon: Icon
}) {
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