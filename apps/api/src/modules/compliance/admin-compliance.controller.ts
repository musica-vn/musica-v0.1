import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common'
import { ApiBearerAuth, ApiConsumes, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { FilesInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard'
import { RequireRoles } from '../../common/auth/require-roles.decorator'
import { RolesGuard } from '../../common/auth/roles.guard'
import { CurrentUser } from '../../common/auth/current-user.decorator'
import type { AuthUserContext } from '../../common/auth/auth.types'
import {
  AdminComplianceDecisionRequestDto,
  AdminComplianceListQueryDto,
  AdminCreateComplianceFileDownloadUrlRequestDto,
} from './compliance.dto'
import { ComplianceService } from './compliance.service'
import {
  AdminComplianceDetailResponseDto,
  AdminComplianceFileDownloadUrlResponseDto,
  AdminComplianceListResponseDto,
} from './compliance.swagger'
import {
  COMPLIANCE_MAX_FILES,
  COMPLIANCE_MAX_FILE_SIZE_BYTES,
} from './compliance-upload.constants'

type UploadedMulterFile = {
  originalname: string
  mimetype: string
  size: number
  buffer: Buffer
}

@ApiTags('Admin - Compliance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/compliance')
export class AdminComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get()
  @ApiOkResponse({ type: AdminComplianceListResponseDto })
  async list(@Query() query: AdminComplianceListQueryDto) {
    return this.complianceService.listAdminCompliance(query)
  }

  @Get(':trackId')
  @ApiOkResponse({ type: AdminComplianceDetailResponseDto })
  async detail(@Param('trackId') trackId: string) {
    return this.complianceService.getAdminComplianceDetail(trackId)
  }

  @Post(':trackId/files')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('files', COMPLIANCE_MAX_FILES, {
      limits: { fileSize: COMPLIANCE_MAX_FILE_SIZE_BYTES },
    }),
  )
  async uploadFiles(
    @Param('trackId') trackId: string,
    @UploadedFiles() files: UploadedMulterFile[],
  ) {
    return this.complianceService.uploadAdminComplianceFiles(trackId, files)
  }

  @Post('files/download-url')
  @ApiOkResponse({ type: AdminComplianceFileDownloadUrlResponseDto })
  async createDownloadUrl(@Body() body: AdminCreateComplianceFileDownloadUrlRequestDto) {
    return this.complianceService.createAdminComplianceFileDownloadUrl(body.fileKey)
  }

  @Put(':trackId/decision')
  @ApiOkResponse({ type: AdminComplianceDetailResponseDto })
  async submitDecision(
    @Param('trackId') trackId: string,
    @Body() body: AdminComplianceDecisionRequestDto,
    @CurrentUser() currentUser: AuthUserContext | null,
  ) {
    const reviewerUserId = typeof currentUser?.userId === 'string' ? currentUser.userId : ''
    return this.complianceService.submitAdminComplianceDecision({
      trackId,
      reviewerUserId,
      payload: body,
    })
  }
}
