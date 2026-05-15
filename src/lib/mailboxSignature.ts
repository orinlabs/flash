function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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

export function appendMailboxSignatureHtml(
  bodyHtml: string,
  signature: string | null | undefined
): string {
  const sig = signature?.trim()
  if (!sig) return bodyHtml
  const sigHtml = escapeHtml(sig).replace(/\n/g, '<br>')
  const trimmedBody = bodyHtml.replace(/\s+$/, '')
  return trimmedBody ? `${trimmedBody}<br><br>${sigHtml}` : sigHtml
}
