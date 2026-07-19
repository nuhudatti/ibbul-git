import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { apiSegmentToMatric } from "@/lib/matric";
import { updateStudentStatus } from "@/lib/student-profile-server";
import type { StudentAccountStatus } from "@/types";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ matric: string }> }
) {
  const auth = requireAdmin(req);
  if ("error" in auth) return auth.error;

  try {
    const { matric: raw } = await params;
    const matric = apiSegmentToMatric(raw);
    const { status } = await req.json();
    const allowed: StudentAccountStatus[] = ["active", "pending", "suspended"];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const student = updateStudentStatus(matric, status);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    return NextResponse.json({ student });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
