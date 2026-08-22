import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { isRole } from '../config/roles'
import { authApi } from '../services/authApi'

const AuthContext = createContext(null)
const TOKEN_KEY = 'sports-injury-token'
const USER_KEY = 'sports-injury-current-user'

function readLocalUser() {
  try {
    const user = JSON.parse(localStorage.getItem(USER_KEY))
    return user && isRole(user.role) ? user : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(readLocalUser)
  const [loading, setLoading] = useState(true)

  // Verify authenticated session with PostgreSQL backend on app mount
  useEffect(() => {
    async function restoreSession() {
      const token = localStorage.getItem(TOKEN_KEY)
      if (!token) {
        setLoading(false)
        return
      }

      try {
        const response = await authApi.getMe()
        if (response?.user && isRole(response.user.role)) {
          setCurrentUser(response.user)
          localStorage.setItem(USER_KEY, JSON.stringify(response.user))
        } else {
          localStorage.removeItem(TOKEN_KEY)
          localStorage.removeItem(USER_KEY)
          setCurrentUser(null)
        }
      } catch (err) {
        console.warn('Session verification failed, using stored state or resetting:', err.message)
      } finally {
        setLoading(false)
      }
    }

    restoreSession()
  }, [])

  const login = async ({ email, password, role }) => {
    if (!isRole(role)) throw new Error('A valid role is required to sign in.')

    const data = await authApi.login({ email, password, role })
    if (data?.token && data?.user) {
      localStorage.setItem(TOKEN_KEY, data.token)
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      setCurrentUser(data.user)
      return data.user
    }
    throw new Error('Authentication succeeded but invalid response format received.')
  }

  const register = async (athleteData) => {
    const data = await authApi.register({ ...athleteData, role: 'athlete' })
    return data
  }

  const updateProfile = async (updates) => {
    if (!currentUser) return null
    const data = await authApi.updateProfile(updates)
    if (data?.user) {
      localStorage.setItem(USER_KEY, JSON.stringify(data.user))
      setCurrentUser(data.user)
      return data.user
    }
    return currentUser
  }

  const logout = async () => {
    try {
      await authApi.logout()
    } catch {
      // ignore network errors on logout
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
      setCurrentUser(null)
    }
  }

  const forgotPassword = async (email) => {
    return authApi.forgotPassword({ email })
  }

  const resetPassword = async (email, newPassword) => {
    return authApi.resetPassword({ email, newPassword })
  }

  const value = useMemo(
    () => ({
      currentUser,
      loading,
      login,
      register,
      logout,
      updateProfile,
      forgotPassword,
      resetPassword,
      isAuthenticated: Boolean(currentUser),
      userRole: currentUser?.role || null,
      userName: currentUser?.name || '',
    }),
    [currentUser, loading]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider.')
  return context
}
