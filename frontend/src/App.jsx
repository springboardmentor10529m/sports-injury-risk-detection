import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import VideoAnalysis from './pages/VideoAnalysis';
import Profile from './pages/Profile';
import InjuryHistory from './pages/InjuryHistory';
import RiskAssessments from './pages/RiskAssessments';
import Performance from './pages/Performance';
import Recommendations from './pages/Recommendations';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  const token = localStorage.getItem('token');

  return (
    <Router>
      <Routes>
        {/* Public Authentication Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Primary Athlete Biomechanics Routes */}
        <Route 
          path="/athlete/video-analysis" 
          element={
            <ProtectedRoute>
              <VideoAnalysis />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/upload" 
          element={
            <ProtectedRoute>
              <VideoAnalysis />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/athlete/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/athlete/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/athlete/injury-history" 
          element={
            <ProtectedRoute>
              <InjuryHistory />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/athlete/risk-assessments" 
          element={
            <ProtectedRoute>
              <RiskAssessments />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/athlete/performance" 
          element={
            <ProtectedRoute>
              <Performance />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/athlete/recommendations" 
          element={
            <ProtectedRoute>
              <Recommendations />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/athlete/reports" 
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/athlete/settings" 
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } 
        />

        {/* Fallbacks */}
        <Route 
          path="/" 
          element={<Navigate to={token ? "/athlete/video-analysis" : "/login"} replace />} 
        />
        <Route 
          path="*" 
          element={<Navigate to="/athlete/video-analysis" replace />} 
        />
      </Routes>
    </Router>
  );
}

export default App;
