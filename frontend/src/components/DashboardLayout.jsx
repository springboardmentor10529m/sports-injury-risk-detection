import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

function DashboardLayout({
  role,
  children
}) {

  return (
    <div className="dashboard-shell">

      <Sidebar role={role} />

      <main className="dashboard-main">

        <Topbar role={role} />

        <div className="dashboard-content">
          {children}
        </div>

      </main>

    </div>
  );
}

export default DashboardLayout;