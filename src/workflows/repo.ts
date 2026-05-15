import { and, desc, eq, ilike, or, sql } from 'drizzle-orm'

import { db } from '../db/client.js'
import { campaignRuns, campaigns, companies, discoveryEvents, people } from '../db/schema.js'
import { EXA_CONTENTS_COST_USD, EXA_SEARCH_COST_USD } from '../lib/pricing.js'
import { recordUsageEvent } from '../lib/usage.js'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type DbError = { code?: string }

export function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required for prospecting workflows`)
  }
  return value
}

export function cleanNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

export function normalizeDomain(value: string | null | undefined): string | null {
  const cleaned = cleanNullable(value)
  if (!cleaned) return null
  return cleaned
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .toLowerCase()
}

export function normalizeUrl(value: string | null | undefined): string | null {
  const cleaned = cleanNullable(value)
  if (!cleaned) return null
  if (/^https?:\/\//i.test(cleaned)) return cleaned
  return `https://${cleaned}`
}

export function normalizeProfileUrl(
  value: string | null | undefined,
  host: string
): string | null {
  const url = normalizeUrl(value)
  if (!url) return null
  try {
    const parsed = new URL(url)
    if (!parsed.hostname.toLowerCase().endsWith(host)) return null
    parsed.search = ''
    parsed.hash = ''
    return parsed.toString().replace(/\/$/, '')
  } catch {
    return null
  }
}

export function normalizeEmail(value: string | null | undefined): string | null {
  const email = cleanNullable(value)?.toLowerCase()
  return email && EMAIL_RE.test(email) ? email : null
}

export function normalizeName(value: string | null | undefined): string | null {
  const cleaned = cleanNullable(value)
  return cleaned ? cleaned.toLowerCase() : null
}

function mergeNotes(existing: string | null | undefined, incoming: string | null | undefined): string | undefined {
  const next = cleanNullable(incoming)
  if (!next) return undefined
  const cur = cleanNullable(existing)
  if (!cur) return next
  if (cur.includes(next)) return undefined
  return `${cur}\n\n${next}`
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as DbError).code === '23505'
}

// ---------- Exa search ----------

const EXA_SEARCH_URL = 'https://api.exa.ai/search'
const EXA_CONTENTS_URL = 'https://api.exa.ai/contents'

export type ExaResult = {
  title: string | null
  url: string
  summary: string | null
  highlights: string[]
  text: string | null
}

export async function exaSearch(query: string, numResults: number): Promise<ExaResult[]> {
  const res = await fetch(EXA_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': requiredEnv('EXA_API_KEY')
    },
    body: JSON.stringify({
      query,
      type: 'auto',
      numResults,
      contents: {
        summary: { query: 'who is this about and what do they do' },
        highlights: { numSentences: 2, highlightsPerUrl: 2 }
      }
    })
  })

  if (!res.ok) {
    throw new Error(`Exa search failed (${res.status}): ${await res.text()}`)
  }

  const payload = (await res.json()) as {
    results?: Array<{
      title?: string | null
      url?: string
      summary?: string | null
      highlights?: string[]
      text?: string | null
    }>
  }

  const mapped = (payload.results ?? [])
    .filter((r) => r.url)
    .map((r) => ({
      title: r.title ?? null,
      url: r.url as string,
      summary: r.summary ?? null,
      highlights: r.highlights ?? [],
      text: r.text ?? null
    }))

  await recordUsageEvent({
    provider: 'exa',
    operation: 'search',
    units: mapped.length,
    costUsd: EXA_SEARCH_COST_USD,
    estimated: true,
    metadata: { query, requestedNumResults: numResults }
  })

  return mapped
}

export async function exaFetchUrl(url: string): Promise<{ text: string | null; title: string | null }> {
  const res = await fetch(EXA_CONTENTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': requiredEnv('EXA_API_KEY')
    },
    body: JSON.stringify({
      urls: [url],
      text: { maxCharacters: 4000 }
    })
  })
  if (!res.ok) {
    throw new Error(`Exa contents failed (${res.status}): ${await res.text()}`)
  }
  const payload = (await res.json()) as {
    results?: Array<{ title?: string | null; text?: string | null }>
  }
  const first = payload.results?.[0]

  await recordUsageEvent({
    provider: 'exa',
    operation: 'contents',
    units: 1,
    costUsd: EXA_CONTENTS_COST_USD,
    estimated: true,
    metadata: { url }
  })

  return { title: first?.title ?? null, text: first?.text ?? null }
}

// ---------- People search/get ----------

