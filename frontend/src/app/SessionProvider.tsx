import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useNavigate } from 'react-router-dom'
import { queryClient } from '@/app/providers'
import { logout } from '@/features/auth/api'
import { resetUnauthorizedState, setUnauthorizedHandler } from '@/lib/apiClient'
import {
  clearToken,
  fetchCurrentUser,
  readToken,
  writeToken,
  type SessionUser,
} from '@/lib/session'
import { runSessionCleanups } from '@/lib/sessionCleanup'
import { clearSessionExpired } from '@/lib/tokenStorage'

export type SessionStatus = 'checking' | 'authenticated' | 'anonymous'

export interface SignInSession {
  token: string
  user: SessionUser
}

export interface SessionContextValue {
  token: string | null
  user: SessionUser | null
  status: SessionStatus
  signIn: (session: SignInSession) => void
  signOut: () => Promise<void>
  refreshSession: () => Promise<SessionUser | null>
  abandonSession: () => void
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [token, setToken] = useState<string | null>(() => readToken())
  const [user, setUser] = useState<SessionUser | null>(null)
  const [status, setStatus] = useState<SessionStatus>(() =>
    readToken() ? 'checking' : 'anonymous',
  )

  const statusRef = useRef(status)
  const tokenRef = useRef(token)
  const inFlightCheck = useRef<Promise<SessionUser | null> | null>(null)

  const applyAnonymous = useCallback(() => {
    clearToken()
    tokenRef.current = null
    statusRef.current = 'anonymous'
    setToken(null)
    setUser(null)
    setStatus('anonymous')
  }, [])

  const applyAuthenticated = useCallback((nextToken: string, nextUser: SessionUser) => {
    tokenRef.current = nextToken
    statusRef.current = 'authenticated'
    setToken(nextToken)
    setUser(nextUser)
    setStatus('authenticated')
  }, [])

  const refreshSession = useCallback((): Promise<SessionUser | null> => {
    if (!readToken()) {
      applyAnonymous()
      return Promise.resolve(null)
    }

    if (inFlightCheck.current) {
      return inFlightCheck.current
    }

    const check = fetchCurrentUser()
      .then((nextUser) => {
        const activeToken = readToken()
        if (!nextUser || !activeToken) {
          applyAnonymous()
          return null
        }
        applyAuthenticated(activeToken, nextUser)
        return nextUser
      })
      .catch(() => {
        applyAnonymous()
        return null
      })
      .finally(() => {
        inFlightCheck.current = null
      })

    inFlightCheck.current = check
    return check
  }, [applyAnonymous, applyAuthenticated])

  const abandonSession = useCallback(() => {
    inFlightCheck.current = null
    applyAnonymous()
    resetUnauthorizedState()
  }, [applyAnonymous])

  const signIn = useCallback(
    ({ token: nextToken, user: nextUser }: SignInSession) => {
      writeToken(nextToken)
      resetUnauthorizedState()
      clearSessionExpired()
      applyAuthenticated(nextToken, nextUser)
      queryClient.clear()
    },
    [applyAuthenticated],
  )

  const signOut = useCallback(async () => {
    const activeToken = tokenRef.current ?? readToken()
    const request = activeToken
      ? logout(activeToken).catch(() => undefined)
      : Promise.resolve()

    applyAnonymous()
    resetUnauthorizedState()
    clearSessionExpired()
    queryClient.clear()
    runSessionCleanups()
    navigate('/auth', { replace: true })

    await request
  }, [applyAnonymous, navigate])

  const handleUnauthorized = useCallback(() => {
    if (statusRef.current !== 'authenticated') {
      return
    }

    applyAnonymous()
    queryClient.clear()
    runSessionCleanups()
  }, [applyAnonymous])

  useEffect(() => {
    setUnauthorizedHandler(handleUnauthorized)
    return () => setUnauthorizedHandler(null)
  }, [handleUnauthorized])

  useEffect(() => {
    if (statusRef.current === 'checking') {
      void refreshSession()
    }
  }, [refreshSession])

  const value = useMemo(
    () => ({
      token,
      user,
      status,
      signIn,
      signOut,
      refreshSession,
      abandonSession,
    }),
    [token, user, status, signIn, signOut, refreshSession, abandonSession],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext)
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider')
  }
  return context
}
