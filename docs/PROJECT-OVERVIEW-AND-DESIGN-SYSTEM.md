# Ringkasan Proyek & Desain Sistem - Plane AI Command Center

## 1. Tentang Proyek (Project Overview)

**Plane AI Command Center** adalah platform *workstation* dan *management dashboard* berbasis AI generasi baru yang mengintegrasikan API **Plane.so** (Open-source Jira alternative) dengan kemampuan pemrosesan **Google Gemini 2.5 AI** dan arsitektur database terdistribusi **Supabase PostgreSQL**.

Proyek ini dirancang untuk memberikan pengalaman mengelola tugas, tiket kerja, dan alur proyek secara intuitif, cepat, responsif di seluruh perangkat (Mobile & Desktop), serta dilengkapi asisten AI cerdas yang mendukung pemecahan tugas (*task decomposition*), otomatisasi *triage*, analisis visual tangkapan layar (*multi-modal screenshot-to-task*), pembuatan task massal terstruktur, dan riwayat obrolan berbasis cloud.

---

## 2. Arsitektur & Tech Stack Core

| Layer | Teknologi / Library | Catatan Arsitektur |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router, Turbopack, React 19) | Server & Client Components, Route Handlers |
| **Styling** | Tailwind CSS v4, Lucide React Icons | Modern CSS variables, Glassmorphism, Clean Spacing |
| **Animation & Motion** | Framer Motion (`motion/react`) | Spring physics, Layout animations, Gesture drag |
| **State Management** | Zustand (Workspace Store), TanStack React Query v5 | Global workspace context, caching, optimistic mutations |
| **ORM & Database** | Prisma ORM 7 (`@prisma/adapter-pg`), Supabase PostgreSQL | Connection pooling, multi-tenant models, Query Cache |
| **AI Integration** | Google Gemini SDK (`@google/genai`) | Dual-Tier Routing (Flash Lite & Flash Vision 2.5) |
| **Sanitization & Security**| DOMPurify, PII Scrubber, In-Memory Rate Limiter, HTTP-only Cookie Auth | Data masking, anti-spam, safe HTML rendering |

---

## 3. Fitur Utama Aplikasi

### 1. My Day & Focus Workstation (`/day`)
- **Metrics Strip**: Statistik harian *Overdue*, *Due Today*, *Blocked*, dan *Active Tasks*.
- **Focus Queue**: Rekomendasi task prioritas utama berbasis algoritma deterministik.
- **Unassigned Ticket Pool**: Kolam tiket kerja tanpa pemilik dengan fitur klaim instan (*Claim*).
- **Quick Task Capture**: Form penambahan tugas kilat secara langsung.

### 2. Kanban Board Responsif (`/board`)
- **Interactive Board Columns**: Pengelompokan status proyek dengan dukungan *drag & drop* (`@dnd-kit`).
- **Mobile Touch-Snap Scrolling**: Pengalaman swipe horizontal antar kolom yang presisi di layar ponsel (`w-[85vw] snap-center`).
- **Interactive Project Switcher Dropdown**: Dropdown pemilih proyek langsung di header bar dengan dukungan **ALL Projects Mode**.
- **Bulk Priority Floating Action Bar**: Bar aksi masal untuk mengubah prioritas banyak tiket sekaligus.

### 3. Work Item Detail Panel (Bottom Sheet)
- **Fluid Bottom Sheet**: Transisi pegas (*Spring physics*) dengan gestur *drag-to-dismiss*.
- **Sanitized HTML Description**: Pembersihan deskripsi HTML aman via `DOMPurify`.
- **Sub-Items & Live Comments**: Manajemen sub-task dan integrasi komentar Plane secara real-time.
- **iOS Safe Area Compliance**: Padding otomatis `pb-[max(1.5rem,env(safe-area-inset-bottom))]`.

### 4. AI Command Workstation (`/command`)
- **Dual-Tier Intent Engine**:
  - *Fast Tier (`gemini-2.5-flash-lite`)*: Kueri baca cepat, filter issue, dan percakapan natural.
  - *Heavy Tier (`gemini-2.5-flash`)*: Dekomposisi fitur besar, analisis bug screenshot, dan deteksi intensitas tinggi.
- **Multi-Modal Vision (Screenshot to Task)**:
  - Dukungan unggah gambar / screenshot bug atau mockup desain UI (maks. 5MB).
  - Gemini 2.5 Flash Vision otomatis mengekstrak judul bug, langkah reproduksi, prioritas, dan label menjadi tiket Plane.
- **Structured Batch Task Creation (`1. Judul : Deskripsi`)**:
  - Dukungan penempelan (*paste*) ringkasan tugas multi-baris untuk membuat banyak work items sekaligus dengan judul dan deskripsi terpisah secara otomatis.
- **Plan-Approve-Execute Protocol & Interactive Plan Editor**:
  - Kartu **`ActionPlanCard`** menampilkan estimasi risiko (`low`, `medium`, `high`) sebelum aksi dijalankan.
  - Tombol **Edit** memungkinkan pengguna mengubah target project, judul langkah, atau parameter sebelum menekan *Setujui & Eksekusi*.
- **Automated Duplicate Detection**:
  - Peringatan potensi task duplikat (*similarity matching threshold 65%*) saat membuat task baru.
