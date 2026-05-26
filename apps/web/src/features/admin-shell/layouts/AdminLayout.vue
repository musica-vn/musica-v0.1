<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../auth/auth.store'
import AdminThemeToggle from '../components/AdminThemeToggle.vue'

type AdminNavItem = {
  label: string
  description: string
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

const primaryNavItems = computed<AdminNavItem[]>(() => {
  const items: AdminNavItem[] = [
    {
      label: 'Dashboard',
      description: 'Tổng quan nhanh toàn bộ hệ thống',
      icon: 'pi pi-chart-bar',
      to: '/admin/dashboard',
    },
    {
      label: 'Quản lý track',
      description: 'Điều phối audio, trạng thái và metadata',
      icon: 'pi pi-wave-pulse',
      to: '/admin/tracks',
    },
    {
      label: 'Quản lý chứng chỉ',
      description: 'Theo dõi chứng chỉ và template HTML',
      icon: 'pi pi-file-pdf',
      to: '/admin/certificates',
    },
  ]

  if (authStore.isSuperAdmin) {
    items.splice(1, 0, {
      label: 'Admin list',
      description: 'Quản trị tài khoản nội bộ và quyền truy cập',
      icon: 'pi pi-shield',
      to: '/admin/admins',
    })
  }

  return items
})

const userNavItems: AdminNavItem[] = [
  {
    label: 'Người mua',
    description: 'Buyer accounts và trạng thái hoạt động',
    icon: 'pi pi-users',
    to: '/admin/users/buyers',
  },
  {
    label: 'Nghệ sĩ',
    description: 'Artist accounts và dữ liệu quản lý',
    icon: 'pi pi-microphone',
    to: '/admin/users/artists',
  },
]

const pageTitle = computed(() =>
  typeof route.meta.title === 'string' ? route.meta.title : 'Quản trị Musica',
)

const pageSubtitle = computed(() => {
  if (route.path.startsWith('/admin/tracks')) return 'Theo dõi nội dung âm thanh và xuất bản'
  if (route.path.startsWith('/admin/certificates')) return 'Quản trị chứng chỉ, template và render HTML'
  if (route.path.startsWith('/admin/admins')) return 'Kiểm soát tài khoản quản trị nội bộ'
  if (route.path.startsWith('/admin/users')) return 'Quản lý buyer và artist theo từng vai trò'
  return 'Không gian điều hành dành cho admin và super-admin'
})

const roleBadges = computed(() => authStore.roles.map((role) => role.replace('_', ' ')))

const isRouteActive = (targetPath: string) =>
  route.path === targetPath || route.path.startsWith(`${targetPath}/`)
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
    <div class="mx-auto grid min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-6 lg:py-6">
      <aside class="lg:sticky lg:top-6 lg:h-[calc(100svh-3rem)]">
        <div class="flex h-full flex-col overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/92 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/88 dark:shadow-black/30">
          <div class="border-b border-slate-200/80 px-6 py-5 dark:border-slate-800">
            <div class="flex items-start justify-between gap-4">
              <div class="space-y-2">
                <div class="inline-flex items-center gap-2 rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                  <span class="h-2.5 w-2.5 rounded-full bg-violet-500" />
                  Admin Shell
                </div>
                <div>
                  <div class="text-xl font-semibold text-slate-950 dark:text-white">Musica Control</div>
                  <div class="text-sm text-slate-500 dark:text-slate-400">
                    Vận hành tập trung cho content và identity management
                  </div>
                </div>
              </div>
              <AdminThemeToggle compact />
            </div>
          </div>

          <div class="flex-1 space-y-6 overflow-y-auto px-4 py-5">
            <section class="rounded-[28px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              <div class="flex items-center gap-3">
                <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-500 text-base font-semibold text-white">
                  {{ authStore.user?.fullName?.slice(0, 1)?.toUpperCase() || 'A' }}
                </div>
                <div class="min-w-0">
                  <div class="truncate font-semibold text-slate-950 dark:text-white">
                    {{ authStore.user?.fullName || 'Admin' }}
                  </div>
                  <div class="truncate text-sm text-slate-500 dark:text-slate-400">
                    {{ authStore.user?.email }}
                  </div>
                </div>
              </div>
              <div class="mt-4 flex flex-wrap gap-2">
                <span
                  v-for="role in roleBadges"
                  :key="role"
                  class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  {{ role }}
                </span>
              </div>
            </section>

            <section class="space-y-3">
              <div class="px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Điều hướng chính
              </div>
              <RouterLink
                v-for="item in primaryNavItems"
                :key="item.to"
                :to="item.to"
                class="flex items-center gap-3 rounded-[24px] border px-4 py-3 transition"
                :class="
                  isRouteActive(item.to)
                    ? 'border-violet-200 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200'
                    : 'border-slate-200/80 bg-white text-slate-700 hover:border-violet-200 hover:text-violet-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-violet-500/30 dark:hover:text-violet-300'
                "
              >
                <div
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  :class="
                    isRouteActive(item.to)
                      ? 'bg-white text-violet-700 dark:bg-slate-950 dark:text-violet-200'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300'
                  "
                >
                  <i :class="item.icon" />
                </div>
                <div class="min-w-0">
                  <div class="font-semibold">{{ item.label }}</div>
                  <div class="truncate text-sm opacity-80">{{ item.description }}</div>
                </div>
              </RouterLink>
            </section>

            <section class="space-y-3">
              <div class="px-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                Người dùng hệ thống
              </div>
              <RouterLink
                v-for="item in userNavItems"
                :key="item.to"
                :to="item.to"
                class="flex items-center gap-3 rounded-[24px] border px-4 py-3 transition"
                :class="
                  isRouteActive(item.to)
                    ? 'border-violet-200 bg-violet-50 text-violet-700 shadow-sm dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-200'
                    : 'border-slate-200/80 bg-white text-slate-700 hover:border-violet-200 hover:text-violet-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 dark:hover:border-violet-500/30 dark:hover:text-violet-300'
                "
              >
                <div
                  class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl"
                  :class="
                    isRouteActive(item.to)
                      ? 'bg-white text-violet-700 dark:bg-slate-950 dark:text-violet-200'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-300'
                  "
                >
                  <i :class="item.icon" />
                </div>
                <div class="min-w-0">
                  <div class="font-semibold">{{ item.label }}</div>
                  <div class="truncate text-sm opacity-80">{{ item.description }}</div>
                </div>
              </RouterLink>
            </section>
          </div>

          <div class="border-t border-slate-200/80 px-4 py-4 dark:border-slate-800">
            <button
              type="button"
              class="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-rose-200 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-rose-500/30 dark:hover:text-rose-300"
              @click="logout"
            >
              <i class="pi pi-sign-out" />
              Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      <main class="flex min-w-0 flex-col gap-6">
        <header class="rounded-[32px] border border-slate-200/80 bg-white/92 px-6 py-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)] backdrop-blur dark:border-slate-800 dark:bg-slate-900/88 dark:shadow-black/30">
          <div class="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div class="space-y-2">
              <div class="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <span class="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                Admin Workspace
              </div>
              <div>
                <h1 class="!m-0 text-3xl font-semibold tracking-tight !text-slate-950 dark:!text-white">
                  {{ pageTitle }}
                </h1>
                <p class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  {{ pageSubtitle }}
                </p>
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-3">
              <div class="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                <div class="font-semibold text-slate-900 dark:text-white">Phiên đăng nhập hiện tại</div>
                <div class="mt-1">{{ authStore.user?.email }}</div>
              </div>
              <AdminThemeToggle />
            </div>
          </div>
        </header>

        <RouterView />
      </main>
    </div>
  </div>
</template>
