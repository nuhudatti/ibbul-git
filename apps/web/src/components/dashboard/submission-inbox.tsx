"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ExternalLink,
  Inbox,
  Clock,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { normalizeMatric, profilePath } from "@/lib/matric";
import { cn, resolveDeployUrl } from "@/lib/utils";
import { SearchInput } from "@/components/ui/search-input";

type InboxFilter = "all" | "pending" | "verified";

type Status =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "CHANGES_REQUESTED"
  | "RESUBMITTED"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED";

type SubmissionItem = {
  studentMatric: string;
  student: { matric: string; displayName: string; avatar: string; program: string } | null;
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

export function SubmissionInbox() {
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string | "all">("all");
  const [query, setQuery] = useState("");
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadReviews = async () => {
      setReviewLoading(true);
      setReviewError(null);
      try {
        const response = await fetch("/api/dashboard/submissions");
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load submissions");
        }
        setSubmissions(Array.isArray(payload.submissions) ? payload.submissions : []);
      } catch (error) {
        setReviewError((error as Error).message);
      } finally {
        setReviewLoading(false);
      }
    };

    void loadReviews();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = submissions;
    if (assignmentFilter !== "all") {
      list = list.filter((submission) => submission.assignmentId === assignmentFilter);
    }
    if (filter === "pending") {
      list = list.filter((submission) => !submission.review || submission.review.status === "SUBMITTED" || submission.review.status === "CHANGES_REQUESTED");
    } else if (filter === "verified") {
      list = list.filter((submission) => submission.review?.status === "APPROVED" || submission.review?.status === "PUBLISHED");
    }

    if (!q) return list;

    return list.filter((submission) => {
      const name = (submission.student?.displayName ?? "").toLowerCase();
      const matric = (submission.studentMatric ?? "").toLowerCase();
      const title = (submission.assignmentTitle ?? "").toLowerCase();
      const ula = (submission.snapshot?.id ?? "").toLowerCase();
      const projectName = (submission.snapshot?.projectName ?? "").toLowerCase();
      const status = (submission.review?.status ?? "").toLowerCase();

      return (
        name.includes(q) ||
        matric.includes(q) ||
        title.includes(q) ||
        ula.includes(q) ||
        projectName.includes(q) ||
        status.includes(q)
      );
    });
  }, [submissions, filter, assignmentFilter, query]);

  const reviewMap = useMemo(() => {
    return submissions.reduce<Record<string, SubmissionItem>>((map, submission) => {
      const key = `${normalizeMatric(submission.studentMatric)}:${submission.assignmentId}`;
      const existing = map[key];
      const incomingTime = submission.review?.updatedAt ? new Date(submission.review.updatedAt).getTime() : Number.NEGATIVE_INFINITY;
      const existingTime = existing?.review?.updatedAt ? new Date(existing.review.updatedAt).getTime() : Number.NEGATIVE_INFINITY;

      if (!existing || incomingTime >= existingTime) {
        map[key] = submission;
      }
      return map;
    }, {});
  }, [submissions]);

  const published = Array.from(new Set(submissions.map((submission) => submission.assignmentId))).map((assignmentId) => ({
    id: assignmentId,
    title: submissions.find((submission) => submission.assignmentId === assignmentId)?.assignmentTitle ?? assignmentId,
  }));

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="shrink-0 px-5 py-4 border-b border-white/6">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <Inbox size={16} className="text-cyan-400" />
          Student submissions
        </h2>
        <p className="text-[11px] text-zinc-500 mt-1">
          Real work from your class — appears when students hit Submit in the IDE. Open review status badges to continue the lecturer review workflow.
        </p>

        <div className="flex flex-wrap gap-2 mt-3">
          {(
            [
              { id: "all" as const, label: "All" },
              { id: "pending" as const, label: "Needs review" },
              { id: "verified" as const, label: "Verified" },
            ] as const
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors",
                filter === id
                  ? "bg-white/10 border-white/15 text-white"
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              )}
            >
              {label}
              {id === "pending" ? (
                <span className="ml-1 text-amber-400">
                  ({submissions.filter((submission) => !submission.review || submission.review.status === "SUBMITTED" || submission.review.status === "CHANGES_REQUESTED").length})
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <div className="flex-1 min-w-0 mr-2">
            <SearchInput value={query} onChange={setQuery} placeholder="Search student, matric, assignment, or ULA ID..." />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={12} className="text-zinc-600" />
            <select
              value={assignmentFilter}
              onChange={(e) => setAssignmentFilter(e.target.value)}
              className="flex-1 h-8 px-2 rounded-lg bg-white/5 border border-white/8 text-xs text-zinc-300 outline-none"
            >
              <option value="all">All assignments</option>
              {published.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto ula-scrollbar px-5 py-3 min-h-0">
        {reviewLoading ? (
        <div className="text-center py-16 px-4">
          <Inbox size={32} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">Loading reviews…</p>
        </div>
      ) : reviewError ? (
        <div role="alert" className="rounded-2xl border border-red-400/20 bg-red-400/10 p-8 text-center text-sm text-red-200">
          {reviewError}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 px-4">
          <Inbox size={32} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">No submissions yet</p>
          <p className="text-xs text-zinc-600 mt-2 max-w-xs mx-auto">
            Publish an assignment, then have a student log in, complete work, and press Submit.
          </p>
        </div>
      ) : (
          <div className="space-y-2">
            {filtered.map((submission, i) => {
              const review = reviewMap[`${normalizeMatric(submission.studentMatric)}:${submission.assignmentId}`];
              const rowState = review?.review
                ? review.review.status === "CHANGES_REQUESTED" || review.review.status === "SUBMITTED"
                  ? "border-amber-400/20 bg-amber-500/3"
                  : review.review.status === "UNDER_REVIEW" || review.review.status === "RESUBMITTED"
                  ? "border-cyan-400/20 bg-cyan-500/5"
                  : review.review.status === "APPROVED" || review.review.status === "PUBLISHED"
                  ? "border-emerald-400/15 bg-emerald-500/5"
                  : "border-white/6 bg-white/2"
                : "border-amber-400/20 bg-amber-500/3";

              return (
                <motion.div
                  key={`${submission.studentMatric}-${submission.assignmentId}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.2) }}
                  className={cn("p-4 rounded-xl border", rowState)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-sm font-bold text-zinc-300 shrink-0">
                      {submission.student?.avatar ?? "U"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-zinc-200">{submission.student?.displayName ?? submission.studentMatric}</p>
                        <span className="text-[10px] font-mono text-zinc-600">
                          {submission.studentMatric}
                        </span>
                        {review?.review?.status === "APPROVED" || review?.review?.status === "PUBLISHED" ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 size={10} /> Verified
                          </span>
                        ) : review?.review ? (
                          <span className="text-[10px] text-amber-400">Review: {statusLabel[review.review.status]}</span>
                        ) : (
                          <span className="text-[10px] text-amber-400">Awaiting review</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{submission.assignmentTitle}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-zinc-500">
                        {submission.enrollment.score != null ? (
                          <span className="text-cyan-300/90 font-medium">
                            Score {submission.enrollment.score}
                          </span>
                        ) : null}
                        {submission.enrollment.submittedAt ? (
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(submission.enrollment.submittedAt).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-zinc-500">
                        {review?.review ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/reviews/${review.review?.id ?? ""}`)}
                            className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-2 py-1 text-cyan-300 hover:bg-cyan-400/10"
                          >
                            Continue Review
                          </button>
                        ) : null}
                        {submission.enrollment.deployUrl ? (
                          <a
                            href={resolveDeployUrl(submission.enrollment.deployUrl, typeof window !== "undefined" ? window.location.origin : undefined) ?? submission.enrollment.deployUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-cyan-400 px-2 py-1 rounded-lg bg-cyan-400/10 border border-cyan-400/20"
                          >
                            <ExternalLink size={12} />
                            Live project
                          </a>
                        ) : null}
                        {review?.review ? null : (
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const response = await fetch("/api/reviews", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({
                                    studentMatric: submission.studentMatric,
                                    assignmentId: submission.assignmentId,
                                    title: submission.snapshot?.projectName ?? submission.assignmentTitle,
                                    summary: "Student submitted a project for review.",
                                  }),
                                });
                                const payload = await response.json();
                                if (!response.ok) {
                                  throw new Error(payload.error ?? "Failed to create review");
                                }
                                router.push(`/dashboard/reviews/${payload.review.id}`);
                              } catch (error) {
                                console.error("Failed to create review from submission inbox", error);
                              }
                            }}
                            className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-2 py-1 text-[11px] text-cyan-300 hover:bg-cyan-400/10"
                          >
                            Start Review
                          </button>
                        )}
                        <Link
                          href={profilePath(submission.studentMatric)}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[11px] text-zinc-400 px-2 py-1 rounded-lg border border-white/8 hover:text-white"
                        >
                          Public portfolio
                        </Link>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
