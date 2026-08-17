import React, { useState, useEffect, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { getAuthHeader } from "../services/authService";

const API_BASE_URL = "http://127.0.0.1:8000/api/v1";

export default function AthleteProfilePage() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [profileData, setProfileData] = useState({
    phone: "",
    sport: "",
    position: "",
    age: "",
    height: "",
    weight: "",
    training_load: "",
    flexibility: "",
    strength: "",
    balance: "",
    endurance: "",
    coach_notes: "",
    riskScore: 0,
    riskStatus: "Low Risk",
    lastAssessment: "",
  });

  // Fetch profile specifically for the currently logged-in user token
  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/athletes/me`, {
        headers: getAuthHeader(),
      });
      setProfileData(res.data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await axios.put(`${API_BASE_URL}/athletes/me`, profileData, {
        headers: getAuthHeader(),
      });
      setProfileData(res.data);
      setIsEditing(false);
    } catch (err) {
      console.error("Failed to update profile:", err);
      alert("Failed to save profile changes.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "2rem", color: "#fff", textAlign: "center" }}>
        Loading profile...
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h2 style={{ margin: 0, color: "#f8fafc" }}>Athlete Profile</h2>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={() => setIsEditing(true)} style={styles.editBtn}>
            ✏️ Edit Profile
          </button>
          <button
            onClick={() => {
              logout();
              navigate("/login");
            }}
            style={styles.logoutBtn}
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Profile Card */}
        <div style={styles.card}>
          <div style={{ textAlign: "center", marginBottom: "1rem" }}>
            <div style={styles.avatar}>👤</div>
            {/* Display logged-in user name dynamically */}
            <h3 style={{ margin: "0.5rem 0 0.2rem 0" }}>
              {user?.name || "Athlete User"}
            </h3>
            <span style={styles.roleBadge}>
              {(user?.role || "ATHLETE").toUpperCase()}
            </span>
          </div>

          <div style={styles.infoGrid}>
            <div>
              <strong>Sport:</strong> {profileData.sport || "N/A"}
            </div>
            <div>
              <strong>Position:</strong> {profileData.position || "N/A"}
            </div>
            <div>
              <strong>Age:</strong>{" "}
              {profileData.age ? `${profileData.age} yrs` : "N/A"}
            </div>
            <div>
              <strong>Phone:</strong> {profileData.phone || "N/A"}
            </div>
            <div>
              <strong>Height:</strong>{" "}
              {profileData.height ? `${profileData.height} cm` : "N/A"}
            </div>
            <div>
              <strong>Weight:</strong>{" "}
              {profileData.weight ? `${profileData.weight} kg` : "N/A"}
            </div>
            <div>
              <strong>Last Assessment:</strong>{" "}
              {profileData.lastAssessment || "N/A"}
            </div>
          </div>

          <hr style={{ borderColor: "#334155", margin: "1.2rem 0" }} />

          <h4 style={{ color: "#38bdf8", marginBottom: "0.8rem" }}>
            Physical & Biomechanical Metrics
          </h4>
          <div style={styles.infoGrid}>
            <div>
              <strong>Training Load:</strong> {profileData.training_load || 0}
            </div>
            <div>
              <strong>Flexibility:</strong> {profileData.flexibility || 0}%
            </div>
            <div>
              <strong>Strength:</strong> {profileData.strength || 0}%
            </div>
            <div>
              <strong>Balance:</strong> {profileData.balance || 0}%
            </div>
            <div>
              <strong>Endurance:</strong> {profileData.endurance || 0}%
            </div>
          </div>

          {profileData.coach_notes && (
            <div
              style={{
                marginTop: "1rem",
                backgroundColor: "#0f172a",
                padding: "0.75rem",
                borderRadius: "6px",
              }}
            >
              <strong style={{ color: "#f59e0b", fontSize: "0.85rem" }}>
                Coach Notes:
              </strong>
              <p
                style={{
                  margin: "0.2rem 0 0 0",
                  fontSize: "0.85rem",
                  color: "#cbd5e1",
                }}
              >
                {profileData.coach_notes}
              </p>
            </div>
          )}
        </div>

        {/* Injury Risk Status */}
        <div style={styles.card}>
          <h3 style={{ marginTop: 0 }}>Injury Risk Status</h3>
          <div style={styles.riskBadge}>
            <span
              style={{
                fontSize: "2.5rem",
                fontWeight: "bold",
                color: "#f59e0b",
              }}
            >
              {profileData.riskScore || 0}%
            </span>
            <p style={{ margin: "0.5rem 0 0 0", fontWeight: "bold" }}>
              {profileData.riskStatus || "Low Risk"}
            </p>
          </div>

          <div style={{ marginTop: "1.5rem" }}>
            <button
              style={styles.actionBtn}
              onClick={() => navigate("/upload")}
            >
              📹 Upload Video for Biomechanical Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <h3 style={{ color: "#38bdf8", marginTop: 0 }}>
              Update Profile Details
            </h3>
            <form onSubmit={handleSave} style={styles.formGrid}>
              <div style={styles.field}>
                <label style={styles.label}>Phone Number:</label>
                <input
                  type="text"
                  name="phone"
                  value={profileData.phone || ""}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Sport:</label>
                <input
                  type="text"
                  name="sport"
                  value={profileData.sport || ""}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Position:</label>
                <input
                  type="text"
                  name="position"
                  value={profileData.position || ""}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Age:</label>
                <input
                  type="number"
                  name="age"
                  value={profileData.age || ""}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Height (cm):</label>
                <input
                  type="number"
                  step="0.1"
                  name="height"
                  value={profileData.height || ""}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Weight (kg):</label>
                <input
                  type="number"
                  step="0.1"
                  name="weight"
                  value={profileData.weight || ""}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Training Load:</label>
                <input
                  type="number"
                  step="0.1"
                  name="training_load"
                  value={profileData.training_load || ""}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Flexibility (%):</label>
                <input
                  type="number"
                  step="0.1"
                  name="flexibility"
                  value={profileData.flexibility || ""}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Strength (%):</label>
                <input
                  type="number"
                  step="0.1"
                  name="strength"
                  value={profileData.strength || ""}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Balance (%):</label>
                <input
                  type="number"
                  step="0.1"
                  name="balance"
                  value={profileData.balance || ""}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>
              <div style={styles.field}>
                <label style={styles.label}>Endurance (%):</label>
                <input
                  type="number"
                  step="0.1"
                  name="endurance"
                  value={profileData.endurance || ""}
                  onChange={handleInputChange}
                  style={styles.input}
                />
              </div>

              <div
                style={{
                  gridColumn: "span 2",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "1rem",
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  style={styles.cancelBtn}
                >
                  Cancel
                </button>
                <button type="submit" disabled={saving} style={styles.saveBtn}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    padding: "2rem",
    minHeight: "100vh",
    backgroundColor: "#0f172a",
    color: "#f8fafc",
    fontFamily: "sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #334155",
    paddingBottom: "1rem",
    marginBottom: "2rem",
  },
  editBtn: {
    backgroundColor: "#0284c7",
    color: "#fff",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  logoutBtn: {
    backgroundColor: "#ef4444",
    color: "#fff",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "6px",
    cursor: "pointer",
  },
  content: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "1.5rem",
  },
  card: {
    backgroundColor: "#1e293b",
    padding: "1.5rem",
    borderRadius: "12px",
    border: "1px solid #334155",
  },
  avatar: { fontSize: "3rem", textAlign: "center" },
  roleBadge: {
    display: "inline-block",
    backgroundColor: "#0284c7",
    color: "#fff",
    padding: "0.2rem 0.6rem",
    borderRadius: "12px",
    fontSize: "0.75rem",
  },
  infoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "0.75rem",
    fontSize: "0.9rem",
    color: "#cbd5e1",
  },
  riskBadge: {
    textAlign: "center",
    padding: "1.5rem",
    backgroundColor: "#0f172a",
    borderRadius: "8px",
    margin: "1rem 0",
  },
  actionBtn: {
    width: "100%",
    padding: "0.8rem",
    backgroundColor: "#10b981",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.75)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalCard: {
    backgroundColor: "#1e293b",
    padding: "2rem",
    borderRadius: "12px",
    width: "90%",
    maxWidth: "600px",
    maxHeight: "90vh",
    overflowY: "auto",
    border: "1px solid #334155",
  },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" },
  field: { display: "flex", flexDirection: "column" },
  label: { fontSize: "0.8rem", color: "#cbd5e1", marginBottom: "0.3rem" },
  input: {
    padding: "0.5rem",
    borderRadius: "6px",
    border: "1px solid #334155",
    backgroundColor: "#0f172a",
    color: "#fff",
  },
  cancelBtn: {
    padding: "0.6rem 1.2rem",
    backgroundColor: "#475569",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  saveBtn: {
    padding: "0.6rem 1.2rem",
    backgroundColor: "#10b981",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
