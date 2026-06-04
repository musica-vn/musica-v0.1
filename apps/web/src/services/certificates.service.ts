import type { PaginationMeta } from '@musica/contracts'
import { apiGet, apiPut } from '../api/axios'
import type {
  AdminCertificatesListData,
  AdminCertificatesListQuery,
  CertificateDetail,
  CertificateDownloadUrlData,
  CertificateRenderedHtml,
  CertificateTemplate,
} from '../types/certificates.types'

export const listAdminCertificates = async (query: AdminCertificatesListQuery) => {
  return apiGet<AdminCertificatesListData, PaginationMeta>('/admin/certificates', { params: query })
}

export const getAdminCertificateDetail = async (certificateId: string) => {
  return apiGet<CertificateDetail>(`/admin/certificates/${certificateId}`)
}

export const getAdminCertificateDownloadUrl = async (certificateId: string) => {
  return apiGet<CertificateDownloadUrlData>(`/admin/certificates/${certificateId}/download`)
}

export const getAdminCertificateTemplate = async () => {
  return apiGet<CertificateTemplate>('/admin/certificates/template')
}

export const updateAdminCertificateTemplate = async (htmlTemplate: string) => {
  return apiPut<CertificateTemplate, { htmlTemplate: string }>('/admin/certificates/template', {
    htmlTemplate,
  })
}

export const renderAdminCertificateHtml = async (certificateId: string) => {
  return apiGet<CertificateRenderedHtml>(`/admin/certificates/${certificateId}/render-html`)
}
