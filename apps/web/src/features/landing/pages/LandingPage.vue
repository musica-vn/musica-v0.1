<script setup lang="ts">
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import { useAuthStore } from '../../auth/auth.store'

const router = useRouter()
const authStore = useAuthStore()

const logout = async () => {
  authStore.logout()
  await router.replace('/login')
}
</script>

<template>
  <div class="page">
    <header class="header">
      <h1>Landing</h1>
      <Button label="Đăng xuất" severity="secondary" @click="logout" />
    </header>

    <Card>
      <template #title>Role Redirect</template>
      <template #content>
        <div class="grid">
          <div><b>Email:</b> {{ authStore.user?.email }}</div>
          <div><b>Name:</b> {{ authStore.user?.fullName }}</div>
          <div class="roles">
            <Tag
              v-if="authStore.user?.roleName"
              :value="authStore.user.roleName"
            />
          </div>
          <div class="hint">
            Nếu role là <code>ADMIN</code> hoặc <code>SUPER_ADMIN</code> thì sẽ redirect sang
            <code>/admin</code>.
          </div>
        </div>
      </template>
    </Card>

    <Button label="Về đăng nhập" severity="secondary" @click="router.push('/login')" />
  </div>
</template>

<style scoped>
.page {
  padding: 24px;
  display: grid;
  gap: 16px;
  text-align: left;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.grid {
  display: grid;
  gap: 10px;
}

.roles {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.hint {
  opacity: 0.85;
}
</style>
