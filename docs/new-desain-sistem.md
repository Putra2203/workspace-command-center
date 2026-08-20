# Erdavid Work OS — Mission Control / NASA Style

## Full Design & Implementation Plan

**Product:** Erdavid Work OS
**Design Direction:** Mission Control / NASA-inspired AI Command Center
**Version:** 1.0
**Status:** Implementation Ready
**Framework:** Next.js 16 + React 19 + Tailwind CSS v4
**Motion:** Motion for React (`motion/react`)
**Icons:** Lucide React
**State:** Zustand + TanStack Query v5
**Database:** Supabase PostgreSQL + Prisma 7
**AI:** Google Gemini 2.5 Flash Lite + Gemini 2.5 Flash
**Primary Integration:** Plane.so API

---

# 1. Executive Summary

Erdavid Work OS akan menggunakan pendekatan visual **Mission Control / NASA-inspired command center**.

Tujuan desain bukan membuat aplikasi terlihat seperti dashboard sci-fi biasa, tetapi menciptakan sebuah **professional digital operations center** untuk mengelola pekerjaan, project, task, AI execution, telemetry, dan workflow.

Prinsip utamanya:

> **Mission Control for Work.**

User harus merasa bahwa seluruh pekerjaan mereka berada dalam satu pusat kendali:

* Projects = Mission
* Tasks = Operations
* AI = Intelligence System
* Board = Operations Board
* My Day = Daily Mission
* AI Action Plan = Mission Plan
* Telemetry = System Telemetry
* Activity = Operations Log
* Priority = Mission Criticality
* Status = Operational State

Desain harus tetap:

* readable
* professional
* fast
* information-dense
* mobile-friendly
* accessible
* tidak berlebihan secara visual

---

# 2. Design Philosophy

## 2.1 Core Principle

### "Information First, Decoration Second"

Visual futuristik hanya digunakan untuk memperkuat hierarchy informasi.

Jangan membuat:

* neon berlebihan
* glow pada semua card
* gradient berlebihan
* animasi terus-menerus
* typography terlalu futuristic
* interface menyerupai game

Gunakan visual technical hanya pada:

* AI state
* system status
* active mission
* telemetry
* execution
* critical state
* selected navigation
* live activity

---

# 3. Design Personality

Erdavid Work OS harus terasa:

| Attribute         | Target    |
| ----------------- | --------- |
| Futuristic        | High      |
| Professional      | Very High |
| Technical         | High      |
| Minimal           | Medium    |
| Information Dense | High      |
| Sci-Fi            | Medium    |
| Gaming            | Very Low  |
| Enterprise        | High      |
| AI-native         | Very High |

Target visual:

> NASA Mission Control × Linear × Raycast × Modern AI Workstation

Bukan:

> Cyberpunk Dashboard × Gaming UI

---

# 4. Visual Language

## 4.1 Primary Visual Elements

Gunakan:

* thin technical borders
* subtle grid
* status indicators
* monospace metadata
* compact labels
* telemetry numbers
* horizontal separators
* small uppercase labels
* restrained glow
* dark surfaces
* technical coordinates
* system status indicators

Contoh:

```text
SYSTEM STATUS
● OPERATIONAL

ACTIVE MISSION
BSJ7 PHASE 1

TASK LOAD
████████████░░ 82%

AI ENGINE
● READY
```

---

# 5. Color System

## 5.1 Background

```text
--background:
#05070A

--background-secondary:
#080B10

--surface:
#0B0F14

--surface-elevated:
#10151C

--surface-hover:
#151B23
```

---

## 5.2 Border

```text
--border:
rgba(255,255,255,0.07)

--border-strong:
rgba(255,255,255,0.12)

--border-active:
rgba(56,189,248,0.45)
```

Borders harus sangat tipis.

---

# 6. Primary Accent

Primary operational color:

```text
CYAN

#38BDF8
```

Alternative:

```text
#22D3EE
```

Digunakan untuk:

* active navigation
* system status
* links
* selected state
* telemetry
* technical indicators
* interactive focus

---

# 7. AI Accent

AI harus memiliki identitas terpisah dari operational system.

```text
AI PURPLE

#8B5CF6

AI INDIGO

#6366F1
```

Digunakan untuk:

* AI processing
* AI suggestions
* Action Plan
* Gemini activity
* vision analysis
* AI-generated content
* AI command interface

Rule:

```text
CYAN   = SYSTEM
BLUE   = WORK
PURPLE = AI
GREEN  = SUCCESS
AMBER  = WARNING
RED    = CRITICAL
```

---

# 8. Semantic Status Colors

## Operational

```text
Success
#34D399

Warning
#FBBF24

Critical
#F43F5E

Info
#38BDF8
```

## Priority

```text
Urgent
#FB7185

High
#FB923C

Medium
#FBBF24

Low
#60A5FA
```

---

# 9. Typography

## 9.1 Primary Font

Gunakan font modern neutral untuk body:

```text
Inter
```

Alternative:

```text
Geist
```

## 9.2 Technical Font

Gunakan monospace hanya untuk:

* issue key
* telemetry
* system labels
* timestamps
* token count
* API status
* technical metadata

Recommended:

```text
JetBrains Mono
```

---

# 10. Typography Hierarchy

```text
Page Title
text-xl / text-2xl
font-semibold
tracking-tight

Section Title
text-sm
font-semibold

Technical Label
text-[10px]
uppercase
tracking-[0.16em]

Issue Key
text-xs
font-mono

Telemetry Value
text-lg / text-2xl
font-mono
```

