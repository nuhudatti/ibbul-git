import { NextResponse } from "next/server";
import { getProfileRecordByMatric } from "@/lib/services/student-profile-service";
import { normalizeMatric } from "@/lib/matric";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matric: string }> }
) {
  const { matric } = await params;
  const norm = normalizeMatric(matric);
  const data = await getProfileRecordByMatric(norm);
  if (!data?.avatarUrl) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.json({ avatarUrl: data.avatarUrl });
}
