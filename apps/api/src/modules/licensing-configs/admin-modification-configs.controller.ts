import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard'
import { RequireRoles } from '../../common/auth/require-roles.decorator'
import { RolesGuard } from '../../common/auth/roles.guard'
import {
  CreateModificationConfigRequestDto,
  GenericConfigsListQueryDto,
  UpdateConfigStatusRequestDto,
  UpdateModificationConfigRequestDto,
} from './licensing-configs.dto'
import {
  AdminModificationConfigResponseDto,
  AdminModificationConfigsListResponseDto,
} from './licensing-configs.swagger'
import { LicensingConfigsService } from './licensing-configs.service'

@ApiTags('Admin - Modification Configs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/modification-configs')
export class AdminModificationConfigsController {
  constructor(private readonly licensingConfigsService: LicensingConfigsService) {}

  @Get()
  @ApiOkResponse({ type: AdminModificationConfigsListResponseDto })
  async list(@Query() query: GenericConfigsListQueryDto) {
    return this.licensingConfigsService.listModificationConfigs(query)
  }

  @Get(':configId')
  @ApiOkResponse({ type: AdminModificationConfigResponseDto })
  async getDetail(@Param('configId', ParseUUIDPipe) configId: string) {
    return this.licensingConfigsService.getModificationConfig(configId)
  }

  @Post()
  @ApiCreatedResponse({ type: AdminModificationConfigResponseDto })
  async create(@Body() body: CreateModificationConfigRequestDto) {
    return this.licensingConfigsService.createModificationConfig(body)
  }

  @Patch(':configId')
  @ApiOkResponse({ type: AdminModificationConfigResponseDto })
  async update(
    @Param('configId', ParseUUIDPipe) configId: string,
    @Body() body: UpdateModificationConfigRequestDto,
  ) {
    return this.licensingConfigsService.updateModificationConfig(configId, body)
  }

  @Patch(':configId/status')
  @ApiOkResponse({ type: AdminModificationConfigResponseDto })
  async updateStatus(
    @Param('configId', ParseUUIDPipe) configId: string,
    @Body() body: UpdateConfigStatusRequestDto,
  ) {
    return this.licensingConfigsService.updateModificationConfigStatus(configId, body)
  }

  @Delete(':configId')
  async delete(@Param('configId', ParseUUIDPipe) configId: string) {
    return this.licensingConfigsService.deleteModificationConfig(configId)
  }
}
