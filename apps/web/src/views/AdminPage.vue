<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../features/auth/auth.store'

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
      <h1>Admin Area</h1>
      <Button label="Logout" severity="secondary" @click="logout" />
    </header>

    <Card>
      <template #title>Auth Debug</template>
      <template #content>
        <div class="grid">
          <div><b>Email:</b> {{ authStore.user?.email }}</div>
          <div><b>Name:</b> {{ authStore.user?.fullName }}</div>
          <div class="roles">
            <Tag v-for="role in authStore.roles" :key="role" :value="role" />
          </div>
        </div>
      </template>
    </Card>
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
</style>

