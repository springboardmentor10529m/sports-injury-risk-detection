import { getToken, setTokens, removeTokens, isTokenExpired } from './auth';
import {
  User,
  UserRole,
  TokenResponse,
  AthleteProfile,
  InjuryHistory,
  TrainingLoad,
  RiskScoreResponse,
  Recommendation,
  VideoSession,
  VideoUploadResponse,
  VideoStatusResponse,
  KeypointsResponse,
  KinematicsResponse,
  AnomalyAssessmentResponse,
} from './types';

/**
 * Resolve central API URL supporting Vite (import.meta.env) and Next.js / Node (process.env).
 */
const resolveApiBaseUrl = (): string => {
  let rawUrl = '';

  // 1. Vite environment
  if (typeof import.meta !== 'undefined' && (import.meta as any).env) {
    rawUrl = (import.meta as any).env.VITE_API_URL || '';
  }

  // 2. Next.js / Process environment
  if (!rawUrl && typeof process !== 'undefined' && process.env) {
    rawUrl = process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || '';
  }

  if (!rawUrl) {
    rawUrl = 'http://localhost:8000';
  }

  const cleanUrl = rawUrl.replace(/\/+$/, '');
  return cleanUrl.endsWith('/api/v1') ? cleanUrl : `${cleanUrl}/api/v1`;
};

