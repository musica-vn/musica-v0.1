import {
  buildRequiredPermissionsFromDependencies,
  dedupeRequiredPermissions,
} from './licensing-required-permissions';

describe('licensing-required-permissions', () => {
  const basePermissions = [
    { id: 'perm-platform', name: 'Platform right', lawReference: 'Law A' },
  ];

  const expressionPermissions = [
    { id: 'perm-expression-1', name: 'Expression right 1', lawReference: 'Law B' },
    { id: 'perm-shared', name: 'Shared right', lawReference: 'Law C' },
  ];

  const modificationPermissions = [
    { id: 'perm-modification-1', name: 'Modification right 1', lawReference: 'Law D' },
    { id: 'perm-shared', name: 'Shared right', lawReference: 'Law C' },
  ];

  it('keeps only platform permissions when no dependent modifier is enabled', () => {
    expect(
      buildRequiredPermissionsFromDependencies({
        basePermissions,
        priceModifierKeys: ['SUBJECT_INDIVIDUAL'],
        expressionPermissions,
        modificationPermissions,
      }),
    ).toEqual(basePermissions);
  });

  it('adds all active expression and modification permissions when both modifiers are enabled', () => {
    expect(
      buildRequiredPermissionsFromDependencies({
        basePermissions,
        priceModifierKeys: ['EXPRESSION', 'MODIFICATION'],
        expressionPermissions,
        modificationPermissions,
      }),
    ).toEqual([
      { id: 'perm-platform', name: 'Platform right', lawReference: 'Law A' },
      { id: 'perm-expression-1', name: 'Expression right 1', lawReference: 'Law B' },
      { id: 'perm-shared', name: 'Shared right', lawReference: 'Law C' },
      { id: 'perm-modification-1', name: 'Modification right 1', lawReference: 'Law D' },
    ]);
  });

  it('dedupes permissions by id while keeping the latest occurrence', () => {
    expect(
      dedupeRequiredPermissions([
        { id: 'perm-1', name: 'First', lawReference: 'Law 1' },
        { id: 'perm-1', name: 'Second', lawReference: 'Law 2' },
      ]),
    ).toEqual([{ id: 'perm-1', name: 'Second', lawReference: 'Law 2' }]);
  });
});