export type PersonSummary = {
  id: string
  fullName: string | null
  title: string | null
  email: string | null
  linkedinUrl: string | null
  companyId: string | null
  companyName: string | null
}

export async function searchPeople(input: {
  query?: string | null
  companyName?: string | null
  campaignId?: string | null
  campaignOnly?: boolean
  limit?: number
  offset?: number
}): Promise<{ rows: PersonSummary[]; total: number }> {
  const limit = Math.min(50, Math.max(1, input.limit ?? 20))
  const offset = Math.max(0, input.offset ?? 0)

  const filters = []
  const q = cleanNullable(input.query)
  if (q) {
    const like = `%${q}%`
    filters.push(
      or(
        ilike(people.fullName, like),
        ilike(people.title, like),
        ilike(people.context, like),
        ilike(people.notes, like)
      )
    )
  }
  const companyName = cleanNullable(input.companyName)
  if (companyName) {
    filters.push(
      sql`exists (select 1 from ${companies} where ${companies.id} = ${people.companyId} and lower(${companies.name}) like ${'%' + companyName.toLowerCase() + '%'})`
    )
  }
  if (input.campaignOnly && input.campaignId) {
    filters.push(
      sql`exists (select 1 from ${discoveryEvents} where ${discoveryEvents.personId} = ${people.id} and ${discoveryEvents.campaignId} = ${input.campaignId})`
    )
  }
  const where = filters.length ? and(...filters) : undefined

  const rows = await db
    .select({
      id: people.id,
      fullName: people.fullName,
      title: people.title,
      email: people.email,
      linkedinUrl: people.linkedinUrl,
      companyId: people.companyId,
      companyName: companies.name
    })
    .from(people)
    .leftJoin(companies, eq(companies.id, people.companyId))
    .where(where)
    .orderBy(desc(people.createdAt))
    .limit(limit)
    .offset(offset)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(people)
    .where(where)

  return { rows, total: Number(count) }
}

export async function getPerson(id: string) {
  const [row] = await db
    .select()
    .from(people)
    .leftJoin(companies, eq(companies.id, people.companyId))
    .where(eq(people.id, id))
    .limit(1)
  if (!row) return null
  return {
    ...row.people,
    company: row.companies ?? null
  }
}

// ---------- Company search/get ----------

export type CompanySummary = {
  id: string
  name: string
  domain: string | null
  website: string | null
  industry: string | null
  notes: string | null
}

export async function searchCompanies(input: {
  query?: string | null
  limit?: number
  offset?: number
}): Promise<{ rows: CompanySummary[]; total: number }> {
  const limit = Math.min(50, Math.max(1, input.limit ?? 20))
  const offset = Math.max(0, input.offset ?? 0)

  const filters = []
  const q = cleanNullable(input.query)
  if (q) {
    const like = `%${q}%`
    filters.push(or(ilike(companies.name, like), ilike(companies.domain, like), ilike(companies.notes, like)))
  }
  const where = filters.length ? and(...filters) : undefined

  const rows = await db
    .select({
      id: companies.id,
      name: companies.name,
      domain: companies.domain,
      website: companies.website,
      industry: companies.industry,
      notes: companies.notes
    })
    .from(companies)
    .where(where)
    .orderBy(desc(companies.createdAt))
    .limit(limit)
    .offset(offset)

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(companies)
    .where(where)

  return { rows, total: Number(count) }
}

export async function getCompany(id: string) {
  const [row] = await db.select().from(companies).where(eq(companies.id, id)).limit(1)
  return row ?? null
}

export async function appendCompanyNotes(companyId: string, notes: string | null | undefined): Promise<void> {
  const next = cleanNullable(notes)
  if (!next) return
  const [existing] = await db
    .select({ notes: companies.notes })
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1)
  const merged = mergeNotes(existing?.notes, next)
  if (!merged) return
  await db
    .update(companies)
    .set({ notes: merged, updatedAt: new Date() })
    .where(eq(companies.id, companyId))
}

export async function getPersonCompanyId(personId: string): Promise<string | null> {
  const [row] = await db
    .select({ companyId: people.companyId })
    .from(people)
    .where(eq(people.id, personId))
    .limit(1)
  return row?.companyId ?? null
}

// ---------- Upsert helpers ----------

export type CompanyDraft = {
  name: string
  domain?: string | null
  website?: string | null
  industry?: string | null
  hqLocation?: string | null
  notes?: string | null
}

