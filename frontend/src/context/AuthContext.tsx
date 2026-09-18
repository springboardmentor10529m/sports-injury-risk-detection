import { createContext, useContext, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loginUser, registerUser, roleHome } from '../services/auth'
import type { RegisterUserInput, Role, User } from '../types/user'

interface AuthState {
  user: User | null
  login: (email: string, password: string) => Promise<void>
  register: (input: RegisterUserInput) => Promise<void>
  loginAs: (role: Role) => void
  updateUser: (updatedUser: Partial<User>) => void
  logout: () => void
}

const DEMO_USERS: Record<Role, User> = {
  athlete: {
    id: 'demo-athlete-id',
    name: 'Alex Morgan',
    email: 'athlete@motionguard.local',
    role: 'athlete',
    country: 'United States',
    dateOfBirthOrAge: '24',
    phone: '+1 555-014-9922',
    emailVerified: true,
  },
  coach: {
    id: 'demo-coach-id',
    name: 'Coach Marcus',
    email: 'coach@motionguard.local',
    role: 'coach',
    country: 'United States',
    phone: '+1 555-019-2834',
    emailVerified: true,
  },
  admin: {
    id: 'demo-admin-id',
    name: 'System Admin',
    email: 'admin@motionguard.local',
    role: 'admin',
    emailVerified: true,
  },
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('motionguard_user')
    return saved ? (JSON.parse(saved) as User) : null
  })
  const navigate = useNavigate()

  const value = useMemo<AuthState>(
    () => ({
      user,
      async login(email, password) {
        const next = await loginUser(email, password)
        setUser(next)
        localStorage.setItem('motionguard_user', JSON.stringify(next))
        navigate(roleHome[next.role])
      },
      async register(input) {
        const next = await registerUser(input)
        setUser(next)
        localStorage.setItem('motionguard_user', JSON.stringify(next))
        navigate(roleHome[next.role])
      },
      async loginAs(role) {
        const demo = DEMO_USERS[role]
        try {
          // Attempt backend login so session & database match
          const loggedIn = await loginUser(demo.email, 'password123')
          setUser(loggedIn)
          localStorage.setItem('motionguard_user', JSON.stringify(loggedIn))
          navigate(roleHome[loggedIn.role])
        } catch {
          // Fallback to preconfigured demo user if backend is starting or offline
          setUser(demo)
          localStorage.setItem('motionguard_user', JSON.stringify(demo))
          navigate(roleHome[demo.role])
        }
      },
      updateUser(updated) {
        setUser((prev) => {
          if (!prev) return prev
          const next = { ...prev, ...updated }
          localStorage.setItem('motionguard_user', JSON.stringify(next))
          return next
        })
      },
      logout() {
        setUser(null)
        localStorage.removeItem('motionguard_user')
        navigate('/login')
      },
    }),
    [navigate, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider')
  return context
}
