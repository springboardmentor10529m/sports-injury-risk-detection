import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  Activity,
  Shield,
  Video,
  Users,
  Stethoscope,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  TrendingUp,
  Zap,
  Play,
  Award,
  Layers,
  ChevronRight,
  HeartPulse,
  Scale,
  Flame,
} from "lucide-react";

export default function LandingPage() {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const currentRole = (user?.role || "athlete").toLowerCase();
  const dashboardLink =
    currentRole === "coach"
      ? "/coach-dashboard"
      : currentRole === "physio"
      ? "/physio-dashboard"
      : "/athlete-profile";

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg-main)", color: "#ffffff" }}>
      {/* Top Header Navbar */}
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          backgroundColor: "rgba(7, 11, 20, 0.85)",
          backdropFilter: "blur(16px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "0 1.5rem",
        }}
      >
        <div
          style={{
            maxWidth: "1350px",
            margin: "0 auto",
            height: "72px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #0284c7 0%, #10b981 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(6, 182, 212, 0.4)",
              }}
            >
              <Activity color="#ffffff" size={24} />
            </div>
            <div>
              <span style={{ fontSize: "1.2rem", fontWeight: "800", letterSpacing: "-0.02em", color: "#ffffff" }}>
                KINETIC<span style={{ color: "#38bdf8" }}>AI</span>
              </span>
              <span
                style={{
                  fontSize: "0.65rem",
                  backgroundColor: "rgba(56, 189, 248, 0.15)",
                  color: "#38bdf8",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontWeight: "700",
                  marginLeft: "6px",
                }}
              >
                PRO
              </span>
            </div>
          </div>

          {/* Center Nav Links */}
          <nav style={{ display: "flex", gap: "2rem", alignItems: "center" }}>
            <a
              href="#features"
              style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.9rem", fontWeight: "500" }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#38bdf8")}
              onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              Capabilities
            </a>
            <a
              href="#how-it-works"
              style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.9rem", fontWeight: "500" }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#38bdf8")}
              onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              How It Works
            </a>
            <a
              href="#roles"
              style={{ color: "var(--text-muted)", textDecoration: "none", fontSize: "0.9rem", fontWeight: "500" }}
              onMouseOver={(e) => (e.currentTarget.style.color = "#38bdf8")}
              onMouseOut={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              Portals
            </a>
          </nav>

          {/* Right Action Buttons */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {user ? (
              <Link to={dashboardLink} className="btn-emerald" style={{ textDecoration: "none" }}>
                Launch Dashboard <ArrowRight size={16} />
              </Link>
            ) : (
              <>
                <Link
                  to="/login"
                  className="btn-subtle"
                  style={{ textDecoration: "none", padding: "8px 16px", fontSize: "0.85rem" }}
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="btn-primary"
                  style={{ textDecoration: "none", padding: "8px 18px", fontSize: "0.85rem" }}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section
        style={{
          maxWidth: "1350px",
          margin: "0 auto",
          padding: "5rem 1.5rem 4rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
          gap: "3rem",
          alignItems: "center",
        }}
      >
        {/* Left Hero Pitch */}
        <div>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 14px",
              borderRadius: "30px",
              backgroundColor: "rgba(56, 189, 248, 0.12)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              color: "#38bdf8",
              fontSize: "0.82rem",
              fontWeight: "700",
              marginBottom: "1.5rem",
            }}
          >
            <Sparkles size={15} /> Computer-Vision Powered Biomechanics Engine
          </div>

          <h1
            style={{
              fontSize: "clamp(2.4rem, 5vw, 3.6rem)",
              fontWeight: "800",
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: "#ffffff",
              marginBottom: "1.25rem",
            }}
          >
            Detect Injury Risk <br />
            <span className="gradient-text-cyan">Before It Happens.</span>
          </h1>

          <p
            style={{
              fontSize: "1.1rem",
              color: "var(--text-muted)",
              lineHeight: 1.6,
              marginBottom: "2rem",
              maxWidth: "540px",
            }}
          >
            KineticAI transforms regular video footage into 33-point 3D joint kinematic tracking, fatigue load telemetry, and predictive injury screening for Athletes, Coaches, and Physiotherapists.
          </p>

          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>
            <Link
              to="/register"
              className="btn-emerald"
              style={{
                padding: "14px 28px",
                fontSize: "1rem",
                textDecoration: "none",
                boxShadow: "0 6px 20px rgba(16, 185, 129, 0.35)",
              }}
            >
              Start Free Assessment <ArrowRight size={18} />
            </Link>
            <Link
              to="/login"
              className="btn-subtle"
              style={{ padding: "14px 24px", fontSize: "1rem", textDecoration: "none" }}
            >
              Sign In to Portal
            </Link>
          </div>

          {/* Social Proof Stats */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1.5rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div>
              <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#38bdf8", fontFamily: "var(--font-mono)" }}>
                94.8%
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>Valgus Angle Accuracy</div>
            </div>
            <div>
              <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#34d399", fontFamily: "var(--font-mono)" }}>
                0 Sensors
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>Standard Video Only</div>
            </div>
            <div>
              <div style={{ fontSize: "1.6rem", fontWeight: "800", color: "#c084fc", fontFamily: "var(--font-mono)" }}>
                &lt; 3 Sec
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-dim)" }}>Diagnostic Report Time</div>
            </div>
          </div>
        </div>

        {/* Right Hero Visual: Simulated Biomechanics Scanner Card */}
        <div style={{ position: "relative" }}>
          <div
            style={{
              position: "absolute",
              top: "-20%",
              right: "-20%",
              width: "400px",
              height: "400px",
              background: "radial-gradient(circle, rgba(6, 182, 212, 0.2) 0%, transparent 70%)",
              filter: "blur(40px)",
              pointerEvents: "none",
            }}
          />

          <div
            className="glass-panel glass-panel-glow"
            style={{
              padding: "2rem",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Visual Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#10b981" }} />
                <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "#ffffff" }}>
                  AI Biomechanical Motion Diagnostic
                </span>
              </div>
              <span className="badge-low-risk">Optimal Alignment</span>
            </div>

            {/* Simulated Joint Tracking Display */}
            <div
              style={{
                backgroundColor: "#050811",
                borderRadius: "12px",
                padding: "1.5rem",
                marginBottom: "1.5rem",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                minHeight: "220px",
              }}
            >
              {/* Graphic Skeleton Nodes */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
                <div style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: "#38bdf8", boxShadow: "0 0 15px #38bdf8" }} />
                <div style={{ width: "2px", height: "30px", backgroundColor: "#06b6d4" }} />
                <div style={{ display: "flex", gap: "60px" }}>
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#34d399", boxShadow: "0 0 10px #34d399" }} />
                  <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#34d399", boxShadow: "0 0 10px #34d399" }} />
                </div>
                <div style={{ display: "flex", gap: "80px" }}>
                  <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "#38bdf8" }} />
                  <div style={{ width: "14px", height: "14px", borderRadius: "50%", backgroundColor: "#38bdf8" }} />
                </div>
              </div>

              {/* Float Angle Badges */}
              <div
                style={{
                  position: "absolute",
                  bottom: "20px",
                  left: "20px",
                  padding: "4px 10px",
                  backgroundColor: "rgba(16, 185, 129, 0.2)",
                  border: "1px solid #10b981",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  color: "#34d399",
                }}
              >
                KNEE VALGUS: 12.4° (SAFE)
              </div>

              <div
                style={{
                  position: "absolute",
                  bottom: "20px",
                  right: "20px",
                  padding: "4px 10px",
                  backgroundColor: "rgba(56, 189, 248, 0.2)",
                  border: "1px solid #38bdf8",
                  borderRadius: "6px",
                  fontSize: "0.75rem",
                  fontWeight: "700",
                  color: "#38bdf8",
                }}
              >
                FLEXION: 48° (DAMPENED)
              </div>
            </div>

            {/* Micro Telemetry Bar */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" }}>
              <div style={{ padding: "8px", backgroundColor: "rgba(15, 23, 42, 0.7)", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Impact Asymmetry</div>
                <div style={{ fontSize: "1rem", fontWeight: "700", color: "#34d399" }}>3.8%</div>
              </div>
              <div style={{ padding: "8px", backgroundColor: "rgba(15, 23, 42, 0.7)", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Trunk Tilt</div>
                <div style={{ fontSize: "1rem", fontWeight: "700", color: "#38bdf8" }}>2.1°</div>
              </div>
              <div style={{ padding: "8px", backgroundColor: "rgba(15, 23, 42, 0.7)", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.7rem", color: "var(--text-dim)" }}>Risk Score</div>
                <div style={{ fontSize: "1rem", fontWeight: "700", color: "#10b981" }}>18% (Low)</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Role Portals Section */}
      <section
        id="roles"
        style={{
          maxWidth: "1350px",
          margin: "0 auto",
          padding: "5rem 1.5rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#38bdf8", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Tailored Experiences
          </span>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "800", color: "#ffffff", marginTop: "6px" }}>
            Dedicated Portals for Every Sports Professional
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", maxWidth: "600px", margin: "8px auto 0" }}>
            Whether you are an individual athlete, a head coach, or a sports physiotherapist, KineticAI provides role-specific tools to safeguard musculoskeletal health.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.75rem" }}>
          {/* 1. Athlete Card */}
          <div className="glass-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(16, 185, 129, 0.15)",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#10b981",
                  marginBottom: "1.25rem",
                }}
              >
                <Activity size={24} />
              </div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#ffffff", marginBottom: "0.6rem" }}>
                Athlete Portal
              </h3>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                Track personal physical capacity across Strength, Flexibility, Balance, and Endurance. Record video drop-jumps for instant feedback on ACL and hamstring strain vulnerability.
              </p>
              <ul style={{ fontSize: "0.82rem", color: "#cbd5e1", paddingLeft: "1.2rem", lineHeight: 1.8, marginBottom: "1.5rem" }}>
                <li>Multi-axial Physical Capacity Radar</li>
                <li>Video Drop-Jump & Deceleration AI Scan</li>
                <li>Dynamic Injury Vector Breakdown</li>
              </ul>
            </div>
            <Link to="/register" className="btn-emerald" style={{ width: "100%", textDecoration: "none", textAlign: "center" }}>
              Join as Athlete →
            </Link>
          </div>

          {/* 2. Coach Card */}
          <div className="glass-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(6, 182, 212, 0.15)",
                  border: "1px solid rgba(6, 182, 212, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#06b6d4",
                  marginBottom: "1.25rem",
                }}
              >
                <Users size={24} />
              </div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#ffffff", marginBottom: "0.6rem" }}>
                Coach Command
              </h3>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                Monitor squad-wide workload accumulation and fatigue hotspots. Identify high-risk athletes before practice and receive AI drill modifications to prevent non-contact injuries.
              </p>
              <ul style={{ fontSize: "0.82rem", color: "#cbd5e1", paddingLeft: "1.2rem", lineHeight: 1.8, marginBottom: "1.5rem" }}>
                <li>Squad-Wide Workload & Roster Telemetry</li>
                <li>High-Risk Athlete Automated Alerts</li>
                <li>Workload vs Risk Correlation Charts</li>
              </ul>
            </div>
            <Link to="/register" className="btn-primary" style={{ width: "100%", textDecoration: "none", textAlign: "center" }}>
              Join as Coach →
            </Link>
          </div>

          {/* 3. Physio Card */}
          <div className="glass-panel" style={{ padding: "2rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: "rgba(168, 85, 247, 0.15)",
                  border: "1px solid rgba(168, 85, 247, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#a855f7",
                  marginBottom: "1.25rem",
                }}
              >
                <Stethoscope size={24} />
              </div>
              <h3 style={{ fontSize: "1.3rem", fontWeight: "800", color: "#ffffff", marginBottom: "0.6rem" }}>
                Physio Clinic & RTP
              </h3>
              <p style={{ fontSize: "0.88rem", color: "var(--text-muted)", lineHeight: 1.5, marginBottom: "1.25rem" }}>
                Track clinical rehabilitation through a standardized 4-Phase Return-to-Play framework. Prescribe corrective drills and monitor joint Range of Motion (ROM) progression.
              </p>
              <ul style={{ fontSize: "0.82rem", color: "#cbd5e1", paddingLeft: "1.2rem", lineHeight: 1.8, marginBottom: "1.5rem" }}>
                <li>4-Phase Return-To-Play Clinical Tracker</li>
                <li>Corrective Exercise Prescription Builder</li>
                <li>Joint ROM & Bilateral Symmetry Ratios</li>
              </ul>
            </div>
            <Link
              to="/register"
              className="btn-subtle"
              style={{ width: "100%", textDecoration: "none", textAlign: "center", color: "#c084fc", borderColor: "rgba(168,85,247,0.3)" }}
            >
              Join as Physiotherapist →
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        style={{
          maxWidth: "1350px",
          margin: "0 auto",
          padding: "5rem 1.5rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: "700", color: "#10b981", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Simplicity & Precision
          </span>
          <h2 style={{ fontSize: "2.2rem", fontWeight: "800", color: "#ffffff", marginTop: "6px" }}>
            How KineticAI Works in 3 Steps
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
          <div className="glass-panel" style={{ padding: "2rem", textAlign: "center" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0284c7 0%, #06b6d4 100%)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
                fontWeight: "800",
                marginBottom: "1.25rem",
              }}
            >
              1
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff", marginBottom: "0.5rem" }}>
              Record or Upload Video
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Capture standard smartphone or camera footage of jump landings, decelerations, or cutting drills. No wearable sensors needed.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: "2rem", textAlign: "center" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #06b6d4 0%, #10b981 100%)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
                fontWeight: "800",
                marginBottom: "1.25rem",
              }}
            >
              2
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff", marginBottom: "0.5rem" }}>
              Computer Vision Pose Estimation
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Our AI extracts 33 3D skeletal landmarks frame-by-frame, calculating dynamic knee valgus angles, landing shock, and asymmetry.
            </p>
          </div>

          <div className="glass-panel" style={{ padding: "2rem", textAlign: "center" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "1.4rem",
                fontWeight: "800",
                marginBottom: "1.25rem",
              }}
            >
              3
            </div>
            <h3 style={{ fontSize: "1.15rem", fontWeight: "700", color: "#ffffff", marginBottom: "0.5rem" }}>
              Actionable Risk Mitigation
            </h3>
            <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Receive instant risk classifications, diagnostic reports, and customized corrective exercises to eliminate biomechanical weak points.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section
        style={{
          maxWidth: "1150px",
          margin: "0 auto 5rem",
          padding: "0 1.5rem",
        }}
      >
        <div
          className="glass-panel glass-panel-glow"
          style={{
            padding: "3.5rem 2rem",
            textAlign: "center",
            background: "linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(6, 182, 212, 0.1) 100%)",
          }}
        >
          <h2 style={{ fontSize: "2.4rem", fontWeight: "800", color: "#ffffff", marginBottom: "1rem" }}>
            Ready to Protect Your Athletes and Maximize Performance?
          </h2>
          <p style={{ fontSize: "1rem", color: "var(--text-muted)", maxWidth: "550px", margin: "0 auto 2rem" }}>
            Create your account today to access AI biomechanics screening, capacity radar charts, and customized rehabilitation tracking.
          </p>

          <Link
            to="/register"
            className="btn-emerald"
            style={{
              padding: "14px 32px",
              fontSize: "1.05rem",
              textDecoration: "none",
              boxShadow: "0 8px 25px rgba(16, 185, 129, 0.4)",
            }}
          >
            Create Your Free Account <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "2.5rem 1.5rem",
          backgroundColor: "#050811",
          textAlign: "center",
          fontSize: "0.82rem",
          color: "var(--text-dim)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
          <Activity size={16} color="#38bdf8" />
          <span style={{ fontWeight: "800", color: "#ffffff" }}>KINETIC<span style={{ color: "#38bdf8" }}>AI</span></span>
          <span>• Sports Injury Risk Detection Platform</span>
        </div>
        <p style={{ margin: 0 }}>
          © {new Date().getFullYear()} KineticAI. Built for sports science, athletic performance, and injury prevention.
        </p>
      </footer>
    </div>
  );
}
