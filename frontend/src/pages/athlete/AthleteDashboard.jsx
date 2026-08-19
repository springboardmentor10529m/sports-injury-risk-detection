import { Link } from 'react-router-dom'
import Sidebar from '../../components/Sidebar'
import { useAuth } from '../../context/AuthContext'
import '../Dashboard.css'
import './AthleteDashboard.css'

function AthleteDashboard() {
  const { currentUser, userName } = useAuth()
  const hasOrganization = Boolean(currentUser?.organizationId && currentUser?.organizationName)

  return (
    <div className="dashboard-page">
      <Sidebar />
      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <div><p className="dashboard-breadcrumb">Workspace</p><h1>Athlete Dashboard</h1></div>
          <Link className="athlete-account-link" to="/settings" aria-label="Open account settings"><span aria-hidden="true">♙</span><span>Account</span></Link>
        </header>
        <div className="dashboard-content">
          <section className="dashboard-welcome">
            <div><h2>Welcome back, {userName || 'Athlete'}.</h2><p>Use your personal workspace to review your health, performance, and account information.</p></div>
          </section>
          <section className="athlete-dashboard-grid">
            <div className="dashboard-panel athlete-dashboard-card"><span className="athlete-dashboard-card-icon">♙</span><div><h3>My Profile</h3><p>View your personal and sports information.</p><Link to="/athlete/profile">View Profile →</Link></div></div>
            <div className="dashboard-panel athlete-dashboard-card"><span className="athlete-dashboard-card-icon">◫</span><div><h3>Organization</h3><p>{hasOrganization ? currentUser.organizationName : 'Independent athlete account'}</p><Link to="/settings">View Account →</Link></div></div>
          </section>
        </div>
      </main>
    </div>
  )
}

export default AthleteDashboard
