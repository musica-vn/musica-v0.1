import type { VariantPricingModifierKey } from '../pricing/variant-pricing.enums';

export type RequiredPermissionSummary = {
  id: string;
  name: string;
  lawReference: string;
};

export type RawPermissionSummary = {
  id: string;
  name: string;
  law_reference: string;
};

export const mapRequiredPermissionSummary = (
  permissionId: string,
  permission: RawPermissionSummary | null | undefined,
): RequiredPermissionSummary => ({
  id: permission?.id ?? permissionId,
  name: permission?.name ?? permissionId,
  lawReference: permission?.law_reference ?? '',
});

export const dedupeRequiredPermissions = (
  permissions: RequiredPermissionSummary[],
): RequiredPermissionSummary[] =>
  Array.from(
    new Map(permissions.map((permission) => [permission.id, permission])).values(),
  );

export const buildRequiredPermissionsFromDependencies = (params: {
  basePermissions: RequiredPermissionSummary[];
  priceModifierKeys: VariantPricingModifierKey[];
  expressionPermissions: RequiredPermissionSummary[];
  modificationPermissions: RequiredPermissionSummary[];
}): RequiredPermissionSummary[] => {
  const requiredPermissions = [...params.basePermissions];

  if (params.priceModifierKeys.includes('EXPRESSION')) {
    requiredPermissions.push(...params.expressionPermissions);
  }

  if (params.priceModifierKeys.includes('MODIFICATION')) {
    requiredPermissions.push(...params.modificationPermissions);
  }

  return dedupeRequiredPermissions(requiredPermissions);
};
