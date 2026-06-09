import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../database/supabase.module';
import { AdminProductsController } from './admin-products.controller';
import { PublicProductsController } from './public-products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [SupabaseModule],
  controllers: [AdminProductsController, PublicProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