export const API_BASE_URL = resolveApiBaseUrl();
export const API_URL = API_BASE_URL.replace(/\/api\/v1$/, '');
export default API_URL;

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export class ApiClient {
  private static isRefreshing = false;

  private static async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    let token = getToken();

    // Check token expiration & attempt refresh if needed
    if (token && isTokenExpired(token) && !this.isRefreshing && !endpoint.includes('/auth/')) {
      this.isRefreshing = true;
      try {
        const refreshed = await this.refreshToken();
        token = refreshed.access_token;
      } catch {
        removeTokens();
        if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
        throw new ApiError('Session expired. Please log in again.', 401);
      } finally {
        this.isRefreshing = false;
      }
    }

    const headers = new Headers(options.headers || {});
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    let response: Response;
    try {
      response = await fetch(url, { ...options, headers });
    } catch {
      throw new ApiError('Unable to connect to SafeMove server. Please verify the backend is running on http://localhost:8000.', 0);
    }

    if (response.status === 401 && !endpoint.includes('/auth/login')) {
      removeTokens();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      throw new ApiError('Unauthorized. Please log in.', 401);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let message = 'API request failed';
      if (typeof errorData.message === 'string') {
        message = errorData.message;
      } else if (typeof errorData.detail === 'string') {
        message = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        message = errorData.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
      } else if (response.status === 409) {
        message = 'An account with this email already exists.';
      } else if (response.status === 422) {
        message = 'Validation error: Please check all submitted form fields.';
      } else if (response.status === 500) {
        message = 'SafeMove server encountered an internal error.';
      } else if (response.status === 501) {
        message = 'This feature is under development (501 Not Implemented).';
      } else if (response.status === 403) {
        message = 'Access denied. You do not have permission for this action.';
      } else if (response.status === 404) {
        message = 'Resource not found.';
      }
      throw new ApiError(message, response.status, errorData);
    }

    // Return empty object for 204 or empty responses
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // --- Base HTTP Methods ---
  static get<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  static post<T>(endpoint: string, body?: any, options?: RequestInit) {
    const isFormData = body instanceof FormData;
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body),
    });
  }

  static put<T>(endpoint: string, body?: any, options?: RequestInit) {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  static delete<T>(endpoint: string, options?: RequestInit) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // --- Auth APIs ---
  static async login(email: string, password: string): Promise<TokenResponse> {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);

    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });
    } catch {
      throw new ApiError('Unable to connect to SafeMove server. Please verify the backend is running on http://localhost:8000.', 0);
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const message = err.detail || err.message || (res.status === 401 ? 'Incorrect email or password.' : 'Login failed. Please try again.');
      throw new ApiError(message, res.status, err);
    }

    const data: TokenResponse = await res.json();
    setTokens(data.access_token);
    return data;
  }

  static async register(userData: {
    email: string;
    password: string;
    full_name: string;
    role: UserRole;
  }): Promise<User> {
    return this.post<User>('/auth/register', userData);
  }

  static async refreshToken(): Promise<TokenResponse> {
    const token = getToken();
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      throw new ApiError('Unable to connect to SafeMove server to refresh session.', 0);
    }

    if (!res.ok) {
      throw new ApiError('Failed to refresh token', res.status);
    }
    const data: TokenResponse = await res.json();
    setTokens(data.access_token);
    return data;
  }

  // --- User APIs ---
  static async getMe(): Promise<User> {
    return this.get<User>('/users/me');
  }

  static async updateMe(updateData: { full_name?: string; email?: string }): Promise<User> {
    return this.put<User>('/users/me', updateData);
  }

  static async listUsers(skip = 0, limit = 50, role?: UserRole): Promise<User[]> {
    const query = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (role) query.append('role', role);
    return this.get<User[]>(`/users/?${query.toString()}`);
  }

  static async changeUserRole(userId: string, role: UserRole): Promise<User> {
    return this.put<User>(`/users/${userId}/role?role=${role}`);
  }

  // --- Athlete APIs ---
  static async listAthletes(skip = 0, limit = 50, teamId?: string): Promise<AthleteProfile[]> {
    const query = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (teamId) query.append('team_id', teamId);
    return this.get<AthleteProfile[]>(`/athletes/?${query.toString()}`);
  }

  static async createAthleteProfile(profileData: {
    user_id: string;
    sport: string;
    position?: string;
    height_cm?: number;
    weight_kg?: number;
    dominant_side?: string;
    date_of_birth?: string;
  }): Promise<AthleteProfile> {
    return this.post<AthleteProfile>('/athletes/profile', profileData);
  }

  static async getAthlete(athleteId: string): Promise<AthleteProfile> {
    return this.get<AthleteProfile>(`/athletes/${athleteId}`);
  }

  static async updateAthlete(athleteId: string, updateData: Partial<AthleteProfile>): Promise<AthleteProfile> {
    return this.put<AthleteProfile>(`/athletes/${athleteId}`, updateData);
  }

  static async getInjuryHistory(athleteId: string): Promise<InjuryHistory[]> {
    return this.get<InjuryHistory[]>(`/athletes/${athleteId}/injury-history`);
  }

  static async addInjuryRecord(
    athleteId: string,
    injuryData: Omit<InjuryHistory, 'id' | 'athlete_id'>
  ): Promise<InjuryHistory> {
    return this.post<InjuryHistory>(`/athletes/${athleteId}/injury-history`, injuryData);
  }

  static async getTrainingLoad(athleteId: string, limit = 50): Promise<TrainingLoad[]> {
    return this.get<TrainingLoad[]>(`/athletes/${athleteId}/training-load?limit=${limit}`);
  }

  static async logTrainingLoad(
    athleteId: string,
    loadData: Omit<TrainingLoad, 'id' | 'athlete_id'>
  ): Promise<TrainingLoad> {
    return this.post<TrainingLoad>(`/athletes/${athleteId}/training-load`, loadData);
  }

  // --- Video Ingestion & Retrieval APIs ---
  static async uploadVideo(formData: FormData): Promise<VideoUploadResponse> {
    return this.post<VideoUploadResponse>('/videos/upload', formData);
  }

  static async listVideos(athleteId?: string, skip = 0, limit = 50): Promise<VideoSession[]> {
    const query = new URLSearchParams({ skip: String(skip), limit: String(limit) });
    if (athleteId) query.append('athlete_id', athleteId);
    return this.get<VideoSession[]>(`/videos/?${query.toString()}`);
  }

  static async getVideo(videoId: string): Promise<VideoSession> {
    return this.get<VideoSession>(`/videos/${videoId}`);
  }

  static getVideoStreamUrl(videoId: string): string {
    return `${API_BASE_URL}/videos/${videoId}/stream`;
  }

  // --- Phase 3: Pose Estimation & Kinematics APIs ---
  static async processVideo(videoId: string, reprocess = false, smoothingMethod = 'SAVITZKY_GOLAY'): Promise<VideoStatusResponse> {
    const query = new URLSearchParams({
      reprocess: String(reprocess),
      smoothing_method: smoothingMethod,
    });
    return this.post<VideoStatusResponse>(`/videos/${videoId}/process?${query.toString()}`, {});
  }

  static async getKeypoints(videoId: string): Promise<KeypointsResponse> {
    return this.get<KeypointsResponse>(`/videos/${videoId}/keypoints`);
  }

  static async getKinematics(videoId: string): Promise<KinematicsResponse> {
    return this.get<KinematicsResponse>(`/analysis/${videoId}/kinematics`);
  }

  // --- Phase 4: Biomechanical Anomaly Detection APIs ---
  static async getAnomalies(videoId: string): Promise<AnomalyAssessmentResponse> {
    return this.get<AnomalyAssessmentResponse>(`/analysis/${videoId}/anomalies`);
  }

  // --- Downstream AI & ML Pipelines (Phase 5-6) ---
  static async getCurrentRisk(athleteId: string): Promise<RiskScoreResponse> {
    return this.get<RiskScoreResponse>(`/risk/athlete/${athleteId}/current`);
  }

  static async getRecommendations(athleteId: string): Promise<Recommendation[]> {
    return this.get<Recommendation[]>(`/recommendations/athlete/${athleteId}`);
  }
}
