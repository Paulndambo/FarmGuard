import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanAdvisoryText, parseAdvisorySections } from './advisory'
import App from './App'

const apiBase = 'http://127.0.0.1:8000/api'

const user = {
  id: 'user-1',
  username: 'paul',
  email: 'paul@example.com',
  first_name: 'Paul',
  last_name: 'Ndambo',
  full_name: 'Paul Ndambo',
  status: 'active',
  tier: 'free',
  date_joined: '2026-06-16T06:00:00Z',
}

const farm = {
  id: 'farm-1',
  owner: 'paul',
  name: "Paul's Maize Farm",
  county: 'Bomet',
  latitude: '-0.7812000',
  longitude: '35.3416000',
  crop_type: 'maize',
  land_acres: '30.00',
  notes: 'Near a river valley',
  latest_risk_score: 73,
  latest_risk_level: 'HIGH',
  created_at: '2026-06-16T06:00:00Z',
  updated_at: '2026-06-16T07:00:00Z',
}

const snapshot = {
  id: 'weather-1',
  farm: 'farm-1',
  source: 'open_meteo',
  raw_response: {
    daily: {
      time: ['2026-06-16', '2026-06-17'],
      temperature_2m_max: [25, 27],
      rain_sum: [4, 8],
    },
  },
  current_temperature: 18.5,
  max_temperature: 27,
  min_temperature: 12,
  max_rainfall: 8,
  max_wind_speed: 22,
  created_at: '2026-06-16T08:00:00Z',
}

const assessment = {
  id: 'risk-1',
  farm: 'farm-1',
  weather_snapshot: 'weather-1',
  score: 73,
  level: 'HIGH',
  drivers: ['Heavy rainfall is expected.', 'Strong wind may affect young crops.'],
  recommended_actions: ['Check drainage channels.', 'Secure temporary structures.'],
  created_at: '2026-06-16T08:10:00Z',
}

const insight = {
  id: 'insight-1',
  farm: 'farm-1',
  risk_assessment: 'risk-1',
  model: 'gemini-test',
  prompt: 'prompt',
  response:
    'Jambo! **1. Situation Summary**\nPaul farm has high weather risk.\n\n2. Key Risks\n- Heavy rainfall is expected.\n\n3. Recommended Actions\n- Check drainage channels.',
  created_at: '2026-06-16T08:20:00Z',
}

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

