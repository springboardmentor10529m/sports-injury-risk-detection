import { useState } from "react";
import { Link, useNavigate, Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

function Register() {
  const navigate = useNavigate();

  const { register, isAuthenticated } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: "",
    name: "",
    role: "Athlete"
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  function updateField(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await register(form);

      navigate("/login");
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Registration failed."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card">
        <h1>Create account</h1>

        <p className="auth-subtitle">
          Start monitoring movement and injury risk.
        </p>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <label>Full Name</label>

          <input
            name="name"
            value={form.name}
            onChange={updateField}
            placeholder="Your name"
            required
          />

          <label>Email</label>

          <input
            type="email"
            name="email"
            value={form.email}
            onChange={updateField}
            placeholder="you@example.com"
            required
          />

          <label>Password</label>

          <input
            type="password"
            name="password"
            value={form.password}
            onChange={updateField}
            placeholder="Create a password"
            required
            minLength={8}
          />

          <label>Role</label>

          <select
            name="role"
            value={form.role}
            onChange={updateField}
          >
            <option value="Athlete">Athlete</option>
            <option value="Coach">Coach</option>
            <option value="Physiotherapist">Physiotherapist</option>
            <option value="Sports Scientist">Sports Scientist</option>
          </select>

          <button
            className="primary-button full"
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account?{" "}
          <Link to="/login">Sign in</Link>
        </p>
      </div>
    </main>
  );
}

export default Register;