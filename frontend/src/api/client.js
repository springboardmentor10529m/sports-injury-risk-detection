import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "/" : "http://127.0.0.1:8001");

export const api = axios.create({ baseURL: API_BASE_URL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("injuryguard_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (Array.isArray(error.response?.data?.detail)) {
      error.response.data.detail = error.response.data.detail.map((item) => item.msg).join("; ");
    }
    if (error.response?.status === 401) {
      localStorage.removeItem("injuryguard_token");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// ---- Auth ----
export const registerAthlete = (payload) => api.post("/api/auth/register", payload);
export const registerCoach = (payload) => api.post("/api/auth/register/coach", payload);
export const registerPhysio = (payload) => api.post("/api/auth/register/physiotherapist", payload);
export const registerScientist = (payload) => api.post("/api/auth/register/sports-scientist", payload);
export const login = (email, password) => api.post("/api/auth/login-json", { email, password });
export const getMe = () => api.get("/api/auth/me");

// ---- Athlete profile ----
export const getProfile = () => api.get("/api/athlete/profile");
export const updateProfile = (payload) => api.patch("/api/athlete/profile", payload);

// ---- Videos / pipeline ----
export const uploadVideo = (file, activityType, onUploadProgress) => {
  const form = new FormData();
  form.append("file", file);
  form.append("activity_type", activityType);
  return api.post("/api/videos/upload", form, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress,
    timeout: 180000,
  });
};
export const getUploadLimits = () => api.get("/api/videos/limits");
export const listVideos = () => api.get("/api/videos");
export const getVideo = (id) => api.get(`/api/videos/${id}`);
export const getPoseFrames = (id) => api.get(`/api/videos/${id}/pose-frames`);

// ---- Analysis / dashboard ----
export const getDashboardSummary = () => api.get("/api/analysis/dashboard-summary");
export const getRiskHistory = () => api.get("/api/analysis/risk-history");

// ---- Coach ----
export const getCoachTeam = () => api.get("/api/coach/team");
export const getCoachTeamSummary = () => api.get("/api/coach/team/summary");
export const addCoachAthlete = (athlete_email) => api.post("/api/coach/team/add", { athlete_email });
export const removeCoachAthlete = (athleteId) => api.delete(`/api/coach/team/${athleteId}`);
export const getCoachAthleteProfile = (athleteId) => api.get(`/api/coach/athletes/${athleteId}`);
export const getCoachAthleteVideos = (athleteId) => api.get(`/api/coach/athletes/${athleteId}/videos`);
export const getCoachAthletePoseFrames = (athleteId, videoId) => api.get(`/api/coach/athletes/${athleteId}/videos/${videoId}/pose-frames`);

// ---- Physiotherapist ----
export const getPhysioPatients = () => api.get("/api/physio/patients");
export const addPhysioPatient = (athlete_email) => api.post("/api/physio/patients/add", { athlete_email });
export const removePhysioPatient = (athleteId) => api.delete(`/api/physio/patients/${athleteId}`);
export const getPhysioPatientProfile = (athleteId) => api.get(`/api/physio/patients/${athleteId}`);
export const getPhysioPatientVideos = (athleteId) => api.get(`/api/physio/patients/${athleteId}/videos`);
export const getPhysioPatientPoseFrames = (athleteId, videoId) => api.get(`/api/physio/patients/${athleteId}/videos/${videoId}/pose-frames`);
export const getPhysioNotes = (athleteId) => api.get(`/api/physio/patients/${athleteId}/notes`);
export const addPhysioNote = (athleteId, phase, note) =>
  api.post(`/api/physio/patients/${athleteId}/notes`, { phase, note });

// ---- Sports Scientist ----
export const getScientistAthletes = () => api.get("/api/scientist/athletes");
export const addScientistAthlete = (athlete_email) => api.post("/api/scientist/athletes/add", { athlete_email });
export const getScientistAthleteProfile = (athleteId) => api.get(`/api/scientist/athletes/${athleteId}`);
export const getScientistAthleteVideos = (athleteId) => api.get(`/api/scientist/athletes/${athleteId}/videos`);
export const getScientistAthletePoseFrames = (athleteId, videoId) => api.get(`/api/scientist/athletes/${athleteId}/videos/${videoId}/pose-frames`);

// ---- Notifications ----
export const getNotifications = () => api.get("/api/notifications");
export const markNotificationRead = (id) => api.post(`/api/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.post("/api/notifications/read-all");
export const getScientistAnalytics = () => api.get("/api/scientist/analytics");

// ---- Admin ----
export const getAdminStats = () => api.get("/api/admin/stats");
export const getAdminUsers = () => api.get("/api/admin/users");
export const updateAdminUser = (userId, payload) => api.patch(`/api/admin/users/${userId}`, payload);
export const deleteAdminUser = (userId) => api.delete(`/api/admin/users/${userId}`);
export const createAdminUser = (payload) => api.post("/api/admin/users", payload);
