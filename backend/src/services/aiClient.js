/**
 * AI Service HTTP Client
 * Dispatches video analysis and risk prediction requests to the Python AI microservice (port 8000).
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

class AIClient {
  constructor(baseUrl = AI_SERVICE_URL) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async checkHealth() {
    try {
      const res = await fetch(`${this.baseUrl}/health`);
      if (!res.ok) return { online: false, status: res.status };
      const data = await res.json();
      return { online: true, ...data };
    } catch (err) {
      return { online: false, error: err.message };
    }
  }

  async getModelMetrics() {
    try {
      const res = await fetch(`${this.baseUrl}/api/ai/models/metrics`);
      if (!res.ok) throw new Error(`AI Service returned ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error('Error fetching AI model metrics:', err.message);
      return null;
    }
  }

  async analyzeVideoByPath(videoPath, athleteProfile = {}, workloadData = {}) {
    const url = `${this.baseUrl}/api/ai/analyze-path`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_path: videoPath,
        athlete_profile: athleteProfile,
        workload_data: workloadData,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`AI Service analysis failed (${res.status}): ${errBody}`);
    }

    return await res.json();
  }

  async predictRisk(kinematics = {}, athleteProfile = {}, workloadData = {}) {
    const url = `${this.baseUrl}/api/ai/predict-risk`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kinematics,
        athlete_profile: athleteProfile,
        workload_data: workloadData,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`AI Service risk prediction failed (${res.status}): ${errBody}`);
    }

    return await res.json();
  }
}

module.exports = new AIClient();
