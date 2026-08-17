import { useEffect, useState } from "react";

import Sidebar from "../components/Sidebar";
import RiskBadge from "../components/RiskBadge";
import Loading from "../components/Loading";

import { getAssessments } from "../api/assessments";

function Assessments() {
    const [assessments, setAssessments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        async function load() {
            try {
                const data = await getAssessments();

                setAssessments(
                    Array.isArray(data)
                        ? data
                        : data.items || []
                );
            } catch (err) {
                setError(
                    err.response?.data?.detail ||
                    "Unable to load assessments."
                );
            } finally {
                setLoading(false);
            }
        }

        load();
    }, []);

    return (
        <div className="app-layout">
            <Sidebar />

            <main className="dashboard">
                <div className="page-header">
                    <div>
                        <span className="eyebrow">
                            ANALYTICS
                        </span>

                        <h1>Assessments</h1>

                        <p>
                            Review previous injury-risk assessments.
                        </p>
                    </div>
                </div>

                <section className="panel">
                    {loading && <Loading />}

                    {error && (
                        <div className="error-box">
                            {error}
                        </div>
                    )}

                    {!loading &&
                        !error &&
                        assessments.length === 0 && (
                            <div className="empty-state">
                                <h3>
                                    No assessments yet
                                </h3>

                                <p>
                                    Upload a movement video to begin
                                    your first assessment.
                                </p>
                            </div>
                        )}

                    {!loading &&
                        !error &&
                        assessments.length > 0 && (
                            <div className="assessment-table">
                                <div className="table-header">
                                    <span>Date</span>
                                    <span>Athlete</span>
                                    <span>Score</span>
                                    <span>Risk</span>
                                </div>

                                {assessments.map(
                                    (assessment) => (
                                        <div
                                            className="table-row"
                                            key={assessment.id}
                                        >
                                            <span>
                                                {assessment.created_at
                                                    ? new Date(
                                                        assessment.created_at
                                                    ).toLocaleDateString()
                                                    : "—"}
                                            </span>

                                            <strong>
                                                {assessment.athlete_name ||
                                                    "Athlete"}
                                            </strong>

                                            <span>
                                                {assessment.risk_score ??
                                                    "—"}
                                            </span>

                                            <RiskBadge
                                                level={
                                                    assessment.risk_level ||
                                                    "Low"
                                                }
                                            />
                                        </div>
                                    )
                                )}
                            </div>
                        )}
                </section>
            </main>
        </div>
    );
}

export default Assessments;