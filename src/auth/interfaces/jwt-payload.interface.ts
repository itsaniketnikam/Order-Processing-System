/**
 * Shape of the JWT body. `sub` (subject) follows RFC 7519 and is the
 * canonical "who is this token for" claim.
 */
export interface JwtPayload {
  sub: string;
  email: string;
}
