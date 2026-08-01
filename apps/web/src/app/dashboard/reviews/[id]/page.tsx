"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileCode2,
  FileText,
  MessageSquare,
  Play,
  Plus,
  Send,
  Star,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

type ReviewFile = { path?: string; fileName?: string; fileUrl?: string | null; content?: string; language?: string };

type Review = {
  id: string;
  title: string;
  summary: string | null;
  status: string;
  studentMatric: string;
  assignmentId: string;
  projectSnapshotId: string | null;
  submittedAt: string | null;
  updatedAt: string;
  reviewerName: string | null;
  outcomeNote: string | null;
  student: {
    firstName: string;
    lastName: string;
    email: string;
    program?: string | null;
    headline?: string | null;
    avatarUrl?: string | null;
  } | null;
  projectSnapshot: {
    id: string;
    projectName: string;
    deployUrl?: string | null;
    submittedAt?: string | null;
    files: ReviewFile[];
  } | null;
  notifications: Array<{ id: string; message: string; type: string; isRead: boolean; createdAt: string }>;
  rating?: {
    codeQuality?: number | null;
    uiUx?: number | null;
    responsiveness?: number | null;
    accessibility?: number | null;
    performance?: number | null;
    bestPractices?: number | null;
    overall?: number | null;
  };
  comments: Array<{ id: string; message: string; filePath: string | null; priority: string; status: string; feedbackType: string; createdAt: string; authorRole: string; lineNumber?: number | null }>;
  checklist: Array<{ id: string; title: string; checked: boolean; notes: string | null }>;
  revisions: Array<{ id: string; revisionNumber: number; status: string; submittedAt: string | null; createdAt: string; summary: string | null; deploymentUrl: string | null; files: ReviewFile[] }>;
};

const statusLabel: Record<string, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  CHANGES_REQUESTED: "Changes requested",
  RESUBMITTED: "Resubmitted",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  PUBLISHED: "Published",
};

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
    : "Not available";
}

function getFileName(file: ReviewFile) {
  return file.path ?? file.fileName ?? "Untitled file";
}

