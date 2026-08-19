import { createContext, useContext, useMemo, useState } from 'react'
import { isRole } from '../config/roles'
import { MEMBERSHIP_STATUS } from '../config/organizationAccess'

const AuthContext = createContext(null)
const SESSION_KEY = 'sports-injury-current-user'
const REGISTRATION_KEY = 'sports-injury-demo-registration'
const EDITABLE_PROFILE_FIELDS = ['name', 'phone', 'address', 'height', 'weight', 'sport']

function normalizeText(value, fallback = '') {
  return typeof value === 'string' ? value.trim() : fallback
}

function readSession() {
  try {
    const user = JSON.parse(localStorage.getItem(SESSION_KEY))
    return user && isRole(user.role) ? normalizeUser(user) : null
  } catch {
    return null
  }
}

function normalizeUser(user) {
  const hasOrganization = Boolean(user.organizationId && user.organizationName)
  const email = normalizeText(user.email)
  const derivedName = email ? email.split('@')[0] : 'User'

  return {
    id: user.id || `demo-user-${email.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'unknown'}`,
    name: normalizeText(user.name, derivedName),
    email,
    role: user.role,
    phone: normalizeText(user.phone),
    address: normalizeText(user.address),
    height: normalizeText(user.height),
    weight: normalizeText(user.weight),
    sport: normalizeText(user.sport),
    organizationId: hasOrganization ? user.organizationId : null,
    organizationName: hasOrganization ? user.organizationName : null,
    membershipStatus: user.membershipStatus || (hasOrganization ? MEMBERSHIP_STATUS.INACTIVE : MEMBERSHIP_STATUS.INDEPENDENT),
  }
}

function readRegistrationAccount() {
  try {
    return JSON.parse(localStorage.getItem(REGISTRATION_KEY))
  } catch {
    return null
  }
}

function persistSessionUser(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user))
  localStorage.setItem('currentUser', JSON.stringify(user))
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(readSession)

  const login = (account) => {
    const { role } = account
    if (!isRole(role)) throw new Error('A valid role is required to sign in.')

    const user = normalizeUser(account)

    persistSessionUser(user)
    setCurrentUser(user)
    return user
  }

  const updateProfile = (updates) => {
    if (!currentUser) return null

    const sanitizedUpdates = EDITABLE_PROFILE_FIELDS.reduce((accumulator, field) => {
      if (Object.prototype.hasOwnProperty.call(updates || {}, field)) {
        accumulator[field] = normalizeText(updates[field])
      }
      return accumulator
    }, {})

    const updatedUser = normalizeUser({ ...currentUser, ...sanitizedUpdates })
    persistSessionUser(updatedUser)
    setCurrentUser(updatedUser)

    const registeredAccount = readRegistrationAccount()
    if (registeredAccount && normalizeText(registeredAccount.email).toLowerCase() === updatedUser.email.toLowerCase()) {
      const updatedRegisteredAccount = { ...registeredAccount, ...sanitizedUpdates, name: updatedUser.name }
      localStorage.setItem(REGISTRATION_KEY, JSON.stringify(updatedRegisteredAccount))
    }

    return updatedUser
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    localStorage.removeItem('currentUser')
    setCurrentUser(null)
  }

  const value = useMemo(() => ({
    currentUser,
    login,
    logout,
    updateProfile,
    isAuthenticated: Boolean(currentUser),
    userRole: currentUser?.role || null,
    userName: currentUser?.name || '',
  }), [currentUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider.')
  return context
}
