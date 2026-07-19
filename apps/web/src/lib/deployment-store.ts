import type { ProjectFile } from "@/types";
import { buildPreviewHtml } from "@/lib/build-preview";

export interface StoredDeployment {
  matric: string;
  projectId: string;
  deployPath: string;
  projectName: string;
  files: ProjectFile[];
  html: string;
  deployedAt: string;
}

/** In-memory store — MVP. Production: PostgreSQL + S3/CDN */
const deployments = new Map<string, StoredDeployment>();

function key(matric: string, projectId: string) {
  return `${matric.toLowerCase().trim()}/${projectId.toLowerCase().trim()}`;
}

function normalizePath(path: string) {
  const trimmed = path.trim().replace(/\\/g, "/").replace(/\/+$/, "");
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    try {
      return new URL(trimmed).pathname.toLowerCase().replace(/\/+$/, "");
    } catch {
      return trimmed.toLowerCase();
    }
  }
  return trimmed.toLowerCase();
}

export function saveDeployment(
  matric: string,
  projectId: string,
  projectName: string,
  files: ProjectFile[]
): StoredDeployment {
  const normalizedMatric = matric.toLowerCase().trim();
  const normalizedProjectId = projectId.toLowerCase().trim();
  const html = buildPreviewHtml(files);
  const record: StoredDeployment = {
    matric: normalizedMatric,
    projectId: normalizedProjectId,
    deployPath: `/live/${normalizedMatric}/${normalizedProjectId}`,
    projectName,
    files,
    html,
    deployedAt: new Date().toISOString(),
  };
  deployments.set(key(matric, projectId), record);
  return record;
}

export function getDeployment(
  matric: string,
  projectId: string
): StoredDeployment | undefined {
  return deployments.get(key(matric, projectId));
}

export function getDeploymentByPath(path: string): StoredDeployment | undefined {
  const normalized = normalizePath(path);
  return [...deployments.values()].find(
    (deployment) => normalizePath(deployment.deployPath) === normalized
  );
}

export function listDeploymentsByMatric(matric: string): StoredDeployment[] {
  const prefix = `${matric.toLowerCase().trim()}/`;
  return Array.from(deployments.entries())
    .filter(([k]) => k.startsWith(prefix))
    .map(([, v]) => v);
}
