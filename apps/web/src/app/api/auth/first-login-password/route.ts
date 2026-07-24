import { NextResponse } from "next/server";
import { getProfileRecordByMatric, hashPassword, updateStudentProfileRecord, verifyPassword } from "@/lib/services/student-profile-service";

export async function POST(req: Request) {
  try {
    const { matric, currentPassword, newPassword, confirmPassword } = await req.json();
    if (!matric || !currentPassword || !newPassword) {
      return NextResponse.json({ error: "All fields required" }, { status: 400 });
    }
    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match" }, { status: 400 });
    }

    const record = await getProfileRecordByMatric(matric);
    if (!record) {
      return NextResponse.json({ error: "Account not found" }, { status: 400 });
    }
    if (!verifyPassword(currentPassword, record.passwordHash)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
    }

    await updateStudentProfileRecord(matric, {
      passwordHash: hashPassword(newPassword),
      mustChangePassword: false,
      status: record.status === "pending" ? "active" : record.status,
    });

    return NextResponse.json({
      ok: true,
      message: "Password updated. You may now enter your workspace.",
    });
  } catch {
    return NextResponse.json({ error: "Password change failed" }, { status: 500 });
  }
}
