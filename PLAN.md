# ICP Prospector — Product & Technical Plan

This document breaks the vision into phases, proposes a data model and system shape, and records **locked decisions** plus a small set of optional follow-ups.

---

## Locked decisions (from you)

- **Solo use**: Single operator; no multi-tenant auth, roles, or org modeling required in v1.
- **Contact info is optional**: A valid `person` row may have **no** email, phone, or LinkedIn yet. The product must still support **filtering** (e.g. “only people with an email,” “has LinkedIn URL,” “email is null” for enrichment queues).
- **Enrichment**: Research sub-agents should **try to fill gaps**—including “can we find an email elsewhere?”—via integrations such as **Apollo**, **Clay**, or similar APIs (exact vendors TBD when we compare pricing and API fit).
- **Phase 2 email**: **Gmail only** (Google OAuth + Gmail API drafts). No Microsoft 365 in scope for now.
- **Hosting**: **Render** — web service, background worker(s), managed Postgres, and Render **cron jobs** or **workflows** for scheduled / chunked jobs. Stack choice below is whatever fits Render well; if something is easier elsewhere, swapping host later is acceptable.
- **Out of scope for now**: “Sources that worked” analytics, effectiveness rollups, and compliance-heavy product features (you are not asking for jurisdiction tooling in v1).

---

## Goals (restated)

1. **ICP → people**: You describe an ideal customer profile (free-form context). Background agents do web research (and public / vendor-sourced signals) to **discover individuals** who match, with deduplication and progress toward a target count (e.g. “find 100 people”).
2. **Unified people + companies**: One database of people and companies, with **foreign keys**, **nullable contact fields**, and **prospecting state** so agents do not re-prospect the same person.
3. **Phase 2 — semantic search**: Per-person (and company) **keywords + embeddings** (e.g. OpenAI) for search across the corpus.
4. **Phase 2 — Gmail**: Connect **one or more Gmail accounts**; for selected people, spin up **per-person drafting agents** that read DB context, optionally do more research, and return a **structured draft** (subject + body). The system creates **real Gmail drafts** (no auto-send); you review and send manually.

---

## Phased roadmap

### Part 1 — Prospecting core (MVP)

| Area | Scope |
|------|--------|
| **Ingest ICP** | Store campaigns with raw ICP text + structured knobs (target count, geography, seniority, etc.). |
| **Agent orchestration** | Job queue + worker(s) on Render calling an LLM with **tools**: Exa, HTTP fetch, company normalization, DB upsert, and **enrichment** calls (Apollo / Clay / similar). |
| **People & companies** | Relational schema: `companies`, `people`, FK people → company; dedupe on strongest available keys (see Data model). |
| **Optional contacts** | Ingest and store people **even when** email / phone / LinkedIn are unknown; support list views and API filters: `has_email`, `has_linkedin`, etc. |
| **Enrichment pass** | After or during discovery, a sub-flow: “given name + company (+ title), ask Apollo/Clay/etc. for email and social URLs; merge into row if confident.” |
| **Prospecting lifecycle** | States such as `new` → `researched` → `enriched` → `prospected` / `drafted` as you add phases. Agent checks DB before counting a net-new lead. |
| **“Find N people”** | Orchestrator runs until `qualified_count >= N` or budget/time cap; idempotent so restarts do not double-count. |
| **Audit trail (optional)** | `discovery_events` (or a slim `agent_steps` log) for debugging—not used for “what worked” analytics in v1. |

### Part 2 — Search, Gmail accounts, draft agents

| Area | Scope |
|------|--------|
| **Embeddings** | Background job: chunk `people.notes`, `people.context`, company fields, titles → embeddings; **keyword + vector** search API. |
| **Gmail OAuth** | One or more Google accounts; refresh tokens stored as Render **secret** env vars or encrypted column (simple crypto acceptable for solo v1). |
| **Draft pipeline** | Select people → `draft_jobs` → agent per person (concurrency limits) → structured `{ subject, body }` → **Gmail API** `users.drafts.create`. |
| **Practical safety** | Rate limits and backoff for Exa, OpenAI, Apollo/Clay, Gmail; optional `do_not_contact` on `people` if you want a manual kill switch later. |

---

## Proposed data model (first pass)

**`companies`**

- `id` (UUID)
- `name`, `domain` (unique where known), `website`, `industry`, `employee_range`, `hq_location`, raw JSON for enrichment payloads
- `created_at`, `updated_at`

**`people`**

- `id` (UUID)
- `company_id` (FK → `companies`, nullable if unknown)
- **Contact (all nullable)** — `email`, `phone`, `linkedin_url`, `twitter_url`, …  
  - **Filtering**: expose query params or views such as `email IS NOT NULL`, `linkedin_url IS NOT NULL`, combined filters for “ready to draft” vs “needs enrichment.”
- **Identity / dedupe** (use what exists, in priority order):
  - Strong: unique partial index on **lower(trim(email))** where email is not null; unique partial index on **canonical linkedin_url** where not null.
  - Weaker fallback: `normalized_full_name` + `company_id` (and manual merge UI later if duplicates slip through).
- **Role**: `title`, `seniority`, `department` (optional)
- **Agent fields**: `notes`, `context` (research dumps), `icp_keywords` (text[] or JSON for Phase 2)
- **Enrichment tracking (optional but useful)**: `enrichment_last_attempt_at`, `enrichment_sources` (JSONB: which APIs were tried) so the sub-agent does not hammer the same person forever.
- **Lifecycle**: e.g. `lifecycle_status` (`new`, `researched`, `enriched`, `prospected`, `drafted`, …)
- **Campaign lineage**: `first_seen_campaign_id`, `last_seen_at`
- `created_at`, `updated_at`

