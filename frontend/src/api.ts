import type { ApiErrorPayload } from './types'

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? 'http://127.0.0.1:8000/api'

export function formatApiError(payload: ApiErrorPayload, fallback: string) {
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

export async function apiRequest<T>(path: string, options: RequestInit = {}) {
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
