import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ApiEnvelopePayload } from '../../common/interceptors/api-response.interceptor';
import { buildPaginationMeta } from '../../common/base/pagination-meta';
import type { PaginationMeta } from '@musica/contracts';
import { ApiHttpException } from '../../common/errors/api-http.exception';
import { throwSupabaseError } from '../../common/database/supabase-errors';
import { SupabaseService } from '../../database/supabase.service';
import { AdminCertificatesListQueryDto } from './admin-certificates.dto';
import {
  CertificateDetailDto,
  CertificateListItemDto,
  CertificateRenderedHtmlDto,
  CertificateTemplateDto,
} from './certificate.dto';

type DbCertificateRow = {
  id: string;
  track_id: string;
  buyer_id: string;
  artist_id: string;
  selected_usage_rights: string[];
  track_snapshot_name: string;
  buyer_snapshot_name: string;
  artist_snapshot_name: string;
  pdf_file_key: string;
  status: 'ACTIVE';
  valid_from: string;
  valid_until: string | null;
  created_at: string;
};

type DbUserRow = {
  id: string;
  email: string;
  full_name: string;
};

type DbTemplateRow = {
  id: number;
  html_template: string;
  updated_at: string;
};

type DbCertificateJoinRow = DbCertificateRow & {
  buyer?: { email?: string | null; full_name?: string | null } | null;
};

const parseSort = (
  sort: string | undefined,
): { column: keyof DbCertificateRow; ascending: boolean } => {
  const fallback: { column: keyof DbCertificateRow; ascending: boolean } = {
    column: 'created_at',
    ascending: false,
  };

  if (!sort) return fallback;

  const [field, dir] = sort.split(':');
  const ascending = dir !== 'desc';

  const fieldMapping: Record<string, keyof DbCertificateRow> = {
    createdAt: 'created_at',
    validFrom: 'valid_from',
    status: 'status',
  };

  const column = fieldMapping[field];
  if (!column) return fallback;

  return { column, ascending };
};

const replacePlaceholders = (
  template: string,
  values: Record<string, string>,
): string =>
  Object.entries(values).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, value),
    template,
  );

const defaultCertificateTemplateHtml = `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Certificate</title>
  </head>
  <body>
    <h1>License Certificate</h1>
    <p>Certificate ID: {{certificateId}}</p>
    <p>Track: {{trackSnapshotName}}</p>
    <p>Buyer: {{buyerSnapshotName}}</p>
    <p>Artist: {{artistSnapshotName}}</p>
    <p>Usage Rights: {{selectedUsageRights}}</p>
    <p>Valid From: {{validFrom}}</p>
    <p>Valid Until: {{validUntil}}</p>
    <p>Issued At: {{createdAt}}</p>
  </body>
</html>
`.trim();

