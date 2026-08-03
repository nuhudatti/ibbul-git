"use client";

import { ArrowRight, CheckCircle2, Clock, ExternalLink, Sparkles, Unlock } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { normalizeMatric } from "@/lib/matric";
import { useProjectStore } from "@/store/project-store";
import { useAuthStore } from "@/store/auth-store";
import { useIdeStore } from "@/store/ide-store";

export type ReviewRecord = {
  id: string;
  assignmentId: string;
  studentMatric?: string | null;
  status: string;
  title: string;
  summary?: string | null;
  reviewerName?: string | null;
  submittedAt?: string | null;
  comments: Array<{
    id: string;
    message: string;
    filePath: string | null;
    feedbackType: string;
    priority: string;
    authorRole: string;
    createdAt: string;
    lineNumber?: number | null;
  }>;
  checklist: Array<{ id: string; title: string; checked: boolean; notes: string | null }>;
  revisions: Array<{ id: string; revisionNumber: number; status: string; submittedAt: string | null; summary: string | null; deploymentUrl: string | null }>;
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
};

const statusStyles: Record<string, string> = {
  SUBMITTED: "bg-amber-400/10 border-amber-400/25 text-amber-300",
  UNDER_REVIEW: "bg-cyan-400/10 border-cyan-400/25 text-cyan-300",
  CHANGES_REQUESTED: "bg-amber-500/10 border-amber-500/25 text-amber-300",
  RESUBMITTED: "bg-cyan-300/10 border-cyan-300/25 text-cyan-200",
  APPROVED: "bg-emerald-500/10 border-emerald-500/25 text-emerald-300",
  PUBLISHED: "bg-cyan-500/10 border-cyan-500/25 text-cyan-200",
  REJECTED: "bg-red-500/10 border-red-500/25 text-red-300",
};

