import { Controller, Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { PaginationMeta } from '@musica/contracts';
import { PaginationQueryDto } from '../common/pagination.dto';
import type { ApiEnvelopePayload } from '../common/api-response.interceptor';
import { ExampleListResponseDto } from './examples.swagger';

type ExampleItem = {
  id: string;
  name: string;
};

const buildPaginationMeta = (
  page: number,
  pageSize: number,
  totalItems: number,
): PaginationMeta => {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  return {
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
};

@ApiTags('examples')
@Controller('examples')
export class ExamplesController {
  @Get()
  @ApiOkResponse({ type: ExampleListResponseDto })
  listExamples(
    @Query() query: PaginationQueryDto,
  ): ApiEnvelopePayload<{ items: ExampleItem[] }, PaginationMeta> {
    const items: ExampleItem[] = Array.from({ length: 128 }).map((_, index) => ({
      id: String(index + 1),
      name: `Example ${index + 1}`,
    }));

    const start = (query.page - 1) * query.pageSize;
    const end = start + query.pageSize;
    const pagedItems = items.slice(start, end);

    return {
      data: { items: pagedItems },
      meta: buildPaginationMeta(query.page, query.pageSize, items.length),
    };
  }
}
