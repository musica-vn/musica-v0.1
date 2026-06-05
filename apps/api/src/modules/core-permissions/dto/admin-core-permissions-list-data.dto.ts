import { ApiProperty } from '@nestjs/swagger'
import { CorePermissionDto } from './core-permission.dto'

export class AdminCorePermissionsListDataDto {
  @ApiProperty({ type: [CorePermissionDto] })
  items: CorePermissionDto[]
}

