import { randomBytes } from "crypto";

export interface SessionPayload {
  matric: string;
  role: "STUDENT" | "LECTURER" | "ADMIN";
  createdAt: number;
  expiresAt: number;
}

const TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const COOKIE_NAME = "ula_session";

/** Survive Next.js dev hot reload */
const globalStore = globalThis as unknown as {
  ulaSessions?: Map<string, SessionPayload>;
};

function getSessionMap() {
  if (!globalStore.ulaSessions) {
    globalStore.ulaSessions = new Map<string, SessionPayload>();
  }
  return globalStore.ulaSessions;
}

export function createSession(matric: string, role: SessionPayload["role"]): string {
  const token = randomBytes(32).toString("hex");
  const now = Date.now();
  getSessionMap().set(token, {
    matric,
    role,
    createdAt: now,
    expiresAt: now + TTL_MS,
  });
  return token;
}

export function getSession(token: string | null | undefined): SessionPayload | null {
  if (!token) return null;
  const s = getSessionMap().get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) {
    getSessionMap().delete(token);
    return null;
  }
  return s;
}

export function revokeSession(token: string) {
  getSessionMap().delete(token);
}

export function parseBearerToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const t = auth.slice(7).trim();
  return t.length > 0 ? t : null;
}

function parseCookieToken(req: Request): string | null {
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Bearer header first, then httpOnly-style session cookie */
export function getSessionTokenFromRequest(req: Request): string | null {
  return parseBearerToken(req) ?? parseCookieToken(req);
}

export function sessionCookieHeader(token: string): string {
  const maxAge = Math.floor(TTL_MS / 1000);
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

export function clearSessionCookieHeader(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
}