Hindari penggunaan font futuristic untuk heading utama.

Technical feeling berasal dari **spacing, labels, borders, telemetry dan typography combination**, bukan dari font aneh.

---

# 11. Grid System

Tambahkan subtle technical grid pada background utama.

Konsep:

```text
┼────┼────┼────┼────┼
│    │    │    │    │
├────┼────┼────┼────┤
│    │    │    │    │
├────┼────┼────┼────┤
│    │    │    │    │
```

Opacity:

```text
0.02 - 0.04
```

Jangan membuat grid terlalu terlihat.

Contoh:

```css
background-image:
  linear-gradient(
    rgba(255,255,255,0.025) 1px,
    transparent 1px
  ),
  linear-gradient(
    90deg,
    rgba(255,255,255,0.025) 1px,
    transparent 1px
  );

background-size: 40px 40px;
```

---

# 12. Ambient Lighting

Gunakan maksimal 2–3 ambient lights.

Contoh:

```text
Top-left
Cyan

Top-right
Purple

Center-bottom
Blue
```

Opacity:

```text
0.04 - 0.10
```

Blur:

```text
100px - 160px
```

Ambient lighting tidak boleh mengganggu readability.

---

# 13. Surface Architecture

Gunakan tiga level surface.

## Level 1 — Base

```text
#05070A
```

## Level 2 — Workspace

```text
#0B0F14
```

## Level 3 — Elevated

```text
#10151C
```

## Level 4 — Floating

```text
rgba(16,21,28,0.92)
backdrop-blur-xl
```

---

# 14. Border Philosophy

Border harus menggantikan sebagian besar penggunaan shadow.

Default:

```text
border-white/[0.06]
```

Hover:

```text
border-white/[0.12]
```

Active:

```text
border-cyan-400/40
```

AI:

```text
border-violet-400/30
```

Critical:

```text
border-rose-400/40
```

---

# 15. Navigation Architecture

Desktop navigation:

```text
┌─────────────────────────┐
│ ERDAVID                 │
│ WORK OS                 │
├─────────────────────────┤
│                         │
│ ◉ MY DAY                │
│ ✦ COMMAND               │
│ ◫ BOARD                 │
│ ◇ PROJECTS              │
│                         │
│ ─ OPERATIONS ─          │
│                         │
│ ◉ INBOX                 │
│ ◉ ACTIVITY              │
│ ◉ ANALYTICS             │
│                         │
│ ─ SYSTEM ─              │
│                         │
│ ◉ AI TELEMETRY          │
│ ◉ SETTINGS              │
│                         │
├─────────────────────────┤
│ ● SYSTEM OPERATIONAL    │
│ v1.0.0                  │
└─────────────────────────┘
```

---

# 16. Navigation Behavior

Sidebar:

* fixed
* collapsible
* keyboard accessible
* tooltip ketika collapsed
* active state menggunakan cyan indicator
* AI route menggunakan purple indicator

Active navigation:

```text
┌──────────────────────────┐
│ ┃ ◉ MY DAY               │
└──────────────────────────┘
```

Gunakan vertical accent line daripada full-color background.

---

# 17. Header

Header tidak boleh terlalu tinggi.

Target:

```text
height: 56px
```

Isi:

```text
[Workspace] [Project]                [⌘K] [AI] [User]
```

Technical metadata dapat ditampilkan secara subtle:

```text
SYNC ●
API ●
AI ●
```

---

# 18. Command Palette

Global command:

```text
⌘ K
```

Command palette adalah salah satu core interaction.

Contoh:

```text
┌─────────────────────────────────────────────┐
│ > Search tasks, projects, or ask AI...      │
├─────────────────────────────────────────────┤
│                                             │
│ AI                                           │
│ ✦ Ask AI                                    │
│ ✦ Analyze screenshot                        │
│ ✦ Create task plan                           │
│                                             │
│ Navigation                                   │
│ → My Day                                     │
│ → Board                                      │
│ → Projects                                   │
│                                             │
│ Actions                                      │
│ + Create task                                │
│ ↗ Open project                               │
└─────────────────────────────────────────────┘
```

---

# 19. `/day` — Mission Dashboard

My Day menjadi:

> DAILY MISSION CONTROL

Header:

```text
DAILY OPERATIONS
20 AUG 2026

MISSION STATUS
● OPERATIONAL
```

---

# 20. Metrics Strip

Gunakan technical telemetry style.

```text
┌────────────┬────────────┬────────────┬────────────┐
│ OVERDUE    │ DUE TODAY  │ BLOCKED    │ ACTIVE     │
│    03      │     07     │     01     │     14     │
│ +2         │ 82% done   │ CRITICAL   │ RUNNING    │
└────────────┴────────────┴────────────┴────────────┘
```

Jangan menggunakan card yang terlalu besar.

---

# 21. Focus Queue

Label:

```text
PRIMARY MISSION QUEUE
```

Task:

```text
┌─────────────────────────────────────────────┐
│ ● BSJ7PHASE1-31                  PRIORITY 1 │
│                                             │
│ Implement Xendit bank account flow          │
│                                             │
│ ENGINEERING · DUE TODAY                     │
│                                             │
│ [OPEN]                         →            │
└─────────────────────────────────────────────┘
```

---

# 22. Focus State

Task aktif mendapat:

```text
cyan border
subtle cyan glow
```

Bukan seluruh card diberi neon.

---

# 23. Unassigned Ticket Pool

Gunakan konsep:

```text
UNASSIGNED OPERATIONS
```