- **Persistent Cloud Chat History**:
  - Riwayat obrolan tersimpan otomatis di Supabase Postgres (`ChatSession` & `ChatMessage`).
  - Drawer riwayat chat untuk membuka percakapan lama atau membuat sesi baru.
- **Zero-Jank Throttled Auto-Scroll**:
  - Animasi auto-scroll di-throttle dengan `requestAnimationFrame` untuk kenyamanan membaca saat teks mengalir.

### 5. Universal `ALL` Projects Mode
- Kemampuan membaca dan memodifikasi task di seluruh 11+ project Plane secara bersamaan.
- Auto-resolution cerdas untuk key task seperti `BSJ7PHASE1-31` atau `JOMTERBANG-30`.

### 6. Keamanan & Dynamic Credential Resolution
- **Zero Hardcoded Secrets**: Seluruh konfigurasi membaca strictly dari `process.env` dengan dynamic workspace auto-resolution via `GET /workspaces/`.
- **PII Scrubber**: Otomatis menyamarkan email, token, dan data pribadi sebelum dikirim ke prompt AI.
- **Rate Limiting**: Maksimal 30 request AI/menit per IP.
- **AI Telemetry Logger**: Pencatatan metrik token dan latensi ke database `ai_usage`.

### 7. Non-Blocking Splash & Loading Architecture
- State `hasInitialLoaded` memastikan animasi **Splash Screen** hanya muncul 1x saat aplikasi dibuka (*initial boot*).
- Sinkronisasi latar belakang dan pengiriman pesan chat berjalan mulus tanpa pernah memicu splash screen layar penuh.

---

## 4. Desain Sistem (Design System)

### A. Skema Warna (Dark Space Theme)

Tema *Deep Pitch Dark Space* dengan kontras tinggi untuk efisiensi fokus kerja:

- **Background Utama**: `#09090B` (Zinc-950)
- **Kartu & Kontainer Surface**: `#111113` / `#18181B` (Zinc-900 dengan border tipis `border-white/10`)
- **Aksen Utama (Primary CTA & Focus)**: `blue-600` / `blue-500` / `indigo-500` (Electric Blue)
- **Teks Utama**: `#FAFAFA` (Zinc-50 White)
- **Teks Sekunder**: `#A1A1AA` (Zinc-400)
- **Teks Muted & Ikon**: `#71717A` (Zinc-500)
- **Monospace & Code Key**: `#38BDF8` (Sky-400)

#### Indikator Prioritas & Status:
- **Urgent**: `rose-500` (Background: `rose-500/10`, Border: `rose-500/20`)
- **High**: `orange-500` (Background: `orange-500/10`, Border: `orange-500/20`)
- **Medium**: `amber-500` (Background: `amber-500/10`, Border: `amber-500/20`)
- **Low / Info**: `blue-500` (Background: `blue-500/10`, Border: `blue-500/20`)
- **Done / Active**: `green-400` (Background: `green-500/10`, Border: `green-500/20`)

---

### B. Tipografi & Skala Teks

- **Headings**: Semibold / Bold (`font-semibold`, `font-bold`) dengan *letter-spacing* rapat (`tracking-tight`).
- **Kode Issue & Kunci**: `font-mono` dengan sudut melengkung (*rounded pill*) untuk memudahkan identifikasi visual.
- **Responsifitas Teks**:
  - Desktop: Title `text-sm`, Header `text-base` / `text-lg`.
  - Mobile: Judul dipotong lurus (`whitespace-nowrap truncate`), teks statistik diatur dalam kisi 2x2.

---

### C. Elevasi & Efek Visual

- **Glassmorphism**: Penggunaan `backdrop-blur-md` dan `bg-[#09090B]/90` pada navigasi bawah (*MobileNav*) dan modal.
- **Glow Background**: Pendaran cahaya ambient di belakang kontainer utama menggunakan `blur-[120px]` dengan gradien radial biru/nila.
- **Borders**: Penggunaan border halus `border border-white/10` atau `border-white/5` di seluruh komponen untuk memisahkan hierarki tanpa membuat visual terasa berat.

---

## 5. Prinsip UI/UX Design

1. **Mobile-First & Touch Optimization**:
   - Layout responsif penuh untuk layar ponsel (< 640px).
   - Padding clearance `pb-16 md:pb-0` pada container `<main>` memastikan seluruh input chat AI dan tombol aksi tidak tertutup oleh navigasi bawah `MobileNav`.
2. **Motion & Dynamic Micro-Interactions**:
   - Transisi pegas (*Spring physics*) pada modal dan Bottom Sheet.
   - Animasi unmount halus menggunakan `<AnimatePresence>` saat berpindah atau menutup panel detail.
3. **Optimistic UI Updates**:
   - Setiap aksi pemindahan tiket (*move issue*) atau perubahan prioritas langsung diperbarui di UI secara instan sebelum permintaan REST API ke server selesai.
4. **Human-in-the-Loop AI Safety**:
   - Setiap modifikasi data oleh AI harus melalui tinjauan dan persetujuan pengguna (*Action Plan Card*), dengan opsi pengeditan mandiri sebelum eksekusi.
