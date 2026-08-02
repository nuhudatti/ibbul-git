"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  ChevronRight,
  Clock,
  Play,
  Eye,
  Lock,
  Sparkles,
  X,
  FolderOpen,
  CheckCircle2,
  Trophy,
  ExternalLink,
} from "lucide-react";
import { useAssignmentStore } from "@/store/assignment-store";
import { useProjectStore } from "@/store/project-store";
import { useIdeStore } from "@/store/ide-store";
import { useAuthStore } from "@/store/auth-store";
import { STARTER_FILES, BLANK_STARTER } from "@/lib/mock-data";
import { normalizeMatric } from "@/lib/matric";
import { CopyLinkButton } from "@/components/ui/copy-link-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { EnrollmentStatus } from "@/types";

const STATUS_CONFIG: Record<
  EnrollmentStatus,
  { label: string; color: string; border: string; icon: typeof Play }
> = {
  NOT_STARTED: {
    label: "Not started",
    color: "text-zinc-400 bg-zinc-500/10",
    border: "border-white/6",
    icon: ChevronRight,
  },
  IN_PROGRESS: {
    label: "In progress",
    color: "text-cyan-400 bg-cyan-400/10",
    border: "border-cyan-400/25",
    icon: Play,
  },
  SUBMITTED: {
    label: "Submitted",
    color: "text-amber-400 bg-amber-400/10",
    border: "border-amber-400/25",
    icon: Lock,
  },
  GRADED: {
    label: "Graded",
    color: "text-emerald-400 bg-emerald-400/10",
    border: "border-emerald-400/25",
    icon: Trophy,
  },
};

type Tab = "active" | "submitted";

import type { ReviewRecord } from "@/components/student/student-review-panel";

