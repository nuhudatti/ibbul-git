import { normalizeMatric } from "@/lib/matric";
import { prisma } from "@/lib/services/prisma";
import { getResolvedProfileRecord } from "@/lib/services/student-profile-service";
import type { PortfolioArtifact, PortfolioFeedEvent } from "@/types";

function toPortfolioArtifact(record: {
  id: string;
  studentMatric: string;
  studentName: string;
  assignmentId: string;
  courseId: string;
  courseName: string;
  title: string;
  description: string | null;
  score: number | null;
  maxScore: number;
  deployUrl: string | null;
  timestamp: Date;
  submittedAt: Date;
  verified: boolean;
  verifiedAt: Date | null;
  lecturerId: string | null;
  lecturerName: string | null;
  lecturerNote: string | null;
  hash: string;
  status: "PENDING" | "SUBMITTED" | "VERIFIED" | "REJECTED";
  skills: string[];
  thumbnailGradient: string | null;
}): PortfolioArtifact {
  return {
    id: record.id,
    studentMatric: normalizeMatric(record.studentMatric),
    studentName: record.studentName,
    assignmentId: record.assignmentId,
    courseId: record.courseId,
    courseName: record.courseName,
    title: record.title,
    description: record.description ?? undefined,
    score: record.score,
    maxScore: record.maxScore,
    deployUrl: record.deployUrl ?? undefined,
    timestamp: record.timestamp.toISOString(),
    submittedAt: record.submittedAt.toISOString(),
    verified: record.verified,
    verifiedAt: record.verifiedAt?.toISOString(),
    lecturerId: record.lecturerId ?? undefined,
    lecturerName: record.lecturerName ?? undefined,
    lecturerNote: record.lecturerNote ?? undefined,
    hash: record.hash,
    status: record.status,
    skills: record.skills,
    thumbnailGradient: record.thumbnailGradient ?? undefined,
  };
}

function artifactToFeedEvent(artifact: PortfolioArtifact): PortfolioFeedEvent {
  return {
    id: `feed-${artifact.id}`,
    type: artifact.verified ? "verify" : artifact.deployUrl ? "deploy" : "submit",
    studentMatric: normalizeMatric(artifact.studentMatric),
    studentName: artifact.studentName,
    title: artifact.title,
    message: artifact.verified
      ? `verified ${artifact.title}`
      : artifact.deployUrl
        ? `deployed ${artifact.title}`
        : `submitted ${artifact.title}`,
    timestamp: artifact.timestamp,
    artifactId: artifact.id,
    score: artifact.score ?? undefined,
  };
}

export async function getAllArtifacts(): Promise<PortfolioArtifact[]> {
  const rows = await prisma.portfolioArtifact.findMany({
    orderBy: { timestamp: "desc" },
  });
  return rows.map(toPortfolioArtifact);
}

export async function getArtifactsByMatric(matric: string): Promise<PortfolioArtifact[]> {
  const norm = normalizeMatric(matric);
  const rows = await prisma.portfolioArtifact.findMany({
    where: { studentMatric: norm },
    orderBy: { timestamp: "desc" },
  });
  return rows.map(toPortfolioArtifact);
}

export async function getArtifactById(id: string) {
  const row = await prisma.portfolioArtifact.findUnique({ where: { id } });
  return row ? toPortfolioArtifact(row) : null;
}

export async function getArtifactByDeployUrl(deployUrl: string) {
  const rows = await prisma.portfolioArtifact.findMany({
    orderBy: { timestamp: "desc" },
  });
  const target = deployUrl.toLowerCase().trim().replace(/\/+$/, "");
  return rows
    .map(toPortfolioArtifact)
    .find((artifact) => artifact.deployUrl?.toLowerCase().trim().replace(/\/+$/, "") === target) ?? null;
}

export async function upsertServerArtifact(artifact: PortfolioArtifact) {
  const row = await prisma.portfolioArtifact.upsert({
    where: { hash: artifact.hash },
    update: {
      studentName: artifact.studentName,
      assignmentId: artifact.assignmentId,
      courseId: artifact.courseId,
      courseName: artifact.courseName,
      title: artifact.title,
      description: artifact.description ?? null,
      score: artifact.score,
      maxScore: artifact.maxScore,
      deployUrl: artifact.deployUrl ?? null,
      timestamp: new Date(artifact.timestamp),
      submittedAt: new Date(artifact.submittedAt),
      verified: artifact.verified,
      verifiedAt: artifact.verifiedAt ? new Date(artifact.verifiedAt) : null,
      lecturerId: artifact.lecturerId ?? null,
      lecturerName: artifact.lecturerName ?? null,
      lecturerNote: artifact.lecturerNote ?? null,
      status: artifact.status,
      skills: artifact.skills,
      thumbnailGradient: artifact.thumbnailGradient ?? null,
    },
    create: {
      studentMatric: normalizeMatric(artifact.studentMatric),
      studentName: artifact.studentName,
      assignmentId: artifact.assignmentId,
      courseId: artifact.courseId,
      courseName: artifact.courseName,
      title: artifact.title,
      description: artifact.description ?? null,
      score: artifact.score,
      maxScore: artifact.maxScore,
      deployUrl: artifact.deployUrl ?? null,
      timestamp: new Date(artifact.timestamp),
      submittedAt: new Date(artifact.submittedAt),
      verified: artifact.verified,
      verifiedAt: artifact.verifiedAt ? new Date(artifact.verifiedAt) : null,
      lecturerId: artifact.lecturerId ?? null,
      lecturerName: artifact.lecturerName ?? null,
      lecturerNote: artifact.lecturerNote ?? null,
      hash: artifact.hash,
      status: artifact.status,
      skills: artifact.skills,
      thumbnailGradient: artifact.thumbnailGradient ?? null,
    },
  });

  return toPortfolioArtifact(row);
}

