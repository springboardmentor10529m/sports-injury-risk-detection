import { NavLink, Outlet } from "react-router-dom";
import {
  LayoutDashboard, Activity, History, User, Users, Stethoscope,
  ClipboardList, FlaskConical, ShieldCheck, LogOut,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import SkeletonMotif from "./SkeletonMotif";
import NotificationBell from "./NotificationBell";

const NAV_BY_ROLE = {
  athlete: [
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/analyze", label: "Analyze Movement", icon: Activity },
    { to: "/history", label: "Risk History", icon: History },
    { to: "/profile", label: "My Profile", icon: User },
  ],
  coach: [
    { to: "/coach/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/coach/team", label: "My Team", icon: Users },
  ],
  physiotherapist: [
    { to: "/physio/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/physio/patients", label: "Patients", icon: Stethoscope },
  ],
  sports_scientist: [
    { to: "/scientist/dashboard", label: "Research Dashboard", icon: LayoutDashboard },
    { to: "/scientist/athletes", label: "Athletes", icon: FlaskConical },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/admin/users", label: "Users", icon: ShieldCheck },
  ],
};

const ROLE_LABEL = {
  athlete: "Athlete",
  coach: "Coach",
  physiotherapist: "Physiotherapist",
  sports_scientist: "Sports Scientist",
  admin: "Administrator",
};

function initials(name) {
  if (!name) return "?";
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navItems = NAV_BY_ROLE[user?.role] || [];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 252,
          borderRight: "1px solid var(--border)",
          background: "linear-gradient(180deg, var(--surface), var(--bg))",
          display: "flex",
          flexDirection: "column",
          padding: "22px 14px",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 10px 24px" }}>
          <SkeletonMotif opacity={0.9} style={{ width: 24, height: 28 }} />
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>
            InjuryGuard <span style={{ color: "var(--accent)" }}>AI</span>
          </div>
        </div>

        <div className="eyebrow" style={{ padding: "0 12px 10px" }}>
          {ROLE_LABEL[user?.role]}
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 3, flex: 1 }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to.split("/").length <= 3}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "9px 12px",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: isActive ? "var(--text)" : "var(--text-dim)",
                  background: isActive ? "var(--surface-hover)" : "transparent",
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 400,
                  borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
                  transition: "background 0.15s ease, color 0.15s ease",
                })}
              >
                <Icon size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, var(--accent), var(--accent2))",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 12, fontWeight: 700, color: "#06110e",
            }}
          >
            {initials(user?.full_name)}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.full_name}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.email}
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            style={{
              background: "none", border: "1px solid var(--border)", borderRadius: 8, width: 32, height: 32,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "var(--text-dim)",
              flexShrink: 0,
            }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: "36px 44px", maxWidth: 1240 }}>
        {user?.role !== "athlete" && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
          <NotificationBell />
        </div>}
        <Outlet />
      </main>
    </div>
  );
}
