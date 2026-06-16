import type { AuthTokens } from './types'

export function getStoredTokens(): AuthTokens | null {
  const access = localStorage.getItem('farmguard_access')
  const refresh = localStorage.getItem('farmguard_refresh')
  return access && refresh ? { access, refresh } : null
}

export function storeTokens(tokens: AuthTokens) {
  localStorage.setItem('farmguard_access', tokens.access)
  localStorage.setItem('farmguard_refresh', tokens.refresh)
}

export function clearTokens() {
  localStorage.removeItem('farmguard_access')
  localStorage.removeItem('farmguard_refresh')
}
