export const PRODUCT_GENRES = [
  'POP',
  'ELECTRONIC',
  'HIP_HOP',
  'ROCK',
  'JAZZ',
  'CLASSICAL',
  'FOLK',
  'RNB',
  'EDM',
] as const;

export type ProductGenre = (typeof PRODUCT_GENRES)[number];

export const PRODUCT_USE_CASES = [
  'ADVERTISEMENT',
  'VLOG',
  'SOCIAL',
  'FILM',
  'GAME',
  'PODCAST',
  'EVENT',
] as const;

export type ProductUseCase = (typeof PRODUCT_USE_CASES)[number];

