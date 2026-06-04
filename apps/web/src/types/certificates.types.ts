export type CertificateStatus = 'ACTIVE'

export type CertificateListItem = {
  id: string
  trackId: string
  buyerId: string
  artistId: string
  trackSnapshotName: string
  buyerSnapshotName: string
  artistSnapshotName: string
  status: CertificateStatus
  createdAt: string
  validFrom: string
  validUntil: string | null
  buyerEmail: string | null
}

export type CertificateDetail = {
  id: string
  trackId: string
  buyerId: string
  artistId: string
  selectedUsageRights: string[]
  trackSnapshotName: string
  buyerSnapshotName: string
  artistSnapshotName: string
  pdfFileKey: string
  status: CertificateStatus
  validFrom: string
  validUntil: string | null
  createdAt: string
  buyerEmail: string | null
}

export type AdminCertificatesListQuery = {
  page: number
  pageSize: number
  buyerKeyword?: string
  trackKeyword?: string
  artistId?: string
  status?: CertificateStatus
  fromDate?: string
  toDate?: string
}

export type AdminCertificatesListData = {
  items: CertificateListItem[]
}

export type CertificateDownloadUrlData = {
  downloadUrl: string
  fileName: string
}

export type CertificateTemplate = {
  id: number | null
  htmlTemplate: string
  updatedAt: string
}

export type CertificateRenderedHtml = {
  html: string
}
