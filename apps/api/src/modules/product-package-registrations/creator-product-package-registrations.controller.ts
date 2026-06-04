import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RequireRoles } from '../../common/auth/require-roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import type { AuthUserContext } from '../../common/auth/auth.types';
import { ProductsService } from '../products/products.service';
import {
  AdminProductResponseDto,
  AdminProductsListResponseDto,
} from '../products/products.swagger';
import {
  CreateProductPackageRegistrationRequestDto,
} from './product-package-registrations.dto';
import { ProductPackageRegistrationResponseDto } from './product-package-registrations.swagger';
import { ProductPackageRegistrationsService } from './product-package-registrations.service';

@ApiTags('Creator - Product Package Registrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('ARTIST')
@Controller('creator/products')
export class CreatorProductPackageRegistrationsController {
  constructor(
    private readonly productPackageRegistrationsService: ProductPackageRegistrationsService,
    private readonly productsService: ProductsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List creator products' })
  @ApiOkResponse({ type: AdminProductsListResponseDto })
  async listMyProducts(@CurrentUser() user: AuthUserContext | null) {
    return this.productsService.listCreatorProducts(user?.userId ?? '');
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get creator product detail' })
  @ApiOkResponse({ type: AdminProductResponseDto })
  async getMyProductDetail(
    @Param('productId', ParseUUIDPipe) productId: string,
    @CurrentUser() user: AuthUserContext | null,
  ) {
    return this.productsService.getCreatorProductById(
      productId,
      user?.userId ?? '',
    );
  }

  @Post(':productId/digital-right-registrations')
  @ApiOperation({ summary: 'Join digital package for own product (creator)' })
  @ApiCreatedResponse({ type: ProductPackageRegistrationResponseDto })
  async createDigitalRegistration(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: CreateProductPackageRegistrationRequestDto,
    @CurrentUser() user: AuthUserContext | null,
  ) {
    return this.productPackageRegistrationsService.creatorCreateDigitalRegistration(
      productId,
      body.configId,
      user?.userId ?? '',
    );
  }

  @Delete(':productId/digital-right-registrations/:registrationId')
  @ApiOperation({ summary: 'Remove digital package registration from own product (creator)' })
  @ApiOkResponse({ type: ProductPackageRegistrationResponseDto })
  async removeDigitalRegistration(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @CurrentUser() user: AuthUserContext | null,
  ) {
    return this.productPackageRegistrationsService.creatorRemoveDigitalRegistration(
      productId,
      registrationId,
      user?.userId ?? '',
    );
  }

  @Post(':productId/physical-right-registrations')
  @ApiOperation({ summary: 'Join physical package for own product (creator)' })
  @ApiCreatedResponse({ type: ProductPackageRegistrationResponseDto })
  async createPhysicalRegistration(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: CreateProductPackageRegistrationRequestDto,
    @CurrentUser() user: AuthUserContext | null,
  ) {
    return this.productPackageRegistrationsService.creatorCreatePhysicalRegistration(
      productId,
      body.configId,
      user?.userId ?? '',
    );
  }

  @Delete(':productId/physical-right-registrations/:registrationId')
  @ApiOperation({ summary: 'Remove physical package registration from own product (creator)' })
  @ApiOkResponse({ type: ProductPackageRegistrationResponseDto })
  async removePhysicalRegistration(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Param('registrationId', ParseUUIDPipe) registrationId: string,
    @CurrentUser() user: AuthUserContext | null,
  ) {
    return this.productPackageRegistrationsService.creatorRemovePhysicalRegistration(
      productId,
      registrationId,
      user?.userId ?? '',
    );
  }
}
