# Erdavid Work OS — AI Engine & Interactive Command Task Breakdown

**Source Plan:** [`docs/AI-ENGINE-AND-INTERACTIVE-RESPONSE-PLAN.md`](./AI-ENGINE-AND-INTERACTIVE-RESPONSE-PLAN.md)  
**Supporting Specs:** [`docs/ai-engine-enhancement.md`](./ai-engine-enhancement.md) • [`docs/Interactive-AI-Response.md`](./Interactive-AI-Response.md)

This task backlog breaks down the **AI Intelligence Engine & Interactive Command Response** upgrade into 20 granular, independently-verifiable implementation tasks incorporating all findings from the Forensic Gap Analysis.

---

## 🚦 Phase Summary & Progress Tracker

| Phase | Focus Area | Tasks | Status |
| :--- | :--- | :--- | :--- |
| **Phase 1** | L0 Deterministic Parser & Intent Engine Fix | `AI-01` – `AI-03` | ⏳ Ready |
| **Phase 2** | Resilient Fuzzy Entity Resolver (Projects, States, Members) | `AI-04` – `AI-06` | ⏳ Ready |
| **Phase 3** | Interactive Work Item Cards & 0-Token Quick Actions | `AI-07` – `AI-09` | ⏳ Ready |
| **Phase 4** | Issue Preview Drawer & Clickable Entity Mentions | `AI-10` – `AI-12` | ⏳ Ready |
| **Phase 5** | Clarification Chips & Ambiguity Disambiguation | `AI-13` – `AI-14` | ⏳ Ready |
| **Phase 6** | Read-After-Write Verification & Operation Receipts | `AI-15` – `AI-16` | ⏳ Ready |
| **Phase 7** | Slash Commands (`/today`, `/overdue`, `/project`, `/plan`) | `AI-17` – `AI-18` | ⏳ Ready |
| **Phase 8** | Free Tier Budget Guard & Telemetry Mode Switching | `AI-19` – `AI-20` | ⏳ Ready |

---

## Phase 1 — L0 Deterministic Parser & Intent Engine Fix

### AI-01 — Replace Brittle Regex with Comprehensive L0 Deterministic Parser
- **Priority**: Critical · **Effort**: M · **Depends on**: —
- **Gap Addressed**: [Gap 1 & 2] Fixed greedy greeting regex and regex-miss chatbot bypass.
- **Task**: 
  1. Refactor `parseIntent()` in `src/lib/ai/intent-engine.ts` to support colloquial Indonesian and English variations:
     - `list_issues`: *"tampilkan tugasku"*, *"list task ku"*, *"ada task apa aja"*, *"tugas saya"*, *"show my issues"*, *"tugas urgent"*, *"task in progress"*.
     - `list_projects`: *"daftar project"*, *"list projects"*, *"ada project apa aja"*.
     - `create_issue`: *"buat task"*, *"tambah tiket"*, *"new issue"*.
     - `batch_create_issues`: multi-line task lists, numbered lists.
     - `decompose`: *"pecah feature"*, *"decompose"*, *"break down"*.
     - `update_issue`: *"pindahkan ke Done"*, *"ubah priority jadi urgent"*.
  2. Isolate `isPureGreeting` to strictly match standalone greetings (`/^(hai|halo|hi|hey|hello|p|tes|test|assalamu['a]?laikum)\s*[!.]*$/i`).
  3. When an L0 match occurs, execute directly via `executeIntent` with **0 Gemini calls**.
- **Files Touched**:
  - `src/lib/ai/intent-engine.ts`
- **Acceptance Criteria**:
  - Typing `"tampilkan tugasku"` returns real assigned issues with `Gemini calls = 0`.
  - Typing `"list task ku di project bsj phase 4"` extracts project `BSJ Phase 4` and returns issues with `Gemini calls = 0`.

---

### AI-02 — Dynamic Workspace Context Injection in `/api/ai/plan`
- **Priority**: High · **Effort**: S · **Depends on**: AI-01
- **Gap Addressed**: Injected real workspace projects, members, and state metadata into Gemini prompt.
- **Task**: In `src/app/api/ai/plan/route.ts`:
  1. Fetch active projects list `[{ id, identifier, name }]`, member list `[{ id, name, email }]`, and states list `[{ id, name, group }]` concurrently from `planeService`.
  2. Inject this structured context into `parseIntentAsync` and `buildActionPlanFromIntentAsync`.
  3. Default `projectKey` to the active project context if not specified in prompt.
