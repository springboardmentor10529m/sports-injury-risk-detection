import { useState, useEffect } from "react";

import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import {
    getMyAthleteProfile,
    upsertMyAthleteProfile,
} from "../api/athletes";

// Fields that must all be non-null for the profile to count as complete.
const REQUIRED_FIELDS = ["sport", "position", "age", "height", "weight"];

function Profile() {
    const { user } = useAuth();

    // ── Athlete profile state ────────────────────────────────
    const [profile, setProfile]     = useState(null);   // null = not loaded yet
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [profileError, setProfileError]     = useState("");

    // ── Form field state ─────────────────────────────────────
    const [sport, setSport]       = useState("");
    const [position, setPosition] = useState("");
    const [age, setAge]           = useState("");
    const [height, setHeight]     = useState("");
    const [weight, setWeight]     = useState("");

    // ── Save state ───────────────────────────────────────────
    const [saving, setSaving]   = useState(false);
    const [saveMsg, setSaveMsg] = useState({ type: "", text: "" });

    // ── Load existing profile on mount ───────────────────────
    useEffect(() => {
        async function fetchProfile() {
            setLoadingProfile(true);
            setProfileError("");

            try {
                const data = await getMyAthleteProfile();
                setProfile(data);

                // Pre-populate form with existing values.
                setSport(data.sport    ?? "");
                setPosition(data.position ?? "");
                setAge(data.age        != null ? String(data.age)    : "");
                setHeight(data.height  != null ? String(data.height) : "");
                setWeight(data.weight  != null ? String(data.weight) : "");
            } catch (err) {
                if (err.response?.status === 404) {
                    // No profile yet — form stays empty, that's fine.
                    setProfile(null);
                } else {
                    setProfileError(
                        err.response?.data?.detail ||
                        "Could not load athlete profile."
                    );
                }
            } finally {
                setLoadingProfile(false);
            }
        }

        fetchProfile();
    }, []);

    // ── Save handler ─────────────────────────────────────────
    async function handleSave(event) {
        event.preventDefault();
        setSaving(true);
        setSaveMsg({ type: "", text: "" });

        const payload = {
            sport:    sport.trim()    || null,
            position: position.trim() || null,
            age:      age    !== "" ? Number(age)    : null,
            height:   height !== "" ? Number(height) : null,
            weight:   weight !== "" ? Number(weight) : null,
        };

        try {
            const updated = await upsertMyAthleteProfile(payload);
            setProfile(updated);
            setSaveMsg({ type: "success", text: "Profile saved successfully." });
        } catch (err) {
            const detail =
                err.response?.data?.detail ||
                "Unable to save profile. Please try again.";
            setSaveMsg({ type: "error", text: detail });
        } finally {
            setSaving(false);
        }
    }

    // ── Derived: is the profile complete? ────────────────────
    const isComplete =
        profile !== null &&
        REQUIRED_FIELDS.every(
            (f) => profile[f] !== null && profile[f] !== undefined && profile[f] !== ""
        );

    return (
        <div className="app-layout">
            <Sidebar />

            <main className="dashboard">
                <div className="page-header">
                    <div>
                        <span className="eyebrow">ACCOUNT</span>
                        <h1>Your Profile</h1>
                        <p>Manage your personal and athlete information.</p>
                    </div>
                </div>

                {/* ── Account info (read-only) ─────────────────────── */}
                <section className="panel profile-panel">
                    <h2>Account Information</h2>

                    <div className="profile-info">
                        <div>
                            <span>Name</span>
                            <strong>{user?.name || "—"}</strong>
                        </div>

                        <div>
                            <span>Email</span>
                            <strong>{user?.email || "—"}</strong>
                        </div>

                        <div>
                            <span>Role</span>
                            <strong>{user?.role || "—"}</strong>
                        </div>
                    </div>

                    {/* Show IDs only once the profile has been created */}
                    {profile && (
                        <>
                            <hr />

                            <div className="profile-info">
                                <div>
                                    <span>Athlete ID</span>
                                    <strong className="profile-id">
                                        {profile.athlete_id}
                                    </strong>
                                </div>

                                <div>
                                    <span>User ID</span>
                                    <strong className="profile-id">
                                        {profile.user_id}
                                    </strong>
                                </div>

                                <div>
                                    <span>Profile Status</span>
                                    <strong>
                                        {isComplete ? (
                                            <span className="status-complete">
                                                ✓ Complete
                                            </span>
                                        ) : (
                                            <span className="status-incomplete">
                                                ⚠ Incomplete
                                            </span>
                                        )}
                                    </strong>
                                </div>
                            </div>
                        </>
                    )}

                    <hr />

                    {/* ── Athlete details form ─────────────────────────── */}
                    <h2>Athlete Details</h2>

                    <p className="section-description">
                        These details are required before you can submit a
                        video for analysis.
                    </p>

                    {loadingProfile ? (
                        <div className="loading-container">
                            <div className="spinner" />
                            <span>Loading profile…</span>
                        </div>
                    ) : profileError ? (
                        <div className="error-box">{profileError}</div>
                    ) : (
                        <form
                            className="athlete-form"
                            onSubmit={handleSave}
                            id="athlete-profile-form"
                        >
                            <div className="athlete-form-grid">
                                {/* Sport */}
                                <div className="form-field">
                                    <label htmlFor="field-sport">
                                        Sport
                                    </label>
                                    <input
                                        id="field-sport"
                                        type="text"
                                        placeholder="e.g. Football"
                                        maxLength={100}
                                        value={sport}
                                        onChange={(e) => setSport(e.target.value)}
                                    />
                                </div>

                                {/* Position */}
                                <div className="form-field">
                                    <label htmlFor="field-position">
                                        Position
                                    </label>
                                    <input
                                        id="field-position"
                                        type="text"
                                        placeholder="e.g. Midfielder"
                                        maxLength={100}
                                        value={position}
                                        onChange={(e) => setPosition(e.target.value)}
                                    />
                                </div>

                                {/* Age */}
                                <div className="form-field">
                                    <label htmlFor="field-age">
                                        Age
                                    </label>
                                    <input
                                        id="field-age"
                                        type="number"
                                        placeholder="e.g. 24"
                                        min={0}
                                        max={120}
                                        value={age}
                                        onChange={(e) => setAge(e.target.value)}
                                    />
                                </div>

                                {/* Height */}
                                <div className="form-field">
                                    <label htmlFor="field-height">
                                        Height <small>(cm)</small>
                                    </label>
                                    <input
                                        id="field-height"
                                        type="number"
                                        placeholder="e.g. 178"
                                        min={1}
                                        max={300}
                                        step="0.1"
                                        value={height}
                                        onChange={(e) => setHeight(e.target.value)}
                                    />
                                </div>

                                {/* Weight */}
                                <div className="form-field">
                                    <label htmlFor="field-weight">
                                        Weight <small>(kg)</small>
                                    </label>
                                    <input
                                        id="field-weight"
                                        type="number"
                                        placeholder="e.g. 72"
                                        min={1}
                                        max={500}
                                        step="0.1"
                                        value={weight}
                                        onChange={(e) => setWeight(e.target.value)}
                                    />
                                </div>
                            </div>

                            <button
                                className="primary-button"
                                type="submit"
                                disabled={saving}
                                style={{ marginTop: "20px" }}
                            >
                                {saving ? "Saving…" : "Save Profile"}
                            </button>
                        </form>
                    )}

                    {/* ── Save feedback ─────────────────────────────────── */}
                    {saveMsg.text && (
                        <div
                            className={
                                saveMsg.type === "success"
                                    ? "success-box"
                                    : "error-box"
                            }
                            style={{ marginTop: "18px" }}
                        >
                            {saveMsg.text}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default Profile;