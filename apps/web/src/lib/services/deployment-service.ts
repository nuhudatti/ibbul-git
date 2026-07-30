import type { Prisma } from "@prisma/client";
import { matricToSlug, normalizeMatric } from "@/lib/matric";
import { prisma } from "@/lib/services/prisma";
import type { ProjectFile } from "@/types";

interface ProjectDeployment {
  id: string;
  studentMatric: string;
  assignmentId: string;
  projectName: string;
  files: unknown;
  deployUrl: string;
  deployedAt: Date;
  isLatest: boolean;
  approved: boolean;
  approvedAt: Date | null;
  reviewerId: string | null;
  reviewerName: string | null;
  reviewNote: string | null;
  status: string;
}

function toDeploymentRecord(record: any): ProjectDeployment | null {
  if (!record) return null;
  return {
    id: record.id,
    studentMatric: record.studentMatric,
    assignmentId: record.assignmentId,
    projectName: record.projectName,
    files: record.files,
    deployUrl: record.deployUrl,
    deployedAt: record.deployedAt,
    isLatest: record.isLatest,
    approved: record.approved,
    approvedAt: record.approvedAt,
    reviewerId: record.reviewerId,
    reviewerName: record.reviewerName,
    reviewNote: record.reviewNote,
    status: record.status,
  };
}

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

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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
        files: JSON.parse(JSON.stringify(files)),
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
  const record = await prisma.projectDeployment.findFirst({
    where: { deployUrl: normalized },
    orderBy: { deployedAt: "desc" },
  });
  return toDeploymentRecord(record);
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
