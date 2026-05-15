import 'dotenv/config'

import path from 'node:path'

import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { startTaskServer } from '@renderinc/sdk/workflows'

import { db, pool } from '../db/client.js'
import './tasks.js'

async function main(): Promise<void> {
  if (process.env.DATABASE_URL) {
    const migrationsFolder = path.join(process.cwd(), 'drizzle')
    await migrate(db, { migrationsFolder })
    console.log('Workflow worker: migrations applied')
  } else {
    console.warn('Workflow worker: DATABASE_URL missing, skipping migrations')
  }

  await startTaskServer()
}

main().catch(async (err) => {
  console.error(err)
  await pool.end().catch(() => {})
  process.exit(1)
})
