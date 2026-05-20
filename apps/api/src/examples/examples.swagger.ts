import { ApiProperty } from '@nestjs/swagger';

export class ExampleItemDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  name: string;
}

export class ExampleListDataDto {
  @ApiProperty({ type: [ExampleItemDto] })
  items: ExampleItemDto[];
}

export class PaginationDto {
  @ApiProperty()
  page: number;

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  totalItems: number;

  @ApiProperty()
  totalPages: number;

  @ApiProperty()
  hasNextPage: boolean;

  @ApiProperty()
  hasPrevPage: boolean;
}

export class ExampleListMetaDto {
  @ApiProperty({ type: PaginationDto })
  pagination: PaginationDto;
}

export class ExampleListResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: ExampleListDataDto })
  data: ExampleListDataDto;

  @ApiProperty({ type: ExampleListMetaDto })
  meta: ExampleListMetaDto;

  @ApiProperty({ example: '2fefcbd8-0a70-4c9d-8e86-e88f7b0f5c5a' })
  requestId: string;

  @ApiProperty({ example: '2026-05-20T00:00:00.000Z' })
  timestamp: string;
}