@Injectable()
export class CertificatesService {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly configService: ConfigService,
  ) {}

  async listAdminCertificates(
    query: AdminCertificatesListQueryDto,
  ): Promise<
    ApiEnvelopePayload<{ items: CertificateListItemDto[] }, PaginationMeta>
  > {
    const { column, ascending } = parseSort(query.sort);
    const from = (query.page - 1) * query.pageSize;
    const to = from + query.pageSize - 1;

    let buyerIdsFilter: string[] | undefined;
    if (
      typeof query.buyerKeyword === 'string' &&
      query.buyerKeyword.trim().length > 0
    ) {
      const keyword = query.buyerKeyword.trim();

      const { data: users, error: usersError } =
        await this.supabaseService.client
          .from('users')
          .select('id,email,full_name')
          .or(`email.ilike.%${keyword}%,full_name.ilike.%${keyword}%`)
          .returns<DbUserRow[]>();

      if (usersError) {
        throwSupabaseError(
          'CERTIFICATE_BUYER_LOOKUP_FAILED',
          HttpStatus.INTERNAL_SERVER_ERROR,
          usersError,
        );
      }

      buyerIdsFilter = (users ?? []).map((x) => x.id);
      if (buyerIdsFilter.length === 0) {
        return {
          data: { items: [] },
          meta: buildPaginationMeta(query.page, query.pageSize, 0),
        };
      }
    }

    let requestBuilder = this.supabaseService.client
      .from('certificates')
      .select('*, buyer:users!certificates_buyer_id_fkey(email,full_name)', {
        count: 'exact',
      })
      .order(column, { ascending });

    if (query.artistId)
      requestBuilder = requestBuilder.eq('artist_id', query.artistId);
    if (query.status)
      requestBuilder = requestBuilder.eq('status', query.status);
    if (query.fromDate)
      requestBuilder = requestBuilder.gte('created_at', query.fromDate);
    if (query.toDate)
      requestBuilder = requestBuilder.lte('created_at', query.toDate);
    if (buyerIdsFilter)
      requestBuilder = requestBuilder.in('buyer_id', buyerIdsFilter);

    if (
      typeof query.trackKeyword === 'string' &&
      query.trackKeyword.trim().length > 0
    ) {
      requestBuilder = requestBuilder.ilike(
        'track_snapshot_name',
        `%${query.trackKeyword.trim()}%`,
      );
    }

    if (typeof query.q === 'string' && query.q.trim().length > 0) {
      requestBuilder = requestBuilder.ilike(
        'track_snapshot_name',
        `%${query.q.trim()}%`,
      );
    }

    const { data, error, count } = await requestBuilder
      .range(from, to)
      .returns<DbCertificateJoinRow[]>();

    if (error) {
      throwSupabaseError(
        'CERTIFICATES_LIST_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }

    const totalItems = typeof count === 'number' ? count : 0;
    const meta = buildPaginationMeta(query.page, query.pageSize, totalItems);

    const items = (data ?? []).map(
      (row): CertificateListItemDto => ({
        id: row.id,
        trackId: row.track_id,
        buyerId: row.buyer_id,
        artistId: row.artist_id,
        trackSnapshotName: row.track_snapshot_name,
        buyerSnapshotName: row.buyer_snapshot_name,
        artistSnapshotName: row.artist_snapshot_name,
        status: row.status,
        createdAt: row.created_at,
        validFrom: row.valid_from,
        validUntil: row.valid_until,
        buyerEmail:
          row.buyer && typeof row.buyer.email === 'string'
            ? row.buyer.email
            : null,
      }),
    );

    return { data: { items }, meta };
  }

  async getAdminCertificateDetail(
    certificateId: string,
  ): Promise<CertificateDetailDto> {
    const { data, error } = await this.supabaseService.client
      .from('certificates')
      .select('*, buyer:users!certificates_buyer_id_fkey(email)')
      .eq('id', certificateId)
      .maybeSingle<DbCertificateJoinRow>();

    if (error) {
      throwSupabaseError(
        'CERTIFICATE_GET_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }

    if (!data) {
      throw new ApiHttpException(
        { code: 'CERTIFICATE_NOT_FOUND' },
        HttpStatus.NOT_FOUND,
      );
    }

    return {
      id: data.id,
      trackId: data.track_id,
      buyerId: data.buyer_id,
      artistId: data.artist_id,
      selectedUsageRights: data.selected_usage_rights ?? [],
      trackSnapshotName: data.track_snapshot_name,
      buyerSnapshotName: data.buyer_snapshot_name,
      artistSnapshotName: data.artist_snapshot_name,
      pdfFileKey: data.pdf_file_key,
      status: data.status,
      validFrom: data.valid_from,
      validUntil: data.valid_until,
      createdAt: data.created_at,
      buyerEmail:
        data.buyer && typeof data.buyer.email === 'string'
          ? data.buyer.email
          : null,
    };
  }

  async createAdminCertificateDownloadUrl(
    certificateId: string,
  ): Promise<{ downloadUrl: string; fileName: string }> {
    const detail = await this.getAdminCertificateDetail(certificateId);

    if (!detail.pdfFileKey || detail.pdfFileKey.trim().length === 0) {
      throw new ApiHttpException(
        { code: 'CERTIFICATE_PDF_NOT_AVAILABLE' },
        HttpStatus.CONFLICT,
      );
    }

    const bucket = this.configService.get<string>(
      'STORAGE_BUCKET_CERTIFICATES',
    );
    if (!bucket) {
      throw new ApiHttpException(
        { code: 'MISSING_STORAGE_BUCKET_CERTIFICATES' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const expiresInSeconds = 60 * 30;
    const { data, error } = await this.supabaseService.client.storage
      .from(bucket)
      .createSignedUrl(detail.pdfFileKey, expiresInSeconds);

    if (error) {
      throwSupabaseError(
        'CERTIFICATE_DOWNLOAD_URL_CREATE_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }

    if (!data?.signedUrl) {
      throw new ApiHttpException(
        { code: 'CERTIFICATE_DOWNLOAD_URL_CREATE_FAILED' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      downloadUrl: data.signedUrl,
      fileName: `certificate-${certificateId}.pdf`,
    };
  }

  async getCertificateTemplate(): Promise<CertificateTemplateDto> {
    const { data, error } = await this.supabaseService.client
      .from('certificate_templates')
      .select('id,html_template,updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle<DbTemplateRow>();

    if (error) {
      throwSupabaseError(
        'CERTIFICATE_TEMPLATE_GET_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }

    if (!data) {
      return {
        id: null,
        htmlTemplate: defaultCertificateTemplateHtml,
        updatedAt: new Date().toISOString(),
      };
    }

    return {
      id: data.id,
      htmlTemplate: data.html_template,
      updatedAt: data.updated_at,
    };
  }

  async updateCertificateTemplate(
    htmlTemplate: string,
  ): Promise<CertificateTemplateDto> {
    const currentTemplate = await this.getCertificateTemplate();
    const { data, error } = await this.supabaseService.client
      .from('certificate_templates')
      .upsert(
        currentTemplate.id === null
          ? { html_template: htmlTemplate }
          : { id: currentTemplate.id, html_template: htmlTemplate },
        currentTemplate.id === null ? undefined : { onConflict: 'id' },
      )
      .select('id,html_template,updated_at')
      .single<DbTemplateRow>();

    if (error) {
      throwSupabaseError(
        'CERTIFICATE_TEMPLATE_UPDATE_FAILED',
        HttpStatus.INTERNAL_SERVER_ERROR,
        error,
      );
    }

    if (!data) {
      throw new ApiHttpException(
        { code: 'CERTIFICATE_TEMPLATE_UPDATE_FAILED' },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    return {
      id: data.id,
      htmlTemplate: data.html_template,
      updatedAt: data.updated_at,
    };
  }

  async renderCertificateHtml(
    certificateId: string,
  ): Promise<CertificateRenderedHtmlDto> {
    const [template, certificate] = await Promise.all([
      this.getCertificateTemplate(),
      this.getAdminCertificateDetail(certificateId),
    ]);

    const values: Record<string, string> = {
      certificateId: certificate.id,
      trackSnapshotName: certificate.trackSnapshotName,
      buyerSnapshotName: certificate.buyerSnapshotName,
      artistSnapshotName: certificate.artistSnapshotName,
      selectedUsageRights: (certificate.selectedUsageRights ?? []).join(', '),
      validFrom: certificate.validFrom,
      validUntil: certificate.validUntil ?? '',
      createdAt: certificate.createdAt,
    };

    const html = replacePlaceholders(template.htmlTemplate, values);

    return { html };
  }
}
