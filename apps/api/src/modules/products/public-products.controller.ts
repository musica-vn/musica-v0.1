import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PublicProductsListQueryDto } from './public-products.dto';
import { ProductsService } from './products.service';
import { PublicProductsListResponseDto } from './products.swagger';

@ApiTags('Public - Products')
@Controller('products')
export class PublicProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'List published products for marketplace' })
  @ApiOkResponse({ type: PublicProductsListResponseDto })
  async list(@Query() query: PublicProductsListQueryDto) {
    return this.productsService.listPublicProducts(query);
  }
}
