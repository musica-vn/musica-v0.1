import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiExceptionFilter } from './common/filters/api-exception.filter';
import { ApiResponseInterceptor } from './common/interceptors/api-response.interceptor';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { AdminUsersModule } from './modules/admin-users/admin-users.module';
import { ManagedUsersModule } from './modules/managed-users/managed-users.module';
import { CorePermissionsModule } from './modules/core-permissions/core-permissions.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { LicensingConfigsModule } from './modules/licensing-configs/licensing-configs.module';
import { OrdersModule } from './modules/orders/orders.module';
import { ProductPackageRegistrationsModule } from './modules/product-package-registrations/product-package-registrations.module';
import { VariantPricingModule } from './modules/pricing/variant-pricing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
    }),
    EventEmitterModule.forRoot(),
    HealthModule,
    AuthModule,
    ProductsModule,
    CertificatesModule,
    AdminUsersModule,
    ManagedUsersModule,
    CorePermissionsModule,
    ComplianceModule,
    LicensingConfigsModule,
    OrdersModule,
    ProductPackageRegistrationsModule,
    VariantPricingModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
