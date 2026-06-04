<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Message from 'primevue/message'
import { ApiClientError } from '../../api/axios'
import { useAuthStore } from '../../stores/auth.store'

const DEV_SUPER_ADMIN_EMAIL = 'superadmin@musica.local'
const DEV_SUPER_ADMIN_PASSWORD = 'Password123!'

const router = useRouter()
const authStore = useAuthStore()

const isDevMode = import.meta.env.DEV
const email = ref(isDevMode ? DEV_SUPER_ADMIN_EMAIL : '')
const password = ref(isDevMode ? DEV_SUPER_ADMIN_PASSWORD : '')
const isSubmitting = ref(false)
const errorMessage = ref<string | null>(null)

const canSubmit = computed(() => email.value.length > 0 && password.value.length > 0 && !isSubmitting.value)
const submitLabel = computed(() => (isSubmitting.value ? 'Đang đăng nhập...' : 'Đăng nhập'))

const fillSuperAdmin = () => {
  email.value = DEV_SUPER_ADMIN_EMAIL
  password.value = DEV_SUPER_ADMIN_PASSWORD
}

const submit = async () => {
  if (!canSubmit.value) return

  errorMessage.value = null
  isSubmitting.value = true

  try {
    await authStore.login({ email: email.value.trim(), password: password.value })

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
  <div class="relative min-h-screen overflow-hidden bg-slate-950">
    <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(168,85,247,0.24),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.2),_transparent_32%),linear-gradient(160deg,_#020617_0%,_#111827_52%,_#020617_100%)]" />
    <div class="absolute left-10 top-20 h-48 w-48 rounded-full bg-fuchsia-500/20 blur-3xl" />
    <div class="absolute bottom-12 right-10 h-56 w-56 rounded-full bg-sky-500/20 blur-3xl" />

    <div class="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-6 py-8 lg:grid-cols-[1.08fr_0.92fr] lg:px-10">
      <section class="hidden text-white lg:block">
        <div class="max-w-2xl space-y-8">
          <div class="inline-flex items-center gap-3 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm font-medium text-slate-100 backdrop-blur">
            <span class="flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            Musica Admin Portal
          </div>

          <div class="space-y-5">
            <p class="text-sm font-semibold uppercase tracking-[0.35em] text-fuchsia-200/80">
              Music Rights Management
            </p>
            <h1 class="!m-0 max-w-xl text-5xl font-semibold leading-tight !text-white">
              Đăng nhập để quản trị track, user và certificate trên một dashboard thống nhất.
            </h1>
            <p class="max-w-xl text-base leading-7 text-slate-300">
              Giao diện admin của Musica tập trung cho vận hành nội bộ, xử lý nội dung bản quyền và theo dõi dữ liệu tập trung theo role.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div class="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur">
              <p class="text-sm text-slate-300">Quản trị tập trung</p>
              <p class="mt-2 text-lg font-semibold text-white">Tracks, Users, Certificates</p>
            </div>
            <div class="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur">
              <p class="text-sm text-slate-300">Phân quyền rõ ràng</p>
              <p class="mt-2 text-lg font-semibold text-white">Admin / Super Admin</p>
            </div>
            <div class="rounded-3xl border border-white/10 bg-white/8 p-5 backdrop-blur">
              <p class="text-sm text-slate-300">Môi trường local</p>
              <p class="mt-2 text-lg font-semibold text-white">Sẵn sàng cho Dev flow</p>
            </div>
          </div>
        </div>
      </section>

      <section class="mx-auto w-full max-w-xl">
        <div class="rounded-[32px] border border-white/15 bg-white/92 p-6 shadow-[0_32px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:p-8 dark:bg-slate-900/88">
          <div class="space-y-2">
            <div class="inline-flex items-center gap-2 rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-white dark:bg-white dark:text-slate-900">
              Sign In
            </div>
            <h2 class="!m-0 text-3xl font-semibold !text-slate-950 dark:!text-white">
              Chào mừng quay lại
            </h2>
            <p class="text-sm leading-6 text-slate-500 dark:text-slate-300">
              Dùng tài khoản quản trị để truy cập khu vực điều hành của Musica.
            </p>
          </div>

          <div
            v-if="isDevMode"
            class="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100"
          >
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div class="space-y-2">
                <p class="font-semibold">Chế độ Dev: đã điền sẵn tài khoản super-admin</p>
                <div class="flex flex-wrap gap-2 text-xs sm:text-sm">
                  <code>{{ DEV_SUPER_ADMIN_EMAIL }}</code>
                  <code>{{ DEV_SUPER_ADMIN_PASSWORD }}</code>
                </div>
              </div>
              <Button
                label="Điền lại dữ liệu Dev"
                severity="secondary"
                size="small"
                :disabled="isSubmitting"
                @click="fillSuperAdmin"
              />
            </div>
          </div>

          <form class="mt-6 space-y-5" @submit.prevent="submit">
            <div class="space-y-2">
              <label class="text-sm font-medium text-slate-700 dark:text-slate-200" for="email">
                Email
              </label>
              <InputText
                id="email"
                v-model="email"
                type="email"
                placeholder="superadmin@musica.local"
                class="w-full !rounded-2xl !border-slate-200 !bg-white/95 !px-4 !py-3 !text-sm dark:!border-slate-700 dark:!bg-slate-950/80"
                autocomplete="username"
              />
            </div>

            <div class="space-y-2">
              <label class="text-sm font-medium text-slate-700 dark:text-slate-200" for="password">
                Mật khẩu
              </label>
              <Password
                id="password"
                v-model="password"
                :feedback="false"
                toggleMask
                placeholder="Nhập mật khẩu"
                inputClass="!w-full !rounded-2xl !border-slate-200 !bg-white/95 !px-4 !py-3 !text-sm dark:!border-slate-700 dark:!bg-slate-950/80"
                class="login-password w-full"
                autocomplete="current-password"
              />
            </div>

            <Message v-if="errorMessage" severity="error" :closable="false">
              {{ errorMessage }}
            </Message>

            <Button
              type="submit"
              :label="submitLabel"
              :disabled="!canSubmit"
              :loading="isSubmitting"
              class="w-full !rounded-2xl !border-0 !bg-slate-950 !py-3 !text-sm !font-semibold !text-white hover:!bg-slate-800 dark:!bg-fuchsia-500 dark:hover:!bg-fuchsia-400"
            />
          </form>
        </div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.login-password :deep(.p-password-input) {
  width: 100%;
}
</style>
