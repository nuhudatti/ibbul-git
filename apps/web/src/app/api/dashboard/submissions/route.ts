import { NextResponse } from "next/server";
import { requireLecturer } from "@/lib/lecturer-auth";
import { getLecturerSubmissionPayload } from "@/lib/services/lecturer-dashboard-service";

export async function GET(req: Request) {
  const auth = await requireLecturer(req);
  if ("error" in auth) return auth.error;

  try {
    const submissions = await getLecturerSubmissionPayload();
    return NextResponse.json({ submissions });
  } catch (error) {
    console.error("Failed to load lecturer submissions", error);
    return NextResponse.json({ error: "Failed to load lecturer submissions" }, { status: 500 });
  }
}
