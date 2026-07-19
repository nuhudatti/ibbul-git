import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { bulkCreateStudents } from "@/lib/student-profile-server";

export async function POST(req: Request) {
  const auth = requireAdmin(req);
  if ("error" in auth) return auth.error;

  try {
    const { rows } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "rows array required" }, { status: 400 });
    }
    if (rows.length > 500) {
      return NextResponse.json({ error: "Maximum 500 students per import" }, { status: 400 });
    }

    const result = bulkCreateStudents(rows);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Bulk import failed" }, { status: 500 });
  }
}
