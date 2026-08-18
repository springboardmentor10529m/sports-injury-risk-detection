import {
  LayoutDashboard,
  Activity,
  Video,
  ShieldAlert,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Users,
  Dumbbell
} from "lucide-react";

import { useNavigate } from "react-router-dom";

function Sidebar({ role }) {

  const navigate = useNavigate();

  const roleName = role
    .replace("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  const menuItems = [
    {
      name: "Dashboard",
      icon: LayoutDashboard,
      path: `/${role}/dashboard`
    },
    {
      name: "Movement Analysis",
      icon: Activity,
      path: `/${role}/movement`
    },
    {
      name: "Videos",
      icon: Video,
      path: `/${role}/videos`
    },
    {
      name: "Risk Analysis",
      icon: ShieldAlert,
      path: `/${role}/risk`
    },
    {
      name: "Analytics",
      icon: BarChart3,
      path: `/${role}/analytics`
    },
    {
      name: "Reports",
      icon: FileText,
      path: `/${role}/reports`
    }
  ];

  if (role !== "athlete") {
    menuItems.splice(2, 0, {
      name: "Athletes",
      icon: Users,
      path: `/${role}/athletes`
    });
  }

  return (
    <aside className="sidebar">

      {/* BRAND */}

      <div className="sidebar-brand">

        <div className="brand-mark">
          K
        </div>

        <div>
          <div className="brand-name">
            KINETIQ
          </div>

          <div className="brand-subtitle">
            SPORTS INTELLIGENCE
          </div>
        </div>

      </div>


      {/* ROLE */}

      <div className="sidebar-role">

        <span>ACCESS LEVEL</span>

        <strong>
          {roleName}
        </strong>

      </div>


      {/* NAVIGATION */}

      <nav className="sidebar-nav">

        <div className="nav-section-title">
          WORKSPACE
        </div>

        {menuItems.map((item) => {

          const Icon = item.icon;

          return (
            <button
              key={item.name}
              className="sidebar-item"
              onClick={() => navigate(item.path)}
            >

              <Icon size={17} />

              <span>
                {item.name}
              </span>

            </button>
          );

        })}

      </nav>


      {/* BOTTOM */}

      <div className="sidebar-bottom">

        <button className="sidebar-item">
          <Settings size={17} />
          <span>Settings</span>
        </button>

        <button
          className="sidebar-item logout"
          onClick={() => navigate("/")}
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>

      </div>

    </aside>
  );
}

export default Sidebar;