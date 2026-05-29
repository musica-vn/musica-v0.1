// Note: reuse this helper for admin timestamps such as reviewedAt, createdAt, updatedAt, and uploadedAt.
export type FormatDateTimeOptions = {
  fallback?: string
}

export const formatAdminDateTime = (value: string | Date | null | undefined, options: FormatDateTimeOptions = {}) => {
  const fallback = options.fallback ?? 'Chưa có'

  if (!value) {
    return fallback
  }

  const date = value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback
  }

  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}
