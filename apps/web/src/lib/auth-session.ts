import { sign, verify } from "jsonwebtoken";

export interface SessionPayload {
  matric: string;
  role: "STUDENT" | "LECTURER" | "ADMIN";
  createdAt: number;
  expiresAt: number;
}

const TTL_MS = 1000 * 60 * 60 * 12; // 12 hours
const COOKIE_NAME = "ula_session";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-key-change-in-production";

export function createSession(matric: string, role: SessionPayload["role"]): string {
  const now = Date.now();
  const payload: SessionPayload = {
    matric,
    role,
    createdAt: now,
    expiresAt: now + TTL_MS,
  };
  
  // Sign JWT with expiration
  const token = sign(payload, JWT_SECRET, {
    expiresIn: Math.floor(TTL_MS / 1000),
  });
  
  return token;
}

export function getSession(token: string | null | undefined): SessionPayload | null {
  if (!token) return null;
  
  try {
    const payload = verify(token, JWT_SECRET) as SessionPayload;
    
    // Additional check: ensure expiration time hasn't passed
    if (Date.now() > payload.expiresAt) {
      return null;
    }
    
    return payload;
  } catch {
    // Invalid token or signature verification failed
    return null;
  }
}

export function revokeSession(token: string) {
  // With JWT, we can't revoke tokens server-side without a blacklist
  // For now, we just let them expire naturally
  // TODO: Implement token blacklist if needed for forced logout
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
