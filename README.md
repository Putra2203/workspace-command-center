<div align="center">

```text
  ███████╗██████╗ ██████╗  █████╗ ██╗   ██╗██╗██████╗ 
  ██╔════╝██╔══██╗██╔══██╗██╔══██╗██║   ██║██║██╔══██╗
  █████╗  ██████╔╝██║  ██║███████║██║   ██║██║██║  ██║
  ██╔══╝  ██╔══██╗██║  ██║██╔══██║╚██╗ ██╔╝██║██║  ██║
  ███████╗██║  ██║██████╔╝██║  ██║ ╚████╔╝ ██║██████╔╝
  ╚══════╝╚═╝  ╚═╝╚═════╝ ╚═╝  ╚═╝  ╚═══╝  ╚═╝╚═════╝ 
            W O R K   O S   //   M I S S I O N   C O N T R O L
```

# Erdavid Work OS — Mission Control AI Command Center

*A next-generation, NASA-inspired Autonomous Project Management & Intelligence OS powered by Google Gemini 2.5 and Plane API.*

[![Next.js](https://img.shields.io/badge/Next.js%2016-Turbopack-05070A?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React%2019-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript%205-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Google Gemini](https://img.shields.io/badge/Gemini%202.5-Flash%20%26%20Vision-8B5CF6?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![Plane](https://img.shields.io/badge/Plane%20API-Integration-38BDF8?style=for-the-badge&logo=airplayvideo&logoColor=white)](https://plane.so/)
[![Prisma](https://img.shields.io/badge/Prisma%20ORM%207-PostgreSQL-10B981?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS%20v4-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-FAFAFA?style=for-the-badge)](LICENSE)

[Features](#-core-features) • [System Architecture](#-system-architecture) • [Design System](#-mission-control-design-system) • [Quick Start](#-quick-start--installation) • [Telemetry](#-ai-token-telemetry--quota-observability) • [Keyboard Shortcuts](#-keyboard-shortcuts)

</div>

---

## 🛰️ Overview

**Erdavid Work OS** is a high-density, mission-critical workspace engineered for developers and teams who demand speed, clarity, and autonomous AI leverage. Built on top of **Next.js 16**, **React 19**, and **Plane API**, it transforms traditional issue tracking into an orbital command station with automated feature decomposition, visual bug triage, live token telemetry, and human-in-the-loop AI workflows.

---

## 🌟 Core Features

### 🤖 1. AI Mission Control Console (`/command`)
- **2-Tier Intelligent Router**: Automatically classifies incoming operator prompts into **Fast Path** (`Gemini 2.5 Flash Lite`) or **Deep Decomposition** (`Gemini 2.5 Flash`).
- **Feature Decomposition Engine**: Breaks down high-level epics and features into granular, dependency-linked frontend, backend, and testing subtasks.
- **Human-in-the-Loop ActionPlan Workflow**: Review, edit, and approve multi-step batch executions before changes touch your live Plane workspace (`● ANALYZE ── ● PLAN ── ● REVIEW ── ○ EXECUTE`).
- **Desktop 3-Column AI Console**:
  - *Left*: Chronological Mission Log Session History.
  - *Center*: Interactive Chat Stream, Vision Analyzer Dropzone, and ActionPlan Review Cards.
  - *Right*: Real-time Mission Context Panel (Active Scope, Engine State, PII Protection).

### 👁️ 2. Multi-Modal Vision Bug Triage
- Drag-and-drop screenshots or UI mockups directly into the AI console.
- Powered by **Google Gemini Vision** to extract bug reproduction steps, error traces, severity suggestions (`urgent`, `high`, `medium`), and label tags automatically.

### 📊 3. AI Token Telemetry & Quota Observability (`/telemetry`)
- **Gemini Free Tier Awareness**: Real-time progress bar tracking daily consumption against the **1,500 Requests / Day (RPD)** cap and **15 Requests / Min (RPM)** burst rate.
- **Live PostgreSQL Telemetry Stream**: Exact token inputs/outputs, latency measurements in milliseconds, and status logging stored in Supabase PostgreSQL.
- **Interactive Recharts Visualizations**: Area charts for Input vs Output token consumption curves and execution latency timelines.
- **Estimated Billing**: Always tracks real-time cost ($0.00 on Free Tier).

### 📋 4. Operations Board (`/board`)
- **Mission Kanban Board**: Responsive drag-and-drop columns (*Backlog, Unstarted, In Progress, Done*).
- **Monospace Technical Badges**: Monospace issue sequence identifiers and `P0`–`P3` priority badges.
- **Floating Bulk Action Toolbar**: Select multiple work items simultaneously to update priorities or batch reassign.

### ☀️ 5. Daily Operations Control (`/day`)
- **Primary Mission Focus Queue #1**: Highlighted focus track keeping operators locked onto their top priority task.
- **Keyboard-First Quick Task Capture (`+`)**: Capture tasks instantly without context switching.
- **Stale & Blocked Work Radar**: Detects dormant issues inactive for >3 days.
- **Unassigned Operations Pool**: One-click `[CLAIM]` button for instant task assignment.

### 📈 6. Velocity & Health Telemetry (`/analytics`)
- **Real-Time Project Health Score**: Automated 0–100% health calculation (`Healthy`, `At Risk`, `Critical`).
- **Throughput & Velocity Trend Curve**: Recharts dynamic area chart with 7-day and 30-day time range toggles.
- **Priority Distribution Donut & State Breakdown Bars**: Visual distribution of task states and priority tiers.
- **Cross-Project Workload Analyzer**: Horizontal stacked workload comparison across all projects in the workspace.

### 🛡️ 7. Enterprise Security & PII Protection
- **Automatic Client & Server PII Scrubber**: Masks emails, credentials, tokens, and sensitive keys before sending prompts to LLMs.
- **In-Memory & IP Rate Limiting**: Built-in sliding-window rate limiter preventing token exhaustion.

---

## 🏗️ System Architecture

```mermaid
graph TD
    subgraph Client["Client Tier (Mobile & Desktop)"]
        UI["Erdavid Work OS Shell\n(Next.js 16 • React 19 • Tailwind v4 • Motion)"]
        Zustand["Global Workspace Store\n(Active Project • Scope • Theme)"]
        ReactQuery["TanStack Query Cache\n(Issues • States • Projects)"]
    end

    subgraph Gateway["Application & Security Gateway"]
        AuthMid["Proxy Middleware & Route Handlers"]
        PIIGate["PII Scrubber & Rate Limiter"]
        Router["2-Tier AI Router & Intent Engine"]
    end

    subgraph External["Intelligence & Workspace Providers"]
        Gemini["Google Gemini 2.5 API\n(Flash Lite • Flash • Vision)"]
        Plane["Plane REST API Client\n(Workspaces • Issues • States • Cycles)"]
        Postgres[("Supabase PostgreSQL\n(Prisma 7 SQL Driver Adapter)")]
    end

    UI --> Zustand
    UI --> ReactQuery
    UI --> AuthMid
    AuthMid --> PIIGate
    PIIGate --> Router
    Router -->|Intent & Decomposition| Gemini
    Router -->|Execution & CRUD| Plane
    Router -->|Telemetry & Audit Logs| Postgres
    ReactQuery -->|Direct Fetch & Polling| Plane
```

---

## 🎨 Mission Control Design System

Built on a restrained **60-20-15-5** color hierarchy inspired by aerospace mission consoles:

| Layer / Role | Token Hex | CSS Variable | Purpose |
| :--- | :--- | :--- | :--- |
| **Obsidian Base (60%)** | `#05070A` | `--color-obsidian-950` | Primary application canvas |
| **Obsidian Secondary** | `#080B10` | `--color-obsidian-900` | Navigation sidebar & header |
| **Obsidian Surface** | `#0B0F14` | `--color-obsidian-800` | Cards, panels & data containers |
| **Obsidian Elevated** | `#10151C` | `--color-obsidian-700` | Active inputs & hovering items |
| **System Cyan (20%)** | `#38BDF8` | `--color-system-cyan` | Active states, primary metrics & board keys |
| **AI Purple (15%)** | `#8B5CF6` | `--color-ai-purple` | Intelligence layer, AI actions & suggestions |
| **Ambient Illumination (5%)** | Radial Orbs | `.ambient-lighting` | Subtle cyan & violet orbital glow |

---

## 🚀 Quick Start & Installation

### 1. Prerequisites
- **Node.js**: `v20.x` or higher
- **Package Manager**: `npm`, `pnpm`, or `bun`
- **Database**: PostgreSQL (Supabase, Neon, or local instance)
- **Plane Account**: API Key, Workspace Slug, and Project IDs from [plane.so](https://plane.so/)
- **Google AI Studio**: API Key from [Google AI Studio](https://aistudio.google.com/)

### 2. Clone Repository
```bash
git clone https://github.com/your-username/plane-ai-command-center.git
cd plane-ai-command-center
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create a `.env.local` file in the root directory:

```env
# Plane API Configuration
PLANE_API_KEY="your-plane-api-key"
PLANE_WORKSPACE_SLUG="your-workspace-slug"
PLANE_BASE_URL="https://api.plane.so"

# Google Gemini Intelligence
GEMINI_API_KEY="your-gemini-api-key"

# Database (Prisma ORM 7 + PostgreSQL)
DATABASE_URL="postgresql://postgres:password@db.supabase.co:5432/postgres"

# Next.js App URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

### 5. Initialize Database & Prisma Client
```bash
npx prisma generate
npx prisma db push
```

### 6. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Project Directory Structure

```text
plane-ai-command-center/
├── prisma/
│   └── schema.prisma               # Prisma 7 Database schema (Telemetry, Chat, Audit)
├── src/
│   ├── app/
│   │   ├── (workspace)/
│   │   │   ├── board/              # Mission Kanban Board route
│   │   │   ├── command/            # 3-Column AI Mission Console route
│   │   │   ├── cycles/             # Sprint iterations route
│   │   │   ├── day/                # Daily Operations Control route
│   │   │   ├── issues/             # Global Work Items Backlog route
│   │   │   ├── telemetry/          # AI Token & Quota Observability route
│   │   │   ├── analytics/          # System Velocity & Health route
│   │   │   └── layout.tsx          # Workspace Header & Navigation shell
│   │   ├── api/
│   │   │   ├── ai/                 # Intent, Plan, Execute, Telemetry, Sessions
│   │   │   └── plane/              # Plane REST API proxy & caching
│   │   └── globals.css             # Obsidian tokens, 40px grid, ambient lighting
│   ├── components/
│   │   ├── ai/                     # ChatInterface, ActionPlanCard, ActionCard
│   │   ├── board/                  # KanbanBoard, IssueCard, ColumnDropzone
│   │   ├── dashboard/              # MyDayDashboard, FocusModeBanner, QuickCapture
│   │   ├── layout/                 # Sidebar, MobileNav, CommandPalette
│   │   ├── telemetry/              # TelemetryDashboard, QuotaTracker, Charts
│   │   ├── ui/                     # TechnicalLabel, StatusIndicator, GlowContainer
│   │   └── work-items/             # WorkItemDetailPanel
│   ├── domain/                     # Pure business logic & health calculations
│   ├── infrastructure/             # PlaneClient, Prisma DB Client, Telemetry Loggers
│   ├── lib/                        # AI Router, Intent Engine, PII Scrubber, Context
│   └── stores/                     # Zustand Workspace & UI state stores
└── package.json
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action | Scope |
| :--- | :--- | :--- |
| <kbd>⌘</kbd> + <kbd>K</kbd> / <kbd>Ctrl</kbd> + <kbd>K</kbd> | Toggle Global Command Palette | Everywhere |
| <kbd>Enter</kbd> | Send AI prompt / Dispatch intent | AI Console & Quick Capture |
| <kbd>Shift</kbd> + <kbd>Enter</kbd> | Insert multiline prompt | AI Console |
| <kbd>Esc</kbd> | Close Detail Drawers & Modals | Workspace Shell |

---

## 🧪 Testing & Verification

```bash
# Run unit & integration test suites
npm test

# Run Next.js production build verification
npm run build
```

---

## 📄 License

This project is distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

<div align="center">

**Built with precision for engineering teams commanding their missions.**  
*Created by [David Putra](https://github.com/your-username).*

</div>
