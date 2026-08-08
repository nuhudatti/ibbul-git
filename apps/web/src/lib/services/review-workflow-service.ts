import { prisma } from "@/lib/services/prisma";

export type ReviewWorkflowStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "RESUBMITTED"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED";

interface ReviewChecklistInput {
  title: string;
  notes?: string;
  checked?: boolean;
}

interface FeedbackInput {
  reviewId: string;
  authorMatric: string;
  authorRole: string;
  message: string;
  feedbackType?: string;
  filePath?: string | null;
  lineNumber?: number | null;
  priority?: string;
  status?: string;
  isInternal?: boolean;
}

interface CreateReviewInput {
  studentMatric: string;
  assignmentId: string;
  projectSnapshotId?: string | null;
  title: string;
  summary?: string | null;
  reviewerMatric?: string | null;
  reviewerName?: string | null;
  checklist?: ReviewChecklistInput[];
  files?: Array<{ fileName: string; fileUrl?: string | null; fileType?: string | null; sizeBytes?: number | null }>;
}

export function resolveSubmissionReviewAction(existingStatus: ReviewWorkflowStatus | string | null | undefined, hasFiles: boolean) {
  const normalizedStatus = (existingStatus ?? "DRAFT") as ReviewWorkflowStatus;
  const terminalStatuses = new Set<ReviewWorkflowStatus>(["APPROVED", "PUBLISHED", "REJECTED"]);

  if (terminalStatuses.has(normalizedStatus as ReviewWorkflowStatus)) {
    throw new Error("Cannot modify a review that is already approved, published, or rejected.");
  }

  if (normalizedStatus === "CHANGES_REQUESTED" && hasFiles) {
    return {
      mode: "resubmit" as const,
      status: "RESUBMITTED" as const,
    };
  }

  return {
    mode: "refresh" as const,
    status: "SUBMITTED" as const,
  };
}

interface AddCommentInput {
  reviewId: string;
  authorMatric: string;
  authorRole: string;
  message: string;
  lineNumber?: number | null;
  isInternal?: boolean;
}

interface ReviewActionInput {
  reviewId: string;
  actorMatric: string;
  actorRole: string;
  message?: string;
  note?: string;
  deadline?: string | null;
  priority?: string | null;
  rating?: {
    codeQuality?: number;
    uiUx?: number;
    responsiveness?: number;
    accessibility?: number;
    performance?: number;
    bestPractices?: number;
    overall?: number;
  };
  isInternal?: boolean;
}

interface ResubmitRevisionInput {
  reviewId: string;
  studentMatric: string;
  summary?: string | null;
  files?: Array<{
    fileName: string;
    fileUrl?: string | null;
    fileType?: string | null;
    sizeBytes?: number | null;
  }>;
  deploymentUrl?: string | null;
}

const defaultChecklist: ReviewChecklistInput[] = [
  { title: "Project files are attached", checked: false },
  { title: "Deployment link is included", checked: false },
  { title: "Requirements are met", checked: false },
];

function normalizeChecklist(items?: ReviewChecklistInput[]) {
  const source: ReviewChecklistInput[] = items && items.length > 0 ? items : defaultChecklist;
  return source.map((item) => ({
    title: item.title,
    notes: item.notes ?? null,
    checked: item.checked ?? false,
  }));
}

async function notifyRecipient(recipientMatric: string, reviewId: string | null, message: string, type = "review") {
  return prisma.notification.create({
    data: {
      recipientMatric,
      reviewId,
      message,
      type,
    },
  });
}

export async function saveReviewDraft(reviewId: string, note?: string | null, summary?: string | null) {
  const review = await prisma.review.findUniqueOrThrow({
    where: { id: reviewId },
  });

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: "DRAFT",
      summary: summary ?? review.summary,
      outcomeNote: note ?? review.outcomeNote,
      reviewedAt: review.reviewedAt ?? new Date(),
      reviewStartedAt: review.reviewStartedAt ?? new Date(),
    },
  });

  await notifyRecipient(
    review.studentMatric,
    review.id,
    note ?? "Lecturer draft review saved.",
    "review"
  );

  return prisma.review.findUniqueOrThrow({
    where: { id: updated.id },
    include: {
      comments: true,
      revisions: true,
      checklist: true,
      notifications: true,
      rating: true,
    },
  });
}

