import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard'
import { RequireRoles } from '../../common/auth/require-roles.decorator'
import { RolesGuard } from '../../common/auth/roles.guard'
import {
  CreateDigitalRightConfigRequestDto,
  DigitalRightConfigsListQueryDto,
  UpdateConfigStatusRequestDto,
  UpdateDigitalPlatformDefaultTemplateRequestDto,
  UpdateDigitalRightConfigRequestDto,
} from './licensing-configs.dto'
import {
  AdminDigitalPlatformDefaultTemplateResponseDto,
  AdminDigitalRightConfigResponseDto,
  AdminDigitalRightConfigsListResponseDto,
} from './licensing-configs.swagger'
import { LicensingConfigsService } from './licensing-configs.service'

@ApiTags('Admin - Digital Rights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/digital-right-configs')
export class AdminDigitalRightConfigsController {
  constructor(private readonly licensingConfigsService: LicensingConfigsService) {}

  @Get('default-template')
  @ApiOkResponse({ type: AdminDigitalPlatformDefaultTemplateResponseDto })
  async getDefaultTemplate() {
    return this.licensingConfigsService.getDigitalPlatformDefaultTemplate()
  }

  @Patch('default-template')
  @ApiOkResponse({ type: AdminDigitalPlatformDefaultTemplateResponseDto })
  async updateDefaultTemplate(@Body() body: UpdateDigitalPlatformDefaultTemplateRequestDto) {
    return this.licensingConfigsService.updateDigitalPlatformDefaultTemplate(body)
  }

  @Get()
  @ApiOkResponse({ type: AdminDigitalRightConfigsListResponseDto })
  async list(@Query() query: DigitalRightConfigsListQueryDto) {
    return this.licensingConfigsService.listDigitalRightConfigs(query)
  }

  @Get(':configId')
  @ApiOkResponse({ type: AdminDigitalRightConfigResponseDto })
  async getDetail(@Param('configId', ParseUUIDPipe) configId: string) {
    return this.licensingConfigsService.getDigitalRightConfig(configId)
  }

  @Post()
  @ApiCreatedResponse({ type: AdminDigitalRightConfigResponseDto })
  async create(@Body() body: CreateDigitalRightConfigRequestDto) {
    return this.licensingConfigsService.createDigitalRightConfig(body)
  }

  @Patch(':configId')
  @ApiOkResponse({ type: AdminDigitalRightConfigResponseDto })
  async update(
    @Param('configId', ParseUUIDPipe) configId: string,
    @Body() body: UpdateDigitalRightConfigRequestDto,
  ) {
    return this.licensingConfigsService.updateDigitalRightConfig(configId, body)
  }

  @Patch(':configId/status')
  @ApiOkResponse({ type: AdminDigitalRightConfigResponseDto })
  async updateStatus(
    @Param('configId', ParseUUIDPipe) configId: string,
    @Body() body: UpdateConfigStatusRequestDto,
  ) {
    return this.licensingConfigsService.updateDigitalRightConfigStatus(configId, body)
  }

  @Delete(':configId')
  async delete(@Param('configId', ParseUUIDPipe) configId: string) {
    return this.licensingConfigsService.deleteDigitalRightConfig(configId)
  }
}
