import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../database/supabase.module';
import { AdminProductsController } from './admin-products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [SupabaseModule],
  controllers: [AdminProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
