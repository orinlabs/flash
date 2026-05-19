import path from 'node:path'

import { migrate } from 'drizzle-orm/node-postgres/migrator'

import { db } from './client.js'

export async function runMigrations(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to run migrations')
  }
  const migrationsFolder = path.join(process.cwd(), 'drizzle')
  await migrate(db, { migrationsFolder })
  console.log('Migrations applied from', migrationsFolder)
}
