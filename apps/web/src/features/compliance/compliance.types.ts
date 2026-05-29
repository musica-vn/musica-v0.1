export type ComplianceLegalStatus = 'PENDING' | 'SUFFICIENT' | 'INSUFFICIENT'
export type ComplianceReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type ProductStatus = 'PENDING' | 'HIDDEN' | 'PUBLISHED'

export type UploadedLegalFile = {
  fileName: string
  fileKey: string
  uploadedAt: string
  mimeType: string
  size: number
}

export type ComplianceProductSnapshot = {
  trackId: string
  title: string
  artistId: string
  artistName: string | null
  status: ProductStatus
}

export type ComplianceListItem = {
  complianceId: string
  legalStatus: ComplianceLegalStatus
  reviewStatus: ComplianceReviewStatus
  filesCount: number
  reviewedBy: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  product: ComplianceProductSnapshot
}

export type ComplianceDetail = {
  complianceId: string
  legalStatus: ComplianceLegalStatus
  reviewStatus: ComplianceReviewStatus
  rejectReason: string | null
  reviewedBy: string | null
  reviewedByName: string | null
  reviewedAt: string | null
  approvedPermissionIds: string[]
  approvedPermissions: Array<{
    name: string
    lawReference: string
  }>
  uploadedLegalFiles: UploadedLegalFile[]
  product: ComplianceProductSnapshot
}

export type AdminComplianceListQuery = {
  page: number
  pageSize: number
  keyword?: string
  legalStatus?: ComplianceLegalStatus
  reviewStatus?: ComplianceReviewStatus
  productStatus?: ProductStatus
}

export type AdminComplianceListData = {
  items: ComplianceListItem[]
}

export type AdminComplianceFileDownloadUrlData = {
  downloadUrl: string
}

export type AdminComplianceDecisionPayload = {
  legalStatus: ComplianceLegalStatus
  reviewStatus: ComplianceReviewStatus
  approvedPermissionIds: string[]
  rejectReason?: string
}
