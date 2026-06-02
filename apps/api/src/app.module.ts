import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ApiExceptionFilter } from './common/api-exception.filter';
import { ApiResponseInterceptor } from './common/api-response.interceptor';
import { ExamplesModule } from './examples/examples.module';
import { HealthModule } from './health/health.module';
import { RequestIdMiddleware } from './common/request-id.middleware';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { CertificatesModule } from './certificates/certificates.module';
import { AdminUsersModule } from './admin-users/admin-users.module';
import { ManagedUsersModule } from './managed-users/managed-users.module';
import { CorePermissionsModule } from './core-permissions/core-permissions.module';
import { ComplianceModule } from './compliance/compliance.module';
import { LicensingConfigsModule } from './licensing-configs/licensing-configs.module';
import { ProductPackageRegistrationsModule } from './product-package-registrations/product-package-registrations.module';
import { VariantPricingModule } from './pricing/variant-pricing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV ?? 'development'}`, '.env'],
    }),
    HealthModule,
    ExamplesModule,
    AuthModule,
    ProductsModule,
    CertificatesModule,
    AdminUsersModule,
    ManagedUsersModule,
    CorePermissionsModule,
    ComplianceModule,
    LicensingConfigsModule,
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
