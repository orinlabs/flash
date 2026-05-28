import { and, eq, inArray, sql } from 'drizzle-orm'

import { db } from '../../db/client.js'
import {
  externalEmailCandidates,
  mailboxes,
  outreachDrafts,
  type Mailbox
} from '../../db/schema.js'
import { openRouterReasoningConfig } from '../openrouter.js'
import { recordUsageEvent } from '../usage.js'
import { requiredEnv } from '../../workflows/repo.js'
import { getValidAccessToken } from './oauth.js'
import { normalizeEmailAddress } from './threadSync.js'

const GMAIL_BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const SCAN_MODEL = 'openai/gpt-5-nano'
const SCAN_LOOKBACK_DAYS_FIRST_RUN = 30
const SCAN_LOOKBACK_OVERLAP_MS = 24 * 60 * 60 * 1000
const MAX_MESSAGES_PER_SCAN = 200
const CLASSIFY_CONCURRENCY = 10
const BODY_PREVIEW_CHARS = 1500
const FETCH_BODY_CHARS = 6000

const PROVIDER_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'me.com',
  'aol.com',
  'proton.me',
  'protonmail.com'
])

type GmailHeader = { name?: string; value?: string }
type GmailMessagePart = {
  mimeType?: string
  body?: { data?: string; size?: number }
  parts?: GmailMessagePart[]
}
type GmailMessage = {
  id?: string
  threadId?: string
  internalDate?: string
  snippet?: string
  labelIds?: string[]
  payload?: {
    headers?: GmailHeader[]
    mimeType?: string
    body?: { data?: string }
    parts?: GmailMessagePart[]
  }
}

type ClassificationResult = {
  classification: 'cold_intro' | 'follow_up' | 'other'
  confidence: number
  rationale: string
}

export type MailboxScanResult = {
  mailboxId: string
  email: string
  scanned: number
  candidates: number
  skipped: number
  errors: number
  startedAt: string
  finishedAt: string
}

async function mapWithConcurrency<T, U>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<U>
): Promise<U[]> {
  const out: U[] = new Array(items.length)
  let next = 0
  const workers: Promise<void>[] = []
  const n = Math.max(1, Math.min(limit, items.length))
  for (let w = 0; w < n; w += 1) {
    workers.push(
      (async () => {
        while (true) {
          const i = next
          next += 1
          if (i >= items.length) return
          out[i] = await fn(items[i])
        }
      })()
    )
  }
  await Promise.all(workers)
  return out
}

function headerValue(headers: GmailHeader[] | undefined, name: string): string | null {
  const lower = name.toLowerCase()
  const hit = headers?.find((h) => h.name?.toLowerCase() === lower)
  return hit?.value?.trim() ?? null
}

function decodeBase64Url(data: string): string {
  const normalized = data.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(normalized, 'base64').toString('utf8')
}

function extractPlainText(part: GmailMessagePart | undefined): string {
  if (!part) return ''
  const chunks: string[] = []
  if (part.mimeType === 'text/plain' && part.body?.data) {
    chunks.push(decodeBase64Url(part.body.data))
  }
  for (const child of part.parts ?? []) {
    chunks.push(extractPlainText(child))
  }
  return chunks.join('\n').trim()
}

function messagePlainBody(message: GmailMessage, maxChars = FETCH_BODY_CHARS): string {
  const payload = message.payload
  if (!payload) return (message.snippet ?? '').slice(0, maxChars).trim()
  const fromPayload = extractPlainText(payload as GmailMessagePart)
  if (fromPayload) return fromPayload.slice(0, maxChars)
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data).slice(0, maxChars)
  }
  return (message.snippet ?? '').slice(0, maxChars)
}

function domainOf(email: string | null): string | null {
  if (!email) return null
  const at = email.lastIndexOf('@')
  if (at < 0) return null
  return email.slice(at + 1).toLowerCase()
}

