import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { apiSegmentToMatric } from "@/lib/matric";
import { generateTempPassword } from "@/lib/temp-password";
import { getProfileRecordByMatric, resetStudentPasswordRecord, hashPassword } from "@/lib/services/student-profile-service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ matric: string }> }
) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  try {
    const { matric: raw } = await params;
    const matric = apiSegmentToMatric(raw);
    const existing = await getProfileRecordByMatric(matric);
    if (!existing) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const tempPassword = generateTempPassword();
    await resetStudentPasswordRecord(matric, hashPassword(tempPassword));

    return NextResponse.json({
      matric,
      tempPassword,
      mustChangePassword: true,
    });
  } catch {
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
