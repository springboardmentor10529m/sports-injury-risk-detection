import { useState } from "react";

import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { updateAthlete } from "../api/athletes";

function Profile() {
    const { user } = useAuth();

    const [weight, setWeight] = useState(
        user?.weight_kg || ""
    );

    const [height, setHeight] = useState(
        user?.height_cm || ""
    );

    const [message, setMessage] = useState("");

    async function handleSave(event) {
        event.preventDefault();

        try {
            await updateAthlete(user.id, {
                weight_kg: Number(weight),
                height_cm: Number(height)
            });

            setMessage("Profile updated successfully.");
        } catch {
            setMessage(
                "Unable to update profile."
            );
        }
    }

    return (
        <div className="app-layout">
            <Sidebar />

            <main className="dashboard">
                <div className="page-header">
                    <div>
                        <span className="eyebrow">
                            ACCOUNT
                        </span>

                        <h1>Your Profile</h1>

                        <p>
                            Manage your personal and physical
                            information.
                        </p>
                    </div>
                </div>

                <section className="panel profile-panel">
                    <h2>Personal Information</h2>

                    <div className="profile-info">
                        <div>
                            <span>Name</span>
                            <strong>
                                {user?.full_name || "—"}
                            </strong>
                        </div>

                        <div>
                            <span>Email</span>
                            <strong>
                                {user?.email || "—"}
                            </strong>
                        </div>

                        <div>
                            <span>Role</span>
                            <strong>
                                {user?.role || "—"}
                            </strong>
                        </div>
                    </div>

                    <hr />

                    <h2>Physical Information</h2>

                    <form
                        className="profile-form"
                        onSubmit={handleSave}
                    >
                        <div>
                            <label>Height (cm)</label>

                            <input
                                type="number"
                                value={height}
                                onChange={(e) =>
                                    setHeight(e.target.value)
                                }
                            />
                        </div>

                        <div>
                            <label>Weight (kg)</label>

                            <input
                                type="number"
                                value={weight}
                                onChange={(e) =>
                                    setWeight(e.target.value)
                                }
                            />
                        </div>

                        <button className="primary-button">
                            Save Changes
                        </button>
                    </form>

                    {message && (
                        <div className="success-box">
                            {message}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default Profile;