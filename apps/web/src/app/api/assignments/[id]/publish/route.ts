import { NextResponse } from "next/server";
import { prisma } from "@/lib/services/prisma";
import { getClassRosterMatrics } from "@/lib/class-roster";
import { requireLecturer } from "@/lib/lecturer-auth";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await requireLecturer(req);
  if ("error" in auth) return auth.error;

  try {
    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    const roster = getClassRosterMatrics();
    const existingStudents = await prisma.studentProfile.findMany({
      where: { matric: { in: roster } },
      select: { matric: true },
    });
    const validMatricSet = new Set(existingStudents.map((student) => student.matric));
    const enrollments = roster
      .filter((studentMatric) => validMatricSet.has(studentMatric))
      .map((studentMatric) => ({
        id: `${id}-${studentMatric}`,
        assignmentId: id,
        studentMatric,
        status: "NOT_STARTED" as const,
      }));

    if (enrollments.length > 0) {
      await prisma.enrollment.createMany({
        data: enrollments,
        skipDuplicates: true,
      });
    }

    const enrolled = await prisma.enrollment.count({ where: { assignmentId: id } });
    const updated = await prisma.assignment.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        enrolled,
      },
      include: { enrollments: true },
    });

    return NextResponse.json({ assignment: updated });
  } catch (error) {
    console.error("[Publish Assignment Error]", { assignmentId: id, error });
    return NextResponse.json({ error: "Failed to publish assignment" }, { status: 500 });
  }
}
