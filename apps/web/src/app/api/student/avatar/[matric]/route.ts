import { NextResponse } from "next/server";
import { getStudentAvatar } from "@/lib/student-profile-server";
import { normalizeMatric } from "@/lib/matric";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ matric: string }> }
) {
  const { matric } = await params;
  const data = getStudentAvatar(matric);
  if (!data) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(new Uint8Array(data.buffer), {
    headers: {
      "Content-Type": data.mime,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
