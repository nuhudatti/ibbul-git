import { NextResponse } from "next/server";
import { requireLecturer } from "@/lib/lecturer-auth";
import { getLecturerStudentDetail } from "@/lib/services/lecturer-dashboard-service";
import { normalizeMatric } from "@/lib/matric";

export async function GET(req: Request, { params }: { params: Promise<{ matric: string }> }) {
  const auth = await requireLecturer(req);
  if ("error" in auth) return auth.error;

  const { matric } = await params;
  const normalized = normalizeMatric(matric);
  try {
    const student = await getLecturerStudentDetail(normalized);
    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }
    return NextResponse.json({ student });
  } catch (error) {
    console.error("Failed to load student detail", error);
    return NextResponse.json({ error: "Failed to load student detail" }, { status: 500 });
  }
}
