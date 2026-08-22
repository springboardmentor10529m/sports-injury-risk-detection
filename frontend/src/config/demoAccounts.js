import { ROLES } from './roles'

export const PROFESSIONAL_DEMO_ACCOUNTS_KEY = 'sports-injury-demo-professional-accounts'

const PROFESSIONAL_DEMO_ACCOUNTS = [
  {
    id: 'demo-coach-001',
    name: 'Demo Coach',
    email: 'coach@gmail.com',
    password: 'Coach@123',
    role: ROLES.COACH,
    organizationId: 'ORG-DEMO-001',
    organizationName: 'Demo Sports Organization',
    membershipStatus: 'active',
  },
  {
    id: 'demo-physiotherapist-001',
    name: 'Demo Physiotherapist',
    email: 'physiotherapist@gmail.com',
    password: 'Physio@123',
    role: ROLES.PHYSIOTHERAPIST,
    organizationId: 'ORG-DEMO-001',
    organizationName: 'Demo Sports Organization',
    membershipStatus: 'active',
  },
  {
    id: 'demo-admin-001',
    name: 'System Admin',
    email: 'admin@gmail.com',
    password: 'Admin@123',
    role: ROLES.ADMIN,
    organizationId: 'ORG-DEMO-001',
    organizationName: 'Demo Sports Organization',
    membershipStatus: 'active',
  },
]

export function readDevelopmentDemoAccounts() {
  if (!import.meta.env.DEV) return []

  try {
    const storedAccounts = JSON.parse(localStorage.getItem(PROFESSIONAL_DEMO_ACCOUNTS_KEY))
    if (Array.isArray(storedAccounts) && storedAccounts.length > 0) return storedAccounts

    localStorage.setItem(PROFESSIONAL_DEMO_ACCOUNTS_KEY, JSON.stringify(PROFESSIONAL_DEMO_ACCOUNTS))
    return PROFESSIONAL_DEMO_ACCOUNTS
  } catch {
    return PROFESSIONAL_DEMO_ACCOUNTS
  }
}
