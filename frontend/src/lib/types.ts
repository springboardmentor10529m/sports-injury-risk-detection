/**
 * SafeMove Frontend TypeScript Types & Interfaces.
 * Strictly aligned with backend Pydantic models & SQLAlchemy schemas.
 */

export enum UserRole {
  ATHLETE = 'ATHLETE',
  COACH = 'COACH',
  PHYSIOTHERAPIST = 'PHYSIOTHERAPIST',
  SPORTS_SCIENTIST = 'SPORTS_SCIENTIST',
  ADMIN = 'ADMIN',
}

export enum DominantSide {
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  AMBIDEXTROUS = 'AMBIDEXTROUS',
}

export enum InjuryType {
  ACL = 'ACL',
  HAMSTRING = 'HAMSTRING',
  ANKLE_SPRAIN = 'ANKLE_SPRAIN',
  SHOULDER = 'SHOULDER',
  LOWER_BACK = 'LOWER_BACK',
  OVERUSE = 'OVERUSE',
}

export enum Severity {
  MILD = 'MILD',
  MODERATE = 'MODERATE',
  SEVERE = 'SEVERE',
}

export enum VideoStatus {
  UPLOADED = 'UPLOADED',
  PREPROCESSING = 'PREPROCESSING',
  PROCESSING = 'PROCESSING',
  ANALYZED = 'ANALYZED',
  FAILED = 'FAILED',
}

export enum RiskCategory {
  LOW = 'LOW',
  MODERATE = 'MODERATE',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum RecCategory {
  EXERCISE = 'EXERCISE',
  MOBILITY = 'MOBILITY',
  TRAINING_MODIFICATION = 'TRAINING_MODIFICATION',
  REST = 'REST',
  REFERRAL = 'REFERRAL',
}

export enum RecPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum RecStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  DISMISSED = 'DISMISSED',
}

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface AthleteProfile {
  id: string;
  user_id: string;
  sport: string;
  position?: string | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  dominant_side?: DominantSide | null;
  date_of_birth?: string | null;
  team_id?: string | null;
}

export interface InjuryHistory {
  id: string;
  athlete_id: string;
  injury_type: InjuryType;
  body_region: string;
  severity: Severity;
  date_occurred: string;
  recovery_duration_days?: number | null;
  is_recurring: boolean;
  notes?: string | null;
}

export interface TrainingLoad {
  id: string;
  athlete_id: string;
  date: string;
  session_type: string;
  duration_minutes: number;
  intensity: number; // 1-10
  rpe: number; // 1.0 - 10.0
  notes?: string | null;
}

export interface Team {
  id: string;
  name: string;
  sport: string;
  coach_id: string;
}

export interface VideoSession {
  id: string;
  athlete_id: string;
  uploaded_by?: string | null;
  filename: string;
  original_filename?: string | null;
  storage_path?: string | null;
  storage_url?: string | null;
  content_type?: string | null;
  file_size?: number | null;
  status: VideoStatus;
  sport_type?: string | null;
  fps?: number | null;
  duration_seconds?: number | null;
  resolution?: string | null;
  uploaded_at: string;
  processed_at?: string | null;
}

export interface VideoUploadResponse {
  id: string;
  athlete_id: string;
  filename: string;
  original_filename?: string | null;
  status: VideoStatus;
  uploaded_at: string;
  message?: string;
}

export interface VideoStatusResponse {
  id: string;
  status: VideoStatus;
  processed_at?: string | null;
  message?: string | null;
}

