import {
  Bell,
  Search,
  UserCircle
} from "lucide-react";

function Topbar({ role }) {

  const roleName = role
    .replace("-", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

  return (
    <header className="dashboard-topbar">

      <div>

        <div className="breadcrumb">
          KINETIQ / {roleName}
        </div>

        <div className="system-status">

          <span className="status-dot"></span>

          SYSTEM OPERATIONAL

        </div>

      </div>


      <div className="topbar-actions">

        <div className="search-box">

          <Search size={16} />

          <input
            placeholder="Search..."
          />

        </div>


        <button className="topbar-icon">
          <Bell size={18} />

          <span className="notification-dot"></span>
        </button>


        <div className="profile">

          <UserCircle size={30} />

          <div>

            <strong>
              {roleName}
            </strong>

            <span>
              KINETIQ User
            </span>

          </div>

        </div>

      </div>

    </header>
  );
}

export default Topbar;