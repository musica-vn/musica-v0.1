<script setup lang="ts">
import Message from 'primevue/message'
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../../auth/auth.store'
import { listAdmins } from '../../admins/admins.api'
import { listManagedUsers } from '../../managed-users/managed-users.api'
import { listAdminCertificates } from '../../certificates/certificates.api'
import { getAdminProductsSummary } from '../../products/products.api'
import { listAdminCompliance } from '../../compliance/compliance.api'
import { listAdminCorePermissions } from '../../core-permissions/core-permissions.api'
import {
  listAdminDigitalRightConfigs,
  listAdminExpressionConfigs,
  listAdminModificationConfigs,
  listAdminPhysicalRightConfigs,
} from '../../licensing-configs/licensing-configs.api'
import type { AdminUser } from '../../admins/admins.types'
import type { ManagedUser } from '../../managed-users/managed-users.types'
import AdminStatCard from '../components/AdminStatCard.vue'

type DashboardStatCard = {
  title: string
  value: number
  description: string
  icon: string
  tone: 'violet' | 'emerald' | 'sky' | 'amber'
}

const authStore = useAuthStore()

const isLoading = ref(false)
const errorMessage = ref<string | null>(null)
const trackTotal = ref(0)
const publishedTracks = ref(0)
const hiddenTracks = ref(0)
const adminTotal = ref(0)
const buyerTotal = ref(0)
const artistTotal = ref(0)
const certificateTotal = ref(0)
const activeCorePermissionTotal = ref(0)
const activeLicensingConfigTotal = ref(0)
const pendingComplianceTotal = ref(0)
const recentAdmins = ref<AdminUser[]>([])
const recentBuyers = ref<ManagedUser[]>([])
const recentArtists = ref<ManagedUser[]>([])

const managedUserTotal = computed(() => buyerTotal.value + artistTotal.value)
const recentUsers = computed(() => [...recentArtists.value, ...recentBuyers.value].slice(0, 6))

const statCards = computed<DashboardStatCard[]>(() => {
  const cards: DashboardStatCard[] = [
    {
      title: 'Tổng product',
      value: trackTotal.value,
      description: `${publishedTracks.value} đang phát hành, ${hiddenTracks.value} đang ẩn`,
      icon: 'pi pi-wave-pulse',
      tone: 'violet' as const,
    },
    {
      title: 'Managed users',
      value: managedUserTotal.value,
      description: `${buyerTotal.value} buyer và ${artistTotal.value} artist`,
      icon: 'pi pi-users',
      tone: 'sky' as const,
    },
    {
      title: 'Certificates',
      value: certificateTotal.value,
      description: 'Tổng chứng chỉ hiện có trên hệ thống',
      icon: 'pi pi-file-pdf',
      tone: 'emerald' as const,
    },
    {
      title: 'Core permissions',
      value: activeCorePermissionTotal.value,
      description: 'Số quyền cốt lõi đang ACTIVE và sẵn sàng để map',
      icon: 'pi pi-sliders-h',
      tone: 'amber' as const,
    },
    {
      title: 'Licensing configs',
      value: activeLicensingConfigTotal.value,
      description: `${pendingComplianceTotal.value} hồ sơ compliance đang chờ xử lý`,
      icon: 'pi pi-sitemap',
      tone: 'sky' as const,
    },
  ]

  if (authStore.isSuperAdmin) {
    cards.splice(1, 0, {
      title: 'Admin accounts',
      value: adminTotal.value,
      description: 'Tài khoản quản trị nội bộ có thể truy cập admin shell',
      icon: 'pi pi-shield',
      tone: 'amber' as const,
    })
  }

  return cards
})

const quickActions = computed(() => {
  const items = [
    {
      title: 'Đi tới product',
      description: 'Quản lý sản phẩm, audio, xuất bản và metadata',
      to: '/admin/products',
      icon: 'pi pi-arrow-up-right',
    },
    {
      title: 'Đi tới users',
      description: 'Quản lý buyer và artist theo vai trò',
      to: '/admin/users/buyers',
      icon: 'pi pi-arrow-up-right',
    },
    {
      title: 'Đi tới certificates',
      description: 'Theo dõi chứng chỉ và template HTML',
      to: '/admin/certificates',
      icon: 'pi pi-arrow-up-right',
    },
    {
      title: 'Đi tới digital rights',
      description: 'Cấu hình pricing và permission set cho nền tảng số',
      to: '/admin/settings/digital-rights',
      icon: 'pi pi-arrow-up-right',
    },
    {
      title: 'Đi tới core permissions',
      description: 'Quản lý tập quyền pháp lý gốc dùng cho toàn hệ thống',
      to: '/admin/settings/permissions',
      icon: 'pi pi-arrow-up-right',
    },
  ]

  if (authStore.isSuperAdmin) {
    items.splice(1, 0, {
      title: 'Đi tới admin list',
      description: 'Kiểm soát tài khoản nội bộ dành cho super-admin',
      to: '/admin/admins',
      icon: 'pi pi-arrow-up-right',
    })
  }

  return items
})

