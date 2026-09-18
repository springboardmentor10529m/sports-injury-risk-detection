import { coaches } from '../data/coaches'
import { apiRequest } from './api'

export interface CoachProfile {
  userId: string
  name: string
  email: string
  phone: string
  country: string
  specialty: string
  organization: string
  certification: string
  yearsExperience: string
  coachId: string
  bio: string
}

export const getCoaches = () => coaches

export async function getCoachProfile(userId: string): Promise<CoachProfile | null> {
  try {
    return await apiRequest<CoachProfile>(`/users/${userId}/coach-profile`)
  } catch {
    return null
  }
}

export async function saveCoachProfile(userId: string, data: CoachProfile): Promise<CoachProfile> {
  return apiRequest<CoachProfile>(`/users/${userId}/coach-profile`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}
