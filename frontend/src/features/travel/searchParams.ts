import { QUOTA_OPTIONS, SORT_OPTIONS, TYPE_FILTERS } from './constants'
import { addDaysIso, isIsoWithinWindow } from './date'
import type {
  QuotaCode,
  SearchFilters,
  SearchValues,
  SortCode,
  StationValue,
} from './types'

export const SEARCH_PATH = '/app/search'

const FULL_DAY = 1440

export interface RouteSearch {
  from: StationValue | null
  to: StationValue | null
  date: string
  classCodes: string[]
  quota: QuotaCode
  pwd: boolean
  flexible: boolean
  railPass: boolean
  types: string[]
  depFrom: number
  depTo: number
  arrFrom: number
  arrTo: number
  fromStations: string[]
  toStations: string[]
  sort: SortCode
}

function csv(value: string | null): string[] {
  if (!value) {
    return []
  }
  return value
    .split(',')
    .map((item) => item.trim().toUpperCase())
    .filter((item) => item.length > 0)
}

function oneOf<T extends string>(value: string | null, options: readonly T[], fallback: T): T {
  const normalized = (value ?? '').trim().toUpperCase() as T
  return options.includes(normalized) ? normalized : fallback
}

function flag(value: string | null): boolean {
  return value === '1' || value === 'true'
}

function minutes(value: string | null, fallback: number): number {
  if (value === null || value.trim() === '') {
    return fallback
  }
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) {
    return fallback
  }
  return Math.max(0, Math.min(FULL_DAY, Math.round(parsed)))
}

function window(start: number, end: number): [number, number] {
  return start <= end ? [start, end] : [end, start]
}

function station(code: string | null): StationValue | null {
  const normalized = (code ?? '').trim().toUpperCase()
  return normalized ? { code: normalized, name: normalized } : null
}

export function defaultRoute(): RouteSearch {
  return {
    from: null,
    to: null,
    date: '',
    classCodes: [],
    quota: 'GENERAL',
    pwd: false,
    flexible: false,
    railPass: false,
    types: [],
    depFrom: 0,
    depTo: FULL_DAY,
    arrFrom: 0,
    arrTo: FULL_DAY,
    fromStations: [],
    toStations: [],
    sort: 'DEPARTURE',
  }
}

export function readRouteSearch(params: URLSearchParams): RouteSearch {
  const dateParam = params.get('date') ?? ''
  const [depFrom, depTo] = window(minutes(params.get('depFrom'), 0), minutes(params.get('depTo'), FULL_DAY))
  const [arrFrom, arrTo] = window(minutes(params.get('arrFrom'), 0), minutes(params.get('arrTo'), FULL_DAY))
  return {
    from: station(params.get('from')),
    to: station(params.get('to')),
    date: isIsoWithinWindow(dateParam) ? dateParam : '',
    classCodes: csv(params.get('class')),
    quota: oneOf(
      params.get('quota'),
      QUOTA_OPTIONS.map((option) => option.value),
      'GENERAL',
    ),
    pwd: flag(params.get('pwd')),
    flexible: flag(params.get('flexible')),
    railPass: flag(params.get('railPass')),
    types: csv(params.get('types')),
    depFrom,
    depTo,
    arrFrom,
    arrTo,
    fromStations: csv(params.get('fromStations')),
    toStations: csv(params.get('toStations')),
    sort: oneOf(
      params.get('sort'),
      SORT_OPTIONS.map((option) => option.value),
      'DEPARTURE',
    ),
  }
}

export function buildRouteParams(route: RouteSearch): URLSearchParams {
  const params = new URLSearchParams()
  if (route.from) {
    params.set('from', route.from.code)
  }
  if (route.to) {
    params.set('to', route.to.code)
  }
  if (route.date) {
    params.set('date', route.date)
  }
  if (route.classCodes.length > 0) {
    params.set('class', route.classCodes.join(','))
  }
  if (route.quota !== 'GENERAL') {
    params.set('quota', route.quota)
  }
  if (route.pwd) {
    params.set('pwd', '1')
  }
  if (route.flexible) {
    params.set('flexible', '1')
  }
  if (route.railPass) {
    params.set('railPass', '1')
  }
  if (route.types.length > 0) {
    params.set('types', route.types.join(','))
  }
  if (route.depFrom > 0) {
    params.set('depFrom', String(route.depFrom))
  }
  if (route.depTo < FULL_DAY) {
    params.set('depTo', String(route.depTo))
  }
  if (route.arrFrom > 0) {
    params.set('arrFrom', String(route.arrFrom))
  }
  if (route.arrTo < FULL_DAY) {
    params.set('arrTo', String(route.arrTo))
  }
  if (route.fromStations.length > 0) {
    params.set('fromStations', route.fromStations.join(','))
  }
  if (route.toStations.length > 0) {
    params.set('toStations', route.toStations.join(','))
  }
  if (route.sort !== 'DEPARTURE') {
    params.set('sort', route.sort)
  }
  return params
}

export function hasSearch(route: RouteSearch): boolean {
  return Boolean(route.from && route.to && route.date)
}

export function toSearchFilters(route: RouteSearch): SearchFilters {
  const filters: SearchFilters = {
    from: route.from?.code ?? '',
    to: route.to?.code ?? '',
    date: route.date,
    quota: route.quota,
    sort: route.sort,
  }
  if (route.classCodes.length > 0) {
    filters.classCodes = route.classCodes
  }
  if (route.types.length > 0) {
    filters.types = route.types
  }
  if (route.depFrom > 0) {
    filters.depFrom = route.depFrom
  }
  if (route.depTo < FULL_DAY) {
    filters.depTo = route.depTo
  }
  if (route.arrFrom > 0) {
    filters.arrFrom = route.arrFrom
  }
  if (route.arrTo < FULL_DAY) {
    filters.arrTo = route.arrTo
  }
  if (route.fromStations.length > 0) {
    filters.fromStations = route.fromStations
  }
  if (route.toStations.length > 0) {
    filters.toStations = route.toStations
  }
  return filters
}

function valuesDate(values: SearchValues): string {
  return isIsoWithinWindow(values.date) ? values.date : ''
}

export function routeFromValues(values: SearchValues): RouteSearch {
  return {
    ...defaultRoute(),
    from: values.from,
    to: values.to,
    date: valuesDate(values),
    classCodes: values.classCode ? [values.classCode] : [],
    quota: values.quota,
    pwd: values.pwd,
    flexible: values.flexible,
    railPass: values.railPass,
  }
}

export function valuesFromRoute(route: RouteSearch): SearchValues {
  return {
    from: route.from,
    to: route.to,
    date: route.date,
    classCode: route.classCodes[0] ?? '',
    quota: route.quota,
    pwd: route.pwd,
    flexible: route.flexible,
    railPass: route.railPass,
  }
}

export function hasRefinements(route: RouteSearch): boolean {
  return (
    route.classCodes.length > 0 ||
    route.types.length > 0 ||
    route.fromStations.length > 0 ||
    route.toStations.length > 0 ||
    route.depFrom > 0 ||
    route.depTo < FULL_DAY ||
    route.arrFrom > 0 ||
    route.arrTo < FULL_DAY
  )
}

export function knownTypes(value: string): boolean {
  return TYPE_FILTERS.some((filter) => filter.value === value)
}

export function shiftDate(date: string, days: number): string {
  const next = addDaysIso(date, days)
  return isIsoWithinWindow(next) ? next : date
}

export function canShiftDate(date: string, days: number): boolean {
  return date !== '' && shiftDate(date, days) !== date
}
