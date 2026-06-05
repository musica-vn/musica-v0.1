import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { setHttpBearerToken } from '../api/axios'
import { login } from '../services/auth.service'
import type { AuthLoginData, AuthUser } from '../types/auth.types'

const STORAGE_KEY = 'musica_auth_v1'

type PersistedAuth = {
  accessToken: string
  user: AuthUser
}

const isUserStatus = (value: unknown): value is AuthUser['status'] =>
  value === 'ACTIVE' || value === 'LOCKED' || value === 'DELETED'

const isUserRoleName = (value: unknown): value is NonNullable<AuthUser['roleName']> =>
  value === 'Super Admin' || value === 'Admin' || value === 'Artist' || value === 'Buyer'

const isAuthUser = (value: unknown): value is AuthUser => {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>

  if (typeof record.id !== 'string' || record.id.length === 0) return false
  if (typeof record.email !== 'string' || record.email.length === 0) return false
  if (typeof record.fullName !== 'string') return false
  if (!isUserStatus(record.status)) return false

  const roleId = record.roleId
  if (roleId !== null && typeof roleId !== 'number') return false

  const roleName = record.roleName
  if (roleName !== null && !isUserRoleName(roleName)) return false

  return true
}

const readPersistedAuth = (): PersistedAuth | null => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return null
    const record = parsed as Record<string, unknown>

    const accessToken = record.accessToken
    const user = record.user
    if (typeof accessToken !== 'string') return null
    if (!isAuthUser(user)) return null

    return { accessToken, user }
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

  const isAuthenticated = computed(() => typeof accessToken.value === 'string' && accessToken.value.length > 0)
  const isAdmin = computed(() => ['Admin', 'Super Admin'].includes(user.value?.roleName ?? ''))
  const isSuperAdmin = computed(() => user.value?.roleName === 'Super Admin')

  const init = () => {
    const persisted = readPersistedAuth()
    if (!persisted) return

    accessToken.value = persisted.accessToken
    user.value = persisted.user
    setHttpBearerToken(persisted.accessToken)
  }

  const applyLogin = (data: AuthLoginData) => {
    accessToken.value = data.accessToken
    user.value = data.user

    setHttpBearerToken(data.accessToken)
    writePersistedAuth({ accessToken: data.accessToken, user: data.user })
  }

  const doLogin = async (payload: { email: string; password: string }) => {
    const data = await login(payload)
    applyLogin(data)
    return data
  }

  const logout = () => {
    accessToken.value = null
    user.value = null
    setHttpBearerToken(undefined)
    writePersistedAuth(null)
  }

  init()

  return { accessToken, user, isAuthenticated, isAdmin, isSuperAdmin, login: doLogin, logout }
})
