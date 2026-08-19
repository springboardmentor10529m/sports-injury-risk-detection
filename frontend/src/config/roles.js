export const ROLES = Object.freeze({
  ATHLETE: 'athlete',
  COACH: 'coach',
  PHYSIOTHERAPIST: 'physiotherapist',
  ADMIN: 'admin',
})

export const ROLE_VALUES = Object.freeze(Object.values(ROLES))

export const ROLE_LABELS = Object.freeze({
  [ROLES.ATHLETE]: 'Athlete',
  [ROLES.COACH]: 'Coach',
  [ROLES.PHYSIOTHERAPIST]: 'Physiotherapist',
  [ROLES.ADMIN]: 'Admin',
})

export const ROLE_DASHBOARDS = Object.freeze({
  [ROLES.ATHLETE]: '/athlete/dashboard',
  [ROLES.COACH]: '/coach/dashboard',
  [ROLES.PHYSIOTHERAPIST]: '/physiotherapist/dashboard',
  [ROLES.ADMIN]: '/admin/dashboard',
})

export function isRole(value) {
  return ROLE_VALUES.includes(value)
}
