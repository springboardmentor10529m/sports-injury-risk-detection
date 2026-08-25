import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ROLE_DASHBOARDS, ROLES } from './config/roles'
import ProtectedRoute from './components/routing/ProtectedRoute'
import RoleRoute from './components/routing/RoleRoute'
import Home from './pages/Home'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ForgotPassword from './pages/auth/ForgotPassword'
import AddAthlete from './pages/AddAthlete'
import EditAthlete from './pages/EditAthlete'
import AthleteProfile from './pages/athlete/AthleteProfile'
import Settings from './pages/common/Settings'
import Unauthorized from './pages/common/Unauthorized'
import RoleDashboard from './pages/common/RoleDashboard'
import WorkspacePage from './pages/common/WorkspacePage'
import OrganizationOverview from './pages/common/OrganizationOverview'

function RoleDashboardRedirect() {
  const { userRole } = useAuth()
  return <Navigate to={ROLE_DASHBOARDS[userRole] || '/login'} replace />
}

function LegacyAthletesRedirect() {
  const { userRole } = useAuth()
  const destinations = {
    [ROLES.COACH]: '/coach/athletes',
    [ROLES.PHYSIOTHERAPIST]: '/physiotherapist/athletes',
    [ROLES.ADMIN]: '/admin/athletes',
  }
  return <Navigate to={destinations[userRole] || ROLE_DASHBOARDS[userRole]} replace />
}

function LegacyAthleteProfileRedirect() {
  const { id } = useParams()
  const { userRole } = useAuth()
  if (userRole === ROLES.ADMIN) return <Navigate to={`/admin/athletes/${id}`} replace />
  if (userRole === ROLES.COACH) return <Navigate to={`/coach/athletes/${id}`} replace />
  return <Navigate to={ROLE_DASHBOARDS[userRole]} replace />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/dashboard" element={<RoleDashboardRedirect />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/athletes" element={<LegacyAthletesRedirect />} />
        <Route path="/athletes/:id" element={<LegacyAthleteProfileRedirect />} />

        <Route element={<RoleRoute allowedRoles={[ROLES.ATHLETE]} />}>
          <Route path="/athlete/dashboard" element={<RoleDashboard />} />
          <Route path="/athlete/profile" element={<AthleteProfile />} />
          <Route path="/athlete/injury-history" element={<WorkspacePage type="injury" role={ROLES.ATHLETE} />} />
          <Route path="/athlete/risk-assessments" element={<WorkspacePage type="assessments" role={ROLES.ATHLETE} />} />
          <Route path="/athlete/performance" element={<WorkspacePage type="performance" role={ROLES.ATHLETE} />} />
          <Route path="/athlete/video-analysis" element={<WorkspacePage type="video" role={ROLES.ATHLETE} />} />
          <Route path="/athlete/recommendations" element={<WorkspacePage type="recommendations" role={ROLES.ATHLETE} />} />
          <Route path="/athlete/reports" element={<WorkspacePage type="reports" role={ROLES.ATHLETE} />} />
          <Route path="/injury-history" element={<WorkspacePage type="injury" role={ROLES.ATHLETE} />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={[ROLES.COACH]} />}>
          <Route path="/coach/dashboard" element={<RoleDashboard />} />
          <Route path="/coach/athletes" element={<WorkspacePage type="athletes" role={ROLES.COACH} />} />
          <Route path="/coach/athletes/:id" element={<WorkspacePage type="athleteProfile" role={ROLES.COACH} />} />
          <Route path="/coach/injury-monitoring" element={<WorkspacePage type="injury" role={ROLES.COACH} />} />
          <Route path="/coach/injury-history" element={<WorkspacePage type="injury" role={ROLES.COACH} />} />
          <Route path="/coach/risk-assessments" element={<WorkspacePage type="assessments" role={ROLES.COACH} />} />
          <Route path="/coach/performance" element={<WorkspacePage type="performance" role={ROLES.COACH} />} />
          <Route path="/coach/video-analysis" element={<WorkspacePage type="video" role={ROLES.COACH} />} />
          <Route path="/coach/risk-alerts" element={<WorkspacePage type="assessments" role={ROLES.COACH} />} />
          <Route path="/coach/reports" element={<WorkspacePage type="reports" role={ROLES.COACH} />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={[ROLES.PHYSIOTHERAPIST]} />}>
          <Route path="/physiotherapist/dashboard" element={<RoleDashboard />} />
          <Route path="/physiotherapist/athletes" element={<WorkspacePage type="athletes" role={ROLES.PHYSIOTHERAPIST} />} />
          <Route path="/physiotherapist/injury-management" element={<WorkspacePage type="management" role={ROLES.PHYSIOTHERAPIST} />} />
          <Route path="/physiotherapist/injury-history" element={<WorkspacePage type="management" role={ROLES.PHYSIOTHERAPIST} />} />
          <Route path="/physiotherapist/recovery" element={<WorkspacePage type="recovery" role={ROLES.PHYSIOTHERAPIST} />} />
          <Route path="/physiotherapist/risk-assessments" element={<WorkspacePage type="assessments" role={ROLES.PHYSIOTHERAPIST} />} />
          <Route path="/physiotherapist/video-analysis" element={<WorkspacePage type="video" role={ROLES.PHYSIOTHERAPIST} />} />
          <Route path="/physiotherapist/recommendations" element={<WorkspacePage type="recommendations" role={ROLES.PHYSIOTHERAPIST} />} />
          <Route path="/physiotherapist/reports" element={<WorkspacePage type="reports" role={ROLES.PHYSIOTHERAPIST} />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN]} />}>
          <Route path="/admin/dashboard" element={<RoleDashboard />} />
          <Route path="/admin/overview" element={<OrganizationOverview />} />
          <Route path="/admin/analytics" element={<WorkspacePage type="analytics" />} />
          <Route path="/admin/users" element={<WorkspacePage type="access" />} />
          <Route path="/admin/athletes" element={<WorkspacePage type="athletes" />} />
          <Route path="/admin/athletes/:id" element={<WorkspacePage type="athleteProfile" role={ROLES.ADMIN} />} />
          <Route path="/admin/injury-history" element={<WorkspacePage type="injury" />} />
          <Route path="/admin/athletes/add" element={<AddAthlete />} />
          <Route path="/admin/athletes/:id/edit" element={<EditAthlete />} />
          <Route path="/admin/coaches" element={<WorkspacePage type="coaches" />} />
          <Route path="/admin/physiotherapists" element={<WorkspacePage type="physiotherapists" />} />
          <Route path="/admin/teams" element={<WorkspacePage type="teams" />} />
          <Route path="/admin/reports" element={<WorkspacePage type="reports" />} />
          <Route path="/admin/access-permissions" element={<WorkspacePage type="access" />} />
          <Route path="/admin/organization-settings" element={<WorkspacePage type="settings" />} />
          <Route path="/athletes/add" element={<AddAthlete />} />
          <Route path="/athletes/:id/edit" element={<EditAthlete />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return <AuthProvider><BrowserRouter><AppRoutes /></BrowserRouter></AuthProvider>
}

export default App
