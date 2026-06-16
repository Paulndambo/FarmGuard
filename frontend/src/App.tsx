import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { parseAdvisorySections } from './advisory'
import './App.css'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:8000/api'

type AuthMode = 'register' | 'login'
type AppView = 'dashboard' | 'farm-detail' | 'history'
type RiskLevel = 'UNKNOWN' | 'LOW' | 'MEDIUM' | 'HIGH' | string

type User = {
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

type AuthTokens = {
  access: string
  refresh: string
}

type RegisterForm = {
  first_name: string
  last_name: string
  username: string
  email: string
  password: string
  password_confirm: string
}

type LoginForm = {
  username: string
  password: string
}

type FarmForm = {
  name: string
  county: string
  latitude: string
  longitude: string
  crop_type: string
  land_acres: string
  notes: string
}

type FarmSummary = {
  id: string
  name: string
  county: string
  crop_type: string
  land_acres: string
  latest_risk_score: number
  latest_risk_level: RiskLevel
  updated_at: string
}

type Farm = FarmSummary & {
  owner: string
  latitude: string
  longitude: string
  notes: string | null
  created_at: string
}

type DashboardData = {
  summary: {
    total_farms: number
    high_risk_farms: number
    medium_risk_farms: number
    low_risk_farms: number
    unknown_risk_farms: number
  }
  farms: FarmSummary[]
}

type WeatherSnapshot = {
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

type WeatherResponse = {
  cached: boolean
  snapshot: WeatherSnapshot
}

type RiskAssessment = {
  id: string
  farm: string
  weather_snapshot: string | null
  score: number
  level: RiskLevel
  drivers: string[]
  recommended_actions: string[]
  created_at: string
}

type RiskResponse = {
  assessment: RiskAssessment
  weather_summary: Record<string, unknown>
}

type AIInsight = {
  id: string
  farm: string
  risk_assessment: string
  model: string
  prompt: string
  response: string
  created_at: string
}

type AlertPreview = {
  mode: string
  to: string
  message: string
  ai_insight_available: boolean
  latest_ai_insight: string | null
}

type ApiErrorPayload = Record<string, unknown> | string | null

const cropOptions = [
  'maize',
  'tea',
  'coffee',
  'avocado',
  'rice',
  'vegetables',
  'mixed',
  'other',
]

const emptyRegisterForm: RegisterForm = {
  first_name: '',
  last_name: '',
  username: '',
  email: '',
  password: '',
  password_confirm: '',
}

const emptyLoginForm: LoginForm = {
  username: '',
  password: '',
}

const emptyFarmForm: FarmForm = {
  name: '',
  county: '',
  latitude: '',
  longitude: '',
  crop_type: 'maize',
  land_acres: '1.00',
  notes: '',
}

function formatApiError(payload: ApiErrorPayload, fallback: string) {
  if (!payload) return fallback
  if (typeof payload === 'string') return payload

  if ('detail' in payload && typeof payload.detail === 'string') return payload.detail
  if ('error' in payload && typeof payload.error === 'string') return payload.error

  const messages = Object.entries(payload).flatMap(([field, value]) => {
    if (Array.isArray(value)) return value.map((item) => `${field}: ${String(item)}`)
    if (typeof value === 'string') return [`${field}: ${value}`]
    return []
  })

  return messages.length > 0 ? messages.join(' ') : fallback
}

async function apiRequest<T>(path: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(formatApiError(data, 'The request could not be completed.'))
  }

  return data as T
}

function getStoredTokens(): AuthTokens | null {
  const access = localStorage.getItem('farmguard_access')
  const refresh = localStorage.getItem('farmguard_refresh')
  return access && refresh ? { access, refresh } : null
}

function storeTokens(tokens: AuthTokens) {
  localStorage.setItem('farmguard_access', tokens.access)
  localStorage.setItem('farmguard_refresh', tokens.refresh)
}

function clearTokens() {
  localStorage.removeItem('farmguard_access')
  localStorage.removeItem('farmguard_refresh')
}

function formatDate(value?: string) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function asNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function levelClass(level: RiskLevel) {
  return `risk-badge risk-${String(level).toLowerCase()}`
}

function farmToForm(farm: Farm): FarmForm {
  return {
    name: farm.name,
    county: farm.county,
    latitude: farm.latitude,
    longitude: farm.longitude,
    crop_type: farm.crop_type,
    land_acres: farm.land_acres,
    notes: farm.notes ?? '',
  }
}

function belongsToFarm(recordFarmId: string, farmId: string) {
  return String(recordFarmId) === String(farmId)
}

function newestByCreatedAt<T extends { created_at: string }>(items: T[]) {
  return [...items].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  )[0]
}