export async function upsertCompany(draft: CompanyDraft): Promise<string | null> {
  const name = cleanNullable(draft.name)
  if (!name) return null

  const domain = normalizeDomain(draft.domain ?? draft.website)
  const website = normalizeUrl(draft.website ?? domain)

  if (domain) {
    const [existing] = await db
      .select()
      .from(companies)
      .where(sql`lower(trim(${companies.domain})) = ${domain}`)
      .limit(1)
    if (existing) {
      const notes = mergeNotes(existing.notes, draft.notes)
      const [updated] = await db
        .update(companies)
        .set({
          website: existing.website ?? website ?? undefined,
          industry: existing.industry ?? cleanNullable(draft.industry) ?? undefined,
          hqLocation: existing.hqLocation ?? cleanNullable(draft.hqLocation) ?? undefined,
          notes,
          updatedAt: new Date()
        })
        .where(eq(companies.id, existing.id))
        .returning()
      return updated.id
    }
  }

  const [byName] = await db
    .select()
    .from(companies)
    .where(sql`lower(trim(${companies.name})) = ${name.toLowerCase()}`)
    .limit(1)
  if (byName) {
    const notes = mergeNotes(byName.notes, draft.notes)
    if ((!byName.website && website) || (!byName.domain && domain) || notes) {
      const [updated] = await db
        .update(companies)
        .set({
          website: byName.website ?? website ?? undefined,
          domain: byName.domain ?? domain ?? undefined,
          notes,
          updatedAt: new Date()
        })
        .where(eq(companies.id, byName.id))
        .returning()
      return updated.id
    }
    return byName.id
  }

  if (!website) {
    return null
  }

  try {
    const [created] = await db
      .insert(companies)
      .values({
        name,
        domain: domain ?? undefined,
        website,
        industry: cleanNullable(draft.industry) ?? undefined,
        hqLocation: cleanNullable(draft.hqLocation) ?? undefined,
        notes: cleanNullable(draft.notes) ?? undefined,
        enrichmentPayload: { source: 'agent_creation' }
      })
      .returning()
    return created.id
  } catch (err) {
    if (!isUniqueViolation(err)) throw err
    const [existing] = await db
      .select()
      .from(companies)
      .where(
        domain
          ? sql`lower(trim(${companies.domain})) = ${domain}`
          : sql`lower(trim(${companies.name})) = ${name.toLowerCase()}`
      )
      .limit(1)
    if (existing) return existing.id
    throw err
  }
}

export type PersonDraft = {
  fullName: string
  title?: string | null
  seniority?: string | null
  department?: string | null
  email?: string | null
  phone?: string | null
  linkedinUrl?: string | null
  twitterUrl?: string | null
  notes?: string | null
  context: string
  icpKeywords?: string[] | null
}

export type UpsertPersonResult =
  | { ok: true; personId: string; created: boolean }
  | { ok: false; reason: 'duplicate'; personId: string }
  | { ok: false; reason: 'invalid'; message: string }

export async function upsertPerson(
  draft: PersonDraft,
  campaignId: string,
  companyId: string
): Promise<UpsertPersonResult> {
  const fullName = cleanNullable(draft.fullName)
  if (!fullName) {
    return { ok: false, reason: 'invalid', message: 'fullName required' }
  }

  const email = normalizeEmail(draft.email)
  const linkedinUrl = normalizeProfileUrl(draft.linkedinUrl, 'linkedin.com')
  const twitterUrl =
    normalizeProfileUrl(draft.twitterUrl, 'twitter.com') ??
    normalizeProfileUrl(draft.twitterUrl, 'x.com')
  const nameNormalized = normalizeName(fullName)

  // Existing detection
  if (email) {
    const [existing] = await db
      .select()
      .from(people)
      .where(sql`lower(trim(${people.email})) = ${email}`)
      .limit(1)
    if (existing) return { ok: false, reason: 'duplicate', personId: existing.id }
  }
  if (linkedinUrl) {
    const [existing] = await db
      .select()
      .from(people)
      .where(eq(people.linkedinUrl, linkedinUrl))
      .limit(1)
    if (existing) return { ok: false, reason: 'duplicate', personId: existing.id }
  }
  if (nameNormalized) {
    const [existing] = await db
      .select()
      .from(people)
      .where(and(eq(people.companyId, companyId), eq(people.nameNormalized, nameNormalized)))
      .limit(1)
    if (existing) return { ok: false, reason: 'duplicate', personId: existing.id }
  }

  try {
    const [created] = await db
      .insert(people)
      .values({
        companyId,
        fullName,
        nameNormalized: nameNormalized ?? undefined,
        email: email ?? undefined,
        phone: cleanNullable(draft.phone) ?? undefined,
        linkedinUrl: linkedinUrl ?? undefined,
        twitterUrl: twitterUrl ?? undefined,
        title: cleanNullable(draft.title) ?? undefined,
        seniority: cleanNullable(draft.seniority) ?? undefined,
        department: cleanNullable(draft.department) ?? undefined,
        notes: cleanNullable(draft.notes) ?? undefined,
        context: cleanNullable(draft.context) ?? undefined,
        icpKeywords: draft.icpKeywords ?? undefined,
        lifecycleStatus: 'researched',
        firstSeenCampaignId: campaignId,
        lastSeenAt: new Date()
      })
      .returning()
    return { ok: true, personId: created.id, created: true }
  } catch (err) {
    if (!isUniqueViolation(err)) throw err
    // Re-detect after race
    if (email) {
      const [existing] = await db
        .select()
        .from(people)
        .where(sql`lower(trim(${people.email})) = ${email}`)
        .limit(1)
      if (existing) return { ok: false, reason: 'duplicate', personId: existing.id }
    }
    if (linkedinUrl) {
      const [existing] = await db
        .select()
        .from(people)
        .where(eq(people.linkedinUrl, linkedinUrl))
        .limit(1)
      if (existing) return { ok: false, reason: 'duplicate', personId: existing.id }
    }
    throw err
  }
}

