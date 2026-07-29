import { PrismaClient } from "@prisma/client";
import { validateEnv } from "@/lib/validate-env";

// Validate critical production env vars early so deploys fail fast.
try {
  validateEnv();
} catch (err) {
  console.error('Environment validation failed:', err instanceof Error ? err.message : err);
  // Rethrow so the process exits when in production; otherwise continue locally.
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') throw err;
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
