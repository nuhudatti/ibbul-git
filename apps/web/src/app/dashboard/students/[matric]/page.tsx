"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  ShieldCheck,
  UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { normalizeMatric } from "@/lib/matric";
import { resolveStudent } from "@/lib/student-directory";

type Status =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "RESUBMITTED"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED";

type LecturerSubmission = {
  studentMatric: string;
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
  snapshot?: {
    id: string;
    projectName: string;
    files: Array<{ path?: string; content?: string; language?: string }>;
    submittedAt?: string | null;
    deployUrl?: string | null;
  } | null;
  review: {
    id: string;
    status: Status;
    submittedAt?: string | null;
    updatedAt?: string | null;
    createdAt?: string | null;
    title: string;
    summary: string | null;
    reviewerName: string | null;
    projectSnapshotId: string | null;
    revisions?: Array<{ revisionNumber: number }>;
  } | null;
  statusLabel: string;
  actionLabel: string;
  actionType: "review" | "view" | "continue";
};

type LecturerStudentDetail = {
  matric: string;
  displayName: string;
  avatar: string;
  program: string;
  submissions: LecturerSubmission[];
};

const statusLabel: Record<Status, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  CHANGES_REQUESTED: "Changes requested",
  RESUBMITTED: "Resubmitted",
  APPROVED: "Approved",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not available";
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function StatusPill({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium",
        {
          "border-cyan-400/25 bg-cyan-400/10 text-cyan-300":
            status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "RESUBMITTED",
          "border-amber-400/25 bg-amber-400/10 text-amber-300": status === "CHANGES_REQUESTED",
          "border-emerald-400/25 bg-emerald-400/10 text-emerald-300":
            status === "APPROVED" || status === "PUBLISHED",
          "border-red-400/25 bg-red-400/10 text-red-300": status === "REJECTED",
          "border-white/10 bg-white/5 text-zinc-400": status === "DRAFT",
        }
      )}
    >
      {statusLabel[status]}
    </span>
  );
}

