import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

export const SEPAY_PAYMENT_METHOD_OPTIONS = [
  'BANK_TRANSFER',
  'CARD',
  'NAPAS_BANK_TRANSFER',
] as const;

export type SepayPaymentMethod = (typeof SEPAY_PAYMENT_METHOD_OPTIONS)[number];

export class SepayCheckoutRequestDto {
  @ApiProperty()
  @IsUUID('4')
  orderId: string;

  @ApiPropertyOptional({ enum: SEPAY_PAYMENT_METHOD_OPTIONS })
  @IsOptional()
  @IsIn(SEPAY_PAYMENT_METHOD_OPTIONS)
  paymentMethod?: SepayPaymentMethod;
}

export class SepayCheckoutRedirectQueryDto extends SepayCheckoutRequestDto {}

export class SepayCheckoutFieldsDto {
  @ApiProperty()
  order_amount: string;

  @ApiProperty()
  merchant: string;

  @ApiProperty()
  currency: string;

  @ApiProperty()
  operation: string;

  @ApiProperty()
  order_description: string;

  @ApiProperty()
  order_invoice_number: string;

  @ApiPropertyOptional()
  payment_method?: string;

  @ApiProperty()
  success_url: string;

  @ApiProperty()
  error_url: string;

  @ApiProperty()
  cancel_url: string;

  @ApiProperty()
  signature: string;
}

export class SepayCheckoutResponseDto {
  @ApiProperty()
  actionUrl: string;

  @ApiProperty({ example: 'POST' })
  method: 'POST';

  @ApiProperty({ type: SepayCheckoutFieldsDto })
  @ValidateNested()
  @Type(() => SepayCheckoutFieldsDto)
  fields: SepayCheckoutFieldsDto;
}

export class SepayCallbackLandingDto {
  @ApiProperty()
  status: 'success' | 'error' | 'cancel';

  @ApiProperty()
  message: string;
}

export class SepayIpnOrderDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  order_id: string;

  @ApiProperty()
  order_status: string;

  @ApiProperty()
  order_currency: string;

  @ApiProperty()
  order_amount: string;

  @ApiProperty()
  order_invoice_number: string;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  custom_data?: unknown[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  user_agent?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ip_address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  order_description?: string;
}

export class SepayIpnTransactionDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  payment_method: string;

  @ApiProperty()
  transaction_id: string;

  @ApiProperty()
  transaction_type: string;

  @ApiProperty()
  transaction_date: string;

  @ApiProperty()
  transaction_status: string;

  @ApiProperty()
  transaction_amount: string;

  @ApiProperty()
  transaction_currency: string;
}

export class SepayIpnRequestDto {
  @ApiProperty()
  @IsNumber()
  timestamp: number;

  @ApiProperty({ example: 'ORDER_PAID' })
  @IsString()
  notification_type: string;

  @ApiProperty({ type: SepayIpnOrderDto })
  @ValidateNested()
  @Type(() => SepayIpnOrderDto)
  order: SepayIpnOrderDto;

  @ApiProperty({ type: SepayIpnTransactionDto })
  @ValidateNested()
  @Type(() => SepayIpnTransactionDto)
  transaction: SepayIpnTransactionDto;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  customer?: Record<string, unknown> | null;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  agreement?: Record<string, unknown> | null;
}

export class SepayIpnAcknowledgementDto {
  @ApiProperty()
  acknowledged: boolean;
}
