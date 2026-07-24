import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { generateTempPassword } from "@/lib/temp-password";
import { normalizeMatric } from "@/lib/matric";
import { createStudentProfile, hashPassword } from "@/lib/services/student-profile-service";

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  try {
    const { rows } = await req.json();
    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "rows array required" }, { status: 400 });
    }
    if (rows.length > 500) {
      return NextResponse.json({ error: "Maximum 500 students per import" }, { status: 400 });
    }

    const created: { record: unknown; tempPassword: string }[] = [];
    const errors: { row: number; matric: string; error: string }[] = [];

    for (const [index, row] of rows.entries()) {
      try {
        const tempPassword = generateTempPassword();
        const record = await createStudentProfile({
          matric: normalizeMatric(row.matric),
          firstName: row.firstName,
          lastName: row.lastName,
          program: row.program ?? "B.Sc Computer Science",
          email: row.email,
          passwordHash: hashPassword(tempPassword),
          status: "pending",
          mustChangePassword: true,
        });

        created.push({ record, tempPassword });
      } catch (error) {
        errors.push({
          row: index + 1,
          matric: row.matric,
          error: error instanceof Error ? error.message : "Bulk import failed",
        });
      }
    }

    return NextResponse.json({ created, errors });
  } catch {
    return NextResponse.json({ error: "Bulk import failed" }, { status: 500 });
  }
}