Setiap task:

```text
BSJ7PHASE1-42
Fix webhook retry handling

UNASSIGNED
[CLAIM]
```

Claim button:

```text
cyan
```

---

# 24. Quick Capture

Quick task input:

```text
┌──────────────────────────────────────────────┐
│ + CAPTURE NEW TASK                            │
│                                              │
│ What needs to be done?                       │
│                                              │
│                                      [ENTER] │
└──────────────────────────────────────────────┘
```

Keyboard-first.

---

# 25. `/board` — Operations Board

Board menggunakan visual:

> MISSION OPERATIONS BOARD

Header:

```text
OPERATIONS BOARD
BSJ7 PHASE 1

SYNC ● LIVE
```

---

# 26. Kanban Column

Column:

```text
┌───────────────────────────┐
│ BACKLOG             12    │
│ ───────────────────────   │
│                           │
│ task                       │
│ task                       │
│ task                       │
│                           │
│ + ADD TASK                │
└───────────────────────────┘
```

Header column menggunakan:

* technical label
* count
* status indicator

---

# 27. Task Card

Task card harus compact.

```text
┌──────────────────────────────────┐
│ BSJ7PHASE1-31              P1    │
│                                  │
│ Implement bank account flow      │
│                                  │
│ ERDIN · API                      │
│                                  │
│ ● ACTIVE                         │
└──────────────────────────────────┘
```

Hover:

* border brighten
* slight translateY
* no excessive scale

---

# 28. Drag & Drop

Saat drag:

```text
opacity: .75
scale: 1.02
border: cyan
box-shadow: subtle cyan
```

Drop zone:

```text
border-cyan-400/30
background-cyan-400/[0.02]
```

---

# 29. Mobile Board

Tetap menggunakan:

```text
w-[85vw]
snap-center
```

Tambahkan:

```text
MISSION BOARD
← swipe →
```

Jangan membuat column terlalu sempit.

---

# 30. `/command` — AI Mission Control

Ini adalah **visual centerpiece** aplikasi.

Header:

```text
AI COMMAND CENTER

GEMINI INTELLIGENCE SYSTEM
● ONLINE
```

---

# 31. AI Workspace Layout

Desktop:

```text
┌─────────────┬──────────────────────────┬─────────────┐
│ HISTORY     │                          │ CONTEXT     │
│             │      AI COMMAND          │             │
│ Session 01  │                          │ PROJECT     │
│ Session 02  │  conversation            │ BSJ7        │
│ Session 03  │                          │             │
│             │  action plan             │ TASKS       │
│ + NEW       │                          │ 42 ACTIVE   │
│             │                          │             │
│             │  input                   │ SYSTEM      │
│             │                          │ ● ONLINE    │
└─────────────┴──────────────────────────┴─────────────┘
```

---

# 32. AI Conversation

AI response tidak boleh hanya berupa bubble chatbot.

Gunakan:

```text
SYSTEM ANALYSIS
───────────────

I found 4 related issues.

RELATED OPERATIONS
01 BSJ7PHASE1-31
02 BSJ7PHASE1-32
03 BSJ7PHASE1-41
04 BSJ7PHASE1-44
```

AI memiliki visual language seperti system output.

---

# 33. AI Processing State

Saat Gemini sedang bekerja:

```text
┌────────────────────────────────────┐
│ ✦ AI PROCESSING                    │
│                                    │
│ Analyzing project context...       │
│                                    │
│ ● Resolving workspace              │
│ ● Searching related tasks          │
│ ◌ Generating recommendation        │
└────────────────────────────────────┘
```

Gunakan animated pulse pada indicator.

---

# 34. Dual-Tier AI Indicator

Fast tier:

```text
FAST
● FLASH-LITE
```

Heavy tier:

```text
DEEP
● FLASH
```

Contoh:

```text
AI ENGINE
────────────────

FAST ROUTE      ● READY
DEEP ROUTE      ● READY
VISION          ● READY
```

Jangan tampilkan nama model secara agresif kepada user kecuali berguna.

---

# 35. Action Plan Card

Ini harus menjadi signature component.

```text
╭─────────────────────────────────────────────╮
│ ✦ PROPOSED MISSION PLAN                    │
│                                             │
│ CREATE 4 WORK ITEMS                         │
│                                             │
│ ┌─────────────────────────────────────────┐ │
│ │ 01  Authentication API                  │ │
│ │ 02  Frontend login flow                │ │
│ │ 03  Session handling                   │ │
│ │ 04  Integration testing                │ │
│ └─────────────────────────────────────────┘ │
│                                             │
│ RISK LEVEL                                  │
│ ● LOW                                       │
│                                             │
│ [ EDIT PLAN ]             [ APPROVE ]       │
╰─────────────────────────────────────────────╯
```

AI card:

* purple accent
* subtle glow
* technical labels
* explicit risk
* human approval

---

# 36. Risk Visualization

```text
LOW
●

MEDIUM
● ●

HIGH
● ● ●
```

Alternative:

```text
RISK
████░░ LOW
```

Jangan gunakan warna saja.

Selalu kombinasikan:

* icon
* text
* color

untuk accessibility.

---

# 37. Screenshot-to-Task

Upload UI harus terasa seperti **vision analysis console**.

```text
┌──────────────────────────────────────────┐
│ VISION ANALYSIS                          │
│                                          │
│ ┌──────────────────────────────────────┐ │
│ │                                      │ │
│ │          DROP SCREENSHOT             │ │
│ │                                      │ │
│ │       PNG / JPG · MAX 5MB            │ │
│ │                                      │ │
│ └──────────────────────────────────────┘ │
│                                          │
│ [ ANALYZE WITH AI ]                      │
└──────────────────────────────────────────┘
```

