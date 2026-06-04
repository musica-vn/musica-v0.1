import { apiGet, apiPost, apiPut } from '../api/axios'
import type { PaginationMeta } from '@musica/contracts'
import type {
  AdminComplianceDecisionPayload,
  AdminComplianceFileDownloadUrlData,
  AdminComplianceListData,
  AdminComplianceListQuery,
  ComplianceDetail,
  UploadedLegalFile,
} from '../types/compliance.types'

export const listAdminCompliance = async (query: AdminComplianceListQuery) => {
  return apiGet<AdminComplianceListData, PaginationMeta>('/admin/compliance', { params: query })
}

export const getAdminComplianceDetail = async (trackId: string) => {
  return apiGet<ComplianceDetail>(`/admin/compliance/${trackId}`)
}

export const uploadAdminComplianceFiles = async (trackId: string, files: File[]) => {
  const formData = new FormData()
  files.forEach((file) => formData.append('files', file))
  return apiPost<{ uploadedLegalFiles: UploadedLegalFile[] }, FormData>(`/admin/compliance/${trackId}/files`, formData)
}

export const createAdminComplianceFileDownloadUrl = async (fileKey: string) => {
  return apiPost<AdminComplianceFileDownloadUrlData, { fileKey: string }>(
    '/admin/compliance/files/download-url',
    { fileKey },
  )
}

export const submitAdminComplianceDecision = async (trackId: string, payload: AdminComplianceDecisionPayload) => {
  return apiPut<ComplianceDetail, AdminComplianceDecisionPayload>(`/admin/compliance/${trackId}/decision`, payload)
}
