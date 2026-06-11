import { reactive } from 'vue'

export type AppNotificationTone = 'success' | 'error' | 'warning' | 'info'

export type AppNotificationItem = {
  id: number
  tone: AppNotificationTone
  title: string
  message: string
  durationMs: number
}

const notifications = reactive<AppNotificationItem[]>([])
const notificationTimers = new Map<number, ReturnType<typeof setTimeout>>()
let notificationIdSeed = 1

const dismiss = (id: number) => {
  const index = notifications.findIndex((item) => item.id === id)
  if (index >= 0) notifications.splice(index, 1)

  const timer = notificationTimers.get(id)
  if (timer) {
    clearTimeout(timer)
    notificationTimers.delete(id)
  }
}

const push = (params: {
  tone: AppNotificationTone
  title: string
  message: string
  durationMs?: number
}) => {
  const id = notificationIdSeed++
  const item: AppNotificationItem = {
    id,
    tone: params.tone,
    title: params.title,
    message: params.message,
    durationMs: params.durationMs ?? (params.tone === 'error' ? 6000 : 4200),
  }

  notifications.unshift(item)

  if (item.durationMs > 0) {
    const timer = setTimeout(() => dismiss(id), item.durationMs)
    notificationTimers.set(id, timer)
  }

  return id
}

export const useAppNotifications = () => ({
  notifications,
  dismiss,
  show: push,
  success: (message: string, title = 'Thành công') =>
    push({ tone: 'success', title, message }),
  error: (message: string, title = 'Có lỗi xảy ra') =>
    push({ tone: 'error', title, message }),
  warning: (message: string, title = 'Cần lưu ý') =>
    push({ tone: 'warning', title, message }),
  info: (message: string, title = 'Thông báo') =>
    push({ tone: 'info', title, message }),
})
