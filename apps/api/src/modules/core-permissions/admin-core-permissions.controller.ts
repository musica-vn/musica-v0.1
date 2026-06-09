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
} from './dto'
import { CorePermissionsService } from './core-permissions.service'
import { AdminCorePermissionResponseDto, AdminCorePermissionsListResponseDto } from './core-permissions.swagger'

@ApiTags('Admin - Core Permissions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/core-permissions')
export class AdminCorePermissionsController {
  constructor(private readonly corePermissionsService: CorePermissionsService) {}

  /**
   * List core permissions (admin).
   */
  @Get()
  @ApiOkResponse({ type: AdminCorePermissionsListResponseDto })
  async list(@Query() query: AdminCorePermissionsListQueryDto) {
    return this.corePermissionsService.listAdminCorePermissions(query)
  }

  /**
   * Create a new core permission (admin).
   */
  @Post()
  @ApiCreatedResponse({ type: AdminCorePermissionResponseDto })
  async create(@Body() body: AdminCreateCorePermissionRequestDto) {
    return this.corePermissionsService.createAdminCorePermission(body)
  }

  /**
   * Update core permission fields (admin).
   */
  @Patch(':permissionId')
  @ApiOkResponse({ type: AdminCorePermissionResponseDto })
  async update(
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
    @Body() body: AdminUpdateCorePermissionRequestDto,
  ) {
    return this.corePermissionsService.updateAdminCorePermission(permissionId, body)
  }

  /**
   * Update core permission status (admin).
   */
  @Patch(':permissionId/status')
  @ApiOkResponse({ type: AdminCorePermissionResponseDto })
  async updateStatus(
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
    @Body() body: AdminUpdateCorePermissionStatusRequestDto,
  ) {
    return this.corePermissionsService.updateAdminCorePermissionStatus(permissionId, body)
  }

  /**
   * Delete core permission (admin).
   */
  @Delete(':permissionId')
  async delete(@Param('permissionId', ParseUUIDPipe) permissionId: string) {
    return this.corePermissionsService.deleteAdminCorePermission(permissionId)
  }
}
