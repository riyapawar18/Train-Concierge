export const MAX_TRAVEL_DAYS = 120

const DISPLAY_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

export function toIsoDate(value: Date): string {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`
}

export function todayIso(): string {
  return toIsoDate(new Date())
}

export function maxTravelIso(): string {
  return addDaysIso(todayIso(), MAX_TRAVEL_DAYS)
}

export function parseIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day)
}

export function formatDisplayDate(iso: string): string {
  const date = parseIsoDate(iso)
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()}`
}

export function parseDisplayDate(input: string): string | null {
  const match = DISPLAY_PATTERN.exec(input.trim())
  if (!match) {
    return null
  }
  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const date = new Date(year, month - 1, day)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }
  return toIsoDate(date)
}

export interface TravelDateResult {
  iso?: string
  error?: string
}

export function validateTravelDate(input: string): TravelDateResult {
  if (!input.trim()) {
    return { error: 'Choose a travel date.' }
  }
  const iso = parseDisplayDate(input)
  if (!iso) {
    return { error: 'Enter the date as DD/MM/YYYY.' }
  }
  const today = todayIso()
  if (iso < today) {
    return { error: 'Travel date cannot be in the past.' }
  }
  if (iso > maxTravelIso()) {
    return { error: `Choose a date within the next ${MAX_TRAVEL_DAYS} days.` }
  }
  return { iso }
}

export function addDaysIso(iso: string, days: number): string {
  const date = parseIsoDate(iso)
  date.setDate(date.getDate() + days)
  return toIsoDate(date)
}

export function isIsoWithinWindow(iso: string): boolean {
  return iso >= todayIso() && iso <= maxTravelIso()
}

export function formatHeaderDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parseIsoDate(iso))
}

export function formatLongDate(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(parseIsoDate(iso))
}
