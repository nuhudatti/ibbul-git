import { NextResponse } from "next/server";
import {
  clearSessionCookieHeader,
  getSessionTokenFromRequest,
  revokeSession,
} from "@/lib/auth-session";

export async function POST(req: Request) {
  const token = getSessionTokenFromRequest(req);
  if (token) revokeSession(token);
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookieHeader());
  return res;
}