export interface LandmarkCoordinate {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface PoseFrame {
  frame_index: number;
  timestamp_seconds: number;
  raw_landmarks?: Record<string, LandmarkCoordinate>;
  landmarks: Record<string, LandmarkCoordinate>;
}

export interface KeypointsResponse {
  video_id: string;
  fps: number;
  duration: number;
  processed_fps: number;
  frame_count: number;
  smoothing_method: string;
  frames: PoseFrame[];
}

export interface AsymmetryMetricDetail {
  timeseries: Array<number | null>;
  mean: number | null;
  peak: number | null;
}

export interface JointMetricStats {
  min: number | null;
  max: number | null;
  mean: number | null;
  range: number | null;
}

export interface KinematicsResponse {
  video_id: string;
  athlete_id: string;
  timestamps: number[];
  joint_angle_curves: {
    left_knee_angle: Array<number | null>;
    right_knee_angle: Array<number | null>;
    left_hip_angle: Array<number | null>;
    right_hip_angle: Array<number | null>;
    left_ankle_angle: Array<number | null>;
    right_ankle_angle: Array<number | null>;
    trunk_lean: Array<number | null>;
    trunk_lateral_tilt: Array<number | null>;
    left_knee_valgus: Array<number | null>;
    right_knee_valgus: Array<number | null>;
  };
  angular_velocities: Record<string, Array<number | null>>;
  angular_accelerations: Record<string, Array<number | null>>;
  asymmetry_metrics: {
    knee_flexion_asymmetry: AsymmetryMetricDetail;
    hip_flexion_asymmetry: AsymmetryMetricDetail;
    knee_valgus_asymmetry: AsymmetryMetricDetail;
  };
  summary_metrics: Record<string, JointMetricStats | number | null>;
  created_at?: string | null;
}

export type AnomalySeverity = 'NORMAL' | 'MILD_DEVIATION' | 'MODERATE_DEVIATION' | 'HIGH_DEVIATION';

export interface AnomalyEventItem {
  metric: string;
  metric_name: string;
  timestamp_seconds?: number | null;
  observed?: number | null;
  observed_value?: number | null;
  baseline_mean: number;
  baseline_value: number;
  baseline_std: number;
  z_score?: number | null;
  percent_deviation?: number | null;
  percentage_deviation?: number | null;
  range_deviation: number;
  severity: AnomalySeverity;
  severity_derivation_rule: string;
  baseline_type: string;
  description: string;
}

export interface MetricDeviationDetail {
  label: string;
  category: string;
  unit: string;
  metric: string;
  observed?: number | null;
  baseline_mean: number;
  baseline_std: number;
  baseline_range: [number, number];
  absolute_deviation?: number | null;
  percent_deviation?: number | null;
  z_score?: number | null;
  range_deviation: number;
  is_out_of_range: boolean;
  severity: AnomalySeverity;
  severity_derivation_rule: string;
  baseline_type: string;
}

export interface AnomalyAssessmentResponse {
  video_id: string;
  athlete_id: string;
  overall_status: AnomalySeverity;
  feature_summary: Record<string, JointMetricStats & { peak_velocity?: number | null; peak_acceleration?: number | null }>;
  metric_deviations: Record<string, MetricDeviationDetail>;
  temporal_peaks: Record<string, { peak_value?: number | null; timestamp_seconds?: number | null }>;
  anomalies: AnomalyEventItem[];
  baseline_metadata: {
    baseline_type: string;
    is_provisional: boolean;
    disclaimer: string;
    total_metrics_evaluated: number;
    total_anomalies_detected: number;
  };
  created_at?: string | null;
}

export interface RiskComponentScores {
  biomechanical: number;
  historical: number;
  asymmetry: number;
  training_load: number;
  fatigue: number;
}

export interface RiskScoreResponse {
  id: string;
  athlete_id: string;
  composite_score: number;
  risk_category: RiskCategory;
  component_scores: RiskComponentScores;
  generated_at: string;
}

export interface Recommendation {
  id: string;
  risk_report_id: string;
  category: RecCategory;
  priority: RecPriority;
  title: string;
  description?: string | null;
  exercises: Array<{
    name: string;
    sets: number;
    reps: number;
    duration_seconds?: number | null;
    notes?: string | null;
  }>;
  status: RecStatus;
  created_at: string;
  updated_at: string;
}

export interface APIError {
  detail: string | { msg: string; type: string }[];
  status?: number;
}
