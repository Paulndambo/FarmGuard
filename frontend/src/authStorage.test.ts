import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearTokens, getStoredTokens, storeTokens } from './authStorage'

beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})

describe('auth token storage', () => {
  it('stores, reads, and clears auth tokens', () => {
    expect(getStoredTokens()).toBeNull()

    storeTokens({ access: 'access-token', refresh: 'refresh-token' })
    expect(getStoredTokens()).toEqual({ access: 'access-token', refresh: 'refresh-token' })

    clearTokens()
    expect(getStoredTokens()).toBeNull()
  })
})
