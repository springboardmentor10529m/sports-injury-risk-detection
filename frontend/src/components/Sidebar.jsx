import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../config/roles'
import Logo from './Logo'

const navigationByRole = {
  [ROLES.ATHLETE]: [['Dashboard', '/athlete/dashboard', '▦'], ['My Profile', '/athlete/profile', '♙'], ['Injury History', '/athlete/injury-history', '♥'], ['Risk Assessments', '/athlete/risk-assessments', '◉'], ['Performance', '/athlete/performance', '↗'], ['Video Analysis', '/athlete/video-analysis', '▶'], ['Recommendations', '/athlete/recommendations', '✦'], ['Reports', '/athlete/reports', '▤']],
  [ROLES.COACH]: [['Dashboard', '/coach/dashboard', '▦'], ['Team Athletes', '/coach/athletes', '♟'], ['Injury Monitoring', '/coach/injury-monitoring', '♥'], ['Risk Assessments', '/coach/risk-assessments', '◉'], ['Performance', '/coach/performance', '↗'], ['Video Analysis', '/coach/video-analysis', '▶'], ['Risk Alerts', '/coach/risk-alerts', '⚠'], ['Reports', '/coach/reports', '▤']],
  [ROLES.PHYSIOTHERAPIST]: [['Dashboard', '/physiotherapist/dashboard', '▦'], ['Assigned Athletes', '/physiotherapist/athletes', '♟'], ['Injury Management', '/physiotherapist/injury-management', '♥'], ['Recovery & Rehabilitation', '/physiotherapist/recovery', '↗'], ['Risk Assessments', '/physiotherapist/risk-assessments', '◉'], ['Video Analysis', '/physiotherapist/video-analysis', '▶'], ['Recommendations', '/physiotherapist/recommendations', '✦'], ['Clinical Reports', '/physiotherapist/reports', '▤']],
  [ROLES.ADMIN]: [['Dashboard', '/admin/dashboard', '▦'], ['Organization Overview', '/admin/overview', '⌂'], ['Athletes', '/admin/athletes', '♟'], ['Coaches', '/admin/coaches', '♞'], ['Physiotherapists', '/admin/physiotherapists', '⚕'], ['Video AI Analysis', '/admin/video-analysis', '▶'], ['Teams / Groups', '/admin/teams', '◫'], ['Access & Permissions', '/admin/access-permissions', '⚿'], ['Organization Analytics', '/admin/analytics', '📊'], ['Reports', '/admin/reports', '▤'], ['Organization Settings', '/admin/organization-settings', '⚙']],
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
      <div className="sidebar-brand"><Logo compact /></div>
      <nav className="sidebar-nav">
        <div className="sidebar-section-title">MAIN</div>
        {links.map(([label, path, icon]) => <NavLink key={path} to={path} className={getNavClass}><span className="sidebar-icon">{icon}</span><span>{label}</span></NavLink>)}
        <div className="sidebar-bottom">
          <NavLink to="/settings" className={getNavClass}><span className="sidebar-icon">⚙</span><span>Settings</span></NavLink>
          <button type="button" className="sidebar-link sidebar-logout" onClick={handleLogout}><span className="sidebar-icon">↪</span><span>Logout</span></button>
        </div>
      </nav>
    </aside>
  )
}

export default Sidebar
