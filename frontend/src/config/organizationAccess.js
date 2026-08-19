import { ROLES } from './roles'

export const MEMBERSHIP_STATUS = Object.freeze({
  INDEPENDENT: 'independent',
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  REMOVED: 'removed',
})

export function isOrganizationRole(role) {
  return [ROLES.COACH, ROLES.PHYSIOTHERAPIST, ROLES.ADMIN].includes(role)
}

export function hasActiveOrganizationMembership(user) {
  return Boolean(
    user?.organizationId &&
    user?.organizationName &&
    user?.membershipStatus === MEMBERSHIP_STATUS.ACTIVE
  )
}

export function createIndependentAthleteAccount({ name, email, password }) {
  return {
    id: `demo-athlete-${email.trim().toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
    name: name.trim(),
    email: email.trim(),
    password,
    role: ROLES.ATHLETE,
    organizationId: null,
    organizationName: null,
    membershipStatus: MEMBERSHIP_STATUS.INDEPENDENT,
  }
}
