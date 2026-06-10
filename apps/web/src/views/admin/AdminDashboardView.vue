<script setup lang="ts">
import Message from 'primevue/message'
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../../stores/auth.store'
import { listAdmins } from '../../services/admins.service'
import { listManagedUsers } from '../../services/managed-users.service'
import { listAdminCertificates } from '../../services/certificates.service'
import { getAdminProductsSummary } from '../../services/products.service'
import { listAdminCompliance } from '../../services/compliance.service'
import { listAdminCorePermissions } from '../../services/core-permissions.service'
import {
  listAdminDigitalRightConfigs,
  listAdminExpressionConfigs,
  listAdminModificationConfigs,
  listAdminPhysicalRightConfigs,
} from '../../services/licensing-configs.service'
import type { AdminUser } from '../../types/admins.types'
import type { ManagedUser } from '../../types/managed-users.types'
import AdminStatCard from '../../components/features/admin-shell/AdminStatCard.vue'

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
const pendingComplianceDescription = computed(() =>
  pendingComplianceTotal.value === 0
    ? 'Khong co gi can duyet - tuyet voi!'
    : `${pendingComplianceTotal.value} hồ sơ compliance đang chờ xử lý`,
)

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
      description: pendingComplianceDescription.value,
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
      title: 'Đi tới sản phẩm',
      description: 'Quản lý sản phẩm, audio, xuất bản và metadata',
      to: '/admin/products',
      icon: 'pi pi-arrow-up-right',
    },
    {
      title: 'Đi tới chứng chỉ',
      description: 'Theo dõi chứng chỉ và template HTML',
      to: '/admin/certificates',
      icon: 'pi pi-arrow-up-right',
    },
    {
      title: 'Đi tới nền tảng số',
      description: 'Quản lý cấu hình thương mại và bộ quyền bắt buộc cho từng nền tảng số',
      to: '/admin/settings/digital-rights',
      icon: 'pi pi-arrow-up-right',
    },
    {
      title: 'Đi tới quyền cốt lõi',
      description: 'Quản lý tập quyền pháp lý gốc dùng cho toàn hệ thống',
      to: '/admin/settings/permissions',
      icon: 'pi pi-arrow-up-right',
    },
  ]

  if (authStore.isSuperAdmin) {
    items.splice(1, 0, {
      title: 'Đi tới quản trị viên',
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
  <div class="flex min-w-0 flex-col gap-4 pb-8 sm:gap-5 lg:gap-6">
    <section
      class="flex flex-col gap-5 rounded-[32px] border border-[color:var(--admin-border)] bg-[radial-gradient(circle_at_top_left,var(--admin-primary-soft),transparent_38%),radial-gradient(circle_at_75%_10%,var(--admin-accent-soft),transparent_28%),linear-gradient(135deg,var(--admin-surface-0),var(--admin-surface-1))] p-5 shadow-[var(--admin-elev-2)] sm:p-6 xl:flex-row xl:items-center xl:justify-between"
    >
      <div class="min-w-0 space-y-3">
        <div class="inline-flex items-center rounded-full bg-[linear-gradient(135deg,var(--admin-primary-100),var(--admin-accent-50))] px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-[color:var(--admin-primary-800)]">
          Dashboard
        </div>
        <div>
          <h2 class="!m-0 text-2xl font-semibold tracking-tight !text-[color:var(--admin-text)] sm:text-3xl">
            Trung tâm điều hành Musica
          </h2>
          <p class="mt-3 max-w-3xl text-sm leading-6 text-[color:var(--admin-text-muted)]">
            Trang tổng quan tập trung cho tài khoản quản trị, ưu tiên nắm trạng thái track,
            user, certificate và các lối tắt thao tác quan trọng ngay khi đăng nhập.
          </p>
        </div>
      </div>

      <button
        type="button"
        class="inline-flex w-full items-center justify-center gap-2 rounded-2xl border bg-[color:var(--admin-surface-0)] px-4 py-3 text-sm font-semibold text-[color:var(--admin-text)] shadow-sm transition duration-150 hover:border-[color:rgb(var(--admin-primary-rgb)/0.22)] hover:bg-[linear-gradient(135deg,var(--admin-surface-1),var(--admin-accent-50))] hover:text-[color:var(--admin-primary-800)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--admin-ring)] focus-visible:ring-offset-2 [border-color:var(--admin-border)] [--tw-ring-offset-color:var(--admin-surface-0)] sm:w-auto"
        :disabled="isLoading"
        @click="loadDashboard"
      >
        <i class="pi pi-refresh" />
        Làm mới dashboard
      </button>
    </section>

    <Message v-if="errorMessage" severity="error">{{ errorMessage }}</Message>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
        <section class="rounded-[32px] border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] p-6 shadow-[var(--admin-elev-1)] backdrop-blur">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div class="text-lg font-semibold text-[color:var(--admin-text)]">Quick actions</div>
              <div class="mt-2 text-sm text-[color:var(--admin-text-muted)]">
                Đi thẳng tới các khu vực vận hành chính của admin shell.
              </div>
            </div>
          </div>

          <div class="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RouterLink
              v-for="item in quickActions"
              :key="item.to"
              :to="item.to"
              class="group rounded-[28px] border border-[color:var(--admin-border)] bg-[linear-gradient(135deg,var(--admin-surface-1),var(--admin-accent-50))] p-5 transition duration-150 hover:-translate-y-0.5 hover:border-[color:rgb(var(--admin-primary-rgb)/0.2)] hover:shadow-[var(--admin-elev-1)]"
            >
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="font-semibold text-[color:var(--admin-text)]">{{ item.title }}</div>
                  <div class="mt-2 text-sm leading-6 text-[color:var(--admin-text-muted)]">
                    {{ item.description }}
                  </div>
                </div>
                <div class="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,var(--admin-brand-gradient-start),var(--admin-brand-gradient-end))] text-[color:var(--admin-brand-contrast)] shadow-[var(--admin-glow)] transition group-hover:scale-[1.02]">
                  <i :class="item.icon" />
                </div>
              </div>
            </RouterLink>
          </div>
        </section>

        <section class="rounded-[32px] border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] p-6 shadow-[var(--admin-elev-1)] backdrop-blur">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div class="text-lg font-semibold text-[color:var(--admin-text)]">Người dùng mới lên dashboard</div>
              <div class="mt-2 text-sm text-[color:var(--admin-text-muted)]">
                Snapshot nhanh từ buyer và artist để kiểm tra dữ liệu hệ thống.
              </div>
            </div>
          </div>

          <div class="mt-5 space-y-3">
            <article
              v-for="user in recentUsers"
              :key="user.id"
              class="flex items-center justify-between gap-4 rounded-[24px] border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-4"
            >
              <div class="min-w-0">
                <div class="font-semibold text-[color:var(--admin-text)]">{{ user.fullName }}</div>
                <div class="truncate text-sm text-[color:var(--admin-text-muted)]">
                  {{ user.email }}
                </div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full bg-[color:var(--admin-primary-50)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-primary-700)]">
                  {{ formatRoleNames(user.roles) }}
                </span>
                <span
                  class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                  :class="
                    user.status === 'ACTIVE'
                      ? 'bg-[color:var(--admin-success-50)] text-[color:var(--admin-success-700)]'
                      : 'bg-[color:var(--admin-warning-50)] text-[color:var(--admin-warning-700)]'
                  "
                >
                  {{ user.status }}
                </span>
              </div>
            </article>

            <div
              v-if="!isLoading && recentUsers.length === 0"
              class="rounded-[24px] border border-dashed border-[color:var(--admin-border-strong)] bg-[color:var(--admin-surface-1)] px-5 py-10 text-center text-sm text-[color:var(--admin-text-muted)]"
            >
              Chưa có dữ liệu user để hiển thị trên dashboard.
            </div>
          </div>
        </section>
      </div>

      <section class="space-y-6">
        <section
          v-if="authStore.isSuperAdmin"
          class="rounded-[32px] border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] p-6 shadow-[var(--admin-elev-1)] backdrop-blur"
        >
          <div>
            <div class="text-lg font-semibold text-[color:var(--admin-text)]">Admin accounts gần đây</div>
            <div class="mt-2 text-sm text-[color:var(--admin-text-muted)]">
              Danh sách ngắn để rà nhanh quyền quản trị nội bộ.
            </div>
          </div>

          <div class="mt-5 space-y-3">
            <article
              v-for="admin in recentAdmins"
              :key="admin.id"
              class="rounded-[24px] border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-4"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="font-semibold text-[color:var(--admin-text)]">{{ admin.fullName }}</div>
                  <div class="truncate text-sm text-[color:var(--admin-text-muted)]">
                    {{ admin.email }}
                  </div>
                </div>
                <span
                  class="rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]"
                  :class="
                    admin.status === 'ACTIVE'
                      ? 'bg-[color:var(--admin-success-50)] text-[color:var(--admin-success-700)]'
                      : 'bg-[color:var(--admin-warning-50)] text-[color:var(--admin-warning-700)]'
                  "
                >
                  {{ admin.status }}
                </span>
              </div>
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="role in admin.roles"
                  :key="`${admin.id}-${role.roleId}`"
                  class="rounded-full border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--admin-text-muted)]"
                >
                  {{ role.roleName }}
                </span>
              </div>
              <div class="mt-3 text-xs text-[color:var(--admin-text-muted)]">
                Tạo lúc {{ formatDateTime(admin.createdAt) }}
              </div>
            </article>
          </div>
        </section>

        <section class="rounded-[32px] border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-0)] p-6 shadow-[var(--admin-elev-1)] backdrop-blur">
          <div>
            <div class="text-lg font-semibold text-[color:var(--admin-text)]">System notes</div>
            <div class="mt-2 text-sm text-[color:var(--admin-text-muted)]">
              Các quy ước hiện tại của admin workspace.
            </div>
          </div>

          <div class="mt-5 space-y-3 text-sm leading-6 text-[color:var(--admin-text-muted)]">
            <div class="rounded-[24px] border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-4">
              Dashboard đang ưu tiên dữ liệu thật từ API thay cho mock data.
            </div>
            <div class="rounded-[24px] border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-4">
              Theme sáng/tối được đồng bộ cho layout, text, icon và PrimeVue components.
            </div>
            <div class="rounded-[24px] border border-[color:var(--admin-border)] bg-[color:var(--admin-surface-1)] px-4 py-4">
              Track và certificate giữ nguyên workflow hiện có, chỉ làm mới shell quản trị xung quanh.
            </div>
          </div>
        </section>
      </section>
    </section>
  </div>
</template>