const formatDateTime = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString()
}

const formatRoleNames = (roles: Array<{ roleName: string }>) =>
  roles.map((role) => role.roleName).join(', ')

const loadDashboard = async () => {
  errorMessage.value = null
  isLoading.value = true

  try {
    const tasks = [
      getAdminProductsSummary({}),
      listManagedUsers({ page: 1, pageSize: 3, roleName: 'Buyer' }),
      listManagedUsers({ page: 1, pageSize: 3, roleName: 'Artist' }),
      listAdminCertificates({ page: 1, pageSize: 1 }),
      listAdminCorePermissions({ page: 1, pageSize: 1, status: 'ACTIVE' }),
      listAdminDigitalRightConfigs({ page: 1, pageSize: 1, status: 'ACTIVE' }),
      listAdminPhysicalRightConfigs({ page: 1, pageSize: 1, status: 'ACTIVE' }),
      listAdminExpressionConfigs({ page: 1, pageSize: 1, status: 'ACTIVE' }),
      listAdminModificationConfigs({ page: 1, pageSize: 1, status: 'ACTIVE' }),
      listAdminCompliance({ page: 1, pageSize: 1, reviewStatus: 'PENDING' }),
    ] as const

    const [
      tracksSummaryResponse,
      buyersResponse,
      artistsResponse,
      certificatesResponse,
      corePermissionsResponse,
      digitalConfigsResponse,
      physicalConfigsResponse,
      expressionConfigsResponse,
      modificationConfigsResponse,
      pendingComplianceResponse,
    ] =
      await Promise.all(tasks)

    trackTotal.value = tracksSummaryResponse.data.total
    publishedTracks.value = tracksSummaryResponse.data.published
    hiddenTracks.value = tracksSummaryResponse.data.hidden

    buyerTotal.value = buyersResponse.meta.pagination.totalItems
    artistTotal.value = artistsResponse.meta.pagination.totalItems
    certificateTotal.value = certificatesResponse.meta.pagination.totalItems
    activeCorePermissionTotal.value = corePermissionsResponse.meta.pagination.totalItems
    activeLicensingConfigTotal.value =
      digitalConfigsResponse.meta.pagination.totalItems +
      physicalConfigsResponse.meta.pagination.totalItems +
      expressionConfigsResponse.meta.pagination.totalItems +
      modificationConfigsResponse.meta.pagination.totalItems
    pendingComplianceTotal.value = pendingComplianceResponse.meta.pagination.totalItems
    recentBuyers.value = buyersResponse.data.items
    recentArtists.value = artistsResponse.data.items

    if (authStore.isSuperAdmin) {
      const adminsResponse = await listAdmins({ page: 1, pageSize: 4 })
      adminTotal.value = adminsResponse.meta.pagination.totalItems
      recentAdmins.value = adminsResponse.data.items
    }
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Không tải được dữ liệu dashboard'
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  void loadDashboard()
})
</script>

