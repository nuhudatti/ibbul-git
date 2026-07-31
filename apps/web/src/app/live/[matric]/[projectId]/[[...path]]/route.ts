import { NextResponse } from "next/server";
import { getDeploymentByPath, getDeploymentPath } from "@/lib/services/deployment-service";
import { buildPreviewHtml } from "@/lib/build-preview";
import { getArtifactByDeployUrl, seedDemoPortfolio } from "@/lib/services/portfolio-service";
import {
  PORTFOLIO_STARTER,
  CALCULATOR_STARTER,
} from "@/lib/mock-data";
import { normalizeRequestPath } from "@/lib/live-deploy-utils";
import { buildLiveDeployResponse } from "@/lib/live-deploy-runtime";
import type { ProjectFile } from "@/types";

const toBodyInit = (body: string | Uint8Array): BodyInit =>
  body instanceof Uint8Array ? new Uint8Array(body).buffer : body;

export async function GET(
  request: Request,
  context: { params: Promise<{ matric: string; projectId: string; path?: string[] }> }
) {
  const { matric, projectId, path } = await context.params;
  await seedDemoPortfolio();

  const normalizedMatric = matric.toLowerCase().trim();
  const normalizedProjectId = projectId.toLowerCase().trim();
  const deployUrl = getDeploymentPath(normalizedMatric, normalizedProjectId);
  const requestPath = normalizeRequestPath(path) || "index.html";

  const deployment = await getDeploymentByPath(deployUrl);

  if (deployment?.files) {
    return buildProjectResponse(deployment.files as ProjectFile[], requestPath, deployUrl);
  }

  const artifact = await getArtifactByDeployUrl(deployUrl);

  if (artifact) {
    let html = buildFallbackHtml(normalizedMatric, artifact);

    if (artifact.assignmentId === "asn-2") {
      html = buildPreviewHtml(CALCULATOR_STARTER);
    } else if (artifact.assignmentId === "asn-1") {
      html = buildPreviewHtml(PORTFOLIO_STARTER);
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }

  return new NextResponse(buildNotFoundHtml(requestPath || "/index.html", "/index.html"), {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

function buildProjectResponse(files: ProjectFile[], requestPath: string, deployUrl: string) {
  const response = buildLiveDeployResponse(files, requestPath, deployUrl);
  return new NextResponse(toBodyInit(response.body), {
    status: response.status,
    headers: response.headers,
  });
}

function buildFallbackHtml(matric: string, artifact: { studentName: string; title: string; courseName: string; description?: string }) {
  const displayMatric = matric.toUpperCase();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${artifact.title} · Project ULA</title>
<style>
  body { margin: 0; min-height: 100vh; font-family: system-ui, sans-serif; background: linear-gradient(180deg, #050508 0%, #111827 100%); color: #f8fafc; display: flex; align-items: center; justify-content: center; padding: 2rem; }
  .wrapper { max-width: 720px; width: 100%; background: rgba(15, 23, 42, 0.92); border: 1px solid rgba(148, 163, 184, 0.12); border-radius: 24px; padding: 2.5rem; box-shadow: 0 40px 120px rgba(15, 23, 42, 0.45); }
  h1 { margin: 0 0 1rem; font-size: clamp(2rem, 4vw, 3rem); line-height: 1.05; }
  p { margin: 0.75rem 0; color: #cbd5e1; line-height: 1.75; }
  .meta { display: grid; gap: 0.75rem; margin-top: 1.5rem; }
  .meta span { display: inline-flex; gap: 0.5rem; align-items: center; font-size: 0.95rem; color: #94a3b8; }
  .badge { padding: 0.4rem 0.75rem; background: rgba(34, 197, 94, 0.12); border-radius: 9999px; color: #a7f3d0; font-size: 0.85rem; font-weight: 700; }
</style>
</head>
<body>
<div class="wrapper">
  <span class="badge">Demo deployment</span>
  <h1>${artifact.title}</h1>
  <p>${artifact.description ?? "A live preview placeholder for a deployed student project."}</p>
  <div class="meta">
    <span>Student: ${artifact.studentName}</span>
    <span>Course: ${artifact.courseName}</span>
    <span>Matric: ${displayMatric}</span>
    <span>Live URL: /live/${matric}/${artifact.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}</span>
  </div>
</div>
</body>
</html>`;
}

const buildNotFoundHtml = (requestPath: string, entry: string) => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Not found — Project ULA</title>
<style>body{font-family:system-ui, sans-serif;min-height:100vh;margin:0;display:flex;align-items:center;justify-content:center;background:#050508;color:#f8fafc;padding:2rem;}code{color:#7dd3fc;}</style>
</head>
<body>
<div>
  <h1>Page not found</h1>
  <p>The file <code>${requestPath || entry}</code> could not be found in this deployment.</p>
</div>
</body>
</html>`;
