const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function getAuthHeader() {
  const token = localStorage.getItem('sports-injury-token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const videoApi = {
  /**
   * Upload video file to backend
   */
  uploadVideo: async (file, metadata = {}) => {
    const formData = new FormData();
    formData.append('video', file);
    if (metadata.activity) formData.append('activity', metadata.activity);
    if (metadata.athleteId) formData.append('athleteId', metadata.athleteId);
    if (metadata.sport) formData.append('sport', metadata.sport);

    const res = await fetch(`${API_BASE_URL}/videos/upload`, {
      method: 'POST',
      headers: {
        ...getAuthHeader(),
      },
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Upload failed with HTTP ${res.status}`);
    }
    return data;
  },

  /**
   * Trigger AI pipeline on uploaded video
   */
  analyzeVideo: async (videoId, workloadOptions = {}) => {
    const res = await fetch(`${API_BASE_URL}/videos/${videoId}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(workloadOptions),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Analysis failed with HTTP ${res.status}`);
    }
    return data;
  },

  /**
   * Fetch saved analysis results for a video
   */
  getVideoAnalysis: async (videoId) => {
    const res = await fetch(`${API_BASE_URL}/videos/${videoId}/analysis`, {
      headers: {
        ...getAuthHeader(),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Failed to fetch analysis: HTTP ${res.status}`);
    }
    return data;
  },

  /**
   * Fetch historical analyses for an athlete
   */
  getAthleteAnalyses: async (athleteId) => {
    const res = await fetch(`${API_BASE_URL}/videos/athlete/${athleteId}`, {
      headers: {
        ...getAuthHeader(),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.message || `Failed to fetch athlete history: HTTP ${res.status}`);
    }
    return data;
  },

  /**
   * Check status of AI Microservice and model metrics
   */
  getAIStatus: async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/ai/status`);
      return await res.json();
    } catch {
      return { aiMicroservice: { online: false } };
    }
  },
};
