import { Navigate, Route, Routes } from 'react-router-dom'
import { PageContainer } from '../components/layout/PageContainer'
import { useAuth } from '../context/AuthContext'
import type { Role } from '../types/user'
import { ForgotPassword } from '../pages/ForgotPassword'
import { Landing } from '../pages/Landing'
import { Login } from '../pages/Login'
import { Register } from '../pages/Register'
import { Dashboard as AthleteDashboard } from '../pages/athlete/Dashboard'
import { Onboarding } from '../pages/athlete/Onboarding'
import { Profile } from '../pages/athlete/Profile'
import { NewAnalysis } from '../pages/athlete/NewAnalysis'
import { AnalysisProcessing } from '../pages/athlete/AnalysisProcessing'
import { AnalysisResult } from '../pages/athlete/AnalysisResult'
import { Analyses } from '../pages/athlete/Analyses'
import { Progress } from '../pages/athlete/Progress'
import { Coaches } from '../pages/athlete/Coaches'
import { Reports as AthleteReports } from '../pages/athlete/Reports'
import { Dashboard as CoachDashboard } from '../pages/coach/Dashboard'
import { Profile as CoachProfilePage } from '../pages/coach/Profile'
import { Athletes as CoachAthletes } from '../pages/coach/Athletes'
import { AthleteProfile } from '../pages/coach/AthleteProfile'
import { Invitations } from '../pages/coach/Invitations'
import { RiskMonitoring } from '../pages/coach/RiskMonitoring'
import { Reports as CoachReports } from '../pages/coach/Reports'
import { Dashboard as AdminDashboard } from '../pages/admin/Dashboard'
import { Users } from '../pages/admin/Users'
import { Athletes as AdminAthletes } from '../pages/admin/Athletes'
import { Coaches as AdminCoaches } from '../pages/admin/Coaches'
import { Dataset } from '../pages/admin/Dataset'
import { Models } from '../pages/admin/Models'
import { SystemHealth } from '../pages/admin/SystemHealth'
import { AuditLogs } from '../pages/admin/AuditLogs'
import { Settings } from '../pages/Settings'

function Protected({ role }: { role: Role }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.role !== role) return <Navigate to={`/${user.role}/dashboard`} replace />
  return <PageContainer />
}

export function AppRoutes() {
  return <Routes>
    <Route path="/" element={<Landing />} />
    <Route path="/login" element={<Login />} />
    <Route path="/register" element={<Register />} />
    <Route path="/forgot-password" element={<ForgotPassword />} />
    <Route element={<Protected role="athlete" />}>
      <Route path="/athlete/dashboard" element={<AthleteDashboard />} />
      <Route path="/athlete/onboarding" element={<Onboarding />} />
      <Route path="/athlete/profile" element={<Profile />} />
      <Route path="/athlete/analysis/new" element={<NewAnalysis />} />
      <Route path="/athlete/analysis/processing" element={<AnalysisProcessing />} />
      <Route path="/athlete/analysis/:id" element={<AnalysisResult />} />
      <Route path="/athlete/analyses" element={<Analyses />} />
      <Route path="/athlete/progress" element={<Progress />} />
      <Route path="/athlete/coaches" element={<Coaches />} />
      <Route path="/athlete/reports" element={<AthleteReports />} />
      <Route path="/athlete/settings" element={<Settings />} />
    </Route>
    <Route element={<Protected role="coach" />}>
      <Route path="/coach/dashboard" element={<CoachDashboard />} />
      <Route path="/coach/profile" element={<CoachProfilePage />} />
      <Route path="/coach/athletes" element={<CoachAthletes />} />
      <Route path="/coach/athletes/:id" element={<AthleteProfile />} />
      <Route path="/coach/invitations" element={<Invitations />} />
      <Route path="/coach/risk-monitoring" element={<RiskMonitoring />} />
      <Route path="/coach/reports" element={<CoachReports />} />
      <Route path="/coach/settings" element={<Settings />} />
    </Route>
    <Route element={<Protected role="admin" />}>
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/users" element={<Users />} />
      <Route path="/admin/athletes" element={<AdminAthletes />} />
      <Route path="/admin/coaches" element={<AdminCoaches />} />
      <Route path="/admin/dataset" element={<Dataset />} />
      <Route path="/admin/models" element={<Models />} />
      <Route path="/admin/system" element={<SystemHealth />} />
      <Route path="/admin/audit-logs" element={<AuditLogs />} />
      <Route path="/admin/settings" element={<Settings />} />
    </Route>
    <Route path="*" element={<Navigate to="/" />} />
  </Routes>
}