async function listSentMessageIds(input: {
  accessToken: string
  query: string
  cap: number
}): Promise<string[]> {
  const ids: string[] = []
  let pageToken: string | undefined
  while (ids.length < input.cap) {
    const params = new URLSearchParams({
      labelIds: 'SENT',
      maxResults: String(Math.min(100, input.cap - ids.length)),
      q: input.query
    })
    if (pageToken) params.set('pageToken', pageToken)
    const res = await fetch(GMAIL_BASE + '/messages?' + params.toString(), {
      headers: { Authorization: 'Bearer ' + input.accessToken }
    })
    if (!res.ok) {
      throw new Error('Gmail messages.list failed (' + res.status + '): ' + (await res.text()))
    }
    const payload = (await res.json()) as {
      messages?: Array<{ id?: string }>
      nextPageToken?: string
    }
    for (const m of payload.messages ?? []) {
      if (m.id) ids.push(m.id)
      if (ids.length >= input.cap) break
    }
    if (!payload.nextPageToken) break
    pageToken = payload.nextPageToken
  }
  return ids
}

async function fetchMessageFull(accessToken: string, id: string): Promise<GmailMessage> {
  const params = new URLSearchParams({ format: 'full' })
  const res = await fetch(
    GMAIL_BASE + '/messages/' + encodeURIComponent(id) + '?' + params.toString(),
    { headers: { Authorization: 'Bearer ' + accessToken } }
  )
  if (!res.ok) {
    throw new Error('Gmail messages.get failed (' + res.status + '): ' + (await res.text()))
  }
  return (await res.json()) as GmailMessage
}

async function fetchProfileHistoryId(accessToken: string): Promise<string | null> {
  const res = await fetch(GMAIL_BASE + '/profile', {
    headers: { Authorization: 'Bearer ' + accessToken }
  })
  if (!res.ok) {
    return null
  }
  const payload = (await res.json()) as { historyId?: string }
  return payload.historyId ?? null
}

function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const body = fenced ? fenced[1] : text
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end <= start) {
    throw new Error('model did not return JSON')
  }
  return JSON.parse(body.slice(start, end + 1))
}

async function classifyMessage(input: {
  apiKey: string
  fromEmail: string | null
  toEmail: string | null
  subject: string | null
  body: string
}): Promise<ClassificationResult> {
  const model = process.env.OPENROUTER_INBOX_SCAN_MODEL ?? SCAN_MODEL
  const systemPrompt = [
    'You triage outbound emails to decide if they are first-touch cold introductions to a new prospect/company.',
    'Inputs: subject, to address, full body text. The email was sent FROM the operator TO a recipient.',
    '',
    'Definitions:',
    '- "cold_intro": a first-touch outbound message introducing the operator to a new person/company they have no prior relationship with. Typical signs: introduces who they are, references something specific about the recipient, asks for a call/meeting/feedback, single-paragraph or short body, no "Re:" / "Fwd:" in subject, no quoted prior message.',
    '- "follow_up": a follow-up to a prior thread (subject starts with Re:/Fwd:, references "circling back", "following up", or quotes a prior message). Useful but not a NEW intro.',
    '- "other": newsletters, transactional messages, replies to friends/family, internal team messages, scheduling confirmations, marketing blasts, automated mail, attachments-only, anything that is not a real outbound intro or follow-up to a prospect.',
    '',
    'Return ONLY a JSON object: {"classification": "cold_intro" | "follow_up" | "other", "confidence": 0.0-1.0, "rationale": "one short sentence"}.'
  ].join('\n')

  const userPayload = {
    subject: input.subject ?? '(no subject)',
    from: input.fromEmail ?? '(unknown sender)',
    to: input.toEmail ?? '(unknown recipient)',
    body_excerpt: input.body.slice(0, FETCH_BODY_CHARS)
  }

  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + input.apiKey,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://api.flash.orinlabs.ai',
      'X-Title': 'Flash Mailbox Scan'
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(userPayload, null, 2) }
      ],
      reasoning: openRouterReasoningConfig()
    })
  })
  if (!res.ok) {
    throw new Error('OpenRouter call failed (' + res.status + '): ' + (await res.text()))
  }
  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string | null; refusal?: string } }>
    usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    error?: { message?: string }
  }
  if (payload.error?.message) {
    throw new Error('OpenRouter error: ' + payload.error.message)
  }

  await recordUsageEvent({
    provider: 'openrouter',
    operation: 'mailbox_scan_classify',
    model,
    promptTokens: payload.usage?.prompt_tokens ?? null,
    completionTokens: payload.usage?.completion_tokens ?? null,
    totalTokens: payload.usage?.total_tokens ?? null
  })

  const message = payload.choices?.[0]?.message
  if (message?.refusal) throw new Error('model refused: ' + message.refusal)
  const text = message?.content?.trim()
  if (!text) throw new Error('model returned no content')
  const obj = extractJsonObject(text) as Record<string, unknown>
  const cls = String(obj.classification ?? '')
  if (cls !== 'cold_intro' && cls !== 'follow_up' && cls !== 'other') {
    throw new Error('invalid classification: ' + cls)
  }
  const conf = Number(obj.confidence ?? 0)
  const rationale = String(obj.rationale ?? '').slice(0, 1000)
  return {
    classification: cls,
    confidence: Number.isFinite(conf) ? Math.max(0, Math.min(1, conf)) : 0,
    rationale
  }
}

