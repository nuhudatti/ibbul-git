import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { generateTempPassword } from "@/lib/temp-password";
import { normalizeMatric, isValidStudentMatric } from "@/lib/matric";
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

    const normalizedMatric = normalizeMatric(matric);
    if (!isValidStudentMatric(normalizedMatric)) {
      return NextResponse.json(
        { error: "Matric must be a valid student matric like U22/FNS/CSC/1105" },
        { status: 400 }
      );
    }

    const tempPassword = generateTempPassword();
    const student = await createStudentProfile({
      matric: normalizedMatric,
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
  } catch (error) {
    console.error("Failed to create student", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const meta = error.meta as { target?: string[] } | undefined;
      const target = Array.isArray(meta?.target)
        ? meta.target.join(", ")
        : "field";
      return NextResponse.json(
        { error: `A student with this ${target} already exists` },
        { status: 409 }
      );
    }

    const message = error instanceof Error ? error.message : "Failed to create student";
    return NextResponse.json(
      {
        error:
          process.env.NODE_ENV !== "production"
            ? message
            : "Failed to create student",
      },
      { status: 500 }
    );
  }
}
