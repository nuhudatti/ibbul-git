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
import { useAssignmentStore } from "@/store/assignment-store";
import { usePortfolioStore } from "@/store/portfolio-store";
import { buildSubmissionRows } from "@/lib/lecturer-data";
import { normalizeMatric, profilePath } from "@/lib/matric";
import { formatProofHash } from "@/lib/portfolio-hash";
import { cn, resolveDeployUrl } from "@/lib/utils";

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

type Review = {
  id: string;
  studentMatric: string;
  assignmentId: string;
  status: Status;
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
  const assignments = useAssignmentStore((s) => s.assignments);
  const enrollments = useAssignmentStore((s) => s.enrollments);
  const artifacts = usePortfolioStore((s) => s.artifacts);
  const activityFeed = useAssignmentStore((s) => s.activityFeed);

  const [filter, setFilter] = useState<InboxFilter>("all");
  const [assignmentFilter, setAssignmentFilter] = useState<string | "all">("all");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const router = useRouter();

  const rows = useMemo(
    () => buildSubmissionRows(assignments, enrollments, artifacts),
    [assignments, enrollments, artifacts]
  );

  useEffect(() => {
    const loadReviews = async () => {
      setReviewLoading(true);
      setReviewError(null);
      try {
        const response = await fetch("/api/reviews");
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to load reviews");
        }
        setReviews(Array.isArray(payload.reviews) ? payload.reviews : []);
      } catch (error) {
        setReviewError((error as Error).message);
      } finally {
        setReviewLoading(false);
      }
    };

    void loadReviews();
  }, []);

  const filtered = useMemo(() => {
    let list = rows;
    if (assignmentFilter !== "all") {
      list = list.filter((r) => r.assignment.id === assignmentFilter);
    }
    if (filter === "pending") {
      list = list.filter((r) => !r.artifact?.verified);
    } else if (filter === "verified") {
      list = list.filter((r) => r.artifact?.verified);
    }
    return list;
  }, [rows, filter, assignmentFilter]);

  const reviewMap = useMemo(() => {
    return reviews.reduce<Record<string, Review>>((map, review) => {
      map[`${normalizeMatric(review.studentMatric)}:${review.assignmentId}`] = review;
      return map;
    }, {});
  }, [reviews]);

  const published = assignments.filter((a) => a.status === "PUBLISHED");

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
                  ({rows.filter((r) => !r.artifact?.verified).length})
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-2">
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
            {filtered.map((row, i) => {
              const { enrollment, assignment, artifact, studentName, avatar } = row;
              const review = reviewMap[`${normalizeMatric(enrollment.studentMatric)}:${assignment.id}`];
              const rowState = review
                ? review.status === "CHANGES_REQUESTED" || review.status === "SUBMITTED"
                  ? "border-amber-400/20 bg-amber-500/3"
                  : review.status === "UNDER_REVIEW" || review.status === "RESUBMITTED"
                  ? "border-cyan-400/20 bg-cyan-500/5"
                  : review.status === "APPROVED" || review.status === "PUBLISHED"
                  ? "border-emerald-400/15 bg-emerald-500/5"
                  : "border-white/6 bg-white/2"
                : artifact && !artifact.verified
                ? "border-amber-400/20 bg-amber-500/3"
                : "border-white/6 bg-white/2";

              return (
                <motion.div
                  key={`${enrollment.studentMatric}-${enrollment.assignmentId}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.04, 0.2) }}
                  className={cn("p-4 rounded-xl border", rowState)}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-sm font-bold text-zinc-300 shrink-0">
                      {avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-medium text-zinc-200">{studentName}</p>
                        <span className="text-[10px] font-mono text-zinc-600">
                          {enrollment.studentMatric}
                        </span>
                        {artifact?.verified ? (
                          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5">
                            <CheckCircle2 size={10} /> Verified
                          </span>
                        ) : review ? (
                          <span className="text-[10px] text-amber-400">Review: {statusLabel[review.status]}</span>
                        ) : (
                          <span className="text-[10px] text-amber-400">Awaiting review</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{assignment.title}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-zinc-500">
                        {enrollment.score != null ? (
                          <span className="text-cyan-300/90 font-medium">
                            Score {enrollment.score}/{assignment.maxScore}
                          </span>
                        ) : null}
                        {enrollment.submittedAt ? (
                          <span className="flex items-center gap-1">
                            <Clock size={10} />
                            {new Date(enrollment.submittedAt).toLocaleString()}
                          </span>
                        ) : null}
                        {artifact ? (
                          <span className="font-mono text-violet-400/80">
                            {formatProofHash(artifact.hash)}
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-3 text-[11px] text-zinc-500">
                        {review ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/dashboard/reviews/${review.id}`)}
                            className="rounded-full border border-cyan-400/20 bg-cyan-400/5 px-2 py-1 text-cyan-300 hover:bg-cyan-400/10"
                          >
                            {statusLabel[review.status]}
                          </button>
                        ) : null}
                        {enrollment.deployUrl ? (
                          <a
                            href={resolveDeployUrl(enrollment.deployUrl, typeof window !== "undefined" ? window.location.origin : undefined) ?? enrollment.deployUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-cyan-400 px-2 py-1 rounded-lg bg-cyan-400/10 border border-cyan-400/20"
                          >
                            <ExternalLink size={12} />
                            Live project
                          </a>
                        ) : null}
                        {review ? null : (
                          <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] text-zinc-400">
                            No review yet
                          </span>
                        )}
                        <Link
                          href={profilePath(enrollment.studentMatric)}
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

      {activityFeed.length > 0 ? (
        <div className="shrink-0 border-t border-white/6 px-5 py-3 max-h-35 overflow-y-auto ula-scrollbar">
          <p className="text-[10px] uppercase tracking-widest text-zinc-600 mb-2">Recent class activity</p>
          {activityFeed.slice(0, 6).map((e) => (
            <p key={e.id} className="text-[11px] text-zinc-500 py-1 border-b border-white/3 last:border-0">
              <span className="text-zinc-400">{e.student}</span> · {e.message}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
