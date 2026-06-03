<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../auth/auth.store'
import AdminThemeToggle from '../components/AdminThemeToggle.vue'

type AdminNavItem = {
  label: string
  icon: string
  to: string
}

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const logout = async () => {
  authStore.logout()
  await router.replace('/login')
}

const SIDEBAR_STORAGE_KEY = 'musica_admin_sidebar_collapsed_v1'
const isSidebarCollapsed = ref(false)
const isMobileDrawerOpen = ref(false)

if (typeof window !== 'undefined') {
  isSidebarCollapsed.value = window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true'
}

watch(isSidebarCollapsed, (nextValue) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(nextValue))
})

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}

const openMobileDrawer = () => {
  isMobileDrawerOpen.value = true
}

const closeMobileDrawer = () => {
  isMobileDrawerOpen.value = false
}

const primaryNavItems = computed<AdminNavItem[]>(() => {
  const items: AdminNavItem[] = [
    {
      label: 'Bảng điều khiển',
      icon: 'pi pi-chart-bar',
      to: '/admin/dashboard',
    },
    {
      label: 'Quản lý sản phẩm',
      icon: 'pi pi-wave-pulse',
      to: '/admin/products',
    },
    {
      label: 'Pháp lý & kiểm duyệt',
      icon: 'pi pi-verified',
      to: '/admin/compliance',
    },
    {
      label: 'Quản lý chứng chỉ',
      icon: 'pi pi-file-pdf',
      to: '/admin/certificates',
    },
    {
      label: 'Quyền cốt lõi',
      icon: 'pi pi-sliders-h',
      to: '/admin/settings/permissions',
    },
    {
      label: 'Quyền nền tảng số',
      icon: 'pi pi-youtube',
      to: '/admin/settings/digital-rights',
    },
    {
      label: 'Quyền sử dụng vật lý',
      icon: 'pi pi-building',
      to: '/admin/settings/physical-rights',
    },
    {
      label: 'Hình thức biểu hiện',
      icon: 'pi pi-images',
      to: '/admin/settings/expression-configs',
    },
    {
      label: 'Mức độ biến đổi',
      icon: 'pi pi-wrench',
      to: '/admin/settings/modification-configs',
    },
  ]

  if (authStore.isSuperAdmin) {
    items.splice(1, 0, {
      label: 'Quản trị viên',
      icon: 'pi pi-shield',
      to: '/admin/admins',
    })
  }

  return items
})

const userNavItems: AdminNavItem[] = [
  {
    label: 'Người mua',
    icon: 'pi pi-users',
    to: '/admin/users/buyers',
  },
  {
    label: 'Nghệ sĩ',
    icon: 'pi pi-microphone',
    to: '/admin/users/artists',
  },
]

const navigationItems = computed(() => [...primaryNavItems.value, ...userNavItems])

const pageTitle = computed(() =>
  typeof route.meta.title === 'string' ? route.meta.title : 'Quản trị Musica',
)

const roleBadges = computed(() =>
  authStore.user?.roleName ? [authStore.user.roleName] : [],
)

const isRouteActive = (targetPath: string) =>
  route.path === targetPath || route.path.startsWith(`${targetPath}/`)

const sidebarGridClass = computed(() =>
  isSidebarCollapsed.value
    ? 'lg:grid-cols-[96px_minmax(0,1fr)]'
    : 'lg:grid-cols-[300px_minmax(0,1fr)]',
)

const sidebarIconClass = computed(() =>
  isSidebarCollapsed.value ? 'pi pi-angle-right' : 'pi pi-angle-left',
)

const sidebarHeaderClass = computed(() =>
  isSidebarCollapsed.value
    ? 'flex flex-col items-center gap-3 border-b border-slate-200/80 px-3 py-4 dark:border-slate-800'
    : 'flex items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-4 dark:border-slate-800',
)

const getNavLinkClass = (targetPath: string, collapsed = false) => [
  'group flex items-center gap-3 rounded-[22px] border px-3 py-3 transition',
  collapsed ? 'justify-center px-2' : '',
  isRouteActive(targetPath)
    ? 'border-transparent bg-violet-50 text-violet-700 shadow-sm dark:bg-violet-500/10 dark:text-violet-200'
    : 'border-transparent bg-transparent text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-950/60 dark:hover:text-white',
]

const getNavIconClass = (targetPath: string) =>
  isRouteActive(targetPath)
    ? 'bg-white text-violet-700 shadow-sm dark:bg-slate-950 dark:text-violet-200'
    : 'bg-slate-100 text-slate-500 group-hover:text-slate-700 dark:bg-slate-950/60 dark:text-slate-300 dark:group-hover:text-slate-100'

watch(
  () => route.fullPath,
  () => {
    isMobileDrawerOpen.value = false
  },
)

