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
      await login(email.trim(), password);
      navigate("/home");
    } catch (err) {
      setError(err.code === "ECONNABORTED"
        ? "The API did not respond. Confirm Docker is running and try again."
        : err.response?.data?.detail || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="login-eyebrow">Movement intelligence / 01</div>
      <h1 className="login-title">Welcome<br /><em>back.</em></h1>
      <p className="login-intro">
        Sign in to continue building a clearer picture of how you move, train, and recover.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="field login-field">
          <label>Email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="field login-field">
          <label>Password</label>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <button className="btn btn-primary btn-block login-submit" disabled={loading} type="submit">
          {loading ? "Signing in..." : "Log in"}
        </button>
      </form>

      <p className="login-signup">
        New to InjuryGuard? <Link to="/select-role">Create an account <span>↗</span></Link>
      </p>
    </AuthShell>
  );
}

export function AuthShell({ children }) {
  return (
    <div className="auth-shell">
      <div className="auth-orbit auth-orbit-one" />
      <div className="auth-orbit auth-orbit-two" />
      <div className="auth-frame">
        <section className="auth-brand-panel">
          <div className="auth-brand-top">
            <SkeletonMotif className="auth-motif" opacity={0.9} />
            <span>INJURYGUARD <b>AI</b></span>
          </div>
          <div className="auth-brand-copy">
            <div className="auth-kicker">The athlete's<br />second set of eyes.</div>
            <p>Real movement data.<br />Sharper decisions.</p>
          </div>
          <div className="auth-brand-foot">EST. 2026 <span>●</span> PERFORMANCE LAB</div>
        </section>
        <section className="auth-form-panel">
          <div className="auth-form-inner">{children}</div>
        </section>
      </div>
    </div>
  );
}
