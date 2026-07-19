import type { Assignment, PortfolioArtifact, StudentEnrollment } from "@/types";
import { normalizeMatric } from "@/lib/matric";
import { resolveStudent } from "@/lib/student-directory";

export interface SubmissionRow {
  enrollment: StudentEnrollment;
  assignment: Assignment;
  artifact?: PortfolioArtifact;
  studentName: string;
  avatar: string;
}

export function buildSubmissionRows(
  assignments: Assignment[],
  enrollments: StudentEnrollment[],
  artifacts: Record<string, PortfolioArtifact>
): SubmissionRow[] {
  const assignmentMap = new Map(assignments.map((a) => [a.id, a]));
  const artifactList = Object.values(artifacts);

  const rows: SubmissionRow[] = [];

  for (const enrollment of enrollments) {
    if (enrollment.status !== "SUBMITTED" && enrollment.status !== "GRADED") continue;
    const assignment = assignmentMap.get(enrollment.assignmentId);
    if (!assignment) continue;
    const matric = normalizeMatric(enrollment.studentMatric);
    const student = resolveStudent(matric);
    const artifact = artifactList.find(
      (a) =>
        normalizeMatric(a.studentMatric) === matric &&
        a.assignmentId === enrollment.assignmentId
    );
    rows.push({
      enrollment,
      assignment,
      artifact,
      studentName: student.displayName,
      avatar: student.avatar,
    });
  }

  return rows.sort(
      (a, b) =>
        new Date(b.enrollment.submittedAt ?? 0).getTime() -
        new Date(a.enrollment.submittedAt ?? 0).getTime()
    );
}

export function assignmentStats(
  assignmentId: string,
  enrollments: StudentEnrollment[],
  rosterSize: number
) {
  const rows = enrollments.filter((e) => e.assignmentId === assignmentId);
  const submitted = rows.filter((e) => e.status === "SUBMITTED" || e.status === "GRADED").length;
  const inProgress = rows.filter((e) => e.status === "IN_PROGRESS").length;
  const notStarted = Math.max(0, rosterSize - rows.length) + rows.filter((e) => e.status === "NOT_STARTED").length;
  return {
    enrolled: Math.max(rows.length, rosterSize),
    submitted,
    inProgress,
    notStarted,
  };
}
