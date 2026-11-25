type StorageArea = 'session' | 'local'

function getArea(area: StorageArea): Storage | null {
  try {
    return area === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

export const storage = {
  get(key: string, area: StorageArea = 'session'): string | null {
    try {
      return getArea(area)?.getItem(key) ?? null
    } catch {
      return null
    }
  },

  set(key: string, value: string, area: StorageArea = 'session'): void {
    try {
      getArea(area)?.setItem(key, value)
    } catch {
      // Quota or privacy-mode failures must not break the app.
    }
  },

  remove(key: string, area: StorageArea = 'session'): void {
    try {
      getArea(area)?.removeItem(key)
    } catch {
      // Ignore.
    }
  },
}
