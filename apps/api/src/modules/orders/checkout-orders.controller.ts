import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import type { ApiEnvelopePayload } from '../../common/interceptors/api-response.interceptor';
import {
  CreateCheckoutOrderRequestDto,
  CreateCheckoutOrderResponseDto,
} from './orders.dto';
import { CreateCheckoutOrderEnvelopeDto } from './orders.swagger';
import { OrdersService } from './orders.service';

@ApiTags('Checkout Orders')
@Controller('checkout/orders')
export class CheckoutOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({ type: CreateCheckoutOrderEnvelopeDto })
  async create(
    @Body() body: CreateCheckoutOrderRequestDto,
  ): Promise<ApiEnvelopePayload<CreateCheckoutOrderResponseDto>> {
    return {
      data: await this.ordersService.createCheckoutOrder(body),
    };
  }
}
