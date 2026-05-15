import { useMemo } from 'react'

import { appendMailboxSignature, formatFromHeader } from '@/lib/outgoingEmail'

export function OutgoingEmailPreview({
  fromEmail,
  fromDisplayName,
  toEmail,
  subject,
  body,
  signature
}: {
  fromEmail: string
  fromDisplayName: string | null
  toEmail: string
  subject: string
  body: string
  signature: string | null
}) {
  const outgoingBody = useMemo(
    () => appendMailboxSignature(body, signature),
    [body, signature]
  )
  const fromHeader = fromEmail
    ? formatFromHeader(fromEmail, fromDisplayName)
    : '(no mailbox assigned)'
  const signatureTrimmed = signature?.trim() ?? ''

  return (
    <section className="overflow-hidden rounded-md border border-line bg-surface">
      <div className="border-b border-line bg-surface-muted/50 px-3 py-2">
        <div className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
          Outgoing email preview
        </div>
        <p className="mt-0.5 text-2xs text-ink-faint">
          Exactly what the recipient will receive when you approve and send.
        </p>
      </div>
      <div className="space-y-2 border-b border-line px-4 py-3 text-sm">
        <PreviewRow label="From" value={fromHeader} />
        <PreviewRow label="To" value={toEmail || '(empty)'} />
        <PreviewRow label="Subject" value={subject || '(empty)'} />
      </div>
      <div className="px-4 py-4">
        {outgoingBody.trim() ? (
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-ink">
            {outgoingBody}
          </pre>
        ) : (
          <p className="text-sm text-ink-faint">(empty body)</p>
        )}
        {signatureTrimmed ? (
          <p className="mt-3 text-2xs text-ink-faint">
            Signature from mailbox settings is included above.
          </p>
        ) : (
          <p className="mt-3 text-2xs text-ink-faint">
            No mailbox signature configured — only the body above will be sent.
          </p>
        )}
      </div>
    </section>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)] gap-2">
      <span className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
        {label}
      </span>
      <span className="break-words text-ink">{value}</span>
    </div>
  )
}
