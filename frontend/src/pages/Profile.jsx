import { useEffect, useState } from "react";
import { getProfile, updateProfile } from "../api/client";

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getProfile().then((res) => setProfile(res.data));
  }, []);

  function set(key, value) {
    setProfile((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = {
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
    } finally {
      setSaving(false);
    }
  }

  if (!profile) return <p style={{ color: "var(--text-dim)" }}>Loading...</p>;

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>My Profile</h1>
      <p style={{ color: "var(--text-dim)", marginBottom: 24 }}>
        These fields feed the historical-injury (20%) and training-load (15%) terms of your risk score.
      </p>

      <div className="card">
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

        <button className="btn btn-primary" disabled={saving} onClick={handleSave}>
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