/**
 * Returns true if the recipient looks like a likely prospect (i.e. their email
 * is at a real business domain, not a personal provider, and not the operator's
 * own domain or a no-reply/system address).
 */
function recipientLooksLikeProspect(input: {
  toEmail: string | null
  mailboxEmail: string
}): boolean {
  if (!input.toEmail) return false
  const recipient = normalizeEmailAddress(input.toEmail)
  if (!recipient) return false
  const recipientDomain = domainOf(recipient)
  if (!recipientDomain) return false
  if (recipient.startsWith('no-reply@') || recipient.startsWith('noreply@')) return false
  // Skip emails the operator sent to themselves.
  if (recipient === input.mailboxEmail.toLowerCase()) return false
  // Skip personal email providers - keeps the operator's friends/family out.
  if (PROVIDER_DOMAINS.has(recipientDomain)) return false
  return true
}

export async function scanMailboxForSentIntros(
  mailboxId: string,
  organizationId: string
): Promise<MailboxScanResult> {
  const apiKey = requiredEnv('OPENROUTER_API_KEY')
  const startedAt = new Date()
  const [mailbox] = await db
    .select()
    .from(mailboxes)
    .where(
      and(eq(mailboxes.id, mailboxId), eq(mailboxes.organizationId, organizationId))
    )
    .limit(1)
  if (!mailbox) throw new Error('mailbox not found')
  if (mailbox.status !== 'active') throw new Error('mailbox is not active')

  const { accessToken, mailbox: refreshed } = await getValidAccessToken(mailbox)
  const lookbackSince = computeLookbackSince(refreshed)
  const afterUnix = Math.floor(lookbackSince.getTime() / 1000)
  const query = 'in:sent after:' + afterUnix

  const sentIds = await listSentMessageIds({
    accessToken,
    query,
    cap: MAX_MESSAGES_PER_SCAN
  })

  if (sentIds.length === 0) {
    const finishedAt = new Date()
    await db
      .update(mailboxes)
      .set({
        lastScannedAt: finishedAt,
        updatedAt: new Date()
      })
      .where(eq(mailboxes.id, mailboxId))
    return {
      mailboxId,
      email: refreshed.email,
      scanned: 0,
      candidates: 0,
      skipped: 0,
      errors: 0,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString()
    }
  }

  const dedupExisting = await dedupAgainstExisting({
    organizationId,
    gmailMessageIds: sentIds
  })
  const newIds = sentIds.filter((id) => !dedupExisting.has(id))

  let candidates = 0
  let skipped = sentIds.length - newIds.length
  let errors = 0

  await mapWithConcurrency(newIds, CLASSIFY_CONCURRENCY, async (id) => {
    try {
      const message = await fetchMessageFull(accessToken, id)
      const headers = message.payload?.headers
      const fromEmail = normalizeEmailAddress(headerValue(headers, 'From'))
      const toEmail = normalizeEmailAddress(headerValue(headers, 'To'))
      const subject = headerValue(headers, 'Subject')
      const sentMs = message.internalDate ? Number(message.internalDate) : null
      const sentAt = sentMs ? new Date(sentMs) : null

      if (!recipientLooksLikeProspect({ toEmail, mailboxEmail: refreshed.email })) {
        skipped += 1
        return
      }

      const body = messagePlainBody(message)
      const decision = await classifyMessage({
        apiKey,
        fromEmail,
        toEmail,
        subject,
        body
      })

      if (decision.classification === 'other' && decision.confidence >= 0.6) {
        skipped += 1
        return
      }

      await db
        .insert(externalEmailCandidates)
        .values({
          organizationId,
          mailboxId,
          gmailMessageId: id,
          gmailThreadId: message.threadId ?? null,
          fromEmail,
          toEmail,
          subject,
          bodyPreview: body.slice(0, BODY_PREVIEW_CHARS),
          sentAt,
          classification: decision.classification,
          confidence: decision.confidence.toFixed(4),
          rationale: decision.rationale,
          status: 'pending'
        })
        .onConflictDoNothing({
          target: [
            externalEmailCandidates.organizationId,
            externalEmailCandidates.gmailMessageId
          ]
        })

      candidates += 1
    } catch (err) {
      errors += 1
      console.error(
        '[mailbox-scan] message ' + id + ' classify failed:',
        err instanceof Error ? err.message : err
      )
    }
  })

  const profileHistoryId = await fetchProfileHistoryId(accessToken)
  const finishedAt = new Date()
  await db
    .update(mailboxes)
    .set({
      lastScannedAt: finishedAt,
      lastScanGmailHistoryId: profileHistoryId ?? mailbox.lastScanGmailHistoryId ?? null,
      updatedAt: new Date()
    })
    .where(eq(mailboxes.id, mailboxId))

  return {
    mailboxId,
    email: refreshed.email,
    scanned: newIds.length,
    candidates,
    skipped,
    errors,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString()
  }
}