**`campaigns`**

- `id`, `name`, `icp_document`, `target_count`, `status`, timestamps  
- No `created_by` / multi-user fields required for v1.

**`discovery_events`** (debugging / audit only in v1)

- `id`, `campaign_id`, `person_id` (nullable until resolved), `source_type` (`exa`, `web_fetch`, `apollo`, `clay`, `manual`, …), `source_query`, `source_url`, `metadata` (JSONB), `created_at`

**Phase 2 additions**

- `email_accounts` — label, Google refresh token / client linkage, `email_address`
- `drafts` — `person_id`, `email_account_id`, Gmail `draft_id`, `subject`, `body`, `status`, `agent_run_id`
- `person_embeddings` / `company_embeddings` — vector + `model` + `content_hash` + `chunk_index` (pgvector on Render Postgres when enabled)

---

## System architecture (Render-first)

**Shape**: **API (Render Web Service)** + **Postgres (Render managed)** + **Worker (Render Background Worker)** + **Cron (Render)** for periodic sweeps (e.g. retry enrichment, embedding backfill).

1. **Control plane**: HTTP API — create campaigns, enqueue “find N,” list/filter people and companies (`has_email`, `has_linkedin`, text search on name/title/domain).
2. **Agent workers**: Pull jobs from a queue implemented as **Postgres `FOR UPDATE SKIP LOCKED`** rows or **Redis** (Upstash Redis pairs well with Render if you want a dedicated queue later). Workers run the tool-calling loop (Exa, fetch, Apollo/Clay, upsert).
3. **Deduplication**: Before counting toward N, resolve identity; **UPSERT** on email or LinkedIn URL when present.
4. **Enrichment sub-agent**: Callable tool step or separate job type: given `person_id`, call Apollo/Clay, map response into nullable columns, set `enrichment_last_attempt_at`.

**Stack (suggestion optimized for “one person, Render, TypeScript”)**

- **Runtime**: Node **22** + **TypeScript** + **Hono** or **Fastify** (lightweight on Render).
- **ORM / migrations**: Drizzle or Prisma + Postgres.
- **DB**: Render Postgres; enable **pgvector** when you start Phase 2 embeddings (Render supports extensions on managed Postgres—verify plan/extension at implementation time).
- **Frontend (when needed)**: Single React app (Vite) on Render Static Site or second Web Service—deferred until API + worker path is solid.

Python + FastAPI is equally fine if you prefer; Gmail and Google OAuth have mature libraries in both ecosystems. Default recommendation above is TS for one deployable monorepo.

---

## Integrations

| Integration | Role |
|-------------|------|
| **Exa** | Semantic web search for discovery hypotheses and evidence URLs. |
| **OpenAI (or similar)** | Planner + tool-calling agents; embeddings in Phase 2. |
| **Apollo** | B2B enrichment: email, phone, title, company match from partial identity. |
| **Clay** | Workflow-style enrichment and waterfall lookups (often used to chain vendors); evaluate API vs no-code UI for what we automate. |
| **Gmail API** | Phase 2: OAuth, create drafts only. |

**LinkedIn**: Prefer **URLs found in public pages** or returned by **paid enrichment APIs** with acceptable terms—not logged-in scraping.

---

## Agent design notes

**Prospecting agent**

- Inputs: ICP text, `campaign_id`, remaining quota, exclusion list.
- Tools: `exa_search`, `fetch_url`, `upsert_company`, `upsert_person` (contacts optional), `run_enrichment` (calls Apollo/Clay with mapped payload), optional `append_notes`.
- Policy: **May** insert a person with only name + company + evidence URL; enrichment tools try to backfill email/LinkedIn.

**Drafting agent (Phase 2)**

- Inputs: `person_id`, voice/style snippet, constraints.
- Tools: read DB, optional `exa_search` / `fetch_url`, `submit_draft` → `{ subject, body_text | body_html }`.
- Server: Gmail `drafts.create` using the selected `email_account_id`.

---

## Risks & guardrails (technical, not legal product)

- **Hallucinated contacts**: Treat enrichment APIs as **suggestions**; store provider and raw payload in `metadata` when debugging mismatches.
- **Rate limits**: Centralize retries with exponential backoff per vendor.
- **Duplicates**: Partial unique indexes on email and LinkedIn; weak matches flagged for your manual merge later if needed.

---

## Suggested implementation order

1. Render **Blueprint** or manual setup: Web + Worker + Postgres; env vars for Exa, OpenAI, Apollo, Clay (add keys as you subscribe).
2. Migrations: `companies`, `people`, `campaigns`, `discovery_events`.
3. Worker: one vertical slice — campaign → Exa + fetch → upsert person (nullable contacts) → optional enrichment tool call.
4. API: CRUD + **filters** (`has_email`, `has_linkedin`, full-text on name/title).
5. Phase 2: pgvector, embedding job, Gmail OAuth, draft jobs.

---

## Optional follow-ups (only if you care later)

- **Which enrichment vendor first**: Apollo vs Clay vs both in a waterfall (cost vs coverage)—can be decided at integration time with small eval scripts.
- **“Qualified” for counting toward N**: Does a person count toward 100 if they have no email but have LinkedIn + strong ICP match? (Default: **yes**, with a separate filter for “ready to email.”)

When you want implementation to start, the next step is scaffolding the Render-friendly repo (API + worker + Drizzle/Prisma migrations) against this schema.
