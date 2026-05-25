import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import {
  AdminCertificatesListQueryDto,
  UpdateCertificateTemplateRequestDto,
} from './admin-certificates.dto';
import { CertificatesService } from './certificates.service';
import {
  AdminCertificateDetailResponseDto,
  AdminCertificateDownloadUrlResponseDto,
  AdminCertificateRenderedHtmlResponseDto,
  AdminCertificatesListResponseDto,
  AdminCertificateTemplateResponseDto,
} from './certificates.swagger';

@ApiTags('Admin - Certificates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/certificates')
export class AdminCertificatesController {
  constructor(private readonly certificatesService: CertificatesService) {}

  @Get()
  @ApiOperation({ summary: 'List certificates (admin)' })
  @ApiOkResponse({ type: AdminCertificatesListResponseDto })
  async list(@Query() query: AdminCertificatesListQueryDto) {
    return this.certificatesService.listAdminCertificates(query);
  }

  @Get('template')
  @ApiOperation({ summary: 'Get certificate HTML template (admin)' })
  @ApiOkResponse({ type: AdminCertificateTemplateResponseDto })
  async getTemplate() {
    return this.certificatesService.getCertificateTemplate();
  }

  @Put('template')
  @ApiOperation({ summary: 'Update certificate HTML template (admin)' })
  @ApiOkResponse({ type: AdminCertificateTemplateResponseDto })
  async updateTemplate(@Body() body: UpdateCertificateTemplateRequestDto) {
    return this.certificatesService.updateCertificateTemplate(
      body.htmlTemplate,
    );
  }

  @Get(':certificateId')
  @ApiOperation({ summary: 'Get certificate detail (admin)' })
  @ApiOkResponse({ type: AdminCertificateDetailResponseDto })
  async detail(@Param('certificateId', ParseUUIDPipe) certificateId: string) {
    return this.certificatesService.getAdminCertificateDetail(certificateId);
  }

  @Get(':certificateId/download')
  @ApiOperation({
    summary: 'Get signed download URL for certificate PDF (admin)',
  })
  @ApiOkResponse({ type: AdminCertificateDownloadUrlResponseDto })
  async download(@Param('certificateId', ParseUUIDPipe) certificateId: string) {
    return this.certificatesService.createAdminCertificateDownloadUrl(
      certificateId,
    );
  }

  @Get(':certificateId/render-html')
  @ApiOperation({ summary: 'Render certificate HTML (admin)' })
  @ApiOkResponse({ type: AdminCertificateRenderedHtmlResponseDto })
  async renderHtml(
    @Param('certificateId', ParseUUIDPipe) certificateId: string,
  ) {
    return this.certificatesService.renderCertificateHtml(certificateId);
  }
}
