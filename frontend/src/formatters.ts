import type { Farm, FarmForm, RiskLevel } from './types'

export function formatDate(value?: string) {
  if (!value) return 'Not available'
  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function titleCase(value: string) {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function asNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function levelClass(level: RiskLevel) {
  return `risk-badge risk-${String(level).toLowerCase()}`
}

export function farmToForm(farm: Farm): FarmForm {
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

export function belongsToFarm(recordFarmId: string, farmId: string) {
  return String(recordFarmId) === String(farmId)
}

export function newestByCreatedAt<T extends { created_at: string }>(items: T[]) {
  return [...items].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
  )[0]
}
