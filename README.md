# Project ULA

**Unified Learning Architecture** — AI-powered development OS for education.

## Quick Start

```bash
cd apps/web
npm install
npm run dev
```

Open **http://localhost:3000**

### Demo Credentials

| Role     | Matric     | Password     |
|----------|------------|--------------|
| Student  | CS2024001  | student123   |
| Lecturer | LEC001     | lecturer123  |

## What's Built

### Student Workspace
- **Live Preview** — Click **Run** for full-screen immersive preview with browser chrome, device toggles (desktop/tablet/mobile), and live sync
- **My Projects** — Floating panel with **Active** and **Submitted** tabs; start or continue work, or **View Submission** after submit
- **Submit** — Locks your snapshot, runs AI grading, moves the assignment to **Submitted**
- **View after submit** — Reopen any submitted project in **read-only** mode with a green banner, locked editor, and preview; **Run** still works for reviewing your live build

### Verified Proof-of-Work Portfolio Engine (VPE)
- Every **Submit** seals a portfolio artifact (hash, score, deploy URL, timestamp)
- **Public identity**: `/u/CS2024001` — living timeline, skills, verified badges
- **Live global build stream** on login hero — real-time university activity
- Lecturers **verify** artifacts from Mission Control
- **Share profile** / export PDF from public page
- **Deploy** — Publishes your project to a **real working link** like `http://localhost:3000/live/cs2024001/proj-demo-001`

### Lecturer Mission Control (real workflow)
1. **Create & publish** assignments → class roster sees them in My Projects
2. **Submission inbox** — real student submits from IDE (not dummy matrix)
3. **Verify & publish** portfolio → live on `/u/[matric]`
4. Demo: `LEC001` / `lecturer123` — after student `CS2024001` submits, review appears automatically

## Try This Flow

1. Login as **CS2024001** → open **My Projects** (bottom-left) → start **Portfolio** or **Calculator**
2. Code in the IDE → **Deploy** for a real link → **Submit** when ready
3. Open **My Projects → Submitted** → **View Submission** to browse your locked snapshot (code + preview)
4. Click **Run** anytime to review the full-screen preview
5. Login as **LEC001** → verify portfolio artifacts in Mission Control sidebar
6. Open public portfolio: **http://localhost:3000/u/CS2024003** (demo seeded)

See [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for full system design.