async function resolveSubmissionInfo(studentMatric: string, assignmentId: string) {
  const student = await prisma.studentProfile.findUnique({
    where: { matric: studentMatric },
    select: { id: true },
  });

  const enrollment = await prisma.enrollment.findFirst({
    where: {
      studentMatric,
      assignmentId,
      status: { in: ["SUBMITTED", "GRADED"] },
    },
    orderBy: { submittedAt: "desc" },
    select: { id: true },
  });

  return {
    studentId: student?.id ?? null,
    submissionId: enrollment?.id ?? null,
  };
}

export async function createReview(input: CreateReviewInput) {
  const existingReview = await prisma.review.findFirst({
    where: {
      studentMatric: input.studentMatric,
      assignmentId: input.assignmentId,
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingReview) {
    const action = resolveSubmissionReviewAction(existingReview.status, Boolean(input.files?.length));

    if (action.mode === "resubmit") {
      await resubmitRevision({
        reviewId: existingReview.id,
        studentMatric: input.studentMatric,
        summary: input.summary ?? "Revision submitted.",
        files: input.files,
      });
      return getReviewById(existingReview.id);
    }

    await prisma.review.update({
      where: { id: existingReview.id },
      data: {
        status: action.status,
        submittedAt: new Date(),
        reviewStartedAt: existingReview.reviewStartedAt ?? new Date(),
        reviewerMatric: input.reviewerMatric ?? existingReview.reviewerMatric,
        reviewerName: input.reviewerName ?? existingReview.reviewerName,
        projectSnapshotId: input.projectSnapshotId ?? existingReview.projectSnapshotId,
        title: input.title ?? existingReview.title,
        summary: input.summary ?? existingReview.summary,
      },
    });

    return getReviewById(existingReview.id);
  }

  const review = await prisma.review.create({
    data: {
      studentMatric: input.studentMatric,
      assignmentId: input.assignmentId,
      projectSnapshotId: input.projectSnapshotId ?? null,
      title: input.title,
      summary: input.summary ?? null,
      reviewerMatric: input.reviewerMatric ?? null,
      reviewerName: input.reviewerName ?? null,
      status: "SUBMITTED",
      submittedAt: new Date(),
      reviewStartedAt: new Date(),
      checklist: {
        create: normalizeChecklist(input.checklist),
      },
      revisions: {
        create: input.files?.length
          ? {
              studentMatric: input.studentMatric,
              status: "SUBMITTED",
              submittedAt: new Date(),
              revisionNumber: 1,
              submitterMatric: input.studentMatric,
              submitterRole: "STUDENT",
              files: {
                create: input.files.map((file) => ({
                  fileName: file.fileName,
                  fileUrl: file.fileUrl ?? null,
                  fileType: file.fileType ?? null,
                  sizeBytes: file.sizeBytes ?? null,
                })),
              },
            }
          : undefined,
      },
    },
  });

  await notifyRecipient(input.studentMatric, review.id, "Your project has been submitted and is awaiting review.", "review");

  return getReviewById(review.id);
}

export async function addComment(input: AddCommentInput) {
  const comment = await prisma.reviewComment.create({
    data: {
      reviewId: input.reviewId,
      authorMatric: input.authorMatric,
      authorRole: input.authorRole,
      message: input.message,
      lineNumber: input.lineNumber ?? null,
      isInternal: input.isInternal ?? false,
    },
  });

  const review = await prisma.review.findUniqueOrThrow({
    where: { id: input.reviewId },
    select: { studentMatric: true, reviewerMatric: true },
  });

  const recipient = input.authorRole === "ADMIN" ? review.studentMatric : review.reviewerMatric ?? review.studentMatric;
  if (recipient) {
    await notifyRecipient(recipient, input.reviewId, input.message, "comment");
  }

  return comment;
}

export async function addFeedback(input: FeedbackInput) {
  const feedback = await prisma.reviewComment.create({
    data: {
      reviewId: input.reviewId,
      authorMatric: input.authorMatric,
      authorRole: input.authorRole,
      message: input.message,
      feedbackType: input.feedbackType ?? "GENERAL",
      filePath: input.filePath ?? null,
      lineNumber: input.lineNumber ?? null,
      priority: input.priority ?? "MEDIUM",
      status: input.status ?? "OPEN",
      isInternal: input.isInternal ?? false,
    },
  });

  const review = await prisma.review.findUniqueOrThrow({
    where: { id: input.reviewId },
    select: { studentMatric: true, reviewerMatric: true },
  });

  const recipient = input.authorRole === "ADMIN" ? review.studentMatric : review.reviewerMatric ?? review.studentMatric;
  if (recipient) {
    await notifyRecipient(recipient, input.reviewId, input.message, "feedback");
  }

  return feedback;
}

export async function addChecklistItem(reviewId: string, title: string, notes?: string | null, checked = false) {
  return prisma.reviewChecklist.create({
    data: {
      reviewId,
      title,
      notes: notes ?? null,
      checked,
    },
  });
}

export async function getReviewById(reviewId: string) {
  const review = await prisma.review.findUniqueOrThrow({
    where: { id: reviewId },
    include: {
      comments: {
        orderBy: { createdAt: "asc" },
      },
      revisions: {
        orderBy: { createdAt: "desc" },
        include: { files: true },
      },
      checklist: true,
      notifications: {
        orderBy: { createdAt: "desc" },
      },
      rating: true,
    },
  });

  const student = await prisma.studentProfile.findUnique({
    where: { matric: review.studentMatric },
    select: {
      id: true,
      matric: true,
      firstName: true,
      lastName: true,
      email: true,
      program: true,
      headline: true,
      avatarInitials: true,
      avatarUrl: true,
      accountRole: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  const projectSnapshot = review.projectSnapshotId
    ? await prisma.projectSnapshot.findUnique({
        where: { id: review.projectSnapshotId },
        select: {
          id: true,
          studentMatric: true,
          assignmentId: true,
          projectName: true,
          files: true,
          submittedAt: true,
          deployUrl: true,
          score: true,
        },
      })
    : null;

  const submission = await prisma.enrollment.findFirst({
    where: {
      studentMatric: review.studentMatric,
      assignmentId: review.assignmentId,
      status: { in: ["SUBMITTED", "GRADED"] },
    },
    orderBy: { submittedAt: "desc" },
    select: { id: true },
  });

  return {
    ...review,
    student,
    studentId: student?.id ?? null,
    submissionId: submission?.id ?? null,
    projectSnapshot: projectSnapshot
      ? {
          id: projectSnapshot.id,
          studentMatric: projectSnapshot.studentMatric,
          assignmentId: projectSnapshot.assignmentId,
          projectName: projectSnapshot.projectName,
          files: Array.isArray(projectSnapshot.files)
            ? (projectSnapshot.files as Array<{ path: string; content: string; language?: string }>)
            : [],
          activeFilePath: null,
          submittedAt: projectSnapshot.submittedAt ?? null,
          deployUrl: projectSnapshot.deployUrl ?? null,
          score: projectSnapshot.score ?? null,
          folders: [],
          openTabs: [],
          workspaceState: {},
          previewState: {},
          metadata: {},
        }
      : null,
  };
}

export async function getReviewsForStudent(studentMatric: string) {
  return prisma.review.findMany({
    where: { studentMatric },
    orderBy: { createdAt: "desc" },
    include: {
      comments: true,
      revisions: {
        orderBy: { createdAt: "desc" },
        include: { files: true },
      },
      checklist: true,
      notifications: true,
      rating: true,
    },
  });
}

export async function getAllReviews() {
  const reviews = await prisma.review.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      revisions: {
        orderBy: { revisionNumber: "desc" },
        take: 1,
      },
      comments: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      checklist: true,
      rating: true,
    },
  });
  const matricNumbers = [...new Set(reviews.map((review) => review.studentMatric))];
  const students = await prisma.studentProfile.findMany({
    where: { matric: { in: matricNumbers } },
    select: { matric: true, firstName: true, lastName: true, email: true },
  });
  const byMatric = new Map(students.map((student) => [student.matric, student]));

  return reviews.map((review) => ({
    ...review,
    student: byMatric.get(review.studentMatric) ?? null,
  }));
}

export async function applyReviewAction(input: ReviewActionInput, status: ReviewWorkflowStatus) {
  const review = await prisma.review.findUniqueOrThrow({
    where: { id: input.reviewId },
  });

  const updatedReview = await prisma.review.update({
    where: { id: input.reviewId },
    data: {
      status,
      reviewedAt: new Date(),
      reviewStartedAt: review.reviewStartedAt ?? new Date(),
      reviewerMatric: input.actorMatric,
      outcomeNote: input.note ?? input.message ?? null,
      title: review.title,
      summary: input.message ?? review.summary,
      priority: input.priority ?? review.priority,
      deadline: input.deadline ? new Date(input.deadline) : review.deadline,
      rating: input.rating
        ? {
            upsert: {
              create: {
                codeQuality: input.rating.codeQuality ?? null,
                uiUx: input.rating.uiUx ?? null,
                responsiveness: input.rating.responsiveness ?? null,
                accessibility: input.rating.accessibility ?? null,
                performance: input.rating.performance ?? null,
                bestPractices: input.rating.bestPractices ?? null,
                overall: input.rating.overall ?? null,
              },
              update: {
                codeQuality: input.rating.codeQuality ?? undefined,
                uiUx: input.rating.uiUx ?? undefined,
                responsiveness: input.rating.responsiveness ?? undefined,
                accessibility: input.rating.accessibility ?? undefined,
                performance: input.rating.performance ?? undefined,
                bestPractices: input.rating.bestPractices ?? undefined,
                overall: input.rating.overall ?? undefined,
              },
            },
          }
        : undefined,
    },
  });

  if (input.message) {
    await addComment({
      reviewId: input.reviewId,
      authorMatric: input.actorMatric,
      authorRole: input.actorRole,
      message: input.message,
      isInternal: input.isInternal ?? false,
    });
  }

  const recipient = review.studentMatric;
  await notifyRecipient(
    recipient,
    input.reviewId,
    input.message ?? `Your review has been updated to ${status}.`,
    "review"
  );

  return prisma.review.findUniqueOrThrow({
    where: { id: updatedReview.id },
    include: {
      comments: true,
      revisions: true,
      checklist: true,
      notifications: true,
    },
  });
}

export async function requestChanges(input: ReviewActionInput) {
  return applyReviewAction(input, "CHANGES_REQUESTED");
}

export async function approveReview(input: ReviewActionInput) {
  return applyReviewAction(input, "APPROVED");
}

export async function rejectReview(input: ReviewActionInput) {
  return applyReviewAction(input, "REJECTED");
}

export async function startReview(reviewId: string) {
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: "UNDER_REVIEW",
      reviewStartedAt: new Date(),
    },
  });

  await notifyRecipient(review.studentMatric, review.id, "Your project is now under review.", "review");
  return review;
}

