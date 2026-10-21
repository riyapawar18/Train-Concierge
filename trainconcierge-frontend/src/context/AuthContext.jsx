import React, { createContext, useContext, useState, useEffect } from 'react'
import { authApi } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const stored = localStorage.getItem('tc_user')
    const token = localStorage.getItem('tc_token')
    if (stored && token) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        logout()
      }
    }
    setLoading(false)
  }, [])

  const login = async (username, password) => {
    const res = await authApi.login({ username, password })
    const { token, ...userData } = res.data.data
    localStorage.setItem('tc_token', token)
    localStorage.setItem('tc_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const register = async (form) => {
    const res = await authApi.register(form)
    const { token, ...userData } = res.data.data
    localStorage.setItem('tc_token', token)
    localStorage.setItem('tc_user', JSON.stringify(userData))
    setUser(userData)
    return userData
  }

  const logout = () => {
    localStorage.removeItem('tc_token')
    localStorage.removeItem('tc_user')
    setUser(null)
  }

  const isAdmin = () => user?.role === 'ADMIN'
  const isPassenger = () => user?.role === 'PASSENGER'

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, isAdmin, isPassenger }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
