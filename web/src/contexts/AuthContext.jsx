import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api, { TOKEN_KEY } from '../lib/api'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const queryClient = useQueryClient()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)))

  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return

    // Only a rejected token signs the user out; network errors and restarts are retried
    const restoreSession = async () => {
      for (let attempt = 0; attempt < 4; attempt++) {
        try {
          const response = await api.get('/auth/me')
          setUser(response.data.user)
          return
        } catch (error) {
          const status = error.response?.status
          if (status === 401 || status === 404) {
            localStorage.removeItem(TOKEN_KEY)
            return
          }
          await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt))
        }
      }
    }
    restoreSession().finally(() => setLoading(false))
  }, [])

  const startSession = useCallback(({ token, user: nextUser }) => {
    localStorage.setItem(TOKEN_KEY, token)
    // A different account must never see the previous account's cached trips
    queryClient.clear()
    setUser(nextUser)
    return nextUser
  }, [queryClient])

  const login = useCallback(async (email, password) => {
    const response = await api.post('/auth/login', { email, password })
    return startSession(response.data)
  }, [startSession])

  const register = useCallback(async (userData) => {
    const response = await api.post('/auth/register', userData)
    return startSession(response.data)
  }, [startSession])

  const loginAsDemo = useCallback(async (userId) => {
    const response = await api.post('/auth/demo', userId ? { userId } : {})
    return startSession(response.data)
  }, [startSession])

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    queryClient.clear()
    setUser(null)
  }, [queryClient])

  const value = useMemo(
    () => ({ user, loading, login, register, loginAsDemo, logout }),
    [user, loading, login, register, loginAsDemo, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
