import { Module } from '@nestjs/common';
import { SupabaseModule } from '../supabase/supabase.module';
import { PublicVariantPricingController } from './public-variant-pricing.controller';
import { VariantPricingService } from './variant-pricing.service';

@Module({
  imports: [SupabaseModule],
  controllers: [PublicVariantPricingController],
  providers: [VariantPricingService],
})
export class VariantPricingModule {}

