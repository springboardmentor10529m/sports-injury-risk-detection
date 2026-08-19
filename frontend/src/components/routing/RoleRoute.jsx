import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { hasActiveOrganizationMembership, isOrganizationRole } from '../../config/organizationAccess'

function RoleRoute({ allowedRoles, children }) {
  const { currentUser, userRole } = useAuth()
  if (!allowedRoles.includes(userRole)) return <Navigate to="/unauthorized" replace />
  if (isOrganizationRole(userRole) && !hasActiveOrganizationMembership(currentUser)) {
    return <Navigate to="/unauthorized" replace />
  }
  return children || <Outlet />
}

export default RoleRoute
