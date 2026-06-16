import { afterEach, describe, expect, it, vi } from 'vitest'
import { API_BASE_URL, apiRequest, formatApiError } from './api'

function jsonResponse(data: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('formatApiError', () => {
  it('prefers detail and error messages from backend payloads', () => {
    expect(formatApiError({ detail: 'Token expired.' }, 'Fallback')).toBe('Token expired.')
    expect(formatApiError({ error: 'Invalid farm.' }, 'Fallback')).toBe('Invalid farm.')
  })

  it('flattens field validation messages and falls back for empty payloads', () => {
    expect(formatApiError({ username: ['Already taken'], email: 'Invalid email' }, 'Fallback')).toBe(
      'username: Already taken email: Invalid email',
    )
    expect(formatApiError(null, 'Fallback')).toBe('Fallback')
    expect(formatApiError({}, 'Fallback')).toBe('Fallback')
  })
})

describe('apiRequest', () => {
  it('derives the API URL from the frontend environment', () => {
    expect(API_BASE_URL).toBe('https://farmguard-01jl.onrender.com/api')
  })

  it('adds JSON headers and returns parsed data for successful responses', async () => {
    const fetchMock = vi.fn(() => jsonResponse({ ok: true }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(apiRequest<{ ok: boolean }>('/health/')).resolves.toEqual({ ok: true })
    expect(fetchMock).toHaveBeenCalledWith(
      `${API_BASE_URL}/health/`,
      expect.objectContaining({
        headers: expect.objectContaining({
          Accept: 'application/json',
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('throws formatted backend errors for failed responses', async () => {
    vi.stubGlobal('fetch', vi.fn(() => jsonResponse({ detail: 'Not found.' }, 404)))

    await expect(apiRequest('/missing/')).rejects.toThrow('Not found.')
  })
})
