import { computed, ref } from 'vue'

export type AppThemeMode = 'light' | 'dark'

const STORAGE_KEY = 'musica_app_theme_v1'
const themeMode = ref<AppThemeMode>('light')
let initialized = false
let hasExplicitThemeSelection = false

const applyThemeToDom = (mode: AppThemeMode) => {
  if (typeof document === 'undefined') return

  const root = document.documentElement
  root.classList.toggle('app-dark', mode === 'dark')
  root.style.colorScheme = mode

  if (document.body) {
    document.body.classList.toggle('app-dark', mode === 'dark')
  }
}

const readSavedTheme = (): AppThemeMode | null => {
  if (typeof window === 'undefined') return null

  const savedTheme = window.localStorage.getItem(STORAGE_KEY)
  return savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : null
}

const getSystemTheme = (): AppThemeMode => {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

const persistTheme = (mode: AppThemeMode) => {
  if (typeof window === 'undefined') return
  hasExplicitThemeSelection = true
  window.localStorage.setItem(STORAGE_KEY, mode)
}

export const setAppTheme = (mode: AppThemeMode) => {
  themeMode.value = mode
  applyThemeToDom(mode)
  persistTheme(mode)
}

export const initializeAppTheme = () => {
  if (initialized) {
    applyThemeToDom(themeMode.value)
    return
  }

  const savedTheme = readSavedTheme()
  const initialTheme = savedTheme ?? getSystemTheme()
  hasExplicitThemeSelection = savedTheme !== null

  themeMode.value = initialTheme
  applyThemeToDom(initialTheme)

  if (typeof window !== 'undefined') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    mediaQuery.addEventListener('change', (event) => {
      if (hasExplicitThemeSelection) return
      themeMode.value = event.matches ? 'dark' : 'light'
      applyThemeToDom(themeMode.value)
    })
  }

  initialized = true
}

export const useAppTheme = () => {
  const isDarkTheme = computed(() => themeMode.value === 'dark')

  const toggleTheme = () => {
    setAppTheme(isDarkTheme.value ? 'light' : 'dark')
  }

  return {
    themeMode,
    isDarkTheme,
    setTheme: setAppTheme,
    toggleTheme,
  }
}
