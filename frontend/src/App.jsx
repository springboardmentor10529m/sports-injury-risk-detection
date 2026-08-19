import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'

import Athletes from './pages/Athletes'
import AddAthlete from './pages/AddAthlete'
import AthleteProfile from './pages/AthleteProfile'
import EditAthlete from './pages/EditAthlete'

import InjuryHistory from './pages/InjuryHistory'
import Settings from './pages/Settings'

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* ==============================
            HOME
        ============================== */}

        <Route
          path="/"
          element={<Home />}
        />


        {/* ==============================
            AUTHENTICATION
        ============================== */}

        <Route
          path="/login"
          element={<Login />}
        />

        <Route
          path="/register"
          element={<Register />}
        />


        {/* ==============================
            DASHBOARD
        ============================== */}

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />


        {/* ==============================
            ATHLETES
        ============================== */}

        <Route
          path="/athletes"
          element={<Athletes />}
        />

        <Route
          path="/athletes/add"
          element={<AddAthlete />}
        />

        <Route
          path="/athletes/:id"
          element={<AthleteProfile />}
        />

        <Route
          path="/athletes/:id/edit"
          element={<EditAthlete />}
        />


        {/* ==============================
            INJURY HISTORY
        ============================== */}

        <Route
          path="/injury-history"
          element={<InjuryHistory />}
        />


        {/* ==============================
            SETTINGS
        ============================== */}

        <Route
          path="/settings"
          element={<Settings />}
        />

      </Routes>

    </BrowserRouter>
  )
}

export default App