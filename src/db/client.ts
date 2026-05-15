import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'

import * as schema from './schema.js'

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: Number(process.env.PG_POOL_MAX ?? 8),
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000
})

export const db = drizzle(pool, { schema })

export { pool }

export async function closeDb(): Promise<void> {
  await pool.end()
}
