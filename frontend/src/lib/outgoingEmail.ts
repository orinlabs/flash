export function formatFromHeader(email: string, displayName: string | null | undefined): string {
  return displayName?.trim() ? `${displayName.trim()} <${email}>` : email
}

export function appendMailboxSignature(
  body: string,
  signature: string | null | undefined
): string {
  const sig = signature?.trim()
  if (!sig) return body
  const trimmedBody = body.replace(/\s+$/, '')
  return trimmedBody ? `${trimmedBody}\n\n${sig}` : sig
}
