import { and, eq, sql } from 'drizzle-orm'
import { task } from '@renderinc/sdk/workflows'

import { db } from '../db/client.js'
import { campaignRuns, campaigns, companies, discoveryEvents, people } from '../db/schema.js'

type ExaResult = {
  title?: string
  url?: string
  text?: string
  summary?: string
  highlights?: string[]
}

type ProspectCandidate = {
  fullName: string | null
  title: string | null
  seniority: string | null
  department: string | null
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  twitterUrl: string | null
  companyName: string
  companyDomain: string | null
  companyWebsite: string | null
  industry: string | null
  hqLocation: string | null
  context: string
  notes: string
  icpKeywords: string[]
  sourceUrl: string | null
}

type ExtractionResponse = {
  candidates: ProspectCandidate[]
}

type UpsertResult = {
  personId: string
  created: boolean
}

type DbError = {
  code?: string
}

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const EXA_SEARCH_URL = 'https://api.exa.ai/search'
const DEFAULT_OPENROUTER_MODEL = 'openai/gpt-5-mini'
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function requiredEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`${name} is required for prospecting workflows`)
  }
  return value
}

function cleanNullable(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normalizeDomain(value: string | null | undefined): string | null {
  const cleaned = cleanNullable(value)
  if (!cleaned) return null
  return cleaned
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .split('/')[0]
    .toLowerCase()
}

function normalizeUrl(value: string | null | undefined): string | null {
  const cleaned = cleanNullable(value)
  if (!cleaned) return null
  if (/^https?:\/\//i.test(cleaned)) return cleaned
  return `https://${cleaned}`
}

function normalizeProfileUrl(value: string | null | undefined, host: string): string | null {
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

function normalizeEmail(value: string | null | undefined): string | null {
  const email = cleanNullable(value)?.toLowerCase()
  return email && EMAIL_RE.test(email) ? email : null
}

function normalizeName(value: string | null | undefined): string | null {
  const cleaned = cleanNullable(value)
  return cleaned ? cleaned.toLowerCase() : null
}

function hasPersonIdentity(candidate: ProspectCandidate): boolean {
  return Boolean(
    cleanNullable(candidate.fullName) ||
      normalizeEmail(candidate.email) ||
      normalizeProfileUrl(candidate.linkedinUrl, 'linkedin.com')
  )
}

function mergeNotes(existing: string | null, next: string | null): string | undefined {
  if (!next) return existing ?? undefined
  if (!existing) return next
  if (existing.includes(next)) return existing
  return `${existing}\n\n${next}`
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as DbError).code === '23505'
}

function buildSearchQueries(icpDocument: string): string[] {
  const compactIcp = icpDocument.replace(/\s+/g, ' ').slice(0, 600)
  return [
    `${compactIcp} leadership operations executives companies`,
    `${compactIcp} LinkedIn VP operations director operations energy infrastructure`,
    `${compactIcp} project management operations heavy companies executives`,
    `${compactIcp} founders CEO COO operations infrastructure companies`
  ]
}

async function searchExa(query: string, numResults: number): Promise<ExaResult[]> {
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
        text: { maxCharacters: 1500 },
        highlights: { numSentences: 3, highlightsPerUrl: 2 }
      }
    })
  })

  if (!res.ok) {
    throw new Error(`Exa search failed (${res.status}): ${await res.text()}`)
  }

  const payload = (await res.json()) as { results?: ExaResult[] }
  return payload.results ?? []
}

function renderSearchResult(result: ExaResult): string {
  return [
    `Title: ${result.title ?? 'Untitled'}`,
    `URL: ${result.url ?? ''}`,
    result.summary ? `Summary: ${result.summary}` : '',
    result.highlights?.length ? `Highlights: ${result.highlights.join('\n')}` : '',
    result.text ? `Text: ${result.text.slice(0, 1800)}` : ''
  ]
    .filter(Boolean)
    .join('\n')
}

