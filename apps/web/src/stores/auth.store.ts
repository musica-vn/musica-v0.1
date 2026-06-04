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

const readPersistedAuth = (): PersistedAuth | null => {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as unknown
    if (typeof parsed !== 'object' || parsed === null) return null

    const accessToken = (parsed as any).accessToken
    const user = (parsed as any).user
    if (typeof accessToken !== 'string') return null
    if (typeof user !== 'object' || user === null) return null

    return { accessToken, user: user as AuthUser }
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