<template>
  <div class="space-y-6 pb-8">
    <section
      class="flex flex-col gap-5 rounded-[32px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(109,74,255,0.22),transparent_38%),radial-gradient(circle_at_65%_120%,rgba(56,189,248,0.14),transparent_42%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(245,243,255,0.92))] p-6 shadow-2xl shadow-slate-200/40 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.24),transparent_34%),radial-gradient(circle_at_65%_120%,rgba(14,165,233,0.18),transparent_42%),linear-gradient(135deg,rgba(15,23,42,0.92),rgba(2,6,23,0.96))] dark:shadow-black/20 xl:flex-row xl:items-center xl:justify-between"
    >
      <div class="space-y-3">
        <div class="inline-flex items-center rounded-full bg-violet-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
          Dashboard
        </div>
        <div>
          <h2 class="!m-0 text-3xl font-semibold tracking-tight !text-slate-950 dark:!text-white">
            Trung tâm điều hành Musica
          </h2>
          <p class="mt-3 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
            Trang tổng quan tập trung cho tài khoản quản trị, ưu tiên nắm trạng thái track,
            user, certificate và các lối tắt thao tác quan trọng ngay khi đăng nhập.
          </p>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-violet-300 hover:text-violet-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:text-violet-300"
        :disabled="isLoading"
        @click="loadDashboard"
      >
        <i class="pi pi-refresh" />
        Làm mới dashboard
      </button>
    </section>

    <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>

    <section class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <AdminStatCard
        v-for="card in statCards"
        :key="card.title"
        :title="card.title"
        :value="card.value"
        :description="card.description"
        :icon="card.icon"
        :tone="card.tone"
      />
    </section>

    <section class="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)]">
      <div class="space-y-6">
        <section class="rounded-[32px] border border-slate-200/80 bg-white/92 p-6 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20">
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="text-lg font-semibold text-slate-950 dark:text-white">Quick actions</div>
              <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Đi thẳng tới các khu vực vận hành chính của admin shell.
              </div>
            </div>
          </div>

          <div class="mt-5 grid gap-4 lg:grid-cols-2">
            <RouterLink
              v-for="item in quickActions"
              :key="item.to"
              :to="item.to"
              class="group rounded-[28px] border border-slate-200/80 bg-slate-50/90 p-5 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-950/60 dark:hover:border-violet-500/30"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-semibold text-slate-950 dark:text-white">{{ item.title }}</div>
                  <div class="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
                    {{ item.description }}
                  </div>
                </div>
                <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-violet-600 shadow-sm transition group-hover:text-violet-700 dark:bg-slate-900 dark:text-violet-300">
                  <i :class="item.icon" />
                </div>
              </div>
            </RouterLink>
          </div>
        </section>

        <section class="rounded-[32px] border border-slate-200/80 bg-white/92 p-6 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20">
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="text-lg font-semibold text-slate-950 dark:text-white">Người dùng mới lên dashboard</div>
              <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Snapshot nhanh từ buyer và artist để kiểm tra dữ liệu hệ thống.
              </div>
            </div>
          </div>

          <div class="mt-5 space-y-3">
            <article
              v-for="user in recentUsers"
              :key="user.id"
              class="flex items-center justify-between gap-4 rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div class="min-w-0">
                <div class="font-semibold text-slate-950 dark:text-white">{{ user.fullName }}</div>
                <div class="truncate text-sm text-slate-500 dark:text-slate-400">
                  {{ user.email }}
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:bg-sky-500/15 dark:text-sky-300">
                  {{ formatRoleNames(user.roles) }}
                </span>
                <span
                  class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                  :class="
                    user.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                  "
                >
                  {{ user.status }}
                </span>
              </div>
            </article>

            <div
              v-if="!isLoading && recentUsers.length === 0"
              class="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-400"
            >
              Chưa có dữ liệu user để hiển thị trên dashboard.
            </div>
          </div>
        </section>
      </div>

      <section class="space-y-6">
        <section
          v-if="authStore.isSuperAdmin"
          class="rounded-[32px] border border-slate-200/80 bg-white/92 p-6 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20"
        >
          <div>
            <div class="text-lg font-semibold text-slate-950 dark:text-white">Admin accounts gần đây</div>
            <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Danh sách ngắn để rà nhanh quyền quản trị nội bộ.
            </div>
          </div>

          <div class="mt-5 space-y-3">
            <article
              v-for="admin in recentAdmins"
              :key="admin.id"
              class="rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="font-semibold text-slate-950 dark:text-white">{{ admin.fullName }}</div>
                  <div class="truncate text-sm text-slate-500 dark:text-slate-400">
                    {{ admin.email }}
                  </div>
                </div>
                <span
                  class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                  :class="
                    admin.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                  "
                >
                  {{ admin.status }}
                </span>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="role in admin.roles"
                  :key="`${admin.id}-${role.roleId}`"
                  class="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                >
                  {{ role.roleName }}
                </span>
              </div>
              <div class="mt-3 text-xs text-slate-400 dark:text-slate-500">
                Tạo lúc {{ formatDateTime(admin.createdAt) }}
              </div>
            </article>
          </div>
        </section>

        <section class="rounded-[32px] border border-slate-200/80 bg-white/92 p-6 shadow-xl shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:shadow-black/20">
          <div>
            <div class="text-lg font-semibold text-slate-950 dark:text-white">System notes</div>
            <div class="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Các quy ước hiện tại của admin workspace.
            </div>
          </div>

          <div class="mt-5 space-y-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            <div class="rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
              Dashboard đang ưu tiên dữ liệu thật từ API thay cho mock data.
            </div>
            <div class="rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
              Theme sáng/tối được đồng bộ cho layout, text, icon và PrimeVue components.
            </div>
            <div class="rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
              Track và certificate giữ nguyên workflow hiện có, chỉ làm mới shell quản trị xung quanh.
            </div>
          </div>
        </section>
      </section>
    </section>
  </div>
</template>
