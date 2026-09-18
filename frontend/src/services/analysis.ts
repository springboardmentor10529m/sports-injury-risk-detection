import { analyses } from '../data/analyses'
import type { Analysis } from '../types/analysis'
import type { AthleteProfile } from '../types/athlete'
import type { User } from '../types/user'
import { apiRequest } from './api'

const latestAnalysisKey = 'motionguard_latest_prediction'

export interface BiomechanicalTelemetrySample {
  frame: number
  timestamp: number
  kneeL?: number | null
  kneeR?: number | null
  hipY?: number | null
  poseDetected: boolean
}

export interface VideoProcessingMetadata {
  frames_processed?: number
  fps?: number
  pose_detected_frames?: number
  pose_detection_rate?: number
  valid_feature_frames?: number
  processing_time_s?: number
  annotated_video?: string
  is_h264?: boolean
  telemetry?: BiomechanicalTelemetrySample[]
}

export interface PredictionResponse {
  riskScore: number
  riskLevel: Analysis['riskLevel']
  label: 'RISK' | 'NO RISK'
  probability: number
  mlRiskScore?: number
  nvidiaRiskScore?: number | null
  nvidiaReasoning?: string
  nvidiaModel?: string
  calculationMethod?: string
  injuryAreas?: string[]
  dangerousPose?: string
  corrections?: string[]
  suggestions?: string[]
  annotatedVideoUrl?: string | null
  features: Record<string, number>
  warnings: string[]
  preprocessing: string[]
  telemetry?: BiomechanicalTelemetrySample[]
  videoProcessing?: VideoProcessingMetadata
  model: {
    source: string
    models: string[]
    weights: Record<string, number>
    featureCount: number
  }
}

export interface StoredPrediction extends PredictionResponse {
  id: string
  athleteId: string
  sport: string
  movement: string
  date: string
  fileName: string
  skeletonStreamToken?: string
}

export const getAnalysis = (id?: string) => analyses.find((analysis) => analysis.id === id) ?? analyses[0]

export function getLatestPrediction(): StoredPrediction | null {
  return getPredictionHistory()[0] ?? null
}

export async function saveLatestPrediction(prediction: StoredPrediction) {
  const history = getPredictionHistory().filter((item) => item.id !== prediction.id)
  localStorage.setItem(latestAnalysisKey, JSON.stringify([prediction, ...history]))
  try {
    await apiRequest<StoredPrediction>('/analyses', { method: 'POST', body: JSON.stringify(prediction) })
  } catch (err) {
    console.warn('Could not mirror prediction to backend:', err)
  }
}

export async function loadPredictionHistory(athleteId?: string): Promise<StoredPrediction[]> {
  const local = getPredictionHistory(athleteId)
  try {
    const url = athleteId ? `/analyses?athlete_id=${encodeURIComponent(athleteId)}` : '/analyses'
    const backendHistory = await apiRequest<StoredPrediction[]>(url)
    if (Array.isArray(backendHistory) && backendHistory.length > 0) {
      const mergedMap = new Map<string, StoredPrediction>()
      for (const item of [...backendHistory, ...local]) {
        if (item?.id) mergedMap.set(item.id, item)
      }
      const merged = Array.from(mergedMap.values())
      localStorage.setItem(latestAnalysisKey, JSON.stringify(merged))
      return athleteId ? (merged.filter((item) => item.athleteId === athleteId).length > 0 ? merged.filter((item) => item.athleteId === athleteId) : merged) : merged
    }
  } catch (err) {
    console.warn('Failed to load analyses from backend, falling back to local storage:', err)
  }
  return local.length > 0 ? local : getPredictionHistory()
}

export function getPredictionHistory(athleteId?: string): StoredPrediction[] {
  const saved = localStorage.getItem(latestAnalysisKey)
  if (!saved) return []
  try {
    const parsed = JSON.parse(saved) as StoredPrediction | StoredPrediction[]
    const list = Array.isArray(parsed) ? parsed : [parsed]
    if (athleteId) {
      const filtered = list.filter((item) => item.athleteId === athleteId)
      return filtered.length > 0 ? filtered : list
    }
    return list
  } catch {
    return []
  }
}

export function getStoredPrediction(id?: string): StoredPrediction | null {
  if (!id) return null
  return getPredictionHistory().find((item) => item.id === id) ?? null
}

const BACKEND_BASE = 'http://127.0.0.1:8000'

async function postToBackend(endpoint: string, form: FormData): Promise<Response> {
  try {
    const res = await fetch(`${BACKEND_BASE}${endpoint}`, { method: 'POST', body: form })
    if (res.ok) return res
  } catch {
    // If direct fails, try relative proxy
  }
  return fetch(endpoint, { method: 'POST', body: form })
}

export async function uploadForSkeletonStream(video: File): Promise<string> {
  const form = new FormData()
  form.append('video', video)
  const res = await postToBackend('/skeleton-stream-upload', form)
  if (!res.ok) throw new Error('Failed to upload video for skeleton stream')
  const data = await res.json() as { token: string }
  return data.token
}

export async function predictInjuryRisk(input: {
  video: File
  user: User | null
  profile: AthleteProfile | null
  movement: string
}): Promise<PredictionResponse> {
  const form = new FormData()
  form.append('video', input.video)
  form.append('context', JSON.stringify({
    user: input.user,
    profile: input.profile,
    movement: input.movement,
  }))

  const response = await postToBackend('/predict', form)

  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || 'Prediction failed')
  }

  return response.json() as Promise<PredictionResponse>
}
