import { NextResponse } from "next/server";
import { requireLecturer } from "@/lib/lecturer-auth";
import { getLecturerStudentSummaries } from "@/lib/services/lecturer-dashboard-service";

export async function GET(req: Request) {
  const auth = await requireLecturer(req);
  if ("error" in auth) return auth.error;

  try {
    const students = await getLecturerStudentSummaries();
    return NextResponse.json({ students });
  } catch (error) {
    console.error("Failed to load lecturer student summaries", error);
    return NextResponse.json({ error: "Failed to load student data" }, { status: 500 });
  }
}
