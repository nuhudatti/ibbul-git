# NestJS API — Phase 2 Scaffold

This directory will host the production backend. MVP uses Next.js API routes in `apps/web`.

## Planned Structure

```
apps/api/
├── src/
│   ├── main.ts
│   ├── app.module.ts
│   ├── auth/           # JWT + matric login
│   ├── projects/       # CRUD + auto-save + snapshots
│   ├── assignments/    # Lecturer assignments + enrollment
│   ├── deployments/    # Docker sandbox + static hosting
│   ├── grading/        # AI evaluation pipeline
│   ├── ai/             # OpenAI / local model adapter
│   └── websocket/      # Live logs + presence
├── Dockerfile
└── package.json
```

## Bootstrap (when ready)

```bash
npm i -g @nestjs/cli
cd apps/api
nest new . --skip-git
npm install @prisma/client @nestjs/jwt @nestjs/passport passport-jwt
```

Connect to `@ula/database` package for Prisma client.
