import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ROLE_DASHBOARDS, ROLES } from './config/roles'
import ProtectedRoute from './components/routing/ProtectedRoute'
import RoleRoute from './components/routing/RoleRoute'
import Home from './pages/Home'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import CoachDashboard from './pages/coach/CoachDashboard'
import Athletes from './pages/coach/Athletes'
import CoachAthleteProfile from './pages/coach/AthleteProfile'
import AddAthlete from './pages/AddAthlete'
import EditAthlete from './pages/EditAthlete'
import AthleteDashboard from './pages/athlete/AthleteDashboard'
import AthleteProfile from './pages/athlete/AthleteProfile'
import InjuryHistory from './pages/athlete/InjuryHistory'
import Settings from './pages/common/Settings'
import Unauthorized from './pages/common/Unauthorized'
import ModulePlaceholder from './pages/common/ModulePlaceholder'

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
  if (userRole === ROLES.COACH) return <Navigate to={`/coach/athletes/${id}`} replace />
  return <Navigate to={ROLE_DASHBOARDS[userRole]} replace />
}

function Placeholder({ title }) {
  return <ModulePlaceholder title={title} />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/dashboard" element={<RoleDashboardRedirect />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/athletes" element={<LegacyAthletesRedirect />} />
        <Route path="/athletes/:id" element={<LegacyAthleteProfileRedirect />} />

        <Route element={<RoleRoute allowedRoles={[ROLES.ATHLETE]} />}>
          <Route path="/athlete/dashboard" element={<AthleteDashboard />} />
          <Route path="/athlete/profile" element={<AthleteProfile />} />
          <Route path="/athlete/injury-history" element={<InjuryHistory />} />
          <Route path="/athlete/risk-assessments" element={<Placeholder title="Risk Assessments" />} />
          <Route path="/athlete/performance" element={<Placeholder title="Performance" />} />
          <Route path="/athlete/video-analysis" element={<Placeholder title="Video Analysis" />} />
          <Route path="/athlete/recommendations" element={<Placeholder title="Recommendations" />} />
          <Route path="/athlete/reports" element={<Placeholder title="Reports" />} />
          <Route path="/injury-history" element={<InjuryHistory />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={[ROLES.COACH]} />}>
          <Route path="/coach/dashboard" element={<CoachDashboard />} />
          <Route path="/coach/athletes" element={<Athletes />} />
          <Route path="/coach/athletes/:id" element={<CoachAthleteProfile />} />
          <Route path="/coach/injury-monitoring" element={<InjuryHistory />} />
          <Route path="/coach/injury-history" element={<InjuryHistory />} />
          <Route path="/coach/risk-assessments" element={<Placeholder title="Risk Assessments" />} />
          <Route path="/coach/performance" element={<Placeholder title="Performance" />} />
          <Route path="/coach/video-analysis" element={<Placeholder title="Video Analysis" />} />
          <Route path="/coach/risk-alerts" element={<Placeholder title="Risk Alerts" />} />
          <Route path="/coach/reports" element={<Placeholder title="Reports" />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={[ROLES.PHYSIOTHERAPIST]} />}>
          <Route path="/physiotherapist/dashboard" element={<Placeholder title="Physiotherapist Dashboard" />} />
          <Route path="/physiotherapist/athletes" element={<Placeholder title="Assigned Athletes" />} />
          <Route path="/physiotherapist/injury-management" element={<InjuryHistory />} />
          <Route path="/physiotherapist/injury-history" element={<InjuryHistory />} />
          <Route path="/physiotherapist/recovery" element={<Placeholder title="Recovery & Rehabilitation" />} />
          <Route path="/physiotherapist/risk-assessments" element={<Placeholder title="Risk Assessments" />} />
          <Route path="/physiotherapist/video-analysis" element={<Placeholder title="Video Analysis" />} />
          <Route path="/physiotherapist/recommendations" element={<Placeholder title="Recommendations" />} />
          <Route path="/physiotherapist/reports" element={<Placeholder title="Reports" />} />
        </Route>

        <Route element={<RoleRoute allowedRoles={[ROLES.ADMIN]} />}>
          <Route path="/admin/dashboard" element={<Placeholder title="Admin Dashboard" />} />
          <Route path="/admin/analytics" element={<Placeholder title="Organization Analytics" />} />
          <Route path="/admin/users" element={<Placeholder title="User Management" />} />
          <Route path="/admin/athletes" element={<Placeholder title="Athlete Management" />} />
          <Route path="/admin/injury-history" element={<InjuryHistory />} />
          <Route path="/admin/athletes/add" element={<AddAthlete />} />
          <Route path="/admin/athletes/:id/edit" element={<EditAthlete />} />
          <Route path="/admin/coaches" element={<Placeholder title="Coach Management" />} />
          <Route path="/admin/physiotherapists" element={<Placeholder title="Physiotherapist Management" />} />
          <Route path="/admin/teams" element={<Placeholder title="Teams / Groups" />} />
          <Route path="/admin/reports" element={<Placeholder title="Reports" />} />
          <Route path="/admin/access-permissions" element={<Placeholder title="Access & Permissions" />} />
          <Route path="/admin/organization-settings" element={<Placeholder title="Organization Settings" />} />
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