---

# 38. Vision Processing

```text
VISION ENGINE
──────────────

IMAGE RECEIVED

● Detecting interface elements
● Identifying visual issue
● Extracting reproduction steps
● Assigning priority
● Mapping project
```

---

# 39. Vision Result

```text
AI GENERATED ISSUE

TITLE
Button overlaps mobile navigation

PRIORITY
HIGH

LABELS
UI · MOBILE · BUG

REPRODUCTION
01 Open /command
02 Scroll to bottom
03 Open keyboard

CONFIDENCE
92%
```

---

# 40. Duplicate Detection

Jangan tampilkan sebagai error.

Gunakan:

```text
SIMILAR OPERATIONS DETECTED
```

Contoh:

```text
⚠ SIMILAR OPERATIONS DETECTED

BSJ7PHASE1-31
Similarity: 84%

BSJ7PHASE1-42
Similarity: 71%

[VIEW MATCHES]
```

User tetap dapat melanjutkan.

---

# 41. Batch Task Creation

Gunakan technical parser visualization.

Input:

```text
1. Setup authentication : Configure OAuth flow
2. Create API endpoint : Add POST /auth/login
3. Build login UI : Implement responsive login
```

Preview:

```text
PARSED OPERATIONS
─────────────────

01
TITLE
Setup authentication

DESCRIPTION
Configure OAuth flow

STATUS
READY
```

---

# 42. Plan → Approve → Execute

Workflow wajib divisualisasikan secara eksplisit.

```text
ANALYZE
   ↓
PLAN
   ↓
REVIEW
   ↓
APPROVE
   ↓
EXECUTE
   ↓
VERIFY
```

Gunakan progress indicator.

Contoh:

```text
● ANALYZE ── ● PLAN ── ● REVIEW ── ○ EXECUTE
```

---

# 43. Execution State

Ketika AI melakukan mutation:

```text
EXECUTION IN PROGRESS

01 Create task             ✓
02 Assign project          ✓
03 Apply labels            ✓
04 Add description         ●
05 Verify                  ○
```

Jangan membuat UI freeze.

Semua operation harus incremental.

---

# 44. Execution Success

```text
MISSION COMPLETE

4 OPERATIONS EXECUTED
0 ERRORS
0 DUPLICATES

[ VIEW CREATED TASKS ]
```

---

# 45. Persistent Chat History

History drawer:

```text
MISSION LOG

TODAY
────────────────

21:32  Create authentication tasks
20:14  Analyze payment screenshot
18:45  Find overdue tasks

YESTERDAY
────────────────

16:22  Project status analysis
```

Gunakan timestamp monospace.

---

# 46. Work Item Bottom Sheet

Bottom sheet tetap menggunakan:

```text
bg-[#0B0F14]
border-white/[0.08]
```

Header:

```text
BSJ7PHASE1-31
● ACTIVE

Implement bank account flow
```

Metadata:

```text
PROJECT
BSJ7

ASSIGNEE
ERDIN

PRIORITY
HIGH

DUE
TODAY
```

---

# 47. Bottom Sheet Motion

Gunakan spring physics.

Target:

```text
stiffness: 400
damping: 35
```

Gesture:

```text
drag="y"
dragConstraints={{ top: 0 }}
```

Dismiss threshold:

```text
velocity > threshold
OR
offset > 120px
```

---

# 48. AI State Motion

AI processing:

```text
opacity pulse
scale: 1 → 1.02
```

Durasi:

```text
1.5 - 2s
```

Tidak menggunakan infinite heavy animation.

---

# 49. Motion Principles

## Fast Interaction

```text
120–180ms
```

## Normal Transition

```text
200–300ms
```

## Bottom Sheet

```text
spring
```

## Major Panel

```text
300–450ms
```

## AI Streaming

Gunakan content streaming tanpa animasi per-character.

---

# 50. System Telemetry

Buat halaman:

```text
/analytics/telemetry
```

atau:

```text
/system
```

Visual:

```text
SYSTEM TELEMETRY

┌─────────────────┬─────────────────┐
│ API HEALTH      │ AI LATENCY      │
│ ● 99.9%         │ 842ms           │
├─────────────────┼─────────────────┤
│ AI REQUESTS     │ TOKEN USAGE     │
│ 284             │ 18.4K           │
└─────────────────┴─────────────────┘
```

---

# 51. AI Usage

Karena aplikasi menggunakan Gemini, telemetry menjadi bagian penting dari product experience.

Tampilkan:

```text
AI OPERATIONS

FAST ROUTE
████████████░░ 78%

DEEP ROUTE
███████░░░░░░ 42%

VISION
████░░░░░░░░░ 24%
```

Metrics:

* requests
* latency
* tokens
* errors
* route distribution
* average response time
* estimated cost

Jangan expose sensitive credentials.

---

# 52. System Status

Global status component:

```text
┌─────────────────────────────┐
│ SYSTEM STATUS               │
│                             │
│ API             ● ONLINE    │
│ DATABASE        ● ONLINE    │
│ PLANE           ● ONLINE    │
│ GEMINI          ● ONLINE    │
│ SYNC            ● LIVE      │
└─────────────────────────────┘
```

Status dapat dikompresi menjadi:

```text
● SYSTEM OPERATIONAL
```

---

# 53. Activity Log

Gunakan format operations log:

