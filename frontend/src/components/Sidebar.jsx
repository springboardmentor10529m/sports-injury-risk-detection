import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/roles'

const navigationByRole = {
  [ROLES.ATHLETE]: [['Dashboard', '/athlete/dashboard', '▦'], ['My Profile', '/athlete/profile', '♙'], ['Injury History', '/athlete/injury-history', '♥'], ['Risk Assessments', '/athlete/risk-assessments', '◉'], ['Performance', '/athlete/performance', '↗'], ['Video Analysis', '/athlete/video-analysis', '▶'], ['Recommendations', '/athlete/recommendations', '✦'], ['Reports', '/athlete/reports', '▤']],
  [ROLES.COACH]: [['Dashboard', '/coach/dashboard', '▦'], ['Team Athletes', '/coach/athletes', '♟'], ['Injury Monitoring', '/coach/injury-monitoring', '♥'], ['Risk Assessments', '/coach/risk-assessments', '◉'], ['Performance', '/coach/performance', '↗'], ['Video Analysis', '/coach/video-analysis', '▶'], ['Risk Alerts', '/coach/risk-alerts', '⚠'], ['Reports', '/coach/reports', '▤']],
  [ROLES.PHYSIOTHERAPIST]: [['Dashboard', '/physiotherapist/dashboard', '▦'], ['Assigned Athletes', '/physiotherapist/athletes', '♟'], ['Injury Management', '/physiotherapist/injury-management', '♥'], ['Recovery & Rehabilitation', '/physiotherapist/recovery', '↗'], ['Risk Assessments', '/physiotherapist/risk-assessments', '◉'], ['Video Analysis', '/physiotherapist/video-analysis', '▶'], ['Recommendations', '/physiotherapist/recommendations', '✦'], ['Reports', '/physiotherapist/reports', '▤']],
  [ROLES.ADMIN]: [['Dashboard', '/admin/dashboard', '▦'], ['Organization Analytics', '/admin/analytics', '↗'], ['Users', '/admin/users', '♙'], ['Athletes', '/admin/athletes', '♟'], ['Coaches', '/admin/coaches', '♞'], ['Physiotherapists', '/admin/physiotherapists', '⚕'], ['Teams / Groups', '/admin/teams', '◫'], ['Reports', '/admin/reports', '▤'], ['Access & Permissions', '/admin/access-permissions', '⚿'], ['Organization Settings', '/admin/organization-settings', '⚙']],
}

function Sidebar() {
  const navigate = useNavigate()
  const { logout, userRole } = useAuth()
  const links = navigationByRole[userRole] || []
  const getNavClass = ({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <aside className="dashboard-sidebar">
      <div className="sidebar-brand"><div className="sidebar-brand-title">Sports Injury</div><div className="sidebar-brand-subtitle">Risk Prediction</div></div>
      <nav className="sidebar-nav">
        <div className="sidebar-section-title">MAIN</div>
        {links.map(([label, path, icon]) => <NavLink key={path} to={path} className={getNavClass}><span className="sidebar-icon">{icon}</span><span>{label}</span></NavLink>)}
        <div className="sidebar-bottom">
          {userRole !== ROLES.ADMIN && <NavLink to="/settings" className={getNavClass}><span className="sidebar-icon">⚙</span><span>Settings</span></NavLink>}
          <button type="button" className="sidebar-link sidebar-logout" onClick={handleLogout}><span className="sidebar-icon">↪</span><span>Logout</span></button>
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar
