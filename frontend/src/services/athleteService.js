import api from "./api";

// Fetch logged-in athlete profile
export const getMyProfile = async () => {
  const response = await api.get("/athletes/me");
  return response.data;
};

// Update athlete profile details
export const updateMyProfile = async (profileData) => {
  const response = await api.put("/athletes/me", profileData);
  return response.data;
};

// Fetch video upload history for logged-in user
export const getVideoHistory = async () => {
  const response = await api.get("/videos/history");
  return response.data;
};

// Fetch single assessment details
export const getAssessmentDetails = async (videoId) => {
  const response = await api.get(`/videos/assessment/${videoId}`);
  return response.data;
};

// Upload single video for biomechanical analysis
export const uploadVideoForAnalysis = async (file) => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await api.post("/videos/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Upload multiple / batch videos for multi-angle biomechanical analysis
export const uploadBatchVideosForAnalysis = async (files) => {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i]);
  }

  const response = await api.post("/videos/upload-batch", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return response.data;
};

// Delete video record
export const deleteVideoAnalysis = async (videoId) => {
  const response = await api.delete(`/videos/${videoId}`);
  return response.data;
};

// Fetch all registered athletes for Coach dashboard
export const getAllAthletes = async () => {
  try {
    const response = await api.get("/athletes/all");
    return response.data || [];
  } catch (err) {
    console.error("Failed to load squad athletes from backend:", err);
    return [];
  }
};

// Update coach notes / observations for a specific athlete
export const updateAthleteCoachNotes = async (athleteId, coachNotes) => {
  const response = await api.put(`/athletes/${athleteId}/notes`, {
    coach_notes: coachNotes,
  });
  return response.data;
};

