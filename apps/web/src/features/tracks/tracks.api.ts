import { apiGet, apiPatch, apiPost } from '../../shared/api/http'
import type { PaginationMeta } from '@musica/contracts'
import type {
  AdminCreateTrackBody,
  AdminTracksListData,
  AdminTracksListQuery,
  SignedPlaybackUrlData,
  AdminUpdateTrackBody,
  SignedUploadUrlData,
  Track,
} from './tracks.types'

export const listAdminTracks = async (query: AdminTracksListQuery) => {
  return apiGet<AdminTracksListData, PaginationMeta>('/admin/tracks', { params: query })
}

export const createAdminTrack = async (body: AdminCreateTrackBody) => {
  return apiPost<Track, AdminCreateTrackBody>('/admin/tracks', body)
}

export const updateAdminTrack = async (trackId: string, body: AdminUpdateTrackBody) => {
  return apiPatch<Track, AdminUpdateTrackBody>(`/admin/tracks/${trackId}`, body)
}

export const publishAdminTrack = async (trackId: string) => {
  return apiPatch<Track>(`/admin/tracks/${trackId}/publish`)
}

export const hideAdminTrack = async (trackId: string) => {
  return apiPatch<Track>(`/admin/tracks/${trackId}/hide`)
}

export const getOriginalUploadUrl = async (trackId: string) => {
  return apiPost<SignedUploadUrlData>(`/admin/tracks/${trackId}/original-upload-url`)
}

export const getPreviewUploadUrl = async (trackId: string) => {
  return apiPost<SignedUploadUrlData>(`/admin/tracks/${trackId}/preview-upload-url`)
}

export const getPreviewPlaybackUrl = async (trackId: string) => {
  return apiGet<SignedPlaybackUrlData>(`/admin/tracks/${trackId}/preview-playback-url`)
}
