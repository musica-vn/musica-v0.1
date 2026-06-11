import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/base/pagination.swagger';
import { OrderDetailDto, OrderListDataDto } from './orders.dto';

export class OrdersListResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: OrderListDataDto })
  data: OrderListDataDto;

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}

export class OrderDetailResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: OrderDetailDto })
  data: OrderDetailDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}

export class MarkOrderPaidResponseDto extends OrderDetailResponseDto {}
