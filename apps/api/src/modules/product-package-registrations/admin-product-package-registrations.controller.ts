import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedRequest } from '../../common/auth/auth.types';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RequireRoles } from '../../common/auth/require-roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import {
  CreateProductPackageRegistrationRequestDto,
  ProductPackageRegistrationListQueryDto,
} from './product-package-registrations.dto';
import {
  ProductPackageRegistrationListResponseDto,
  ProductPackageRegistrationResponseDto,
} from './product-package-registrations.swagger';
import { ProductPackageRegistrationsService } from './product-package-registrations.service';

@ApiTags('Admin - Product Package Registrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('ADMIN', 'SUPER_ADMIN')
@Controller('admin')
export class AdminProductPackageRegistrationsController {
  constructor(
    private readonly productPackageRegistrationsService: ProductPackageRegistrationsService,
  ) {}

  @Post('products/:productId/digital-right-registrations')
  @ApiOperation({ summary: 'Join digital package for product (admin)' })
  @ApiCreatedResponse({ type: ProductPackageRegistrationResponseDto })
  async createDigitalRegistration(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: CreateProductPackageRegistrationRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productPackageRegistrationsService.createDigitalRegistration(
      productId,
      body.configId,
      req.user?.userId ?? '',
    );
  }

  @Delete('products/:productId/digital-right-registrations/:registrationId')
  @ApiOperation({
    summary: 'Remove digital package registration from product (admin)',
  })
  @ApiOkResponse({ type: ProductPackageRegistrationResponseDto })
  async removeDigitalRegistration(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productPackageRegistrationsService.removeDigitalRegistration(
      productId,
      registrationId,
      req.user?.userId ?? '',
    );
  }

  @Post('products/:productId/physical-right-registrations')
  @ApiOperation({ summary: 'Join physical package for product (admin)' })
  @ApiCreatedResponse({ type: ProductPackageRegistrationResponseDto })
  async createPhysicalRegistration(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: CreateProductPackageRegistrationRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productPackageRegistrationsService.createPhysicalRegistration(
      productId,
      body.configId,
      req.user?.userId ?? '',
    );
  }

  @Delete('products/:productId/physical-right-registrations/:registrationId')
  @ApiOperation({
    summary: 'Remove physical package registration from product (admin)',
  })
  @ApiOkResponse({ type: ProductPackageRegistrationResponseDto })
  async removePhysicalRegistration(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.productPackageRegistrationsService.removePhysicalRegistration(
      productId,
      registrationId,
      req.user?.userId ?? '',
    );
  }

  @Get('digital-right-configs/:configId/products')
  @ApiOperation({
    summary: 'List products registered to digital package (admin)',
  })
  @ApiOkResponse({ type: ProductPackageRegistrationListResponseDto })
  async listProductsForDigitalConfig(
    @Param('configId', ParseUUIDPipe) configId: string,
    @Query() query: ProductPackageRegistrationListQueryDto,
  ) {
    return this.productPackageRegistrationsService.listProductsForDigitalConfig(
      configId,
      query,
    );
  }

  @Get('physical-right-configs/:configId/products')
  @ApiOperation({
    summary: 'List products registered to physical package (admin)',
  })
  @ApiOkResponse({ type: ProductPackageRegistrationListResponseDto })
  async listProductsForPhysicalConfig(
    @Param('configId', ParseUUIDPipe) configId: string,
    @Query() query: ProductPackageRegistrationListQueryDto,
  ) {
    return this.productPackageRegistrationsService.listProductsForPhysicalConfig(
      configId,
      query,
    );
  }
}
