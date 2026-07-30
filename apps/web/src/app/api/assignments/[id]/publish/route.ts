import { NextResponse } from "next/server";
import { prisma } from "@/lib/services/prisma";
import { getClassRosterMatrics } from "@/lib/class-roster";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const roster = getClassRosterMatrics();
    // create enrollments for roster
    const ops = roster.map((matric) => ({
      assignmentId: id,
      studentMatric: matric,
      status: "NOT_STARTED",
    }));
    // upsert enrollments (create many ignoring conflicts)
    for (const op of ops) {
      await prisma.enrollment.upsert({
        where: { id: `${op.assignmentId}-${op.studentMatric}` },
        update: {},
        create: {
          id: `${op.assignmentId}-${op.studentMatric}`,
          assignmentId: op.assignmentId,
          studentMatric: op.studentMatric,
          status: "NOT_STARTED",
        },
      });
    }
    const updated = await prisma.assignment.update({ where: { id }, data: { status: "PUBLISHED", enrolled: roster.length } });
    const enrollments = await prisma.enrollment.findMany({ where: { assignmentId: id } });
    return NextResponse.json({ assignment: updated, enrollments });
  } catch (e) {
    return NextResponse.json({ error: "Failed to publish" }, { status: 500 });
  }
}
