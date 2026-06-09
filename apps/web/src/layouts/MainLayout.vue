<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth.store'
import AdminThemeToggle from '../components/features/admin-shell/AdminThemeToggle.vue'

type AdminNavItem = {
  label: string
  icon: string
  to: string
}

type AdminNavGroup = {
  label: string
  items: AdminNavItem[]
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
const isUserMenuOpen = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

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

const closeUserMenu = () => {
  isUserMenuOpen.value = false
}

const toggleUserMenu = () => {
  isUserMenuOpen.value = !isUserMenuOpen.value
}

const handleUserMenuLogout = async () => {
  closeUserMenu()
  await logout()
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
      label: 'Kiểm duyệt & Pháp lý',
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
      label: 'Nền tảng số',
      icon: 'pi pi-youtube',
      to: '/admin/settings/digital-rights',
    },
    {
      label: 'Quyền sử dụng vật lý',
      icon: 'pi pi-building',
      to: '/admin/settings/physical-rights',
    },
    {
      label: 'Cấu hình biểu hiện',
      icon: 'pi pi-images',
      to: '/admin/settings/expression-configs',
    },
    {
      label: 'Cấu hình biến đổi',
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
  // Tạm ẩn khỏi sidebar cho đến khi module user management được triển khai hoàn chỉnh.
  // {
  //   label: 'Người mua',
  //   icon: 'pi pi-users',
  //   to: '/admin/users/buyers',
  // },
  // {
  //   label: 'Nghệ sĩ',
  //   icon: 'pi pi-microphone',
  //   to: '/admin/users/artists',
  // },
]

const navigationGroups = computed<AdminNavGroup[]>(() => {
  const managementItems = primaryNavItems.value.filter((item) =>
    [
      '/admin/dashboard',
      '/admin/products',
      '/admin/certificates',
      '/admin/admins',
    ].includes(item.to),
  )

  const contentItems = [
    ...primaryNavItems.value.filter((item) => item.to === '/admin/compliance'),
    ...userNavItems,
  ]

  const configurationItems = primaryNavItems.value.filter((item) =>
    item.to.startsWith('/admin/settings/'),
  )

  return [
    { label: 'Quản lý', items: managementItems },
    { label: 'Nội dung', items: contentItems },
    { label: 'Cấu hình', items: configurationItems },
  ].filter((group) => group.items.length > 0)
})

const pageTitle = computed(() =>
  typeof route.meta.title === 'string' ? route.meta.title : 'Quản trị Musica',
)

const roleBadges = computed(() =>
  authStore.user?.roleName ? [authStore.user.roleName] : [],
)
const userInitial = computed(() => authStore.user?.fullName?.slice(0, 1)?.toUpperCase() || 'A')
const userRoleLabel = computed(() => authStore.user?.roleName || 'Admin')

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
    ? 'flex flex-col items-center gap-3 border-b px-3 py-4 [border-color:var(--admin-border)]'
    : 'flex items-center justify-between gap-3 border-b px-4 py-4 [border-color:var(--admin-border)]',
)

const getNavLinkClass = (targetPath: string, collapsed = false) => [
  'group relative flex items-center gap-3 rounded-[20px] border px-3 py-3 transition duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-ring)] focus-visible:ring-offset-2 [--tw-ring-offset-color:var(--admin-surface-0)]',
  collapsed ? 'justify-center px-2' : '',
  isRouteActive(targetPath)
    ? 'border-transparent bg-[color:var(--admin-primary-600)] text-white shadow-[0_12px_28px_rgb(var(--admin-primary-rgb)/0.18)]'
    : 'border-transparent bg-transparent text-[color:var(--admin-sidebar-text-muted)] hover:border-transparent hover:bg-[color:var(--admin-sidebar-hover-bg)] hover:text-[color:var(--admin-sidebar-text)] active:bg-[color:var(--admin-sidebar-hover-bg)]',
]

const getNavIconClass = (targetPath: string) =>
  isRouteActive(targetPath)
    ? 'text-white'
    : 'text-[color:var(--admin-sidebar-text-muted)] group-hover:text-[color:var(--admin-sidebar-text)]'

watch(
  () => route.fullPath,
  () => {
    isMobileDrawerOpen.value = false
    isUserMenuOpen.value = false
  },
)

watch(isMobileDrawerOpen, (nextValue) => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = nextValue ? 'hidden' : ''
})

onBeforeUnmount(() => {
  if (typeof document === 'undefined') return
  document.body.style.overflow = ''
  document.removeEventListener('pointerdown', handleGlobalPointerDown)
  document.removeEventListener('keydown', handleGlobalKeyDown)
})

