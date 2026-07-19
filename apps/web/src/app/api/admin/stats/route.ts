import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { getAdminStats } from "@/lib/student-profile-server";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if ("error" in auth) return auth.error;

  return NextResponse.json({ stats: getAdminStats() });
}
