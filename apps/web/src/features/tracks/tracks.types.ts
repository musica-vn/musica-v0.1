export type TrackStatus = 'HIDDEN' | 'PUBLISHED'

export type TrackUsageRight =
  | 'REPRODUCTION_RIGHT'
  | 'COMMUNICATION_TO_PUBLIC_RIGHT'
  | 'DERIVATIVE_WORK_RIGHT'
  | 'DISTRIBUTION_RIGHT'

export type TrackSortValue =
  | 'createdAt:desc'
  | 'createdAt:asc'
  | 'updatedAt:desc'
  | 'updatedAt:asc'
  | 'title:asc'
  | 'title:desc'
  | 'status:asc'
  | 'status:desc'
  | 'genre:asc'
  | 'genre:desc'

export type Track = {
  id: string
  title: string
  artistId: string
  authorName: string | null
  genre: string | null
  duration: number | null
  status: TrackStatus
  usageRights: TrackUsageRight[]
  originalAudioKey: string | null
  previewAudioKey: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type AdminTracksListQuery = {
  page: number
  pageSize: number
  keyword?: string
  sort?: TrackSortValue
  status?: TrackStatus
  genre?: string
  artistId?: string
}

export type AdminTracksListData = {
  items: Track[]
}

export type AdminTracksSummaryQuery = {
  keyword?: string
  genre?: string
  artistId?: string
}

export type AdminTracksSummaryData = {
  total: number
  published: number
  hidden: number
}

export type AdminCreateTrackBody = {
  title: string
  artistId: string
  authorName?: string
  genre?: string
  duration?: number
  usageRights?: TrackUsageRight[]
}

export type AdminUpdateTrackBody = Partial<AdminCreateTrackBody>

export type SignedUploadUrlData = {
  uploadUrl: string
  fileKey: string
}

export type SignedPlaybackUrlData = {
  playbackUrl: string
}

export type ConfirmTrackAudioUploadBody = {
  mode: 'original' | 'preview'
  fileKey: string
}
