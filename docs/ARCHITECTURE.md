# Project ULA – Unified Learning Architecture

> The future operating system for learning and software creation.

## Vision

Project ULA unifies **learning**, **coding**, **AI tutoring**, **grading**, and **deployment** into one seamless experience. Students don't "submit assignments" — they **build living projects** that get analyzed, scored, and published instantly.

## What This Is (And Isn't)

| Component | Inspiration | ULA Approach |
|-----------|-------------|--------------|
| Version Control | GitHub | Auto-save + Git-like snapshots per keystroke session |
| IDE | VS Code | Browser-native workspace with AI co-pilot |
| Hosting | Vercel / GitHub Pages | One-click deploy → `{matric}.ula.edu/{project-id}` |
| LMS | Google Classroom | Assignment flow embedded inside the IDE |
| Tutor | ChatGPT | Context-aware AI that sees your code, not generic answers |
| Grading | Manual review | AI + rubric engine with explainable feedback |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
│  Next.js App Router │ Monaco IDE │ Framer Motion │ WebSocket    │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                        API GATEWAY (NestJS)                      │
│  Auth │ Projects │ Assignments │ Deploy │ AI │ Grading │ WS     │
└─────┬──────────┬──────────┬──────────┬──────────┬──────────────┘
      │          │          │          │          │
┌─────▼───┐ ┌────▼────┐ ┌───▼───┐ ┌────▼────┐ ┌───▼──────────────┐
│PostgreSQL│ │ Redis   │ │ S3/   │ │ Docker  │ │ AI Service      │
│ (Prisma) │ │ (cache) │ │ MinIO │ │ Sandbox │ │ (OpenAI/local)  │
└─────────┘ └─────────┘ └───────┘ └─────────┘ └─────────────────┘
```

## Core Modules

### 1. Identity & Institution Layer
- Login: matric number + password (institution-scoped)
- Roles: `STUDENT`, `LECTURER`, `ADMIN`
- JWT sessions + refresh tokens
- Multi-tenant by institution

### 2. AI Browser IDE (Core Innovation)
- Monaco Editor (same engine as VS Code)
- Virtual file system with auto-save (debounced, every 2s)
- Version snapshots on meaningful events (save, submit, deploy)
- AI panel: explain, debug, hint, review (never full solution by default)
- Terminal panel: build logs, runtime output

### 3. Deployment Engine
```
Student clicks Deploy
  → API receives project files
  → Docker sandbox builds (npm install / static bundle)
  → Output uploaded to object storage
  → CDN serves at https://projects.ula.edu/{projectId}
  → WebSocket streams build logs to IDE
```

**MVP:** Static HTML/CSS/JS only  
**Phase 2:** React, Node, Python sandboxes

### 4. Assignment System
- Lecturer creates assignment with rubric + starter template
- Student enrolls → workspace pre-loaded with starter code
- Progress tracked: `NOT_STARTED → IN_PROGRESS → SUBMITTED → GRADED`
- Live presence: lecturer sees who's coding right now

### 5. AI Grading Engine
```
Submission received
  → Static analysis (ESLint, structure heuristics)
  → AI evaluation against rubric
  → Score breakdown: correctness, structure, best practices, UI
  → Feedback report generated
  → Lecturer can override/adjust
```

### 6. Lecturer Mission Control
- Class overview with real-time activity
- Submission pipeline visualization
- AI insights: common mistakes, weak topics, score distribution
- Export reports (CSV/PDF)

## Database Schema (Summary)

See `packages/database/prisma/schema.prisma` for full schema.

**Core entities:**
- `Institution` → `User` → `Project` → `ProjectFile`
- `Assignment` → `AssignmentEnrollment` → `Submission` → `Grade`
- `Deployment` → build logs + live URL
- `ProjectSnapshot` → version history
- `AiConversation` → IDE chat history

## API Routes (REST + WebSocket)

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/auth/login` | Matric + password login |
| GET | `/projects/:id` | Get project with files |
| PUT | `/projects/:id/files` | Save files (auto-save) |
| POST | `/projects/:id/deploy` | Trigger deployment |
| GET | `/deployments/:id/logs` | Stream build logs (WS) |
| POST | `/assignments/:id/submit` | Submit for grading |
| POST | `/ai/chat` | AI assistant message |
| POST | `/grading/evaluate` | Run grading pipeline |
| GET | `/lecturer/dashboard` | Analytics overview |

## Frontend Routes

| Route | Role | Purpose |
|-------|------|---------|
| `/` | Public | Landing + login |
| `/workspace` | Student | IDE environment |
| `/workspace/[projectId]` | Student | Specific project IDE |
| `/dashboard` | Lecturer | Mission control |
| `/dashboard/assignments` | Lecturer | Assignment management |
| `/dashboard/students` | Lecturer | Student tracking |

## Design System

- **Theme:** Dark-first, glassmorphism, soft gradients
- **Grid:** 8pt spacing system
- **Typography:** Geist Sans (UI) + Geist Mono (code)
- **Motion:** Framer Motion, 200-400ms transitions
- **Colors:** Deep space black (#050508) + electric cyan accent (#00E5FF) + violet glow (#7C3AED)

## MVP Phases

### Phase 1 (Current) ✅
- Premium login UI
- Full IDE shell (explorer, editor, AI panel, terminal)
- Mock auth + project state
- Deploy animation + success flow
- Architecture + DB schema

### Phase 2
- NestJS API + PostgreSQL
- Real auth + project persistence
- Static site deployment

### Phase 3
- Assignment system (lecturer + student)
- AI assistant (OpenAI integration)
- Auto-grading pipeline

### Phase 4
- Docker sandboxes
- Real-time collaboration
- Multi-language support
- Institution multi-tenancy

## Security Considerations

- Sandboxed code execution (no host access)
- Rate limiting on AI endpoints
- Institution-scoped data isolation
- Submission integrity (snapshot hashing)
- No secrets in student projects (scanner)

## Folder Structure

```
project-ula/
├── apps/
│   ├── web/                 # Next.js frontend
│   └── api/                 # NestJS backend
├── packages/
│   ├── database/            # Prisma schema + client
│   └── shared/              # Shared types
├── docs/
│   └── ARCHITECTURE.md
└── package.json             # Monorepo root
```
