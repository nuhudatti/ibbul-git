import { matricToSlug, normalizeMatric } from "@/lib/matric";
import { prisma } from "@/lib/services/prisma";
import type { ProjectDeployment } from "@prisma/client";
import type { ProjectFile } from "@/types";

export function getDeploymentPath(matric: string, projectId: string) {
  const normalizedMatric = matricToSlug(matric).toLowerCase();
  const normalizedProjectId = projectId.toLowerCase().trim();
  return `/live/${normalizedMatric}/${normalizedProjectId}`;
}

export async function createDeployment(
  studentMatric: string,
  projectId: string,
  projectName: string,
  files: ProjectFile[]
) {
  const canonicalMatric = normalizeMatric(studentMatric);
  const normalizedProjectId = projectId.toLowerCase().trim();
  const deployUrl = getDeploymentPath(studentMatric, normalizedProjectId);

  return prisma.$transaction(async (tx) => {
    await tx.projectDeployment.updateMany({
      where: {
        studentMatric: canonicalMatric,
        assignmentId: normalizedProjectId,
        isLatest: true,
      },
      data: { isLatest: false },
    });

    const record = await tx.projectDeployment.create({
      data: {
        studentMatric: canonicalMatric,
        assignmentId: normalizedProjectId,
        projectName,
        files: files as any,
        deployUrl,
        isLatest: true,
      },
    });

    return record;
  });
}

export async function getLatestDeployment(
  studentMatric: string,
  projectId: string
) {
  const normalizedMatric = normalizeMatric(studentMatric);
  const normalizedProjectId = projectId.toLowerCase().trim();
  return prisma.projectDeployment.findFirst({
    where: {
      studentMatric: normalizedMatric,
      assignmentId: normalizedProjectId,
      isLatest: true,
    },
    orderBy: { deployedAt: "desc" },
  });
}

export async function getDeploymentByPath(path: string): Promise<ProjectDeployment | null> {
  const normalized = path.trim().replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/+$/, "").toLowerCase();
  return prisma.projectDeployment.findFirst({
    where: { deployUrl: normalized },
    orderBy: { deployedAt: "desc" },
  });
}

export async function getLatestVerifiedDeployment(
  studentMatric: string,
  projectId: string
) {
  const normalizedMatric = normalizeMatric(studentMatric);
  const normalizedProjectId = projectId.toLowerCase().trim();
  return prisma.projectDeployment.findFirst({
    where: {
      studentMatric: normalizedMatric,
      assignmentId: normalizedProjectId,
      approved: true,
      isLatest: true,
    },
    orderBy: { approvedAt: "desc" },
  });
}

export async function listDeploymentsByStudent(matric: string) {
  const normalizedMatric = normalizeMatric(matric);
  return prisma.projectDeployment.findMany({
    where: { studentMatric: normalizedMatric },
    orderBy: { deployedAt: "desc" },
  });
}
