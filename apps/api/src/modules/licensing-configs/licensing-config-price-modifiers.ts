import type { VariantPricingModifierKey } from '../pricing/variant-pricing.enums'

type PriceModifierLike = {
  key: VariantPricingModifierKey
}

export const hasUnsupportedDigitalPriceModifier = (
  _modifiers: PriceModifierLike[],
): boolean => false

export const assertSupportedDigitalPriceModifiers = (
  _modifiers: PriceModifierLike[],
): void => undefined
