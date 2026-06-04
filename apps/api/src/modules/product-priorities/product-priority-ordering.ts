export const PRODUCT_PRIORITY_SELECT =
  'product_priorities(priority_score,is_trigger,effective_start,effective_end)';

export const applyProductPriorityOrdering = (requestBuilder: any) =>
  requestBuilder
    .order('is_trigger', { foreignTable: 'product_priorities', ascending: false })
    .order('priority_score', {
      foreignTable: 'product_priorities',
      ascending: false,
    });
