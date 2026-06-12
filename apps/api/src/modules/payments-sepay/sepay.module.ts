import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../database/supabase.module';
import { OrdersModule } from '../orders/orders.module';
import { SepayController } from './sepay.controller';
import { SepayService } from './sepay.service';

@Module({
  imports: [SupabaseModule, OrdersModule],
  controllers: [SepayController],
  providers: [SepayService],
})
export class SepayModule {}
