import { Check, ExternalLink, MessageSquare } from 'lucide-react'
import { useState } from 'react'

import { apiPost, type Company, type Person } from '@/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DrawerBody, DrawerTabs, DrawerTabsContent, DrawerTabsList, DrawerTabsTrigger } from '@/components/ui/drawer'
import { StatusDot } from '@/components/ui/status-dot'
import { Textarea } from '@/components/ui/textarea'
import { domainFromUrl, formatDate } from '@/lib/format'

import { CompanyFavicon, ExternalAnchor, KV, SectionCard } from './drawer-ui'

export function PersonView({
  person,
  company,
  onSelectCompany,
  onLogged
}: {
  person: Person
  company: Company | null
  onSelectCompany: (id: string) => void
  onLogged?: () => void
}) {
  return (
    <DrawerTabs defaultValue="overview" className="flex min-h-0 flex-1 flex-col">
      <DrawerTabsList>
        <DrawerTabsTrigger value="overview">Overview</DrawerTabsTrigger>
        <DrawerTabsTrigger value="activity">Activity</DrawerTabsTrigger>
        <DrawerTabsTrigger value="notes">Notes</DrawerTabsTrigger>
      </DrawerTabsList>

      <DrawerTabsContent value="overview" className="min-h-0 flex-1 overflow-y-auto">
        <DrawerBody className="space-y-4">
          <SectionCard title="Identity">
            <KV label="Title" value={person.title} />
            <KV label="Department" value={person.department} />
            <KV label="Seniority" value={person.seniority} />
            <KV
              label="Lifecycle"
              value={<StatusDot status={person.lifecycleStatus} />}
            />
          </SectionCard>

          <SectionCard title="Contact">
            <KV label="Email" value={person.email} mono />
            <KV label="Phone" value={person.phone} mono />
            <KV
              label="LinkedIn"
              value={
                person.linkedinUrl ? (
                  <ExternalAnchor href={person.linkedinUrl}>
                    {domainFromUrl(person.linkedinUrl) ?? person.linkedinUrl}
                  </ExternalAnchor>
                ) : null
              }
            />
            <KV
              label="Twitter"
              value={
                person.twitterUrl ? (
                  <ExternalAnchor href={person.twitterUrl}>
                    {domainFromUrl(person.twitterUrl) ?? person.twitterUrl}
                  </ExternalAnchor>
                ) : null
              }
            />
          </SectionCard>

          {company ? (
            <SectionCard title="Company">
              <button
                type="button"
                onClick={() => onSelectCompany(company.id)}
                className="flex w-full items-center gap-3 rounded-md border border-line bg-surface px-3 py-2.5 text-left transition-colors hover:bg-surface-muted/60"
              >
                <CompanyFavicon company={company} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-ink">{company.name}</div>
                  <div className="truncate font-mono text-[12px] text-ink-muted">
                    {company.domain ?? company.website ?? '-'}
                  </div>
                </div>
                <ExternalLink className="size-3.5 text-ink-faint" />
              </button>
            </SectionCard>
          ) : null}

          {person.icpKeywords?.length ? (
            <SectionCard title="ICP keywords">
              <div className="flex flex-wrap gap-1.5">
                {person.icpKeywords.map((k) => (
                  <Badge key={k} variant="mono">
                    {k}
                  </Badge>
                ))}
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title="Meta">
            <KV label="Last seen" value={formatDate(person.lastSeenAt)} />
            <KV label="Created" value={formatDate(person.createdAt)} />
            <KV label="Updated" value={formatDate(person.updatedAt)} />
          </SectionCard>
        </DrawerBody>
      </DrawerTabsContent>

      <DrawerTabsContent value="activity" className="min-h-0 flex-1 overflow-y-auto">
        <DrawerBody className="space-y-4">
          <LogLinkedinSendCard personId={person.id} onLogged={onLogged} />
        </DrawerBody>
      </DrawerTabsContent>

      <DrawerTabsContent value="notes" className="min-h-0 flex-1 overflow-y-auto">
        <DrawerBody className="space-y-4">
          <SectionCard title="Context">
            <p className="whitespace-pre-wrap text-sm text-ink">
              {person.context ?? <span className="text-ink-faint">No context yet.</span>}
            </p>
          </SectionCard>
          <SectionCard title="Notes">
            <p className="whitespace-pre-wrap text-sm text-ink">
              {person.notes ?? <span className="text-ink-faint">No notes yet.</span>}
            </p>
          </SectionCard>
        </DrawerBody>
      </DrawerTabsContent>
    </DrawerTabs>
  )
}

function todayLocalDate(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate())
}

function LogLinkedinSendCard({
  personId,
  onLogged
}: {
  personId: string
  onLogged?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState('')
  const [sentDate, setSentDate] = useState(() => todayLocalDate())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)

  async function submit() {
    const trimmed = body.trim()
    if (!trimmed) {
      setError('Paste the LinkedIn message you sent.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const sentDateTime = new Date(sentDate + 'T12:00:00')
      await apiPost('/people/' + personId + '/log-linkedin-message', {
        body: trimmed,
        sentAt: sentDateTime.toISOString(),
        status: 'sent'
      })
      setBody('')
      setOpen(false)
      setSavedAt(new Date().toLocaleString())
      onLogged?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <SectionCard
      title="LinkedIn outreach"
      action={
        !open ? (
          <Button
            variant="outline"
            size="sm"
            iconLeft={MessageSquare}
            onClick={() => setOpen(true)}
          >
            Log LinkedIn send
          </Button>
        ) : null
      }
    >
      {open ? (
        <div className="space-y-3">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Paste the LinkedIn message you sent to this person. Flash will add it to your inbox under Drafts (status: sent)."
            className="min-h-[140px]"
            autoFocus
          />
          <label className="flex items-center gap-2 text-xs text-ink-muted">
            Sent on
            <input
              type="date"
              value={sentDate}
              onChange={(e) => setSentDate(e.target.value)}
              max={todayLocalDate()}
              className="h-8 rounded-md border border-line bg-surface px-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </label>
          {error ? (
            <div className="rounded-md border border-bad/25 bg-bad/10 px-3 py-2 text-xs text-bad">
              {error}
            </div>
          ) : null}
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setOpen(false)
                setError(null)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              iconLeft={Check}
              loading={saving}
              onClick={() => void submit()}
            >
              Log as sent
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-ink-muted">
          {savedAt
            ? 'Logged at ' + savedAt + '. The send appears in the Drafts inbox.'
            : 'Sent a LinkedIn message outside Flash? Log it here so it shows up in your unified inbox.'}
        </p>
      )}
    </SectionCard>
  )
}
