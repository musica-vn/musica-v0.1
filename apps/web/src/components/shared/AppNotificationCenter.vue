<script setup lang="ts">
import { computed } from 'vue'
import { useAppNotifications } from '../../composables/useAppNotifications'

const notificationStore = useAppNotifications()

const toneClassMap = computed<Record<string, string>>(() => ({
  success:
    'border-[color:rgb(var(--admin-success-rgb)/0.24)] bg-[color:var(--admin-success-50)] text-[color:var(--admin-success-700)]',
  error:
    'border-[color:rgb(var(--admin-danger-rgb)/0.22)] bg-[color:var(--admin-danger-50)] text-[color:var(--admin-danger-700)]',
  warning:
    'border-[color:rgb(var(--admin-warning-rgb)/0.22)] bg-[color:var(--admin-warning-50)] text-[color:var(--admin-warning-700)]',
  info:
    'border-[color:rgb(var(--admin-primary-rgb)/0.22)] bg-[color:var(--admin-primary-50)] text-[color:var(--admin-primary-700)]',
}))

const iconClassMap = computed<Record<string, string>>(() => ({
  success: 'pi pi-check-circle',
  error: 'pi pi-times-circle',
  warning: 'pi pi-exclamation-triangle',
  info: 'pi pi-info-circle',
}))
</script>

<template>
  <div class="pointer-events-none fixed right-4 top-4 z-[1200] flex w-[min(420px,calc(100vw-2rem))] flex-col gap-3">
    <TransitionGroup name="app-notification-list" tag="div" class="flex flex-col gap-3">
      <article
        v-for="item in notificationStore.notifications"
        :key="item.id"
        class="pointer-events-auto rounded-[22px] border px-4 py-4 backdrop-blur-sm"
        :class="toneClassMap[item.tone]"
      >
        <div class="flex items-start gap-3">
          <div class="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/50 text-base dark:bg-black/10">
            <i :class="iconClassMap[item.tone]" />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <div class="truncate text-sm font-semibold">{{ item.title }}</div>
                <div class="mt-1 text-sm leading-6 opacity-90">{{ item.message }}</div>
              </div>

              <button
                type="button"
                class="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-current/10 bg-transparent opacity-80 transition hover:opacity-100"
                @click="notificationStore.dismiss(item.id)"
              >
                <i class="pi pi-times text-xs" />
              </button>
            </div>
          </div>
        </div>
      </article>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.app-notification-list-enter-active,
.app-notification-list-leave-active {
  transition: all 0.22s ease;
}

.app-notification-list-enter-from,
.app-notification-list-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.app-notification-list-move {
  transition: transform 0.22s ease;
}
</style>
