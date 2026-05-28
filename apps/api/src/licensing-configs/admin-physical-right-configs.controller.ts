import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { RequireRoles } from '../common/auth/require-roles.decorator'
import { RolesGuard } from '../common/auth/roles.guard'
import {
  CreatePhysicalRightConfigRequestDto,
  GenericConfigsListQueryDto,
  UpdateConfigStatusRequestDto,
  UpdatePhysicalRightConfigRequestDto,
} from './licensing-configs.dto'
import {
  AdminPhysicalRightConfigResponseDto,
  AdminPhysicalRightConfigsListResponseDto,
} from './licensing-configs.swagger'
import { LicensingConfigsService } from './licensing-configs.service'

@ApiTags('Admin - Physical Rights')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/physical-right-configs')
export class AdminPhysicalRightConfigsController {
  constructor(private readonly licensingConfigsService: LicensingConfigsService) {}

  @Get()
  @ApiOkResponse({ type: AdminPhysicalRightConfigsListResponseDto })
  async list(@Query() query: GenericConfigsListQueryDto) {
    return this.licensingConfigsService.listPhysicalRightConfigs(query)
  }

  @Get(':configId')
  @ApiOkResponse({ type: AdminPhysicalRightConfigResponseDto })
  async getDetail(@Param('configId', ParseUUIDPipe) configId: string) {
    return this.licensingConfigsService.getPhysicalRightConfig(configId)
  }

  @Post()
  @ApiCreatedResponse({ type: AdminPhysicalRightConfigResponseDto })
  async create(@Body() body: CreatePhysicalRightConfigRequestDto) {
    return this.licensingConfigsService.createPhysicalRightConfig(body)
  }

  @Patch(':configId')
  @ApiOkResponse({ type: AdminPhysicalRightConfigResponseDto })
  async update(
    @Param('configId', ParseUUIDPipe) configId: string,
    @Body() body: UpdatePhysicalRightConfigRequestDto,
  ) {
    return this.licensingConfigsService.updatePhysicalRightConfig(configId, body)
  }

  @Patch(':configId/status')
  @ApiOkResponse({ type: AdminPhysicalRightConfigResponseDto })
  async updateStatus(
    @Param('configId', ParseUUIDPipe) configId: string,
    @Body() body: UpdateConfigStatusRequestDto,
  ) {
    return this.licensingConfigsService.updatePhysicalRightConfigStatus(configId, body)
  }

  @Delete(':configId')
  async delete(@Param('configId', ParseUUIDPipe) configId: string) {
    return this.licensingConfigsService.deletePhysicalRightConfig(configId)
  }
}