- **Files Touched**:
  - `src/app/api/ai/plan/route.ts`
- **Acceptance Criteria**:
  - Gemini knows all valid project identifiers (e.g. `BSJ`) and names (e.g. `BSJ Phase 4`) and resolves entities accurately.

---

### AI-03 — Eliminate Hardcoded Placeholder in `ChatInterface.tsx`
- **Priority**: Medium · **Effort**: S · **Depends on**: AI-01
- **Gap Addressed**: [Gap 6] Removed legacy `'PROJECT1'` fallback.
- **Task**: Update `ChatInterface.tsx` to pass `projectId: activeProjectKey || activeProjectId || 'ALL'`.
- **Files Touched**:
  - `src/components/ai/ChatInterface.tsx`
- **Acceptance Criteria**:
  - Zero occurrences of hardcoded `'PROJECT1'` in `ChatInterface.tsx`.

---

## Phase 2 — Resilient Fuzzy Entity Resolver

### AI-04 — Multi-Attribute Fuzzy Project Resolution in `PlaneClient.ts`
- **Priority**: Critical · **Effort**: M · **Depends on**: AI-01
- **Gap Addressed**: [Gap 4] Added 5-tier fuzzy matching for project identifiers, names, and phase codes.
- **Task**: In `src/infrastructure/plane/PlaneClient.ts` `resolveProjectId()`:
  1. Check exact UUID match.
  2. Check exact identifier match (`BSJ`).
  3. Check exact name match (`BSJ Phase 4`).
  4. Check fuzzy substring matches (`name.toLowerCase().includes(query)` or `query.includes(name.toLowerCase())`).
  5. Check numeric suffix matching (`"bsj phase 4"` matches `"BSJ-4"` or `"BSJ"`).
- **Files Touched**:
  - `src/infrastructure/plane/PlaneClient.ts`
- **Acceptance Criteria**:
  - `planeService.resolveProjectId("bsj phase 4")` correctly returns the UUID of `BSJ Phase 4`.

---

### AI-05 — Indonesian State Name Normalizer in `PlaneClient.ts`
- **Priority**: High · **Effort**: S · **Depends on**: AI-04
- **Gap Addressed**: [Gap 5] Mapped Indonesian status terms to Plane state groups.
- **Task**: In `resolveStateId()` in `src/infrastructure/plane/PlaneClient.ts`:
  1. Map `"selesai"`, `"beres"`, `"kelar"`, `"done"`, `"completed"` ➔ state in group `completed`.
  2. Map `"sedang jalan"`, `"on progress"`, `"wip"`, `"started"`, `"in progress"` ➔ state in group `started`.
  3. Map `"todo"`, `"belum dimulai"`, `"unstarted"` ➔ state in group `unstarted`.
  4. Map `"backlog"`, `"tunda"` ➔ state in group `backlog`.
- **Files Touched**:
  - `src/infrastructure/plane/PlaneClient.ts`
- **Acceptance Criteria**:
  - Command `"pindahkan BSJ-12 ke selesai"` maps to the project's actual `Done` state UUID.

---

### AI-06 — Member Name & Assignee Fuzzy Resolver
- **Priority**: Medium · **Effort**: S · **Depends on**: AI-04
- **Task**: Add `resolveMemberId(projectId: string, query: string)` in `PlaneClient.ts` matching member first names, last names, and email prefixes.
- **Files Touched**:
  - `src/infrastructure/plane/PlaneClient.ts`
- **Acceptance Criteria**:
  - Prompt *"assign task BSJ-12 ke David"* resolves David's member UUID.

---

## Phase 3 — Interactive Work Item Cards & 0-Token Quick Actions

### AI-07 — Interactive `WorkItemResponse` Card Component
- **Priority**: Critical · **Effort**: M · **Depends on**: AI-01
- **Task**: In `src/components/ai/ActionCard.tsx`:
  1. Render task cards with sequence key badge (`BSJ-124`), priority indicator (`P0`–`P3`), status pill, and assignee avatar.
  2. Include Quick Action buttons on each task card: `[Complete]`, `[Assign]`, `[Open]`.
- **Files Touched**:
  - `src/components/ai/ActionCard.tsx`
- **Acceptance Criteria**:
  - Task query results render rich interactive cards with actionable buttons.

---