export function AssignmentsPanel({ studentReviews = [] }: { studentReviews?: ReviewRecord[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("active");
  const user = useAuthStore((s) => s.user);
  const getStudentAssignments = useAssignmentStore((s) => s.getStudentAssignments);
  const startAssignment = useAssignmentStore((s) => s.startAssignment);
  const getSnapshot = useProjectStore((s) => s.getSnapshot);
  const saveSnapshot = useProjectStore((s) => s.saveSnapshot);
  const loadSnapshot = useProjectStore((s) => s.loadSnapshot);
  const loadProject = useIdeStore((s) => s.loadProject);
  const activeAssignmentId = useIdeStore((s) => s.activeAssignmentId);
  const workspaceMode = useIdeStore((s) => s.workspaceMode);

  if (!user) return null;

  const matric = normalizeMatric(user.matricNumber);
  if (!matric) {
    console.error("[Workspace] invalid student matric", user);
    return null;
  }

  useEffect(() => {
    if (!matric) {
      console.error("[Workspace] assignments panel missing student matric", { user });
      return;
    }
    if (typeof window === "undefined") return;
    const key = `ula-projects-hint-${matric}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  }, [matric, user]);

  useEffect(() => {
    if (!matric) return;
    useAssignmentStore.getState().loadStudentAssignments(matric);
  }, [matric]);

  const assignments = getStudentAssignments(matric);
  const activeList = assignments.filter(
    (a) => !a.enrollment || ["NOT_STARTED", "IN_PROGRESS"].includes(a.enrollment.status)
  );
  const submittedList = assignments.filter(
    (a) => a.enrollment && ["SUBMITTED", "GRADED"].includes(a.enrollment.status)
  );
  const pendingCount = activeList.filter(
    (a) => !a.enrollment || a.enrollment.status === "NOT_STARTED"
  ).length;

  const loadServerSnapshot = async (assignmentId: string) => {
    return loadSnapshot(matric, assignmentId);
  };

  const handleStart = async (
    assignmentId: string,
    title: string,
    starterFiles?: (typeof assignments)[0]["starterFiles"]
  ) => {
    startAssignment(assignmentId, matric);
    let snapshot = getSnapshot(matric, assignmentId);

    if (!snapshot?.files?.length) {
      const serverSnapshot = await loadServerSnapshot(assignmentId);
      if (serverSnapshot?.files?.length) {
        snapshot = saveSnapshot(matric, assignmentId, serverSnapshot.projectName, serverSnapshot.files, {
          submitted: serverSnapshot.submittedAt != null,
          deployUrl: serverSnapshot.deployUrl ?? undefined,
          score: serverSnapshot.score ?? undefined,
        });
      }
    }

    const files = snapshot?.files?.length ? snapshot.files : starterFiles?.length ? starterFiles : BLANK_STARTER;
    if (files?.length) {
      loadProject(title, files, assignmentId, {
        mode: "edit",
        submission: null,
      });
    }
    setOpen(false);
  };

  const handleViewSubmitted = async (
    assignmentId: string,
    title: string,
    starterFiles?: (typeof assignments)[0]["starterFiles"],
    enrollment?: (typeof assignments)[0]["enrollment"],
    opts?: { forceEdit?: boolean }
  ) => {
    console.log("[AssignmentsPanel] handleViewSubmitted start", { assignmentId, title, forceEdit: opts?.forceEdit, matric });
    let snapshot = getSnapshot(matric, assignmentId);
    console.log("[AssignmentsPanel] existing snapshot", snapshot);
    if (!snapshot?.files?.length) {
      const serverSnapshot = await loadServerSnapshot(assignmentId);
      console.log("[AssignmentsPanel] serverSnapshot", serverSnapshot);
      if (serverSnapshot?.files?.length) {
        snapshot = saveSnapshot(matric, assignmentId, serverSnapshot.projectName, serverSnapshot.files, {
          submitted: serverSnapshot.submittedAt != null,
          deployUrl: serverSnapshot.deployUrl ?? undefined,
          score: serverSnapshot.score ?? undefined,
        });
        console.log("[AssignmentsPanel] snapshot saved locally", snapshot);
      }
    }

    const deployUrl = snapshot?.deployUrl ?? enrollment?.deployUrl;
    const score = snapshot?.score ?? enrollment?.score;
    const submittedAt =
      snapshot?.submittedAt ?? enrollment?.submittedAt ?? new Date().toISOString();

    let files = snapshot?.files;
    if (!files?.length) {
      files = starterFiles?.length ? starterFiles : BLANK_STARTER;
      snapshot = saveSnapshot(matric, assignmentId, title, files, {
        submitted: true,
        deployUrl,
        score,
      });
    }

    const resolved = snapshot ?? getSnapshot(matric, assignmentId);
    if (!resolved) return;

    const shouldEdit = Boolean(opts?.forceEdit);
    console.log("[AssignmentsPanel] shouldEdit", shouldEdit, { resolvedSnapshot: snapshot });

    if (shouldEdit) {
      await useProjectStore.getState().restoreSnapshot(matric, assignmentId, title);
    } else {
      loadProject(resolved.projectName || title, files, assignmentId, {
        mode: "submitted",
        submission: {
          submittedAt,
          score,
          deployUrl: resolved.deployUrl ?? deployUrl,
          assignmentTitle: title,
        },
      });
    }

    if (shouldEdit) {
      const ideState = useIdeStore.getState();
      if (!ideState.isExplorerOpen) ideState.toggleExplorer();
    }

    setOpen(false);
  };

  const renderCard = (a: (typeof assignments)[0], i: number) => {
    const status = a.enrollment?.status ?? "NOT_STARTED";
    const cfg = STATUS_CONFIG[status];
    const StatusIcon = cfg.icon;
    const isActive = activeAssignmentId === a.id && workspaceMode === "edit";
    const isViewing =
      activeAssignmentId === a.id && workspaceMode === "submitted";
    const snapshot = getSnapshot(matric, a.id);
    const reviewForAssignment = studentReviews.find((r) => r.assignmentId === a.id);
    const needsChanges = reviewForAssignment?.status === "CHANGES_REQUESTED";
    const isSubmitted = status === "SUBMITTED" || status === "GRADED";
    const liveUrl = snapshot?.deployUrl ?? a.enrollment?.deployUrl;

    return (
      <motion.div
        key={a.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.04 }}
        className={cn(
          "group relative p-4 rounded-2xl border transition-all duration-200",
          cfg.border,
          isActive && "ring-1 ring-cyan-400/40 bg-cyan-400/5",
          isViewing && "ring-1 ring-emerald-400/40 bg-emerald-400/5",
          !isActive && !isViewing && "bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/12"
        )}
      >
        {isSubmitted ? (
          <div className="absolute top-3 right-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15">
              <Lock size={12} className="text-emerald-400" />
            </span>
          </div>
        ) : needsChanges ? (
          <div className="absolute top-3 right-3">
            <span className="flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold bg-amber-500/10 border border-amber-400/25 text-amber-300">
              <span>Needs changes</span>
            </span>
          </div>
        ) : null}

        <div className="flex items-start gap-3 pr-8">
          <div
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
              cfg.color
            )}
          >
            <StatusIcon size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-zinc-100">{a.title}</h3>
            <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{a.description}</p>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={cn("text-[10px] px-2 py-0.5 rounded-full font-medium", cfg.color)}>
                {cfg.label}
              </span>
              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                <Clock size={10} /> Due {a.deadline}
              </span>
              {a.enrollment?.score != null ? (
                <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                  <Trophy size={10} /> {a.enrollment.score}/{a.maxScore}
                </span>
              ) : null}
              {liveUrl ? (
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="text-[10px] text-cyan-400 flex items-center gap-1 hover:text-cyan-300"
                >
                  <ExternalLink size={10} /> Live site
                </a>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2">
          {!isSubmitted ? (
            <Button
              size="sm"
              className="flex-1"
              variant={status === "IN_PROGRESS" ? "secondary" : "primary"}
              onClick={() => handleStart(a.id, a.title, a.starterFiles)}
            >
              {status === "IN_PROGRESS" ? (
                <>
                  <Play size={14} /> Continue
                </>
              ) : (
                <>
                  <ChevronRight size={14} /> Start
                </>
              )}
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                className="flex-1"
                variant={needsChanges ? "primary" : isViewing ? "primary" : "secondary"}
                onClick={() =>
                  handleViewSubmitted(a.id, a.title, a.starterFiles, a.enrollment ?? undefined, {
                    forceEdit: needsChanges,
                  })
                }
              >
                <Eye size={14} />
                {needsChanges ? "Open to edit" : isViewing ? "Viewing snapshot" : "View submission"}
              </Button>
                {needsChanges ? (
                  <Button
                    size="sm"
                    className="flex-1"
                    variant="primary"
                    onClick={() => {
                      // Open the submission in edit mode so the student can apply changes
                      const files = snapshot?.files?.length ? snapshot.files : a.starterFiles?.length ? a.starterFiles : [];
                      loadProject(a.title, files, a.id, {
                        mode: "edit",
                        submission: {
                          submittedAt: snapshot?.submittedAt ?? new Date().toISOString(),
                          score: snapshot?.score ?? a.enrollment?.score,
                          deployUrl: snapshot?.deployUrl ?? a.enrollment?.deployUrl,
                          assignmentTitle: a.title,
                        },
                      });
                      setOpen(false);
                    }}
                  >
                    <ChevronRight size={14} /> Make changes
                  </Button>
                ) : null}
              {liveUrl ? (
                <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-cyan-400/5 border border-cyan-400/15">
                  <span className="text-[10px] font-mono text-cyan-300/80 truncate flex-1">
                    {liveUrl.replace(/^https?:\/\//, "")}
                  </span>
                  <CopyLinkButton value={liveUrl} size="sm" label="Copy" />
                </div>
              ) : null}
            </>
          )}
        </div>
      </motion.div>
    );
  };

  const list = tab === "active" ? activeList : submittedList;

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        onClick={() => {
          setOpen(true);
          if (submittedList.length > 0 && activeList.length === 0) setTab("submitted");
        }}
        className={cn(
          "fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full",
          "ula-glass border border-cyan-400/30 shadow-lg shadow-cyan-500/10",
          "hover:border-cyan-400/50 transition-all hover:scale-105",
          open && "opacity-0 pointer-events-none"
        )}
      >
        <BookOpen size={18} className="text-cyan-400" />
        <span className="text-sm font-medium text-zinc-200">My Projects</span>
        {submittedList.length > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400/90 text-[10px] font-bold text-black px-1">
            {submittedList.length}
          </span>
        ) : pendingCount > 0 ? (
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-400 text-[10px] font-bold text-black">
            {pendingCount}
          </span>
        ) : null}
      </motion.button>

      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-md p-4"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 24 }}
              onClick={(e) => e.stopPropagation()}
              className="ula-glass w-full max-w-xl rounded-2xl border border-white/10 overflow-hidden shadow-2xl"
            >
              <div className="px-5 py-4 border-b border-white/6 bg-gradient-to-r from-violet-500/10 to-cyan-400/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-violet-500/20">
                      <FolderOpen size={20} className="text-violet-400" />
                    </div>
                    <div>
                      <h2 className="font-semibold text-white">My Projects</h2>
                      <p className="text-xs text-zinc-500">Assignments & submissions</p>
                    </div>
                  </div>
                  <button onClick={() => setOpen(false)} className="text-zinc-500 hover:text-white p-1">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex gap-1 mt-4 p-1 rounded-xl bg-black/30">
                  {(
                    [
                      { id: "active" as Tab, label: "Active", count: activeList.length },
                      { id: "submitted" as Tab, label: "Submitted", count: submittedList.length },
                    ] as const
                  ).map(({ id, label, count }) => (
                    <button
                      key={id}
                      onClick={() => setTab(id)}
                      className={cn(
                        "flex-1 py-2 rounded-lg text-xs font-medium transition-all",
                        tab === id
                          ? "bg-white/10 text-white shadow-sm"
                          : "text-zinc-500 hover:text-zinc-300"
                      )}
                    >
                      {label}
                      {count > 0 ? (
                        <span className="ml-1.5 text-[10px] opacity-70">({count})</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[55vh] overflow-y-auto ula-scrollbar p-4 space-y-3">
                {list.length === 0 ? (
                  <div className="text-center py-12">
                    <Sparkles size={28} className="mx-auto text-zinc-600 mb-3" />
                    <p className="text-sm text-zinc-500">
                      {tab === "active" ? "No active assignments" : "No submissions yet"}
                    </p>
                  </div>
                ) : (
                  list.map((a, i) => renderCard(a, i))
                )}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