export async function publishReview(reviewId: string, note?: string | null) {
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status: "PUBLISHED",
      publishNote: note ?? null,
      publishedAt: new Date(),
    },
  });

  await notifyRecipient(review.studentMatric, review.id, "Your project has been published.", "publish");
  return review;
}

export async function resubmitRevision(input: ResubmitRevisionInput) {
  const review = await prisma.review.findUniqueOrThrow({
    where: { id: input.reviewId },
  });

  if (review.status !== "CHANGES_REQUESTED") {
    throw new Error("A revision may only be resubmitted after changes have been requested.");
  }

  const previousRevision = await prisma.revision.findFirst({
    where: { reviewId: input.reviewId },
    orderBy: { revisionNumber: "desc" },
  });

  const nextRevisionNumber = (previousRevision?.revisionNumber ?? 0) + 1;

  const revision = await prisma.revision.create({
    data: {
      reviewId: input.reviewId,
      studentMatric: input.studentMatric,
      summary: input.summary ?? null,
      status: "RESUBMITTED",
      submittedAt: new Date(),
      revisionNumber: nextRevisionNumber,
      sourceRevisionId: previousRevision?.id ?? null,
      deploymentUrl: input.deploymentUrl ?? null,
      submitterMatric: input.studentMatric,
      submitterRole: "STUDENT",
      files: {
        create: (input.files ?? []).map((file) => ({
          fileName: file.fileName,
          fileUrl: file.fileUrl ?? null,
          fileType: file.fileType ?? null,
          sizeBytes: file.sizeBytes ?? null,
        })),
      },
    },
  });

  await prisma.review.update({
    where: { id: input.reviewId },
    data: {
      status: "RESUBMITTED",
      submittedAt: new Date(),
    },
  });

  await notifyRecipient(review.reviewerMatric ?? review.studentMatric, input.reviewId, "A student has resubmitted a revision for review.", "revision");

  return prisma.revision.findUniqueOrThrow({
    where: { id: revision.id },
    include: { files: true },
  });
}

