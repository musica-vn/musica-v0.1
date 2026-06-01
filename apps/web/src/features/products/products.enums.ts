export const PRODUCT_GENRE_OPTIONS = [
  { label: 'Pop', value: 'POP' },
  { label: 'Electronic', value: 'ELECTRONIC' },
  { label: 'Hip hop', value: 'HIP_HOP' },
  { label: 'Rock', value: 'ROCK' },
  { label: 'Jazz', value: 'JAZZ' },
  { label: 'Classical', value: 'CLASSICAL' },
  { label: 'Folk', value: 'FOLK' },
  { label: 'R&B', value: 'RNB' },
  { label: 'EDM', value: 'EDM' },
] as const

export type ProductGenre = (typeof PRODUCT_GENRE_OPTIONS)[number]['value']

export const PRODUCT_USE_CASE_OPTIONS = [
  { label: 'Advertisement', value: 'ADVERTISEMENT' },
  { label: 'Vlog', value: 'VLOG' },
  { label: 'Social content', value: 'SOCIAL' },
  { label: 'Film', value: 'FILM' },
  { label: 'Game', value: 'GAME' },
  { label: 'Podcast', value: 'PODCAST' },
  { label: 'Event', value: 'EVENT' },
] as const

export type ProductUseCase = (typeof PRODUCT_USE_CASE_OPTIONS)[number]['value']

export const resolveProductGenreLabel = (genre: string | null | undefined) =>
  PRODUCT_GENRE_OPTIONS.find((option) => option.value === genre)?.label ?? genre ?? ''

export const resolveProductUseCaseLabel = (useCase: string | null | undefined) =>
  PRODUCT_USE_CASE_OPTIONS.find((option) => option.value === useCase)?.label ?? useCase ?? ''

