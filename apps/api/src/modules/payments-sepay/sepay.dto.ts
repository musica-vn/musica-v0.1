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
  ValidateIf,
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
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  order_id: string;

  @ApiProperty()
  @IsString()
  order_status: string;

  @ApiProperty()
  @IsString()
  order_currency: string;

  @ApiProperty()
  @IsString()
  order_amount: string;

  @ApiProperty()
  @IsString()
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
  @IsString()
  id: string;

  @ApiProperty()
  @IsString()
  payment_method: string;

  @ApiProperty()
  @IsString()
  transaction_id: string;

  @ApiProperty()
  @IsString()
  transaction_type: string;

  @ApiProperty()
  @IsString()
  transaction_date: string;

  @ApiProperty()
  @IsString()
  transaction_status: string;

  @ApiProperty()
  @IsString()
  transaction_amount: string;

  @ApiProperty()
  @IsString()
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

export class SepayBankhubWebhookRequestDto {
  @ApiProperty()
  @IsString()
  gateway: string;

  @ApiProperty()
  @IsString()
  transactionDate: string;

  @ApiProperty()
  @IsString()
  accountNumber: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  subAccount?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  code?: string | null;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ enum: ['in', 'out'] })
  @IsIn(['in', 'out'])
  transferType: 'in' | 'out';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsNumber()
  transferAmount: number;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  referenceCode?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  accumulated?: number;

  @ApiProperty()
  @IsNumber()
  id: number;
}

export class SepayWebhookAcknowledgementDto {
  @ApiProperty()
  acknowledged: boolean;

  @ApiProperty()
  matched: boolean;
}