const handleGlobalPointerDown = (event: PointerEvent) => {
  if (!isUserMenuOpen.value) return
  if (!(event.target instanceof Node)) return
  if (userMenuRef.value?.contains(event.target)) return
  isUserMenuOpen.value = false
}

const handleGlobalKeyDown = (event: KeyboardEvent) => {
  if (event.key === 'Escape') {
    isUserMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleGlobalPointerDown)
  document.addEventListener('keydown', handleGlobalKeyDown)
})
</script>

<template>
  <div class="admin-shell min-h-screen bg-[color:var(--admin-surface-1)] text-[color:var(--admin-text)]">
    <div
      class="mx-auto flex min-h-screen w-full max-w-[1920px] flex-col gap-4 px-3 py-3 sm:gap-5 sm:px-4 sm:py-4 lg:grid lg:gap-6 lg:px-6 lg:py-6"
      :class="sidebarGridClass"
    >
      <aside class="hidden lg:sticky lg:top-6 lg:block lg:h-[calc(100svh-3rem)]">
        <div class="flex h-full flex-col overflow-visible rounded-[32px] border bg-[color:var(--admin-sidebar-bg)] shadow-[var(--admin-elev-2)] backdrop-blur [border-color:var(--admin-sidebar-border)]">
          <div :class="sidebarHeaderClass">
            <RouterLink
              to="/admin/dashboard"
              class="inline-flex items-center gap-3 rounded-2xl bg-[color:var(--admin-sidebar-surface)] px-3 py-2 text-sm font-semibold text-[color:var(--admin-sidebar-text)] transition duration-150 hover:bg-[color:var(--admin-sidebar-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-ring)] focus-visible:ring-offset-2 [--tw-ring-offset-color:var(--admin-sidebar-bg)]"
              :class="isSidebarCollapsed ? 'justify-center px-2' : ''"
              title="Musica Admin"
            >
              <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--admin-brand-gradient-start),var(--admin-brand-gradient-end))] text-[color:var(--admin-brand-contrast)] shadow-[var(--admin-glow)]">
                <i class="pi pi-sparkles" />
              </span>
              <span v-if="!isSidebarCollapsed" class="whitespace-nowrap">Musica</span>
            </RouterLink>

            <button
              type="button"
              class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-[color:var(--admin-sidebar-surface)] text-[color:var(--admin-sidebar-text)] transition duration-150 hover:border-[color:var(--admin-sidebar-border)] hover:bg-[color:var(--admin-sidebar-hover-bg)] hover:text-[color:var(--admin-sidebar-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-ring)] focus-visible:ring-offset-2 [border-color:var(--admin-sidebar-border)] [--tw-ring-offset-color:var(--admin-sidebar-bg)]"
              :title="isSidebarCollapsed ? 'Mở rộng sidebar' : 'Thu gọn sidebar'"
              @click="toggleSidebar"
            >
              <i :class="sidebarIconClass" />
            </button>
          </div>

          <nav class="flex-1 overflow-x-visible overflow-y-auto px-3 py-4 no-scrollbar">
            <section
              v-for="group in navigationGroups"
              :key="group.label"
              class="pb-6 last:pb-0"
            >
              <div
                v-if="!isSidebarCollapsed"
                class="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--admin-sidebar-text-muted)]"
              >
                {{ group.label }}
              </div>
              <div
                v-else
                class="mx-3 mb-5 h-px bg-[color:var(--admin-sidebar-border)]"
              />
              <div class="space-y-2">
                <RouterLink
                  v-for="item in group.items"
                  :key="item.to"
                  :to="item.to"
                  :class="getNavLinkClass(item.to, isSidebarCollapsed)"
                  :title="item.label"
                >
                  <div
                    class="flex h-5 w-5 shrink-0 items-center justify-center text-base transition"
                    :class="getNavIconClass(item.to)"
                  >
                    <i :class="item.icon" />
                  </div>
                  <span
                    v-if="isSidebarCollapsed"
                    class="pointer-events-none absolute left-full top-1/2 z-20 ml-3 -translate-y-1/2 whitespace-nowrap rounded-xl border bg-[color:var(--admin-surface-0)] px-3 py-2 text-xs font-semibold text-[color:var(--admin-text)] opacity-0 shadow-[var(--admin-elev-1)] transition duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 [border-color:var(--admin-border)]"
                  >
                    {{ item.label }}
                  </span>
                  <div v-if="!isSidebarCollapsed" class="min-w-0">
                    <div class="truncate text-sm font-semibold">{{ item.label }}</div>
                  </div>
                </RouterLink>
              </div>
            </section>
          </nav>
        </div>
      </aside>

      <div
        v-if="isMobileDrawerOpen"
        class="fixed inset-0 z-50 lg:hidden"
      >
        <button
          type="button"
          class="absolute inset-0 bg-[rgba(15,23,32,0.56)]"
          aria-label="Đóng menu điều hướng"
          @click="closeMobileDrawer"
        />
        <aside class="relative h-[100svh] w-[min(88vw,320px)] overflow-y-auto border-r bg-[color:var(--admin-sidebar-bg)] p-4 shadow-[var(--admin-elev-2)] [border-color:var(--admin-sidebar-border)]">
          <div class="mb-4 flex items-center justify-between gap-3 border-b pb-4 [border-color:var(--admin-sidebar-border)]">
            <RouterLink
              to="/admin/dashboard"
              class="inline-flex min-w-0 items-center gap-3 rounded-2xl bg-[color:var(--admin-sidebar-surface)] px-3 py-2 text-sm font-semibold text-[color:var(--admin-sidebar-text)] transition duration-150 hover:bg-[color:var(--admin-sidebar-hover-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-ring)] focus-visible:ring-offset-2 [--tw-ring-offset-color:var(--admin-sidebar-bg)]"
              @click="closeMobileDrawer"
            >
              <span class="flex h-10 w-10 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--admin-brand-gradient-start),var(--admin-brand-gradient-end))] text-[color:var(--admin-brand-contrast)] shadow-[var(--admin-glow)]">
                <i class="pi pi-sparkles" />
              </span>
              <span class="truncate">Musica</span>
            </RouterLink>

            <button
              type="button"
              class="inline-flex h-11 w-11 items-center justify-center rounded-2xl border bg-[color:var(--admin-sidebar-surface)] text-[color:var(--admin-sidebar-text)] transition duration-150 hover:border-[color:var(--admin-sidebar-border)] hover:bg-[color:var(--admin-sidebar-hover-bg)] hover:text-[color:var(--admin-sidebar-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-ring)] focus-visible:ring-offset-2 [border-color:var(--admin-sidebar-border)] [--tw-ring-offset-color:var(--admin-sidebar-bg)]"
              aria-label="Đóng menu điều hướng"
              @click="closeMobileDrawer"
            >
              <i class="pi pi-times" />
            </button>
          </div>

          <div class="mb-4 rounded-[24px] border bg-[color:var(--admin-sidebar-surface)] p-4 [border-color:var(--admin-sidebar-border)]">
            <div class="flex items-center gap-3">
              <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--admin-brand-gradient-start),var(--admin-brand-gradient-end))] text-base font-semibold text-[color:var(--admin-brand-contrast)] shadow-[var(--admin-glow)]">
                {{ authStore.user?.fullName?.slice(0, 1)?.toUpperCase() || 'A' }}
              </div>
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold text-[color:var(--admin-sidebar-text)]">
                  {{ authStore.user?.fullName || 'Admin' }}
                </div>
                <div class="truncate text-xs text-[color:var(--admin-sidebar-text-muted)]">
                  {{ authStore.user?.email }}
                </div>
              </div>
            </div>
          </div>

          <nav class="space-y-6">
            <section v-for="group in navigationGroups" :key="`mobile-${group.label}`" class="space-y-3">
              <div class="px-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--admin-sidebar-text-muted)]">
                {{ group.label }}
              </div>
              <RouterLink
                v-for="item in group.items"
                :key="item.to"
                :to="item.to"
                :class="getNavLinkClass(item.to)"
                :title="item.label"
              >
                <div
                  class="flex h-5 w-5 shrink-0 items-center justify-center text-base transition"
                  :class="getNavIconClass(item.to)"
                >
                  <i :class="item.icon" />
                </div>
                <div class="min-w-0">
                  <div class="truncate text-sm font-semibold">{{ item.label }}</div>
                </div>
              </RouterLink>
            </section>
          </nav>
        </aside>
      </div>

      <main class="flex min-w-0 flex-col gap-4 sm:gap-5 lg:gap-6">
        <header class="rounded-[24px] border bg-[color:var(--admin-surface-0)] p-4 shadow-[var(--admin-elev-1)] backdrop-blur [border-color:var(--admin-border)] sm:p-5 lg:rounded-[28px]">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div class="flex min-w-0 items-start gap-3">
              <button
                type="button"
                class="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-[color:var(--admin-surface-0)] text-[color:var(--admin-text-muted)] transition duration-150 hover:border-[color:rgb(var(--admin-primary-rgb)/0.22)] hover:bg-[color:var(--admin-primary-50)] hover:text-[color:var(--admin-primary-800)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-ring)] focus-visible:ring-offset-2 [border-color:var(--admin-border)] [--tw-ring-offset-color:var(--admin-surface-0)] lg:hidden"
                aria-label="Mở menu điều hướng"
                @click="openMobileDrawer"
              >
                <i class="pi pi-bars" />
              </button>

              <div class="min-w-0 space-y-2">
                <div class="flex min-w-0 items-center gap-2 text-sm font-semibold text-[color:var(--admin-text)]">
                  <i class="pi pi-compass" />
                  <span class="truncate">{{ pageTitle }}</span>
                </div>
                <div class="text-xs text-[color:var(--admin-text-muted)]">
                  Điều hướng nhanh và quản trị tập trung cho toàn bộ hệ thống Musica.
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end">
              <div ref="userMenuRef" class="relative">
                <button
                  type="button"
                  class="flex min-w-0 items-center gap-3 rounded-2xl border bg-[linear-gradient(135deg,var(--admin-surface-1),var(--admin-accent-50))] px-4 py-3 text-left transition duration-150 hover:border-[color:rgb(var(--admin-primary-rgb)/0.22)] hover:bg-[linear-gradient(135deg,var(--admin-surface-0),var(--admin-primary-50))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-ring)] focus-visible:ring-offset-2 [border-color:var(--admin-border)] [--tw-ring-offset-color:var(--admin-surface-0)]"
                  :aria-expanded="isUserMenuOpen"
                  aria-haspopup="menu"
                  @click="toggleUserMenu"
                >
                  <div class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--admin-brand-gradient-start),var(--admin-brand-gradient-end))] text-base font-semibold text-[color:var(--admin-brand-contrast)] shadow-[var(--admin-glow)]">
                    {{ userInitial }}
                  </div>
                  <div class="min-w-0">
                    <div class="truncate text-sm font-semibold text-[color:var(--admin-text)]">
                      {{ authStore.user?.fullName || 'Admin' }}
                    </div>
                    <div class="truncate text-xs text-[color:var(--admin-text-muted)]">
                      {{ authStore.user?.email }}
                    </div>
                  </div>
                  <span
                    class="hidden rounded-full border bg-[color:var(--admin-surface-0)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)] [border-color:var(--admin-border)] xl:inline-flex"
                  >
                    {{ userRoleLabel }}
                  </span>
                  <i
                    class="pi pi-chevron-down ml-1 shrink-0 text-xs text-[color:var(--admin-text-muted)] transition duration-150"
                    :class="isUserMenuOpen ? 'rotate-180 text-[color:var(--admin-text)]' : ''"
                  />
                </button>

                <div
                  v-if="isUserMenuOpen"
                  class="absolute right-0 top-[calc(100%+0.75rem)] z-30 w-[min(92vw,320px)] rounded-[24px] border bg-[color:var(--admin-surface-0)] p-3 shadow-[var(--admin-elev-2)] [border-color:var(--admin-border)]"
                >
                  <div class="rounded-[20px] bg-[color:var(--admin-surface-1)] px-4 py-3">
                    <div class="truncate text-sm font-semibold text-[color:var(--admin-text)]">
                      {{ authStore.user?.fullName || 'Admin' }}
                    </div>
                    <div class="mt-1 truncate text-xs text-[color:var(--admin-text-muted)]">
                      {{ authStore.user?.email }}
                    </div>
                    <div class="mt-2 flex flex-wrap gap-2">
                      <span
                        v-for="role in roleBadges"
                        :key="role"
                        class="rounded-full bg-[color:var(--admin-surface-0)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]"
                      >
                        {{ role }}
                      </span>
                    </div>
                  </div>

                  <div class="mt-3 grid gap-2">
                    <button
                      type="button"
                      class="inline-flex w-full items-center justify-start gap-2 rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 py-3 text-sm font-semibold text-[color:var(--admin-text-muted)] opacity-60 [border-color:var(--admin-border)]"
                      disabled
                    >
                      <i class="pi pi-key" />
                      Đổi mật khẩu
                    </button>
                    <button
                      type="button"
                      class="inline-flex w-full items-center justify-start gap-2 rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 py-3 text-sm font-semibold text-[color:var(--admin-text)] transition duration-150 hover:border-[color:rgb(var(--admin-danger-rgb)/0.26)] hover:bg-[color:var(--admin-danger-50)] hover:text-[color:var(--admin-danger-700)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-ring)] focus-visible:ring-offset-2 [border-color:var(--admin-border)] [--tw-ring-offset-color:var(--admin-surface-0)]"
                      @click="handleUserMenuLogout"
                    >
                      <i class="pi pi-sign-out" />
                      Đăng xuất
                    </button>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-3 sm:justify-end">
                <AdminThemeToggle />
              </div>
            </div>
          </div>
        </header>
        <RouterView />
      </main>
    </div>
  </div>
</template>
