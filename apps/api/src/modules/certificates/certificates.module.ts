import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../database/supabase.module';
import { AdminCertificatesController } from './admin-certificates.controller';
import { CertificatesService } from './certificates.service';

@Module({
  imports: [SupabaseModule],
  controllers: [AdminCertificatesController],
  providers: [CertificatesService],
})
export class CertificatesModule {}
