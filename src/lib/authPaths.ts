export function isAuthPublicApiPath(pathname: string): boolean {
  if (pathname === '/health' || pathname === '/ready') return true
  if (pathname === '/auth/me') return true
  if (
    pathname === '/auth/request-code' ||
    pathname === '/auth/verify-code' ||
    pathname === '/auth/logout'
  ) {
    return true
  }
  if (pathname === '/mailboxes/oauth/callback') return true
  return false
}
