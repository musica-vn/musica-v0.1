import { apiPost } from '../api/axios'
import type { AuthLoginData } from '../types/auth.types'

export const login = async (payload: { email: string; password: string }) => {
  const result = await apiPost<AuthLoginData, typeof payload>('/auth/login', payload)
  return result.data
}

