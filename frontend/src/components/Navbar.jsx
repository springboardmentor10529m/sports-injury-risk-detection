import { Link, useNavigate } from "react-router-dom";
import { Activity, LogOut } from "lucide-react";

import { useAuth } from "../context/AuthContext";

function Navbar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    function handleLogout() {
        logout();
        navigate("/login");
    }

    return (
        <header className="navbar">
            <Link to="/" className="brand">
                <div className="brand-icon">
                    <Activity size={22} />
                </div>

                <span>Sports Injury Risk Detection from Video</span>
            </Link>

            <nav className="nav-links">
                {!user ? (
                    <>
                        <Link to="/">Home</Link>
                        <Link to="/login">Login</Link>
                        <Link to="/register" className="nav-button">
                            Get Started
                        </Link>
                    </>
                ) : (
                    <>
                        <Link to="/dashboard">Dashboard</Link>
                        <Link to="/profile">Profile</Link>

                        <button
                            className="logout-button"
                            onClick={handleLogout}
                        >
                            <LogOut size={16} />
                            Logout
                        </button>
                    </>
                )}
            </nav>
        </header>
    );
}

export default Navbar;