export async function verifyServerArtifact(
  id: string,
  lecturerId: string,
  lecturerName: string,
  approved: boolean,
  note?: string
) {
  const existing = await prisma.portfolioArtifact.findUnique({ where: { id } });
  if (!existing) return null;

  // Persist artifact verification and also mark the student's latest
  // project snapshot (if any) as graded so other clients can read the
  // authoritative graded state from the database.
  const [updated] = await prisma.$transaction([
    prisma.portfolioArtifact.update({
      where: { id },
      data: {
        verified: approved,
        verifiedAt: new Date(),
        lecturerId,
        lecturerName,
        lecturerNote: note ?? null,
        status: approved ? "VERIFIED" : "REJECTED",
      },
    }),
    // Update the latest ProjectSnapshot for this student+assignment (if present)
    // to include the artifact score as the persisted grade. This ensures
    // lecturer verification appears for other devices that read server data.
    prisma.projectSnapshot.updateMany({
      where: {
        studentMatric: existing.studentMatric,
        assignmentId: existing.assignmentId,
      },
      data: {
        score: existing.score ?? undefined,
        // keep submittedAt if already set; otherwise set to now when marking graded
        submittedAt: existing.score != null ? new Date() : undefined,
      },
    }),
  ]);

  return toPortfolioArtifact(updated as any);
}

export async function getGlobalFeed(limit = 24): Promise<PortfolioFeedEvent[]> {
  const rows = await prisma.portfolioArtifact.findMany({
    orderBy: { timestamp: "desc" },
    take: limit,
  });
  return rows.map((row) => artifactToFeedEvent(toPortfolioArtifact(row))).slice(0, limit);
}

export async function seedDemoPortfolio() {
  const count = await prisma.portfolioArtifact.count({ where: { verified: true } });
  if (count >= 3) return;

  const demos: PortfolioArtifact[] = [
    {
      id: "art-demo-1",
      studentMatric: "U22/FNS/CSC/1103",
      studentName: "Chidi Okafor",
      assignmentId: "asn-1",
      courseId: "CS101-WebDev",
      courseName: "Web Development",
      title: "Personal Portfolio Website",
      score: 92,
      maxScore: 100,
      deployUrl: "/live/u22-fns-csc-1103/proj-demo-001",
      timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
      submittedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
      verified: true,
      verifiedAt: new Date(Date.now() - 86400000 * 4).toISOString(),
      lecturerId: "LEC001",
      lecturerName: "Nuhu Muhammad Datti",
      lecturerNote: "Strong portfolio structure and deployment story.",
      hash: "9f3a8c1e21b4d7f0",
      status: "VERIFIED",
      skills: ["HTML", "CSS", "JavaScript", "Responsive Design"],
      thumbnailGradient: "from-cyan-500/30 to-violet-600/30",
    },
    {
      id: "art-demo-2",
      studentMatric: "U22/FNS/CSC/1102",
      studentName: "Amina Yusuf",
      assignmentId: "asn-1",
      courseId: "CS101-WebDev",
      courseName: "Web Development",
      title: "Personal Portfolio Website",
      score: 87,
      maxScore: 100,
      deployUrl: "/live/u22-fns-csc-1102/asn-1",
      timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
      submittedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      verified: true,
      verifiedAt: new Date(Date.now() - 86400000).toISOString(),
      lecturerId: "LEC001",
      lecturerName: "Nuhu Muhammad Datti",
      lecturerNote: "Good layout and accessibility polish.",
      hash: "a1b2c3d4e5f67890",
      status: "VERIFIED",
      skills: ["HTML", "CSS", "Layout", "Accessibility"],
      thumbnailGradient: "from-emerald-500/25 to-cyan-500/25",
    },
    {
      id: "art-demo-3",
      studentMatric: "U22/FNS/CSC/1101",
      studentName: "Nuhu Ibrahim",
      assignmentId: "asn-2",
      courseId: "CS101-WebDev",
      courseName: "Web Development",
      title: "Interactive Calculator App",
      score: 94,
      maxScore: 100,
      deployUrl: "/live/u22-fns-csc-1101/calc-001",
      timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
      submittedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      verified: true,
      verifiedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      lecturerId: "LEC001",
      lecturerName: "Nuhu Muhammad Datti",
      lecturerNote: "Excellent output and logic quality.",
      hash: "f4e8b2c19d0a7e31",
      status: "VERIFIED",
      skills: ["JavaScript", "DOM", "Logic"],
      thumbnailGradient: "from-amber-500/20 to-cyan-500/25",
    },
  ];

  for (const artifact of demos) {
    await upsertServerArtifact(artifact);
  }

  const profile = await getResolvedProfileRecord("U22/FNS/CSC/1104");
  if (profile) {
    await upsertServerArtifact({
      id: `art-demo-4-${Date.now()}`,
      studentMatric: profile.matric,
      studentName: profile.displayName,
      assignmentId: "asn-preview",
      courseId: "CS101-WebDev",
      courseName: "Web Development",
      title: "Data Dashboard",
      score: 86,
      maxScore: 100,
      deployUrl: "/live/u22-fns-csc-1104/dashboard-001",
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      submittedAt: new Date(Date.now() - 3600000).toISOString(),
      verified: false,
      hash: `demo-${Date.now()}-4`,
      status: "SUBMITTED",
      skills: ["Data", "Charts", "UI"],
      thumbnailGradient: "from-violet-500/25 to-cyan-500/25",
    });
  }
}
