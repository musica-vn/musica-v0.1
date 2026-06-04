import { HttpException, HttpStatus, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { PaginationMeta } from '@musica/contracts'
import { buildPaginationMeta } from '../../common/base/pagination-meta'
import type { ApiEnvelopePayload } from '../../common/interceptors/api-response.interceptor'
import { SupabaseService } from '../../database/supabase.service'
import type {
  AdminComplianceDecisionRequestDto,
  AdminComplianceListQueryDto,
  ComplianceDetailDto,
  ComplianceLegalStatus,
  ComplianceListItemDto,
  ComplianceReviewStatus,
  ProductStatus,
  UploadedLegalFileDto,
} from './compliance.dto'
import { randomUUID } from 'crypto'

type DbTrackRow = {
  id: string
  title: string
  artist_id: string
  status: ProductStatus
}

type DbComplianceRow = {
  id: string
  track_id: string
  uploaded_legal_files: UploadedLegalFileDto[] | null
  legal_status: ComplianceLegalStatus
  review_status: ComplianceReviewStatus
  reject_reason: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

type DbComplianceApprovedPermissionRow = {
  permission_id: string
  core_permissions?: { name: string; law_reference: string } | null
}

type DbComplianceLegalFileRow = {
  file_key: string
  file_name?: string | null
  mime_type?: string | null
  file_size_bytes?: number | null
  uploaded_at?: string | null
}

type DbCorePermissionRow = {
  id: string
  status: 'ACTIVE' | 'INACTIVE'
}

type DbUserRow = {
  id: string
  email?: string | null
  full_name?: string | null
  status: 'ACTIVE' | 'LOCKED' | 'DELETED'
}

type DbComplianceJoinRow = DbComplianceRow & {
  products?: DbTrackRow | null
  compliance_approved_permissions?: DbComplianceApprovedPermissionRow[] | null
  compliance_legal_files?: DbComplianceLegalFileRow[] | null
}

type UploadedFileInput = {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

const SIGNED_URL_EXPIRES_IN_SECONDS = 60 * 60 * 6

const slugifyFileName = (value: string): string => {
  const safeInput = value.trim().replaceAll('\\', '-').replaceAll('/', '-').replaceAll('..', '.')
  const dotIndex = safeInput.lastIndexOf('.')
  const base = dotIndex > 0 ? safeInput.slice(0, dotIndex) : safeInput
  const extensionRaw = dotIndex > 0 ? safeInput.slice(dotIndex + 1) : ''

  const baseSlug = base
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll(' ', '-')
    .replaceAll(/[^a-zA-Z0-9._-]/g, '')
    .replaceAll(/-+/g, '-')
    .replaceAll(/^\.+|\.+$/g, '')
    .replaceAll(/^-+|-+$/g, '')

  const extensionSlug = extensionRaw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replaceAll(/[^a-zA-Z0-9]/g, '')
    .toLowerCase()

  if (extensionSlug.length === 0) return baseSlug.length > 0 ? baseSlug : 'file'
  return `${baseSlug.length > 0 ? baseSlug : 'file'}.${extensionSlug}`
}

const isAllowedMimeType = (mimeType: string): boolean =>
  [
    'application/pdf',
    'application/x-pdf',
    'application/acrobat',
    'applications/vnd.pdf',
    'text/pdf',
    'application/msword',
    'application/vnd.ms-word',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
  ].includes(mimeType)

const normalizeMimeType = (mimeType: string): string =>
  mimeType.split(';')[0]?.trim().toLowerCase() ?? ''

const getFileExtension = (fileName: string): string | null => {
  const dotIndex = fileName.lastIndexOf('.')
  if (dotIndex <= 0) return null
  const extension = fileName.slice(dotIndex + 1).trim().toLowerCase()
  return extension.length > 0 ? extension : null
}

const inferMimeTypeFromExtension = (extension: string | null): string | null => {
  if (!extension) return null
  if (extension === 'pdf') return 'application/pdf'
  if (extension === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (extension === 'doc') return 'application/msword'
  if (extension === 'png') return 'image/png'
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg'
  if (extension === 'webp') return 'image/webp'
  return null
}

const resolveLegalFileMimeType = (params: {
  mimeType: string
  fileName: string
}): { resolvedMimeType: string; extension: string | null } | null => {
  const normalizedMimeType = normalizeMimeType(params.mimeType)
  const extension = getFileExtension(params.fileName)

  if (isAllowedMimeType(normalizedMimeType)) {
    return { resolvedMimeType: normalizedMimeType, extension }
  }

  if (normalizedMimeType !== 'application/octet-stream') return null

  const inferred = inferMimeTypeFromExtension(extension)
  if (!inferred) return null
  return { resolvedMimeType: inferred, extension }
}

const mapComplianceLegalFiles = (
  fileRows: DbComplianceLegalFileRow[] | null | undefined,
  legacyFiles: UploadedLegalFileDto[] | null | undefined,
): UploadedLegalFileDto[] => {
  const normalizedRows = (fileRows ?? [])
    .filter((file): file is DbComplianceLegalFileRow => !!file && typeof file.file_key === 'string')
    .map((file) => ({
      fileName: typeof file.file_name === 'string' && file.file_name.length > 0 ? file.file_name : file.file_key,
      fileKey: file.file_key,
      uploadedAt: typeof file.uploaded_at === 'string' && file.uploaded_at.length > 0 ? file.uploaded_at : new Date(0).toISOString(),
      mimeType:
        typeof file.mime_type === 'string' && file.mime_type.length > 0
          ? file.mime_type
          : 'application/octet-stream',
      size: typeof file.file_size_bytes === 'number' && Number.isFinite(file.file_size_bytes) ? file.file_size_bytes : 0,
    }))

  if (normalizedRows.length > 0) return normalizedRows
  return Array.isArray(legacyFiles) ? legacyFiles : []
}

@Injectable()
export class ComplianceService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  private async ensureReviewerUserExists(userId: string) {
    const { data: reviewer, error } = await this.supabaseService.client
      .from('users')
      .select('id,status')
      .eq('id', userId)
      .maybeSingle<DbUserRow>()

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    if (!reviewer) {
      throw new HttpException('REVIEWER_NOT_FOUND', HttpStatus.UNAUTHORIZED)
    }

    if (reviewer.status !== 'ACTIVE') {
      throw new HttpException('REVIEWER_NOT_ACTIVE', HttpStatus.FORBIDDEN)
    }
  }

  private async getUserDisplayNameMap(userIds: Array<string | null | undefined>): Promise<Map<string, string>> {
    const normalizedIds = Array.from(
      new Set(
        userIds.filter((userId): userId is string => typeof userId === 'string' && userId.trim().length > 0),
      ),
    )

    if (normalizedIds.length === 0) return new Map<string, string>()

    const { data, error } = await this.supabaseService.client
      .from('users')
      .select('id,email,full_name,status')
      .in('id', normalizedIds)
      .returns<DbUserRow[]>()

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    return new Map(
      (data ?? [])
        .filter((user) => user.status !== 'DELETED')
        .map((user) => [
          user.id,
          typeof user.full_name === 'string' && user.full_name.trim().length > 0
            ? user.full_name.trim()
            : typeof user.email === 'string' && user.email.trim().length > 0
              ? user.email.trim()
              : user.id,
        ]),
    )
  }

  private async getTrackIdsForFilter(params: {
    keyword?: string
    productStatus?: ProductStatus
  }): Promise<string[] | undefined> {
    const keyword = typeof params.keyword === 'string' ? params.keyword.trim() : undefined
    const hasKeyword = typeof keyword === 'string' && keyword.length > 0

    if (!hasKeyword && !params.productStatus) return undefined

    let sb = this.supabaseService.client.from('products').select('id')
    if (params.productStatus) sb = sb.eq('status', params.productStatus)

    if (hasKeyword) {
      const escaped = keyword.replaceAll(',', '')
      sb = sb.or(`title.ilike.%${escaped}%`)
    }

    const { data, error } = await sb.returns<{ id: string }[]>()
    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)

    return (data ?? []).map((x) => x.id)
  }

  private async validateActivePermissionIds(permissionIds: string[]): Promise<void> {
    const normalized = (permissionIds ?? []).filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    if (normalized.length === 0) return

    const { data, error } = await this.supabaseService.client
      .from('core_permissions')
      .select('id,status')
      .in('id', normalized)
      .returns<DbCorePermissionRow[]>()

    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)

    const activeSet = new Set((data ?? []).filter((x) => x.status === 'ACTIVE').map((x) => x.id))
    const invalid = normalized.filter((id) => !activeSet.has(id))
    if (invalid.length > 0) {
      throw new HttpException(
        { message: 'CORE_PERMISSION_NOT_ACTIVE', details: { invalid } },
        HttpStatus.BAD_REQUEST,
      )
    }
  }

  private async getComplianceByTrackId(trackId: string): Promise<DbComplianceRow> {
    const { data, error } = await this.supabaseService.client
      .from('compliance_reviews')
      .select('*')
      .eq('track_id', trackId)
      .maybeSingle<DbComplianceRow>()

    if (error) throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    if (!data) throw new HttpException('COMPLIANCE_NOT_FOUND', HttpStatus.NOT_FOUND)

    return data
  }

  private async getComplianceUploadedFiles(
    complianceId: string,
    legacyFiles?: UploadedLegalFileDto[] | null,
  ): Promise<UploadedLegalFileDto[]> {
    const { data, error } = await this.supabaseService.client
      .from('compliance_legal_files')
      .select('file_key,file_name,mime_type,file_size_bytes,uploaded_at')
      .eq('compliance_review_id', complianceId)
      .order('uploaded_at', { ascending: true })
      .returns<DbComplianceLegalFileRow[]>()

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    return mapComplianceLegalFiles(data, legacyFiles)
  }

  private async syncLegacyUploadedFiles(
    complianceId: string,
    uploadedLegalFiles: UploadedLegalFileDto[],
  ): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('compliance_reviews')
      .update({ uploaded_legal_files: uploadedLegalFiles })
      .eq('id', complianceId)

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }

  async listAdminCompliance(
    query: AdminComplianceListQueryDto,
  ): Promise<ApiEnvelopePayload<{ items: ComplianceListItemDto[] }, PaginationMeta>> {
    const from = (query.page - 1) * query.pageSize
    const to = from + query.pageSize - 1

    const keyword = typeof query.keyword === 'string' ? query.keyword.trim() : undefined
    const q = typeof query.q === 'string' ? query.q.trim() : undefined
    const search = keyword && keyword.length > 0 ? keyword : q && q.length > 0 ? q : undefined

    const trackIds = await this.getTrackIdsForFilter({ keyword: search, productStatus: query.productStatus })
    if (trackIds && trackIds.length === 0) {
      return { data: { items: [] }, meta: buildPaginationMeta(query.page, query.pageSize, 0) }
    }

    let sb = this.supabaseService.client
      .from('compliance_reviews')
      .select('*, products(id,title,artist_id,status), compliance_legal_files(file_key)', { count: 'exact' })
      .order('updated_at', { ascending: false })

    if (query.legalStatus) sb = sb.eq('legal_status', query.legalStatus)
    if (query.reviewStatus) sb = sb.eq('review_status', query.reviewStatus)
    if (trackIds) sb = sb.in('track_id', trackIds)

    const { data, error, count } = await sb.range(from, to).returns<DbComplianceJoinRow[]>()
    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    const totalItems = typeof count === 'number' ? count : 0
    const meta = buildPaginationMeta(query.page, query.pageSize, totalItems)
    const userDisplayNameMap = await this.getUserDisplayNameMap(
      (data ?? []).flatMap((row) => [row.products?.artist_id, row.reviewed_by]),
    )

    const items = (data ?? [])
      .filter((row): row is DbComplianceJoinRow & { products: DbTrackRow } => !!row.products)
      .map((row): ComplianceListItemDto => {
        const files = mapComplianceLegalFiles(row.compliance_legal_files, row.uploaded_legal_files)
        return {
          complianceId: row.id,
          legalStatus: row.legal_status,
          reviewStatus: row.review_status,
          filesCount: files.length,
          reviewedBy: row.reviewed_by,
          reviewedByName:
            typeof row.reviewed_by === 'string' ? userDisplayNameMap.get(row.reviewed_by) ?? row.reviewed_by : null,
          reviewedAt: row.reviewed_at,
          product: {
            trackId: row.products.id,
            title: row.products.title,
            artistId: row.products.artist_id,
            artistName: userDisplayNameMap.get(row.products.artist_id) ?? row.products.artist_id,
            status: row.products.status,
          },
        }
      })

    return { data: { items }, meta }
  }

  async getAdminComplianceDetail(trackId: string): Promise<ComplianceDetailDto> {
    const { data, error } = await this.supabaseService.client
      .from('compliance_reviews')
      .select(
        '*, products(id,title,artist_id,status), compliance_approved_permissions(permission_id, core_permissions(name,law_reference)), compliance_legal_files(file_key,file_name,mime_type,file_size_bytes,uploaded_at)',
      )
      .eq('track_id', trackId)
      .maybeSingle<DbComplianceJoinRow>()

    if (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }
    if (!data || !data.products) throw new HttpException('COMPLIANCE_NOT_FOUND', HttpStatus.NOT_FOUND)

    const approvedPermissionIds = (data.compliance_approved_permissions ?? [])
      .map((x) => x.permission_id)
      .filter((x): x is string => typeof x === 'string')

    const approvedPermissions = (data.compliance_approved_permissions ?? [])
      .map((x) => x.core_permissions)
      .filter((x): x is { name: string; law_reference: string } => !!x)
      .map((x) => ({ name: x.name, lawReference: x.law_reference }))

    const uploadedLegalFiles = mapComplianceLegalFiles(
      data.compliance_legal_files,
      data.uploaded_legal_files,
    )
    const userDisplayNameMap = await this.getUserDisplayNameMap([
      data.products.artist_id,
      data.reviewed_by,
    ])

    return {
      complianceId: data.id,
      legalStatus: data.legal_status,
      reviewStatus: data.review_status,
      rejectReason: data.reject_reason,
      reviewedBy: data.reviewed_by,
      reviewedByName:
        typeof data.reviewed_by === 'string' ? userDisplayNameMap.get(data.reviewed_by) ?? data.reviewed_by : null,
      reviewedAt: data.reviewed_at,
      approvedPermissionIds,
      approvedPermissions,
      uploadedLegalFiles,
      product: {
        trackId: data.products.id,
        title: data.products.title,
        artistId: data.products.artist_id,
        artistName: userDisplayNameMap.get(data.products.artist_id) ?? data.products.artist_id,
        status: data.products.status,
      },
    }
  }

  async uploadAdminComplianceFiles(
    trackId: string,
    files: UploadedFileInput[],
  ): Promise<{ uploadedLegalFiles: UploadedLegalFileDto[] }> {
    const bucket = this.configService.get<string>('STORAGE_BUCKET_LEGAL_FILES')
    if (!bucket) {
      throw new HttpException('Missing STORAGE_BUCKET_LEGAL_FILES', HttpStatus.INTERNAL_SERVER_ERROR)
    }

    const compliance = await this.getComplianceByTrackId(trackId)
    const existing = await this.getComplianceUploadedFiles(
      compliance.id,
      compliance.uploaded_legal_files,
    )

    const safeFiles = (files ?? []).filter((file) => file && typeof file.originalname === 'string')
    if (safeFiles.length === 0) {
      throw new HttpException('NO_FILES_UPLOADED', HttpStatus.BAD_REQUEST)
    }

    const maxBytes = 25 * 1024 * 1024
    for (const file of safeFiles) {
      if (file.size > maxBytes) {
        throw new HttpException(
          { message: 'LEGAL_FILE_TOO_LARGE', details: { fileName: file.originalname, maxBytes } },
          HttpStatus.BAD_REQUEST,
        )
      }
      const resolvedMime = resolveLegalFileMimeType({
        mimeType: file.mimetype,
        fileName: file.originalname,
      })
      if (!resolvedMime) {
        throw new HttpException(
          {
            message: 'LEGAL_FILE_TYPE_NOT_ALLOWED',
            details: {
              fileName: file.originalname,
              mimeType: file.mimetype,
              extension: getFileExtension(file.originalname),
            },
          },
          HttpStatus.BAD_REQUEST,
        )
      }
    }

    const uploadedAt = new Date().toISOString()
    const uploaded: UploadedLegalFileDto[] = []

    for (const file of safeFiles) {
      const safeName = slugifyFileName(file.originalname)
      const fileKey = `compliance/${trackId}/${randomUUID()}-${safeName}`
      const resolvedMimeType =
        resolveLegalFileMimeType({ mimeType: file.mimetype, fileName: file.originalname })
          ?.resolvedMimeType ?? normalizeMimeType(file.mimetype) ?? 'application/octet-stream'

      const { error } = await this.supabaseService.client.storage
        .from(bucket)
        .upload(fileKey, file.buffer, { contentType: resolvedMimeType, upsert: false })

      if (error) {
        throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
      }

      uploaded.push({
        fileName: file.originalname,
        fileKey,
        uploadedAt,
        mimeType: resolvedMimeType,
        size: file.size,
      })
    }

    const nextFiles = [...existing, ...uploaded]
    const { error: insertError } = await this.supabaseService.client
      .from('compliance_legal_files')
      .insert(
        uploaded.map((file) => ({
          compliance_review_id: compliance.id,
          file_name: file.fileName,
          file_key: file.fileKey,
          mime_type: file.mimeType,
          file_size_bytes: file.size,
        })),
      )

    if (insertError) {
      throw new HttpException(insertError.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    await this.syncLegacyUploadedFiles(compliance.id, nextFiles)

    return { uploadedLegalFiles: nextFiles }
  }

  async createAdminComplianceFileDownloadUrl(fileKey: string): Promise<{ downloadUrl: string }> {
    const bucket = this.configService.get<string>('STORAGE_BUCKET_LEGAL_FILES')
    if (!bucket) {
      throw new HttpException('Missing STORAGE_BUCKET_LEGAL_FILES', HttpStatus.INTERNAL_SERVER_ERROR)
    }

    const { data, error } = await this.supabaseService.client.storage
      .from(bucket)
      .createSignedUrl(fileKey, SIGNED_URL_EXPIRES_IN_SECONDS)

    if (error || !data) {
      throw new HttpException(error?.message ?? 'Failed to create signed url', HttpStatus.INTERNAL_SERVER_ERROR)
    }

    return { downloadUrl: data.signedUrl }
  }

  async submitAdminComplianceDecision(params: {
    trackId: string
    reviewerUserId: string
    payload: AdminComplianceDecisionRequestDto
  }): Promise<ComplianceDetailDto> {
    const compliance = await this.getComplianceByTrackId(params.trackId)

    if (
      (params.payload.legalStatus === 'INSUFFICIENT' || params.payload.reviewStatus === 'REJECTED') &&
      (!params.payload.rejectReason || params.payload.rejectReason.trim().length === 0)
    ) {
      throw new HttpException('REJECT_REASON_REQUIRED', HttpStatus.BAD_REQUEST)
    }

    await this.ensureReviewerUserExists(params.reviewerUserId)
    await this.validateActivePermissionIds(params.payload.approvedPermissionIds)

    const rejectReason =
      params.payload.legalStatus === 'INSUFFICIENT' || params.payload.reviewStatus === 'REJECTED'
        ? params.payload.rejectReason?.trim() ?? null
        : null

    const reviewedAt = new Date().toISOString()

    const { error: updateError } = await this.supabaseService.client
      .from('compliance_reviews')
      .update({
        legal_status: params.payload.legalStatus,
        review_status: params.payload.reviewStatus,
        reject_reason: rejectReason,
        reviewed_by: params.reviewerUserId,
        reviewed_at: reviewedAt,
      })
      .eq('id', compliance.id)

    if (updateError) {
      throw new HttpException(updateError.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    const { error: deleteError } = await this.supabaseService.client
      .from('compliance_approved_permissions')
      .delete()
      .eq('compliance_id', compliance.id)

    if (deleteError) {
      throw new HttpException(deleteError.message, HttpStatus.INTERNAL_SERVER_ERROR)
    }

    const approvedPermissionIds = Array.from(
      new Set(
        (params.payload.approvedPermissionIds ?? [])
      .map((x) => x.trim())
          .filter((x) => x.length > 0),
      ),
    )

    if (approvedPermissionIds.length > 0) {
      const { error: insertError } = await this.supabaseService.client
        .from('compliance_approved_permissions')
        .insert(approvedPermissionIds.map((permissionId) => ({ compliance_id: compliance.id, permission_id: permissionId })))

      if (insertError) {
        throw new HttpException(insertError.message, HttpStatus.INTERNAL_SERVER_ERROR)
      }
    }

    return this.getAdminComplianceDetail(params.trackId)
  }
}
