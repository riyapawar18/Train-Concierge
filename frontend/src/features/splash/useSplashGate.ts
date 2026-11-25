import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSession } from '@/app/SessionProvider'
import { homeForRole } from '@/lib/navigation'
import { isSessionUser, type SessionUser } from '@/lib/session'
import { clearSessionExpired } from '@/lib/tokenStorage'
import { delay, withTimeout } from '@/lib/time'

export const SPLASH_MIN_MS = 4000
export const SPLASH_MAX_CHECK_MS = 7000
export const SPLASH_FADE_MS = 300

interface SplashGateState {
  started: boolean
  completed: boolean
  destination: string | null
}

// Module-level so a StrictMode remount (or an accidental re-entry) cannot restart the gate.
const gate: SplashGateState = {
  started: false,
  completed: false,
  destination: null,
}

export function __resetSplashGateForTests(): void {
  gate.started = false
  gate.completed = false
  gate.destination = null
}

export function destinationForUser(user: SessionUser | null): string {
  if (!user) {
    return '/auth'
  }
  return homeForRole(user.role)
}

export function useSplashGate() {
  const navigate = useNavigate()
  const { refreshSession, abandonSession } = useSession()
  const [progress, setProgress] = useState(0)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const startedAt = Date.now()
    const tick = () => {
      const ratio = Math.min(1, (Date.now() - startedAt) / SPLASH_MIN_MS)
      setProgress(ratio)
      if (ratio < 1) {
        frame = requestAnimationFrame(tick)
      }
    }
    let frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    if (gate.started) {
      if (gate.completed && gate.destination) {
        navigate(gate.destination, { replace: true })
      }
      return
    }

    gate.started = true
    let fadeAt: number | null = null
    let checkResolved = false

    const beginFade = () => {
      if (fadeAt !== null) {
        return
      }
      fadeAt = Date.now()
      setFading(true)
    }

    // A fast check fades out at 3.7s so the 300ms fade fits inside the 4s hold.
    const earlyFadeTimer = setTimeout(() => {
      if (checkResolved) {
        beginFade()
      }
    }, SPLASH_MIN_MS - SPLASH_FADE_MS)

    // A hanging check fades from 6.7s so navigation still lands at 7s at the latest.
    const timeoutFadeTimer = setTimeout(beginFade, SPLASH_MAX_CHECK_MS - SPLASH_FADE_MS)

    const run = async () => {
      let checkSettled = false
      const pendingCheck = refreshSession().finally(() => {
        checkSettled = true
      })
      const check = withTimeout(pendingCheck, SPLASH_MAX_CHECK_MS, null)
      const trackedCheck = check.then((user) => {
        checkResolved = true
        return user
      })
      const [, user] = await Promise.all([delay(SPLASH_MIN_MS), trackedCheck])

      const timedOut = !checkSettled
      if (timedOut) {
        abandonSession()
      }

      const sessionUser = !timedOut && isSessionUser(user) ? user : null
      if (!sessionUser) {
        // A cold start with a stale token should not accuse the user of an expired session.
        clearSessionExpired()
      }
      const destination = destinationForUser(sessionUser)
      gate.destination = destination

      if (fadeAt === null) {
        beginFade()
      }
      const wait = Math.max(0, (fadeAt ?? Date.now()) + SPLASH_FADE_MS - Date.now())
      if (wait > 0) {
        await delay(wait)
      }

      clearTimeout(earlyFadeTimer)
      clearTimeout(timeoutFadeTimer)
      gate.completed = true
      navigate(destination, { replace: true })
    }

    // The gate deliberately outlives StrictMode's double mount so the splash only runs once.
    void run()
  }, [navigate, refreshSession, abandonSession])

  return { progress, fading }
}