function App() {
  const [mode, setMode] = useState<AuthMode>('register')
  const [registerForm, setRegisterForm] = useState<RegisterForm>(emptyRegisterForm)
  const [loginForm, setLoginForm] = useState<LoginForm>(emptyLoginForm)
  const [tokens, setTokens] = useState<AuthTokens | null>(() => getStoredTokens())
  const [user, setUser] = useState<User | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRestoringSession, setIsRestoringSession] = useState(Boolean(getStoredTokens()))

  const [view, setView] = useState<AppView>('dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [farmForm, setFarmForm] = useState<FarmForm>(emptyFarmForm)
  const [editingFarmId, setEditingFarmId] = useState<string | null>(null)
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null)
  const [selectedFarm, setSelectedFarm] = useState<Farm | null>(null)
  const [weather, setWeather] = useState<WeatherResponse | null>(null)
  const [risk, setRisk] = useState<RiskAssessment | null>(null)
  const [insight, setInsight] = useState<AIInsight | null>(null)
  const [alertPreview, setAlertPreview] = useState<AlertPreview | null>(null)
  const [weatherHistory, setWeatherHistory] = useState<WeatherSnapshot[]>([])
  const [riskHistory, setRiskHistory] = useState<RiskAssessment[]>([])
  const [insightHistory, setInsightHistory] = useState<AIInsight[]>([])
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(false)
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [actionLoading, setActionLoading] = useState('')

  const displayName = useMemo(() => {
    if (!user) return ''
    return user.full_name || user.first_name || user.username
  }, [user])

  const authorizedRequest = useCallback(
    async <T,>(path: string, options: RequestInit = {}) => {
      if (!tokens?.access) throw new Error('Please sign in to continue.')
      return apiRequest<T>(path, {
        ...options,
        headers: {
          Authorization: `Bearer ${tokens.access}`,
          ...options.headers,
        },
      })
    },
    [tokens],
  )

  const loadDashboard = useCallback(async () => {
    setIsLoadingDashboard(true)
    try {
      const data = await authorizedRequest<DashboardData>('/farms/dashboard/')
      setDashboard(data)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load dashboard.')
    } finally {
      setIsLoadingDashboard(false)
    }
  }, [authorizedRequest])

  const loadFarmDetail = useCallback(
    async (farmId: string, clearWorkflow = true) => {
      setIsLoadingDetail(true)
      try {
        const [farm, snapshots, risks, insights] = await Promise.all([
          authorizedRequest<Farm>(`/farms/${farmId}/`),
          authorizedRequest<WeatherSnapshot[]>('/weather-snapshots/'),
          authorizedRequest<RiskAssessment[]>('/risk-assessments/'),
          authorizedRequest<AIInsight[]>('/ai-insights/'),
        ])
        const latestSnapshot = newestByCreatedAt(
          snapshots.filter((snapshot) => belongsToFarm(snapshot.farm, farmId)),
        )
        const latestRisk = newestByCreatedAt(
          risks.filter((assessment) => belongsToFarm(assessment.farm, farmId)),
        )
        const latestInsight = newestByCreatedAt(
          insights.filter((advisory) => belongsToFarm(advisory.farm, farmId)),
        )

        setSelectedFarm(farm)
        if (clearWorkflow) {
          setWeather(latestSnapshot ? { cached: true, snapshot: latestSnapshot } : null)
          setRisk(latestRisk ?? null)
          setInsight(latestInsight ?? null)
          setAlertPreview(null)
        }
        if (latestRisk) {
          try {
            const preview = await authorizedRequest<AlertPreview>(`/farms/${farmId}/alert-preview/`)
            setAlertPreview(preview)
          } catch {
            setAlertPreview(null)
          }
        } else if (clearWorkflow) {
          setAlertPreview(null)
        }
        setErrorMessage('')
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : 'Could not load farm.')
      } finally {
        setIsLoadingDetail(false)
      }
    },
    [authorizedRequest],
  )

  const loadHistory = useCallback(async () => {
    setIsLoadingHistory(true)
    try {
      const [snapshots, risks, insights] = await Promise.all([
        authorizedRequest<WeatherSnapshot[]>('/weather-snapshots/'),
        authorizedRequest<RiskAssessment[]>('/risk-assessments/'),
        authorizedRequest<AIInsight[]>('/ai-insights/'),
      ])
      setWeatherHistory(snapshots)
      setRiskHistory(risks)
      setInsightHistory(insights)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load history.')
    } finally {
      setIsLoadingHistory(false)
    }
  }, [authorizedRequest])

  useEffect(() => {
    if (!tokens?.access) return

    let ignore = false
    const accessToken = tokens.access

    async function restoreSession() {
      setIsRestoringSession(true)
      try {
        const data = await apiRequest<{ user: User }>('/me/', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
        if (!ignore) {
          setUser(data.user)
          setErrorMessage('')
        }
      } catch {
        if (!ignore) {
          clearTokens()
          setTokens(null)
          setUser(null)
          setErrorMessage('Your session has expired. Please sign in again.')
        }
      } finally {
        if (!ignore) setIsRestoringSession(false)
      }
    }

    restoreSession()

    return () => {
      ignore = true
    }
  }, [tokens])

  useEffect(() => {
    if (!tokens || !user) return
    const timer = window.setTimeout(() => {
      void loadDashboard()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadDashboard, tokens, user])

  useEffect(() => {
    if (!selectedFarmId || view !== 'farm-detail') return
    const timer = window.setTimeout(() => {
      void loadFarmDetail(selectedFarmId)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadFarmDetail, selectedFarmId, view])

  useEffect(() => {
    if (view !== 'history' || !tokens || !user) return
    const timer = window.setTimeout(() => {
      void loadHistory()
    }, 0)
    return () => window.clearTimeout(timer)
  }, [loadHistory, tokens, user, view])

  async function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setStatusMessage('')

    try {
      const data = await apiRequest<{ message: string; user: User; tokens: AuthTokens }>(
        '/auth/register/',
        {
          method: 'POST',
          body: JSON.stringify(registerForm),
        },
      )

      storeTokens(data.tokens)
      setTokens(data.tokens)
      setUser(data.user)
      setRegisterForm(emptyRegisterForm)
      setStatusMessage(data.message)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Registration failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage('')
    setStatusMessage('')

    try {
      const data = await apiRequest<AuthTokens>('/auth/login/', {
        method: 'POST',
        body: JSON.stringify(loginForm),
      })

      storeTokens(data)
      setTokens(data)
      setLoginForm(emptyLoginForm)
      setStatusMessage('Signed in successfully.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Login failed.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleFarmSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionLoading('farm-save')
    setErrorMessage('')
    setStatusMessage('')

    const payload = {
      ...farmForm,
      latitude: farmForm.latitude.trim(),
      longitude: farmForm.longitude.trim(),
      land_acres: farmForm.land_acres.trim() || '1.00',
      notes: farmForm.notes.trim(),
    }

    try {
      const farm = await authorizedRequest<Farm>(
        editingFarmId ? `/farms/${editingFarmId}/` : '/farms/',
        {
          method: editingFarmId ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        },
      )
      setFarmForm(emptyFarmForm)
      setEditingFarmId(null)
      setSelectedFarmId(farm.id)
      setView('farm-detail')
      setStatusMessage(editingFarmId ? 'Farm updated.' : 'Farm created.')
      await loadDashboard()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not save farm.')
    } finally {
      setActionLoading('')
    }
  }

  async function deleteFarm(farmId: string) {
    setActionLoading(`delete-${farmId}`)
    setErrorMessage('')
    setStatusMessage('')

    try {
      await authorizedRequest(`/farms/${farmId}/`, { method: 'DELETE' })
      if (selectedFarmId === farmId) {
        setSelectedFarmId(null)
        setSelectedFarm(null)
        setView('dashboard')
      }
      setStatusMessage('Farm deleted.')
      await loadDashboard()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not delete farm.')
    } finally {
      setActionLoading('')
    }
  }

  async function fetchWeather(refresh = false) {
    if (!selectedFarmId) return
    setActionLoading(refresh ? 'weather-refresh' : 'weather')
    setErrorMessage('')

    try {
      const data = await authorizedRequest<WeatherResponse>(
        `/farms/${selectedFarmId}/weather/${refresh ? '?refresh=true' : ''}`,
      )
      setWeather(data)
      setStatusMessage(data.cached ? 'Using cached weather snapshot.' : 'Weather updated.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not fetch weather.')
    } finally {
      setActionLoading('')
    }
  }

  async function generateRisk() {
    if (!selectedFarmId) return
    setActionLoading('risk')
    setErrorMessage('')

    try {
      const data = await authorizedRequest<RiskResponse>(`/farms/${selectedFarmId}/risk/`, {
        method: 'POST',
      })
      setRisk(data.assessment)
      setStatusMessage('Risk assessment generated.')
      await loadDashboard()
      await loadFarmDetail(selectedFarmId, false)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not generate risk.')
    } finally {
      setActionLoading('')
    }
  }

  async function generateInsight() {
    if (!selectedFarmId) return
    setActionLoading('insight')
    setErrorMessage('')

    try {
      const data = await authorizedRequest<AIInsight>(`/farms/${selectedFarmId}/generate-insight/`, {
        method: 'POST',
      })
      setInsight(data)
      setStatusMessage('AI advisory generated.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not generate AI insight.')
    } finally {
      setActionLoading('')
    }
  }

  async function fetchAlertPreview() {
    if (!selectedFarmId) return
    setActionLoading('alert')
    setErrorMessage('')

    try {
      const data = await authorizedRequest<AlertPreview>(`/farms/${selectedFarmId}/alert-preview/`)
      setAlertPreview(data)
      setStatusMessage('Alert preview ready.')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not load alert preview.')
    } finally {
      setActionLoading('')
    }
  }

  function openFarm(farmId: string) {
    setSelectedFarmId(farmId)
    setView('farm-detail')
    setStatusMessage('')
    setErrorMessage('')
  }

  function editFarm(farm: Farm) {
    setFarmForm(farmToForm(farm))
    setEditingFarmId(farm.id)
    setView('dashboard')
  }

  function resetFarmForm() {
    setFarmForm(emptyFarmForm)
    setEditingFarmId(null)
  }

  function handleLogout() {
    clearTokens()
    setTokens(null)
    setUser(null)
    setDashboard(null)
    setSelectedFarmId(null)
    setSelectedFarm(null)
    setWeather(null)
    setRisk(null)
    setInsight(null)
    setAlertPreview(null)
    setIsRestoringSession(false)
    setStatusMessage('')
    setErrorMessage('')
    setMode('login')
  }

  if (isRestoringSession) {
    return (
      <main className="app-shell loading-shell">
        <div className="brand-mark" aria-hidden="true">
          FG
        </div>
        <p>Restoring FarmGuard session...</p>
      </main>
    )
  }

  if (tokens && user) {
    return (
      <main className="app-shell workspace-shell">
        <aside className="sidebar">
          <div className="brand-row sidebar-brand">
            <div className="brand-mark" aria-hidden="true">
              FG
            </div>
            <span>FarmGuard AI</span>
          </div>

          <nav className="side-nav" aria-label="Main navigation">
            <button
              type="button"
              className={view === 'dashboard' ? 'active' : ''}
              onClick={() => setView('dashboard')}
            >
              Dashboard
            </button>
            <button
              type="button"
              className={view === 'farm-detail' ? 'active' : ''}
              onClick={() => {
                if (selectedFarmId) setView('farm-detail')
              }}
              disabled={!selectedFarmId}
            >
              Farm detail
            </button>
            <button
              type="button"
              className={view === 'history' ? 'active' : ''}
              onClick={() => setView('history')}
            >
              History
            </button>
          </nav>

          <div className="account-block">
            <span>{displayName}</span>
            <small>{user.email || user.username}</small>
          </div>
          <button className="ghost-button full-width" type="button" onClick={handleLogout}>
            Sign out
          </button>
        </aside>

        <section className="main-area">
          <header className="topbar">
            <div>
              <div className="eyebrow">FarmGuard AI</div>
              <h1>{view === 'history' ? 'History' : view === 'farm-detail' ? 'Farm detail' : 'Dashboard'}</h1>
            </div>
            <button className="ghost-button" type="button" onClick={() => void loadDashboard()}>
              Refresh
            </button>
          </header>

          {statusMessage ? <div className="success-banner">{statusMessage}</div> : null}
          {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

          {view === 'dashboard' ? (
            <DashboardView
              dashboard={dashboard}
              farmForm={farmForm}
              editingFarmId={editingFarmId}
              isLoadingDashboard={isLoadingDashboard}
              actionLoading={actionLoading}
              onChangeFarmForm={setFarmForm}
              onSubmitFarm={handleFarmSubmit}
              onResetFarmForm={resetFarmForm}
              onOpenFarm={openFarm}
              onDeleteFarm={(farmId) => void deleteFarm(farmId)}
            />
          ) : null}

          {view === 'farm-detail' ? (
            <FarmDetailView
              farm={selectedFarm}
              weather={weather}
              risk={risk}
              insight={insight}
              alertPreview={alertPreview}
              actionLoading={actionLoading}
              isLoadingDetail={isLoadingDetail}
              onEditFarm={editFarm}
              onFetchWeather={(refresh) => void fetchWeather(refresh)}
              onGenerateRisk={() => void generateRisk()}
              onGenerateInsight={() => void generateInsight()}
              onFetchAlertPreview={() => void fetchAlertPreview()}
            />
          ) : null}

          {view === 'history' ? (
            <HistoryView
              isLoading={isLoadingHistory}
              weatherHistory={weatherHistory}
              riskHistory={riskHistory}
              insightHistory={insightHistory}
            />
          ) : null}
        </section>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <section className="auth-intro">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            FG
          </div>
          <span>FarmGuard AI</span>
        </div>
        <h1>Weather-risk intelligence for Kenyan farms</h1>
        <p>
          Create your account to monitor farms, fetch local forecasts, generate risk
          scores, and prepare farmer-ready advisories from one dashboard.
        </p>
        <div className="workflow-strip" aria-label="FarmGuard workflow">
          <span>Register</span>
          <span>Create farm</span>
          <span>Assess risk</span>
          <span>Preview alert</span>
        </div>
      </section>

      <section className="auth-panel" aria-label="Authentication form">
        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            className={mode === 'register' ? 'active' : ''}
            onClick={() => {
              setMode('register')
              setErrorMessage('')
              setStatusMessage('')
            }}
          >
            Register
          </button>
          <button
            type="button"
            className={mode === 'login' ? 'active' : ''}
            onClick={() => {
              setMode('login')
              setErrorMessage('')
              setStatusMessage('')
            }}
          >
            Login
          </button>
        </div>

        {mode === 'register' ? (
          <form className="auth-form" onSubmit={handleRegister}>
            <div className="form-grid two-column">
              <label>
                First name
                <input
                  value={registerForm.first_name}
                  onChange={(event) =>
                    setRegisterForm((form) => ({ ...form, first_name: event.target.value }))
                  }
                  autoComplete="given-name"
                />
              </label>
              <label>
                Last name
                <input
                  value={registerForm.last_name}
                  onChange={(event) =>
                    setRegisterForm((form) => ({ ...form, last_name: event.target.value }))
                  }
                  autoComplete="family-name"
                />
              </label>
            </div>
            <label>
              Username
              <input
                value={registerForm.username}
                onChange={(event) =>
                  setRegisterForm((form) => ({ ...form, username: event.target.value }))
                }
                autoComplete="username"
                required
              />
            </label>
            <label>
              Email
              <input
                type="email"
                value={registerForm.email}
                onChange={(event) =>
                  setRegisterForm((form) => ({ ...form, email: event.target.value }))
                }
                autoComplete="email"
              />
            </label>
            <div className="form-grid two-column">
              <label>
                Password
                <input
                  type="password"
                  value={registerForm.password}
                  onChange={(event) =>
                    setRegisterForm((form) => ({ ...form, password: event.target.value }))
                  }
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label>
                Confirm password
                <input
                  type="password"
                  value={registerForm.password_confirm}
                  onChange={(event) =>
                    setRegisterForm((form) => ({
                      ...form,
                      password_confirm: event.target.value,
                    }))
                  }
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
            </div>
            {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
            {statusMessage ? <div className="success-banner">{statusMessage}</div> : null}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleLogin}>
            <label>
              Username
              <input
                value={loginForm.username}
                onChange={(event) =>
                  setLoginForm((form) => ({ ...form, username: event.target.value }))
                }
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) =>
                  setLoginForm((form) => ({ ...form, password: event.target.value }))
                }
                autoComplete="current-password"
                required
              />
            </label>
            {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
            {statusMessage ? <div className="success-banner">{statusMessage}</div> : null}
            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}
      </section>
    </main>
  )
}

type DashboardViewProps = {
  dashboard: DashboardData | null
  farmForm: FarmForm
  editingFarmId: string | null
  isLoadingDashboard: boolean
  actionLoading: string
  onChangeFarmForm: (form: FarmForm) => void
  onSubmitFarm: (event: FormEvent<HTMLFormElement>) => void
  onResetFarmForm: () => void
  onOpenFarm: (farmId: string) => void
  onDeleteFarm: (farmId: string) => void
}

function DashboardView({
  dashboard,
  farmForm,
  editingFarmId,
  isLoadingDashboard,
  actionLoading,
  onChangeFarmForm,
  onSubmitFarm,
  onResetFarmForm,
  onOpenFarm,
  onDeleteFarm,
}: DashboardViewProps) {
  const summary = dashboard?.summary

  return (
    <div className="view-stack">
      <section className="metric-grid">
        <Metric label="Total farms" value={summary?.total_farms ?? 0} tone="neutral" />
        <Metric label="High risk" value={summary?.high_risk_farms ?? 0} tone="danger" />
        <Metric label="Medium risk" value={summary?.medium_risk_farms ?? 0} tone="warning" />
        <Metric label="Low risk" value={summary?.low_risk_farms ?? 0} tone="success" />
        <Metric label="Unknown" value={summary?.unknown_risk_farms ?? 0} tone="muted" />
      </section>

      <section className="split-layout">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Farms</span>
              <h2>Monitoring list</h2>
            </div>
            {isLoadingDashboard ? <span className="loading-chip">Loading</span> : null}
          </div>

          {dashboard?.farms.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Farm</th>
                    <th>Crop</th>
                    <th>Acres</th>
                    <th>Risk</th>
                    <th>Updated</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.farms.map((farm) => (
                    <tr key={farm.id}>
                      <td>
                        <strong>{farm.name}</strong>
                        <span>{farm.county}</span>
                      </td>
                      <td>{titleCase(farm.crop_type)}</td>
                      <td>{farm.land_acres}</td>
                      <td>
                        <span className={levelClass(farm.latest_risk_level)}>
                          {farm.latest_risk_level}
                        </span>
                      </td>
                      <td>{formatDate(farm.updated_at)}</td>
                      <td>
                        <div className="row-actions">
                          <button type="button" onClick={() => onOpenFarm(farm.id)}>
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteFarm(farm.id)}
                            disabled={actionLoading === `delete-${farm.id}`}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No farms yet</h3>
              <p>Create your first farm profile to start weather and risk monitoring.</p>
            </div>
          )}
        </div>

        <FarmFormPanel
          farmForm={farmForm}
          editingFarmId={editingFarmId}
          actionLoading={actionLoading}
          onChangeFarmForm={onChangeFarmForm}
          onSubmitFarm={onSubmitFarm}
          onResetFarmForm={onResetFarmForm}
        />
      </section>
    </div>
  )
}

function Metric({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'neutral' | 'danger' | 'warning' | 'success' | 'muted'
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

type FarmFormPanelProps = {
  farmForm: FarmForm
  editingFarmId: string | null
  actionLoading: string
  onChangeFarmForm: (form: FarmForm) => void
  onSubmitFarm: (event: FormEvent<HTMLFormElement>) => void
  onResetFarmForm: () => void
}

function FarmFormPanel({
  farmForm,
  editingFarmId,
  actionLoading,
  onChangeFarmForm,
  onSubmitFarm,
  onResetFarmForm,
}: FarmFormPanelProps) {
  return (
    <div className="panel">
      <div className="panel-header">
        <div>
          <span className="panel-label">{editingFarmId ? 'Edit farm' : 'Create farm'}</span>
          <h2>{editingFarmId ? 'Update profile' : 'New farm profile'}</h2>
        </div>
      </div>

      <form className="data-form" onSubmit={onSubmitFarm}>
        <label>
          Farm name
          <input
            value={farmForm.name}
            onChange={(event) => onChangeFarmForm({ ...farmForm, name: event.target.value })}
            required
          />
        </label>
        <div className="form-grid two-column">
          <label>
            County
            <input
              value={farmForm.county}
              onChange={(event) => onChangeFarmForm({ ...farmForm, county: event.target.value })}
              required
            />
          </label>
          <label>
            Crop
            <select
              value={farmForm.crop_type}
              onChange={(event) =>
                onChangeFarmForm({ ...farmForm, crop_type: event.target.value })
              }
            >
              {cropOptions.map((crop) => (
                <option key={crop} value={crop}>
                  {titleCase(crop)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="form-grid three-column">
          <label>
            Latitude
            <input
              type="number"
              step="0.0000001"
              value={farmForm.latitude}
              onChange={(event) =>
                onChangeFarmForm({ ...farmForm, latitude: event.target.value })
              }
              required
            />
          </label>
          <label>
            Longitude
            <input
              type="number"
              step="0.0000001"
              value={farmForm.longitude}
              onChange={(event) =>
                onChangeFarmForm({ ...farmForm, longitude: event.target.value })
              }
              required
            />
          </label>
          <label>
            Acres
            <input
              type="number"
              step="0.01"
              min="0"
              value={farmForm.land_acres}
              onChange={(event) =>
                onChangeFarmForm({ ...farmForm, land_acres: event.target.value })
              }
            />
          </label>
        </div>
        <label>
          Notes
          <textarea
            value={farmForm.notes}
            onChange={(event) => onChangeFarmForm({ ...farmForm, notes: event.target.value })}
            rows={4}
          />
        </label>
        <div className="button-row">
          <button className="primary-button" type="submit" disabled={actionLoading === 'farm-save'}>
            {actionLoading === 'farm-save'
              ? 'Saving...'
              : editingFarmId
                ? 'Save changes'
                : 'Create farm'}
          </button>
          {editingFarmId ? (
            <button className="ghost-button" type="button" onClick={onResetFarmForm}>
              Cancel edit
            </button>
          ) : null}
        </div>
      </form>
    </div>
  )
}

type FarmDetailViewProps = {
  farm: Farm | null
  weather: WeatherResponse | null
  risk: RiskAssessment | null
  insight: AIInsight | null
  alertPreview: AlertPreview | null
  actionLoading: string
  isLoadingDetail: boolean
  onEditFarm: (farm: Farm) => void
  onFetchWeather: (refresh: boolean) => void
  onGenerateRisk: () => void
  onGenerateInsight: () => void
  onFetchAlertPreview: () => void
}

function FarmDetailView({
  farm,
  weather,
  risk,
  insight,
  alertPreview,
  actionLoading,
  isLoadingDetail,
  onEditFarm,
  onFetchWeather,
  onGenerateRisk,
  onGenerateInsight,
  onFetchAlertPreview,
}: FarmDetailViewProps) {
  if (isLoadingDetail) return <div className="panel muted-panel">Loading farm detail...</div>
  if (!farm) return <div className="panel muted-panel">Select a farm from the dashboard.</div>

  const latestRiskLevel = risk?.level ?? farm.latest_risk_level
  const latestRiskScore = risk?.score ?? farm.latest_risk_score

  return (
    <div className="view-stack">
      <section className="detail-hero">
        <div>
          <span className="panel-label">{farm.county}</span>
          <h2>{farm.name}</h2>
          <p>
            {titleCase(farm.crop_type)} farm, {farm.land_acres} acres. Coordinates {farm.latitude},{' '}
            {farm.longitude}.
          </p>
        </div>
        <div className="detail-actions">
          <span className={levelClass(latestRiskLevel)}>{latestRiskLevel}</span>
          <button className="ghost-button" type="button" onClick={() => onEditFarm(farm)}>
            Edit farm
          </button>
        </div>
      </section>

      <section className="process-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Weather</span>
              <h2>Forecast snapshot</h2>
            </div>
            <div className="button-row compact">
              <button
                type="button"
                onClick={() => onFetchWeather(false)}
                disabled={actionLoading === 'weather'}
              >
                {actionLoading === 'weather' ? 'Fetching...' : 'Fetch'}
              </button>
              <button
                type="button"
                onClick={() => onFetchWeather(true)}
                disabled={actionLoading === 'weather-refresh'}
              >
                Refresh
              </button>
            </div>
          </div>
          {weather ? <WeatherPanel weather={weather} /> : <p className="muted-text">Fetch weather before generating risk.</p>}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Risk</span>
              <h2>Assessment</h2>
            </div>
            <button
              type="button"
              onClick={onGenerateRisk}
              disabled={actionLoading === 'risk'}
            >
              {actionLoading === 'risk' ? 'Generating...' : 'Generate risk'}
            </button>
          </div>
          <div className="risk-score">
            <strong>{Math.round(latestRiskScore)}</strong>
            <span className={levelClass(latestRiskLevel)}>{latestRiskLevel}</span>
          </div>
          {risk ? (
            <InsightLists drivers={risk.drivers} actions={risk.recommended_actions} />
          ) : (
            <p className="muted-text">Risk details will appear after generation.</p>
          )}
        </div>
      </section>

      <section className="process-grid">
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">AI advisory</span>
              <h2>Gemini insight</h2>
            </div>
            <button
              type="button"
              onClick={onGenerateInsight}
              disabled={actionLoading === 'insight'}
            >
              {actionLoading === 'insight' ? 'Generating...' : 'Generate insight'}
            </button>
          </div>
          {insight ? (
            <AdvisoryResponse text={insight.response} />
          ) : (
            <p className="muted-text">Generate risk first, then request a farmer-ready advisory.</p>
          )}
        </div>

        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-label">Alert</span>
              <h2>Preview</h2>
            </div>
            <button type="button" onClick={onFetchAlertPreview} disabled={actionLoading === 'alert'}>
              {actionLoading === 'alert' ? 'Loading...' : 'Preview alert'}
            </button>
          </div>
          {alertPreview ? (
            <div className="alert-preview">
              <span className="mode-chip">{alertPreview.mode}</span>
              <dl>
                <div>
                  <dt>To</dt>
                  <dd>{alertPreview.to}</dd>
                </div>
                <div>
                  <dt>Message</dt>
                  <dd>{alertPreview.message}</dd>
                </div>
              </dl>
              {alertPreview.latest_ai_insight ? (
                <details>
                  <summary>AI insight attached</summary>
                  <AdvisoryResponse text={alertPreview.latest_ai_insight} compact />
                </details>
              ) : null}
            </div>
          ) : (
            <p className="muted-text">Preview the simulated SMS after a risk assessment exists.</p>
          )}
        </div>
      </section>
    </div>
  )
}

function AdvisoryResponse({ text, compact = false }: { text: string; compact?: boolean }) {
  const sections = parseAdvisorySections(text)

  return (
    <div className={compact ? 'advisory-sections compact-advisory' : 'advisory-sections'}>
      {sections.map((section) => (
        <article key={section.title}>
          <div className="advisory-heading">
            <span>{section.number}</span>
            <h3>{section.label}</h3>
          </div>
          <div>
            {section.body.split('\n').map((line) =>
              line.startsWith('- ') ? (
                <p className="advisory-bullet" key={line}>
                  {line.slice(2)}
                </p>
              ) : line ? (
                <p key={line}>{line}</p>
              ) : null,
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

function WeatherPanel({ weather }: { weather: WeatherResponse }) {
  const snapshot = weather.snapshot
  const daily = snapshot.raw_response.daily ?? {}
  const days = Array.isArray(daily.time) ? daily.time.slice(0, 7) : []
  const maxTemps = Array.isArray(daily.temperature_2m_max)
    ? daily.temperature_2m_max.slice(0, 7)
    : []
  const rain = Array.isArray(daily.rain_sum)
    ? daily.rain_sum.slice(0, 7)
    : Array.isArray(daily.precipitation_sum)
      ? daily.precipitation_sum.slice(0, 7)
      : []

  return (
    <div className="weather-stack">
      <div className="weather-metrics">
        <MetricValue label="Current" value={snapshot.current_temperature} suffix="deg" />
        <MetricValue label="Max temp" value={snapshot.max_temperature} suffix="deg" />
        <MetricValue label="Min temp" value={snapshot.min_temperature} suffix="deg" />
        <MetricValue label="Rain" value={snapshot.max_rainfall} suffix="mm" />
        <MetricValue label="Wind" value={snapshot.max_wind_speed} suffix="km/h" />
      </div>
      <p className="muted-text">
        {weather.cached ? 'Cached snapshot' : 'Fresh snapshot'} from {snapshot.source}, captured{' '}
        {formatDate(snapshot.created_at)}.
      </p>
      {days.length ? (
        <div className="forecast-bars" aria-label="Daily forecast">
          {days.map((day, index) => {
            const temp = asNumber(maxTemps[index])
            const rainfall = asNumber(rain[index])
            return (
              <div key={String(day)} className="forecast-day">
                <span>{String(day).slice(5)}</span>
                <div className="bar-row">
                  <i style={{ height: `${Math.max((temp ?? 0) * 2, 8)}px` }} />
                  <b style={{ height: `${Math.max((rainfall ?? 0) * 3, 8)}px` }} />
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function MetricValue({
  label,
  value,
  suffix,
}: {
  label: string
  value: number | null
  suffix: string
}) {
  return (
    <div className="weather-value">
      <span>{label}</span>
      <strong>
        {value ?? '--'} <small>{value === null ? '' : suffix}</small>
      </strong>
    </div>
  )
}

function InsightLists({ drivers, actions }: { drivers: string[]; actions: string[] }) {
  return (
    <div className="insight-lists">
      <section className="insight-card-group">
        <h3>Drivers</h3>
        <div className="action-card-list">
          {drivers.map((driver, index) => (
            <article className="action-card driver-card" key={driver}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{driver}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="insight-card-group">
        <h3>Recommended actions</h3>
        <div className="action-card-list">
          {actions.map((action, index) => (
            <article className="action-card recommendation-card" key={action}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <p>{action}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function HistoryView({
  isLoading,
  weatherHistory,
  riskHistory,
  insightHistory,
}: {
  isLoading: boolean
  weatherHistory: WeatherSnapshot[]
  riskHistory: RiskAssessment[]
  insightHistory: AIInsight[]
}) {
  return (
    <div className="view-stack">
      {isLoading ? <div className="panel muted-panel">Loading history...</div> : null}
      <section className="history-grid">
        <HistoryPanel title="Weather snapshots" items={weatherHistory} />
        <HistoryPanel title="Risk assessments" items={riskHistory} />
        <HistoryPanel title="AI insights" items={insightHistory} />
      </section>
    </div>
  )
}

function HistoryPanel({
  title,
  items,
}: {
  title: string
  items: Array<WeatherSnapshot | RiskAssessment | AIInsight>
}) {
  return (
    <div className="panel history-panel">
      <div className="panel-header">
        <div>
          <span className="panel-label">History</span>
          <h2>{title}</h2>
        </div>
        <span className="count-chip">{items.length}</span>
      </div>
      {items.length ? (
        <div className="history-list">
          {items.slice(0, 8).map((item) => (
            <article key={item.id}>
              <strong>{'level' in item ? item.level : 'model' in item ? item.model : item.source}</strong>
              <span>{formatDate(item.created_at)}</span>
              {'score' in item ? <p>Score {item.score}</p> : null}
              {'response' in item ? <p>{item.response.slice(0, 150)}</p> : null}
              {'current_temperature' in item ? <p>Current temp {item.current_temperature ?? '--'}</p> : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="muted-text">No records yet.</p>
      )}
    </div>
  )
}

export default App
