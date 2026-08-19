import React, { useContext } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import {
  User,
  Video,
  FileText,
  Users,
  Stethoscope,
  Activity,
} from "lucide-react";

export default function Sidebar() {
  const { user } = useContext(AuthContext);
  const location = useLocation();

  if (!user) return null;

  const currentRole = (user?.role || "athlete").toLowerCase();

  let links = [];
  if (currentRole === "athlete") {
    links = [
      { to: "/athlete-profile", label: "Athlete Profile", icon: User },
      { to: "/upload", label: "Video Motion AI", icon: Video },
      { to: "/analysis-report", label: "Screening Report", icon: FileText },
    ];
  } else if (currentRole === "coach") {
    links = [
      { to: "/coach-dashboard", label: "Squad Roster", icon: Users },
      { to: "/analysis-report", label: "Screening Reports", icon: FileText },
    ];
  } else if (currentRole === "physio") {
    links = [
      { to: "/physio-dashboard", label: "Clinical Hub", icon: Stethoscope },
      { to: "/analysis-report", label: "Screening Reports", icon: FileText },
    ];
  }

  return (
    <aside
      className="glass-panel"
      style={{
        width: "260px",
        height: "calc(100vh - 68px)",
        position: "sticky",
        top: "68px",
        padding: "1.5rem 1rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        borderRadius: 0,
        borderRight: "1px solid rgba(255, 255, 255, 0.08)",
        borderLeft: "none",
        borderTop: "none",
        borderBottom: "none",
      }}
    >
      <div>
        <div
          style={{
            fontSize: "0.75rem",
            fontWeight: "700",
            color: "var(--text-dim)",
            textTransform: "uppercase",
            padding: "0 10px 10px",
          }}
        >
          {currentRole} Navigation
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {links.map((item) => {
            const isActive = location.pathname === item.to;
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  fontSize: "0.88rem",
                  fontWeight: isActive ? "700" : "500",
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
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      <div
        style={{
          padding: "12px",
          backgroundColor: "rgba(10, 15, 29, 0.6)",
          borderRadius: "10px",
          border: "1px solid rgba(255, 255, 255, 0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#10b981",
            fontSize: "0.78rem",
            fontWeight: "700",
          }}
        >
          <Activity size={14} /> Telemetry Online
        </div>
        <p
          style={{
            fontSize: "0.72rem",
            color: "var(--text-dim)",
            margin: "4px 0 0 0",
          }}
        >
          Connected as {user.name || user.email}
        </p>
      </div>
    </aside>
  );
}
