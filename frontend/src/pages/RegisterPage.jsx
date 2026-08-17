import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services/authService";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("athlete");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await registerUser(name, email, password, role);
      alert("Registration successful! Please login with your credentials.");
      navigate("/login");
    } catch (err) {
      setError(err.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create an Account</h2>
        <p style={styles.subtitle}>Join the Sports Injury Risk Platform</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleRegister}>
          <div style={styles.field}>
            <label style={styles.label}>Full Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aadrika Singh"
              required
              style={styles.input}
            />
          </div>

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
            {loading ? "Registering..." : "Register"}
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
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#38bdf8" }}>
            Login here
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
  field: { marginBottom: "1rem" },
  label: {
    display: "block",
    fontSize: "0.85rem",
    marginBottom: "0.3rem",
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
    backgroundColor: "#10b981",
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