watch(isMobileDrawerOpen, (nextValue) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = nextValue ? 'hidden' : ''
})

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = ''
})
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div
      class="mx-auto flex min-h-screen w-full max-w-[1920px] flex-col gap-4 px-3 py-3 sm:gap-5 sm:px-4 sm:py-4 lg:grid lg:gap-6 lg:px-6 lg:py-6"
      :class="sidebarGridClass"
    >
      <aside class="hidden lg:sticky lg:top-6 lg:block lg:h-[calc(100svh-3rem)]">
        <div class="flex h-full flex-col overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/92 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/88 dark:shadow-black/30">
          <div :class="sidebarHeaderClass">
            <RouterLink
              to="/admin/dashboard"
              class="inline-flex items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-violet-100 hover:text-violet-700 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:bg-violet-500/10 dark:hover:text-violet-200"
              :class="isSidebarCollapsed ? 'justify-center px-2' : ''"
              title="Musica Admin"
            >
              <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20">
                <i class="pi pi-sparkles" />
              </span>
              <span v-if="!isSidebarCollapsed" class="whitespace-nowrap">Musica</span>
            </RouterLink>

            <button
              type="button"
              class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
              :title="isSidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'"
              @click="toggleSidebar"
            >
              <i :class="sidebarIconClass" />
            </button>
          </div>

          <nav class="flex-1 overflow-y-auto px-3 py-4 no-scrollbar">
            <RouterLink
              v-for="item in navigationItems"
              :key="item.to"
              :to="item.to"
              :class="getNavLinkClass(item.to, isSidebarCollapsed)"
              :title="item.label"
            >
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition"
                :class="getNavIconClass(item.to)"
              >
                <i :class="item.icon" />
              </div>
              <div v-if="!isSidebarCollapsed" class="min-w-0">
                <div class="truncate text-sm font-semibold">{{ item.label }}</div>
              </div>
            </RouterLink>
          </nav>
        </div>
      </aside>

      <div
        v-if="isMobileDrawerOpen"
        class="fixed inset-0 z-50 lg:hidden"
      >
        <button
          type="button"
          class="absolute inset-0 bg-slate-950/50"
          aria-label="Đóng menu điều hướng"
          @click="closeMobileDrawer"
        />
        <aside class="relative h-[100svh] w-[min(88vw,320px)] overflow-y-auto border-r border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
          <div class="mb-4 flex items-center justify-between gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800">
            <RouterLink
              to="/admin/dashboard"
              class="inline-flex min-w-0 items-center gap-3 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800 transition hover:bg-violet-100 hover:text-violet-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-violet-500/10 dark:hover:text-violet-200"
              @click="closeMobileDrawer"
            >
              <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-500/20">
                <i class="pi pi-sparkles" />
              </span>
              <span class="truncate">Musica</span>
            </RouterLink>

            <button
              type="button"
              class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white"
              aria-label="Đóng menu điều hướng"
              @click="closeMobileDrawer"
            >
              <i class="pi pi-times" />
            </button>
          </div>

          <div class="mb-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
            <div class="flex items-center gap-3">
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-base font-semibold text-white">
                {{ authStore.user?.fullName?.slice(0, 1)?.toUpperCase() || 'A' }}
              </div>
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {{ authStore.user?.fullName || 'Admin' }}
                </div>
                <div class="truncate text-xs text-slate-500 dark:text-slate-400">
                  {{ authStore.user?.email }}
                </div>
              </div>
            </div>
          </div>

          <nav class="flex flex-col gap-2">
            <RouterLink
              v-for="item in navigationItems"
              :key="item.to"
              :to="item.to"
              :class="getNavLinkClass(item.to)"
              :title="item.label"
            >
              <div
                class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl transition"
                :class="getNavIconClass(item.to)"
              >
                <i :class="item.icon" />
              </div>
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold">{{ item.label }}</div>
              </div>
            </RouterLink>
          </nav>
        </aside>
      </div>

      <main class="flex min-w-0 flex-col gap-4 sm:gap-5 lg:gap-6">
        <header class="rounded-[24px] border border-slate-200/80 bg-white/92 p-4 shadow-[0_18px_55px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/88 dark:shadow-black/30 sm:p-5 lg:rounded-[28px]">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex min-w-0 items-start gap-3">
              <button
                type="button"
                class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white lg:hidden"
                aria-label="Mở menu điều hướng"
                @click="openMobileDrawer"
              >
                <i class="pi pi-bars" />
              </button>

              <div class="min-w-0 space-y-2">
                <div class="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                  <i class="pi pi-compass" />
                  <span class="truncate">{{ pageTitle }}</span>
                </div>
                <div class="text-xs text-slate-500 dark:text-slate-400">
                  Điều hướng nhanh và quản trị tập trung cho toàn bộ hệ thống Musica.
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end">
              <div class="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
                <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-base font-semibold text-white">
                  {{ authStore.user?.fullName?.slice(0, 1)?.toUpperCase() || 'A' }}
                </div>
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold text-slate-900 dark:text-white">
                    {{ authStore.user?.fullName || 'Admin' }}
                  </div>
                  <div class="truncate text-xs text-slate-500 dark:text-slate-400">
                    {{ authStore.user?.email }}
                  </div>
                </div>
                <div class="hidden flex-wrap gap-2 2xl:flex">
                  <span
                    v-for="role in roleBadges"
                    :key="role"
                    class="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    {{ role }}
                  </span>
                </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-3 sm:justify-end">
                <AdminThemeToggle />
                <button
                  type="button"
                  class="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-rose-500/30 dark:hover:text-rose-300 sm:w-auto"
                  @click="logout"
                >
                  <i class="pi pi-sign-out" />
                  Đăng xuất
                </button>
              </div>
            </div>
          </div>
        </header>
        <RouterView />
      </main>
    </div>
  </div>
</template>
