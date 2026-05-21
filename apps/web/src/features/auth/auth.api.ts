import { apiPost } from '../../shared/api/http'
import type { AuthLoginData } from './auth.types'

export const login = async (payload: { email: string; password: string }) => {
  const result = await apiPost<AuthLoginData, typeof payload>('/auth/login', payload)
  return result.data
}