export async function recordDiscoveryEvent(input: {
  campaignId: string
  campaignRunId: string
  personId: string
  sourceQuery: string
  sourceUrl: string | null
  metadata?: Record<string, unknown>
}): Promise<void> {
  const sourceUrl = normalizeUrl(input.sourceUrl)
  const [existing] = await db
    .select({ id: discoveryEvents.id })
    .from(discoveryEvents)
    .where(
      and(
        eq(discoveryEvents.campaignId, input.campaignId),
        eq(discoveryEvents.personId, input.personId),
        eq(discoveryEvents.sourceType, 'agent'),
        eq(discoveryEvents.sourceQuery, input.sourceQuery),
        sourceUrl
          ? eq(discoveryEvents.sourceUrl, sourceUrl)
          : sql`${discoveryEvents.sourceUrl} is null`
      )
    )
    .limit(1)
  if (existing) return

  await db.insert(discoveryEvents).values({
    campaignId: input.campaignId,
    personId: input.personId,
    sourceType: 'agent',
    sourceQuery: input.sourceQuery,
    sourceUrl: sourceUrl ?? undefined,
    metadata: {
      ...input.metadata,
      campaignRunId: input.campaignRunId
    }
  })
}

// ---------- Campaign run helpers ----------

export async function getCampaignRunWithCampaign(campaignRunId: string) {
  const [row] = await db
    .select({
      run: campaignRuns,
      campaign: campaigns
    })
    .from(campaignRuns)
    .innerJoin(campaigns, eq(campaigns.id, campaignRuns.campaignId))
    .where(eq(campaignRuns.id, campaignRunId))
    .limit(1)
  return row ?? null
}

export async function getCampaignDiscoveredPersonIds(campaignId: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ personId: discoveryEvents.personId })
    .from(discoveryEvents)
    .where(eq(discoveryEvents.campaignId, campaignId))
  return rows.map((r) => r.personId).filter((id): id is string => Boolean(id))
}

export async function updateRunCheckpoint(
  campaignRunId: string,
  patch: { status?: string; qualifiedCount?: number; checkpoint?: Record<string, unknown>; lastError?: string | null }
): Promise<void> {
  await db
    .update(campaignRuns)
    .set({
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.qualifiedCount !== undefined ? { qualifiedCount: patch.qualifiedCount } : {}),
      ...(patch.checkpoint !== undefined ? { checkpoint: patch.checkpoint } : {}),
      ...(patch.lastError !== undefined ? { lastError: patch.lastError } : {}),
      updatedAt: new Date()
    })
    .where(eq(campaignRuns.id, campaignRunId))
}

export async function updateCampaignStatusIfRunning(
  campaignId: string,
  nextStatus: string
): Promise<void> {
  await db
    .update(campaigns)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(
      and(eq(campaigns.id, campaignId), sql`${campaigns.status} in ('running', 'failed')`)
    )
}

export async function markRunFailed(campaignRunId: string, message: string): Promise<void> {
  const [run] = await db.select().from(campaignRuns).where(eq(campaignRuns.id, campaignRunId))
  await db
    .update(campaignRuns)
    .set({
      status: 'failed',
      lastError: message,
      checkpoint: { phase: 'failed', message },
      updatedAt: new Date()
    })
    .where(eq(campaignRuns.id, campaignRunId))
  if (run) {
    await updateCampaignStatusIfRunning(run.campaignId, 'failed')
  }
}
