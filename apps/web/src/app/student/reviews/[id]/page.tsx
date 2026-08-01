"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, ExternalLink, FileCode2, FileImage, MessageSquare, RefreshCw, Send, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

const statuses = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  CHANGES_REQUESTED: "Changes requested",
  RESUBMITTED: "Resubmitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PUBLISHED: "Published",
};

type Review = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  studentMatric: string;
  assignmentId: string;
  projectSnapshotId: string | null;
  submittedAt: string | null;
  publishedAt: string | null;
  reviewerName: string | null;
  reviewerMatric: string | null;
  outcomeNote: string | null;
  checklist: Array<{ id: string; title: string; checked: boolean; notes: string | null }>;
  comments: Array<{ id: string; message: string; filePath: string | null; priority: string; status: string; feedbackType: string; createdAt: string; authorRole: string; lineNumber?: number | null }>;
  revisions: Array<{ id: string; revisionNumber: number; status: string; submittedAt: string | null; summary: string | null; deploymentUrl: string | null; files: Array<{ fileName: string; fileUrl: string | null }> }>;
  rating?: {
    codeQuality?: number | null;
    uiUx?: number | null;
    responsiveness?: number | null;
    accessibility?: number | null;
    performance?: number | null;
    bestPractices?: number | null;
    overall?: number | null;
  };
};

export default function StudentReviewPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReview = async () => {
    const res = await fetch(`/api/reviews/${params.id}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Unable to load review");
    setReview(data.review);
  };

  useEffect(() => {
    if (!user) { router.replace("/"); return; }
    void loadReview().catch((err: Error) => setError(err.message)).finally(() => setLoading(false));
  }, [params.id, router, user]);

  const statusText = review ? statuses[review.status as keyof typeof statuses] ?? review.status : "";
  const canEdit = review ? review.status === "CHANGES_REQUESTED" : false;
  const currentRevision = review?.revisions[0]?.revisionNumber ?? 1;

  const commentsByFile = useMemo(() => {
    return review?.comments.reduce<Record<string, typeof review.comments>>((acc, comment) => {
      const key = comment.filePath ?? "general";
      acc[key] = acc[key] ?? [];
      acc[key].push(comment);
      return acc;
    }, {}) ?? {};
  }, [review]);

  if (loading) {
    return <main className="ula-mesh-bg flex min-h-screen items-center justify-center text-sm text-zinc-500">Loading review...</main>;
  }

  if (error) {
    return <main className="ula-mesh-bg flex min-h-screen items-center justify-center text-sm text-rose-300">{error}</main>;
  }

  if (!review) {
    return <main className="ula-mesh-bg flex min-h-screen items-center justify-center text-sm text-zinc-300">Review not found.</main>;
  }

  return (
    <main className="ula-mesh-bg min-h-screen px-4 py-6 text-zinc-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1200px] space-y-6">
        <div className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6 shadow-xl shadow-black/20">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Review status</p>
              <h1 className="mt-2 text-3xl font-semibold text-white">{review.title}</h1>
              <p className="mt-2 text-sm text-zinc-400">{statusText} · Revision {currentRevision}</p>
            </div>
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-400/5 px-4 py-3 text-sm text-cyan-100">Reviewer: {review.reviewerName ?? "Pending assignment"}</div>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Submitted</p>
              <p className="mt-2 text-sm text-zinc-200">{review.submittedAt ? new Date(review.submittedAt).toLocaleString() : "Unknown"}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Current stage</p>
              <p className="mt-2 text-sm text-zinc-200">{statusText}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-[11px] uppercase tracking-[0.3em] text-zinc-500">Latest feedback</p>
              <p className="mt-2 text-sm text-zinc-200">{review.outcomeNote ?? "No summary yet."}</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Review checklist</p>
                  <p className="mt-2 text-sm text-zinc-300">What the reviewer is evaluating.</p>
                </div>
                <div className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">{review.checklist.filter((item) => item.checked).length}/{review.checklist.length} complete</div>
              </div>
              <div className="mt-5 space-y-3">
                {review.checklist.map((item) => (
                  <div key={item.id} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className={cn("mt-1 h-4 w-4 shrink-0 rounded-sm border", item.checked ? "border-emerald-400 bg-emerald-400" : "border-white/15")} />
                    <div>
                      <p className="text-sm text-zinc-200">{item.title}</p>
                      {item.notes ? <p className="mt-2 text-xs text-zinc-500">{item.notes}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">File comments</p>
                  <p className="mt-2 text-sm text-zinc-300">Detailed notes from your reviewer.</p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">{review.comments.length} comments</span>
              </div>
              <div className="mt-5 space-y-4">
                {review.comments.length === 0 ? <p className="text-sm text-zinc-500">No comments yet.</p> : null}
                {review.comments.map((comment) => (
                  <div key={comment.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
                      <span>{comment.feedbackType}</span>
                      {comment.filePath ? <span>· {comment.filePath}{comment.lineNumber ? `:${comment.lineNumber}` : ""}</span> : null}
                      <span>· {comment.priority}</span>
                    </div>
                    <p className="mt-3 text-sm text-zinc-200">{comment.message}</p>
                    <p className="mt-2 text-[11px] uppercase tracking-[0.25em] text-zinc-500">{comment.authorRole}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6">
              <h2 className="text-sm font-semibold text-white">Review summary</h2>
              <p className="mt-3 text-sm text-zinc-400">Reviewer: {review.reviewerName ?? "TBD"}</p>
              <p className="mt-2 text-sm text-zinc-400">Status: {statusText}</p>
              <p className="mt-2 text-sm text-zinc-400">Latest revision: R{currentRevision}</p>
              {review.rating ? (
                <div className="mt-5 grid gap-3 text-sm text-zinc-200">
                  {Object.entries(review.rating).map(([label, value]) =>
                    value != null ? (
                      <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <span>{label.replace(/([A-Z])/g, " $1").trim()}</span>
                        <span className="font-semibold">{value}/5</span>
                      </div>
                    ) : null
                  )}
                </div>
              ) : (
                <p className="mt-4 text-sm text-zinc-500">No rating yet.</p>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Revision history</p>
                  <p className="mt-2 text-sm text-zinc-300">Track all resubmissions.</p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">{review.revisions.length} revisions</span>
              </div>
              <div className="mt-5 space-y-3">
                {review.revisions.map((revision) => (
                  <div key={revision.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3 text-sm text-zinc-200">
                      <span>Revision {revision.revisionNumber}</span>
                      <span className="text-xs text-zinc-400">{revision.status}</span>
                    </div>
                    {revision.summary ? <p className="mt-2 text-sm text-zinc-400">{revision.summary}</p> : null}
                    {revision.deploymentUrl ? <a href={revision.deploymentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-cyan-300 text-sm">View deploy <ExternalLink size={14} /></a> : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6">
              <h2 className="text-sm font-semibold text-white">Next actions</h2>
              <div className="mt-4 space-y-3">
                {canEdit ? (
                  <Button variant="secondary" className="w-full" onClick={() => router.push(`/workspace`)}>
                    <RefreshCw size={16} /> Revise project
                  </Button>
                ) : null}
                {review.status === "APPROVED" ? (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-200">This project has been approved and is awaiting verification.</div>
                ) : null}
                {review.status === "PUBLISHED" ? (
                  <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-200">This project is published. Your verified artifact is available.</div>
                ) : null}
                {review.status === "REJECTED" ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">This submission was rejected and may not be revised further.</div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
