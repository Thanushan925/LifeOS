import { request } from './client'

export type User = {
  id: string
  email: string
  display_name: string
  is_active: boolean
}

export type RegisterData = {
  email: string
  password: string
  display_name: string
}

export type LoginData = {
  email: string
  password: string
}

export function register(data: RegisterData): Promise<User> {
  return request<User>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function login(data: LoginData): Promise<User> {
  return request<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export function getMe(): Promise<User> {
  return request<User>('/auth/me')
}

export function logout(): Promise<void> {
  return request<void>('/auth/logout', {
    method: 'POST',
  })
}

export function updateProfile(displayName: string): Promise<User> {
  return request<User>('/settings/profile', {
    method: 'PATCH',
    body: JSON.stringify({ display_name: displayName }),
  })
}
