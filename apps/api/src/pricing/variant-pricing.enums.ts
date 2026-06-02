export const VARIANT_SUBJECT_OPTIONS = ['INDIVIDUAL', 'ORGANIZATION'] as const;
export type VariantSubject = (typeof VARIANT_SUBJECT_OPTIONS)[number];

export const VARIANT_DURATION_OPTIONS = ['ONE_YEAR', 'PERPETUAL'] as const;
export type VariantDuration = (typeof VARIANT_DURATION_OPTIONS)[number];

export const VARIANT_SCOPE_OPTIONS = ['SINGLE_CHANNEL', 'MULTI_CHANNEL'] as const;
export type VariantScope = (typeof VARIANT_SCOPE_OPTIONS)[number];

export const VARIANT_PRICING_MODIFIER_KEYS = [
  'SUBJECT_INDIVIDUAL',
  'SUBJECT_ORGANIZATION',
  'DURATION_ONE_YEAR',
  'DURATION_PERPETUAL',
  'SCOPE_SINGLE_CHANNEL',
  'SCOPE_MULTI_CHANNEL',
  'EXPRESSION',
  'MODIFICATION',
] as const;
export type VariantPricingModifierKey =
  (typeof VARIANT_PRICING_MODIFIER_KEYS)[number];

export const SUBJECT_MULTIPLIERS: Record<VariantSubject, number> = {
  INDIVIDUAL: 2.0,
  ORGANIZATION: 2.0,
};

export const DURATION_MULTIPLIERS: Record<VariantDuration, number> = {
  ONE_YEAR: 2.0,
  PERPETUAL: 2.0,
};

export const SCOPE_MULTIPLIERS: Record<VariantScope, number> = {
  SINGLE_CHANNEL: 2.0,
  MULTI_CHANNEL: 2.0,
};

export const resolveModifierKeyFromSelection = (selection: {
  subject: VariantSubject;
  duration: VariantDuration;
  scope: VariantScope;
}): VariantPricingModifierKey[] => [
  `SUBJECT_${selection.subject}` as VariantPricingModifierKey,
  `DURATION_${selection.duration}` as VariantPricingModifierKey,
  `SCOPE_${selection.scope}` as VariantPricingModifierKey,
];
