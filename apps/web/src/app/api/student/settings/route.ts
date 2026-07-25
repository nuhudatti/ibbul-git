import { NextRequest, NextResponse } from "next/server";
import { normalizeMatric } from "@/lib/matric";
import {
  getProfileRecordByMatric,
  getResolvedProfileRecord,
  updateStudentProfileRecord,
} from "@/lib/services/student-profile-service";

export async function GET(req: NextRequest) {
  const matric = req.nextUrl.searchParams.get("matric");
  if (!matric) {
    console.warn("[Workspace] GET /api/student/settings missing matric");
    return NextResponse.json({ error: "matric required" }, { status: 400 });
  }

  const profile = await getResolvedProfileRecord(matric);
  const record = await getProfileRecordByMatric(matric);
  if (!profile) {
    console.warn("[Workspace] student settings not found", { matric });
  }

  return NextResponse.json({
    settings: {
      ...profile,
      displayName: profile?.displayName ?? matric,
      updatedAt: record?.updatedAt?.toISOString(),
    },
  });
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const matric = body.matric as string | undefined;
    if (!matric) {
      return NextResponse.json({ error: "matric required" }, { status: 400 });
    }

    const norm = normalizeMatric(matric);
    const updated = await updateStudentProfileRecord(norm, {
      headline: body.headline,
      email: body.email,
      notifyAssignments: body.notifyAssignments,
      notifyGrades: body.notifyGrades,
      notifyPortfolio: body.notifyPortfolio,
      publicProfile: body.publicProfile,
    });

    if (!updated) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const settings = await getResolvedProfileRecord(norm);
    return NextResponse.json({ settings: { ...settings, updatedAt: updated.updatedAt.toISOString() } });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}
