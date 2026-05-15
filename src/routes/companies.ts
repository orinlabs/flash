import { desc, eq } from 'drizzle-orm'
import { Hono } from 'hono'
import { z } from 'zod'

import { db } from '../db/client.js'
import { companies } from '../db/schema.js'

const createCompany = z.object({
  name: z.string().min(1),
  domain: z.string().optional(),
  website: z.string().optional(),
  industry: z.string().optional(),
  employeeRange: z.string().optional(),
  hqLocation: z.string().optional()
})

export const companiesRoutes = new Hono()

companiesRoutes.get('/', async (c) => {
  const rows = await db.select().from(companies).orderBy(desc(companies.createdAt))
  return c.json(rows)
})

companiesRoutes.post('/', async (c) => {
  const parsed = createCompany.safeParse(await c.req.json())
  if (!parsed.success) {
    return c.json({ error: parsed.error.flatten() }, 400)
  }
  const body = parsed.data
  const [row] = await db
    .insert(companies)
    .values({
      name: body.name,
      domain: body.domain,
      website: body.website,
      industry: body.industry,
      employeeRange: body.employeeRange,
      hqLocation: body.hqLocation
    })
    .returning()
  return c.json(row, 201)
})

companiesRoutes.get('/:id', async (c) => {
  const id = c.req.param('id')
  const [row] = await db.select().from(companies).where(eq(companies.id, id))
  if (!row) {
    return c.json({ error: 'not found' }, 404)
  }
  return c.json(row)
})
