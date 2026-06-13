import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { PaginationMeta } from '@musica/contracts';
import type { ApiEnvelopePayload } from '../../common/interceptors/api-response.interceptor';
import { JwtAuthGuard } from '../../common/auth/jwt-auth.guard';
import { RequireRoles } from '../../common/auth/require-roles.decorator';
import { RolesGuard } from '../../common/auth/roles.guard';
import {
  MarkOrderPaidRequestDto,
  OrderDetailDto,
  OrderListItemDto,
  OrdersListQueryDto,
} from './orders.dto';
import {
  OrderDetailResponseDto,
  OrdersListResponseDto,
  MarkOrderPaidResponseDto,
} from './orders.swagger';
import { OrdersService } from './orders.service';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('ADMIN', 'SUPER_ADMIN')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOkResponse({ type: OrdersListResponseDto })
  async list(
    @Query() query: OrdersListQueryDto,
  ): Promise<
    ApiEnvelopePayload<{ items: OrderListItemDto[] }, PaginationMeta>
  > {
    return this.ordersService.listOrders(query);
  }

  @Get(':orderId')
  @ApiOkResponse({ type: OrderDetailResponseDto })
  async detail(
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ): Promise<OrderDetailDto> {
    return this.ordersService.getOrderById(orderId);
  }

  @Post(':orderId/mark-paid')
  @ApiOkResponse({ type: MarkOrderPaidResponseDto })
  async markPaid(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Body() body: MarkOrderPaidRequestDto,
  ): Promise<OrderDetailDto> {
    return this.ordersService.markOrderPaid(orderId, body);
  }
}
