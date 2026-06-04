import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { AdminCorePermissionsController } from './admin-core-permissions.controller'
import { CorePermissionsService } from './core-permissions.service'

@Module({
  imports: [SupabaseModule],
  controllers: [AdminCorePermissionsController],
  providers: [CorePermissionsService],
  exports: [CorePermissionsService],
})
export class CorePermissionsModule {}
