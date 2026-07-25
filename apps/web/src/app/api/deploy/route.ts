import { NextResponse } from "next/server";
import { saveDeployment } from "@/lib/deployment-store";
import { matricToSlug } from "@/lib/matric";
import { prisma } from "@/lib/services/prisma";
import type { ProjectFile } from "@/types";

export async function POST(request: Request) {
  const body = await request.json();
  const { projectId, matricNumber, projectName, files } = body as {
    projectId: string;
    matricNumber: string;
    projectName?: string;
    files: ProjectFile[];
  };

  if (!projectId || !matricNumber || !files?.length) {
    return NextResponse.json(
      { error: "Missing projectId, matricNumber, or files" },
      { status: 400 }
    );
  }

  const matricSlug = matricToSlug(matricNumber);
  const normalizedProjectId = projectId.toLowerCase().trim();
  const record = saveDeployment(matricSlug, normalizedProjectId, projectName ?? "Project", files);
  const origin = new URL(request.url).origin;
  const url = `${origin}/live/${matricSlug}/${normalizedProjectId}`;

  // Persist project snapshot to the database so /live/... is backed by Prisma
  try {
    const studentMatric = matricSlug.toUpperCase();
    const assignmentId = normalizedProjectId; // use projectId as assignmentId for snapshot mapping
    const existing = await prisma.projectSnapshot.findFirst({
      where: { studentMatric, assignmentId },
    });

    if (existing) {
      await prisma.projectSnapshot.update({
        where: { id: existing.id },
        data: {
          projectName: projectName ?? existing.projectName,
          files: files as any,
          savedAt: new Date(),
          deployUrl: url,
        },
      });
    } else {
      await prisma.projectSnapshot.create({
        data: {
          studentMatric,
          assignmentId,
          projectName: projectName ?? "Project",
          files: files as any,
          savedAt: new Date(),
          deployUrl: url,
        },
      });
    }
  } catch (e) {
    console.warn("Failed to persist snapshot on deploy:", e);
  }

  return NextResponse.json({
    id: `dep-${Date.now()}`,
    status: "SUCCESS",
    url,
    deployedAt: record.deployedAt,
    buildLogs: [
      "Bundling static assets...",
      "Optimizing for production...",
      "Publishing to ULA edge...",
      "Deployment complete.",
    ],
    filesProcessed: files.length,
  });
}
