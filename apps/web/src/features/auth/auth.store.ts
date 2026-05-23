import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { setHttpBearerToken } from '../../shared/api/http'
import { login } from './auth.api'
import type { AuthLoginData, AuthUser, UserRole } from './auth.types'

const STORAGE_KEY = 'musica_auth_v1'

type PersistedAuth = {
  accessToken: string
  user: AuthUser
  roles: UserRole[]
}

const readPersistedAuth = (): PersistedAuth | null => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return null

    const accessToken = (parsed as any).accessToken
    const user = (parsed as any).user
    const roles = (parsed as any).roles

    if (typeof accessToken !== 'string') return null
    if (typeof user !== 'object' || user === null) return null
    if (!Array.isArray(roles)) return null

    return { accessToken, user: user as AuthUser, roles: roles as UserRole[] }
  } catch {
    return null
  }
}

const writePersistedAuth = (value: PersistedAuth | null) => {
  if (!value) {
    localStorage.removeItem(STORAGE_KEY)
    return
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(null)
  const user = ref<AuthUser | null>(null)
  const roles = ref<UserRole[]>([])

  const isAuthenticated = computed(() => typeof accessToken.value === 'string' && accessToken.value.length > 0)
  const isAdmin = computed(() => roles.value.includes('ADMIN') || roles.value.includes('SUPER_ADMIN'))
  const isSuperAdmin = computed(() => roles.value.includes('SUPER_ADMIN'))

  const init = () => {
    const persisted = readPersistedAuth()
    if (!persisted) return

    accessToken.value = persisted.accessToken
    user.value = persisted.user
    roles.value = persisted.roles
    setHttpBearerToken(persisted.accessToken)
  }

  const applyLogin = (data: AuthLoginData) => {
    accessToken.value = data.accessToken
    user.value = data.user
    roles.value = data.roles

    setHttpBearerToken(data.accessToken)
    writePersistedAuth({ accessToken: data.accessToken, user: data.user, roles: data.roles })
  }

  const doLogin = async (payload: { email: string; password: string }) => {
    const data = await login(payload)
    applyLogin(data)
    return data
  }

  const logout = () => {
    accessToken.value = null
    user.value = null
    roles.value = []
    setHttpBearerToken(undefined)
    writePersistedAuth(null)
  }

  init()

  return { accessToken, user, roles, isAuthenticated, isAdmin, isSuperAdmin, login: doLogin, logout }
})
