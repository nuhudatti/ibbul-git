import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { apiSegmentToMatric } from "@/lib/matric";
import { resetStudentToTempPassword } from "@/lib/student-profile-server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ matric: string }> }
) {
  const auth = requireAdmin(req);
  if ("error" in auth) return auth.error;

  try {
    const { matric: raw } = await params;
    const matric = apiSegmentToMatric(raw);
    const result = resetStudentToTempPassword(matric);
    if (!result) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({
      matric,
      tempPassword: result.tempPassword,
      mustChangePassword: true,
    });
  } catch {
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
