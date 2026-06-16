import { describe, expect, it } from 'vitest'
import {
  asNumber,
  belongsToFarm,
  farmToForm,
  formatDate,
  levelClass,
  newestByCreatedAt,
  titleCase,
} from './formatters'
import type { Farm } from './types'

const farm: Farm = {
  id: 'farm-1',
  owner: 'paul',
  name: 'Tea Farm',
  county: 'Kericho',
  latitude: '-0.367',
  longitude: '35.283',
  crop_type: 'tea',
  land_acres: '12.50',
  notes: null,
  latest_risk_score: 42,
  latest_risk_level: 'MEDIUM',
  created_at: '2026-06-16T06:00:00Z',
  updated_at: '2026-06-16T07:00:00Z',
}

describe('formatters', () => {
  it('formats dates, labels, numbers, and risk classes', () => {
    expect(formatDate()).toBe('Not available')
    expect(formatDate('2026-06-16T08:00:00Z')).toBe('16 Jun 2026, 11:00')
    expect(titleCase('mixed_crop')).toBe('Mixed Crop')
    expect(asNumber('12.5')).toBe(12.5)
    expect(asNumber('')).toBeNull()
    expect(levelClass('HIGH')).toBe('risk-badge risk-high')
  })

  it('maps farm records into editable form state', () => {
    expect(farmToForm(farm)).toEqual({
      name: 'Tea Farm',
      county: 'Kericho',
      latitude: '-0.367',
      longitude: '35.283',
      crop_type: 'tea',
      land_acres: '12.50',
      notes: '',
    })
  })

  it('matches farm-owned records and selects newest records by created date', () => {
    expect(belongsToFarm('farm-1', 'farm-1')).toBe(true)
    expect(belongsToFarm('farm-2', 'farm-1')).toBe(false)

    expect(
      newestByCreatedAt([
        { id: 'older', created_at: '2026-06-16T06:00:00Z' },
        { id: 'newer', created_at: '2026-06-16T08:00:00Z' },
      ])?.id,
    ).toBe('newer')
  })
})