function formatDate(value?: string | null) {
  if (!value) return "Unknown";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function StudentReviewPanel({ review }: { review: ReviewRecord }) {
  const user = useAuthStore((s) => s.user);
  const activeAssignmentId = useIdeStore((s) => s.activeAssignmentId);
  const completedChecklist = review.checklist.filter((item) => item.checked).length;
  const statusLabel = review.status.replace(/_/g, " ");
  const isAwaitingChanges = review.status === "CHANGES_REQUESTED";
  const currentStudentMatric = normalizeMatric(user?.matricNumber ?? "");
  const reviewStudentMatric = normalizeMatric(review.studentMatric ?? "");
  const isCurrentAssignment = !activeAssignmentId || review.assignmentId === activeAssignmentId;
  const isCurrentStudent = !reviewStudentMatric || currentStudentMatric === reviewStudentMatric;
  const canResumeEditing = isAwaitingChanges && isCurrentAssignment && isCurrentStudent;
  const isApproved = review.status === "APPROVED" || review.status === "PUBLISHED";

  console.log("[StudentReviewPanel] review audit", {
    review,
    "review.status": review.status,
    activeAssignmentId,
    currentStudentMatric,
    reviewStudentMatric,
    isCurrentAssignment,
    isCurrentStudent,
    canResumeEditing,
    assignmentId: review.assignmentId,
  });
  console.log("[StudentReviewPanel] render", {
    "review.status": review.status,
    canResumeEditing,
    assignmentId: review.assignmentId,
    activeAssignmentId,
  });
  const heroTitle = canResumeEditing ? "Resume editing" : statusLabel;
  const heroDescription = canResumeEditing
    ? "Your instructor requested changes — full project access restored."
    : `Review for "${review.title}" by ${review.reviewerName ?? "your instructor"}`;

  const openFullProject = async () => {
    const assignmentId = activeAssignmentId ?? review.assignmentId;
    console.log("[StudentReviewPanel] BUTTON CLICKED", {
      assignmentId,
      reviewAssignmentId: review.assignmentId,
      title: review.title,
      "review.status": review.status,
      canResumeEditing,
      isCurrentAssignment,
      isCurrentStudent,
      timestamp: new Date().toISOString(),
    });

    try {
      const user = useAuthStore.getState().user;
      const matric = user?.matricNumber ? normalizeMatric(user.matricNumber) : "";
      console.log("[REVIEW PANEL] User state:", {
        matric,
        hasUser: !!user,
        role: user?.role,
        assignmentId: review.assignmentId,
      });

      if (!matric) {
        console.error("[REVIEW PANEL] ERROR: No matric number found");
        return;
      }

      console.log("[StudentReviewPanel] restoreSnapshot start", {
        matric,
        assignmentId,
        title: review.title,
        canResumeEditing,
      });
      const startTime = performance.now();

      await useProjectStore.getState().restoreSnapshot(matric, assignmentId, review.title);

      const endTime = performance.now();
      const ideState = useIdeStore.getState();
      console.log("[REVIEW PANEL] restoreSnapshot completed", {
        duration: `${(endTime - startTime).toFixed(2)}ms`,
        workspaceMode: ideState.workspaceMode,
        viewMode: ideState.viewMode,
        activeAssignmentId: ideState.activeAssignmentId,
        filesCount: ideState.files.length,
        isExplorerOpen: ideState.isExplorerOpen,
        activeFile: ideState.activeFilePath,
        readOnly: ideState.isReadOnly(),
      });

      document.getElementById("workspace-ide")?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      console.error("[REVIEW PANEL] ERROR in openFullProject:", error);
      throw error;
    }
  };

  return (
    <section className="px-4 py-5 border-b border-white/10 bg-[#08090f] text-zinc-100 overflow-auto">
      <div className="mx-auto max-w-370 space-y-5">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">Course review status</p>
              <h2 className="mt-2 text-xl font-semibold text-white">{heroTitle}</h2>
              <p className="mt-1 text-sm text-zinc-400">{heroDescription}</p>
            </div>
            <span className={cn("inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em]", statusStyles[review.status] ?? "border-white/10 bg-white/5 text-zinc-300")}> <Clock size={14} /> {formatDate(review.submittedAt)} </span>
          </div>

          {canResumeEditing ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="mt-4 rounded-3xl border border-cyan-400/25 bg-linear-to-br from-cyan-500/15 via-violet-500/10 to-amber-500/10 p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_18px_45px_rgba(34,211,238,0.15)]"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-linear-to-br from-cyan-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-200">
                    <Sparkles size={12} />
                    Resume editing
                  </div>
                  <p className="mt-3 text-lg font-semibold text-white">Your instructor requested changes — full project access restored.</p>
                  <p className="mt-2 text-sm text-zinc-200">
                    You can now reopen the workspace, inspect every file and folder, revise your project, and resubmit with confidence.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={openFullProject}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3.5 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-400/20"
                  >
                    <Unlock size={14} />
                    <span>Open full project</span>
                  </button>
                  <button
                    type="button"
                    onClick={openFullProject}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    <ArrowRight size={14} />
                    <span>Restore editable workspace</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ) : null}

          {isApproved ? (
            <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <p className="font-semibold">Editing locked</p>
              <p className="mt-1 text-zinc-200">This submission is approved or published and may no longer be edited.</p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 xl:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Latest feedback</p>
                  <p className="mt-1 text-xs text-zinc-500">Recent comments and review notes</p>
                </div>
                <span className="text-xs text-zinc-400">{review.comments.length} comments</span>
              </div>
              <div className="mt-4 space-y-3">
                {review.comments.slice(-4).map((comment) => (
                  <div key={comment.id} className="rounded-2xl border border-white/10 bg-black/50 p-4">
                    <div className="flex items-center justify-between gap-2 text-xs text-zinc-400">
                      <span>{comment.feedbackType}</span>
                      <span>{comment.priority}</span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-200">{comment.message}</p>
                    {comment.filePath ? <p className="mt-2 text-[11px] text-zinc-500">File: {comment.filePath}{comment.lineNumber ? ` · line ${comment.lineNumber}` : ""}</p> : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Revision history</p>
                  <p className="mt-1 text-xs text-zinc-500">Track every resubmission and review update</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {review.revisions.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/50 p-4 text-sm text-zinc-400">Your original submission is attached to this review.</div>
                ) : (
                  review.revisions.map((revision) => (
                    <div key={revision.id} className="rounded-2xl border border-white/10 bg-black/50 p-4">
                      <div className="flex items-center justify-between gap-2 text-sm text-white">
                        <span>Revision {revision.revisionNumber}</span>
                        <span className="text-xs text-zinc-400">{revision.status}</span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-300">{revision.summary ?? "No summary provided."}</p>
                      {revision.deploymentUrl ? (
                        <a href={revision.deploymentUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs text-cyan-300 hover:text-cyan-200">
                          <ExternalLink size={12} /> View revision deployment
                        </a>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Checklist</p>
                  <p className="mt-1 text-xs text-zinc-500">Complete these review goals</p>
                </div>
                <span className="text-xs text-zinc-400">{completedChecklist}/{review.checklist.length}</span>
              </div>
              <div className="mt-4 space-y-2">
                {review.checklist.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/10 bg-black/50 p-3 text-sm text-zinc-200">
                    <div className="flex items-center gap-2">
                      <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full border", item.checked ? "border-emerald-300 bg-emerald-300 text-black" : "border-white/10 text-zinc-400")}>
                        {item.checked ? <CheckCircle2 size={14} /> : <span className="text-[10px]">?</span>}
                      </span>
                      <span>{item.title}</span>
                    </div>
                    {item.notes ? <p className="mt-2 text-xs text-zinc-500">{item.notes}</p> : null}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">Notifications</p>
                  <p className="mt-1 text-xs text-zinc-500">Latest review events</p>
                </div>
                <span className="text-xs text-zinc-400">{review.notifications.length}</span>
              </div>
              <div className="mt-4 space-y-2">
                {review.notifications.slice(0, 4).map((note) => (
                  <div key={note.id} className="rounded-2xl border border-white/10 bg-black/50 p-3 text-sm text-zinc-200">
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <span>{note.type}</span>
                      <span>· {formatDate(note.createdAt)}</span>
                    </div>
                    <p className="mt-2">{note.message}</p>
                  </div>
                ))}
                {review.notifications.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-black/50 p-4 text-sm text-zinc-500">No review notifications yet.</div>
                ) : null}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
