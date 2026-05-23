<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Message from 'primevue/message'
import { ApiClientError } from '../shared/api/http'
import { useAuthStore } from '../features/auth/auth.store'

const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

const isDev = import.meta.env.DEV

const canSubmit = computed(() => email.value.length > 0 && password.value.length > 0 && !isSubmitting.value)

const fillSuperAdmin = () => {
  email.value = 'superadmin@musica.local'
  password.value = 'Password123!'
}

const submit = async () => {
  if (!canSubmit.value) return
  errorMessage.value = null
  isSubmitting.value = true

  try {
    await authStore.login({ email: email.value, password: password.value })

    if (authStore.isAdmin) {
      await router.replace('/admin')
      return
    }

    await router.replace('/landing')
  } catch (error) {
    if (error instanceof ApiClientError) {
      errorMessage.value = `${error.code}: ${error.message}`
    } else {
      errorMessage.value = String(error)
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <div class="page">
    <Card class="card">
      <template #title>Đăng nhập</template>
      <template #subtitle>Test role redirect (Admin/Super Admin → /admin)</template>
      <template #content>
        <div class="form">
          <div class="field">
            <label>Email</label>
            <InputText v-model="email" type="email" placeholder="admin01@musica.local" />
          </div>

          <div class="field">
            <label>Password</label>
            <Password
              v-model="password"
              :feedback="false"
              toggleMask
              placeholder="Password123!"
            />
          </div>

          <div v-if="isDev" class="quickFill">
            <Button label="Fill Super Admin" severity="secondary" :disabled="isSubmitting" @click="fillSuperAdmin" />
          </div>

          <Message v-if="errorMessage" severity="error" :closable="false">
            {{ errorMessage }}
          </Message>

          <Button label="Đăng nhập" :disabled="!canSubmit" :loading="isSubmitting" @click="submit" />
        </div>
      </template>
    </Card>
  </div>
</template>

<style scoped>
.page {
  flex: 1;
  display: grid;
  place-items: center;
  padding: 24px;
}

.card {
  width: min(520px, 100%);
  text-align: left;
}

.form {
  display: grid;
  gap: 14px;
}

.field {
  display: grid;
  gap: 6px;
}

.quickFill {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

label {
  font-size: 14px;
  opacity: 0.85;
}
</style>
