import { Module } from '@nestjs/common'
import { SupabaseModule } from '../../database/supabase.module'
import { AdminComplianceController } from './admin-compliance.controller'
import { ComplianceService } from './compliance.service'

@Module({
  imports: [SupabaseModule],
  controllers: [AdminComplianceController],
  providers: [ComplianceService],
})
export class ComplianceModule {}
