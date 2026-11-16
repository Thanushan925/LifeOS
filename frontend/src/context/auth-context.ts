import { createContext } from 'react'
import type { User, LoginData, RegisterData } from '../api/auth'

export type AuthContextType = {
  user: User | null
  isLoading: boolean
  sessionError: string
  login: (data: LoginData) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => Promise<void>
  updateProfile: (displayName: string) => Promise<void>
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined,
)