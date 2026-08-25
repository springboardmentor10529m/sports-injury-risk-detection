import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const ROLE_HOME = {
  athlete: "/dashboard",
  coach: "/coach/dashboard",
  physiotherapist: "/physio/dashboard",
  sports_scientist: "/scientist/dashboard",
  admin: "/admin/dashboard",
};

export default function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={ROLE_HOME[user.role] || "/dashboard"} replace />;
}
