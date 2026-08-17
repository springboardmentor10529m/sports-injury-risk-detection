import { NavLink } from "react-router-dom";

import {
    LayoutDashboard,
    Users,
    ClipboardCheck,
    Video,
    UserCircle
} from "lucide-react";

function Sidebar() {
    const links = [
        {
            name: "Dashboard",
            path: "/dashboard",
            icon: LayoutDashboard
        },
        {
            name: "Athletes",
            path: "/athletes",
            icon: Users
        },
        {
            name: "Assessments",
            path: "/assessments",
            icon: ClipboardCheck
        },
        {
            name: "Video Analysis",
            path: "/analysis",
            icon: Video
        },
        {
            name: "Profile",
            path: "/profile",
            icon: UserCircle
        }
    ];

    return (
        <aside className="sidebar">
            <div className="sidebar-title">
                <ActivityLogo />
                <span>MotionGuard</span>
            </div>

            <div className="sidebar-links">
                {links.map((link) => {
                    const Icon = link.icon;

                    return (
                        <NavLink
                            key={link.path}
                            to={link.path}
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? "active" : ""
                                }`
                            }
                        >
                            <Icon size={19} />
                            <span>{link.name}</span>
                        </NavLink>
                    );
                })}
            </div>
        </aside>
    );
}

function ActivityLogo() {
    return (
        <div className="sidebar-logo">
            <span>MG</span>
        </div>
    );
}

export default Sidebar;