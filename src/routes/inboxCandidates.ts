import { and, desc, eq, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import { db } from '../db/client.js'
import {
  companies,
  externalEmailCandidates,
  mailboxes,
  outreachDrafts,
  outreachEvents,
  people
} from '../db/schema.js'
import {
  scanAllActiveMailboxesForOrg,
  scanMailboxForSentIntros,
  type MailboxScanResult
} from '../lib/gmail/mailboxScan.js'
import type { AppVariables } from '../lib/orgs.js'
import { withUsageContext } from '../lib/usage.js'
import { normalizeDomain, normalizeEmail } from '../workflows/repo.js'

export const inboxCandidatesRoutes = new Hono<{ Variables: AppVariables }>()

const listQuerySchema = z.object({
  status: z.enum(['pending', 'imported', 'ignored', 'all']).optional().default('pending'),
  limit: z.coerce.number().int().min(1).max(200).optional().default(100),
  offset: z.coerce.number().int().min(0).optional().default(0)
})

const scanBodySchema = z
  .object({
    mailboxId: z.string().uuid().optional()
  })
  .optional()
  .default({})

const importBodySchema = z.object({
  companyName: z.string().trim().min(1).max(200).optional(),
  companyId: z.string().uuid().optional()
})

inboxCandidatesRoutes.get('/', async (c) => {
  const organizationId = c.get('organization').id
  const parsed = listQuerySchema.safeParse({
    status: c.req.query('status') ?? undefined,
    limit: c.req.query('limit') ?? undefined,
    offset: c.req.query('offset') ?? undefined
  })
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400)
  const { status, limit, offset } = parsed.data

  const where =
    status === 'all'
      ? eq(externalEmailCandidates.organizationId, organizationId)
      : and(
          eq(externalEmailCandidates.organizationId, organizationId),
          eq(externalEmailCandidates.status, status)
        )

  const rows = await db
    .select({
      candidate: externalEmailCandidates,
      mailbox: {
        id: mailboxes.id,
        email: mailboxes.email,
        displayName: mailboxes.displayName
      }
    })
    .from(externalEmailCandidates)
    .leftJoin(mailboxes, eq(mailboxes.id, externalEmailCandidates.mailboxId))
    .where(where)
    .orderBy(desc(externalEmailCandidates.sentAt))
    .limit(limit)
    .offset(offset)

  return c.json({
    data: rows.map((r) => ({
      ...r.candidate,
      mailbox: r.mailbox?.id ? r.mailbox : null
    })),
    limit,
    offset
  })
})

inboxCandidatesRoutes.get('/counts', async (c) => {
  const organizationId = c.get('organization').id
  const counts = await db
    .select({
      status: externalEmailCandidates.status,
      count: sql<number>`count(*)::int`
    })
    .from(externalEmailCandidates)
    .where(eq(externalEmailCandidates.organizationId, organizationId))
    .groupBy(externalEmailCandidates.status)
  const out: Record<string, number> = { pending: 0, imported: 0, ignored: 0 }
  for (const r of counts) {
    out[r.status] = Number(r.count)
  }
  return c.json(out)
})

inboxCandidatesRoutes.post('/scan', async (c) => {
  const organizationId = c.get('organization').id
  const raw = await c.req.json().catch(() => ({}))
  const parsed = scanBodySchema.safeParse(raw)
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400)
  const { mailboxId } = parsed.data ?? {}

  const results = await withUsageContext({ organizationId }, async () => {
    if (mailboxId) {
      const result = await scanMailboxForSentIntros(mailboxId, organizationId)
      return [result] as MailboxScanResult[]
    }
    return scanAllActiveMailboxesForOrg(organizationId)
  })

  const summary = {
    mailboxesScanned: results.length,
    scanned: results.reduce((s, r) => s + r.scanned, 0),
    candidates: results.reduce((s, r) => s + r.candidates, 0),
    skipped: results.reduce((s, r) => s + r.skipped, 0),
    errors: results.reduce((s, r) => s + r.errors, 0),
    results
  }
  return c.json(summary)
})

inboxCandidatesRoutes.post('/:id/ignore', async (c) => {
  const id = c.req.param('id')
  const organizationId = c.get('organization').id
  const [existing] = await db
    .select()
    .from(externalEmailCandidates)
    .where(
      and(
        eq(externalEmailCandidates.id, id),
        eq(externalEmailCandidates.organizationId, organizationId)
      )
    )
    .limit(1)
  if (!existing) return c.json({ error: 'not found' }, 404)
  const [row] = await db
    .update(externalEmailCandidates)
    .set({ status: 'ignored', updatedAt: new Date() })
    .where(eq(externalEmailCandidates.id, id))
    .returning()
  return c.json(row)
})

