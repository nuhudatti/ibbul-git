import { NextResponse } from "next/server";
import { getSession, getSessionTokenFromRequest } from "@/lib/auth-session";
import { getProfileRecordByMatric } from "@/lib/services/student-profile-service";

export async function requireAdmin(req: Request) {
  const token = getSessionTokenFromRequest(req);
  const session = getSession(token);

  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(session.role)) {
    return {
      error: NextResponse.json(
        { error: "Admin authentication required. Please sign out and log in again as an administrator." },
        { status: 401 }
      ),
    };
  }

  const record = await getProfileRecordByMatric(session.matric);
  if (!record || !["ADMIN", "SUPER_ADMIN"].includes(record.accountRole)) {
    return {
      error: NextResponse.json({ error: "Invalid admin session" }, { status: 401 }),
    };
  }

  return { session };
}
