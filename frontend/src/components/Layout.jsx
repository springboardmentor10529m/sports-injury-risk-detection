import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SkeletonMotif from "./SkeletonMotif";

const NAV_BY_ROLE = {
  athlete: [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/analyze", label: "Analyze Movement" },
    { to: "/history", label: "Risk History" },
    { to: "/profile", label: "My Profile" },
  ],
  coach: [
    { to: "/coach/dashboard", label: "Dashboard" },
    { to: "/coach/team", label: "My Team" },
  ],
  physiotherapist: [
    { to: "/physio/dashboard", label: "Dashboard" },
    { to: "/physio/patients", label: "Patients" },
  ],
  sports_scientist: [
    { to: "/scientist/dashboard", label: "Research Dashboard" },
    { to: "/scientist/athletes", label: "Athletes" },
  ],
  admin: [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/users", label: "Users" },
  ],
};

const ROLE_LABEL = {
  athlete: "Athlete",
  coach: "Coach",
  physiotherapist: "Physiotherapist",
  sports_scientist: "Sports Scientist",
  admin: "Administrator",
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navItems = NAV_BY_ROLE[user?.role] || [];

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside
        style={{
          width: 240,
          borderRight: "1px solid var(--border)",
          background: "var(--surface)",
          display: "flex",
          flexDirection: "column",
          padding: "24px 16px",
          position: "sticky",
          top: 0,
          height: "100vh",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px 28px" }}>
          <SkeletonMotif opacity={0.9} style={{ width: 26, height: 30 }} />
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>
            InjuryGuard <span style={{ color: "var(--accent)" }}>AI</span>
          </div>
        </div>

        <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-faint)", padding: "0 12px 10px" }}>
          {ROLE_LABEL[user?.role]}
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1 }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to.split("/").length <= 3}
              style={({ isActive }) => ({
                padding: "10px 12px",
                borderRadius: 8,
                textDecoration: "none",
                color: isActive ? "var(--text)" : "var(--text-dim)",
                background: isActive ? "var(--surface-raised)" : "transparent",
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                borderLeft: isActive ? "2px solid var(--accent)" : "2px solid transparent",
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div style={{ borderTop: "1px solid var(--border)", paddingTop: 16 }}>
          <div style={{ fontSize: 13, color: "var(--text)", marginBottom: 2 }}>{user?.full_name}</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 12 }}>{user?.email}</div>
          <button className="btn btn-block" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: "32px 40px", maxWidth: 1200 }}>
        <Outlet />
      </main>
    </div>
  );
}
