import { NextResponse } from "next/server";
import { prisma } from "@/lib/services/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const assignment = await prisma.assignment.findUnique({ where: { id }, include: { enrollments: true } });
  if (!assignment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ assignment });
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await prisma.assignment.update({ where: { id }, data: {
      title: body.title,
      description: body.description ?? undefined,
      instructions: body.instructions ?? undefined,
      deadline: body.deadline ? new Date(body.deadline) : undefined,
      status: body.status ?? undefined,
      maxScore: body.maxScore ?? undefined,
      difficulty: body.difficulty ?? undefined,
      starterFiles: body.starterFiles ?? undefined,
    } });
    return NextResponse.json({ assignment: updated });
  } catch (e) {
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await prisma.enrollment.deleteMany({ where: { assignmentId: id } });
    await prisma.assignment.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
