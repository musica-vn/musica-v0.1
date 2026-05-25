import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminCertificatesController } from './admin-certificates.controller';
import { CertificatesService } from './certificates.service';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [AdminCertificatesController],
  providers: [CertificatesService],
})
export class CertificatesModule {}
