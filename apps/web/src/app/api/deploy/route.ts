import { NextResponse } from "next/server";
import { saveDeployment } from "@/lib/deployment-store";
import { matricToSlug } from "@/lib/matric";
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
