type SessionCleanup = () => void

const cleanups = new Set<SessionCleanup>()

export function registerSessionCleanup(cleanup: SessionCleanup): () => void {
  cleanups.add(cleanup)
  return () => {
    cleanups.delete(cleanup)
  }
}

export function runSessionCleanups(): void {
  for (const cleanup of [...cleanups]) {
    try {
      cleanup()
    } catch {
      // A failing cleanup must not block the others.
    }
  }
}
