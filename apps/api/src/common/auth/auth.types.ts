export type AuthUserContext = {
  userId: string
  roleId: number | null
  roleName: string | null
}

export type JwtPayload = {
  sub: string
  roleId?: unknown
  roleName?: unknown
}
