import React, { useState, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser } from "../services/authService";
import { AuthContext } from "../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("athlete");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginUser(email, password, role);
      login(data);

      // Redirect based on selected role
      if (role === "athlete") {
        navigate("/athlete-profile");
      } else if (role === "coach") {
        navigate("/coach-dashboard");
      } else {
        navigate("/physio-dashboard");
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Login failed. Please check your credentials.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Sports Injury Risk Detection</h2>
        <p style={styles.subtitle}>Sign in to your account</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {/* Role Selection */}
          <div style={styles.field}>
            <label style={styles.label}>Select Role:</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              style={styles.input}
            >
              <option value="athlete">Athlete</option>
              <option value="coach">Coach</option>
              <option value="physio">Physiotherapist</option>
            </select>
          </div>

          {/* Email Input */}
          <div style={styles.field}>
            <label style={styles.label}>Email Address:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="athlete@example.com"
              required
              style={styles.input}
            />
          </div>

          {/* Password Input */}
          <div style={styles.field}>
            <label style={styles.label}>Password:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={styles.input}
            />
          </div>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Logging in..." : `Login as ${role.toUpperCase()}`}
          </button>
        </form>
        <p
          style={{
            textAlign: "center",
            marginTop: "1rem",
            fontSize: "0.85rem",
            color: "#cbd5e1",
          }}
        >
          Don't have an account?{" "}
          <Link to="/register" style={{ color: "#38bdf8" }}>
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    padding: "2rem",
    backgroundColor: "#1e293b",
    borderRadius: "12px",
    boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
  },
  title: {
    textAlign: "center",
    fontSize: "1.5rem",
    fontWeight: "bold",
    marginBottom: "0.5rem",
    color: "#38bdf8",
  },
  subtitle: {
    textAlign: "center",
    fontSize: "0.9rem",
    color: "#94a3b8",
    marginBottom: "1.5rem",
  },
  field: { marginBottom: "1.2rem" },
  label: {
    display: "block",
    fontSize: "0.85rem",
    marginBottom: "0.4rem",
    color: "#cbd5e1",
  },
  input: {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "6px",
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "#fff",
    fontSize: "0.95rem",
  },
  button: {
    width: "100%",
    padding: "0.75rem",
    borderRadius: "6px",
    border: "none",
    backgroundColor: "#0284c7",
    color: "#fff",
    fontWeight: "bold",
    fontSize: "1rem",
    cursor: "pointer",
    marginTop: "0.5rem",
  },
  error: {
    backgroundColor: "#7f1d1d",
    color: "#fca5a5",
    padding: "0.75rem",
    borderRadius: "6px",
    marginBottom: "1rem",
    fontSize: "0.85rem",
  },
};
