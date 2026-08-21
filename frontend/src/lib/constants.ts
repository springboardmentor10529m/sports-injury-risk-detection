export const RISK_CATEGORIES = {
  LOW: 'LOW',
  MODERATE: 'MODERATE',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const;

export const RISK_WEIGHTS = {
  biomechanical: 0.35,
  historical: 0.20,
  asymmetry: 0.20,
  training_load: 0.15,
  fatigue: 0.10,
} as const;

export const USER_ROLES = {
  ATHLETE: 'athlete',
  COACH: 'coach',
  PHYSIOTHERAPIST: 'physiotherapist',
  SPORTS_SCIENTIST: 'sports_scientist',
  ADMIN: 'admin',
} as const;

export const INJURY_CATEGORIES = [
  'ACL',
  'Hamstring',
  'Ankle Sprain',
  'Shoulder',
  'Lower Back',
  'Overuse',
] as const;

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
