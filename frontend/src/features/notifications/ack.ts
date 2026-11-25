import { storage } from '@/lib/storage'

const STORAGE_KEY = 'trainconcierge.acked-disruptions'
const MAX_ENTRIES = 100

function readKeys(): string[] {
  const raw = storage.get(STORAGE_KEY, 'session')
  if (!raw) {
    return []
  }
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed.filter((item): item is string => typeof item === 'string')
  } catch {
    return []
  }
}

export function isDisruptionAcknowledged(key: string): boolean {
  return readKeys().includes(key)
}

export function acknowledgeDisruption(key: string): void {
  const keys = readKeys().filter((item) => item !== key)
  keys.push(key)
  storage.set(STORAGE_KEY, JSON.stringify(keys.slice(-MAX_ENTRIES)), 'session')
}

export function clearDisruptionAcknowledgements(): void {
  storage.remove(STORAGE_KEY, 'session')
}
