import { NextResponse } from "next/server";
import { getSession, getSessionTokenFromRequest } from "@/lib/auth-session";
import { getProfileRecord } from "@/lib/student-profile-server";

export function requireAdmin(req: Request) {
  const token = getSessionTokenFromRequest(req);
  let session = getSession(token);

  if (!session || session.role !== "ADMIN") {
    return {
      error: NextResponse.json(
        { error: "Admin authentication required. Please sign out and log in again as ADMIN001." },
        { status: 401 }
      ),
    };
  }

  const record = getProfileRecord(session.matric);
  if (!record || record.accountRole !== "ADMIN") {
    return {
      error: NextResponse.json({ error: "Invalid admin session" }, { status: 401 }),
    };
  }

  return { session };
}
