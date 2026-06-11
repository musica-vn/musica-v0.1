import {
  applyProductPriorityOrdering,
  filterAndSortProducts,
} from './product-priority-ordering';

describe('applyProductPriorityOrdering', () => {
  it('applies priority ordering on product_priorities foreign table with nullsFirst: false', () => {
    const order = jest.fn().mockReturnThis();
    const builder = { order };

    const result = applyProductPriorityOrdering(builder);

    expect(result).toBe(builder);
    expect(order).toHaveBeenNthCalledWith(
      1,
      'is_trigger',
      { foreignTable: 'product_priorities', ascending: false, nullsFirst: false },
    );
    expect(order).toHaveBeenNthCalledWith(
      2,
      'priority_score',
      { foreignTable: 'product_priorities', ascending: false, nullsFirst: false },
    );
  });
});

describe('filterAndSortProducts', () => {
  const mockProducts = [
    {
      id: '1',
      title: 'V-Pop Chill',
      author_name: 'Artist A',
      genre: 'Pop',
      genres: ['Pop', 'Chill'],
      duration: 150, // 2m30s
      use_cases: ['VLOG'],
      product_priorities: {
        is_trigger: false,
        priority_score: 50,
      },
      created_at: '2026-06-01T00:00:00Z',
    },
    {
      id: '2',
      title: 'EDM Party',
      author_name: 'Artist B',
      genre: 'EDM',
      genres: ['EDM'],
      duration: 90, // 1m30s
      use_cases: ['GAME', 'ADVERTISEMENT'],
      product_priorities: {
        is_trigger: true,
        priority_score: 100,
      },
      created_at: '2026-06-03T00:00:00Z',
    },
    {
      id: '3',
      title: 'Acoustic Morning',
      author_name: 'Artist A',
      genre: 'Acoustic',
      genres: ['Acoustic'],
      duration: 250, // 4m10s
      use_cases: ['PODCAST'],
      // No priority record
      product_priorities: null,
      created_at: '2026-06-02T00:00:00Z',
    },
    {
      id: '4',
      title: 'EDM Calm',
      author_name: 'Artist C',
      genre: 'EDM',
      genres: ['EDM'],
      duration: 180, // 3m00s
      use_cases: ['VLOG'],
      product_priorities: {
        is_trigger: true,
        priority_score: 50,
      },
      created_at: '2026-06-04T00:00:00Z',
    },
  ];

  const mockParseSort = (sort?: string) => {
    if (sort === 'createdAt:desc') {
      return { column: 'created_at', ascending: false };
    }
    if (sort === 'createdAt:asc') {
      return { column: 'created_at', ascending: true };
    }
    return { column: 'created_at', ascending: false };
  };

  it('filters by keyword correctly', () => {
    const result = filterAndSortProducts(mockProducts, { keyword: 'edm' }, mockParseSort);
    expect(result.map((r) => r.id)).toEqual(['2', '4']);
  });

  it('filters by genre correctly', () => {
    const result = filterAndSortProducts(mockProducts, { genre: 'EDM' }, mockParseSort);
    expect(result.map((r) => r.id)).toEqual(['2', '4']);
  });

  it('filters by duration lt2 correctly', () => {
    const result = filterAndSortProducts(mockProducts, { duration: 'lt2' }, mockParseSort);
    expect(result.map((r) => r.id)).toEqual(['2']);
  });

  it('filters by useCase correctly', () => {
    const result = filterAndSortProducts(mockProducts, { useCase: 'VLOG' }, mockParseSort);
    expect(result.map((r) => r.id)).toEqual(['4', '1']); // trigger EDM Calm first, then V-Pop Chill
  });

  it('sorts by priority (is_trigger first, then priority_score desc, then secondary sort)', () => {
    // Expected order:
    // 1. id '2': is_trigger: true, priority_score: 100
    // 2. id '4': is_trigger: true, priority_score: 50
    // 3. id '1': is_trigger: false, priority_score: 50
    // 4. id '3': no priority (treated as is_trigger: false, score: 0)
    const result = filterAndSortProducts(mockProducts, {}, mockParseSort);
    expect(result.map((r) => r.id)).toEqual(['2', '4', '1', '3']);
  });

  it('applies secondary sorting when priorities are identical', () => {
    const identicalPriorityProducts = [
      {
        id: '1',
        title: 'Song A',
        created_at: '2026-06-01T00:00:00Z',
        product_priorities: null,
      },
      {
        id: '2',
        title: 'Song B',
        created_at: '2026-06-02T00:00:00Z',
        product_priorities: null,
      },
    ];

    // Under secondary sorting createdAt:desc, id '2' (June 2) should be before id '1' (June 1)
    const resultDesc = filterAndSortProducts(
      identicalPriorityProducts,
      { sort: 'createdAt:desc' },
      mockParseSort,
    );
    expect(resultDesc.map((r) => r.id)).toEqual(['2', '1']);

    // Under secondary sorting createdAt:asc, id '1' (June 1) should be before id '2' (June 2)
    const resultAsc = filterAndSortProducts(
      identicalPriorityProducts,
      { sort: 'createdAt:asc' },
      mockParseSort,
    );
    expect(resultAsc.map((r) => r.id)).toEqual(['1', '2']);
  });
});
