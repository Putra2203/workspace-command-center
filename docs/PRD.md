# Plane AI Command Center — Product Requirements Document

**Version:** 0.1.0 (current implementation snapshot)
**Status:** Living document, generated from codebase analysis
**Last updated:** 2026-08-18

---

## 1. Overview

Plane AI Command Center is a web workspace that lets a user manage projects and issues hosted on [Plane](https://plane.so) through a conversational, natural-language interface (Indonesian and English), alongside a traditional Kanban board and issue list. Instead of clicking through Plane's own UI to create, list, or update tasks, the user types a command in plain language ("buat 3 task di BSJ7PHASE2: 1. Fix bug 2. Update UI 3. Test API") and the app parses the intent, calls the Plane REST API on the user's behalf, and renders the result as a structured card in the chat thread.

The app is a single-workspace, single-tenant tool (currently hardcoded around one user, "Erdavid," and Plane workspace) rather than a general multi-tenant SaaS product.

## 2. Problem Statement

Plane's native UI requires multiple clicks to create tasks, filter by assignee, or change status. For a fast-moving team, this is friction, especially for bulk operations (e.g., logging 5 tasks from a stand-up in one go) or quick status checks ("what's on my plate today?"). This app collapses those flows into a single chat message, and provides a lighter-weight Kanban view scoped to the current user.

## 3. Goals

- Let a user drive Plane project management (list, create, update, bulk-create issues) through natural-language chat.
- Provide a drag-and-drop Kanban board reflecting live Plane state, with changes persisted back to Plane.
- Default the experience to "my tasks" so a single user sees a personally relevant backlog, with a toggle to view the whole team's tasks.
- Work with or without an LLM key: intent parsing degrades gracefully from an LLM-based parser to a deterministic regex/keyword parser.

## 4. Non-Goals

- Multi-workspace or multi-tenant support (workspace slug and API host are single env-configured values).
- User authentication/authorization — there is no login flow; the "current user" is a hardcoded profile.
- Full parity with Plane's feature set (cycles, modules, and analytics views exist as navigation entries but are not fully built out — see §9 Known Gaps).
- Offline support or local persistence of issues (state is re-fetched from Plane on every project switch/action).

## 5. Target User

A single power user (or small team operating as one Plane workspace) who wants a faster, chat-driven way to triage and manage their Plane backlog without leaving a lightweight command console. The default "my tasks" scope is currently wired to one specific user profile (name: Erdavid, with a hardcoded user UUID fallback).

## 6. Core Features

### 6.1 AI Command Center (Chat Interface)
- Chat-style UI (`ChatInterface`) where the user types commands or questions in Indonesian or English.
- Each message is sent to `POST /api/ai`, which:
  1. Parses intent via `parseIntentAsync` (LLM-backed if `GEMINI_API_KEY`/`GOOGLE_API_KEY` is set, otherwise a deterministic fallback parser).
  2. Executes the resulting intent against the Plane API via `executeIntent` + `PlaneService`.
  3. Returns a text reply plus zero or more `ActionCard` payloads.
- Supported intents: `list_projects`, `list_issues`, `create_issue`, `batch_create_issues`, `get_issue`, `update_issue`, `help`, `chat` (conversational fallback), `unknown`.
- Bulk task creation: a single message describing multiple tasks (numbered list, bullet list, or comma/`dan`/`lalu`/`serta`-separated) is parsed into an array of titles and created concurrently in Plane.
- Results render as `ActionCard` components: success confirmations, error banners, and structured lists of created/listed issues.

### 6.2 Kanban Board
- `KanbanBoard` component (via `@dnd-kit`) renders Plane's issue **states** as columns and issues as draggable cards.
- Dragging a card to a new column optimistically updates local state, then persists the move via `PATCH /api/plane?action=updateIssue`; on failure the app re-fetches to reconcile.
- Assignee, priority, and issue key are shown on each card.

### 6.3 Issue List View
- Flat list view of all issues in the active project, with assignee, priority, and state badges, plus a manual "Refresh Data" action.
- Shows a permission-restricted empty state (see §6.6) and a "no tasks assigned" empty state with a one-click switch to "All Team" scope.

### 6.4 Project Switching & Sidebar
- `Sidebar` lists all Plane projects the API key has access to, with a dropdown to switch the active project (persisted in the Zustand store, not the URL).
- Sidebar collapses to icon-only width; a mirrored `MobileNav` bottom bar handles small screens.
- Navigation destinations: Command Center, Board, Issues, Cycles, Analytics.

### 6.5 Command Palette
- ⌘K / Ctrl+K opens a searchable command palette (`CommandPalette`) for keyboard-driven navigation between views (Command Center, Board, Issues) and stubbed actions (create issue, search) that are not yet wired to real behavior.

### 6.6 User Scope Filtering
- Global toggle between **"My Tasks"** (default) and **"All Team"**, available in both the header and sidebar.
- "My Tasks" filters issues client- and server-side by matching the assignee ID against a hardcoded user UUID or a name match against "erdavid"/"erdin".
- If the active project returns a 403 from Plane, the UI shows an "Access Restricted" state with a button to switch to a known-accessible fallback project (identifiers `BSJ7PHASE2` / `BSJ7PHASE3` are hardcoded fallbacks).

### 6.7 Analytics (placeholder)
- The "Analytics" nav destination renders a static placeholder screen; no chart data is wired up yet despite `recharts` being a dependency.

## 7. System Architecture

```
Browser (Next.js client components)
  ├─ ChatInterface ──POST /api/ai──────────┐
  ├─ KanbanBoard/IssueList ──/api/plane────┤
  └─ Sidebar/CommandPalette (Zustand store) │
                                            ▼
                              Next.js API Routes (server)
                              ├─ /api/ai   → intent-engine.ts → executor.ts
                              └─ /api/plane → PlaneService (direct proxy)
                                            │
                                            ▼
                                   PlaneService (axios client)
                                    - resolves project/state/issue keys → UUIDs
                                    - 60s in-memory TTL cache per server instance
                                    - retries once on 5xx
                                            │
                                            ▼
                                   Plane REST API (api.plane.so or self-hosted)

Optional: Gemini (@google/genai) for LLM-based intent parsing & conversational chat
```

### Key modules
| Path | Responsibility |
|---|---|
| `src/app/page.tsx` | Main client shell: data fetching, view routing, optimistic Kanban updates |
| `src/app/api/ai/route.ts` | Chat endpoint — parses intent, executes it, formats a reply |
| `src/app/api/plane/route.ts` | Thin REST proxy exposing Plane CRUD operations to the client |
| `src/lib/ai/intent-engine.ts` | Natural-language → structured intent (LLM + regex fallback) |
| `src/lib/ai/executor.ts` | Structured intent → Plane API calls → `ActionCard` payloads |
| `src/lib/plane/client.ts` | `PlaneService`: Plane API wrapper, key/name → UUID resolution, TTL cache |
| `src/stores/workspace-store.ts` | Zustand store: active project, view, user scope, sidebar/palette UI state |
| `src/components/board/*` | Kanban board + draggable issue cards (`@dnd-kit`) |
| `src/components/ai/*` | Chat message list + `ActionCard` renderer |
| `src/components/layout/*` | Sidebar, mobile nav, command palette |
| `src/types/*` | Shared TypeScript contracts for Plane entities and AI intents |

### External dependencies
- **Plane API** (`PLANE_API_HOST`, `PLANE_API_KEY`, `PLANE_WORKSPACE_SLUG`) — system of record for all project/issue data.
- **Google Gemini** (`GEMINI_API_KEY` / `GOOGLE_API_KEY`, model `gemini-2.5-flash`) — optional; powers LLM-based intent parsing and conversational replies. Without it, the app falls back to a regex/keyword-based intent parser and canned Indonesian greeting responses.
- **Next.js 16 / React 19** — application framework.
- **Zustand** — client-side UI/workspace state (no server persistence).
- **TanStack Query** — configured (`QueryProvider`) but not yet used for data fetching; current data fetching uses raw `fetch` + `useState`/`useEffect`.
- **@dnd-kit** — drag-and-drop for the Kanban board.
- **Tailwind CSS v4** — styling, dark theme only (`className="dark"` hardcoded on `<html>`).

## 8. Data Model (as consumed from Plane)

- `PlaneProject` — id, name, identifier (e.g. `BSJ7PHASE2`), member/cycle/module counts.
- `PlaneIssue` — id, name, sequence_id (human-readable key suffix), state, state_detail, priority, assignees, project_detail, timestamps.
- `PlaneState` — id, name, color, group (e.g. backlog/unstarted/started/completed/cancelled).
- `PlaneMember` — id + nested `PlaneUser` (first/last name, email).
- `PlaneLabel`, `PlaneIssueComment`, `PlaneCycle`, `PlaneModule` — supported by `PlaneService` but not yet surfaced in any UI view.

Identifier resolution is a core concern: users refer to projects/issues/states by human-readable keys ("BSJ7PHASE2", "BSJ7PHASE2-31", "Done"), and `PlaneService` resolves each of these to the UUIDs Plane's API actually requires, throwing descriptive errors (listing available options) when resolution fails.

## 9. Known Gaps / Technical Debt

- **No authentication.** The "current user" (Erdavid) and their UUID are hardcoded in three separate places (`workspace-store.ts`, `api/ai/route.ts`, `executor.ts`) rather than derived from a session — a genuine multi-user deployment cannot distinguish users today.
- **Cycles view is unreachable.** It's a valid `ViewType` and appears in the sidebar, but `page.tsx`'s view switch has no `case 'cycles'`, so it silently falls through to the default (chat) view.
- **Analytics is a static placeholder** despite `recharts` being installed.
- **Command Palette has stub actions** ("Create new issue," "Search") with empty handlers.
- **TanStack Query is installed and wrapped around the app but unused** — all data fetching is manual `fetch`/`useState`, so there's no caching, dedup, or background refetch beyond what's hand-rolled.
- **Server-side cache is per-instance and in-memory** (`TTLCache`, 60s TTL) — this will not stay consistent across multiple server instances/regions in a scaled deployment, and a create/update only invalidates the issues cache prefix, not projects/states/members.
- **Hardcoded fallback project identifiers** (`BSJ7PHASE2`, `BSJ7PHASE3`) leak a specific customer/workspace's naming into shared application code (see the permission-error recovery flow in `page.tsx`).
- **No automated tests** exist in the repository.
- **Graph health check flagged** minor structural issues in this codebase's own dependency graph (dangling edges from `store/workspace.ts` re-exporting `stores/workspace-store.ts`) — cosmetic, not functional, but worth a cleanup pass to remove the duplicate store path.

## 10. Environment Configuration

| Variable | Purpose | Required |
|---|---|---|
| `PLANE_API_HOST` (or `PLANE_API_URL`) | Base URL of the Plane instance (defaults to `https://api.plane.so`) | No (has default) |
| `PLANE_API_KEY` | API key sent as `x-api-key` to Plane | Yes |
| `PLANE_WORKSPACE_SLUG` | Target Plane workspace slug | Yes |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY` | Enables LLM-based intent parsing and conversational chat via Gemini | No (degrades gracefully) |

## 11. Success Metrics (proposed — not currently instrumented)

- Time to create/triage a task via chat vs. native Plane UI.
- % of chat messages resolved with `confidence` above a usable threshold without falling back to `unknown`.
- Kanban drag actions that fail to persist (currently only surfaced via `console.error`, not tracked).

*No analytics/telemetry is currently implemented in the codebase — these would need to be added to measure any of the above.*
