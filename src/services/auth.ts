import type { RegisterUserInput, Role, User } from '../types/user'
import { apiRequest } from './api'

const usersKey = 'motionguard_users_json'

export function readUsers(): User[] {
  const saved = localStorage.getItem(usersKey)
  return saved ? JSON.parse(saved) as User[] : []
}

export function saveUsers(users: User[]) {
  localStorage.setItem(usersKey, JSON.stringify(users, null, 2))
}

export async function loginUser(email: string, password: string): Promise<User> {
  return apiRequest<User>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
}

export async function registerUser(input: RegisterUserInput): Promise<User> {
  return apiRequest<User>('/auth/register', { method: 'POST', body: JSON.stringify(input) })
}

export async function updateUserApi(userId: string, data: Partial<User>): Promise<User> {
  return apiRequest<User>(`/users/${userId}`, { method: 'PUT', body: JSON.stringify(data) })
}

export const roleHome: Record<Role, string> = {
  athlete: '/athlete/dashboard',
  coach: '/coach/dashboard',
  admin: '/admin/dashboard',
}
