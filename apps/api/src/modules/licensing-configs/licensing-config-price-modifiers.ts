import { HttpStatus } from '@nestjs/common'
import { ApiHttpException } from '../../common/errors/api-http.exception'
import type { VariantPricingModifierKey } from '../pricing/variant-pricing.enums'

type PriceModifierLike = {
  key: VariantPricingModifierKey
}

const DIGITAL_DISALLOWED_MODIFIER_KEYS = new Set<VariantPricingModifierKey>([
  'DURATION_ONE_YEAR',
  'DURATION_PERPETUAL',
])

export const hasUnsupportedDigitalPriceModifier = (
  modifiers: PriceModifierLike[],
): boolean => modifiers.some((modifier) => DIGITAL_DISALLOWED_MODIFIER_KEYS.has(modifier.key))

export const assertSupportedDigitalPriceModifiers = (
  modifiers: PriceModifierLike[],
): void => {
  const invalidModifierKeys = modifiers
    .map((modifier) => modifier.key)
    .filter((modifierKey) => DIGITAL_DISALLOWED_MODIFIER_KEYS.has(modifierKey))

  if (invalidModifierKeys.length === 0) return

  throw new ApiHttpException(
    {
      code: 'DIGITAL_RIGHT_CONFIG_DURATION_MODIFIER_NOT_ALLOWED',
      details: { modifierKeys: [...new Set(invalidModifierKeys)] },
    },
    HttpStatus.BAD_REQUEST,
  )
}
