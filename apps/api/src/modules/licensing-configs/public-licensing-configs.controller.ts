import { Controller, Get, Query } from '@nestjs/common'
import { ApiOkResponse, ApiTags } from '@nestjs/swagger'
import { GenericConfigsListQueryDto } from './licensing-configs.dto'
import {
  AdminExpressionConfigsListResponseDto,
  AdminModificationConfigsListResponseDto,
} from './licensing-configs.swagger'
import { LicensingConfigsService } from './licensing-configs.service'

@ApiTags('Public - Licensing Configs')
@Controller('public/configs')
export class PublicLicensingConfigsController {
  constructor(private readonly licensingConfigsService: LicensingConfigsService) {}

  @Get('expressions')
  @ApiOkResponse({ type: AdminExpressionConfigsListResponseDto })
  async listExpressions(@Query() query: GenericConfigsListQueryDto) {
    return this.licensingConfigsService.listExpressionConfigs(query)
  }

  @Get('modifications')
  @ApiOkResponse({ type: AdminModificationConfigsListResponseDto })
  async listModifications(@Query() query: GenericConfigsListQueryDto) {
    return this.licensingConfigsService.listModificationConfigs(query)
  }
}
