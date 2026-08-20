# Ringkasan Proyek & Desain Sistem - Plane AI Command Center

## 1. Tentang Proyek (Project Overview)

**Plane AI Command Center** adalah platform *workstation* dan *management dashboard* berbasis AI generasi baru yang mengintegrasikan API **Plane.so** (Open-source Jira alternative) dengan kemampuan pemrosesan **Google Gemini AI**. 

Proyek ini dirancang untuk memberikan pengalaman mengelola tugas, tiket kerja, dan alur proyek secara intuitif, cepat, responsif di seluruh perangkat (Mobile & Desktop), serta dilengkapi asisten AI yang dapat melakukan pemecahan tugas (*task decomposition*), otomatisasi *triage*, dan analisis produktivitas harian.

---

## 2. Arsitektur & Tech Stack Core

| Layer | Teknologi / Library |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Turbopack, React 19) |
| **Styling** | Tailwind CSS v4, Lucide React Icons |
| **Animation & Motion** | Framer Motion (`motion/react`) |
| **State & Data Fetching**| Zustand (Workspace Store), TanStack React Query v5 |
| **ORM & Database** | Prisma ORM 6, Supabase PostgreSQL |
| **AI Integration** | Google Gemini SDK (`@google/genai`) |
| **Sanitization & Security**| DOMPurify (`dompurify`), HTTP Session Cookie Auth via Next.js 16 Proxy |

---

## 3. Fitur Utama Aplikasi

1. **My Day & Workstation (`/day`)**:
   - Ringkasan statistik harian (*Metrics Strip*): **Overdue**, **Due Today**, **Blocked**, dan **Active Tasks**.
   - **Focus Queue**: Rekomendasi task prioritas utama berbasis algoritma skor deterministik.
   - **Unassigned Ticket Pool**: Kolam tiket kerja yang belum memiliki penanggung jawab dengan fitur klaim instan (*Claim*).
   - **Quick Task Capture**: Form penambahan tugas kilat secara langsung.

2. **Kanban Board Responsif (`/board`)**:
   - Board per kolom status proyek dengan dukungan *drag & drop* (dnd-kit).
   - **Mobile Touch-Snap Scrolling**: Pengalaman swipe horizontal antar kolom yang presisi di layar HP (`w-[85vw] snap-center`).
   - **Interactive Project Switcher Dropdown**: Dropdown pemilih proyek langsung dari baris header atas.
   - **Bulk Priority Floating Action Bar**: Bar aksi masal untuk mengubah prioritas banyak tiket sekaligus.

3. **Work Item Detail Panel (Bottom Sheet)**:
   - Panel detail tiket bergaya **Bottom Sheet** dengan transisi spring physics dan gestur *drag-to-dismiss* bawah.
   - Pembersihan deskripsi HTML aman via `DOMPurify`.
   - Manajemen sub-items (mark done, tambah sub-item) dan integrasi komentar Plane secara real-time.
   - Dukungan padding khusus *iOS Safe Area Inset* (`pb-[max(1.5rem,env(safe-area-inset-bottom))]`).

4. **AI Command Center (`/command`) & Auto-Triage**:
   - Antarmuka chat NLP dengan AI untuk pencarian task, analisis produktivitas, pemecahan fitur menjadi sub-task, dan pembuatan *Action Plan*.

5. **Keamanan & Autentikasi (`/login` & Proxy)**:
   - Halaman login privat bergaya *Dark Mode* (`/login`).
   - Sistem proteksi halaman & API menggunakan cookie sesi `httpOnly` via **Next.js 16 Proxy** (`proxy.ts`).
   - Tombol *Logout* di bagian profil sidebar.

6. **Unified Splash Screen & Loading State**:
   - Animasi **Splash Screen** berbasis Framer Motion yang menyatukan durasi minimal estetis dengan sinkronisasi penuh data API Plane secara 100% tanpa adanya efek *double loading*.

---

## 4. Desain Sistem (Design System)

### A. Skema Warna (Dark Space Theme)

Aplikasi ini menggunakan tema gelap yang dalam (*Deep Pitch Dark Space*) dengan kontras tinggi untuk kenyamanan mata saat bekerja dalam durasi panjang:

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
   - Kisi statistik 2x2 di halaman utama agar label tidak terpotong.
   - Tombol aksi masif di bagian bawah diatur agar tidak tertutup oleh navigasi bawah HP (`MobileNav`).

2. **Motion & Dynamic Micro-Interactions**:
   - Transisi pegas (*Spring physics*) pada modal dan Bottom Sheet.
   - Animasi unmount halus menggunakan `<AnimatePresence>` saat berpindah atau menutup panel detail.
   - Indikator berdenyut (*pulsing aura ring*) pada logo dan tombol loading.

3. **Optimistic UI Updates**:
   - Setiap aksi pemindahan tiket (*move issue*) atau perubahan prioritas langsung diperbarui di UI secara instan sebelum permintaan REST API ke server selesai, sehingga aplikasi terasa sangat responsif tanpa delay.

4. **Zero-Collision Load Experience**:
   - Penggabungan proses *data fetching* dan *splash screen* memastikan bahwa ketika animasi splash screen selesai, seluruh isi dashboard sudah dalam keadaan 100% terisi dan siap digunakan tanpa ada animasi *pop-in* yang mengganggu.