```text
21:43:12
AI
Created BSJ7PHASE1-52

21:42:58
USER
Moved BSJ7PHASE1-31 → DONE

21:40:11
SYSTEM
Workspace synchronized
```

Timestamp:

```text
font-mono
```

---

# 54. Mobile Architecture

Mobile tidak boleh menjadi desktop yang diperkecil.

Navigation:

```text
┌──────────────────────────────┐
│                              │
│         CONTENT              │
│                              │
│                              │
├──────────────────────────────┤
│ DAY │ BOARD │ ✦ AI │ PROJECT │
└──────────────────────────────┘
```

---

# 55. Mobile Navigation

AI button menjadi center action.

```text
DAY       BOARD       ✦       PROJECTS
```

AI button:

* slightly elevated
* purple accent
* circular/rounded-square
* subtle glow

---

# 56. Mobile Header

Minimal:

```text
┌──────────────────────────────┐
│ BSJ7       ● LIVE       ⌘K   │
└──────────────────────────────┘
```

Jangan menaruh terlalu banyak controls.

---

# 57. Mobile AI Command

Full-screen command experience:

```text
┌──────────────────────────────┐
│ AI COMMAND              ×    │
├──────────────────────────────┤
│                              │
│ conversation                 │
│                              │
│ action plan                  │
│                              │
│                              │
├──────────────────────────────┤
│ Ask AI...               ↑    │
└──────────────────────────────┘
```

---

# 58. Mobile Bottom Sheet

Gunakan safe-area:

```css
pb-[max(1.5rem,env(safe-area-inset-bottom))]
```

Handle:

```text
──────
```

Tidak perlu modal close button besar.

---

# 59. Responsive Breakpoints

```text
< 640px
Mobile

640–1024px
Tablet

1024–1280px
Desktop

> 1280px
Command Center
```

Pada layar besar, gunakan whitespace untuk membuat interface terasa seperti operations center.

---

# 60. Component Architecture

Buat design system berdasarkan semantic component.

```text
components/
├── command/
│   ├── CommandPalette
│   ├── AIWorkspace
│   ├── AIMessage
│   ├── AIProcessingState
│   ├── ActionPlanCard
│   ├── ExecutionTimeline
│   ├── VisionUploader
│   ├── VisionResult
│   └── DuplicateWarning
│
├── mission/
│   ├── MissionHeader
│   ├── MissionStatus
│   ├── MissionMetrics
│   ├── FocusQueue
│   └── MissionTaskCard
│
├── board/
│   ├── OperationsBoard
│   ├── BoardColumn
│   ├── WorkItemCard
│   └── BulkActionBar
│
├── system/
│   ├── SystemStatus
│   ├── TelemetryCard
│   ├── ActivityLog
│   └── ServiceStatus
│
├── navigation/
│   ├── Sidebar
│   ├── MobileNav
│   ├── WorkspaceSwitcher
│   └── GlobalCommand
│
└── ui/
    ├── TechnicalLabel
    ├── StatusIndicator
    ├── DataGrid
    ├── GlowContainer
    └── TechnicalDivider
```

---

# 61. Technical Label Component

Reusable:

```tsx
<TechnicalLabel>
  SYSTEM STATUS
</TechnicalLabel>
```

Style:

```text
text-[10px]
uppercase
tracking-[0.16em]
font-medium
text-zinc-500
```

---

# 62. Status Indicator

API:

```tsx
<StatusIndicator
  status="online"
  label="SYSTEM OPERATIONAL"
/>
```

States:

```text
online
processing
warning
error
offline
```

---

# 63. Technical Divider

Gunakan divider dengan label:

```text
──────── OPERATIONS ────────
```

atau:

```text
── SYSTEM TELEMETRY ──
```

Ini menjadi visual signature.

---

# 64. Glow Container

Jangan membuat generic glow card.

Gunakan hanya untuk:

* AI
* active mission
* system critical state

API:

```tsx
<GlowContainer variant="ai">
```

Variants:

```text
system
ai
critical
success
```

---

# 65. Design Tokens

Buat centralized CSS variables.

Contoh:

```css
:root {
  --color-bg: #05070A;
  --color-surface: #0B0F14;
  --color-surface-elevated: #10151C;

  --color-system: #38BDF8;
  --color-work: #60A5FA;
  --color-ai: #8B5CF6;

  --color-success: #34D399;
  --color-warning: #FBBF24;
  --color-critical: #F43F5E;

  --border-subtle: rgba(255,255,255,0.06);
  --border-default: rgba(255,255,255,0.08);
  --border-strong: rgba(255,255,255,0.12);
}
```

---

# 66. Tailwind Strategy

Jangan menyebarkan arbitrary colors ke seluruh aplikasi.

Hindari:

```tsx
bg-[#05070A]
border-white/[0.07]
text-[#38BDF8]
```

berulang di setiap file.

Gunakan semantic classes:

```tsx
bg-background
bg-surface
border-subtle
text-system
text-ai
```

Tujuannya agar redesign berikutnya mudah dilakukan.

---

# 67. AI Theme Tokens

```css
--ai-primary: #8B5CF6;
--ai-secondary: #6366F1;
--ai-glow: rgba(139,92,246,0.12);
--ai-border: rgba(139,92,246,0.28);
```

AI component:

```text
background:
rgba(139,92,246,.04)

border:
rgba(139,92,246,.22)

glow:
rgba(139,92,246,.08)
```

---

# 68. Accessibility

Mission Control aesthetic tidak boleh mengorbankan accessibility.

Minimum:

