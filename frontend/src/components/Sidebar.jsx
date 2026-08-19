import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    ClipboardCheck,
    Video,
    UserCircle,
    Shield
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

// Roles that can view athlete roster management
const STAFF_ROLES = [
    "Coach",
    "Physiotherapist",
    "Sports Scientist",
    "Administrator",
];

function Sidebar() {
    const { user } = useAuth();
    const role = user?.role;

    const allLinks = [
        {
            name: "Dashboard",
            path: "/dashboard",
            icon: LayoutDashboard,
            roles: null, // Visible to all authenticated users
        },
        {
            name: "Athletes",
            path: "/athletes",
            icon: Users,
            roles: STAFF_ROLES, // Staff-only roster view
        },
        {
            name: "Assessments",
            path: "/assessments",
            icon: ClipboardCheck,
            roles: null, // Visible to all
        },
        {
            name: "Video Analysis",
            path: "/analysis",
            icon: Video,
            roles: ["Athlete"], // Primary for Athlete role
        },
        {
            name: "Profile",
            path: "/profile",
            icon: UserCircle,
            roles: null, // Visible to all
        },
    ];

    // Filter links according to current user's role
    const visibleLinks = allLinks.filter((link) => {
        if (!link.roles) return true;
        return role && link.roles.includes(role);
    });

    return (
        <aside className="sidebar">
            <div className="sidebar-title">
                <ActivityLogo />
                <span>Sports Injury Risk Detection</span>
            </div>

            <div className="sidebar-links">
                {visibleLinks.map((link) => {
                    const Icon = link.icon;

                    return (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? "active" : ""}`
                            }
                        >
                            <Icon size={19} />
                            <span>{link.name}</span>
                        </NavLink>
                    );
                })}
            </div>

            {user && (
                <div
                    style={{
                        marginTop: "auto",
                        padding: "12px 16px",
                        borderTop: "1px solid #edf0f3",
                        fontSize: "12px",
                        color: "#7b8494",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}
                >
                    <Shield size={15} color="#55749b" />
                    <span>
                        Role: <strong>{role || "User"}</strong>
                    </span>
                </div>
            )}
        </aside>
    );
}

function ActivityLogo() {
    return (
        <div className="sidebar-logo">
            <span>SIRD</span>
        </div>
    );
}

export default Sidebar;