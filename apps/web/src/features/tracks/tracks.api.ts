import { apiGet, apiPatch, apiPost } from '../../shared/api/http'
import type { PaginationMeta } from '@musica/contracts'
import type {
  AdminCreateTrackBody,
  AdminTracksListData,
  AdminTracksListQuery,
  AdminTracksSummaryData,
  AdminTracksSummaryQuery,
  ConfirmTrackAudioUploadBody,
  ConfirmTrackThumbnailUploadBody,
  CreateThumbnailUploadUrlBody,
  SignedPlaybackUrlData,
  SignedThumbnailUrlData,
  AdminUpdateTrackBody,
  SignedUploadUrlData,
  Track,
} from './tracks.types'

export const listAdminTracks = async (query: AdminTracksListQuery) => {
  return apiGet<AdminTracksListData, PaginationMeta>('/admin/tracks', { params: query })
}

export const getAdminTracksSummary = async (query: AdminTracksSummaryQuery) => {
  return apiGet<AdminTracksSummaryData>('/admin/tracks/summary', { params: query })
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

export const confirmAdminTrackAudioUpload = async (trackId: string, body: ConfirmTrackAudioUploadBody) => {
  return apiPost<Track, ConfirmTrackAudioUploadBody>(`/admin/tracks/${trackId}/confirm-audio-upload`, body)
}

export const getThumbnailUploadUrl = async (trackId: string, body: CreateThumbnailUploadUrlBody) => {
  return apiPost<SignedUploadUrlData, CreateThumbnailUploadUrlBody>(`/admin/tracks/${trackId}/thumbnail-upload-url`, body)
}

export const confirmAdminTrackThumbnailUpload = async (trackId: string, body: ConfirmTrackThumbnailUploadBody) => {
  return apiPost<Track, ConfirmTrackThumbnailUploadBody>(`/admin/tracks/${trackId}/confirm-thumbnail-upload`, body)
}

export const getTrackThumbnailUrl = async (trackId: string) => {
  return apiGet<SignedThumbnailUrlData>(`/admin/tracks/${trackId}/thumbnail-url`)
}

export const getPreviewPlaybackUrl = async (trackId: string) => {
  return apiGet<SignedPlaybackUrlData>(`/admin/tracks/${trackId}/preview-playback-url`)
}

export const getOriginalPlaybackUrl = async (trackId: string) => {
  return apiGet<SignedPlaybackUrlData>(`/admin/tracks/${trackId}/original-playback-url`)
}