* WCAG AA contrast
* keyboard navigation
* focus ring
* reduced motion
* semantic HTML
* aria labels
* color + icon + text status

Implement:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

# 69. Performance

Jangan menggunakan:

* giant blur layers
* multiple backdrop filters
* animated gradients everywhere
* continuous canvas animation

Prioritas:

```text
CSS gradients
CSS opacity
transform
GPU-friendly animation
```

Glow hanya beberapa layer.

---

# 70. Animation Budget

Maximum simultaneously animated visual elements:

```text
Desktop
≤ 5

Mobile
≤ 3
```

AI processing dapat menggunakan satu primary animation.

---

# 71. Loading States

Jangan menggunakan generic spinner.

Gunakan:

```text
SYSTEM INITIALIZING...

● CONNECTING PLANE
● CONNECTING DATABASE
● INITIALIZING AI
○ LOADING WORKSPACE
```

Namun splash hanya tampil saat initial boot sesuai architecture yang sudah ada.

---

# 72. Skeleton Loading

Skeleton tetap minimal.

```text
████████████████
██████████
██████████████████
```

Gunakan shimmer yang sangat subtle.

---

# 73. Empty State

Jangan:

> No tasks found.

Gunakan:

```text
NO ACTIVE OPERATIONS

Your mission queue is clear.

[ CAPTURE NEW TASK ]
```

Untuk project:

```text
NO ACTIVE MISSIONS

Create or select a project
to begin operations.
```

---

# 74. Error State

Contoh:

```text
SYSTEM INTERRUPTION

Unable to synchronize with Plane.

STATUS
API_TIMEOUT

[ RETRY ]
```

Jangan menggunakan generic red alert tanpa konteks.

---

# 75. AI Error State

```text
AI OPERATION INTERRUPTED

The intelligence service could not
complete the requested operation.

ERROR
RATE_LIMITED

[ RETRY ]
[ VIEW DETAILS ]
```

---

# 76. Microcopy System

Gunakan vocabulary konsisten.

| Standard  | Mission Control       |
| --------- | --------------------- |
| Dashboard | Command Center        |
| Task      | Work Item / Operation |
| Project   | Mission               |
| AI Chat   | AI Command            |
| AI Plan   | Mission Plan          |
| Execute   | Execute Mission       |
| Loading   | Initializing          |
| Error     | System Interruption   |
| Success   | Mission Complete      |
| Activity  | Operations Log        |
| Analytics | Telemetry             |
| Status    | Operational State     |
| Settings  | System Configuration  |

Tetapi jangan memaksakan terminology tersebut pada setiap tempat.

Contohnya backend tetap boleh menggunakan `task`, `project`, `work item`.

---

# 77. Important UX Rule

Brand language harus menjadi **layer**, bukan obstacle.

User tetap harus langsung memahami:

```text
Task
Project
Priority
Due date
Assignee
```

Jangan mengganti semuanya dengan istilah militer/sci-fi yang membingungkan.

---

# 78. Page-Level Visual Map

```text
MY DAY
Obsidian + Mission Control
        ↓
Daily Operations

BOARD
Operations Control
        ↓
Project Execution

COMMAND
Nebula + AI Control
        ↓
Intelligence Layer

WORK ITEM
Obsidian
        ↓
Detailed Execution

TELEMETRY
NASA-inspired
        ↓
System Observability
```

---

# 79. Recommended Desktop Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ ERDAVID WORK OS                    SYNC ●   AI ●   ⌘K       │
├────────────┬────────────────────────────────────────────────┤
│            │                                                │
│ NAVIGATION │               MAIN WORKSPACE                  │
│            │                                                │
│ MY DAY     │  PAGE HEADER                                  │
│ COMMAND    │                                                │
│ BOARD      │  ──────────────────────────────────────────    │
│ PROJECTS   │                                                │
│            │  CONTENT                                       │
│ OPERATIONS │                                                │
│ ACTIVITY   │                                                │
│            │                                                │
│ SYSTEM     │                                                │
│ TELEMETRY  │                                                │
│ SETTINGS   │                                                │
│            │                                                │
│ ● ONLINE   │                                                │
└────────────┴────────────────────────────────────────────────┘
```

---

# 80. Recommended Command Layout

```text
┌────────────┬──────────────────────────┬───────────────┐
│ HISTORY    │ AI COMMAND               │ CONTEXT       │
│            │                          │               │
│ Session    │ SYSTEM ANALYSIS          │ CURRENT      │
│ Session    │                          │ PROJECT      │
│ Session    │ User input               │               │
│            │                          │ TASKS         │
│ + NEW      │ AI response              │               │
│            │                          │               │
│            │ ACTION PLAN              │ AI ENGINE     │
│            │                          │ ● READY       │
└────────────┴──────────────────────────┴───────────────┘
```

---

# 81. Context Panel

Context panel dapat menampilkan:

```text
CURRENT CONTEXT

PROJECT
BSJ7 PHASE 1

ACTIVE TASKS
14

BLOCKED
2

RECENT
5

AI ROUTE
FAST
```

Jika user memilih task:

```text
SELECTED WORK ITEM

BSJ7PHASE1-31

PRIORITY
HIGH

STATUS
IN PROGRESS

ASSIGNEE
ERDIN
```

---

# 82. Workspace Switcher

Workspace switcher harus terasa seperti mission selector.

```text
CURRENT MISSION

BSJ7
────────────────

