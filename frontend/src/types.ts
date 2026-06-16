export type AuthMode = 'register' | 'login'
export type AppView = 'dashboard' | 'farm-detail' | 'history'
export type RiskLevel = 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH' | string

export type User = {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  full_name: string
  role?: string
  status?: string
  tier?: string
  phone_number?: string | null
  city?: string | null
  country?: string | null
  date_joined: string
}

export type AuthTokens = {
  access: string
  refresh: string
}

export type RegisterForm = {
  first_name: string
  last_name: string
  username: string
  email: string
  password: string
  password_confirm: string
}

export type LoginForm = {
  username: string
  password: string
}

export type FarmForm = {
  name: string
  county: string
  latitude: string
  longitude: string
  crop_type: string
  land_acres: string
  notes: string
}

export type FarmSummary = {
  id: string
  name: string
  county: string
  crop_type: string
  land_acres: string
  latest_risk_score: number
  latest_risk_level: RiskLevel
  updated_at: string
}

export type Farm = FarmSummary & {
  owner: string
  latitude: string
  longitude: string
  notes: string | null
  created_at: string
}

export type DashboardData = {
  summary: {
    total_farms: number
    high_risk_farms: number
    medium_risk_farms: number
    low_risk_farms: number
    unknown_risk_farms: number
  }
  farms: FarmSummary[]
}

export type WeatherSnapshot = {
  id: string
  farm: string
  source: string
  raw_response: {
    daily?: Record<string, unknown[]>
    current?: Record<string, unknown>
  }
  current_temperature: number | null
  max_temperature: number | null
  min_temperature: number | null
  max_rainfall: number | null
  max_wind_speed: number | null
  created_at: string
}

export type WeatherResponse = {
  cached: boolean
  snapshot: WeatherSnapshot
}

export type RiskAssessment = {
  id: string
  farm: string
  weather_snapshot: string | null
  score: number
  level: RiskLevel
  drivers: string[]
  recommended_actions: string[]
  created_at: string
}

export type RiskResponse = {
  assessment: RiskAssessment
  weather_summary: Record<string, unknown>
}

export type AIInsight = {
  id: string
  farm: string
  risk_assessment: string
  model: string
  prompt: string
  response: string
  created_at: string
}

export type AlertPreview = {
  mode: string
  to: string
  message: string
  ai_insight_available: boolean
  latest_ai_insight: string | null
}

export type ApiErrorPayload = Record<string, unknown> | string | null
