import { applyProductPriorityOrdering } from './product-priority-ordering';

describe('applyProductPriorityOrdering', () => {
  it('applies priority ordering on product_priorities foreign table', () => {
    const order = jest.fn().mockReturnThis();
    const builder = { order };

    const result = applyProductPriorityOrdering(builder);

    expect(result).toBe(builder);
    expect(order).toHaveBeenNthCalledWith(
      1,
      'is_trigger',
      { foreignTable: 'product_priorities', ascending: false },
    );
    expect(order).toHaveBeenNthCalledWith(
      2,
      'priority_score',
      { foreignTable: 'product_priorities', ascending: false },
    );
  });
});

