import { NextResponse } from "next/server";
import { verifyServerArtifact } from "@/lib/services/portfolio-service";

export async function POST(req: Request) {
  try {
    const { artifactId, lecturerId, lecturerName, approved, note } = await req.json();
    const updated = await verifyServerArtifact(
      artifactId,
      lecturerId ?? "LEC001",
      lecturerName ?? "Lecturer",
      approved !== false,
      note
    );
    if (!updated) {
      return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
    }
    return NextResponse.json({ artifact: updated });
  } catch {
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}
