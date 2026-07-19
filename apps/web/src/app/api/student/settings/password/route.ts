import { NextResponse } from "next/server";
import { changeStudentPassword } from "@/lib/student-profile-server";

export async function POST(req: Request) {
  try {
    const { matric, currentPassword, newPassword, confirmPassword } = await req.json();

    if (!matric || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "All password fields required" }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "New passwords do not match" }, { status: 400 });
    }

    const result = changeStudentPassword(matric, currentPassword, newPassword);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ok: true, message: "Password updated successfully" });
  } catch {
    return NextResponse.json({ error: "Password change failed" }, { status: 500 });
  }
}
