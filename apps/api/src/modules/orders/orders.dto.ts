import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { PaginationQueryDto } from '../../common/base/pagination.dto';

export const ORDER_STATUS_OPTIONS = [
  'PENDING_PAYMENT',
  'PAID',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUS_OPTIONS)[number];

export const ORDER_PAYMENT_STATUS_OPTIONS = ['SUCCEEDED', 'FAILED'] as const;
export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUS_OPTIONS)[number];

export class OrdersListQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID('4')
  buyerId?: string;

  @ApiPropertyOptional({ enum: ORDER_STATUS_OPTIONS })
  @IsOptional()
  @IsIn(ORDER_STATUS_OPTIONS)
  status?: OrderStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class OrderBuyerDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  fullName: string;
}

export class OrderAmountsDto {
  @ApiProperty()
  subtotalAmount: number;

  @ApiProperty()
  discountAmount: number;

  @ApiProperty()
  taxAmount: number;

  @ApiProperty()
  totalAmount: number;
}

export class OrderItemDto {
  @ApiProperty()
  productId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  unitPrice: number;

  @ApiProperty()
  quantity: number;

  @ApiProperty()
  lineTotalAmount: number;
}

export class OrderPaymentDto {
  @ApiProperty()
  provider: string;

  @ApiProperty({ nullable: true })
  transactionId: string | null;

  @ApiProperty({ enum: ORDER_PAYMENT_STATUS_OPTIONS })
  status: OrderPaymentStatus;

  @ApiProperty()
  amount: number;

  @ApiProperty({ nullable: true })
  paidAt: string | null;
}

export class OrderListItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty({ enum: ORDER_STATUS_OPTIONS })
  status: OrderStatus;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  totalAmount: number;

  @ApiProperty({ nullable: true })
  paidAt: string | null;

  @ApiProperty()
  createdAt: string;

  @ApiProperty({ type: OrderBuyerDto })
  @ValidateNested()
  @Type(() => OrderBuyerDto)
  buyer: OrderBuyerDto;
}

export class OrderListDataDto {
  @ApiProperty({ type: [OrderListItemDto] })
  @ValidateNested({ each: true })
  @Type(() => OrderListItemDto)
  items: OrderListItemDto[];
}

export class OrderDetailDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty({ enum: ORDER_STATUS_OPTIONS })
  status: OrderStatus;

  @ApiProperty()
  currency: string;

  @ApiProperty({ type: OrderAmountsDto })
  @ValidateNested()
  @Type(() => OrderAmountsDto)
  amounts: OrderAmountsDto;

  @ApiProperty({ type: OrderBuyerDto })
  @ValidateNested()
  @Type(() => OrderBuyerDto)
  buyer: OrderBuyerDto;

  @ApiProperty({ type: [OrderItemDto] })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ type: OrderPaymentDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderPaymentDto)
  payment: OrderPaymentDto | null;

  @ApiProperty({ nullable: true })
  paidAt: string | null;

  @ApiProperty()
  createdAt: string;
}

export class MarkOrderPaidRequestDto {
  @ApiProperty({ example: 'MANUAL' })
  @IsString()
  provider: string;

  @ApiPropertyOptional({ example: 'TXN-001' })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({ example: '2026-06-11T10:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  rawPayload?: Record<string, unknown>;
}

export class OrderEventPayloadOrderDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  orderNumber: string;

  @ApiProperty({ enum: ORDER_STATUS_OPTIONS })
  status: OrderStatus;

  @ApiProperty()
  currency: string;

  @ApiProperty({ type: OrderAmountsDto })
  @ValidateNested()
  @Type(() => OrderAmountsDto)
  amounts: OrderAmountsDto;

  @ApiProperty({ nullable: true })
  paidAt: string | null;

  @ApiProperty()
  createdAt: string;
}

export class OrderPaidSuccessEventDto {
  @ApiProperty({ example: 'order.paid.success' })
  eventName: 'order.paid.success';

  @ApiProperty({ example: 1 })
  eventVersion: 1;

  @ApiProperty()
  occurredAt: string;

  @ApiProperty({ type: OrderEventPayloadOrderDto })
  @ValidateNested()
  @Type(() => OrderEventPayloadOrderDto)
  order: OrderEventPayloadOrderDto;

  @ApiProperty({ type: OrderBuyerDto })
  @ValidateNested()
  @Type(() => OrderBuyerDto)
  buyer: OrderBuyerDto;

  @ApiProperty({ type: [OrderItemDto] })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty({ type: OrderPaymentDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderPaymentDto)
  payment: OrderPaymentDto | null;
}
