import 'dotenv/config'

import { pool } from '../db/client.js'
import { runMigrations } from '../db/migrate.js'

async function main(): Promise<void> {
  await runMigrations()
}

main()
  .then(async () => {
    await pool.end()
    process.exit(0)
  })
  .catch(async (err) => {
    console.error(err)
    await pool.end().catch(() => {})
    process.exit(1)
  })
