export type StudentSubmissionLifecycleState = "DRAFT" | "SUBMITTED" | "CHANGES_REQUESTED" | "APPROVED";

interface StudentSubmissionLifecycleInput {
  enrollmentStatus?: string | null;
  reviewStatus?: string | null;
  isRevisionEditingActive?: boolean;
  isNewAssignment?: boolean;
  context?: "card" | "ide" | "review";
}

export interface StudentSubmissionLifecycle {
  state: StudentSubmissionLifecycleState;
  primaryButton: string;
  secondaryButton: string | null;
  canEdit: boolean;
  canSubmit: boolean;
}

export function getStudentSubmissionLifecycle(input: StudentSubmissionLifecycleInput): StudentSubmissionLifecycle {
  const enrollmentStatus = input.enrollmentStatus?.toUpperCase() ?? null;
  const reviewStatus = input.reviewStatus?.toUpperCase() ?? null;
  const isRevisionEditingActive = Boolean(input.isRevisionEditingActive);
  const context = input.context ?? "ide";

  if (reviewStatus === "APPROVED" || reviewStatus === "PUBLISHED") {
    return {
      state: "APPROVED",
      primaryButton: "View Submission",
      secondaryButton: null,
      canEdit: false,
      canSubmit: false,
    };
  }

  if (enrollmentStatus === "GRADED") {
    return {
      state: "APPROVED",
      primaryButton: "View Submission",
      secondaryButton: null,
      canEdit: false,
      canSubmit: false,
    };
  }

  if (reviewStatus === "CHANGES_REQUESTED") {
    if (isRevisionEditingActive) {
      return {
        state: "CHANGES_REQUESTED",
        primaryButton: "Submit Changes",
        secondaryButton: context === "review" ? "Open Full Project" : null,
        canEdit: true,
        canSubmit: true,
      };
    }

    return {
      state: "CHANGES_REQUESTED",
      primaryButton: "Continue Changes",
      secondaryButton: context === "review" ? "Open Full Project" : null,
      canEdit: true,
      canSubmit: false,
    };
  }

  if (enrollmentStatus === "SUBMITTED") {
    return {
      state: "SUBMITTED",
      primaryButton: "Awaiting Lecturer Review",
      secondaryButton: null,
      canEdit: false,
      canSubmit: false,
    };
  }

  if (enrollmentStatus === "IN_PROGRESS") {
    const isExistingDraft = context === "card" && !input.isNewAssignment;

    return {
      state: "DRAFT",
      primaryButton: isExistingDraft ? "Continue Project" : context === "card" ? "Open Project" : "Submit Project",
      secondaryButton: null,
      canEdit: true,
      canSubmit: context !== "card",
    };
  }

  return {
    state: "DRAFT",
    primaryButton: "Open Project",
    secondaryButton: null,
    canEdit: true,
    canSubmit: false,
  };
}