async function extractCandidates(
  campaignName: string,
  icpDocument: string,
  searchQuery: string,
  results: ExaResult[],
  maxCandidates: number
): Promise<ProspectCandidate[]> {
  if (results.length === 0) return []

  const model = process.env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${requiredEnv('OPENROUTER_API_KEY')}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://icp-prospector-web.onrender.com',
      'X-Title': 'ICP Prospector'
    },
    body: JSON.stringify({
      model,
      require_parameters: true,
      temperature: 0.1,
      messages: [
        {
          role: 'system',
          content:
            'Extract real B2B prospect people and companies from search results. Only include people that are explicitly named or strongly evidenced. Contact fields may be null; do not invent emails, phones, or LinkedIn URLs.'
        },
        {
          role: 'user',
          content: [
            `Campaign: ${campaignName}`,
            `ICP:\n${icpDocument}`,
            `Search query: ${searchQuery}`,
            `Return at most ${maxCandidates} high-fit candidates.`,
            'Search results:',
            results.map(renderSearchResult).join('\n\n---\n\n')
          ].join('\n\n')
        }
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'prospect_candidates',
          strict: true,
          schema: {
            type: 'object',
            additionalProperties: false,
            required: ['candidates'],
            properties: {
              candidates: {
                type: 'array',
                maxItems: maxCandidates,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: [
                    'fullName',
                    'title',
                    'seniority',
                    'department',
                    'email',
                    'phone',
                    'linkedinUrl',
                    'twitterUrl',
                    'companyName',
                    'companyDomain',
                    'companyWebsite',
                    'industry',
                    'hqLocation',
                    'context',
                    'notes',
                    'icpKeywords',
                    'sourceUrl'
                  ],
                  properties: {
                    fullName: { type: ['string', 'null'] },
                    title: { type: ['string', 'null'] },
                    seniority: { type: ['string', 'null'] },
                    department: { type: ['string', 'null'] },
                    email: { type: ['string', 'null'] },
                    phone: { type: ['string', 'null'] },
                    linkedinUrl: { type: ['string', 'null'] },
                    twitterUrl: { type: ['string', 'null'] },
                    companyName: { type: 'string' },
                    companyDomain: { type: ['string', 'null'] },
                    companyWebsite: { type: ['string', 'null'] },
                    industry: { type: ['string', 'null'] },
                    hqLocation: { type: ['string', 'null'] },
                    context: { type: 'string' },
                    notes: { type: 'string' },
                    icpKeywords: { type: 'array', items: { type: 'string' }, maxItems: 12 },
                    sourceUrl: { type: ['string', 'null'] }
                  }
                }
              }
            }
          }
        }
      }
    })
  })

  if (!res.ok) {
    throw new Error(`OpenRouter extraction failed (${res.status}): ${await res.text()}`)
  }

  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string; refusal?: string } }>
  }
  const message = payload.choices?.[0]?.message
  if (message?.refusal) {
    throw new Error(`OpenRouter refused extraction: ${message.refusal}`)
  }
  if (!message?.content) return []

  let extraction: ExtractionResponse
  try {
    extraction = JSON.parse(message.content) as ExtractionResponse
  } catch (err) {
    const messagePrefix = message.content.slice(0, 500)
    throw new Error(`OpenRouter returned malformed JSON: ${messagePrefix}`, { cause: err })
  }

  if (!Array.isArray(extraction.candidates)) {
    throw new Error('OpenRouter response did not include a candidates array')
  }

  return extraction.candidates.filter(
    (candidate) =>
      cleanNullable(candidate.companyName) && cleanNullable(candidate.context) && hasPersonIdentity(candidate)
  )
}

async function upsertCompany(candidate: ProspectCandidate): Promise<string> {
  const name = cleanNullable(candidate.companyName)
  if (!name) {
    throw new Error('candidate companyName is required')
  }

  const domain = normalizeDomain(candidate.companyDomain ?? candidate.companyWebsite)
  const website = normalizeUrl(candidate.companyWebsite ?? domain)

  if (domain) {
    const [existing] = await db
      .select()
      .from(companies)
      .where(sql`lower(trim(${companies.domain})) = ${domain}`)
      .limit(1)
    if (existing) {
      const [updated] = await db
        .update(companies)
        .set({
          website: existing.website ?? website ?? undefined,
          industry: existing.industry ?? cleanNullable(candidate.industry) ?? undefined,
          hqLocation: existing.hqLocation ?? cleanNullable(candidate.hqLocation) ?? undefined,
          updatedAt: new Date()
        })
        .where(eq(companies.id, existing.id))
        .returning()
      return updated.id
    }
  }

  const [byName] = await db.select().from(companies).where(eq(companies.name, name)).limit(1)
  if (byName) return byName.id

  try {
    const [created] = await db
      .insert(companies)
      .values({
        name,
        domain: domain ?? undefined,
        website: website ?? undefined,
        industry: cleanNullable(candidate.industry) ?? undefined,
        hqLocation: cleanNullable(candidate.hqLocation) ?? undefined,
        enrichmentPayload: { source: 'workflow_extraction' }
      })
      .returning()
    return created.id
  } catch (err) {
    if (!isUniqueViolation(err)) throw err
    const [existing] = await db
      .select()
      .from(companies)
      .where(domain ? sql`lower(trim(${companies.domain})) = ${domain}` : eq(companies.name, name))
      .limit(1)
    if (existing) return existing.id
    throw err
  }
}