ALL MISSIONS
BSJ7
JOMTERBANG
PROJECT X
PROJECT Y
```

ALL mode harus sangat jelas.

```text
ALL MISSIONS
● 11 PROJECTS
● 482 WORK ITEMS
```

---

# 83. ALL Projects Mode

Visual:

```text
GLOBAL OPERATIONS

11 ACTIVE MISSIONS
482 WORK ITEMS

● SYNCED
```

Saat AI bekerja:

```text
SEARCHING GLOBAL OPERATIONS...
```

Bukan hanya:

```text
Loading...
```

---

# 84. Global Search

Search result:

```text
GLOBAL SEARCH
────────────────────────

WORK ITEMS

BSJ7PHASE1-31
Implement payment flow

JOMTERBANG-30
Payment verification

PROJECTS

BSJ7
JOMTERBANG
```

---

# 85. User Interaction Model

Prioritas interaction:

```text
Keyboard
   ↓
Mouse
   ↓
Touch
```

Support:

```text
⌘ K
⌘ /
⌘ Enter
Esc
Arrow keys
Enter
```

---

# 86. Command Shortcuts

Recommended:

```text
⌘K
Global Command

C
Create task

A
Ask AI

B
Board

D
My Day

P
Projects

Esc
Close panel
```

Shortcut overlay dapat dibuka melalui:

```text
?
```

---

# 87. AI Keyboard Flow

User:

```text
⌘K
```

kemudian:

```text
Ask AI
```

kemudian:

```text
"Break this feature into frontend and backend tasks"
```

AI:

```text
ANALYSIS
↓
PROPOSED PLAN
↓
EDIT
↓
APPROVE
↓
EXECUTE
```

Seluruh flow dapat dilakukan tanpa mouse.

---

# 88. Data Visualization

Telemetry menggunakan:

* compact bar charts
* sparkline
* progress indicators
* counters
* status matrices

Hindari chart besar untuk metrics kecil.

---

# 89. AI Token Telemetry

Contoh:

```text
AI USAGE
────────────────────────

REQUESTS
284

TOKENS
18,492

AVG LATENCY
842ms

FAST ROUTE
72%

DEEP ROUTE
23%

VISION
5%
```

---

# 90. AI Cost Awareness

Jika provider cost tracking tersedia:

```text
ESTIMATED AI COST
$0.42

TODAY
$0.08
```

Jika menggunakan free tier:

```text
QUOTA
██████████░░ 82%

REQUESTS
82 / 100
```

Jangan membuat angka seolah akurat jika provider tidak menyediakan data tersebut.

---

# 91. Security UI

PII scrubber tidak perlu ditampilkan kepada user setiap kali.

Tetapi pada AI telemetry/settings dapat ditampilkan:

```text
AI DATA PROTECTION

● PII SCRUBBER ACTIVE
● TOKEN MASKING ACTIVE
● RATE LIMITER ACTIVE
● SECURE SESSION ACTIVE
```

---

# 92. AI Privacy Indicator

Saat user mengirim screenshot:

```text
VISION INPUT

Your screenshot will be processed
by the configured AI provider.

PII protection: ACTIVE
```

---

# 93. Component States

Setiap interactive component wajib memiliki:

```text
default
hover
focus
active
disabled
loading
success
error
```

AI component:

```text
idle
thinking
streaming
review
executing
completed
failed
```

---

# 94. Theme Consistency

Semua page harus menggunakan:

```text
same radius
same border system
same typography
same spacing
same semantic colors
same status indicators
```

Jangan membuat setiap page memiliki style sendiri.

---

# 95. Border Radius

Recommended:

```text
Small
6px

Default
8px

Card
10px

Panel
12px

