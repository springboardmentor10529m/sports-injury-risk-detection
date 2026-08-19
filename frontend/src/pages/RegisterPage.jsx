import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services/authService";
import { Activity, User, Users, Stethoscope, Mail, Lock, UserCheck, ArrowRight, ShieldCheck } from "lucide-react";

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
      navigate("/login");
    } catch (err) {
      if (!err.response) {
        // Network fallback
        navigate("/login");
      } else {
        setError(err.response?.data?.detail || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { id: "athlete", title: "Athlete", icon: User, color: "#10b981" },
    { id: "coach", title: "Coach", icon: Users, color: "#06b6d4" },
    { id: "physio", title: "Physiotherapist", icon: Stethoscope, color: "#a855f7" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
        backgroundColor: "var(--bg-main)",
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: "100%",
          maxWidth: "480px",
          padding: "2.5rem 2rem",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "14px",
              background: "linear-gradient(135deg, #10b981 0%, #06b6d4 100%)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 25px rgba(16, 185, 129, 0.4)",
              marginBottom: "1rem",
            }}
          >
            <Activity color="#ffffff" size={30} />
          </div>
          <h1
            style={{
              fontSize: "1.75rem",
              fontWeight: "800",
              color: "#ffffff",
              letterSpacing: "-0.02em",
              marginBottom: "0.4rem",
            }}
          >
            Create Account
          </h1>
          <p style={{ fontSize: "0.9rem", color: "var(--text-muted)" }}>
            Join the KineticAI Injury Prevention & Performance Network
          </p>
        </div>

        {error && (
          <div
            style={{
              backgroundColor: "rgba(244, 63, 94, 0.15)",
              color: "#fb7185",
              border: "1px solid rgba(244, 63, 94, 0.3)",
              padding: "0.8rem 1rem",
              borderRadius: "10px",
              marginBottom: "1.5rem",
              fontSize: "0.85rem",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <ShieldCheck size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div style={{ marginBottom: "1.2rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: "600",
                color: "var(--text-muted)",
                marginBottom: "0.4rem",
              }}
            >
              Full Name
            </label>
            <div style={{ position: "relative" }}>
              <UserCheck
                size={18}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-dim)",
                }}
              />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Marcus Vance"
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem 0.75rem 2.6rem",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  backgroundColor: "rgba(7, 11, 20, 0.8)",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1.2rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.8rem",
                fontWeight: "600",
                color: "var(--text-muted)",
                marginBottom: "0.6rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Select Your Role:
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
              {roleOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = role === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRole(opt.id)}
                    style={{
                      backgroundColor: isSelected ? "rgba(16, 185, 129, 0.15)" : "rgba(15, 23, 42, 0.7)",
                      border: isSelected ? `2px solid ${opt.color}` : "1px solid rgba(255, 255, 255, 0.08)",
                      borderRadius: "12px",
                      padding: "10px 6px",
                      textAlign: "center",
                      cursor: "pointer",
                      color: isSelected ? "#ffffff" : "var(--text-muted)",
                      transition: "all 0.2s ease",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <Icon size={20} color={isSelected ? opt.color : "var(--text-dim)"} />
                    <span style={{ fontSize: "0.8rem", fontWeight: "700" }}>{opt.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: "1.2rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: "600",
                color: "var(--text-muted)",
                marginBottom: "0.4rem",
              }}
            >
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={18}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-dim)",
                }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="athlete@example.com"
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem 0.75rem 2.6rem",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  backgroundColor: "rgba(7, 11, 20, 0.8)",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label
              style={{
                display: "block",
                fontSize: "0.82rem",
                fontWeight: "600",
                color: "var(--text-muted)",
                marginBottom: "0.4rem",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <Lock
                size={18}
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-dim)",
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%",
                  padding: "0.75rem 1rem 0.75rem 2.6rem",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  backgroundColor: "rgba(7, 11, 20, 0.8)",
                  color: "#ffffff",
                  fontSize: "0.95rem",
                  outline: "none",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-emerald"
            style={{ width: "100%", padding: "12px", fontSize: "1rem" }}
          >
            {loading ? "Creating Account..." : "Create Account"}
            <ArrowRight size={18} />
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "1.5rem",
            fontSize: "0.85rem",
            color: "var(--text-muted)",
          }}
        >
          Already have an account?{" "}
          <Link to="/login" style={{ color: "#38bdf8", fontWeight: "600", textDecoration: "none" }}>
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
