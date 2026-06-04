import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard'
import { RequireRoles } from '../../common/auth/require-roles.decorator'
import { RolesGuard } from '../../common/auth/roles.guard'
import {
  AdminCorePermissionsListQueryDto,
  AdminCreateCorePermissionRequestDto,
  AdminUpdateCorePermissionRequestDto,
  AdminUpdateCorePermissionStatusRequestDto,
} from './core-permissions.dto'
import { CorePermissionsService } from './core-permissions.service'
import { AdminCorePermissionResponseDto, AdminCorePermissionsListResponseDto } from './core-permissions.swagger'

@ApiTags('Admin - Core Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/core-permissions')
export class AdminCorePermissionsController {
  constructor(private readonly corePermissionsService: CorePermissionsService) {}

  @Get()
  @ApiOkResponse({ type: AdminCorePermissionsListResponseDto })
  async list(@Query() query: AdminCorePermissionsListQueryDto) {
    return this.corePermissionsService.listAdminCorePermissions(query)
  }

  @Post()
  @ApiCreatedResponse({ type: AdminCorePermissionResponseDto })
  async create(@Body() body: AdminCreateCorePermissionRequestDto) {
    return this.corePermissionsService.createAdminCorePermission(body)
  }

  @Patch(':permissionId')
  @ApiOkResponse({ type: AdminCorePermissionResponseDto })
  async update(
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
    @Body() body: AdminUpdateCorePermissionRequestDto,
  ) {
    return this.corePermissionsService.updateAdminCorePermission(permissionId, body)
  }

  @Patch(':permissionId/status')
  @ApiOkResponse({ type: AdminCorePermissionResponseDto })
  async updateStatus(
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
    @Body() body: AdminUpdateCorePermissionStatusRequestDto,
  ) {
    return this.corePermissionsService.updateAdminCorePermissionStatus(permissionId, body)
  }

  @Delete(':permissionId')
  async delete(@Param('permissionId', ParseUUIDPipe) permissionId: string) {
    return this.corePermissionsService.deleteAdminCorePermission(permissionId)
  }
}
