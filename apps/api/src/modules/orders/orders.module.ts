import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../database/supabase.module';
import { VariantPricingModule } from '../pricing/variant-pricing.module';
import { ProductsModule } from '../products/products.module';
import { CheckoutOrdersController } from './checkout-orders.controller';
import { OrdersController } from './orders.controller';
import { OrdersEventsListener } from './orders.listeners';
import { OrdersService } from './orders.service';

@Module({
  imports: [SupabaseModule, ProductsModule, VariantPricingModule],
  controllers: [OrdersController, CheckoutOrdersController],
  providers: [OrdersService, OrdersEventsListener],
  exports: [OrdersService],
})
export class OrdersModule {}
