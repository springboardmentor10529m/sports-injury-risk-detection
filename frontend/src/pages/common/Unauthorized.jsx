import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ROLE_DASHBOARDS } from '../../config/roles'

function Unauthorized() {
  const { userRole } = useAuth()
  return (
    <div className="auth-page"><div className="container"><div className="row justify-content-center"><div className="col-12 col-md-7 col-lg-5"><div className="auth-card text-center">
      <div className="auth-icon">!</div><h2 className="auth-title">Access Restricted</h2>
      <p className="auth-subtitle">Your account does not have permission to access this page.</p>
      <Link className="btn btn-primary" to={ROLE_DASHBOARDS[userRole] || '/login'}>Return to Dashboard</Link>
    </div></div></div></div></div>
  )
}

export default Unauthorized
