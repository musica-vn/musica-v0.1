export type DbUserRoleRowLike = {
  role_id: unknown;
  role?: { name?: unknown } | null;
};

/**
 * Chuẩn hoá user_roles (join từ DB) về shape roles dùng trong response.
 */
export const normalizeRoles = (
  userRoles: DbUserRoleRowLike[] | null | undefined,
): Array<{ roleId: number; roleName: string }> =>
  (userRoles ?? [])
    .map((row) => {
      const roleId = typeof row.role_id === 'number' ? row.role_id : null;
      const roleName =
        row?.role && typeof row.role.name === 'string' ? row.role.name : null;
      if (!roleId || !roleName) return null;
      return { roleId, roleName };
    })
    .filter(
      (
        value,
      ): value is {
        roleId: number;
        roleName: string;
      } => value !== null,
    );
