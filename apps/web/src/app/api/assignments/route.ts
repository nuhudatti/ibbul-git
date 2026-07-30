import { NextResponse } from "next/server";
import { prisma } from "@/lib/services/prisma";

export async function GET() {
  const assignments = await prisma.assignment.findMany({
    orderBy: { createdAt: "desc" },
    include: { enrollments: true },
  });
  return NextResponse.json({ assignments });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      title,
      description,
      instructions,
      deadline,
      maxScore,
      difficulty,
      starterFiles,
    } = body;
    const created = await prisma.assignment.create({
      data: {
        id: body.id ?? undefined,
        title,
        description: description ?? undefined,
        instructions: instructions ?? undefined,
        deadline: deadline ? new Date(deadline) : undefined,
        maxScore: maxScore ?? 100,
        difficulty: difficulty ?? "medium",
        starterFiles: starterFiles ?? undefined,
      },
    });
    return NextResponse.json({ assignment: created });
  } catch (e) {
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}
