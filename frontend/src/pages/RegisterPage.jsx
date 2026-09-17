import React, { useState, useContext, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../services/authService";
import { AuthContext } from "../context/AuthContext";
import BrandLogo from "../components/BrandLogo";
import { Activity, User, Users, Mail, Lock, UserCheck, ArrowRight, ShieldCheck } from "lucide-react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("athlete");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { logout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any residual session when opening register screen
    logout();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please provide your full name.");
      return;
    }

    setLoading(true);
    try {
      await registerUser({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role,
      });
      // Redirect to login after successful registration
      navigate("/login?registered=true");
    } catch (err) {
      setError(
        err.response?.data?.detail || "Registration failed. Please check your info and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const roleOptions = [
    { id: "athlete", title: "Athlete", icon: User, color: "#10b981" },
    { id: "coach", title: "Coach", icon: Users, color: "#06b6d4" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1.5rem",
        position: "relative",
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
        {/* Header Branding */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "2rem", textAlign: "center" }}>
          <div style={{ marginBottom: "0.75rem" }}>
            <BrandLogo size={52} showText={false} />
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
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
            Join the KineticAI Sports Movement Assessment Platform
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
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
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
