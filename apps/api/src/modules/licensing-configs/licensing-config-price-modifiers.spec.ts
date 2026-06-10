import { ApiHttpException } from '../../common/errors/api-http.exception'
import {
  assertSupportedDigitalPriceModifiers,
  hasUnsupportedDigitalPriceModifier,
} from './licensing-config-price-modifiers'

describe('licensing-config-price-modifiers', () => {
  it('detects duration modifiers as unsupported for digital configs', () => {
    expect(
      hasUnsupportedDigitalPriceModifier([
        { key: 'DURATION_ONE_YEAR' },
        { key: 'SUBJECT_INDIVIDUAL' },
      ]),
    ).toBe(true)
  })

  it('allows non-duration modifiers for digital configs', () => {
    expect(
      hasUnsupportedDigitalPriceModifier([
        { key: 'SUBJECT_INDIVIDUAL' },
        { key: 'EXPRESSION' },
      ]),
    ).toBe(false)
  })

  it('throws a bad request error when digital config contains duration modifiers', () => {
    expect(() =>
      assertSupportedDigitalPriceModifiers([
        { key: 'DURATION_ONE_YEAR' },
        { key: 'DURATION_PERPETUAL' },
      ]),
    ).toThrow(ApiHttpException)
  })
})
