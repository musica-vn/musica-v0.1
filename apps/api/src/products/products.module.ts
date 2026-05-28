import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminProductsController } from './admin-products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [SupabaseModule, AuthModule],
  controllers: [AdminProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
