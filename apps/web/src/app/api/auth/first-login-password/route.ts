import { NextResponse } from "next/server";
import { completeRequiredPasswordChange } from "@/lib/student-profile-server";

export async function POST(req: Request) {
  try {
    const { matric, currentPassword, newPassword, confirmPassword } = await req.json();
    if (!matric || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    const result = completeRequiredPasswordChange(matric, currentPassword, newPassword);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: "Password updated. You may now enter your workspace.",
    });
  } catch {
    return NextResponse.json({ error: "Password change failed" }, { status: 500 });
  }
}