### AI-08 — Deterministic 0-Token Quick Action Handlers
- **Priority**: Critical · **Effort**: M · **Depends on**: AI-07
- **Gap Addressed**: [Gap 8] Direct proxy dispatch for inline card actions without calling Gemini.
- **Task**: Wire inline card buttons directly to Plane API proxy `/api/plane`:
  - `[Complete]`: Calls `PATCH /api/plane?action=updateIssue` with state `Done`.
  - `[Assign]`: Opens quick member dropdown and updates assignee.
  - All actions execute with **0 Gemini calls**.
- **Files Touched**:
  - `src/components/ai/ActionCard.tsx`
  - `src/components/ai/ChatInterface.tsx`
- **Acceptance Criteria**:
  - Clicking `[Complete]` on an issue card marks it Done in Plane without calling Gemini.

---

### AI-09 — Operation Receipt & Verification Result Display
- **Priority**: High · **Effort**: S · **Depends on**: AI-08
- **Task**: When a quick action finishes, render an inline verified receipt:
  `✓ BSJ-124 marked as Completed · Plane Synced`.
- **Files Touched**:
  - `src/components/ai/ActionCard.tsx`
- **Acceptance Criteria**:
  - Successful mutations display a green verified receipt.

---

## Phase 4 — Issue Preview Drawer & Clickable Entity Mentions

### AI-10 — Clickable Issue Mentions in AI Chat Stream
- **Priority**: High · **Effort**: M · **Depends on**: AI-07
- **Gap Addressed**: [Gap 7] Entity parser turns plain text issue IDs into interactive buttons.
- **Task**: In `ChatInterface.tsx`:
  1. Use regex parser to detect pattern `/\b([A-Z0-9]+-\d+)\b/g`.
  2. Render matched keys as interactive Cyan badges that trigger the **Issue Preview Drawer** on click.
- **Files Touched**:
  - `src/components/ai/ChatInterface.tsx`
- **Acceptance Criteria**:
  - Clicking `BSJ-124` anywhere in assistant messages opens the Issue Preview Drawer.

---

### AI-11 — Slide-Over Issue Preview Drawer Component
- **Priority**: High · **Effort**: M · **Depends on**: AI-10
- **Task**: Build `src/components/ai/IssuePreviewDrawer.tsx`:
  1. Slide-over drawer with Obsidian styling (`#0B0F14`).
  2. Displays issue title, description, state dropdown, priority selector, assignee, and dates.
  3. Supports quick editing with 0-token immediate persistence.
- **Files Touched**:
  - `src/components/ai/IssuePreviewDrawer.tsx` [NEW]
  - `src/components/ai/ChatInterface.tsx`
- **Acceptance Criteria**:
  - Drawer opens smoothly from right on desktop/bottom on mobile, allowing full task editing without leaving `/command`.

---

### AI-12 — Entity Hover Previews on Desktop
- **Priority**: Low · **Effort**: S · **Depends on**: AI-10
- **Task**: Hovering over an issue key shows a mini popover preview with title, status, and assignee.
- **Files Touched**:
  - `src/components/ai/ChatInterface.tsx`
- **Acceptance Criteria**:
  - Desktop hover reveals task metadata tooltip with 0 network calls.

---

## Phase 5 — Clarification Chips & Ambiguity Disambiguation

### AI-13 — Ambiguity Disambiguation Card
- **Priority**: High · **Effort**: M · **Depends on**: AI-04
- **Task**: In `executor.ts` / `intent-engine.ts`:
  1. If project match is ambiguous (e.g. user typed `"BSJ"` and multiple BSJ projects exist), return `CommandResponse` of type `'clarification'`.
  2. Render clickable chips: `[BSJ Phase 4]`, `[BSJ Phase 3]`, `[BSJ Core]`.
- **Files Touched**:
  - `src/lib/ai/executor.ts`
  - `src/components/ai/ActionCard.tsx`
- **Acceptance Criteria**:
  - Ambiguous queries present selectable options; clicking an option immediately resolves the action.

---

### AI-14 — 0-Token Clarification Click Handler
- **Priority**: High · **Effort**: S · **Depends on**: AI-13
- **Task**: When user clicks a clarification chip, dispatch the resolved intent directly to Plane API with 0 Gemini calls.
- **Files Touched**:
  - `src/components/ai/ChatInterface.tsx`
- **Acceptance Criteria**:
  - Selecting a clarification chip resolves and fetches tasks with 0 token overhead.

