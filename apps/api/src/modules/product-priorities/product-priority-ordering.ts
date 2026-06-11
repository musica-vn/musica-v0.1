export const PRODUCT_PRIORITY_SELECT =
  'product_priorities(priority_score,is_trigger,effective_start,effective_end)';

export const applyProductPriorityOrdering = (requestBuilder: any) =>
  requestBuilder
    .order('is_trigger', {
      foreignTable: 'product_priorities',
      ascending: false,
      nullsFirst: false,
    })
    .order('priority_score', {
      foreignTable: 'product_priorities',
      ascending: false,
      nullsFirst: false,
    });

export interface ProductFilterSortQuery {
  keyword?: string;
  q?: string;
  genre?: string;
  artistId?: string;
  useCase?: string;
  duration?: 'lt2' | '2to4' | 'gt4';
  sort?: string;
}

export function filterAndSortProducts<
  T extends {
    id: string;
    title: string;
    artist_id?: string;
    author_name?: string | null;
    genre?: string | null;
    genres?: string[] | null;
    duration?: number | null;
    use_case?: string | null;
    use_cases?: string[] | null;
    product_priorities?: any;
  },
>(
  products: T[],
  query: ProductFilterSortQuery,
  parseSortFn: (sort: string | undefined) => { column: string; ascending: boolean },
): T[] {
  const keyword =
    typeof query.keyword === 'string' && query.keyword.trim().length > 0
      ? query.keyword.trim().toLowerCase()
      : typeof query.q === 'string' && query.q.trim().length > 0
        ? query.q.trim().toLowerCase()
        : undefined;

  const filtered = products.filter((row) => {
    const genres = row.genres ?? (row.genre ? [row.genre] : []);
    const useCases = row.use_cases ?? (row.use_case ? [row.use_case] : []);
    const searchable = [
      row.title,
      row.author_name ?? '',
      row.genre ?? '',
      row.use_case ?? '',
      ...genres,
      ...useCases,
    ]
      .join(' ')
      .toLowerCase();

    if (query.artistId && row.artist_id !== query.artistId) return false;
    if (
      query.genre &&
      !genres.includes(query.genre) &&
      row.genre !== query.genre
    ) {
      return false;
    }
    if (
      query.useCase &&
      !useCases.includes(query.useCase) &&
      row.use_case !== query.useCase
    ) {
      return false;
    }

    const durationSeconds = row.duration ?? 0;
    if (query.duration === 'lt2' && durationSeconds >= 120) return false;
    if (
      query.duration === '2to4' &&
      !(durationSeconds >= 120 && durationSeconds < 240)
    ) {
      return false;
    }
    if (query.duration === 'gt4' && durationSeconds < 240) return false;

    if (keyword && !searchable.includes(keyword)) return false;

    return true;
  });

  const { column, ascending } = parseSortFn(query.sort);

  const getPriorityInfo = (row: any) => {
    const priorityJoin = row.product_priorities;
    const priority =
      Array.isArray(priorityJoin) && priorityJoin.length > 0
        ? priorityJoin[0]
        : !Array.isArray(priorityJoin) && priorityJoin
          ? priorityJoin
          : null;
    return priority;
  };

  filtered.sort((a, b) => {
    const priA = getPriorityInfo(a);
    const priB = getPriorityInfo(b);

    const isTriggerA = priA ? priA.is_trigger : false;
    const isTriggerB = priB ? priB.is_trigger : false;

    // 1) Compare by is_trigger (true comes first)
    if (isTriggerA !== isTriggerB) {
      return isTriggerA ? -1 : 1;
    }

    // 2) Compare by priority_score (higher comes first)
    const scoreA = priA ? (priA.priority_score ?? 0) : 0;
    const scoreB = priB ? (priB.priority_score ?? 0) : 0;
    if (scoreA !== scoreB) {
      return scoreB - scoreA;
    }

    // 3) Secondary sorting (column parsed from query.sort)
    const left = (a as any)[column];
    const right = (b as any)[column];

    if (left === right) return 0;
    if (left === null || left === undefined) return ascending ? -1 : 1;
    if (right === null || right === undefined) return ascending ? 1 : -1;

    if (typeof left === 'number' && typeof right === 'number') {
      return ascending ? left - right : right - left;
    }

    const leftValue = String(left).toLowerCase();
    const rightValue = String(right).toLowerCase();
    return ascending
      ? leftValue.localeCompare(rightValue)
      : rightValue.localeCompare(leftValue);
  });

  return filtered;
}
