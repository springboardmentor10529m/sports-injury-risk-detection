import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerAthlete } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { AuthShell } from "./Login";

const SPORTS = ["Running", "Soccer", "Basketball", "American Football", "Volleyball", "Tennis", "Rugby", "Other"];

const initialState = {
  full_name: "", email: "", password: "",
  sport: "Running", position: "", age: "", height_cm: "", weight_kg: "",
  previous_injury_count: 0, days_since_last_injury: "", current_pain_flag: false,
  weekly_training_hours: "", acute_chronic_ratio: "",
};

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(initialState);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function set(key, value) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        ...form,
        age: Number(form.age),
        height_cm: Number(form.height_cm),
        weight_kg: Number(form.weight_kg),
        previous_injury_count: Number(form.previous_injury_count) || 0,
        days_since_last_injury: form.days_since_last_injury === "" ? null : Number(form.days_since_last_injury),
        weekly_training_hours: Number(form.weekly_training_hours) || 0,
        acute_chronic_ratio: form.acute_chronic_ratio === "" ? null : Number(form.acute_chronic_ratio),
      };
      await registerAthlete(payload);
      await login(form.email, form.password);
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Create your athlete account</h1>
      <p style={{ color: "var(--text-dim)", fontSize: 14, marginBottom: 24 }}>
        These details feed directly into your injury risk model - historical injury factors and training
        load make up 35% of your risk score.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Full name</label>
          <input required value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="field">
          <label>Password (min 8 characters)</label>
          <input type="password" required minLength={8} value={form.password} onChange={(e) => set("password", e.target.value)} />
        </div>

        <div className="field-row">
          <div className="field">
            <label>Sport</label>
            <select value={form.sport} onChange={(e) => set("sport", e.target.value)}>
              {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Position (optional)</label>
            <input value={form.position} onChange={(e) => set("position", e.target.value)} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Age</label>
            <input type="number" required min={5} max={100} value={form.age} onChange={(e) => set("age", e.target.value)} />
          </div>
          <div className="field">
            <label>Height (cm)</label>
            <input type="number" required value={form.height_cm} onChange={(e) => set("height_cm", e.target.value)} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Weight (kg)</label>
            <input type="number" required value={form.weight_kg} onChange={(e) => set("weight_kg", e.target.value)} />
          </div>
          <div className="field">
            <label>Weekly training hours</label>
            <input type="number" required value={form.weekly_training_hours} onChange={(e) => set("weekly_training_hours", e.target.value)} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Previous injuries (count)</label>
            <input type="number" min={0} value={form.previous_injury_count} onChange={(e) => set("previous_injury_count", e.target.value)} />
          </div>
          <div className="field">
            <label>Days since last injury</label>
            <input type="number" placeholder="leave blank if none" value={form.days_since_last_injury} onChange={(e) => set("days_since_last_injury", e.target.value)} />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Acute:chronic workload ratio (optional)</label>
            <input type="number" step="0.01" placeholder="e.g. 1.1" value={form.acute_chronic_ratio} onChange={(e) => set("acute_chronic_ratio", e.target.value)} />
          </div>
          <div className="field">
            <label>Currently in pain?</label>
            <select value={form.current_pain_flag ? "yes" : "no"} onChange={(e) => set("current_pain_flag", e.target.value === "yes")}>
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>

        <button className="btn btn-primary btn-block" disabled={loading} type="submit" style={{ marginTop: 8 }}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p style={{ marginTop: 20, fontSize: 13, color: "var(--text-dim)" }}>
        Already have an account? <Link to="/login" style={{ color: "var(--accent)" }}>Log in</Link>
      </p>
    </AuthShell>
  );
}
