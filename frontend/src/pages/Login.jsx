import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SkeletonMotif from "../components/SkeletonMotif";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/home");
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <h1 style={{ fontSize: 26, marginBottom: 4 }}>Welcome back</h1>
      <p style={{ color: "var(--text-dim)", fontSize: 14, marginBottom: 28 }}>
        Sign in to view your movement risk profile.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block" disabled={loading} type="submit">
          {loading ? "Signing in..." : "Log in"}
        </button>
      </form>

      <p style={{ marginTop: 20, fontSize: 13, color: "var(--text-dim)" }}>
        No account yet? <Link to="/select-role" style={{ color: "var(--accent)" }}>Sign up</Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ children }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <SkeletonMotif style={{ width: 44, height: 50 }} opacity={0.85} />
        </div>
        <div className="card" style={{ padding: 32 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
