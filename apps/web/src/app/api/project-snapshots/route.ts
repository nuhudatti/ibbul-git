import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
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
  folders?: string[];
  activeFilePath?: string;
  openTabs?: string[];
  explorerState?: { isOpen?: boolean; expandedFolders?: string[] };
  previewState?: {
    viewMode?: string;
    previewDevice?: string;
    previewKey?: number;
    deployment?: unknown;
  };
  workspaceState?: {
    folders?: string[];
    activeFilePath?: string;
    openTabs?: string[];
    explorerState?: { isOpen?: boolean; expandedFolders?: string[] };
    previewState?: {
      viewMode?: string;
      previewDevice?: string;
      previewKey?: number;
      deployment?: unknown;
    };
    metadata?: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;
  submitted?: boolean;
  deployUrl?: string;
  score?: number;
}

const normalizedPath = (path: string) =>
  path.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$|\s+/g, "");

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeLegacyJsonArray = (value: unknown): unknown[] =>
  Array.isArray(value) ? value : [];

const normalizeLegacyJsonObject = (value: unknown): Record<string, unknown> =>
  isPlainObject(value) ? value : {};

const parseJsonColumn = (value: unknown, fieldName: string): unknown => {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.error("[project-snapshots][GET] json-parse", {
        fieldName,
        message: error instanceof Error ? error.message : String(error),
      });
      return undefined;
    }
  }

  return value;
};

const jsonSafeValue = (value: unknown): Prisma.InputJsonValue => {
  if (value === null) {
    return undefined as unknown as Prisma.InputJsonValue;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) => jsonSafeValue(item)) as Prisma.InputJsonArray;
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, entry]) => [key, jsonSafeValue(entry)])
    ) as Prisma.InputJsonObject;
  }

  return String(value);
};

const normalizeDeploymentPayload = (value: unknown): Prisma.InputJsonValue | undefined => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const deployment = value as Record<string, unknown>;

  return jsonSafeValue({
    status: typeof deployment.status === "string" ? deployment.status : "idle",
    url: typeof deployment.url === "string" ? deployment.url : undefined,
    logs: Array.isArray(deployment.logs)
      ? deployment.logs.filter((entry): entry is string => typeof entry === "string")
      : [],
    progress: typeof deployment.progress === "number" ? deployment.progress : 0,
  });
};