async function findExistingPerson(candidate: ProspectCandidate, companyId: string) {
  const email = normalizeEmail(candidate.email)
  if (email) {
    const [existing] = await db
      .select()
      .from(people)
      .where(sql`lower(trim(${people.email})) = ${email}`)
      .limit(1)
    if (existing) return existing
  }

  const linkedinUrl = normalizeProfileUrl(candidate.linkedinUrl, 'linkedin.com')
  if (linkedinUrl) {
    const [existing] = await db
      .select()
      .from(people)
      .where(eq(people.linkedinUrl, linkedinUrl))
      .limit(1)
    if (existing) return existing
  }

  const nameNormalized = normalizeName(candidate.fullName)
  if (nameNormalized) {
    const [existing] = await db
      .select()
      .from(people)
      .where(and(eq(people.companyId, companyId), eq(people.nameNormalized, nameNormalized)))
      .limit(1)
    if (existing) return existing
  }

  return null
}

async function upsertPerson(
  candidate: ProspectCandidate,
  campaignId: string,
  companyId: string
): Promise<UpsertResult> {
  const email = normalizeEmail(candidate.email)
  const linkedinUrl = normalizeProfileUrl(candidate.linkedinUrl, 'linkedin.com')
  const twitterUrl =
    normalizeProfileUrl(candidate.twitterUrl, 'twitter.com') ??
    normalizeProfileUrl(candidate.twitterUrl, 'x.com')
  const nameNormalized = normalizeName(candidate.fullName)
  const existing = await findExistingPerson(candidate, companyId)

  if (existing) {
    const [updated] = await db
      .update(people)
      .set({
        companyId: existing.companyId ?? companyId,
        fullName: existing.fullName ?? cleanNullable(candidate.fullName) ?? undefined,
        nameNormalized: existing.nameNormalized ?? nameNormalized ?? undefined,
        email: existing.email ?? email ?? undefined,
        phone: existing.phone ?? cleanNullable(candidate.phone) ?? undefined,
        linkedinUrl: existing.linkedinUrl ?? linkedinUrl ?? undefined,
        twitterUrl: existing.twitterUrl ?? twitterUrl ?? undefined,
        title: existing.title ?? cleanNullable(candidate.title) ?? undefined,
        seniority: existing.seniority ?? cleanNullable(candidate.seniority) ?? undefined,
        department: existing.department ?? cleanNullable(candidate.department) ?? undefined,
        notes: mergeNotes(existing.notes, cleanNullable(candidate.notes)),
        context: existing.context ?? cleanNullable(candidate.context) ?? undefined,
        icpKeywords: existing.icpKeywords ?? candidate.icpKeywords,
        lastSeenAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(people.id, existing.id))
      .returning()
    return { personId: updated.id, created: false }
  }

  try {
    const [created] = await db
      .insert(people)
      .values({
        companyId,
        fullName: cleanNullable(candidate.fullName) ?? undefined,
        nameNormalized: nameNormalized ?? undefined,
        email: email ?? undefined,
        phone: cleanNullable(candidate.phone) ?? undefined,
        linkedinUrl: linkedinUrl ?? undefined,
        twitterUrl: twitterUrl ?? undefined,
        title: cleanNullable(candidate.title) ?? undefined,
        seniority: cleanNullable(candidate.seniority) ?? undefined,
        department: cleanNullable(candidate.department) ?? undefined,
        notes: cleanNullable(candidate.notes) ?? undefined,
        context: cleanNullable(candidate.context) ?? undefined,
        icpKeywords: candidate.icpKeywords,
        lifecycleStatus: 'researched',
        firstSeenCampaignId: campaignId,
        lastSeenAt: new Date()
      })
      .returning()

    return { personId: created.id, created: true }
  } catch (err) {
    if (!isUniqueViolation(err)) throw err
    const existingAfterConflict = await findExistingPerson(candidate, companyId)
    if (existingAfterConflict) {
      return { personId: existingAfterConflict.id, created: false }
    }
    throw err
  }
}

async function getDiscoveredPersonIds(campaignId: string): Promise<Set<string>> {
  const rows = await db
    .select({ personId: discoveryEvents.personId })
    .from(discoveryEvents)
    .where(eq(discoveryEvents.campaignId, campaignId))

  return new Set(
    rows.map((row) => row.personId).filter((personId): personId is string => Boolean(personId))
  )
}

async function insertDiscoveryEventOnce(
  campaignId: string,
  campaignRunId: string,
  personId: string,
  searchQuery: string,
  candidate: ProspectCandidate,
  created: boolean
): Promise<void> {
  const sourceUrl = normalizeUrl(candidate.sourceUrl)
  const [existing] = await db
    .select({ id: discoveryEvents.id })
    .from(discoveryEvents)
    .where(
      and(
        eq(discoveryEvents.campaignId, campaignId),
        eq(discoveryEvents.personId, personId),
        eq(discoveryEvents.sourceType, 'exa_openrouter'),
        eq(discoveryEvents.sourceQuery, searchQuery),
        sourceUrl ? eq(discoveryEvents.sourceUrl, sourceUrl) : sql`${discoveryEvents.sourceUrl} is null`
      )
    )
    .limit(1)

  if (existing) return

  await db.insert(discoveryEvents).values({
    campaignId,
    personId,
    sourceType: 'exa_openrouter',
    sourceQuery: searchQuery,
    sourceUrl: sourceUrl ?? undefined,
    metadata: {
      campaignRunId,
      created,
      model: process.env.OPENROUTER_MODEL ?? DEFAULT_OPENROUTER_MODEL,
      companyName: candidate.companyName,
      sourceUrl: candidate.sourceUrl
    }
  })
}

async function markRunFailed(campaignRunId: string, message: string): Promise<void> {
  const [run] = await db.select().from(campaignRuns).where(eq(campaignRuns.id, campaignRunId))
  await db
    .update(campaignRuns)
    .set({
      status: 'failed',
      lastError: message,
      checkpoint: { step: 'failed', message },
      updatedAt: new Date()
    })
    .where(eq(campaignRuns.id, campaignRunId))

  if (run) {
    await db
      .update(campaigns)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(and(eq(campaigns.id, run.campaignId), sql`${campaigns.status} in ('running', 'failed')`))
  }
}

export const prospectCampaign = task(
  {
    name: 'prospectCampaign',
    timeoutSeconds: 3600,
    retry: { maxRetries: 2, waitDurationMs: 2000, backoffScaling: 2 }
  },
  async function prospectCampaign(campaignRunId: string): Promise<{ qualifiedCount: number }> {
    try {
      return await runProspectCampaign(campaignRunId)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      await markRunFailed(campaignRunId, message)
      throw err
    }
  }
)

async function runProspectCampaign(campaignRunId: string): Promise<{ qualifiedCount: number }> {
  requiredEnv('DATABASE_URL')
  requiredEnv('EXA_API_KEY')
  requiredEnv('OPENROUTER_API_KEY')

  const [run] = await db.select().from(campaignRuns).where(eq(campaignRuns.id, campaignRunId))
  if (!run) {
    throw new Error(`campaign run not found: ${campaignRunId}`)
  }

  await db
    .update(campaignRuns)
    .set({ status: 'running', checkpoint: { step: 'searching' }, updatedAt: new Date() })
    .where(eq(campaignRuns.id, campaignRunId))

  const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, run.campaignId))
  if (!campaign) {
    throw new Error(`campaign missing for run ${campaignRunId}`)
  }

  const targetCount = Math.max(1, campaign.targetCount)
  const queries = buildSearchQueries(campaign.icpDocument)
  const discoveredPersonIds = await getDiscoveredPersonIds(campaign.id)
  let qualifiedCount = discoveredPersonIds.size
  let searchedQueries = 0

  for (const searchQuery of queries) {
    if (qualifiedCount >= targetCount) break

    searchedQueries += 1
    await db
      .update(campaignRuns)
      .set({
        checkpoint: { step: 'searching', searchQuery, qualifiedCount, searchedQueries },
        updatedAt: new Date()
      })
      .where(eq(campaignRuns.id, campaignRunId))

    const results = await searchExa(searchQuery, 5)
    const candidates = await extractCandidates(
      campaign.name,
      campaign.icpDocument,
      searchQuery,
      results,
      Math.min(8, targetCount - qualifiedCount + 3)
    )

    for (const candidate of candidates) {
      if (qualifiedCount >= targetCount) break

      const companyId = await upsertCompany(candidate)
      const upserted = await upsertPerson(candidate, campaign.id, companyId)

      await insertDiscoveryEventOnce(
        campaign.id,
        campaignRunId,
        upserted.personId,
        searchQuery,
        candidate,
        upserted.created
      )

      if (!discoveredPersonIds.has(upserted.personId)) {
        discoveredPersonIds.add(upserted.personId)
        qualifiedCount = discoveredPersonIds.size
      }
    }
  }

  const finalStatus = qualifiedCount >= targetCount ? 'succeeded' : 'partial'
  await db
    .update(campaignRuns)
    .set({
      status: finalStatus,
      qualifiedCount,
      checkpoint: {
        phase: 'prospecting',
        searchedQueries,
        targetCount,
        qualifiedCount,
        message:
          qualifiedCount >= targetCount ? 'Target reached' : 'Search budget exhausted before target was reached'
      },
      lastError: null,
      updatedAt: new Date()
    })
    .where(eq(campaignRuns.id, campaignRunId))

  await db
    .update(campaigns)
    .set({ status: finalStatus === 'succeeded' ? 'completed' : 'partial', updatedAt: new Date() })
    .where(and(eq(campaigns.id, campaign.id), sql`${campaigns.status} in ('running', 'failed')`))

  return { qualifiedCount }
}
