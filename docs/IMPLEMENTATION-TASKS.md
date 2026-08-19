# Erdavid Work OS — Implementation Task Backlog

Source PRD: [`Erdavid-Work-OS-Full-Implementation-Plan.md`](./Erdavid-Work-OS-Full-Implementation-Plan.md)

This backlog breaks the full PRD into small, independently-shippable tasks, grounded in the **current** state of this codebase (not just the PRD's prose). Each task lists exactly which files it touches today and what "done" looks like. Work top-to-bottom within a phase; phases are ordered so nothing later depends on something not yet built.

## How to use this backlog

- **ID**: `P{phase}-{number}`, stable — reference it in commits/PRs (e.g. `P0-01`).
- **Priority**: `Critical` / `High` / `Medium` / `Low`, matching the PRD's `migration.md` weighting.
- **Effort**: `S` (< half a day), `M` (~1 day), `L` (multi-day / spans several files).
- **Depends on**: task IDs that must land first. A task with no listed dependency can start immediately.
- **Status**: check off `[ ]` → `[x]` as tasks complete; keep this file as the living source of truth for progress (edit it in place rather than creating a second tracking doc).

## Storage & ORM decision

The PRD assumes a generic "Redis/Postgres" cache + audit-log store. This project uses **Supabase (Postgres) + Prisma ORM** instead. **Decided**: Prisma, current stable major (`prisma`/`@prisma/client` **7.x** — check `npm view prisma version` at install time; do not pull the `8.0.0-rc.x` release-candidate line, and skip Prisma Accelerate, since Supabase's own pooler already covers serverless connection pooling for a single-user app). Full setup steps — connection strings, `prisma.config.ts`, singleton client, migration workflow — are in **P0-04** below; no other task should install a different ORM or duplicate this setup.

All new persistent tables (query cache, `ai_usage`, `action_plan_audit_log`, `inbox_items`) live in the same Supabase project, created via Prisma migrations (`prisma migrate dev` locally, `prisma migrate deploy` once a deploy pipeline exists), not hand-written SQL, so schema stays in version control.

---

## Phase 0 — Foundation & Infrastructure

Goal: remove hardcoded values, stand up the domain-service layer skeleton and `ActionPlan` types, get Supabase wired in. Nothing user-facing changes yet — this is groundwork.

### P0-01 — Remove hardcoded user ID, add `CurrentUserContext` ✅ Done
- **Priority**: Critical · **Effort**: M · **Depends on**: —
- **Problem**: user UUID `75ca7488-91e2-4455-83cb-92526b0e69e5` is duplicated in 4 places and the app never actually fetches the real current user:
  - `src/stores/workspace-store.ts:56-60` — baked into the store's default initial state (so the app boots already "logged in" as this UUID; `setCurrentUser()` is never called anywhere).
  - `src/app/api/ai/route.ts:31` — fallback when `currentUser` is missing from the request body.
  - `src/lib/ai/executor.ts:61` — fallback `erdavidId` used to filter "my tasks".
  - `src/app/page.tsx:138` — same fallback pattern, plus name-substring matching (`'erdavid'`/`'erdin'`) duplicated at `executor.ts:67` and `page.tsx:145`.
- **Task**: create `src/lib/context/current-user.ts` exporting a `CurrentUserContext` type (`userId`, `name`, `email`, `planeMemberId`, `workspaceId`) and a `getCurrentUserContext()` that calls `PlaneService.getMe()` server-side (already implemented in `src/lib/plane/client.ts`) instead of reading a hardcoded default. Update `workspace-store.ts` to initialize `currentUser` as `null` and populate it from a real `/api/plane?action=getMe` call on app load (`page.tsx`). Remove all 4 hardcoded-UUID fallbacks and the 2 name-substring checks; use `currentUser.id` directly and fail closed (show "sign in" / error state) if it's missing instead of silently falling back to a specific person's UUID.
- **Acceptance criteria**: `grep -r "75ca7488-91e2-4455-83cb-92526b0e69e5" src/` returns zero matches. `grep -rn "erdavid\|erdin" src/lib src/app/page.tsx` returns zero logic matches (UI copy strings are handled in P0-02).

### P0-02 — Remove hardcoded project identifiers ✅ Done
- **Priority**: High · **Effort**: S · **Depends on**: P0-01
- **Problem**: `'BSJ7PHASE2'` / `'BSJ7PHASE3'` / `'BSJ7'` hardcoded as default/fallback project at `src/app/page.tsx:66,200,205,360`, plus "Erdavid"-specific UI copy (`page.tsx:240,300,377`, `Sidebar.tsx:220,223`) and an example command in `src/lib/ai/intent-engine.ts:74` that name-drops `BSJ7PHASE2`.
- **Task**: replace the hardcoded default-project logic with "last-used project" (persisted in the workspace store / `localStorage`) falling back to the first project returned by `listProjects()` — no specific identifier baked in. Genericize the UI copy (`"My Tasks"` instead of `"My Tasks (Erdavid)"`, `"No tasks assigned to you"` instead of `"...to Erdavid"`, remove the `BSJ7`-specific button label). Update the intent-engine's example command text to a generic placeholder.
- **Acceptance criteria**: `grep -rn "BSJ7" src/` returns zero matches; loading the app with a different Plane workspace/project set works without code changes.

### P0-03 — Consolidate duplicate workspace-store import path ✅ Done
- **Priority**: Low · **Effort**: S · **Depends on**: —
- **Problem**: `src/lib/store/workspace.ts` is a pure re-export shim of `src/stores/workspace-store.ts`. `CommandPalette.tsx` and `MobileNav.tsx` import via the shim; everything else imports the canonical path directly.
- **Task**: point all imports at `@/stores/workspace-store` and delete `src/lib/store/workspace.ts`.
- **Acceptance criteria**: `src/lib/store/workspace.ts` no longer exists; `grep -rn "lib/store/workspace" src/` returns zero matches; app builds and runs unchanged.

### P0-04 — Provision Supabase + Prisma ORM setup ✅ Done
- **Priority**: Critical · **Effort**: M · **Depends on**: —
- **ORM decision**: **Prisma** (see Storage & ORM decision above). Pinned to the current stable release — **Prisma ORM 7.9.1** (`prisma`/`@prisma/client`, confirmed via `npm view prisma version` at implementation time — re-check before bumping, this moves fast). Not the `8.0.0-rc.x` line — that's a release candidate, not the `latest` dist-tag. Not Prisma Accelerate — Supabase's own pooler (Supavisor) covers serverless connection pooling for this single-user app at no extra cost or dependency.
- **Correction from the original write-up of this task**: the plan below originally assumed the older `prisma-client-js` generator with `url`/`directUrl` inline in `schema.prisma`'s `datasource` block. Running `npx prisma init` against the real installed 7.9.1 package showed this is stale — **Prisma 7's default generator is `prisma-client`**, which (a) requires an explicit `output` path and generates outside `node_modules`, (b) requires a **driver adapter** (`@prisma/adapter-pg` + `pg`) instead of Prisma's old built-in Rust query engine, and (c) moves the datasource connection out of `schema.prisma` entirely and into `prisma.config.ts` — and even there, verified directly against `node_modules/@prisma/config/dist/index.d.ts`'s `Datasource` type, only `url` and `shadowDatabaseUrl` exist; **there is no `directUrl` field in Prisma 7's config** (unlike the old schema.prisma pattern). The steps below are what was actually implemented and verified against the installed package, not assumed from general Prisma knowledge.

- **Step 1 — Supabase project & connection strings**: create the Supabase project (or confirm one already exists) and grab **two** connection strings from Project Settings → Database:
  - **Transaction pooler** (Supavisor), port `6543`, with `?pgbouncer=true` appended — `DATABASE_URL`, used by the running app's own driver-adapter connection (Step 4). Pooled/serverless-safe, but doesn't support the prepared statements/advisory locks migrations need.
  - **Direct connection**, port `5432` — `DIRECT_URL`, used only by the Prisma CLI (`prisma.config.ts`, Step 3) for migrate/introspect.
  Both already have placeholder entries in `.env.local` (never commit this file) — replace the `[project-ref]`/`[password]`/`[region]` placeholders with the real values from the Supabase dashboard:
  ```bash
  DATABASE_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"
  DIRECT_URL="postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres"
  ```

- **Step 2 — Install** (done):
  ```bash
  npm install prisma@^7.9.1 @prisma/client@^7.9.1
  npm install @prisma/adapter-pg pg
  npm install --save-dev @types/pg dotenv
  npx prisma init --datasource-provider postgresql
  ```
  `prisma init` on this version also auto-installs official Prisma reference docs as agent skills (`.claude/skills/`, `.windsurf/skills/`, `.agents/skills/`, tracked in `skills-lock.json`) — static MIT-licensed markdown, harmless, left in place; it also generates a placeholder `.env` with a fake `localhost` URL, which was deleted since this project standardizes on `.env.local` (Next.js convention).

- **Step 3 — Config files** (done): `prisma/schema.prisma` (generator only needs `output`; no datasource URLs here anymore):
  ```prisma
  generator client {
    provider = "prisma-client"
    output   = "../src/generated/prisma"
  }

  datasource db {
    provider = "postgresql"
  }
  ```
  `prisma.config.ts` (loads `.env.local` explicitly since bare `dotenv/config` only reads `.env`; `url` here is **CLI-only** and must be the *direct* URL, not the pooled one — there's no `directUrl` field to split them anymore):
  ```ts
  import { config } from "dotenv";
  import { defineConfig } from "prisma/config";

  config({ path: ".env.local" });

  export default defineConfig({
    schema: "prisma/schema.prisma",
    migrations: { path: "prisma/migrations" },
    datasource: {
      url: process.env["DIRECT_URL"],
    },
  });
  ```
  `src/generated/prisma` (the generated client output) is already covered by `.gitignore` (`prisma init` added it automatically).

- **Step 4 — Singleton client** (done): `src/infrastructure/db/client.ts` — note the driver adapter and the import path matching the schema's `output`:
  ```ts
  import { PrismaClient } from '@/generated/prisma/client';
  import { PrismaPg } from '@prisma/adapter-pg';

  const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });

  export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
  }
  ```
  This is the standard Next.js dev-mode hot-reload guard (prevents exhausting the pooler's connection limit from repeated module reloads) and gives every server-side call site one shared instance — mirroring the fix for the `new PlaneService()`-per-request bug in P0-08, applied to the DB layer from day one. Note it reads `DATABASE_URL` (pooled) directly — independent of `prisma.config.ts`'s `DIRECT_URL`, which only the CLI sees.

- **Step 5 — First migration** (done): with the schema still empty (no models yet — that's fine, later tasks add `query_cache`/`ai_usage`/`action_plan_audit_log`/`inbox_items` each in their own task):
  ```bash
  npx prisma migrate dev --name init
  ```
  Ran successfully against real Supabase credentials (via the session pooler on port 5432, since this Supabase project is IPv4-only) — reported "Already in sync, no schema change or pending migration was found" since there are zero models yet, so no `prisma/migrations/` folder was created (expected — the first real migration lands whenever P0-10/X-01/P2-04/P3-03 add their first models). Connectivity was independently confirmed via `npx prisma db execute` running a live `SELECT 1`, via a standalone script importing the singleton client directly, and — matching the acceptance criteria's literal wording — via a real temporary Next.js API route hit through `npm run dev`, which returned `{"result":[{"ok":1}]}` before being deleted. `migrate dev` is for local iteration; `migrate deploy` is the non-interactive command for CI/production, added to a deploy pipeline once one exists — not wired up yet.
  - If `migrate dev`'s shadow-database creation fails on Supabase (some managed Postgres setups restrict `CREATE DATABASE`), the fallback is a `shadowDatabaseUrl` entry alongside `url` in `prisma.config.ts`'s `datasource` block, pointing at a second small database dedicated to shadow use — not needed yet since this project hasn't added its first model.

- **Acceptance criteria**: `npx prisma migrate dev --name init` runs cleanly against Supabase using `DIRECT_URL`; a Next.js API route importing `prisma` from `src/infrastructure/db/client.ts` and running a trivial query (e.g. `prisma.$queryRaw\`SELECT 1\``) succeeds in dev; confirm the app still works after several hot-reloads without exhausting Supabase's pooled-connection limit (watch the Supabase dashboard's connection count).

### P0-05 — Domain-service layer skeleton ✅ Done
- **Priority**: High · **Effort**: L · **Depends on**: P0-04
- **Task**: introduce the PRD's proposed structure without a big-bang rewrite — create the directories and migrate **one** vertical slice end-to-end as the reference pattern:
  ```
  src/
    application/services/ProjectService.ts   // orchestrates use-cases
    domain/projects/                          // Project domain type + pure logic (if any)
    infrastructure/plane/PlaneClient.ts        // current src/lib/plane/client.ts, moved+renamed
  ```
  Move the project-listing logic currently inline in `src/app/page.tsx` / `src/app/api/plane/route.ts`'s `listProjects` branch into `ProjectService.listProjects()`, which internally calls the (now-singleton, see P0-08) `PlaneService`. Update `/api/plane?action=listProjects` to call `ProjectService` instead of instantiating `PlaneService` directly. Leave every other `action=` branch in `src/app/api/plane/route.ts` untouched for now — they migrate incrementally in later phases as each area is touched (don't block this task on migrating everything).
- **Acceptance criteria**: `ProjectService.listProjects()` exists and is unit-testable in isolation (see P0-10); `GET /api/plane?action=listProjects` behavior is unchanged from a client's perspective.

### P0-06 — `ActionPlan`/`ActionStep` types + zod validation ✅ Done
- **Priority**: Critical · **Effort**: M · **Depends on**: —
- **Problem**: `src/types/ai.ts` has no `ActionPlan`/`ActionStep` — today `executor.ts` builds ad-hoc `ActionCard` objects per switch-case with `data: any`. `zod` (`^4.4.3`) is installed but imported nowhere in `src/`.
- **Task**: add to `src/types/ai.ts`:
  ```ts
  type ActionStep = {
    operation: string;
    target: string;
    changes: Record<string, unknown>;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  };
  type ActionPlan = {
    id: string;
    intent: string;
    summary: string;
    risk: 'low' | 'medium' | 'high';
    requiresApproval: boolean;
    steps: ActionStep[];
  };
  ```
  Add matching zod schemas in a new `src/types/schemas.ts` (`ActionStepSchema`, `ActionPlanSchema`) so any AI-generated JSON can be validated with `ActionPlanSchema.safeParse(...)` before being trusted. This task only adds the types/schemas — wiring them into the actual AI flow happens in P2-02/P2-06.
- **Acceptance criteria**: types compile; a unit test feeds a valid and an invalid `ActionPlan` JSON through `ActionPlanSchema.safeParse` and asserts success/failure correctly.

### P0-07 — Structured `AppError` type
- **Priority**: Low · **Effort**: S · **Depends on**: —
- **Task**: add `src/lib/errors.ts` exporting `AppError { code: string; message: string; userMessage: string; retryable: boolean }`. Use it in `src/app/api/plane/route.ts`'s error handling (currently just `error.response?.status || 500`) as the first adopting call site.
- **Acceptance criteria**: `AppError` type exists and is thrown/caught in at least one route with a test covering the retryable vs non-retryable distinction.

### P0-08 — Fix per-request `PlaneService` instantiation (make cache actually work)
- **Priority**: High · **Effort**: S · **Depends on**: —
- **Problem**: every branch in `src/app/api/plane/route.ts` (lines ~10, 79, 111, 140) and `src/app/api/ai/route.ts:28` does `new PlaneService()`, so the in-memory `TTLCache` inside it (`src/lib/plane/client.ts:19-61`, 60s TTL) is recreated — and thus useless — on every single request.
- **Task**: export a module-level singleton `PlaneService` instance (or a cached factory keyed by workspace slug, since `PLANE_WORKSPACE_SLUG` is currently a single global env var) from `src/lib/plane/client.ts` and use it in both route files instead of `new PlaneService()` per call.
- **Acceptance criteria**: two sequential `GET /api/plane?action=listProjects` calls within 60s result in only one upstream Plane API call (verify via a log line or test spy).

### P0-09 — Adopt TanStack Query in one view
- **Priority**: Medium · **Effort**: M · **Depends on**: P0-05
- **Problem**: `@tanstack/react-query` is installed and `QueryProvider` is wired in `src/lib/providers/query-provider.tsx` / `layout.tsx:28`, but zero components use `useQuery`/`useMutation` — all fetching in `page.tsx` is raw `fetch` + `useState`/`useEffect`.
- **Task**: convert the project-list fetch in `src/app/page.tsx` to `useQuery(['projects'], ...)` calling `/api/plane?action=listProjects`, with standard loading/error states. This becomes the template other views follow in Phase 1.
- **Acceptance criteria**: project list loads via TanStack Query devtools showing a cached query; manual refresh (React Query `refetch`) works without a full page reload.

### P0-10 — Persistent query-cache table in Supabase
- **Priority**: Medium · **Effort**: M · **Depends on**: P0-04, P0-08
- **Task**: create a `query_cache` table (key, value JSON, expires_at) via the ORM from P0-04. Replace (or front) the in-memory `TTLCache` in `PlaneService` with a lookup against this table for the cacheable keys already identified in `client.ts` (`users_me`, `projects_{slug}`, `states_*`, `members_*`, `labels_*`, `cycles_*`, `modules_*`), so caching survives across serverless invocations, not just within one warm instance.
- **Acceptance criteria**: restarting the dev server (simulating a cold serverless instance) still serves a cached `listProjects()` response within the TTL window, sourced from Supabase not memory.

### P0-11 — Baseline test setup ⏳ Partially done
- **Priority**: Low · **Effort**: S · **Depends on**: —
- **Problem**: no test framework exists at all (no jest/vitest config, no `*.test.ts`, no test npm script).
- **Already done (pulled forward by P0-06)**: P0-06's acceptance criteria required a real unit test for `ActionPlanSchema`, which isn't possible without a test runner — so Vitest (`^4.1.11`), `vitest.config.mts` (with the `@/*` alias resolved for tests), and the `npm test` script (`vitest run`) were added then, along with `src/types/schemas.test.ts` (2 passing tests: valid/invalid `ActionPlan`).
- **Remaining for this task**: first unit tests for `src/lib/ai/intent-engine.ts`'s regex fallback `parseIntent()` (deterministic, easy to test).
- **Acceptance criteria**: `npm test` runs and passes with ≥2 real test cases. *(Already satisfied by the schema tests alone — this task is really just "also test `parseIntent()`" now.)*

---

## Phase 1 — Core Work Management

Goal: ship the UI/data flows that need **zero AI** so the app is useful standalone. Depends on Phase 0's `CurrentUserContext`, `ProjectService` pattern, and TanStack Query adoption.

### P1-01 — My Day dashboard
- **Priority**: Critical · **Effort**: L · **Depends on**: P0-01, P0-09
- **Task**: new dashboard view showing counts (due today, overdue, blocked, active) computed client- or server-side from `listIssues()` data, using `CurrentUserContext` for "my" filtering (not the old hardcoded UUID).
- **Acceptance criteria**: dashboard renders real counts for the current user's issues across the active project; no LLM call involved.

### P1-02 — Daily Briefing API (`GET /api/insights/daily`)
- **Priority**: Critical · **Effort**: M · **Depends on**: P0-05, P1-01
- **Task**: new route returning `{ summary: string | null, metrics: { active, dueToday, overdue, blocked }, recommendations: { taskId, reason }[] }`. `summary` stays `null`/omitted for now (AI text generation is Phase 2+) — this task only ships the deterministic `metrics`/`recommendations` shape. Implement as `InsightService.getDailyBriefing()` under `application/services/`.
- **Acceptance criteria**: route returns correct shape and numbers verified against a manual count in the Plane UI for a test project.

### P1-03 — Deterministic priority scoring
- **Priority**: Critical · **Effort**: M · **Depends on**: —
- **Task**: pure function `scoreTask(issue): number` (e.g. in `domain/work_items/scoring.ts`) combining urgency (due date proximity), priority field, and blocker count into one comparable score, used to power "Recommended Next Task" in the My Day dashboard.
- **Acceptance criteria**: unit test asserts a known overdue+high-priority+blocking task scores higher than a low-priority task with no due date (mirrors the PRD's sample test case in `testing.md`).

### P1-04 — Overdue/blocked task queries
- **Priority**: High · **Effort**: S · **Depends on**: P0-05
- **Task**: add filter helpers/endpoints for overdue (`dueDate < today && state !== done`) and blocked tasks, reusing `listIssues()` with client-side filtering (no new Plane endpoints needed).
- **Acceptance criteria**: My Day dashboard sections for "Overdue" and "Blocked" populate correctly.

### P1-05 — Wire Universal Command palette to real actions
- **Priority**: High · **Effort**: M · **Depends on**: P0-02
- **Problem**: `src/components/layout/CommandPalette.tsx`'s `commands` array (lines 14-20) is fully stubbed — `Create new issue` and `Search` are no-ops, and it has no connection to the intent engine or `/api/ai` at all.
- **Task**: wire "Go to ..." commands to actual navigation (if not already working), wire "Create new issue" to open the existing issue-creation flow, and wire "Search" to a real structured search against `listIssues()` (no LLM needed yet — natural-language search is Phase 2).
- **Acceptance criteria**: every command in the palette performs a real action; none are no-ops.

### P1-06 — Bulk action preview (no AI)
- **Priority**: Medium · **Effort**: M · **Depends on**: P0-06
- **Task**: for multi-select actions in `KanbanBoard.tsx`/`IssueCard.tsx` (e.g. bulk priority change), build an `ActionPlan` (using the P0-06 types) client-side and show a preview/diff before calling `/api/issues/bulk-update`-equivalent — this is the first place the `ActionPlan` preview UI gets built, ahead of the AI flow reusing it in Phase 2.
- **Acceptance criteria**: selecting 3 issues and changing priority shows a before/after list requiring explicit confirm before the Plane API is called.

### P1-07 — Dashboard refresh & cache invalidation
- **Priority**: Medium · **Effort**: S · **Depends on**: P0-10, P1-01
- **Task**: My Day dashboard auto-refreshes on an interval (e.g. 5 min) or manual refresh button, invalidating the relevant Supabase-backed cache entries from P0-10 rather than always hitting Plane directly.
- **Acceptance criteria**: manual refresh shows updated counts after an external change in Plane within one refresh cycle.

---

## Phase 2 — AI-Powered Command System

Goal: replace today's "parse intent → execute immediately" `/api/ai` route with the PRD's **Plan → Approve → Execute** flow, and split intent classification into a proper AI Router.

### P2-01 — Split AI Router out of `intent-engine.ts`
- **Priority**: High · **Effort**: L · **Depends on**: —
- **Problem**: `src/lib/ai/intent-engine.ts` currently conflates classification and response generation in one file with no explicit `none`/`light`/`heavy` routing — it's a single `gemini-2.5-flash` call (or regex fallback) doing everything.
- **Task**: extract an explicit `classifyIntentTier(intent): 'none' | 'light' | 'heavy'` step (deterministic intents like `list_issues`/`create_issue` with clear parameters → `none`; `search`/`categorize` → `light`; `decompose`/`summarize`/`plan` → `heavy`). This doesn't require multiple models yet (that's P2-05) — it just makes the routing decision explicit and testable instead of implicit in the current if/else chain.
- **Acceptance criteria**: unit tests assert each existing intent type maps to the expected tier.

### P2-02 — `/api/ai/plan` + `/api/ai/execute` (replace immediate-execute `/api/ai`)
- **Priority**: Critical · **Effort**: L · **Depends on**: P0-06, P2-01
- **Problem**: today `src/app/api/ai/route.ts` parses intent and calls `executeIntent()` (which mutates Plane) in the same request — there is no approval step anywhere.
- **Task**: split into `POST /api/ai/plan` (parses intent, returns an `ActionPlan` for mutating intents, or a direct answer for read-only/`chat` intents — no execution) and `POST /api/ai/execute` (accepts a previously-returned `ActionPlan`, re-validates it with `ActionPlanSchema` from P0-06, then runs the steps via `executor.ts`'s logic, now `ActionStep`-driven instead of switch-case-per-intent). Keep the old `/api/ai` route working during transition (or alias it to `/plan` immediately-followed-by-`/execute` for read-only intents) so the frontend migration in P2-03 isn't a hard cutover.
- **Acceptance criteria**: a mutating command (e.g. "update issue X priority") returns a plan from `/api/ai/plan` with `requiresApproval: true` and **does not** touch Plane until `/api/ai/execute` is called with that plan's id.

### P2-03 — `ActionPlan` approval UI
- **Priority**: High · **Effort**: M · **Depends on**: P2-02
- **Problem**: `src/components/ai/ActionCard.tsx` is a read-only result renderer today — no Approve/Reject buttons, no pending state.
- **Task**: add a pending-plan variant to `ActionCard`/`ChatInterface.tsx` showing the plan summary + step diff with Approve/Cancel buttons; Approve calls `/api/ai/execute`, Cancel discards it client-side. Read-only intents (list/search/chat) skip this and render immediately as before.
- **Acceptance criteria**: manually testing a mutating command in the chat UI shows a preview requiring a click before Plane is modified.

### P2-04 — Mutation audit log → Supabase
- **Priority**: Medium · **Effort**: M · **Depends on**: P0-04, P2-02
- **Task**: `action_plan_audit_log` table (id, user_id, intent, summary, approved_at, steps_json, result_json, success_count, fail_count) written on every `/api/ai/execute` call, matching the PRD's sample audit entry format in `domain_service.md`.
- **Acceptance criteria**: executing a plan creates one audit row queryable in Supabase with correct step counts.

### P2-05 — Model strategy: Flash vs Flash-Lite
- **Priority**: Low · **Effort**: S · **Depends on**: P2-01
- **Task**: introduce a second Gemini model call for `light`-tier intents (e.g. `gemini-2.5-flash-lite` if/when available on the account's free tier — verify exact current model name against Google's docs at implementation time, since the PRD's "Flash-Lite 3.1" naming may be stale) while keeping the existing `gemini-2.5-flash` for `heavy`-tier intents. This is explicitly deprioritized (`Low`) versus the approval-flow work above, since a single model works today.
- **Acceptance criteria**: `light`-tier intents route to the lite model, `heavy`-tier to the full model, verified via logged `model` field per call.

### P2-06 — AI response JSON schema validation
- **Priority**: High · **Effort**: S · **Depends on**: P0-06
- **Task**: every Gemini JSON-mode response in `intent-engine.ts`/the new `/api/ai/plan` handler gets run through `ActionPlanSchema.safeParse()` (or the appropriate intent schema) before being trusted; malformed output is rejected with a user-facing error instead of silently breaking downstream code.
- **Acceptance criteria**: feeding a deliberately malformed mock Gemini response results in a graceful rejection, not a crash or silent bad-data pass-through.

---

## Phase 3 — AI Work Context & Intelligence

Goal: the PRD's "heavy" AI features, built on top of the Plan→Approve→Execute flow from Phase 2.

### P3-01 — Task decomposition
- **Priority**: High · **Effort**: L · **Depends on**: P2-02
- **Task**: `/api/ai/plan` handles a `decompose` intent producing an `ActionPlan` whose steps are `createIssue` calls for each generated subtask, reviewed like any other plan.
- **Acceptance criteria**: "break this feature into subtasks" produces a reviewable plan creating N child issues on approval.

### P3-02 — Work plan generation
- **Priority**: Medium · **Effort**: L · **Depends on**: P3-01
- **Task**: `plan this sprint`/`plan this feature` intent generates a phased plan (editable before approval), reusing the decomposition step logic where possible.
- **Acceptance criteria**: output is an editable, structured plan matching the PRD's `ai_architecture.md` prompt example shape.

### P3-03 — AI triage of inbox items
- **Priority**: Medium · **Effort**: M · **Depends on**: P0-04
- **Task**: new `inbox_items` Supabase table + `GET/POST /api/inbox` (capture untriaged raw text) + `POST /api/inbox/:id/triage` (AI suggests title/project/labels, converts to a Plane issue on approval).
- **Acceptance criteria**: pasting raw text into the inbox and triaging it produces a correctly-labeled Plane issue after approval.

### P3-04 — Duplicate detection
- **Priority**: Medium · **Effort**: M · **Depends on**: —
- **Task**: before issue creation, run a string-similarity check (e.g. `fuzzball` — not currently installed, add as a dependency) against existing issue titles in the target project; show candidates, optionally ask the AI to describe why they're similar.
- **Acceptance criteria**: creating a near-duplicate title surfaces at least the one obvious match in a test project.

### P3-05 — Blocker & stale-work detection
- **Priority**: Medium · **Effort**: S · **Depends on**: P1-04
- **Task**: deterministic rules (no updates in 14 days = stale; explicit blocking relationship or missing assignee = blocked) surfaced in a dashboard section, with an optional AI-generated suggested resolution.
- **Acceptance criteria**: a manually-created stale/blocked test issue appears in the correct section.

### P3-06 — Weekly review summary
- **Priority**: Low · **Effort**: M · **Depends on**: P1-02
- **Task**: `GET /api/insights/weekly` mirroring `insights/daily`'s shape (completed/created/blocked counts), with an optional AI-generated text summary.
- **Acceptance criteria**: route returns correct week-over-week counts; AI summary is optional/omittable.

---

## Phase 4+ — Focus & Productivity

Goal: lower-priority enhancements once Phases 0-3 are stable. Sequence within this phase is flexible.

### P4-01 — Focus mode & next-task queue
- **Priority**: Medium · **Effort**: M · **Depends on**: P1-03
- **Task**: `GET /api/focus/next` (returns the highest-scored task not yet in focus), `POST /api/focus/complete` (marks done, advances queue).

### P4-02 — Automation rules (if/then)
- **Priority**: Low · **Effort**: L · **Depends on**: P0-04
- **Task**: simple rule engine (stored in Supabase) evaluated on a schedule or on relevant events; UI for creating rules.

### P4-03 — Git integration context
- **Priority**: Low · **Effort**: M · **Depends on**: —
- **Task**: fetch linked branch/PR/CI status from GitHub/GitLab APIs for display alongside an issue; no LLM involved.

### P4-04 — Multi-user / multi-workspace auth (future placeholder)
- **Priority**: Low · **Effort**: L · **Depends on**: P0-01
- **Task**: not scoped in detail yet — placeholder for when this stops being a single-user tool. Revisit `CurrentUserContext` (P0-01) design against real auth (e.g. Supabase Auth, given Supabase is already the storage layer) when this becomes a real requirement.

---

## Cross-cutting

### X-01 — Observability: `ai_usage` table
- **Priority**: Medium · **Effort**: M · **Depends on**: P0-04, P2-02
- **Task**: table matching the PRD's `ai_architecture.md` schema (`timestamp, feature, model, input_tokens, output_tokens, total_tokens, duration_ms, success, error`), written on every Gemini call (both `/api/ai/plan` classification calls and any `heavy` generation calls). Note `pino` is already installed but unused — consider it for structured request logging alongside this table rather than adding another logging dependency.
- **Acceptance criteria**: every Gemini call in dev produces one `ai_usage` row with non-null token counts.

### X-02 — Security hardening
- **Priority**: High · **Effort**: M · **Depends on**: P2-02
- **Task**: per-user/IP rate limiting on `/api/ai/*`, zod-based input validation on all mutating routes (not just AI ones), PII scrubbing before any text is sent to Gemini's free tier (per the PRD's `security.md` note that free-tier inputs may be used by Google to improve models), and sanitizing any AI-generated markdown/HTML rendered in the UI to prevent XSS.
- **Acceptance criteria**: a rate-limit test confirms 429s after the configured threshold on `/api/ai/*`; a fuzzed/malformed request body to a mutating route is rejected by zod before reaching business logic.