export default function DashboardStudentDetailPage() {
  const router = useRouter();
  const params = useParams<{ matric: string }>();
  const user = useAuthStore((state) => state.user);
  const [student, setStudent] = useState<LecturerStudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const matric = normalizeMatric(params?.matric ?? "");
  const resolvedStudent = resolveStudent(matric);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "LECTURER") {
      router.replace("/");
      return;
    }

    const loadStudent = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/dashboard/submissions/${encodeURIComponent(matric)}`);
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load student detail");
        }
        setStudent(payload.submissions ? { matric, displayName: payload.submissions[0]?.student?.displayName ?? matric, avatar: payload.submissions[0]?.student?.avatar ?? "U", program: payload.submissions[0]?.student?.program ?? "", submissions: payload.submissions } : null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    void loadStudent();
  }, [user, router, matric]);

  const submissions = student?.submissions ?? [];
  const latestReview = useMemo(() => {
    return submissions
      .map((submission) => submission.review)
      .filter((review): review is NonNullable<typeof review> => Boolean(review))
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt ?? a.submittedAt ?? 0).getTime();
        const bTime = new Date(b.updatedAt ?? b.submittedAt ?? 0).getTime();
        return bTime - aTime;
      })[0] || null;
  }, [submissions]);

  const activeReviewsCount = submissions.filter(
    (submission) => submission.review && ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "RESUBMITTED"].includes(submission.review.status)
  ).length;

  const createReviewForSubmission = async (submission: LecturerSubmission) => {
    try {
      const response = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentMatric: submission.studentMatric ?? matric,
          assignmentId: submission.assignmentId,
          title: submission.snapshot?.projectName ?? submission.assignmentTitle,
          projectSnapshotId: submission.snapshot?.id,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to open review");
      }

      router.push(`/dashboard/reviews/${payload.review.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <main className="ula-mesh-bg min-h-screen px-4 py-6 text-zinc-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-370">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <button
              type="button"
              onClick={() => router.push("/dashboard/students")}
              className="text-xs text-zinc-400 hover:text-white"
            >
              <ArrowLeft size={14} className="inline-block mr-2" /> Back to student list
            </button>
            <div className="mt-3 flex items-center gap-3">
              <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">Student review timeline</div>
            </div>
            <h1 className="mt-4 text-3xl font-semibold text-white">{resolvedStudent.displayName}</h1>
            <p className="mt-2 text-sm text-zinc-400">{matric} · {resolvedStudent.program}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => router.push("/dashboard/reviews")}>Review queue</Button>
            <Button size="sm" variant="secondary" onClick={() => router.push(`/dashboard/reviews/${latestReview?.id ?? ""}`)} disabled={!latestReview}>
              Latest review
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_0.8fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6 shadow-xl shadow-black/10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Review summary</p>
                  <p className="mt-2 text-sm text-zinc-300">View every project review for this student in one place.</p>
                </div>
                <div className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-300">{submissions.length} submission{submissions.length === 1 ? "" : "s"}</div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Active reviews</p>
                  <p className="mt-3 text-sm text-zinc-200">{activeReviewsCount}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Latest status</p>
                  <p className="mt-3 text-sm text-zinc-200">{latestReview ? statusLabel[latestReview.status] : "Awaiting review"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Updated</p>
                  <p className="mt-3 text-sm text-zinc-200">{latestReview ? formatDate(latestReview.updatedAt ?? latestReview.submittedAt) : "—"}</p>
                </div>
              </div>
            </div>

            <section className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6">
              <div className="mb-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Project history</p>
                  <p className="mt-2 text-sm text-zinc-300">Review timeline for every project submission.</p>
                </div>
              </div>

              {loading ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-500">Loading review history…</div>
              ) : error ? (
                <div className="rounded-2xl border border-red-400/20 bg-red-400/10 p-8 text-center text-sm text-red-200">{error}</div>
              ) : submissions.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center text-sm text-zinc-500">
                  No review history available for this student yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {submissions.map((submission) => (
                    <div key={`${submission.assignmentId}-${submission.review?.id ?? "no-review"}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{submission.assignmentTitle}</p>
                          <p className="mt-1 text-xs text-zinc-500">Assignment {submission.assignmentId}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {submission.review ? (
                            <StatusPill status={submission.review.status} />
                          ) : (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-400">Awaiting review</span>
                          )}
                          <span className="text-xs text-zinc-500">submitted {formatDate(submission.enrollment.submittedAt)}</span>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {submission.review ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => router.push(`/dashboard/reviews/${submission.review!.id}`)}
                          >
                            View review
                          </Button>
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => void createReviewForSubmission(submission)}>
                            Review Project
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6">
              <div className="flex items-center gap-3 text-zinc-300">
                <UserCircle size={20} />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Student details</p>
                  <p className="mt-2 text-sm text-zinc-200">{resolvedStudent.displayName}</p>
                </div>
              </div>
              <div className="mt-5 space-y-3 text-sm text-zinc-400">
                <div className="flex items-center justify-between gap-3">
                  <span>Matric</span>
                  <span className="text-zinc-200">{matric}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Program</span>
                  <span className="text-zinc-200">{resolvedStudent.program}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Active reviews</span>
                  <span className="text-zinc-200">{activeReviewsCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Total submissions</span>
                  <span className="text-zinc-200">{submissions.length}</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6">
              <div className="flex items-center gap-3 text-zinc-300">
                <ClipboardList size={20} />
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Project list</p>
                  <p className="mt-2 text-sm text-zinc-300">Submitted projects and review actions.</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                {submissions.length === 0 ? (
                  <p className="text-sm text-zinc-500">No published submissions found.</p>
                ) : (
                  submissions.map((submission) => {
                    const review = submission.review;

                    return (
                      <div key={submission.assignmentId} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm text-white">{submission.assignmentTitle}</p>
                            <p className="text-xs text-zinc-500">{submission.assignmentId}</p>
                          </div>
                          {review ? (
                            <StatusPill status={review.status} />
                          ) : (
                            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-zinc-400">Awaiting review</span>
                          )}
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-zinc-500">
                          {review ? (
                            <>
                              <span>Updated {formatDate(review.updatedAt ?? review.submittedAt)}</span>
                              <Button size="sm" variant="secondary" onClick={() => router.push(`/dashboard/reviews/${review.id}`)}>
                                Open review
                              </Button>
                            </>
                          ) : (
                            <>
                              <span>Submitted {formatDate(submission.enrollment.submittedAt)}</span>
                              <Button size="sm" variant="secondary" onClick={() => void createReviewForSubmission(submission)}>
                                Review Project
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
