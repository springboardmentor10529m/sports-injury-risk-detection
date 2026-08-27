import React, { useContext } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import AthleteProfilePage from "./pages/AthleteProfilePage";
import VideoUploadPage from "./pages/VideoUploadPage";
import CoachDashboard from "./pages/CoachDashboard";
import PhysioDashboard from "./pages/PhysioDashboard";
import AnalysisReportPage from "./pages/AnalysisReportPage";

// Helper to get default home path for current role
const getRoleHome = (role) => {
  const r = (role || "athlete").toLowerCase();
  if (r === "coach") return "/coach-dashboard";
  if (r === "physio") return "/physio-dashboard";
  return "/athlete-profile";
};

// Strict Role-Based Protected Layout for Authenticated Pages
const RoleProtectedLayout = ({ children, allowedRoles = [] }) => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentRole = (user?.role || "athlete").toLowerCase();

  // If user role is not allowed for this route, redirect to their home portal
  if (allowedRoles.length > 0 && !allowedRoles.includes(currentRole)) {
    return <Navigate to={getRoleHome(currentRole)} replace />;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
};

// Public Route (If user is already logged in, redirect them directly to their role dashboard)
const PublicOnlyRoute = ({ children }) => {
  const { user } = useContext(AuthContext);

  if (user) {
    const currentRole = (user?.role || "athlete").toLowerCase();
    return <Navigate to={getRoleHome(currentRole)} replace />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Landing Page & Auth Routes (Redirect to Portal if already authenticated) */}
          <Route
            path="/"
            element={
              <PublicOnlyRoute>
                <LandingPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />

          {/* Athlete-Only Routes */}
          <Route
            path="/athlete-profile"
            element={
              <RoleProtectedLayout allowedRoles={["athlete"]}>
                <AthleteProfilePage />
              </RoleProtectedLayout>
            }
          />
          <Route
            path="/upload"
            element={
              <RoleProtectedLayout allowedRoles={["athlete"]}>
                <VideoUploadPage />
              </RoleProtectedLayout>
            }
          />

          {/* Coach-Only Routes */}
          <Route
            path="/coach-dashboard"
            element={
              <RoleProtectedLayout allowedRoles={["coach"]}>
                <CoachDashboard />
              </RoleProtectedLayout>
            }
          />

          {/* Physio-Only Routes */}
          <Route
            path="/physio-dashboard"
            element={
              <RoleProtectedLayout allowedRoles={["physio"]}>
                <PhysioDashboard />
              </RoleProtectedLayout>
            }
          />

          {/* Assessment Report Route (Available to Athlete, Coach, Physio) */}
          <Route
            path="/analysis-report"
            element={
              <RoleProtectedLayout allowedRoles={["athlete", "coach", "physio"]}>
                <AnalysisReportPage />
              </RoleProtectedLayout>
            }
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
