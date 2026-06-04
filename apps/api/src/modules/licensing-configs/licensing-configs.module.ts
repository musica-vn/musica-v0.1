import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { AdminDigitalRightConfigsController } from './admin-digital-right-configs.controller'
import { AdminExpressionConfigsController } from './admin-expression-configs.controller'
import { AdminModificationConfigsController } from './admin-modification-configs.controller'
import { AdminPhysicalRightConfigsController } from './admin-physical-right-configs.controller'
import { LicensingConfigsService } from './licensing-configs.service'

@Module({
  imports: [SupabaseModule],
  controllers: [
    AdminDigitalRightConfigsController,
    AdminPhysicalRightConfigsController,
    AdminExpressionConfigsController,
    AdminModificationConfigsController,
  ],
  providers: [LicensingConfigsService],
  exports: [LicensingConfigsService],
})
export class LicensingConfigsModule {}
