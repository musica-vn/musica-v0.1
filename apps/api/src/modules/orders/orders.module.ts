import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../database/supabase.module';
import { OrdersController } from './orders.controller';
import { OrdersEventsListener } from './orders.listeners';
import { OrdersService } from './orders.service';

@Module({
  imports: [SupabaseModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersEventsListener],
})
export class OrdersModule {}
