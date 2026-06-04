import { Body, Controller, Post } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { PublicVariantPricingCalculateRequestDto } from './variant-pricing.dto';
import { PublicVariantPricingCalculateResponseDto } from './variant-pricing.swagger';
import { VariantPricingService } from './variant-pricing.service';

@ApiTags('Public - Variant Pricing')
@Controller('public/variant-pricing')
export class PublicVariantPricingController {
  constructor(private readonly variantPricingService: VariantPricingService) {}

  @Post('calculate')
  @ApiOkResponse({ type: PublicVariantPricingCalculateResponseDto })
  async calculate(@Body() body: PublicVariantPricingCalculateRequestDto) {
    return this.variantPricingService.calculate(body);
  }
}

