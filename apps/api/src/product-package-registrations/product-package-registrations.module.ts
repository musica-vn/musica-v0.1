import { Module } from '@nestjs/common';
import { ProductsModule } from '../products/products.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AdminProductPackageRegistrationsController } from './admin-product-package-registrations.controller';
import { CreatorProductPackageRegistrationsController } from './creator-product-package-registrations.controller';
import { ProductPackageRegistrationsService } from './product-package-registrations.service';

@Module({
  imports: [SupabaseModule, ProductsModule],
  controllers: [
    AdminProductPackageRegistrationsController,
    CreatorProductPackageRegistrationsController,
  ],
  providers: [ProductPackageRegistrationsService],
  exports: [ProductPackageRegistrationsService],
})
export class ProductPackageRegistrationsModule {}
