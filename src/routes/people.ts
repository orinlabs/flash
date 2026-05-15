import { and, desc, eq, isNotNull, isNull, SQL } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import { db } from '../db/client.js'
import { people } from '../db/schema.js'

const querySchema = z.object({
  has_email: z.enum(['true', 'false']).optional(),
  has_linkedin: z.enum(['true', 'false']).optional(),
  campaign_id: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0)
})

const createPerson = z.object({
  companyId: z.string().uuid().optional().nullable(),
  fullName: z.string().optional(),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  linkedinUrl: z.string().optional().nullable(),
  twitterUrl: z.string().optional().nullable(),
  title: z.string().optional().nullable(),
  seniority: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  context: z.string().optional().nullable(),
  firstSeenCampaignId: z.string().uuid().optional().nullable(),
  lifecycleStatus: z.string().optional()
})

export const peopleRoutes = new Hono()

peopleRoutes.get('/', async (c) => {
  const parsed = querySchema.safeParse({
    has_email: c.req.query('has_email') ?? undefined,
    has_linkedin: c.req.query('has_linkedin') ?? undefined,
    campaign_id: c.req.query('campaign_id') ?? undefined,
    limit: c.req.query('limit') ?? undefined,
    offset: c.req.query('offset') ?? undefined
  })
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400)
  }

  const { has_email, has_linkedin, campaign_id, limit, offset } = parsed.data

  const filters: SQL[] = []
  if (has_email === 'true') {
    filters.push(isNotNull(people.email))
  }
  if (has_email === 'false') {
    filters.push(isNull(people.email))
  }
  if (has_linkedin === 'true') {
    filters.push(isNotNull(people.linkedinUrl))
  }
  if (has_linkedin === 'false') {
    filters.push(isNull(people.linkedinUrl))
  }
  if (campaign_id) {
    filters.push(eq(people.firstSeenCampaignId, campaign_id))
  }

  const whereClause = filters.length > 0 ? and(...filters) : undefined

  const rows = await db
    .select()
    .from(people)
    .where(whereClause)
    .orderBy(desc(people.createdAt))
    .limit(limit)
    .offset(offset)

  return c.json({ data: rows, limit, offset })
})

peopleRoutes.post('/', async (c) => {
  const parsed = createPerson.safeParse(await c.req.json())
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400)
  }
  const b = parsed.data
  const nameNorm =
    b.fullName?.trim().length ? b.fullName.trim().toLowerCase() : null
  const [row] = await db
    .insert(people)
    .values({
      companyId: b.companyId ?? undefined,
      fullName: b.fullName,
      nameNormalized: nameNorm ?? undefined,
      email: b.email ?? undefined,
      phone: b.phone ?? undefined,
      linkedinUrl: b.linkedinUrl ?? undefined,
      twitterUrl: b.twitterUrl ?? undefined,
      title: b.title ?? undefined,
      seniority: b.seniority ?? undefined,
      department: b.department ?? undefined,
      notes: b.notes ?? undefined,
      context: b.context ?? undefined,
      firstSeenCampaignId: b.firstSeenCampaignId ?? undefined,
      lifecycleStatus: b.lifecycleStatus ?? 'new',
      lastSeenAt: new Date()
    })
    .returning()
  return c.json(row, 201)
})

peopleRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const [row] = await db.select().from(people).where(eq(people.id, id))
  if (!row) {
    return c.json({ error: 'not found' }, 404)
  }
  return c.json(row)
})