export default function DashboardReviewDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [newChecklist, setNewChecklist] = useState("");

  const loadReview = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/reviews/${params.id}`);
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load review");
      }
      setReview(payload.review);
    } catch (error) {
      setNotice((error as Error).message);
      setReview(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "LECTURER") {
      router.replace("/");
      return;
    }

    void loadReview();
  }, [user, router, loadReview]);

  const canAction = review ? !["APPROVED", "PUBLISHED", "REJECTED"].includes(review.status) : false;
  const currentRevision = review?.revisions[0]?.revisionNumber ?? 1;
  const selectedStudentName = review?.student ? `${review.student.firstName} ${review.student.lastName}` : review?.studentMatric;
  const snapshotFiles = review?.projectSnapshot?.files ?? [];
  const latestFeedback = review?.comments.at(-1)?.message ?? review?.outcomeNote ?? "No detailed review notes yet.";

  const reviewMetrics = useMemo(() => {
    const ordered = review?.rating ? Object.entries(review.rating).filter(([, value]) => value != null) : [];
    return ordered.map(([label, value]) => ({
      key: label,
      label: label.replace(/([A-Z])/g, " $1").trim(),
      value: value as number,
    }));
  }, [review]);

  const action = async (name: string, body: Record<string, unknown> = {}) => {
    if (!review) return;
    setBusy(true);
    setNotice(null);
    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: "POST",
        body: JSON.stringify({ action: name, ...body }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? "Action failed");
      }
      await loadReview();
      setNotice(
        name === "request-changes"
          ? "Changes requested. The student can now revise this submission."
          : "Review status updated."
      );
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const addChecklistItem = async () => {
    if (!review || !newChecklist.trim()) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: "POST",
        body: JSON.stringify({ action: "checklist", title: newChecklist.trim(), notes: "" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to add checklist item");
      await loadReview();
      setNewChecklist("");
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const postComment = async () => {
    if (!review || !comment.trim()) return;
    setBusy(true);
    try {
      const response = await fetch(`/api/reviews/${review.id}`, {
        method: "POST",
        body: JSON.stringify({ action: "feedback", message: comment.trim(), feedbackType: "GENERAL", priority: "MEDIUM" }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Unable to add comment");
      await loadReview();
      setComment("");
    } catch (error) {
      setNotice((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <main className="ula-mesh-bg flex min-h-screen items-center justify-center text-sm text-zinc-500">Loading review…</main>;
  }

  if (!review) {
    return <main className="ula-mesh-bg flex min-h-screen items-center justify-center text-sm text-rose-300">{notice ?? "Review not found."}</main>;
  }

  return (
    <main className="ula-mesh-bg min-h-screen px-4 py-6 text-zinc-100 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-330 space-y-6">
        <div className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6 shadow-xl shadow-black/20">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="text-xs text-zinc-400 hover:text-white"
              >
                <ArrowLeft size={14} className="inline-block mr-2" /> Back to dashboard
              </button>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">{statusLabel[review.status] ?? review.status}</div>
                <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">Revision {currentRevision}</div>
              </div>
              <h1 className="mt-4 text-3xl font-semibold text-white">{review.title}</h1>
              <p className="mt-2 text-sm text-zinc-400">{selectedStudentName} · {review.studentMatric} · {review.assignmentId}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
                <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Submitted</p>
                <p className="mt-2 text-sm text-zinc-200">{formatDate(review.submittedAt)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/3 p-4">
                <p className="text-[11px] uppercase tracking-[0.35em] text-zinc-500">Reviewer</p>
                <p className="mt-2 text-sm text-zinc-200">{review.reviewerName ?? "Assigned instructor"}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-2">
              <p className="text-sm text-zinc-400">{review.summary ?? "No summary provided."}</p>
              {review.student?.program ? <p className="text-xs text-zinc-500">Program: {review.student.program}</p> : null}
              {review.student?.headline ? <p className="text-xs text-zinc-500">{review.student.headline}</p> : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" disabled={busy || !["SUBMITTED", "RESUBMITTED"].includes(review.status)} onClick={() => void action("start-review")}>
                <Play size={14} /> Start review
              </Button>
              <Button size="sm" variant="secondary" disabled={busy || !canAction} onClick={() => void action("request-changes", { message: "Instructor requested changes.", note: "Changes requested" })}>
                <MessageSquare size={14} /> Request changes
              </Button>
              <Button size="sm" variant="success" disabled={busy || !canAction} onClick={() => void action("approve", { message: "Approved" })}>
                <Check size={14} /> Approve
              </Button>
              <Button size="sm" variant="danger" disabled={busy || !canAction} onClick={() => void action("reject", { message: "Rejected" })}>
                <X size={14} /> Reject
              </Button>
              <Button size="sm" disabled={busy || review.status !== "APPROVED"} onClick={() => void action("publish", { note: "Published by lecturer" })}>
                <ExternalLink size={14} /> Publish
              </Button>
            </div>
          </div>

          {notice ? (
            <div className="mt-4 rounded-lg border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-xs text-cyan-200">
              {notice}
            </div>
          ) : null}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Project snapshot</p>
                  <p className="mt-2 text-sm text-zinc-300">Submission details and source files tied to this review.</p>
                </div>
                {review.projectSnapshot?.deployUrl ? (
                  <a href={review.projectSnapshot.deployUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                    Live deploy <ExternalLink size={12} />
                  </a>
                ) : null}
              </div>
              <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-sm font-semibold text-white">Snapshot metadata</p>
                  <div className="mt-4 space-y-3 text-sm text-zinc-400">
                    <div className="flex items-center justify-between gap-3"><span>Project</span><span className="text-zinc-200">{review.projectSnapshot?.projectName ?? review.title}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Student email</span><span className="text-zinc-200">{review.student?.email ?? review.studentMatric}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Snapshot id</span><span className="text-zinc-200">{review.projectSnapshotId ?? "Not linked"}</span></div>
                    <div className="flex items-center justify-between gap-3"><span>Submitted</span><span className="text-zinc-200">{formatDate(review.projectSnapshot?.submittedAt ?? review.submittedAt)}</span></div>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                  <p className="text-sm font-semibold text-white">Files in snapshot</p>
                  <div className="mt-3 space-y-2">
                    {snapshotFiles.length === 0 ? (
                      <p className="text-sm text-zinc-500">No snapshot files attached to this review.</p>
                    ) : (
                      snapshotFiles.map((file, index) => (
                        <div key={`${getFileName(file)}-${index}`} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
                          <FileCode2 size={15} className="text-cyan-300" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-zinc-200">{getFileName(file)}</p>
                            <p className="text-[11px] text-zinc-500">{file.language ?? "Source file"}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

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
                <div className="flex gap-2">
                  <Input value={newChecklist} onChange={(event) => setNewChecklist(event.target.value)} placeholder="Add checklist item" className="h-10 flex-1 rounded-xl bg-black/20 border border-white/10 text-sm text-zinc-100" />
                  <Button size="sm" onClick={() => void addChecklistItem()} disabled={busy || !newChecklist.trim()}>
                    <Plus size={14} /> Add
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">File comments</p>
                  <p className="mt-2 text-sm text-zinc-300">Leave feedback for the student.</p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">{review.comments.length} comments</span>
              </div>
              <div className="mt-5 space-y-4">
                <textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  placeholder="Add general feedback..."
                  className="min-h-30 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-200 outline-none"
                />
                <Button size="sm" onClick={() => void postComment()} disabled={busy || !comment.trim()}>
                  <Send size={14} /> Post feedback
                </Button>
                {review.comments.length === 0 ? <p className="text-sm text-zinc-500">No comments yet.</p> : null}
                {review.comments.slice(-4).map((comment) => (
                  <div key={comment.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
                      <span>{comment.feedbackType}</span>
                      <span>{comment.priority}</span>
                    </div>
                    <p className="mt-3 text-sm text-zinc-200">{comment.message}</p>
                    {comment.filePath ? <p className="mt-2 text-[11px] text-zinc-500">{comment.filePath}{comment.lineNumber ? `:${comment.lineNumber}` : ""}</p> : null}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6">
              <h2 className="text-sm font-semibold text-white">Review summary</h2>
              <p className="mt-3 text-sm text-zinc-400">Reviewer: {review.reviewerName ?? "Assigned instructor"}</p>
              <p className="mt-2 text-sm text-zinc-400">Status: {statusLabel[review.status] ?? review.status}</p>
              <p className="mt-2 text-sm text-zinc-400">Latest revision: R{currentRevision}</p>
              <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">{latestFeedback}</p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Revision history</p>
                  <p className="mt-2 text-sm text-zinc-300">Track all resubmissions and live deployments.</p>
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
                    {revision.deploymentUrl ? (
                      <a href={revision.deploymentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-cyan-300 text-sm">
                        View deploy <ExternalLink size={14} />
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Score breakdown</p>
                  <p className="mt-2 text-sm text-zinc-300">Published review rating metrics.</p>
                </div>
                <Star size={14} className="text-amber-300" />
              </div>
              <div className="mt-5 space-y-3">
                {reviewMetrics.length === 0 ? (
                  <p className="text-sm text-zinc-500">No score breakdown exists for this review yet.</p>
                ) : (
                  reviewMetrics.map((metric) => (
                    <div key={metric.key} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                      <span className="text-sm text-zinc-300">{metric.label}</span>
                      <span className="text-sm font-semibold text-white">{metric.value}/5</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-[#09101c]/90 p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Activity</p>
                  <p className="mt-2 text-sm text-zinc-300">Latest review events and notifications.</p>
                </div>
                <span className="rounded-full bg-white/5 px-3 py-1 text-xs text-zinc-400">{review.notifications.length}</span>
              </div>
              <div className="mt-5 space-y-3">
                {review.notifications.slice(0, 4).map((notification) => (
                  <div key={notification.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center justify-between gap-3 text-[11px] text-zinc-500">
                      <span>{notification.type}</span>
                      <span>{formatDate(notification.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-200">{notification.message}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