function computeLookbackSince(mailbox: Mailbox): Date {
  if (mailbox.lastScannedAt) {
    return new Date(mailbox.lastScannedAt.getTime() - SCAN_LOOKBACK_OVERLAP_MS)
  }
  return new Date(Date.now() - SCAN_LOOKBACK_DAYS_FIRST_RUN * 24 * 60 * 60 * 1000)
}

async function dedupAgainstExisting(input: {
  organizationId: string
  gmailMessageIds: string[]
}): Promise<Set<string>> {
  if (input.gmailMessageIds.length === 0) return new Set()
  const candidatesExisting = await db
    .select({ id: externalEmailCandidates.gmailMessageId })
    .from(externalEmailCandidates)
    .where(
      and(
        eq(externalEmailCandidates.organizationId, input.organizationId),
        inArray(externalEmailCandidates.gmailMessageId, input.gmailMessageIds)
      )
    )
  const draftsExisting = await db
    .select({ id: outreachDrafts.gmailMessageId })
    .from(outreachDrafts)
    .where(
      and(
        eq(outreachDrafts.organizationId, input.organizationId),
        inArray(
          sql`${outreachDrafts.gmailMessageId}`,
          input.gmailMessageIds
        )
      )
    )
  const set = new Set<string>()
  for (const r of candidatesExisting) if (r.id) set.add(r.id)
  for (const r of draftsExisting) if (r.id) set.add(r.id)
  return set
}

export async function scanAllActiveMailboxesForOrg(
  organizationId: string
): Promise<MailboxScanResult[]> {
  const rows = await db
    .select({ id: mailboxes.id })
    .from(mailboxes)
    .where(
      and(eq(mailboxes.organizationId, organizationId), eq(mailboxes.status, 'active'))
    )
  const results: MailboxScanResult[] = []
  for (const r of rows) {
    try {
      results.push(await scanMailboxForSentIntros(r.id, organizationId))
    } catch (err) {
      console.error(
        '[mailbox-scan] mailbox ' + r.id + ' failed:',
        err instanceof Error ? err.message : err
      )
    }
  }
  return results
}

export async function scanAllActiveMailboxes(): Promise<MailboxScanResult[]> {
  const rows = await db
    .select({ id: mailboxes.id, organizationId: mailboxes.organizationId })
    .from(mailboxes)
    .where(eq(mailboxes.status, 'active'))
  const results: MailboxScanResult[] = []
  for (const r of rows) {
    try {
      results.push(await scanMailboxForSentIntros(r.id, r.organizationId))
    } catch (err) {
      console.error(
        '[mailbox-scan] mailbox ' + r.id + ' failed:',
        err instanceof Error ? err.message : err
      )
    }
  }
  return results
}
