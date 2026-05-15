# ICP Prospector — Product & Technical Plan

This document breaks the vision into phases, proposes a data model and system shape, and records **locked decisions** plus a small set of optional follow-ups.

---

## Locked decisions (from you)

- **Solo use**: Single operator; no multi-tenant auth, roles, or org modeling required in v1.
- **Contact info is optional**: A valid `person` row may have **no** email, phone, or LinkedIn yet. The product must still support **filtering** (e.g. “only people with an email,” “has LinkedIn URL,” “email is null” for enrichment queues).
- **Enrichment**: Research sub-agents should **try to fill gaps**—including “can we find an email elsewhere?”—via integrations such as **Apollo**, **Clay**, or similar APIs (exact vendors TBD when we compare pricing and API fit).
- **Phase 2 email**: **Gmail only** (Google OAuth + Gmail API drafts). No Microsoft 365 in scope for now.
- **Hosting**: **Everything on Render**, in the **Orin Labs** workspace. Use the **lowest-cost** service plans that still meet persistence needs (see **Cost notes** below). **Prospecting and drafting agents run as [Render Workflows](https://render.com/docs/workflows)** (task runs, chaining, retries, dashboard visibility). The **HTTP API** is a separate **Web Service** on the **cheapest appropriate plan** (typically **Free** for a low-traffic private API—accepts cold starts—or **Starter** if you need always-on).
- **Out of scope for now**: “Sources that worked” analytics, effectiveness rollups, and compliance-heavy product features (you are not asking for jurisdiction tooling in v1).

---

## Cost notes (Render)

- **LLM tokens + Exa/Apollo/Clay** remain the dominant variable cost; Render infra should stay small.
- **Web Service `free`**: Spins down when idle; first request after idle can be slow—usually fine for a solo API. Upgrade to **Starter** if you need predictable wake time.
- **Postgres `free`**: Historically time-limited on Render; treat it as **dev/spike** unless Render’s current policy says otherwise. For a database you do not want to lose, use the smallest paid plan (**`basic-256mb`** in Blueprints: `plan: basic-256mb`) as soon as you have real data. `render.yaml` currently uses **`free`** for both web and DB so the Blueprint is literally the lowest tier; **bump the DB plan in YAML when you care about retention.**

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
| **Agent orchestration** | **Render Workflows**: tasks for discovery, enrichment, and “find N” loops (chain runs, parallel where safe). Tools: Exa, HTTP fetch, DB upsert, Apollo/Clay. |
| **People & companies** | Relational schema: `companies`, `people`, FK people → company; dedupe on strongest available keys (see Data model). |
| **Optional contacts** | Ingest and store people **even when** email / phone / LinkedIn are unknown; support list views and API filters: `has_email`, `has_linkedin`, etc. |
| **Enrichment pass** | Workflow tasks: given name + company (+ title), call Apollo/Clay, merge into nullable columns. |
| **Prospecting lifecycle** | States such as `new` → `researched` → `enriched` → `prospected` / `drafted` as you add phases. Agent checks DB before counting a net-new lead. |
| **“Find N people”** | Workflow root task runs until `qualified_count >= N` or budget/time cap; idempotent so restarts do not double-count. |
| **Audit trail (optional)** | `discovery_events` (or `agent_steps`) for debugging—not used for “what worked” analytics in v1. |

### Part 2 — Search, Gmail accounts, draft agents

| Area | Scope |
|------|--------|
| **Embeddings** | Workflow or cron-triggered job: chunk notes/context → embeddings; keyword + vector search in the API. |
| **Gmail OAuth** | Refresh tokens in **Render dashboard env vars** (or encrypted column for solo v1). |
| **Draft pipeline** | API enqueues selection → **Workflow tasks** (one branch per person or batched) → structured `{ subject, body }` → Gmail `users.drafts.create`. |
| **Practical safety** | Rate limits and backoff for Exa, OpenAI, Apollo/Clay, Gmail; optional `do_not_contact` on `people`. |

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
  - **Filtering**: query params / views: `email IS NOT NULL`, `linkedin_url IS NOT NULL`, “ready to draft” vs “needs enrichment.”
- **Identity / dedupe**: partial unique indexes on normalized `email` and `linkedin_url` when present; weaker fallback `normalized_full_name` + `company_id`.
- **Role**: `title`, `seniority`, `department` (optional)
- **Agent fields**: `notes`, `context`, `icp_keywords` (Phase 2)
- **Enrichment tracking**: `enrichment_last_attempt_at`, `enrichment_sources` (JSONB)
- **Lifecycle**: `lifecycle_status` (`new`, `researched`, `enriched`, `prospected`, `drafted`, …)
- **Campaign lineage**: `first_seen_campaign_id`, `last_seen_at`
- `created_at`, `updated_at`

**`campaigns`**

- `id`, `name`, `icp_document`, `target_count`, `status`, timestamps

**`discovery_events`**

- `id`, `campaign_id`, `person_id`, `source_type`, `source_query`, `source_url`, `metadata` (JSONB), `created_at`

**Phase 2 additions**

- `email_accounts`, `drafts`, `person_embeddings` / `company_embeddings` (**pgvector** on Render Postgres when enabled for your plan/region)

---

## System architecture (Render + Workflows)

### Components

| Component | Render type | Role |
|-----------|-------------|------|
| **API** | **Web Service** (`plan: free` or `starter`) | REST (later): campaigns, people CRUD, filters, triggers `render.workflows.startTask(...)` via Render SDK with **API key** or server-side token. Health check for deploys. |
| **Agents** | **Workflow** (Workflow service in dashboard) | All long-running prospecting and draft-generation logic: task definitions with `@renderinc/sdk` (TypeScript) or Python SDK; chained runs; retries; up to **24h** per task run. |
| **Database** | **Render Postgres** | Source of truth; `DATABASE_URL` injected into **both** API and Workflow service env groups. |
| **Scheduling** | **Cron job** (optional, cheap) | Render docs: Workflows do not yet support native scheduling; use a **Cron Job** service that calls the API or Render API to `startTask` on a cadence. |

### Checkpoints (verifiable state)

1. **Render Dashboard** — each workflow task run has status, logs, retries.
2. **Postgres** — `campaigns.status`, `campaign_runs` / `jobs` rows with `cursor`, counts, `last_error`, `updated_at` so tasks are **idempotent** and you can inspect state with SQL.

Blueprint **does not yet create Workflow services** ([Render docs](https://render.com/docs/workflows): *“Blueprints do not yet support creating or managing workflows”*). Repo includes **`render.yaml`** for **API + Postgres**; you **add the Workflow service** in the Orin Labs dashboard (or CLI) and point it at the **same repo** (or a `workflows/` package in the monorepo).

### CI / auto-deploy

- Connect the GitHub repo to Render; enable **auto-deploy** on push to `main` for the Web Service and Workflow service.
- Add **GitHub Actions** in this repo (see `.github/workflows/ci.yml`) for quick sanity checks on every push; Render deploys independently when the branch updates.

### Token cost

Unchanged: OpenAI (etc.) bills the same regardless of Render service type. Keep workflow tasks **small and retry-friendly** to avoid burning tokens on repeated failed mega-steps.

---

## Repo layout (target)

- **`render.yaml`** — Blueprint: Postgres + API web service + **static** UI (`frontend/`, build-time `VITE_API_BASE_URL` → API origin).
- **`src/`** — Hono API, Drizzle schema, Render Workflow task entry (`src/workflows/`).
- **`frontend/`** — Vite + React + **shadcn/ui** (Tailwind v3); dev uses Vite proxy `/api` → local API.

---

## Creating this in Orin Labs (dashboard)

This Cursor environment did **not** have a **`RENDER_API_KEY`**, so services were **not** created automatically. Do this once in **Orin Labs**:

1. Push this repository to GitHub (org or account that Orin Labs can access).
2. In [Render Dashboard](https://dashboard.render.com), switch the workspace to **Orin Labs**.
3. **New** → **Blueprint** → connect the repo → confirm **`render.yaml`** is detected → apply (creates **Postgres** + **icp-prospector-api** web service).
4. **New** → **Workflow** (or follow [Your first workflow](https://render.com/docs/workflows)) → same repo → smallest instance type; set env vars (same `DATABASE_URL` pattern, plus `OPENAI_API_KEY`, `EXA_API_KEY`, etc. when ready).
5. From the API, use the Render SDK to **start workflow tasks** (e.g. `prospectCampaign`) when you add that code path.

Optional: create a **`rnd_...` API key** in Render and add it to GitHub Actions / local env for scripted deploys or `curl` to the [Render API](https://render.com/docs/api).

---

## Integrations

| Integration | Role |
|-------------|------|
| **Exa** | Semantic web search. |
| **OpenAI (or similar)** | Agents + embeddings (Phase 2). |
| **Apollo** / **Clay** | Enrichment for email/social. |
| **Gmail API** | Phase 2 drafts only. |

**LinkedIn**: Prefer public URLs or enrichment APIs—not logged-in scraping.

---

## Agent design notes

**Prospecting (Workflow tasks)**

- Root task: orchestrate “find N”; child tasks: single hypothesis search, single enrichment, single upsert.
- Tools: `exa_search`, `fetch_url`, `upsert_company`, `upsert_person`, `run_enrichment`, `append_notes`.

**Drafting (Phase 2, Workflow tasks)**

- Per-person or batched tasks; `submit_draft` structured output; API or task runner calls Gmail `drafts.create`.

---

## Risks & guardrails (technical)

- **Hallucinated contacts**: Store provider payloads in `metadata` when debugging.
- **Rate limits**: Centralized backoff per vendor.
- **Duplicates**: Partial unique indexes on email and LinkedIn.

---

## Suggested implementation order

1. **Blueprint live** in Orin Labs (Postgres + API shell); confirm `/health` on the deployed URL.
2. **Workflow service** in same workspace; hello-world task + trigger from API using Render SDK.
3. **Migrations** on Postgres: `companies`, `people`, `campaigns`, `discovery_events`, optional `campaign_runs`.
4. **Real API** replacing `server.js`; enqueue prospect runs via `startTask`.
5. Phase 2: pgvector, embeddings task, Gmail OAuth, draft tasks.

---

## Optional follow-ups

- **Which enrichment vendor first**: Apollo vs Clay vs both.
- **“Qualified” for counting toward N**: Default remains **yes** without email if LinkedIn + strong match, with filters for “ready to email.”

When you want implementation to continue, next step is **Render Workflow package + first `prospectCampaign` task** wired to Postgres and Exa.
