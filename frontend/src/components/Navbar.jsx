import { NavLink, Link, useNavigate } from "react-router-dom";
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

                <span>AthleSense</span>
            </Link>

            <nav className="nav-links">
                {!user ? (
                    <>
                        <NavLink
                            to="/"
                            end
                            className={({ isActive }) =>
                                `nav-link ${isActive ? "active" : ""}`
                            }
                        >
                            Home
                        </NavLink>
                        <NavLink
                            to="/login"
                            className={({ isActive }) =>
                                `nav-link ${isActive ? "active" : ""}`
                            }
                        >
                            Login
                        </NavLink>
                        <NavLink
                            to="/register"
                            className={({ isActive }) =>
                                `nav-button ${isActive ? "active" : ""}`
                            }
                        >
                            Get Started
                        </NavLink>
                    </>
                ) : (
                    <>
                        <NavLink
                            to="/"
                            end
                            className={({ isActive }) =>
                                `nav-link ${isActive ? "active" : ""}`
                            }
                        >
                            Home
                        </NavLink>
                        <NavLink
                            to="/dashboard"
                            className={({ isActive }) =>
                                `nav-link ${isActive ? "active" : ""}`
                            }
                        >
                            Dashboard
                        </NavLink>
                        <NavLink
                            to="/profile"
                            className={({ isActive }) =>
                                `nav-link ${isActive ? "active" : ""}`
                            }
                        >
                            Profile
                        </NavLink>

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