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
  | "Submitted"
  | "Under review"
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
    createdAt?: string | null;
    title: string;
    summary: string | null;
    reviewerName: string | null;
    projectSnapshotId: string | null;
    revisions?: Array<{ revisionNumber: number }>;
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
  activeReviewsCount: number;
  latestReviewId: string | null;
  latestReviewStatus: ReviewStatus | null;
  latestReviewUpdatedAt: string | null;
  latestReviewSubmittedAt: string | null;
}

export type LecturerStudentDetail = LecturerStudentSummary;

export interface LecturerSubmissionStudent {
  matric: string;
  displayName: string;
  avatar: string;
  program: string;
}

export interface LecturerSubmissionEntry extends LecturerStudentSubmissionEntry {
  studentMatric: string;
  student: LecturerSubmissionStudent;
}

export function resolveSubmissionStatus(review: { status: ReviewStatus | string } | null) {
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
        actionLabel: "Open review",
        actionType: "view" as const,
      };
    case "APPROVED":
    case "PUBLISHED":
      return {
        statusLabel: "Approved" as const,
        actionLabel: "Open review",
        actionType: "view" as const,
      };
    case "REJECTED":
      return {
        statusLabel: "Rejected" as const,
        actionLabel: "Open review",
        actionType: "view" as const,
      };
    case "SUBMITTED":
    case "UNDER_REVIEW":
    case "RESUBMITTED":
      return {
        statusLabel: "Under review" as const,
        actionLabel: "Open review",
        actionType: "view" as const,
      };
    default:
      return {
        statusLabel: "Submitted" as const,
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

function buildSubmissionMap<T extends { studentMatric: string; assignmentId: string }>(items: T[]) {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = submissionKey(item.studentMatric, item.assignmentId);
    if (!map.has(key)) {
      map.set(key, item);
    }
  }
  return map;
}

type LecturerSubmissionEntryWithMatric = LecturerStudentSubmissionEntry & {
  studentMatric: string;
};

function buildSubmissionEntries(
  enrollments: Array<{
    assignmentId: string;
    studentMatric: string;
    status: string;
    submittedAt?: Date | null;
    score?: number | null;
    deployUrl?: string | null;
    assignment: { id: string; title: string; status: string };
    id: string;
  }>,
  snapshots: Array<{
    id: string;
    studentMatric: string;
    assignmentId: string;
    projectName: string;
    files: unknown;
    submittedAt?: Date | null;
    deployUrl?: string | null;
  }>,
  reviews: Array<{
    id: string;
    studentMatric: string;
    assignmentId: string;
    status: string;
    submittedAt?: Date | null;
    updatedAt?: Date | null;
    createdAt?: Date | null;
    title: string;
    summary?: string | null;
    reviewerName?: string | null;
    projectSnapshotId: string | null;
    revisions?: Array<{ revisionNumber: number }>;
  }>
): LecturerSubmissionEntry[] {
  const snapshotMap = buildSubmissionMap(snapshots);
  const reviewMap = buildSubmissionMap(reviews);

  return enrollments.map((enrollment) => {
    const key = submissionKey(enrollment.studentMatric, enrollment.assignmentId);
    const snapshot = snapshotMap.get(key) ?? null;
    const review = reviewMap.get(key) ?? null;
    const { statusLabel, actionLabel, actionType } = resolveSubmissionStatus(review);
    const student = resolveStudent(normalizeMatric(enrollment.studentMatric));

    return {
      studentMatric: enrollment.studentMatric,
      student: {
        matric: normalizeMatric(enrollment.studentMatric),
        displayName: student.displayName,
        avatar: student.avatar,
        program: student.program,
      },
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
            status: review.status as ReviewStatus,
            submittedAt: review.submittedAt?.toISOString() ?? null,
            updatedAt: review.updatedAt?.toISOString() ?? null,
            createdAt: review.createdAt?.toISOString() ?? null,
            title: review.title,
            summary: review.summary ?? null,
            reviewerName: review.reviewerName ?? null,
            projectSnapshotId: review.projectSnapshotId,
            revisions: Array.isArray(review.revisions)
              ? review.revisions.map((revision) => ({ revisionNumber: revision.revisionNumber }))
              : [],
          }
        : null,
      statusLabel,
      actionLabel,
      actionType,
    };
  });
}

