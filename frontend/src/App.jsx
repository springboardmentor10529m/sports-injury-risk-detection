import {
  BrowserRouter,
  Routes,
  Route,
  Navigate
} from "react-router-dom";

import Dashboard from "./pages/dashboards/Dashboard";
import UploadVideo from "./pages/UploadVideo";


function App() {

  return (
    <BrowserRouter>

      <Routes>

        {/* Default */}
        <Route
          path="/"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

        {/* Dashboard */}
        <Route
          path="/dashboard"
          element={
            <Dashboard
              role="athlete"
            />
          }
        />

        {/* Upload Video */}
        <Route
          path="/upload"
          element={
            <UploadVideo />
          }
        />

        {/* Unknown page */}
        <Route
          path="*"
          element={
            <Navigate
              to="/dashboard"
              replace
            />
          }
        />

      </Routes>

    </BrowserRouter>
  );
}


export default App;