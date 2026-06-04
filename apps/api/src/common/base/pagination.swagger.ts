import { ApiProperty } from '@nestjs/swagger';

export class PaginationInfoDto {
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

export class PaginationMetaDto {
  @ApiProperty({ type: PaginationInfoDto })
  pagination: PaginationInfoDto;
}
