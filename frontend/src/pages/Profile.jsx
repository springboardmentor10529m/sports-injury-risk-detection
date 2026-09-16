import { useEffect, useState } from "react";
import { UserCog } from "lucide-react";
import { getProfile, updateProfile } from "../api/client";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getProfile().then((res) => setProfile(res.data)).catch(() => setError("Could not load your profile. Please refresh to retry."));
  }, []);

  function set(key, value) {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const payload = {
        injury_context: profile.injury_context || null,
        sport: profile.sport,
        position: profile.position,
        age: Number(profile.age),
        height_cm: Number(profile.height_cm),
        weight_kg: Number(profile.weight_kg),
        previous_injury_count: Number(profile.previous_injury_count),
        days_since_last_injury: profile.days_since_last_injury === "" || profile.days_since_last_injury === null
          ? null : Number(profile.days_since_last_injury),
        current_pain_flag: profile.current_pain_flag,
        weekly_training_hours: Number(profile.weekly_training_hours),
        acute_chronic_ratio: profile.acute_chronic_ratio === "" || profile.acute_chronic_ratio === null
          ? null : Number(profile.acute_chronic_ratio),
      };
      const res = await updateProfile(payload);
      setProfile(res.data);
      setSaved(true);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save your profile. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return <p style={{ color: "var(--text-dim)" }}>{error || "Loading..."}</p>;

  const context = profile.injury_context || {};
  function setContext(key, value) {
    set("injury_context", { ...context, [key]: value });
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Account</div>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>My Profile</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 24 }}>
        Keep your training and injury information up to date. Injury count, recency, pain flag and workload inform the current rule-based score. Additional injury details are saved as context only.
      </p>

      <div className="card animate-in">
        <div className="card-title"><UserCog size={15} color="var(--accent)" /> Athlete details</div>
        <div className="field-row">
          <div className="field">
            <label>Sport</label>
            <input value={profile.sport} onChange={(e) => set("sport", e.target.value)} />
          </div>
          <div className="field">
            <label>Position</label>
            <input value={profile.position || ""} onChange={(e) => set("position", e.target.value)} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Age</label>
            <input type="number" value={profile.age} onChange={(e) => set("age", e.target.value)} />
          </div>
          <div className="field">
            <label>Height (cm)</label>
            <input type="number" value={profile.height_cm} onChange={(e) => set("height_cm", e.target.value)} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Weight (kg)</label>
            <input type="number" value={profile.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} />
          </div>
          <div className="field">
            <label>Weekly training hours</label>
            <input type="number" value={profile.weekly_training_hours} onChange={(e) => set("weekly_training_hours", e.target.value)} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Previous injuries</label>
            <input type="number" value={profile.previous_injury_count} onChange={(e) => set("previous_injury_count", e.target.value)} />
          </div>
          <div className="field">
            <label>Days since last injury</label>
            <input type="number" value={profile.days_since_last_injury ?? ""} onChange={(e) => set("days_since_last_injury", e.target.value)} />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Acute:chronic workload ratio</label>
            <input type="number" step="0.01" value={profile.acute_chronic_ratio ?? ""} onChange={(e) => set("acute_chronic_ratio", e.target.value)} />
          </div>
          <div className="field">
            <label>Currently in pain?</label>
            <select value={profile.current_pain_flag ? "yes" : "no"} onChange={(e) => set("current_pain_flag", e.target.value === "yes")}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>

        <section style={{ borderTop: "1px solid var(--border)", marginTop: 20, paddingTop: 20 }}>
          <h2 style={{ fontSize: 18 }}>Injury and symptom details</h2>
          <p style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 18 }}>
            Optional, self-reported details about your most recent or most relevant injury and current symptoms.
            Leave unknown details blank. These fields do not change your score or generate additional recommendations.
          </p>
          {[["body_area", "Injured body area", "For example: knee, ankle, shoulder", 100],
            ["injury_type", "Injury type (if known)", "Use a diagnosed type, or leave blank if unknown", 150],
            ["timeframe", "When did it happen?", "Approximate month/year or timeframe", 100],
            ["pain_location", "Current pain location (if any)", "For example: outside of right knee", 100]].map(([key, label, placeholder, max]) =>
            <div className="field" key={key}><label htmlFor={key}>{label}</label>
              <input id={key} maxLength={max} value={context[key] || ""} placeholder={placeholder} onChange={e => setContext(key, e.target.value)} />
            </div>)}
          <div className="field-row">
            <div className="field"><label htmlFor="injury-side">Injury side</label>
              <select id="injury-side" value={context.side || "unknown"} onChange={e => setContext("side", e.target.value)}>
                <option value="unknown">Unknown / not provided</option><option value="left">Left</option><option value="right">Right</option><option value="both">Both</option><option value="not_applicable">Not applicable</option>
              </select></div>
            <div className="field"><label htmlFor="recovery">Recovery status</label>
              <select id="recovery" value={context.recovery_status || "unknown"} onChange={e => setContext("recovery_status", e.target.value)}>
                <option value="unknown">Unknown / not provided</option><option value="recovered">Recovered</option><option value="recovering">Recovering</option><option value="ongoing">Ongoing issue</option>
              </select></div>
          </div>
          <div className="field"><label htmlFor="pain-severity">Current pain severity (0 = none, 10 = worst; blank = unknown)</label>
            <select id="pain-severity" value={context.pain_severity ?? ""} onChange={e => setContext("pain_severity", e.target.value === "" ? null : Number(e.target.value))}>
              <option value="">Not provided</option>{Array.from({ length: 11 }, (_, n) => <option key={n} value={n}>{n}</option>)}
            </select></div>
          {[["limitations", "Current movement or training limitations"], ["clinician_restrictions", "Restrictions provided by your clinician (if any)"]].map(([key, label]) =>
            <div className="field" key={key}><label htmlFor={key}>{label}</label>
              <textarea id={key} rows={3} maxLength={1000} value={context[key] || ""} onChange={e => setContext(key, e.target.value)} />
            </div>)}
          <p style={{ fontSize: 12, color: "var(--text-dim)" }}>Saving updates your profile, not previous analysis reports. The application does not diagnose injuries or clear you to return to sport.</p>
        </section>
        {error && <p role="alert" className="error-banner">{error}</p>}
        <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