function isReviewActive(review: { status: ReviewStatus } | null) {
  return Boolean(
    review &&
      ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "RESUBMITTED"].includes(review.status)
  );
}

function getLatestReview(submissions: LecturerStudentSubmissionEntry[]) {
  return submissions
    .map((submission) => submission.review)
    .filter((review): review is NonNullable<typeof review> => Boolean(review))
    .sort((a, b) => {
      const aTime = new Date(a.updatedAt ?? a.submittedAt ?? 0).getTime();
      const bTime = new Date(b.updatedAt ?? b.submittedAt ?? 0).getTime();
      return bTime - aTime;
    })[0] ?? null;
}

export async function getLecturerSubmissionEntries(studentMatric?: string) {
  const normalizedMatric = studentMatric ? normalizeMatric(studentMatric) : undefined;

  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentMatric: normalizedMatric,
      status: { in: ["SUBMITTED", "GRADED"] },
      assignment: { status: "PUBLISHED" },
    },
    include: {
      assignment: true,
    },
    orderBy: { submittedAt: "desc" },
  });

  const studentMatricList = normalizedMatric
    ? [normalizedMatric]
    : [...new Set(enrollments.map((enrollment) => normalizeMatric(enrollment.studentMatric)))];
  const assignmentIds = [...new Set(enrollments.map((enrollment) => enrollment.assignmentId))];

  const snapshots = assignmentIds.length && studentMatricList.length
    ? await prisma.projectSnapshot.findMany({
        where: {
          studentMatric: { in: studentMatricList },
          assignmentId: { in: assignmentIds },
        },
        orderBy: { savedAt: "desc" },
      })
    : [];

  const reviews = assignmentIds.length && studentMatricList.length
    ? await prisma.review.findMany({
        where: {
          studentMatric: { in: studentMatricList },
          assignmentId: { in: assignmentIds },
        },
        orderBy: { updatedAt: "desc" },
      })
    : [];

  return buildSubmissionEntries(enrollments, snapshots, reviews);
}

export async function getLecturerStudentSummaries() {
  const entries = await getLecturerSubmissionEntries();

  const studentsByMatric = new Map<string, { info: ReturnType<typeof getStudentInfo>; submissions: LecturerStudentSubmissionEntry[] }>();

  for (const entry of entries) {
    const studentMatric = normalizeMatric(entry.studentMatric);
    const existing = studentsByMatric.get(studentMatric);
    if (existing) {
      existing.submissions.push(entry);
    } else {
      studentsByMatric.set(studentMatric, {
        info: getStudentInfo(studentMatric),
        submissions: [entry],
      });
    }
  }

  const summaries: LecturerStudentSummary[] = Array.from(studentsByMatric.values()).map(({ info, submissions }) => {
    const latestReview = getLatestReview(submissions);
    return {
      ...info,
      submissions,
      activeReviewsCount: submissions.filter((submission) => isReviewActive(submission.review)).length,
      latestReviewId: latestReview?.id ?? null,
      latestReviewStatus: latestReview?.status ?? null,
      latestReviewUpdatedAt: latestReview?.updatedAt ?? latestReview?.submittedAt ?? null,
      latestReviewSubmittedAt: latestReview?.submittedAt ?? null,
    };
  });

  return summaries;
}

export async function getLecturerStudentDetail(matric: string) {
  const normalized = normalizeMatric(matric);
  const entries = await getLecturerSubmissionEntries(normalized);
  const studentInfo = getStudentInfo(normalized);

  const submissions = entries.map(({ studentMatric: _studentMatric, student: _student, ...entry }) => entry);

  return {
    ...studentInfo,
    submissions,
  };
}

export async function getLecturerSubmissionPayload(studentMatric?: string) {
  const entries = await getLecturerSubmissionEntries(studentMatric);

  return entries.map((entry) => ({
    studentMatric: entry.studentMatric,
    student: entry.student,
    assignmentId: entry.assignmentId,
    assignmentTitle: entry.assignmentTitle,
    assignmentStatus: entry.assignmentStatus,
    enrollment: entry.enrollment,
    snapshot: entry.snapshot,
    review: entry.review,
    statusLabel: entry.statusLabel,
    actionLabel: entry.actionLabel,
    actionType: entry.actionType,
  }));
}