export const PLATFORM_PRICING_MODIFIER_KEYS = [
  'SUBJECT_INDIVIDUAL',
  'SUBJECT_ORGANIZATION',
  'DURATION_ONE_YEAR',
  'DURATION_PERPETUAL',
  'SCOPE_SINGLE_CHANNEL',
  'SCOPE_MULTI_CHANNEL',
  'EXPRESSION',
  'MODIFICATION',
] as const

export type PlatformPricingModifierKey = (typeof PLATFORM_PRICING_MODIFIER_KEYS)[number]

export type PlatformPricingModifierValue = {
  key: PlatformPricingModifierKey
  multiplier: number
}

export const PLATFORM_PRICING_GROUPS: Array<{
  id: 'SUBJECT' | 'DURATION' | 'SCOPE' | 'EXPRESSION' | 'MODIFICATION'
  label: string
  description: string
  items: Array<{ key: PlatformPricingModifierKey; label: string }>
}> = [
  {
    id: 'SUBJECT',
    label: 'Đối tượng',
    description: 'Xác định hệ số theo nhóm người dùng cuối.',
    items: [
      { key: 'SUBJECT_INDIVIDUAL', label: 'Cá nhân' },
      { key: 'SUBJECT_ORGANIZATION', label: 'Tổ chức' },
    ],
  },
  {
    id: 'DURATION',
    label: 'Thời hạn',
    description: 'Mỗi thời hạn là một thuộc tính có hệ số giá riêng.',
    items: [
      { key: 'DURATION_ONE_YEAR', label: '1 năm' },
      { key: 'DURATION_PERPETUAL', label: 'Vĩnh viễn' },
    ],
  },
  {
    id: 'SCOPE',
    label: 'Phạm vi',
    description: 'Áp dụng cho một kênh hoặc nhiều kênh.',
    items: [
      { key: 'SCOPE_SINGLE_CHANNEL', label: 'Một kênh' },
      { key: 'SCOPE_MULTI_CHANNEL', label: 'Nhiều kênh' },
    ],
  },
  {
    id: 'EXPRESSION',
    label: 'Hình thức biểu hiện',
    description: 'Hệ số chung cho nhóm hình thức biểu hiện.',
    items: [{ key: 'EXPRESSION', label: 'Biểu hiện' }],
  },
  {
    id: 'MODIFICATION',
    label: 'Mức độ biến đổi',
    description: 'Hệ số chung cho nhóm mức độ biến đổi.',
    items: [{ key: 'MODIFICATION', label: 'Biến đổi' }],
  },
]

export const sortPlatformPricingModifiers = (
  modifiers: PlatformPricingModifierValue[],
): PlatformPricingModifierValue[] =>
  [...modifiers].sort(
    (left, right) =>
      PLATFORM_PRICING_MODIFIER_KEYS.indexOf(left.key) -
      PLATFORM_PRICING_MODIFIER_KEYS.indexOf(right.key),
  )

export const buildCompletePlatformPricingModifiers = (
  source: PlatformPricingModifierValue[],
): PlatformPricingModifierValue[] => {
  const modifierMap = new Map(source.map((item) => [item.key, item.multiplier]))

  return PLATFORM_PRICING_MODIFIER_KEYS.map((key) => ({
    key,
    multiplier: modifierMap.get(key) ?? 1,
  }))
}

export const resolvePlatformPricingModifierLabel = (
  key: PlatformPricingModifierKey,
): string =>
  PLATFORM_PRICING_GROUPS.flatMap((group) => group.items).find((item) => item.key === key)?.label ?? key