---

## Phase 6 — Read-After-Write Verification & Operation Receipts

### AI-15 — Verification Engine in `executor.ts`
- **Priority**: High · **Effort**: M · **Depends on**: AI-08
- **Gap Addressed**: [Gap 9] Read-after-write verification on state transitions.
- **Task**: In `src/lib/ai/executor.ts`:
  1. After calling `planeService.updateIssueState()` or `createIssue()`, re-fetch the issue via `planeService.getIssue()`.
  2. Verify that `issue.state` matches the target state.
  3. Return `verified: true` in the operation receipt.
- **Files Touched**:
  - `src/lib/ai/executor.ts`
- **Acceptance Criteria**:
  - ActionPlan execution validates state changes in Plane before returning verified confirmation.

---

### AI-16 — Multi-Step ActionPlan v2 Visualizer
- **Priority**: High · **Effort**: S · **Depends on**: AI-15
- **Task**: Update `ActionPlanCard.tsx` to display the upgraded lifecycle:
  `● ANALYZE ── ● CONTEXT ── ● PLAN ── ● REVIEW ── ○ EXECUTE ── ○ VERIFY`.
- **Files Touched**:
  - `src/components/ai/ActionPlanCard.tsx`
- **Acceptance Criteria**:
  - Step progression visually advances as batch operations execute and verify.

---

## Phase 7 — Slash Commands & Context Starters

### AI-17 — Deterministic Slash Commands in Chat Console
- **Priority**: High · **Effort**: M · **Depends on**: AI-01
- **Gap Addressed**: [Gap 10] Intercept `/today`, `/overdue`, `/blockers`, `/health`, `/project` in console.
- **Task**: In `ChatInterface.tsx`:
  1. Intercept slash commands in the input field:
     - `/today`: Displays today's priority tasks.
     - `/overdue`: Displays overdue tasks.
     - `/blockers`: Displays blocked tasks.
     - `/health`: Displays project health breakdown card.
     - `/project <name>`: Switches active project context.
     - `/plan <feature>`: Initiates feature decomposition.
  2. Execute `/today`, `/overdue`, `/blockers`, `/health`, and `/project` deterministically with **0 Gemini calls**.
- **Files Touched**:
  - `src/components/ai/ChatInterface.tsx`
- **Acceptance Criteria**:
  - Typing `/today` instantly returns today's tasks without calling Gemini.

---

### AI-18 — Dynamic Context-Aware Starter Chips
- **Priority**: Medium · **Effort**: S · **Depends on**: AI-17
- **Task**: On an empty chat screen, generate context-aware prompt chips based on live project data:
  - If overdue tasks exist: `[⚠ 5 Overdue Tasks — Review]`.
  - If unassigned tasks exist: `[✦ 3 Unassigned Tasks — Claim]`.
  - If project is healthy: `[● Project Health: 85% — View Briefing]`.
- **Files Touched**:
  - `src/components/ai/ChatInterface.tsx`
- **Acceptance Criteria**:
  - Starter chips reflect real workspace state rather than hardcoded static placeholders.

---

## Phase 8 — Free Tier Budget Guard & Telemetry Mode Switching

### AI-19 — Automatic AI Mode Degradation in `BudgetGuard.ts`
- **Priority**: Critical · **Effort**: M · **Depends on**: AI-01
- **Task**: In `src/lib/ai/router.ts`:
  1. Check daily request consumption from `ai_usage` table.
  2. **Normal Mode (<80% of 1,500 RPD)**: Standard routing.
  3. **Conservative Mode (80–95%)**: Auto-downgrades Flash to Flash-Lite or rule engine.
  4. **Safe Mode (>95%)**: Enforces pure deterministic L0 CRUD, ensuring 100% core app functionality remains available.
- **Files Touched**:
  - `src/lib/ai/router.ts`
  - `src/infrastructure/telemetry/ai-usage-logger.ts`
- **Acceptance Criteria**:
  - Simulated 95% quota automatically triggers Safe Mode without application crash.

---

### AI-20 — Full End-to-End Build & Test Verification
- **Priority**: Critical · **Effort**: S · **Depends on**: All tasks
- **Task**: Run `npm run build` to verify clean compilation across all 26 application routes.
- **Files Touched**:
  - All modified files
- **Acceptance Criteria**:
  - `npm run build` exits with code 0.
