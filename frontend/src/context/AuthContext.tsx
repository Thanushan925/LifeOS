import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  getMe,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type LoginData,
  type RegisterData,
  type User,
} from '../api/auth'
import { ApiError } from '../api/client'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionError, setSessionError] = useState('')
  // Prevent a stale session check from overwriting a newer login or logout.
  const revision = useRef(0)

  useEffect(() => {
    let active = true
    const checkSession = async () => {
      const currentRevision = revision.current
      try {
        const currentUser = await getMe()
        if (active && currentRevision === revision.current) {
          setUser(currentUser)
          setSessionError('')
        }
      } catch (error) {
        if (active && currentRevision === revision.current) {
          if (error instanceof ApiError && error.status === 401) {
            setUser(null)
            setSessionError('')
          } else {
            setSessionError(error instanceof Error ? error.message : 'Unable to check your session.')
          }
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }
    const expireSession = () => {
      revision.current += 1
      setUser(null)
      setSessionError('')
    }
    const onFocus = () => { void checkSession() }
    window.addEventListener('lifeos:session-expired', expireSession)
    window.addEventListener('focus', onFocus)
    const timer = window.setInterval(onFocus, 60_000)
    void checkSession()
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('lifeos:session-expired', expireSession)
    }
  }, [])

  const login = async (data: LoginData) => {
    revision.current += 1
    const authenticatedUser = await loginRequest(data)
    revision.current += 1
    setSessionError('')
    setUser(authenticatedUser)
  }

  const register = async (data: RegisterData) => {
    revision.current += 1
    const newUser = await registerRequest(data)
    revision.current += 1
    setSessionError('')
    setUser(newUser)
  }

  const logout = async () => {
    revision.current += 1
    await logoutRequest()
    revision.current += 1
    setSessionError('')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, sessionError, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
