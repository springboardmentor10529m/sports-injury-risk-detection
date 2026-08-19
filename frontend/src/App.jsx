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

// Strict Role-Based Protected Layout
const RoleProtectedLayout = ({ children, allowedRoles = [] }) => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const currentRole = (user?.role || "athlete").toLowerCase();

  // If user role is not allowed for this route, redirect to their home portal
  if (allowedRoles.length > 0 && !allowedRoles.includes(currentRole)) {
    if (currentRole === "coach") return <Navigate to="/coach-dashboard" replace />;
    if (currentRole === "physio") return <Navigate to="/physio-dashboard" replace />;
    return <Navigate to="/athlete-profile" replace />;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Landing Page */}
          <Route path="/" element={<LandingPage />} />

          {/* Public Authentication Routes */}
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />

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

          {/* Assessment Report Route */}
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