Modal
16px
```

Hindari:

```text
rounded-full
```

kecuali:

* status pill
* avatar
* indicator
* compact tag

Mission Control style lebih kuat dengan **technical rectangular geometry**.

---

# 96. Shadows

Gunakan sangat sedikit.

Default:

```text
none
```

Floating:

```text
0 20px 60px rgba(0,0,0,.35)
```

AI:

```text
0 0 40px rgba(139,92,246,.08)
```

---

# 97. Implementation Phases

## Phase 1 — Design Foundation

Implement:

* color tokens
* typography
* spacing
* radius
* borders
* status system
* AI tokens
* grid background
* ambient lighting

Output:

```text
Mission Control Design System v1
```

---

# 98. Phase 2 — Shell

Implement:

* sidebar
* mobile navigation
* top header
* workspace switcher
* global command palette
* responsive shell

Target:

```text
All pages inherit the same application shell.
```

---

# 99. Phase 3 — My Day

Implement:

* mission header
* system status
* metric strip
* focus queue
* unassigned operations
* quick capture
* responsive layout

---

# 100. Phase 4 — Board

Implement:

* operations header
* Kanban columns
* technical task cards
* drag/drop states
* bulk action bar
* mobile snap scrolling

---

# 101. Phase 5 — Work Item

Implement:

* bottom sheet
* detail panel
* metadata
* description
* sub-items
* comments
* activity
* mobile safe-area

---

# 102. Phase 6 — AI Command Center

Implement:

* AI workspace
* history drawer
* context panel
* AI conversation
* processing states
* streaming
* command input
* ActionPlanCard
* Plan Editor
* approval flow

---

# 103. Phase 7 — Vision

Implement:

* screenshot uploader
* preview
* AI analysis state
* generated task
* confidence
* labels
* priority
* reproduction steps
* create task approval

---

# 104. Phase 8 — Execution

Implement:

* execution timeline
* operation progress
* success state
* partial failure state
* retry
* execution log

---

# 105. Phase 9 — Telemetry

Implement:

* AI request metrics
* token metrics
* latency
* route distribution
* error rate
* service status
* operations log

---

# 106. Phase 10 — Motion

Audit all interactions.

Implement:

* bottom sheet spring
* panel transitions
* hover states
* drag states
* AI processing
* execution timeline
* command palette
* page transitions

Motion harus mengikuti state, bukan dekorasi.

---

# 107. Phase 11 — Mobile

Audit:

```text
320px
375px
390px
414px
768px
1024px
1280px
1440px
```

Check:

* overflow
* safe area
* touch targets
* bottom navigation
* bottom sheet
* keyboard
* horizontal board
* AI input
* command palette

---

# 108. Phase 12 — Accessibility

Audit:

* keyboard
* focus
* screen reader
* contrast
* reduced motion
* semantic HTML
* aria labels
* error messaging

---

# 109. Phase 13 — Performance

Audit:

* unnecessary re-renders
* Framer/Motion animations
* backdrop blur
* large lists
* Kanban rendering
* chat history
* streaming
* screenshot preview
* image loading

Gunakan virtualization bila dataset besar.

---

# 110. Phase 14 — Visual QA

Test setiap halaman:

```text
/ day
/ board
/ command
/ projects
/ analytics
/ telemetry
```

Untuk setiap page:

```text
Desktop
Tablet
Mobile
Dark mode
Loading
Empty
Error
Success
AI processing
Offline
```

---

# 111. Definition of Done

Design dianggap selesai jika:

* [ ] Semua page menggunakan Mission Control design system.
* [ ] Tidak ada arbitrary color yang tidak diperlukan.
* [ ] Cyan konsisten sebagai system/work accent.
* [ ] Purple konsisten sebagai AI accent.
* [ ] Status menggunakan semantic colors.
* [ ] Typography konsisten.
* [ ] Technical labels konsisten.
* [ ] Border system konsisten.
* [ ] Grid background tidak mengganggu readability.
* [ ] Ambient glow digunakan secara terbatas.
* [ ] Tidak ada excessive glassmorphism.
* [ ] Tidak ada excessive neon.
* [ ] Tidak ada gaming-style UI.
* [ ] Semua interactive states tersedia.
* [ ] Keyboard navigation bekerja.
* [ ] Mobile layout bekerja.
* [ ] Safe-area bekerja.
* [ ] Reduced motion didukung.

---

# 112. AI Safety Definition of Done

Untuk seluruh AI mutation:

```text
User Request
     ↓
AI Analysis
     ↓
Proposed Action
     ↓
Risk Evaluation
     ↓
Human Review
     ↓
User Approval
     ↓
Execution
     ↓
Verification
```

Tidak boleh:

```text
User Prompt
     ↓
AI
     ↓
Immediate Mutation
```

---

# 113. Final Design Direction

Final visual hierarchy:

```text
                    ERDAVID WORK OS
                           │
             ┌─────────────┴─────────────┐
             │                           │
         OPERATIONS                   AI
             │                           │
           CYAN                       PURPLE
             │                           │
       Tasks / Board                Intelligence
       Projects                     Planning
       My Day                       Vision
       Activity                     Execution
             │                           │
             └─────────────┬─────────────┘
                           │
                      SYSTEM CORE
                           │
                     DARK OBSIDIAN
```

---

# 114. Final Design Formula

Gunakan formula:

```text
60%
Obsidian / Dark Productivity

20%
NASA Mission Control

15%
AI Workstation

5%
Nebula / Ambient Glow
```

Bukan:

```text
40% Neon
30% Glass
30% Sci-Fi
```

Tujuannya adalah membuat aplikasi tetap nyaman digunakan selama berjam-jam.

---

# 115. Final Product Impression

Ketika user membuka aplikasi, impression yang diinginkan:

> **"This is my work command center."**

Ketika membuka `/day`:

> **"I know what I need to do."**

Ketika membuka `/board`:

> **"I can see the entire operation."**

Ketika membuka `/command`:

> **"I have an AI intelligence layer that can actually operate on my workspace."**

Ketika AI membuat perubahan:

> **"I remain in control."**

Ketika membuka telemetry:

> **"I can understand what my system is doing."**

---

# 116. Implementation Priority

Prioritas implementasi:

```text
P0
Design tokens
Application shell
Navigation
Typography
Surface system
Status system

P1
My Day
Board
Work Item
Mobile navigation

P2
AI Command Center
Action Plan
Plan Editor
Execution Timeline

P3
Vision
Duplicate Detection
Batch Task Creation

P4
Telemetry
AI Usage
System Status
Operations Log

P5
Advanced Motion
Micro-interactions
Command shortcuts
Visual polish
```

---

# 117. Final Recommendation

Erdavid Work OS sebaiknya tidak mencoba terlihat seperti NASA secara literal.

Yang diambil dari Mission Control adalah:

* operational clarity
* technical information hierarchy
* system status
* telemetry
* mission-oriented workflow
* controlled visual density
* precise interactions
* status-driven UI
* command-center architecture

Sedangkan dari modern SaaS/AI product diambil:

* clean typography
* responsive layout
* keyboard-first interaction
* smooth motion
* AI-native workflows
* minimal surfaces

Dengan demikian final style menjadi:

> **Erdavid Work OS — AI Mission Control for Modern Work.**

Bukan sekadar task manager dengan AI, tetapi sebuah **AI-powered operational workstation** yang memiliki visual identity kuat dan tetap usable untuk pekerjaan sehari-hari.