const normalizePreviewStatePayload = (
  previewValue?: {
    viewMode?: string;
    previewDevice?: string;
    previewKey?: number;
    deployment?: unknown;
  },
  workspacePreviewValue?: {
    viewMode?: string;
    previewDevice?: string;
    previewKey?: number;
    deployment?: unknown;
  }
): Prisma.InputJsonValue => {
  const source = previewValue ?? workspacePreviewValue ?? {};

  return jsonSafeValue({
    viewMode: source.viewMode ?? "code",
    previewDevice: source.previewDevice ?? "desktop",
    previewKey: typeof source.previewKey === "number" ? source.previewKey : Date.now(),
    deployment: normalizeDeploymentPayload(source.deployment),
  });
};
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SnapshotPayload;
    const {
      matricNumber,
      projectId,
      assignmentId,
      projectName,
      files,
      folders,
      activeFilePath,
      openTabs,
      explorerState,
      previewState,
      workspaceState,
      metadata,
      submitted,
      deployUrl,
      score,
    } = body;

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

    const normalizedFiles = files.map((file) => ({
      path: normalizedPath(file.path),
      content: file.content,
      language: file.language ?? undefined,
    }));

    const normalizedFolders = Array.isArray(folders)
      ? folders
      : Array.isArray(workspaceState?.folders)
        ? workspaceState.folders
        : [];

    const normalizedOpenTabs = Array.isArray(openTabs)
      ? openTabs
      : Array.isArray(workspaceState?.openTabs)
        ? workspaceState.openTabs
        : [];

    const normalizedExplorerState = explorerState ?? workspaceState?.explorerState ?? {};
    const normalizedPreviewState = normalizePreviewStatePayload(previewState, workspaceState?.previewState);
    const normalizedMetadata = metadata ?? workspaceState?.metadata ?? {};
    const snapshotData: Prisma.ProjectSnapshotUncheckedCreateInput = {
      studentMatric: canonicalMatric,
      assignmentId: normalizedAssignmentId,
      projectName,
      files: jsonSafeValue(normalizedFiles) as Prisma.InputJsonValue,
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

    console.info("[project-snapshots][GET] request-start", {
      url: request.url,
      matricNumber,
      assignmentId,
    });

    if (!matricNumber || !assignmentId) {
      return NextResponse.json({ error: "matricNumber and assignmentId are required" }, { status: 400 });
    }

    const canonicalMatric = normalizeMatric(matricNumber);
    console.info("[project-snapshots][GET] matric-lookup", {
      rawMatricNumber: matricNumber,
      canonicalMatric,
    });

    let studentLookup;
    try {
      studentLookup = await prisma.studentProfile.findUnique({
        where: { matric: canonicalMatric },
        select: { matric: true },
      });
    } catch (studentLookupError) {
      console.error("[project-snapshots][GET] studentMatric-lookup", studentLookupError);
      throw studentLookupError;
    }

    console.info("[project-snapshots][GET] studentMatric-lookup", {
      canonicalMatric,
      found: Boolean(studentLookup),
    });

    console.info("[project-snapshots][GET] assignmentId-lookup", { assignmentId });

    const snapshot = await prisma.projectSnapshot.findFirst({
      where: {
        studentMatric: canonicalMatric,
        assignmentId,
      },
      orderBy: { savedAt: "desc" },
      select: {
        id: true,
        studentMatric: true,
        assignmentId: true,
        projectName: true,
        files: true,
        savedAt: true,
        submittedAt: true,
        deployUrl: true,
        score: true,
      },
    });

    console.info("[project-snapshots][GET] projectSnapshot-query", {
      found: Boolean(snapshot),
      snapshotId: snapshot?.id ?? null,
      assignmentId,
      studentMatric: canonicalMatric,
    });

    if (!snapshot) {
      return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
    }

    let parsedFiles: unknown = [];
    try {
      parsedFiles = parseJsonColumn(snapshot.files, "files") ?? [];
    } catch (jsonParseError) {
      console.error("[project-snapshots][GET] response-json-parsing", jsonParseError);
      throw jsonParseError;
    }

    const normalizedSnapshot = {
      id: snapshot.id,
      studentMatric: snapshot.studentMatric,
      assignmentId: snapshot.assignmentId,
      projectName: snapshot.projectName,
      files: normalizeLegacyJsonArray(parsedFiles),
      folders: [],
      activeFilePath: null,
      openTabs: [],
      explorerState: {},
      previewState: {},
      workspaceState: {},
      metadata: {},
      savedAt: snapshot.savedAt.toISOString(),
      submittedAt: snapshot.submittedAt?.toISOString() ?? null,
      deployUrl: snapshot.deployUrl ?? undefined,
      score: snapshot.score ?? undefined,
    };

    console.info("[project-snapshots][GET] response-serialization", {
      snapshotId: snapshot.id,
      filesCount: normalizedSnapshot.files.length,
      foldersCount: normalizedSnapshot.folders.length,
      openTabsCount: normalizedSnapshot.openTabs.length,
    });

    return NextResponse.json({ snapshot: normalizedSnapshot });
  } catch (error) {
    const devMessage = error instanceof Error ? error.message : String(error);
    console.error("[project-snapshots][GET] unable-to-load-project-snapshot", {
      error: devMessage,
      url: request.url,
    });

    return NextResponse.json(
      {
        error: process.env.NODE_ENV !== "production" ? devMessage : "Failed to load project snapshot",
      },
      { status: 500 }
    );
  }
}
