import { NextRequest, NextResponse } from "next/server";
import { removeStudentAvatar, setStudentAvatar } from "@/lib/student-profile-server";
import { normalizeMatric } from "@/lib/matric";

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const matric = form.get("matric") as string | null;
    const file = form.get("file") as File | null;

    if (!matric?.trim()) {
      return NextResponse.json({ error: "matric required" }, { status: 400 });
    }
    if (!file) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json(
        { error: "Use JPEG, PNG, or WebP (max 2MB)" },
        { status: 400 }
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image must be under 2MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = setStudentAvatar(matric, file.type, buffer);
    if (!result) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const base = result.avatarUrl.split("?")[0];
    return NextResponse.json({
      avatarUrl: `${base}?v=${Date.now()}`,
    });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const matric = req.nextUrl.searchParams.get("matric");
  if (!matric) {
    return NextResponse.json({ error: "matric required" }, { status: 400 });
  }
  removeStudentAvatar(matric);
  return NextResponse.json({ ok: true });
}
