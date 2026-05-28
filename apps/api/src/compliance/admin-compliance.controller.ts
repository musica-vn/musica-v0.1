import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
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
import type { Request } from 'express'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { RequireRoles } from '../common/auth/require-roles.decorator'
import { RolesGuard } from '../common/auth/roles.guard'
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
    FilesInterceptor('files', 10, {
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async uploadFiles(
    @Param('trackId') trackId: string,
    @UploadedFiles() files: any[],
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
    @Req() req: Request & { user?: { userId?: string } },
  ) {
    const reviewerUserId = typeof req.user?.userId === 'string' ? req.user.userId : ''
    if (!reviewerUserId) {
      throw new HttpException('UNAUTHORIZED', HttpStatus.UNAUTHORIZED)
    }

    return this.complianceService.submitAdminComplianceDecision({ trackId, reviewerUserId, payload: body })
  }
}
