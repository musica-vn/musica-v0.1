import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../common/base/pagination.swagger';
import {
  ProductPackageRegistrationItemDto,
  ProductPackageRegistrationListDataDto,
} from './product-package-registrations.dto';

export class ProductPackageRegistrationResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: ProductPackageRegistrationItemDto })
  data: ProductPackageRegistrationItemDto;

  @ApiProperty()
  requestId: string;

  @ApiProperty()
  timestamp: string;
}

export class ProductPackageRegistrationListResponseDto {
  @ApiProperty({ example: true })
  success: true;

  @ApiProperty({ example: 200 })
  statusCode: number;

  @ApiProperty({ type: ProductPackageRegistrationListDataDto })
  data: ProductPackageRegistrationListDataDto;

  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  @ApiProperty()
  requestId: string;

  @ApiProperty()
  timestamp: string;
}
