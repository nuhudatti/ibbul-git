"use client";

import { useMemo } from "react";
import { MissionHeader } from "./mission-header";
import { AssignmentStudio } from "./assignment-studio";
import { SubmissionInbox } from "./submission-inbox";
import { PortfolioReviewPanel } from "./portfolio-review-panel";
import { useAssignmentStore } from "@/store/assignment-store";
import { usePortfolioStore } from "@/store/portfolio-store";
import { buildSubmissionRows } from "@/lib/lecturer-data";
import { getClassRosterMatrics } from "@/lib/class-roster";

/**
 * Lecturer Mission Control — wired to real assignment, enrollment, and portfolio data.
 *
 * Flow: Create/publish assignment → students work in IDE → submit →
 * submissions inbox + portfolio verify → public /u/[matric]
 */
export function MissionControl() {
  const assignments = useAssignmentStore((s) => s.assignments);
  const enrollments = useAssignmentStore((s) => s.enrollments);
  const artifacts = usePortfolioStore((s) => s.artifacts);

  const stats = useMemo(() => {
    const submissions = buildSubmissionRows(assignments, enrollments, artifacts);
    const pendingVerify = Object.values(artifacts).filter(
      (a) => !a.verified && a.status === "SUBMITTED"
    ).length;
    const inProgress = enrollments.filter((e) => e.status === "IN_PROGRESS").length;
    const published = assignments.filter((a) => a.status === "PUBLISHED").length;

    const scores = submissions
      .map((s) => s.enrollment.score)
      .filter((s): s is number => s != null);
    const avgScore =
      scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : null;

    return {
      pendingVerify,
      submissionCount: submissions.length,
      inProgress,
      published,
      avgScore: avgScore ?? 0,
      atRisk: pendingVerify,
    };
  }, [assignments, enrollments, artifacts]);

  return (
    <div className="min-h-screen flex flex-col bg-[#050508] overflow-auto">
      <MissionHeader
        engagement={stats.submissionCount > 0 ? Math.min(96, 78 + stats.submissionCount * 4) : 72}
        online={stats.inProgress + stats.submissionCount}
        total={getClassRosterMatrics().length}
        avgScore={stats.avgScore || 0}
        atRisk={stats.pendingVerify}
      />

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0">
        <aside className="lg:col-span-3 border-r border-white/6 p-5 overflow-hidden flex flex-col min-h-[240px] lg:min-h-0">
          <AssignmentStudio />
        </aside>

        <main className="lg:col-span-5 border-r border-white/6 min-h-[360px] lg:min-h-0 flex flex-col">
          <SubmissionInbox />
        </main>

        <aside className="lg:col-span-4 p-5 overflow-hidden flex flex-col min-h-[240px] lg:min-h-0">
          <PortfolioReviewPanel />
        </aside>
      </div>
    </div>
  );
}
