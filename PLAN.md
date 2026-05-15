# ICP Prospector — Product & Technical Plan

This document breaks the vision into phases, proposes a data model and system shape, and records **locked decisions** plus a small set of optional follow-ups.

---

## Locked decisions (from you)

- **Solo use**: Single operator; no multi-tenant auth, roles, or org modeling required in v1.
- **Contact info is optional**: A valid `person` row may have **no** email, phone, or LinkedIn yet. The product must still support **filtering** (e.g. “only people with an email,” “has LinkedIn URL,” “email is null” for enrichment queues).
- **Enrichment**: Research sub-agents should **try to fill gaps**—including “can we find an email elsewhere?”—via integrations such as **Apollo**, **Clay**, or similar APIs (exact vendors TBD when we compare pricing and API fit).
- **Phase 2 email**: **Gmail only** (Google OAuth + Gmail API drafts). No Microsoft 365 in scope for now.
- **Hosting / cost posture**: **Minimize idle infra cost**; assume **LLM tokens + APIs** are the main bill. Prefer **serverless-friendly** pieces with **verifiable checkpoints** (durable steps or explicit DB state). **Vercel** is a strong default for the **HTTP surface + CI auto-deploy**; long agent work is usually paired with a **workflow runner** or **chunked jobs** (see Architecture). **Render** (web + worker + Postgres + cron) remains a fine alternative if you want one vendor and an always-on worker without orchestration glue.
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
| **Agent orchestration** | Durable **workflow steps** or **queued chunks** (see Architecture) calling an LLM with **tools**: Exa, HTTP fetch, company normalization, DB upsert, and **enrichment** (Apollo / Clay / similar). |
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
| **Gmail OAuth** | One or more Google accounts; refresh tokens in **Vercel env** (or encrypted DB column for solo v1). |
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
- `person_embeddings` / `company_embeddings` — vector + `model` + `content_hash` + `chunk_index` (**pgvector** on Postgres; Neon and many managed providers support it)

---

## System architecture (cost-first, checkpoint-friendly)

### Should “everything” run on Vercel?

**Put the app on Vercel; do not rely on a single long Serverless Function for whole prospect runs.**

Vercel Serverless Functions are great for request/response and short work, but **multi-minute agent loops** (many LLM rounds + HTTP fetches) hit **timeouts** and are awkward to resume. You still want Vercel for **Git-connected auto-deploy**, preview URLs, and edge-friendly APIs—that part is excellent DX and usually **cheap at low traffic**.

**Token spend is independent of host** (OpenAI/Anthropic bill the same whether the caller runs on Vercel, Render, or your laptop). Infra savings come from **not paying for an idle 24/7 worker** unless you need it.

### Recommended default (good for solo + easy CI + verifiable checkpoints)

| Piece | Role | Why |
|--------|------|-----|
| **Vercel** | **Next.js** (App Router) or **Nitro** — UI (later), REST/route handlers, OAuth callbacks, webhooks | Native Git integration → **auto-deploy on push**; preview deployments; one repo to clone and test. |
| **Neon** (or **Supabase**) Postgres | Source of truth: people, companies, campaigns, job rows, optional `agent_runs` / step metadata | **Scales to near-zero** when idle; **pgvector** when you need embeddings; cheap starter tiers. |
| **Inngest** or **Trigger.dev** | **Durable workflows**: each step is a checkpoint, automatic retries, run history in a dashboard | Fits the “agent = many steps” model without you building a worker VM; integrates cleanly with Vercel (HTTP signing / SDK). **This is the main ‘verifiable checkpoint’ layer** beyond Postgres. |
| **GitHub Actions** | `lint` / `typecheck` / `test` on every PR + main | Standard, free for public repos; private repos within GH limits. Vercel can **block deploy on failed checks** if you enable it. |

**Checkpoints live in two places** (redundant on purpose):

1. **Workflow product**: step completion + logs (Inngest/Trigger) — easy to answer “where did this run die?”
2. **Postgres**: `campaigns.status`, `campaign_runs` / `jobs` rows with `cursor`, `last_error`, `counts`, `updated_at` — **idempotent resume** and your own queries/reports without vendor lock-in.

Each **durable step** should be **small** (e.g. “run one discovery hypothesis,” “enrich one person,” “embed one batch”) so retries are cheap and token use is bounded per step.

### Ultra-cheap / minimal moving parts (no workflow SaaS)

If you want **almost no extra services**: **Postgres job queue only** + **Vercel Cron** hitting a route that processes **one bounded chunk** per invocation (`FOR UPDATE SKIP LOCKED` on a `jobs` table). Checkpoints = **row updates in Postgres**. Downsides: you design retries, concurrency caps, and observability yourself; runs are less “first-class” than Inngest/Trigger but **cost and complexity stay low**.

### Render (still valid)

**Render Web Service + Background Worker + Postgres + Cron** is simpler mentally (one platform, long-running process) but typically **not serverless** for the worker—fine if monthly fixed cost is acceptable. Use the same **Postgres checkpoint** pattern either way.

### What is “easiest for the coding agent” (implementation + CI)

A **single TypeScript monorepo**: **Next.js + Drizzle (or Prisma) + Inngest** (or Trigger) + **Neon** gives:

- One `git clone`, one test command, one deploy pipeline.
- **Checkpoints** you can verify in the workflow UI **and** in SQL.
- **CI**: GitHub Actions for quality gates; Vercel for deploy—industry default, lots of examples.

Python is fine too, but **Vercel’s first-class story is Node**; mixing is OK (e.g. Python only for a future sidecar) if you accept two runtimes.

### Control flow (all options)

1. **Control plane**: Create campaigns, enqueue “find N,” list/filter people (`has_email`, `has_linkedin`, …).
2. **Execution plane**: Durable steps or cron chunks run tool-calling (Exa, fetch, Apollo/Clay, upsert).
3. **Deduplication**: **UPSERT** on email / LinkedIn URL when present before counting toward N.
4. **Enrichment**: Same pattern—either its own step function or a job type keyed by `person_id`.

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

1. **Repo + Vercel + Neon**: Connect GitHub → Vercel project; create Neon DB; env vars for Exa, OpenAI, Apollo, Clay (as you subscribe). Add **Inngest** (or Trigger.dev) and wire the signing key.
2. **Migrations**: `companies`, `people`, `campaigns`, `discovery_events`, optional `campaign_runs` / `jobs` for chunk cursors.
3. **One durable workflow** (or cron chunk handler): campaign → bounded LLM + tools → upsert person (nullable contacts) → optional enrichment step.
4. **API routes**: CRUD + **filters** (`has_email`, `has_linkedin`, full-text on name/title).
5. **GitHub Actions**: install → lint → typecheck → test; optionally require green checks before Vercel production deploy.
6. Phase 2: pgvector, embedding job, Gmail OAuth, draft workflow steps.

---

## Optional follow-ups (only if you care later)

- **Which enrichment vendor first**: Apollo vs Clay vs both in a waterfall (cost vs coverage)—can be decided at integration time with small eval scripts.
- **“Qualified” for counting toward N**: Does a person count toward 100 if they have no email but have LinkedIn + strong ICP match? (Default: **yes**, with a separate filter for “ready to email.”)

When you want implementation to start, the next step is scaffolding a **Next.js + Neon + Inngest** (or Trigger) monorepo with the schema above and one end-to-end prospecting workflow with **visible checkpoints** in the workflow dashboard and in Postgres.
