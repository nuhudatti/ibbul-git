import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { generateTempPassword } from "@/lib/temp-password";
import { normalizeMatric } from "@/lib/matric";
import {
  createStudentProfile,
  hashPassword,
  listStudentProfilesForAdmin,
} from "@/lib/services/student-profile-service";

export async function GET(req: Request) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  return NextResponse.json({ students: await listStudentProfilesForAdmin() });
}

export async function POST(req: Request) {
  const auth = await requireAdmin(req);
  if ("error" in auth) return auth.error;

  try {
    const body = await req.json();
    const { matric, firstName, lastName, program, email } = body;
    if (!matric?.trim() || !firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: "Matric, first name, and last name are required" },
        { status: 400 }
      );
    }

    const tempPassword = generateTempPassword();
    const student = await createStudentProfile({
      matric: normalizeMatric(matric),
      firstName,
      lastName,
      program: program ?? "B.Sc Computer Science",
      email,
      passwordHash: hashPassword(tempPassword),
      mustChangePassword: true,
      status: "pending",
    });

    return NextResponse.json({
      student,
      tempPassword,
    });
  } catch {
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}
