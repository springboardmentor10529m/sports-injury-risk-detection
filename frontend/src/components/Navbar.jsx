import React, { useContext } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import BrandLogo from "./BrandLogo";
import {
  Activity,
  User,
  Video,
  FileText,
  Users,
  LogOut,
} from "lucide-react";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  if (!user) return null;

  const currentRole = (user?.role || "athlete").toLowerCase();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Define navigation links strictly filtered by role
  let navLinks = [];

  if (currentRole === "athlete") {
    navLinks = [
      { to: "/athlete-profile", label: "My Vitals & Profile", icon: User },
      { to: "/upload", label: "Video Motion Capture", icon: Video },
      { to: "/analysis-report", label: "Screening Report", icon: FileText },
    ];
  } else if (currentRole === "coach") {
    navLinks = [
      { to: "/coach-dashboard", label: "Squad Roster", icon: Users },
      { to: "/upload", label: "Motion Screening", icon: Video },
      { to: "/analysis-report", label: "Biomechanical Reports", icon: FileText },
    ];
  }

  const roleHome = currentRole === "coach" ? "/coach-dashboard" : "/athlete-profile";

  return (
    <nav
      className="no-print"
      style={{
        backgroundColor: "rgba(7, 11, 20, 0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
        position: "sticky",
        top: 0,
        zIndex: 50,
        padding: "0.75rem 2rem",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        {/* Brand Logo */}
        <Link
          to={roleHome}
          style={{
            display: "flex",
            alignItems: "center",
            textDecoration: "none",
          }}
        >
          <BrandLogo size={38} badgeText={currentRole.toUpperCase()} />
        </Link>

        {/* Navigation Tabs (Strictly Role-Specific) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "rgba(15, 23, 42, 0.6)",
            padding: "4px 6px",
            borderRadius: "12px",
            border: "1px solid rgba(255, 255, 255, 0.05)",
          }}
        >
          {navLinks.map((item) => {
            const isActive =
              location.pathname === item.to ||
              (item.to !== "/" && location.pathname.startsWith(item.to));
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 14px",
                  borderRadius: "8px",
                  fontSize: "0.85rem",
                  fontWeight: isActive ? "700" : "500",
                  textDecoration: "none",
                  color: isActive ? "#38bdf8" : "var(--text-muted)",
                  backgroundColor: isActive
                    ? "rgba(56, 189, 248, 0.12)"
                    : "transparent",
                  border: isActive
                    ? "1px solid rgba(56, 189, 248, 0.25)"
                    : "1px solid transparent",
                  transition: "all 0.2s ease",
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Right User Info & Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "4px 12px 4px 6px",
              backgroundColor: "rgba(30, 41, 59, 0.7)",
              borderRadius: "30px",
              border: "1px solid rgba(255, 255, 255, 0.08)",
            }}
          >
            <div
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                backgroundColor:
                  currentRole === "coach"
                    ? "#06b6d4"
                    : "#10b981",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "bold",
                fontSize: "0.8rem",
                color: "#ffffff",
              }}
            >
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontSize: "0.82rem",
                  fontWeight: "600",
                  color: "#f8fafc",
                  lineHeight: 1.1,
                }}
              >
                {user.name || user.email}
              </div>
              <span
                style={{
                  fontSize: "0.68rem",
                  fontWeight: "700",
                  color:
                    currentRole === "coach"
                      ? "#38bdf8"
                      : "#34d399",
                  textTransform: "uppercase",
                  letterSpacing: "0.03em",
                }}
              >
                {currentRole}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "8px",
              backgroundColor: "rgba(239, 68, 68, 0.12)",
              color: "#f87171",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.25)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.12)";
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </nav>
  );
}
