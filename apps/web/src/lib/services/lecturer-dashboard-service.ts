import { prisma } from "@/lib/services/prisma";
import { normalizeMatric } from "@/lib/matric";
import { resolveStudent } from "@/lib/student-directory";

type ReviewStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "RESUBMITTED"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED";

export type LecturerSubmissionStatus =
  | "Awaiting review"
  | "Changes requested"
  | "Approved"
  | "Rejected"
  | "In review";

export type LecturerSubmissionAction =
  | "review"
  | "view"
  | "continue";

export interface LecturerStudentSubmissionEntry {
  assignmentId: string;
  assignmentTitle: string;
  assignmentStatus: string;
  enrollment: {
    id?: string;
    status: string;
    submittedAt?: string | null;
    score?: number | null;
    deployUrl?: string | null;
  };
  snapshot: {
    id: string;
    projectName: string;
    files: Array<{ path?: string; content?: string; language?: string }>;
    submittedAt?: string | null;
    deployUrl?: string | null;
  } | null;
  review: {
    id: string;
    status: ReviewStatus;
    submittedAt?: string | null;
    updatedAt?: string | null;
    title: string;
    summary: string | null;
    reviewerName: string | null;
    projectSnapshotId: string | null;
  } | null;
  statusLabel: LecturerSubmissionStatus;
  actionLabel: string;
  actionType: LecturerSubmissionAction;
}

export interface LecturerStudentSummary {
  matric: string;
  displayName: string;
  avatar: string;
  program: string;
  submissions: LecturerStudentSubmissionEntry[];
}

function getStatusAndAction(review: { status: ReviewStatus } | null) {
  if (!review) {
    return {
      statusLabel: "Awaiting review" as const,
      actionLabel: "Review Project",
      actionType: "review" as const,
    };
  }

  switch (review.status) {
    case "CHANGES_REQUESTED":
      return {
        statusLabel: "Changes requested" as const,
        actionLabel: "Continue Review",
        actionType: "continue" as const,
      };
    case "APPROVED":
      return {
        statusLabel: "Approved" as const,
        actionLabel: "View Review",
        actionType: "view" as const,
      };
    case "REJECTED":
      return {
        statusLabel: "Rejected" as const,
        actionLabel: "View Review",
        actionType: "view" as const,
      };
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "RESUBMITTED":
      return {
        statusLabel: "In review" as const,
        actionLabel: "View Review",
        actionType: "view" as const,
      };
    default:
      return {
        statusLabel: "Awaiting review" as const,
        actionLabel: "Review Project",
        actionType: "review" as const,
      };
  }
}

function getStudentInfo(matric: string) {
  const norm = normalizeMatric(matric);
  const student = resolveStudent(norm);
  return {
    matric: norm,
    displayName: student.displayName,
    avatar: student.avatar,
    program: student.program,
  };
}

function submissionKey(studentMatric: string, assignmentId: string) {
  return `${normalizeMatric(studentMatric)}:${assignmentId}`;
}

export async function getLecturerStudentSummaries() {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      status: { in: ["SUBMITTED", "GRADED"] },
      assignment: { status: "PUBLISHED" },
    },
    include: {
      assignment: true,
      student: {
        select: {
          matric: true,
          firstName: true,
          lastName: true,
          program: true,
          avatarInitials: true,
        },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const snapshotKeys = enrollments.map((enrollment) => ({
    studentMatric: normalizeMatric(enrollment.studentMatric),
    assignmentId: enrollment.assignmentId,
  }));
  const studentMatricList = [...new Set(snapshotKeys.map((item) => item.studentMatric))];
  const assignmentIds = [...new Set(snapshotKeys.map((item) => item.assignmentId))];

  const snapshots = await prisma.projectSnapshot.findMany({
    where: {
      studentMatric: { in: studentMatricList },
      assignmentId: { in: assignmentIds },
    },
    orderBy: { savedAt: "desc" },
  });

  const snapshotMap = new Map<string, typeof snapshots[0]>();
  for (const snapshot of snapshots) {
    const key = submissionKey(snapshot.studentMatric, snapshot.assignmentId);
    if (!snapshotMap.has(key)) {
      snapshotMap.set(key, snapshot);
    }
  }

  const reviews = await prisma.review.findMany({
    where: {
      studentMatric: { in: studentMatricList },
      assignmentId: { in: assignmentIds },
    },
    orderBy: { updatedAt: "desc" },
  });

  const reviewMap = new Map<string, typeof reviews[0]>();
  for (const review of reviews) {
    const key = submissionKey(review.studentMatric, review.assignmentId);
    if (!reviewMap.has(key)) {
      reviewMap.set(key, review);
    }
  }

  const studentsByMatric = new Map<string, LecturerStudentSummary>();

  for (const enrollment of enrollments) {
    const studentMatric = normalizeMatric(enrollment.studentMatric);
    const key = submissionKey(studentMatric, enrollment.assignmentId);
    const snapshot = snapshotMap.get(key) ?? null;
    const review = reviewMap.get(key) ?? null;
    const { statusLabel, actionLabel, actionType } = getStatusAndAction(review);

    const studentInfo = getStudentInfo(studentMatric);

    const entry: LecturerStudentSubmissionEntry = {
      assignmentId: enrollment.assignmentId,
      assignmentTitle: enrollment.assignment.title,
      assignmentStatus: enrollment.assignment.status,
      enrollment: {
        id: enrollment.id,
        status: enrollment.status,
        submittedAt: enrollment.submittedAt?.toISOString() ?? null,
        score: enrollment.score ?? null,
        deployUrl: enrollment.deployUrl ?? null,
      },
      snapshot: snapshot
        ? {
            id: snapshot.id,
            projectName: snapshot.projectName,
            files: Array.isArray(snapshot.files)
              ? snapshot.files.map((file) => ({
                  path: typeof file === "object" && file && "path" in file ? (file.path as string | undefined) : undefined,
                  content:
                    typeof file === "object" && file && "content" in file ? (file.content as string | undefined) : undefined,
                  language:
                    typeof file === "object" && file && "language" in file ? (file.language as string | undefined) : undefined,
                }))
              : [],
            submittedAt: snapshot.submittedAt?.toISOString() ?? null,
            deployUrl: snapshot.deployUrl ?? null,
          }
        : null,
      review: review
        ? {
            id: review.id,
            status: review.status,
            submittedAt: review.submittedAt?.toISOString() ?? null,
            updatedAt: review.updatedAt?.toISOString() ?? null,
            title: review.title,
            summary: review.summary ?? null,
            reviewerName: review.reviewerName ?? null,
            projectSnapshotId: review.projectSnapshotId,
          }
        : null,
      statusLabel,
      actionLabel,
      actionType,
    };

    const existing = studentsByMatric.get(studentMatric);
    if (existing) {
      existing.submissions.push(entry);
    } else {
      studentsByMatric.set(studentMatric, {
        ...studentInfo,
        submissions: [entry],
      });
    }
  }

  return Array.from(studentsByMatric.values());
}

export async function getLecturerStudentDetail(matric: string) {
  const normalized = normalizeMatric(matric);
  const students = await getLecturerStudentSummaries();
  const student = students.find((entry) => entry.matric === normalized);
  return student ?? null;
}
