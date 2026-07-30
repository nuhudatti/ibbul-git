import { NextResponse } from "next/server";
import { prisma } from "@/lib/services/prisma";
import { normalizeMatric } from "@/lib/matric";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assignmentId, studentMatric, action, score, deployUrl, status } = body;

    if (!assignmentId || !studentMatric) {
      return NextResponse.json({ error: "assignmentId and studentMatric are required" }, { status: 400 });
    }

    const norm = normalizeMatric(studentMatric);
    const id = `${assignmentId}-${norm}`;
    const data: any = {};

    if (action === "start") {
      data.status = "IN_PROGRESS";
      data.startedAt = new Date();
    } else if (action === "submit") {
      data.status = "SUBMITTED";
      data.submittedAt = new Date();
      if (score != null) data.score = score;
      if (deployUrl) data.deployUrl = deployUrl;
    } else if (action === "setDeploy") {
      data.deployUrl = deployUrl;
    } else if (action === "grade") {
      data.status = "GRADED";
      if (score != null) data.score = score;
    } else if (status) {
      data.status = status;
    } else {
      return NextResponse.json({ error: "Invalid enrollment action or status" }, { status: 400 });
    }

    const up = await prisma.enrollment.upsert({
      where: { id },
      update: data,
      create: {
        id,
        assignmentId,
        studentMatric: norm,
        status: (data.status as any) ?? "NOT_STARTED",
        startedAt: data.startedAt ?? undefined,
        submittedAt: data.submittedAt ?? undefined,
        score: data.score ?? undefined,
        deployUrl: data.deployUrl ?? undefined,
      },
    });

    return NextResponse.json({ enrollment: up });
  } catch (e) {
    console.error("Enrollment API error:", e);
    return NextResponse.json({ error: "Failed to upsert enrollment" }, { status: 500 });
  }
}
