import type { PaginationMeta } from '@musica/contracts';

export const buildPaginationMeta = (
  page: number,
  pageSize: number,
  totalItems: number,
): PaginationMeta => {
  const totalPages = pageSize > 0 ? Math.ceil(totalItems / pageSize) : 0;

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