function mockFetch(handler: (url: URL, init: RequestInit) => Promise<Response>) {
  const fetchMock = vi.fn((input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = new URL(String(input))
    return handler(url, init)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function mockAuthenticatedApi() {
  return mockFetch((url, init) => {
    const method = init.method ?? 'GET'
    const path = url.href.replace(apiBase, '')

    if (path === '/me/') return jsonResponse({ user })
    if (path === '/farms/dashboard/') {
      return jsonResponse({
        summary: {
          total_farms: 1,
          high_risk_farms: 1,
          medium_risk_farms: 0,
          low_risk_farms: 0,
          unknown_risk_farms: 0,
        },
        farms: [farm],
      })
    }
    if (path === '/farms/farm-1/' && method === 'GET') return jsonResponse(farm)
    if (path === '/weather-snapshots/') return jsonResponse([snapshot])
    if (path === '/risk-assessments/') return jsonResponse([assessment])
    if (path === '/ai-insights/') return jsonResponse([insight])
    if (path === '/farms/farm-1/alert-preview/') {
      return jsonResponse({
        mode: 'simulation',
        to: 'No phone number provided',
        message: 'FarmGuard Alert: high risk.',
        ai_insight_available: true,
        latest_ai_insight: insight.response,
      })
    }

    return jsonResponse({ detail: `Unhandled ${method} ${path}` }, 404)
  })
}

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('App authentication', () => {
  it('renders the registration form by default', () => {
    mockFetch(() => jsonResponse({}))

    render(<App />)

    expect(screen.getByRole('heading', { name: 'Weather-risk intelligence for Kenyan farms' })).toBeInTheDocument()
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument()
  })

  it('switches between registration and login forms', async () => {
    mockFetch(() => jsonResponse({}))

    render(<App />)

    await userEvent.click(screen.getByRole('button', { name: 'Login' }))

    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument()
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
    expect(screen.queryByLabelText('Confirm password')).not.toBeInTheDocument()
  })

  it('registers a user, stores tokens, and loads the dashboard', async () => {
    const fetchMock = mockFetch((url, init) => {
      const path = url.href.replace(apiBase, '')

      if (path === '/auth/register/' && init.method === 'POST') {
        return jsonResponse({
          message: 'User registered successfully.',
          user,
          tokens: { access: 'access-token', refresh: 'refresh-token' },
        }, 201)
      }
      if (path === '/me/') return jsonResponse({ user })
      if (path === '/farms/dashboard/') {
        return jsonResponse({
          summary: {
            total_farms: 0,
            high_risk_farms: 0,
            medium_risk_farms: 0,
            low_risk_farms: 0,
            unknown_risk_farms: 0,
          },
          farms: [],
        })
      }

      return jsonResponse({ detail: 'not found' }, 404)
    })

    render(<App />)

    await userEvent.type(screen.getByLabelText('First name'), 'Paul')
    await userEvent.type(screen.getByLabelText('Last name'), 'Ndambo')
    await userEvent.type(screen.getByLabelText('Username'), 'paul')
    await userEvent.type(screen.getByLabelText('Email'), 'paul@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'StrongPass123!')
    await userEvent.type(screen.getByLabelText('Confirm password'), 'StrongPass123!')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('User registered successfully.')).toBeInTheDocument()
    expect(localStorage.getItem('farmguard_access')).toBe('access-token')
    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBase}/auth/register/`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('restores an existing session and shows farms from the dashboard endpoint', async () => {
    localStorage.setItem('farmguard_access', 'access-token')
    localStorage.setItem('farmguard_refresh', 'refresh-token')
    mockAuthenticatedApi()

    render(<App />)

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    expect(await screen.findByText("Paul's Maize Farm")).toBeInTheDocument()
    expect(screen.getByText('HIGH')).toBeInTheDocument()
  })
})

describe('Farm workflows', () => {
  it('creates a farm from the dashboard form', async () => {
    localStorage.setItem('farmguard_access', 'access-token')
    localStorage.setItem('farmguard_refresh', 'refresh-token')

    const fetchMock = mockFetch((url, init) => {
      const path = url.href.replace(apiBase, '')
      const method = init.method ?? 'GET'

      if (path === '/me/') return jsonResponse({ user })
      if (path === '/farms/dashboard/') {
        return jsonResponse({
          summary: {
            total_farms: method === 'GET' ? 0 : 1,
            high_risk_farms: 0,
            medium_risk_farms: 0,
            low_risk_farms: 0,
            unknown_risk_farms: 0,
          },
          farms: [],
        })
      }
      if (path === '/farms/' && method === 'POST') return jsonResponse(farm, 201)
      if (path === '/farms/farm-1/' && method === 'GET') return jsonResponse(farm)
      if (path === '/weather-snapshots/') return jsonResponse([])
      if (path === '/risk-assessments/') return jsonResponse([])
      if (path === '/ai-insights/') return jsonResponse([])

      return jsonResponse({ detail: `Unhandled ${method} ${path}` }, 404)
    })

    render(<App />)

    await screen.findByRole('heading', { name: 'Dashboard' })
    await userEvent.type(screen.getByLabelText('Farm name'), "Paul's Maize Farm")
    await userEvent.type(screen.getByLabelText('County'), 'Bomet')
    await userEvent.type(screen.getByLabelText('Latitude'), '-0.7812')
    await userEvent.type(screen.getByLabelText('Longitude'), '35.3416')
    await userEvent.clear(screen.getByLabelText('Acres'))
    await userEvent.type(screen.getByLabelText('Acres'), '30')
    await userEvent.type(screen.getByLabelText('Notes'), 'Tea and maize near a river valley')
    await userEvent.click(screen.getByRole('button', { name: 'Create farm' }))

    expect(await screen.findByRole('heading', { name: 'Farm detail' })).toBeInTheDocument()
    expect(await screen.findByText("Paul's Maize Farm")).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      `${apiBase}/farms/`,
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('hydrates the farm detail page with existing backend weather, risk, insight, and alert data', async () => {
    localStorage.setItem('farmguard_access', 'access-token')
    localStorage.setItem('farmguard_refresh', 'refresh-token')
    mockAuthenticatedApi()

    render(<App />)

    await screen.findByRole('heading', { name: 'Dashboard' })
    await screen.findByText("Paul's Maize Farm")
    await userEvent.click(await screen.findByRole('button', { name: 'View' }))

    expect(await screen.findByRole('heading', { name: 'Farm detail' })).toBeInTheDocument()
    expect(screen.getByText('Cached snapshot from open_meteo, captured 16 Jun 2026, 11:00.')).toBeInTheDocument()
    expect(screen.getAllByText('Heavy rainfall is expected.').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByText('Check drainage channels.').length).toBeGreaterThanOrEqual(2)
    expect(screen.getAllByRole('heading', { name: 'Situation Summary' }).length).toBeGreaterThanOrEqual(1)

    const alertPanel = screen.getByText('FarmGuard Alert: high risk.')
    expect(alertPanel).toBeInTheDocument()
  })

  it('runs weather, risk, insight, and alert actions from the farm detail screen', async () => {
    localStorage.setItem('farmguard_access', 'access-token')
    localStorage.setItem('farmguard_refresh', 'refresh-token')

    const fetchMock = mockFetch((url, init) => {
      const path = url.href.replace(apiBase, '')
      const method = init.method ?? 'GET'

      if (path === '/me/') return jsonResponse({ user })
      if (path === '/farms/dashboard/') {
        return jsonResponse({
          summary: {
            total_farms: 1,
            high_risk_farms: 0,
            medium_risk_farms: 0,
            low_risk_farms: 0,
            unknown_risk_farms: 1,
          },
          farms: [{ ...farm, latest_risk_score: 0, latest_risk_level: 'UNKNOWN' }],
        })
      }
      if (path === '/farms/farm-1/' && method === 'GET') {
        return jsonResponse({ ...farm, latest_risk_score: 0, latest_risk_level: 'UNKNOWN' })
      }
      if (path === '/weather-snapshots/') return jsonResponse([])
      if (path === '/risk-assessments/') return jsonResponse([])
      if (path === '/ai-insights/') return jsonResponse([])
      if (path === '/farms/farm-1/weather/') return jsonResponse({ cached: false, snapshot })
      if (path === '/farms/farm-1/risk/' && method === 'POST') {
        return jsonResponse({ assessment, weather_summary: { max_temperature: 27 } }, 201)
      }
      if (path === '/farms/farm-1/generate-insight/' && method === 'POST') {
        return jsonResponse(insight, 201)
      }
      if (path === '/farms/farm-1/alert-preview/') {
        return jsonResponse({
          mode: 'simulation',
          to: 'No phone number provided',
          message: 'FarmGuard Alert: high risk.',
          ai_insight_available: true,
          latest_ai_insight: insight.response,
        })
      }

      return jsonResponse({ detail: `Unhandled ${method} ${path}` }, 404)
    })

    render(<App />)

    await screen.findByText("Paul's Maize Farm")
    await userEvent.click(await screen.findByRole('button', { name: 'View' }))
    await screen.findByRole('heading', { name: 'Farm detail' })

    await userEvent.click(screen.getByRole('button', { name: 'Fetch' }))
    expect(await screen.findByText('Weather updated.')).toBeInTheDocument()
    expect(screen.getByText('Fresh snapshot from open_meteo, captured 16 Jun 2026, 11:00.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Generate risk' }))
    expect(await screen.findByText('Risk assessment generated.')).toBeInTheDocument()
    expect(screen.getByText('Strong wind may affect young crops.')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Generate insight' }))
    expect(await screen.findByText('AI advisory generated.')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: 'Situation Summary' }).length).toBeGreaterThanOrEqual(1)

    await userEvent.click(screen.getByRole('button', { name: 'Preview alert' }))
    expect(await screen.findByText('Alert preview ready.')).toBeInTheDocument()
    expect(screen.getByText('FarmGuard Alert: high risk.')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(`${apiBase}/farms/farm-1/risk/`, expect.objectContaining({ method: 'POST' }))
  })

  it('loads history records from backend history endpoints', async () => {
    localStorage.setItem('farmguard_access', 'access-token')
    localStorage.setItem('farmguard_refresh', 'refresh-token')
    mockAuthenticatedApi()

    render(<App />)

    await screen.findByRole('heading', { name: 'Dashboard' })
    await userEvent.click(screen.getByRole('button', { name: 'History' }))

    expect(await screen.findByRole('heading', { name: 'History' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Weather snapshots' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Risk assessments' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'AI insights' })).toBeInTheDocument()
    expect(screen.getByText('gemini-test')).toBeInTheDocument()
  })
})

describe('Advisory formatting helpers', () => {
  it('removes greetings and markdown and parses advisory sections', () => {
    const cleaned = cleanAdvisoryText(
      'Here is your advisory:\n\nJambo! **1. Situation Summary**\nPaul farm is at risk.\n\n2) Key Risks\n- Heavy rain.',
    )
    const sections = parseAdvisorySections(cleaned)

    expect(cleaned).not.toContain('Jambo')
    expect(cleaned).not.toContain('**')
    expect(sections).toEqual([
      { title: '1. Situation Summary', number: '1', label: 'Situation Summary', body: 'Paul farm is at risk.' },
      { title: '2. Key Risks', number: '2', label: 'Key Risks', body: '- Heavy rain.' },
    ])
  })
})
