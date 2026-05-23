export type AuthUserContext = {
  userId: string
  roles: string[]
}

export type JwtPayload = {
  sub: string
  roles: unknown
}

