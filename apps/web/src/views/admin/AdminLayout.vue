<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import PanelMenu from 'primevue/panelmenu'
import type { MenuItem } from 'primevue/menuitem'
import { useAuthStore } from '../../features/auth/auth.store'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const logout = async () => {
  authStore.logout()
  await router.replace('/login')
}

const items = computed<MenuItem[]>(() => [
  {
    label: 'Tổng quan',
    icon: 'pi pi-home',
    command: async () => router.push('/admin/dashboard'),
  },
  {
    label: 'Danh sách admin',
    icon: 'pi pi-shield',
    command: async () => router.push('/admin/admins'),
  },
  {
    label: 'Quản lý track',
    icon: 'pi pi-wave-pulse',
    command: async () => router.push('/admin/tracks'),
  },
  {
    label: 'Quản lý người dùng',
    icon: 'pi pi-users',
    items: [
      {
        label: 'Người mua',
        icon: 'pi pi-user',
        command: async () => router.push('/admin/users/buyers'),
      },
      {
        label: 'Nghệ sĩ',
        icon: 'pi pi-star',
        command: async () => router.push('/admin/users/artists'),
      },
    ],
  },
  {
    label: 'Quản lý chứng chỉ',
    icon: 'pi pi-file-pdf',
    command: async () => router.push('/admin/certificates'),
  },
])

const pageTitle = computed(() => (typeof route.meta.title === 'string' ? route.meta.title : 'Quản trị'))
</script>

<template>
  <div class="layout">
    <aside class="sidebar">
      <Card class="sidebarCard">
        <template #title>Menu quản trị</template>
        <template #content>
          <PanelMenu :model="items" />
        </template>
      </Card>
    </aside>

    <main class="content">
      <header class="header">
        <div>
          <div class="title">{{ pageTitle }}</div>
          <div class="subtitle">{{ authStore.user?.email }}</div>
        </div>
        <Button label="Đăng xuất" severity="secondary" @click="logout" />
      </header>

      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 16px;
  padding: 24px;
  text-align: left;
}

.content {
  display: grid;
  gap: 16px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.title {
  font-size: 22px;
  font-weight: 600;
  color: var(--text-h);
}

.subtitle {
  font-size: 14px;
  opacity: 0.8;
}

.sidebar {
  position: sticky;
  top: 16px;
  align-self: start;
}

.sidebarCard {
  width: 100%;
}

@media (max-width: 1024px) {
  .layout {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  .sidebar {
    position: static;
  }
}
</style>
