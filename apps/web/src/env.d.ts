import 'vite/client'

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string
  readonly VITE_ENABLE_QUICK_LOGIN?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
