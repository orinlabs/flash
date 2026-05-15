import 'dotenv/config'

import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { sql } from 'drizzle-orm'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import path from 'node:path'

import { db, pool } from './db/client.js'
import { campaignsRoutes } from './routes/campaigns.js'
import { companiesRoutes } from './routes/companies.js'
import { draftsRoutes } from './routes/drafts.js'
import { mailboxesRoutes } from './routes/mailboxes.js'
import { peopleRoutes } from './routes/people.js'
import { usageRoutes } from './routes/usage.js'

const app = new Hono()

app.use('*', cors())

app.get('/health', (c) => c.json({ ok: true, service: 'icp-prospector-api' }))

app.get('/ready', async (c) => {
  if (!process.env.DATABASE_URL) {
    return c.json({ ok: false, reason: 'DATABASE_URL not set' }, 503)
  }
  try {
    await db.execute(sql`select 1`)
    return c.json({ ok: true, database: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'unknown error'
    return c.json({ ok: false, database: false, message }, 503)
  }
})

app.route('/campaigns', campaignsRoutes)
app.route('/companies', companiesRoutes)
app.route('/drafts', draftsRoutes)
app.route('/mailboxes', mailboxesRoutes)
app.route('/people', peopleRoutes)
app.route('/usage', usageRoutes)

async function runMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.warn('Skipping migrations: DATABASE_URL not set')
    return
  }
  const folder = path.join(process.cwd(), 'drizzle')
  await migrate(db, { migrationsFolder: folder })
  console.log('Migrations applied from', folder)
}

const port = Number(process.env.PORT) || 3000

runMigrations()
  .then(() => {
    serve({ fetch: app.fetch, port })
    console.log(`API listening on ${port}`)
  })
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })

const shutdown = async () => {
  await pool.end()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