export async function getNotifications(recipientMatric: string) {
  return prisma.notification.findMany({
    where: { recipientMatric },
    orderBy: { createdAt: "desc" },
  });
}

export async function compareRevision(revisionId: string) {
  const revision = await prisma.revision.findUniqueOrThrow({
    where: { id: revisionId },
    include: {
      files: true,
      review: true,
    },
  });

  let previousFiles = [] as Array<{ fileName: string; fileUrl?: string | null; fileType?: string | null; sizeBytes?: number | null }>;

  if (revision.sourceRevisionId) {
    const previousRevision = await prisma.revision.findUniqueOrThrow({
      where: { id: revision.sourceRevisionId },
      include: { files: true },
    });
    previousFiles = previousRevision.files.map((file) => ({
      fileName: file.fileName,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
      sizeBytes: file.sizeBytes,
    }));
  } else if (revision.review.projectSnapshotId) {
    const snapshot = await prisma.projectSnapshot.findUnique({
      where: { id: revision.review.projectSnapshotId },
    });
    if (snapshot && Array.isArray(snapshot.files)) {
      previousFiles = snapshot.files.map((file: any) => ({
        fileName: file.path ?? file.fileName,
        fileUrl: file.url ?? null,
        fileType: file.language ?? null,
        sizeBytes: null,
      }));
    }
  }

  const currentFiles = revision.files.map((file) => ({
    fileName: file.fileName,
    fileUrl: file.fileUrl,
    fileType: file.fileType,
    sizeBytes: file.sizeBytes,
  }));

  const previousMap = new Map(previousFiles.map((file) => [file.fileName, file]));
  const currentMap = new Map(currentFiles.map((file) => [file.fileName, file]));

  const addedFiles = currentFiles.filter((file) => !previousMap.has(file.fileName));
  const removedFiles = previousFiles.filter((file) => !currentMap.has(file.fileName));
  const modifiedFiles = currentFiles.filter((file) => {
    const previous = previousMap.get(file.fileName);
    if (!previous) return false;
    return (
      file.fileUrl !== previous.fileUrl ||
      file.fileType !== previous.fileType ||
      (file.sizeBytes ?? 0) !== (previous.sizeBytes ?? 0)
    );
  });

  return { addedFiles, removedFiles, modifiedFiles };
}

export async function markNotificationsRead(recipientMatric: string) {
  return prisma.notification.updateMany({
    where: { recipientMatric, isRead: false },
    data: { isRead: true },
  });
}