inboxCandidatesRoutes.post('/:id/import', async (c) => {
  const id = c.req.param('id')
  const organizationId = c.get('organization').id
  const raw = await c.req.json().catch(() => ({}))
  const parsed = importBodySchema.safeParse(raw)
  if (!parsed.success) return c.json({ error: parsed.error.flatten() }, 400)

  const [existing] = await db
    .select()
    .from(externalEmailCandidates)
    .where(
      and(
        eq(externalEmailCandidates.id, id),
        eq(externalEmailCandidates.organizationId, organizationId)
      )
    )
    .limit(1)
  if (!existing) return c.json({ error: 'not found' }, 404)
  if (existing.status === 'imported') {
    return c.json({ error: 'candidate already imported' }, 409)
  }
  if (!existing.toEmail) {
    return c.json({ error: 'candidate has no recipient email' }, 422)
  }

  const recipient = normalizeEmail(existing.toEmail) ?? existing.toEmail.trim().toLowerCase()
  const recipientDomain = normalizeDomain(recipient.split('@')[1] ?? null)

  let companyId = parsed.data.companyId ?? null
  if (companyId) {
    const [c1] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(and(eq(companies.id, companyId), eq(companies.organizationId, organizationId)))
      .limit(1)
    if (!c1) return c.json({ error: 'company not found' }, 400)
  } else if (recipientDomain) {
    const [byDomain] = await db
      .select({ id: companies.id })
      .from(companies)
      .where(
        and(
          eq(companies.organizationId, organizationId),
          eq(companies.domain, recipientDomain)
        )
      )
      .limit(1)
    if (byDomain) {
      companyId = byDomain.id
    } else {
      const name =
        parsed.data.companyName?.trim() ||
        deriveCompanyName(recipientDomain)
      const [created] = await db
        .insert(companies)
        .values({
          organizationId,
          name,
          domain: recipientDomain,
          website: 'https://' + recipientDomain,
          notes: 'Imported from external email candidate ' + id + '.'
        })
        .returning({ id: companies.id })
      companyId = created.id
    }
  } else {
    return c.json({ error: 'cannot derive company without a valid recipient domain' }, 422)
  }

  let personId: string | null = null
  if (recipient && companyId) {
    const [p1] = await db
      .select({ id: people.id })
      .from(people)
      .where(and(eq(people.organizationId, organizationId), eq(people.email, recipient)))
      .limit(1)
    if (p1) {
      personId = p1.id
    } else {
      const [created] = await db
        .insert(people)
        .values({
          organizationId,
          companyId,
          fullName: existing.toEmail.split('@')[0],
          email: recipient,
          lifecycleStatus: 'contacted',
          context: 'Auto-created from imported external email candidate.',
          lastSeenAt: existing.sentAt ?? new Date()
        })
        .returning({ id: people.id })
      personId = created.id
    }
  }

  const [draft] = await db
    .insert(outreachDrafts)
    .values({
      organizationId,
      channel: 'email',
      companyId,
      mailboxId: existing.mailboxId,
      personId,
      toEmail: existing.toEmail,
      subject: existing.subject ?? '(no subject)',
      body: existing.bodyPreview ?? '',
      status: 'sent',
      sentAt: existing.sentAt ?? new Date(),
      gmailMessageId: existing.gmailMessageId,
      gmailThreadId: existing.gmailThreadId,
      agentRationale:
        'Imported from external email candidate. Classification: ' +
        existing.classification +
        '. ' +
        (existing.rationale ?? '')
    })
    .returning()

  if (companyId) {
    await db.insert(outreachEvents).values({
      organizationId,
      companyId,
      kind: 'email_sent',
      summary:
        'Imported external email send to ' +
        (existing.toEmail ?? '(unknown)') +
        ': ' +
        (existing.subject ?? '(no subject)'),
      details: {
        draftId: draft.id,
        candidateId: existing.id,
        gmailMessageId: existing.gmailMessageId,
        gmailThreadId: existing.gmailThreadId,
        classification: existing.classification,
        confidence: existing.confidence
      }
    })
  }

  const [updatedCandidate] = await db
    .update(externalEmailCandidates)
    .set({
      status: 'imported',
      importedDraftId: draft.id,
      updatedAt: new Date()
    })
    .where(eq(externalEmailCandidates.id, id))
    .returning()

  return c.json({
    candidate: updatedCandidate,
    draft,
    companyId,
    personId
  })
})

function deriveCompanyName(domain: string): string {
  const base = domain.split('.')[0]
  if (!base) return domain
  return base.charAt(0).toUpperCase() + base.slice(1)
}
