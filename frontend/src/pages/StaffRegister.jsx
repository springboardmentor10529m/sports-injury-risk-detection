import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerCoach, registerPhysio, registerScientist } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { AuthShell } from "./Login";

const CONFIGS = {
  coach: {
    title: "Create your coach account",
    subtitle: "You'll be able to add athletes to your team and monitor their risk.",
    register: registerCoach,
    fields: [
      { key: "sport", label: "Sport", required: true },
      { key: "specialization", label: "Specialization" },
      { key: "years_experience", label: "Years of experience", type: "number" },
      { key: "organization", label: "Team / Organization" },
    ],
  },
  physiotherapist: {
    title: "Create your physiotherapist account",
    subtitle: "You'll be able to track patients' rehab and log clinical notes.",
    register: registerPhysio,
    fields: [
      { key: "qualification", label: "Qualification" },
      { key: "specialization", label: "Specialization" },
      { key: "years_experience", label: "Years of experience", type: "number" },
      { key: "clinic", label: "Clinic / Organization" },
    ],
  },
  "sports-scientist": {
    title: "Create your sports scientist account",
    subtitle: "You'll get aggregate biomechanical analytics across your athlete dataset.",
    register: registerScientist,
    fields: [
      { key: "institution", label: "Institution" },
      { key: "research_area", label: "Research area" },
      { key: "specialization", label: "Specialization" },
      { key: "years_experience", label: "Years of experience", type: "number" },
    ],
  },
};

export default function StaffRegister({ role }) {
  const config = CONFIGS[role];
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
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
      const payload = { ...form };
      config.fields.forEach((f) => {
        if (f.type === "number") payload[f.key] = Number(payload[f.key]) || 0;
      });
      await config.register(payload);
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
      <h1 style={{ fontSize: 24, marginBottom: 4 }}>{config.title}</h1>
      <p style={{ color: "var(--text-dim)", fontSize: 14, marginBottom: 24 }}>{config.subtitle}</p>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Invitation code (if provided)</label>
          <input type="password" autoComplete="off" value={form.invitation_code || ""} onChange={(e) => set("invitation_code", e.target.value)} />
        </div>
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

        {config.fields.map((f) => (
          <div className="field" key={f.key}>
            <label>{f.label}</label>
            <input
              type={f.type || "text"}
              required={f.required}
              value={form[f.key] ?? ""}
              onChange={(e) => set(f.key, e.target.value)}
            />
          </div>
        ))}

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
