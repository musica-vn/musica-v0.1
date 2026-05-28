import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../common/auth/jwt-auth.guard'
import { RequireRoles } from '../common/auth/require-roles.decorator'
import { RolesGuard } from '../common/auth/roles.guard'
import {
  CreateExpressionConfigRequestDto,
  GenericConfigsListQueryDto,
  UpdateConfigStatusRequestDto,
  UpdateExpressionConfigRequestDto,
} from './licensing-configs.dto'
import {
  AdminExpressionConfigResponseDto,
  AdminExpressionConfigsListResponseDto,
} from './licensing-configs.swagger'
import { LicensingConfigsService } from './licensing-configs.service'

@ApiTags('Admin - Expression Configs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/expression-configs')
export class AdminExpressionConfigsController {
  constructor(private readonly licensingConfigsService: LicensingConfigsService) {}

  @Get()
  @ApiOkResponse({ type: AdminExpressionConfigsListResponseDto })
  async list(@Query() query: GenericConfigsListQueryDto) {
    return this.licensingConfigsService.listExpressionConfigs(query)
  }

  @Get(':configId')
  @ApiOkResponse({ type: AdminExpressionConfigResponseDto })
  async getDetail(@Param('configId', ParseUUIDPipe) configId: string) {
    return this.licensingConfigsService.getExpressionConfig(configId)
  }

  @Post()
  @ApiCreatedResponse({ type: AdminExpressionConfigResponseDto })
  async create(@Body() body: CreateExpressionConfigRequestDto) {
    return this.licensingConfigsService.createExpressionConfig(body)
  }

  @Patch(':configId')
  @ApiOkResponse({ type: AdminExpressionConfigResponseDto })
  async update(
    @Param('configId', ParseUUIDPipe) configId: string,
    @Body() body: UpdateExpressionConfigRequestDto,
  ) {
    return this.licensingConfigsService.updateExpressionConfig(configId, body)
  }

  @Patch(':configId/status')
  @ApiOkResponse({ type: AdminExpressionConfigResponseDto })
  async updateStatus(
    @Param('configId', ParseUUIDPipe) configId: string,
    @Body() body: UpdateConfigStatusRequestDto,
  ) {
    return this.licensingConfigsService.updateExpressionConfigStatus(configId, body)
  }

  @Delete(':configId')
  async delete(@Param('configId', ParseUUIDPipe) configId: string) {
    return this.licensingConfigsService.deleteExpressionConfig(configId)
  }
}
