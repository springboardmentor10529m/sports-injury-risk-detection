import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";

import Login from "./pages/Login";
import SelectRole from "./pages/SelectRole";
import Register from "./pages/Register";
import StaffRegister from "./pages/StaffRegister";
import Home from "./pages/Home";

import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import Result from "./pages/Result";
import History from "./pages/History";
import Profile from "./pages/Profile";

import CoachDashboard from "./pages/CoachDashboard";
import CoachTeam from "./pages/CoachTeam";
import CoachAthleteDetail from "./pages/CoachAthleteDetail";

import PhysioDashboard from "./pages/PhysioDashboard";
import PhysioPatients from "./pages/PhysioPatients";
import PhysioPatientDetail from "./pages/PhysioPatientDetail";

import ScientistDashboard from "./pages/ScientistDashboard";
import ScientistAthletes from "./pages/ScientistAthletes";
import ScientistAthleteDetail from "./pages/ScientistAthleteDetail";

import AdminDashboard from "./pages/AdminDashboard";
import AdminUsers from "./pages/AdminUsers";

function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <p style={{ color: "var(--text-dim)", padding: 40 }}>Loading...</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/home" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/select-role" element={<SelectRole />} />
      <Route path="/register" element={<Register />} />
      <Route path="/register/coach" element={<StaffRegister role="coach" />} />
      <Route path="/register/physiotherapist" element={<StaffRegister role="physiotherapist" />} />
      <Route path="/register/sports-scientist" element={<StaffRegister role="sports-scientist" />} />
      <Route path="/home" element={<Home />} />

      <Route element={<ProtectedRoute roles={["athlete"]}><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/analyze" element={<Analyze />} />
        <Route path="/analysis/:id" element={<Result />} />
        <Route path="/history" element={<History />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route element={<ProtectedRoute roles={["coach"]}><Layout /></ProtectedRoute>}>
        <Route path="/coach/dashboard" element={<CoachDashboard />} />
        <Route path="/coach/team" element={<CoachTeam />} />
        <Route path="/coach/athletes/:id" element={<CoachAthleteDetail />} />
      </Route>

      <Route element={<ProtectedRoute roles={["physiotherapist"]}><Layout /></ProtectedRoute>}>
        <Route path="/physio/dashboard" element={<PhysioDashboard />} />
        <Route path="/physio/patients" element={<PhysioPatients />} />
        <Route path="/physio/patients/:id" element={<PhysioPatientDetail />} />
      </Route>

      <Route element={<ProtectedRoute roles={["sports_scientist"]}><Layout /></ProtectedRoute>}>
        <Route path="/scientist/dashboard" element={<ScientistDashboard />} />
        <Route path="/scientist/athletes" element={<ScientistAthletes />} />
        <Route path="/scientist/athletes/:id" element={<ScientistAthleteDetail />} />
      </Route>

      <Route element={<ProtectedRoute roles={["admin"]}><Layout /></ProtectedRoute>}>
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
      </Route>

      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
}
