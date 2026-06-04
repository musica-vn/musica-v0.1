import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
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
  AdminCreateProductRequestDto,
  AdminConfirmProductAudioUploadRequestDto,
  AdminConfirmProductThumbnailUploadRequestDto,
  AdminConfirmProductSheetMusicUploadRequestDto,
  AdminCreateProductThumbnailUploadUrlRequestDto,
  AdminReplaceProductAllowedPermissionsRequestDto,
  AdminProductsListQueryDto,
  AdminProductsSummaryQueryDto,
  AdminUpdateProductRequestDto,
} from './admin-products.dto';
import { ProductsService } from './products.service';
import {
  AdminProductResponseDto,
  AdminProductPlaybackUrlResponseDto,
  AdminProductSheetMusicUrlResponseDto,
  AdminProductThumbnailUrlResponseDto,
  AdminProductsListResponseDto,
  AdminProductsSummaryResponseDto,
  AdminProductUploadUrlResponseDto,
} from './products.swagger';

@ApiTags('Admin - Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('ADMIN', 'SUPER_ADMIN')
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List products (admin)' })
  @ApiOkResponse({ type: AdminProductsListResponseDto })
  async list(@Query() query: AdminProductsListQueryDto) {
    return this.productsService.listAdminProducts(query);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get product summary counts (admin)' })
  @ApiOkResponse({ type: AdminProductsSummaryResponseDto })
  async summary(@Query() query: AdminProductsSummaryQueryDto) {
    return this.productsService.getAdminProductsSummary(query);
  }

  @Post()
  @ApiOperation({ summary: 'Create product metadata (admin)' })
  @ApiCreatedResponse({ type: AdminProductResponseDto })
  async create(
    @Body() body: AdminCreateProductRequestDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const createdBy = req.user?.userId ?? '';
    return this.productsService.createProduct(body, createdBy);
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get product detail (admin)' })
  @ApiOkResponse({ type: AdminProductResponseDto })
  async detail(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.productsService.getProductById(productId);
  }

  @Patch(':productId')
  @ApiOperation({ summary: 'Update product metadata (admin)' })
  @ApiOkResponse({ type: AdminProductResponseDto })
  async update(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: AdminUpdateProductRequestDto,
  ) {
    return this.productsService.updateProduct(productId, body);
  }

  @Put(':productId/allowed-permissions')
  @ApiOperation({ summary: 'Replace allowed permissions for product (admin)' })
  @ApiOkResponse({ type: AdminProductResponseDto })
  async replaceAllowedPermissions(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: AdminReplaceProductAllowedPermissionsRequestDto,
  ) {
    return this.productsService.replaceAllowedPermissions(
      productId,
      body.permissionIds,
    );
  }

  @Post(':productId/original-upload-url')
  @ApiOperation({ summary: 'Get signed upload URL for original audio (admin)' })
  @ApiOkResponse({ type: AdminProductUploadUrlResponseDto })
  async originalUploadUrl(
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.productsService.createOriginalUploadUrl(productId);
  }

  @Post(':productId/thumbnail-upload-url')
  @ApiOperation({
    summary: 'Get signed upload URL for product thumbnail (admin)',
  })
  @ApiOkResponse({ type: AdminProductUploadUrlResponseDto })
  async thumbnailUploadUrl(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: AdminCreateProductThumbnailUploadUrlRequestDto,
  ) {
    return this.productsService.createThumbnailUploadUrl(
      productId,
      body.extension,
    );
  }

  @Post(':productId/sheet-music-upload-url')
  @ApiOperation({
    summary: 'Get signed upload URL for sheet music PDF (admin)',
  })
  @ApiOkResponse({ type: AdminProductUploadUrlResponseDto })
  async sheetMusicUploadUrl(
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.productsService.createSheetMusicUploadUrl(productId);
  }

  @Post(':productId/confirm-audio-upload')
  @ApiOperation({ summary: 'Confirm uploaded audio key (admin)' })
  @ApiOkResponse({ type: AdminProductResponseDto })
  async confirmAudioUpload(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: AdminConfirmProductAudioUploadRequestDto,
  ) {
    return this.productsService.confirmProductAudioUpload(productId, body);
  }

  @Post(':productId/confirm-thumbnail-upload')
  @ApiOperation({ summary: 'Confirm uploaded thumbnail key (admin)' })
  @ApiOkResponse({ type: AdminProductResponseDto })
  async confirmThumbnailUpload(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: AdminConfirmProductThumbnailUploadRequestDto,
  ) {
    return this.productsService.confirmProductThumbnailUpload(productId, body);
  }

  @Post(':productId/confirm-sheet-music-upload')
  @ApiOperation({ summary: 'Confirm uploaded sheet music key (admin)' })
  @ApiOkResponse({ type: AdminProductResponseDto })
  async confirmSheetMusicUpload(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() body: AdminConfirmProductSheetMusicUploadRequestDto,
  ) {
    return this.productsService.confirmProductSheetMusicUpload(productId, body);
  }

  @Get(':productId/thumbnail-url')
  @ApiOperation({ summary: 'Get signed URL for product thumbnail (admin)' })
  @ApiOkResponse({ type: AdminProductThumbnailUrlResponseDto })
  async thumbnailUrl(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.productsService.createThumbnailUrl(productId);
  }

  @Get(':productId/original-playback-url')
  @ApiOperation({
    summary: 'Get signed playback URL for original audio (admin)',
  })
  @ApiOkResponse({ type: AdminProductPlaybackUrlResponseDto })
  async originalPlaybackUrl(
    @Param('productId', ParseUUIDPipe) productId: string,
  ) {
    return this.productsService.createOriginalPlaybackUrl(productId);
  }

  @Get(':productId/sheet-music-url')
  @ApiOperation({ summary: 'Get signed URL for sheet music PDF (admin)' })
  @ApiOkResponse({ type: AdminProductSheetMusicUrlResponseDto })
  async sheetMusicUrl(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.productsService.createSheetMusicUrl(productId);
  }

  @Patch(':productId/publish')
  @ApiOperation({ summary: 'Publish product (admin)' })
  @ApiOkResponse({ type: AdminProductResponseDto })
  async publish(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.productsService.publishProduct(productId);
  }

  @Patch(':productId/hide')
  @ApiOperation({ summary: 'Hide product (admin)' })
  @ApiOkResponse({ type: AdminProductResponseDto })
  async hide(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.productsService.hideProduct(productId);
  }
}
