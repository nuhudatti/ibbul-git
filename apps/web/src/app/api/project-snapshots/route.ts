import { NextResponse } from "next/server";
import { prisma } from "@/lib/services/prisma";
import { normalizeMatric } from "@/lib/matric";
import { createReview } from "@/lib/services/review-workflow-service";
import type { ProjectFile } from "@/types";

interface SnapshotPayload {
  projectId?: string;
  assignmentId?: string;
  matricNumber: string;
  projectName: string;
  files: ProjectFile[];
  submitted?: boolean;
  deployUrl?: string;
  score?: number;
}

const normalizedPath = (path: string) =>
  path.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$|\s+/g, "");

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SnapshotPayload;
    const { matricNumber, projectId, assignmentId, projectName, files, submitted, deployUrl, score } = body;

    if (!matricNumber || !files || !Array.isArray(files) || !projectName) {
      return NextResponse.json({ error: "Missing required snapshot data" }, { status: 400 });
    }

    const canonicalMatric = normalizeMatric(matricNumber);
    const normalizedAssignmentId = assignmentId ?? projectId ?? "preview";
    const existing = await prisma.projectSnapshot.findFirst({
      where: {
        studentMatric: canonicalMatric,
        assignmentId: normalizedAssignmentId,
      },
      orderBy: { savedAt: "desc" },
    });

    const snapshotData = {
      studentMatric: canonicalMatric,
      assignmentId: normalizedAssignmentId,
      projectName,
      files: files.map((file) => ({ path: normalizedPath(file.path), content: file.content, language: file.language ?? undefined })),
      savedAt: new Date(),
      submittedAt: submitted ? new Date() : existing?.submittedAt ?? null,
      deployUrl: deployUrl ?? existing?.deployUrl ?? null,
      score: score ?? existing?.score ?? null,
    };

    const existingReview = await prisma.review.findFirst({
      where: {
        studentMatric: canonicalMatric,
        assignmentId: normalizedAssignmentId,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingReview && ["APPROVED", "PUBLISHED", "REJECTED"].includes(existingReview.status)) {
      return NextResponse.json(
        { error: "Cannot update snapshots after project approval, publication, or rejection." },
        { status: 403 }
      );
    }

    const snapshot = existing
      ? await prisma.projectSnapshot.update({
          where: { id: existing.id },
          data: snapshotData,
        })
      : await prisma.projectSnapshot.create({
          data: snapshotData,
        });

    if (snapshotData.submittedAt) {
      await createReview({
        studentMatric: canonicalMatric,
        assignmentId: normalizedAssignmentId,
        projectSnapshotId: snapshot.id,
        title: projectName,
        summary: "Student submission created.",
        files: Array.isArray(snapshot.files)
          ? snapshot.files.map((file: any) => ({
              fileName: file.path ?? file.fileName,
              fileUrl: file.url ?? null,
              fileType: file.language ?? null,
              sizeBytes: null,
            }))
          : [],
      });
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Unable to persist project snapshot:", error);
    return NextResponse.json({ error: "Failed to save project snapshot" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const matricNumber = url.searchParams.get("matricNumber") ?? undefined;
    const assignmentId = url.searchParams.get("assignmentId") ?? url.searchParams.get("projectId") ?? undefined;

    if (!matricNumber || !assignmentId) {
      return NextResponse.json({ error: "matricNumber and assignmentId are required" }, { status: 400 });
    }

    const canonicalMatric = normalizeMatric(matricNumber);
    const snapshot = await prisma.projectSnapshot.findFirst({
      where: {
        studentMatric: canonicalMatric,
        assignmentId,
      },
      orderBy: { savedAt: "desc" },
    });

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    return NextResponse.json({ snapshot });
  } catch (error) {
    console.error("Unable to load project snapshot:", error);
    return NextResponse.json({ error: "Failed to load project snapshot" }, { status: 500 });
  }
}
