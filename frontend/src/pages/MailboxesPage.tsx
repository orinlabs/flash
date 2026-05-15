import { Inbox, Mail, Plug, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { apiDelete, apiPatch, apiPost, type Mailbox } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Banner } from '@/components/ui/banner'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { StatusDot } from '@/components/ui/status-dot'
import { Textarea } from '@/components/ui/textarea'
import { Toolbar, ToolbarSpacer } from '@/components/ui/toolbar'
import { formatRelative } from '@/lib/format'

interface Props {
  mailboxes: Mailbox[]
  loading: boolean
  onRefresh: () => void
}

export function MailboxesPage({ mailboxes, loading, onRefresh }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.data?.type === 'mailbox-oauth') {
        setConnecting(false)
        onRefresh()
        if (!ev.data?.ok) setError('Mailbox connection failed. Check the popup for details.')
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onRefresh])

  const handleConnect = useCallback(async () => {
    setError(null)
    setConnecting(true)
    try {
      const { consentUrl } = await apiPost<{ consentUrl: string }>('/mailboxes/oauth/start')
      const popup = window.open(
        consentUrl,
        'mailbox-oauth',
        'width=520,height=720,menubar=no,toolbar=no'
      )
      if (!popup) {
        setConnecting(false)
        setError(
          'Popup blocked. Allow popups for this site, or open this URL manually: ' + consentUrl
        )
      }
    } catch (err) {
      setConnecting(false)
      setError(err instanceof Error ? err.message : 'Failed to start OAuth')
    }
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <Toolbar>
        <p className="text-sm text-ink-muted">
          Connect Gmail accounts. Outreach drafts are reviewed in-app and sent from these mailboxes only on your approval.
        </p>
        <ToolbarSpacer />
        <Button
          variant="primary"
          size="md"
          iconLeft={Plug}
          loading={connecting}
          onClick={handleConnect}
        >
          Connect Gmail
        </Button>
      </Toolbar>

      {error ? (
        <div className="border-b border-line bg-bg px-5 py-2.5">
          <Banner
            tone="error"
            title="Something went wrong"
            description={error}
            onDismiss={() => setError(null)}
          />
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && mailboxes.length === 0 ? (
          <div className="p-10 text-center text-sm text-ink-muted">Loading mailboxes...</div>
        ) : mailboxes.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={Inbox}
              title="No mailboxes connected"
              description="Connect a Gmail account to let the agent draft outreach on your behalf."
              primaryAction={{ label: 'Connect Gmail', icon: Plug, onClick: handleConnect }}
            />
          </div>
        ) : (
          <ul className="divide-y divide-line">
            {mailboxes.map((m) => (
              <MailboxRow
                key={m.id}
                mailbox={m}
                editing={editing === m.id}
                onEdit={() => setEditing(editing === m.id ? null : m.id)}
                onSaved={() => {
                  setEditing(null)
                  onRefresh()
                }}
                onError={setError}
                onDeleted={onRefresh}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function MailboxRow({
  mailbox,
  editing,
  onEdit,
  onSaved,
  onError,
  onDeleted
}: {
  mailbox: Mailbox
  editing: boolean
  onEdit: () => void
  onSaved: () => void
  onError: (msg: string | null) => void
  onDeleted: () => void
}) {
  const [displayName, setDisplayName] = useState(mailbox.displayName ?? '')
  const [signature, setSignature] = useState(mailbox.signature ?? '')
  const [senderBio, setSenderBio] = useState(mailbox.senderBio ?? '')
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)

  async function save() {
    setSaving(true)
    onError(null)
    try {
      await apiPatch<Mailbox>('/mailboxes/' + mailbox.id, {
        displayName: displayName || null,
        signature,
        senderBio
      })
      onSaved()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function disconnect() {
    if (!confirm('Disconnect ' + mailbox.email + '? Drafts assigned to it will keep their reference but new sends will fail until reconnected.')) {
      return
    }
    setRemoving(true)
    onError(null)
    try {
      await apiDelete('/mailboxes/' + mailbox.id)
      onDeleted()
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Disconnect failed')
    } finally {
      setRemoving(false)
    }
  }

  return (
    <li className="px-6 py-4">
      <div className="flex items-start gap-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-line bg-surface-muted">
          <Mail className="size-4 text-ink-muted" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-ink">{mailbox.email}</span>
            <StatusDot status={mailbox.status} size="sm" />
            {mailbox.status === 'active' && !mailbox.hasRefreshToken ? (
              <Badge variant="outline">no refresh token</Badge>
            ) : null}
          </div>
          {mailbox.displayName ? (
            <div className="text-xs text-ink-muted">{mailbox.displayName}</div>
          ) : null}
          <div className="mt-1 text-xs text-ink-faint">
            Connected {formatRelative(mailbox.createdAt) ?? '-'}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" onClick={onEdit}>
            {editing ? 'Cancel' : 'Edit'}
          </Button>
          <Button
            variant="outline"
            size="icon"
            aria-label="Disconnect"
            loading={removing}
            onClick={disconnect}
          >
            {!removing ? <Trash2 /> : null}
          </Button>
        </div>
      </div>

      {editing ? (
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
              Display name
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Bryan Houlton"
            />
          </div>
          <div className="flex flex-col gap-1.5 md:row-span-2">
            <label className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
              Sender bio (for the agent)
            </label>
            <Textarea
              value={senderBio}
              onChange={(e) => setSenderBio(e.target.value)}
              placeholder="One paragraph: who I am, what I'm pitching, my tone, my company, my context. The agent uses this when drafting."
              className="min-h-[140px]"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-2xs font-medium uppercase tracking-wide text-ink-faint">
              Signature
            </label>
            <Textarea
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="-- &#10;Bryan&#10;founder, etc."
              className="min-h-[88px]"
            />
          </div>
          <div className="md:col-span-2 flex justify-end gap-2">
            <Button variant="outline" size="md" onClick={onEdit}>
              Cancel
            </Button>
            <Button variant="primary" size="md" loading={saving} onClick={save}>
              Save
            </Button>
          </div>
        </div>
      ) : (
        <Preview senderBio={mailbox.senderBio} signature={mailbox.signature} />
      )}
    </li>
  )
}

function Preview({
  senderBio,
  signature
}: {
  senderBio: string | null
  signature: string | null
}) {
  const hasContent = Boolean(senderBio?.trim() || signature?.trim())
  const preview = useMemo(() => {
    if (!hasContent) return null
    return (
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {senderBio ? (
          <section className="rounded-md border border-line bg-surface-muted/40 p-3">
            <div className="mb-1 text-2xs font-medium uppercase tracking-wide text-ink-faint">
              Sender bio
            </div>
            <p className="whitespace-pre-wrap text-sm text-ink">{senderBio}</p>
          </section>
        ) : null}
        {signature ? (
          <section className="rounded-md border border-line bg-surface-muted/40 p-3">
            <div className="mb-1 text-2xs font-medium uppercase tracking-wide text-ink-faint">
              Signature
            </div>
            <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-[18px] text-ink">
              {signature}
            </pre>
          </section>
        ) : null}
      </div>
    )
  }, [senderBio, signature, hasContent])
  return preview
}
