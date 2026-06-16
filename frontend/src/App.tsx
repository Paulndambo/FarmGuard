import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { apiRequest } from './api'
import { clearTokens, getStoredTokens, storeTokens } from './authStorage'
import AuthPage from './components/AuthPage'
import DashboardView from './components/DashboardView'
import FarmDetailView from './components/FarmDetailView'
import HistoryView from './components/HistoryView'
import LoadingShell from './components/LoadingShell'
import WorkspaceShell from './components/WorkspaceShell'
import { emptyFarmForm, emptyLoginForm, emptyRegisterForm } from './constants'
import { belongsToFarm, farmToForm, newestByCreatedAt } from './formatters'
import type {
  AIInsight,
  AlertPreview,
  AppView,
  AuthMode,
  AuthTokens,
  DashboardData,
  Farm,
  FarmForm,
  LoginForm,
  RegisterForm,
  RiskAssessment,
  RiskResponse,
  User,
  WeatherResponse,
  WeatherSnapshot,
} from './types'
import './App.css'

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

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setErrorMessage('')
    setStatusMessage('')
  }

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

  if (isRestoringSession) return <LoadingShell />

  if (tokens && user) {
    return (
      <WorkspaceShell
        user={user}
        view={view}
        selectedFarmId={selectedFarmId}
        displayName={displayName}
        statusMessage={statusMessage}
        errorMessage={errorMessage}
        onSetView={setView}
        onRefresh={() => void loadDashboard()}
        onLogout={handleLogout}
      >
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
      </WorkspaceShell>
    )
  }

  return (
    <AuthPage
      mode={mode}
      registerForm={registerForm}
      loginForm={loginForm}
      errorMessage={errorMessage}
      statusMessage={statusMessage}
      isSubmitting={isSubmitting}
      onChangeMode={changeMode}
      onChangeRegisterForm={setRegisterForm}
      onChangeLoginForm={setLoginForm}
      onRegister={handleRegister}
      onLogin={handleLogin}
    />
  )
}

export default App
