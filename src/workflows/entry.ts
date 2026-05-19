import 'dotenv/config'

import { startTaskServer } from '@renderinc/sdk/workflows'

import { pool } from '../db/client.js'
import { runMigrations } from '../db/migrate.js'
import './tasks.js'

async function main(): Promise<void> {
  if (process.env.DATABASE_URL) {
    await runMigrations()
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
