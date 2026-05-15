import { sql } from 'drizzle-orm'
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid
} from 'drizzle-orm/pg-core'

export const companies = pgTable(
  'companies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    domain: text('domain'),
    website: text('website'),
    industry: text('industry'),
    employeeRange: text('employee_range'),
    hqLocation: text('hq_location'),
    enrichmentPayload: jsonb('enrichment_payload').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex('companies_domain_lower_unique')
      .on(sql`lower(trim(${t.domain}))`)
      .where(sql`${t.domain} is not null`),
    index('companies_name_idx').on(t.name)
  ]
)

export const campaigns = pgTable('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  icpDocument: text('icp_document').notNull(),
  targetCount: integer('target_count').notNull(),
  status: text('status').notNull().default('draft'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
})

export const people = pgTable(
  'people',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').references(() => companies.id, { onDelete: 'set null' }),
    fullName: text('full_name'),
    nameNormalized: text('name_normalized'),
    email: text('email'),
    phone: text('phone'),
    linkedinUrl: text('linkedin_url'),
    twitterUrl: text('twitter_url'),
    title: text('title'),
    seniority: text('seniority'),
    department: text('department'),
    notes: text('notes'),
    context: text('context'),
    icpKeywords: jsonb('icp_keywords').$type<string[]>(),
    enrichmentLastAttemptAt: timestamp('enrichment_last_attempt_at', { withTimezone: true }),
    enrichmentSources: jsonb('enrichment_sources').$type<Record<string, unknown>>(),
    lifecycleStatus: text('lifecycle_status').notNull().default('new'),
    firstSeenCampaignId: uuid('first_seen_campaign_id').references(() => campaigns.id, {
      onDelete: 'set null'
    }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    uniqueIndex('people_email_lower_unique')
      .on(sql`lower(trim(${t.email}))`)
      .where(sql`${t.email} is not null`),
    uniqueIndex('people_linkedin_url_unique')
      .on(t.linkedinUrl)
      .where(sql`${t.linkedinUrl} is not null`),
    index('people_company_idx').on(t.companyId),
    index('people_lifecycle_idx').on(t.lifecycleStatus),
    index('people_first_campaign_idx').on(t.firstSeenCampaignId)
  ]
)

export const campaignRuns = pgTable(
  'campaign_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('pending'),
    qualifiedCount: integer('qualified_count').notNull().default(0),
    checkpoint: jsonb('checkpoint').notNull().default({}).$type<Record<string, unknown>>(),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [index('campaign_runs_campaign_idx').on(t.campaignId), index('campaign_runs_status_idx').on(t.status)]
)

export const discoveryEvents = pgTable(
  'discovery_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id')
      .notNull()
      .references(() => campaigns.id, { onDelete: 'cascade' }),
    personId: uuid('person_id').references(() => people.id, { onDelete: 'set null' }),
    sourceType: text('source_type').notNull(),
    sourceQuery: text('source_query'),
    sourceUrl: text('source_url'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index('discovery_events_campaign_idx').on(t.campaignId),
    index('discovery_events_person_idx').on(t.personId)
  ]
)

export const usageEvents = pgTable(
  'usage_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: text('provider').notNull(),
    operation: text('operation').notNull(),
    model: text('model'),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    totalTokens: integer('total_tokens'),
    units: integer('units'),
    costUsd: numeric('cost_usd', { precision: 14, scale: 6 }),
    estimated: boolean('estimated').notNull().default(false),
    campaignId: uuid('campaign_id').references(() => campaigns.id, {
      onDelete: 'set null'
    }),
    campaignRunId: uuid('campaign_run_id').references(() => campaignRuns.id, {
      onDelete: 'set null'
    }),
    companyId: uuid('company_id').references(() => companies.id, {
      onDelete: 'set null'
    }),
    personId: uuid('person_id').references(() => people.id, { onDelete: 'set null' }),
    slotIndex: integer('slot_index'),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
  },
  (t) => [
    index('usage_events_campaign_idx').on(t.campaignId),
    index('usage_events_run_idx').on(t.campaignRunId),
    index('usage_events_company_idx').on(t.companyId),
    index('usage_events_person_idx').on(t.personId),
    index('usage_events_provider_idx').on(t.provider),
    index('usage_events_created_idx').on(t.createdAt)
  ]
)

export type Company = typeof companies.$inferSelect
export type Person = typeof people.$inferSelect
export type Campaign = typeof campaigns.$inferSelect
export type CampaignRun = typeof campaignRuns.$inferSelect
export type DiscoveryEvent = typeof discoveryEvents.$inferSelect
export type UsageEvent = typeof usageEvents.$inferSelect
