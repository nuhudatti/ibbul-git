import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createStudentAccount, listStudentProfiles } from "@/lib/student-profile-server";

export async function GET(req: Request) {
  const auth = requireAdmin(req);
  if ("error" in auth) return auth.error;

  return NextResponse.json({ students: listStudentProfiles() });
}

export async function POST(req: Request) {
  const auth = requireAdmin(req);
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

    const result = createStudentAccount({
      matric,
      firstName,
      lastName,
      program: program ?? "B.Sc Computer Science",
      email,
    });

    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      student: result.record,
      tempPassword: result.tempPassword,
    });
  } catch {
    return NextResponse.json({ error: "Failed to create student" }, { status: 500 });
  }
}
