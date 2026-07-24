import { NextResponse } from "next/server";
import { getDeployment, getDeploymentByPath } from "@/lib/deployment-store";
import { buildPreviewHtml } from "@/lib/build-preview";
import { getArtifactByDeployUrl, seedDemoPortfolio } from "@/lib/services/portfolio-service";
import {
  PORTFOLIO_STARTER,
  CALCULATOR_STARTER,
} from "@/lib/mock-data";

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

export async function GET(
  _request: Request,
  context: { params: Promise<{ matric: string; projectId: string }> }
) {
  const { matric, projectId } = await context.params;
  await seedDemoPortfolio();
  const deployment = getDeployment(matric, projectId);

  if (deployment) {
    return new NextResponse(deployment.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }

  const normalizedMatric = matric.toLowerCase().trim();
  const deployUrl = `/live/${normalizedMatric}/${projectId.toLowerCase().trim()}`;
  const deploymentByPath = getDeploymentByPath(deployUrl);

  if (deploymentByPath) {
    return new NextResponse(deploymentByPath.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
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

  return new NextResponse(
    `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Not deployed — Project ULA</title>
  <style>
    * { margin: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #050508;
      color: #f4f4f5;
      padding: 2rem;
    }
    .card {
      max-width: 420px;
      text-align: center;
      padding: 2.5rem;
      border-radius: 16px;
      background: #12121a;
      border: 1px solid rgba(255,255,255,0.08);
    }
    h1 { font-size: 1.25rem; margin-bottom: 0.75rem; }
    p { color: #a1a1aa; font-size: 0.9rem; line-height: 1.6; }
    code { color: #00e5ff; font-size: 0.85rem; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Project not live yet</h1>
    <p>This link has no deployment. Open Project ULA, build your project, and click <strong>Deploy</strong> first.</p>
    <p style="margin-top:1rem"><code>/live/${matric}/${projectId}</code></p>
  </div>
</body>
</html>`,
    {
      status: 404,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    }
  );
}
