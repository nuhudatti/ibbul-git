"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Rocket,
  Play,
  Send,
  PanelLeft,
  Terminal,
  Bot,
  Circle,
  Lock,
  CheckCircle2,
  Settings,
  Unlock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { useIdeStore } from "@/store/ide-store";
import { useAuthStore } from "@/store/auth-store";
import { useAssignmentStore } from "@/store/assignment-store";
import { useProjectStore } from "@/store/project-store";
import { usePortfolioStore } from "@/store/portfolio-store";
import { cn, formatRelativeTime } from "@/lib/utils";
import { DeployModal } from "./deploy-modal";
import { LiveDeployStrip } from "./live-deploy-strip";
import { SubmissionSealedToast } from "@/components/portfolio/submission-sealed-toast";
import { getStudentSubmissionLifecycle } from "@/lib/student-submission-lifecycle";

type ReviewRecord = {
  id: string;
  assignmentId: string;
  status: string;
  title?: string;
};

export function IdeTopBar({ currentReview, onReviewUpdated }: { currentReview?: ReviewRecord | null; onReviewUpdated?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const projectName = useIdeStore((s) => s.projectName);
  const files = useIdeStore((s) => s.files);
  const isDirty = useIdeStore((s) => s.isDirty);
  const lastSaved = useIdeStore((s) => s.lastSaved);
  const saveStatus = useIdeStore((s) => s.saveStatus);
  const saveError = useIdeStore((s) => s.saveError);
  const viewMode = useIdeStore((s) => s.viewMode);
  const workspaceMode = useIdeStore((s) => s.workspaceMode);
  const activeAssignmentId = useIdeStore((s) => s.activeAssignmentId);
  const revisionEditUnlocked = useIdeStore((s) => s.revisionEditUnlocked);
  const revisionSessionAssignmentId = useIdeStore((s) => s.revisionSessionAssignmentId);
  const projectId = useIdeStore((s) => s.projectId);
  const toggleExplorer = useIdeStore((s) => s.toggleExplorer);
  const toggleAiPanel = useIdeStore((s) => s.toggleAiPanel);
  const toggleTerminal = useIdeStore((s) => s.toggleTerminal);
  const openPreview = useIdeStore((s) => s.openPreview);
  const refreshPreview = useIdeStore((s) => s.refreshPreview);
  const addTerminalLog = useIdeStore((s) => s.addTerminalLog);
  const loadProject = useIdeStore((s) => s.loadProject);
  const submitAssignment = useAssignmentStore((s) => s.submitAssignment);
  const saveSnapshot = useProjectStore((s) => s.saveSnapshot);
  const restoreSnapshot = useProjectStore((s) => s.restoreSnapshot);
  const getStudentAssignments = useAssignmentStore((s) => s.getStudentAssignments);
  const isDeployModalOpen = useIdeStore((s) => s.isDeployModalOpen);
  const openDeployModal = useIdeStore((s) => s.openDeployModal);
  const closeDeployModal = useIdeStore((s) => s.closeDeployModal);
  const createFromSubmission = usePortfolioStore((s) => s.createFromSubmission);
  const activeClassId = useAssignmentStore((s) => s.activeClassId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sealedToast, setSealedToast] = useState<{ hash: string } | null>(null);
  const [showSaveToast, setShowSaveToast] = useState(false);
  const initialToast = useRef(true);

  const assignmentReview =
    activeAssignmentId && currentReview?.assignmentId === activeAssignmentId
      ? currentReview
      : null;
  const isChangesRequestedForActive =
    assignmentReview?.status === "CHANGES_REQUESTED" &&
    activeAssignmentId === assignmentReview.assignmentId;
  const isRevisionEditingActive =
    revisionEditUnlocked &&
    Boolean(revisionSessionAssignmentId) &&
    revisionSessionAssignmentId === activeAssignmentId;
  const isSubmittedView = workspaceMode === "submitted" && !isRevisionEditingActive;
  const assignment =
    user && activeAssignmentId
      ? getStudentAssignments(user.matricNumber).find((a) => a.id === activeAssignmentId)
      : null;
  const alreadySubmitted =
    assignment?.enrollment?.status === "SUBMITTED" ||
    assignment?.enrollment?.status === "GRADED";
  const submitAssignmentId = activeAssignmentId;
  const lifecycleState = getStudentSubmissionLifecycle({
    enrollmentStatus: assignment?.enrollment?.status,
    reviewStatus: assignmentReview?.status,
    isRevisionEditingActive,
    context: "ide",
  });
  const canSubmit = submitAssignmentId && lifecycleState.canSubmit;
  const submitLabel = lifecycleState.primaryButton;
  const showResumeEditing = lifecycleState.state === "CHANGES_REQUESTED" && !isRevisionEditingActive;
  const handleResumeEditing = async () => {
    if (!user || !activeAssignmentId) return;
    const title = assignment?.title ?? assignmentReview?.title ?? projectName;

    console.log("BUTTON CLICKED (top bar resume)", {
      matric: user.matricNumber,
      assignmentId: activeAssignmentId,
      title,
    });
    await restoreSnapshot(user.matricNumber, activeAssignmentId, title);
    const state = useIdeStore.getState();
    console.log("[IdeTopBar] restoreSnapshot completed", {
      workspaceMode: state.workspaceMode,
      viewMode: state.viewMode,
      activeFilePath: state.activeFilePath,
      filesCount: state.files.length,
      readOnly: state.isReadOnly(),
      revisionSessionAssignmentId: state.revisionSessionAssignmentId,
    });
    document.getElementById("workspace-ide")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  useEffect(() => {
    if (initialToast.current) {
      initialToast.current = false;
      return;
    }

    if (saveStatus === "saved" || saveStatus === "failed") {
      setShowSaveToast(true);
      const timeout = window.setTimeout(() => setShowSaveToast(false), 2600);
      return () => window.clearTimeout(timeout);
    }
  }, [saveStatus]);

  const handleRun = async () => {
    if (viewMode === "preview") {
      refreshPreview();
      addTerminalLog("Preview refreshed.");
      return;
    }

    openPreview();
    addTerminalLog("Launching full preview…");

    if (!user || !activeAssignmentId) return;

    try {
      const res = await fetch("/api/project-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricNumber: user.matricNumber,
          assignmentId: submitAssignmentId,
          projectName,
          files,
        }),
      });

      if (res.ok) {
        addTerminalLog("Preview snapshot persisted to the database.");
      } else {
        addTerminalLog("Preview could not be saved to the database.");
      }
    } catch (error) {
      addTerminalLog("Preview save failed — continuing with local runtime.");
    }
  };

  const handleSubmit = async () => {
    if (!user || !submitAssignmentId || isSubmittedView || !canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    addTerminalLog(isChangesRequestedForActive && isRevisionEditingActive ? "Saving revision snapshot..." : "Saving submission snapshot...");
    saveSnapshot(user.matricNumber, submitAssignmentId, projectName, files, {
      submitted: true,
    });

    if (!isChangesRequestedForActive || !isRevisionEditingActive) {
      addTerminalLog("Submitting for AI grading...");
      await new Promise((r) => setTimeout(r, 1200));
    }

    let submissionSaved = false;
    try {
      const res = await fetch("/api/project-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matricNumber: user.matricNumber,
          assignmentId: submitAssignmentId,
          projectName,
          files,
          submitted: true,
          deployUrl: useIdeStore.getState().deployment.url,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        addTerminalLog(
          isChangesRequestedForActive && isRevisionEditingActive
            ? `Revision snapshot failed: ${errorText || res.status}`
            : `Submission snapshot failed: ${errorText || res.status}`
        );
        setIsSubmitting(false);
        return;
      }

      submissionSaved = true;
      addTerminalLog(
        isChangesRequestedForActive && isRevisionEditingActive
          ? "Revision snapshot persisted to the database."
          : "Submission snapshot persisted to the database."
      );
    } catch (error) {
      addTerminalLog(
        isChangesRequestedForActive && isRevisionEditingActive
          ? "Failed to persist revision snapshot."
          : "Failed to persist submission snapshot."
      );
      setIsSubmitting(false);
      return;
    }

    if (!submissionSaved) {
      setIsSubmitting(false);
      return;
    }

    let score: number | undefined;
    if (!isChangesRequestedForActive || !isRevisionEditingActive) {
      try {
        const res = await fetch("/api/grading/evaluate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            files,
            rubric: { maxScore: assignment?.maxScore ?? 100 },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          score = data.score;
        }
      } catch {
        /* grading optional for MVP */
      }
    }

    const snapshot = saveSnapshot(user.matricNumber, submitAssignmentId, projectName, files, {
      submitted: true,
      score,
      deployUrl: useIdeStore.getState().deployment.url,
    });

    if (!isChangesRequestedForActive || !isRevisionEditingActive) {
      submitAssignment(
        submitAssignmentId,
        user.matricNumber,
        score,
        snapshot.deployUrl
      );

      const artifact = await createFromSubmission({
        studentMatric: user.matricNumber,
        assignmentId: submitAssignmentId,
        courseId: activeClassId,
        courseName: "Web Development",
        title: assignment?.title ?? projectName,
        description: assignment?.description,
        score: score ?? null,
        maxScore: assignment?.maxScore ?? 100,
        deployUrl: snapshot.deployUrl,
      });

      setSealedToast({ hash: artifact.hash });
      addTerminalLog("Portfolio artifact sealed · added to your verified identity.");
    }

    loadProject(projectName, files, submitAssignmentId, {
      mode: "submitted",
      revisionUnlocked: false,
      submission: {
        submittedAt: snapshot.submittedAt ?? new Date().toISOString(),
        score,
        deployUrl: snapshot.deployUrl,
        assignmentTitle: assignment?.title,
      },
    });

    addTerminalLog(
      isChangesRequestedForActive && isRevisionEditingActive
        ? "Revision submitted for review."
        : score != null
        ? `Submitted! Score: ${score}/100`
        : "Submitted! Awaiting lecturer review."
    );
    if (isChangesRequestedForActive && isRevisionEditingActive) {
      await onReviewUpdated?.();
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <header className="flex flex-col gap-3 px-4 py-3 border-b border-white/6 bg-[#0a0a0f] shrink-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3 min-w-0">
          <Logo size="sm" showText={false} />
          <div className="min-w-0">
            <span className="text-sm font-medium text-zinc-200 truncate max-w-55 block">
              {projectName}
            </span>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                  {isSubmittedView ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/25 flex items-center gap-1 shrink-0">
                  <Lock size={10} /> Snapshot view
                </span>
              ) : activeAssignmentId ? (
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 shrink-0">
                  Assignment
                </span>
              ) : null}
              {isRevisionEditingActive ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200 shrink-0">
                  <Unlock size={10} /> Resume editing
                </span>
              ) : null}
              {!isSubmittedView ? (
                <>
                  <Circle
                    size={6}
                    className={cn("fill-current shrink-0", isDirty ? "text-amber-400" : "text-emerald-400")}
                  />
                  {(() => {
                    const statusText =
                      saveStatus === "saving"
                        ? "Saving..."
                        : saveStatus === "failed"
                        ? saveError
                          ? `Save failed: ${saveError}`
                          : "Save failed"
                        : isDirty
                        ? lastSaved
                          ? `Last saved ${formatRelativeTime(lastSaved)}`
                          : "Unsaved changes"
                        : lastSaved
                        ? `Last saved ${formatRelativeTime(lastSaved)}`
                        : "";
                    return statusText ? (
                      <span
                        className={cn(
                          "text-xs",
                          saveStatus === "failed" ? "text-rose-300" : "text-zinc-600"
                        )}
                      >
                        {statusText}
                      </span>
                    ) : null;
                  })()}
                </>
              ) : (
                <span className="text-xs text-emerald-500/80 hidden sm:inline-flex items-center gap-1">
                  <CheckCircle2 size={12} /> Locked snapshot
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          {!isSubmittedView && viewMode === "code" ? (
            <div className="hidden sm:grid w-full grid-cols-3 gap-2">
              <Button variant="secondary" size="md" onClick={toggleExplorer} className="w-full justify-center">
                <PanelLeft size={16} />
                <span className="text-[11px]">Explorer</span>
              </Button>
              <Button variant="secondary" size="md" onClick={toggleTerminal} className="w-full justify-center">
                <Terminal size={16} />
                <span className="text-[11px]">Terminal</span>
              </Button>
              <Button variant="secondary" size="md" onClick={toggleAiPanel} className="w-full justify-center">
                <Bot size={16} />
                <span className="text-[11px]">AI Mentor</span>
              </Button>
            </div>
          ) : null}

          {!isSubmittedView && viewMode === "code" ? (
            <div className="flex sm:hidden items-center justify-between gap-2 overflow-x-auto px-1">
              <Button variant="secondary" size="sm" onClick={toggleExplorer} className="flex-1 min-w-0 justify-center">
                <PanelLeft size={14} />
                <span className="text-[10px]">Explorer</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={toggleTerminal} className="flex-1 min-w-0 justify-center">
                <Terminal size={14} />
                <span className="text-[10px]">Terminal</span>
              </Button>
              <Button variant="secondary" size="sm" onClick={toggleAiPanel} className="flex-1 min-w-0 justify-center">
                <Bot size={14} />
                <span className="text-[10px]">AI</span>
              </Button>
            </div>
          ) : null}

          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={handleRun}
              className={cn("w-full sm:w-auto justify-center", viewMode === "preview" && "shadow-lg shadow-cyan-500/20")}
            >
              <Play size={14} />
              <span>{viewMode === "preview" ? "Refresh" : "Run"}</span>
            </Button>
            {showResumeEditing ? (
              <Button
                variant="secondary"
                size="md"
                onClick={handleResumeEditing}
                className="w-full sm:w-auto justify-center border-cyan-400/30 bg-cyan-400/10 text-cyan-100 shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_10px_30px_rgba(34,211,238,0.12)]"
              >
                <Unlock size={14} />
                <span>Open full project</span>
              </Button>
            ) : null}
            <Button
              variant="primary"
              size="md"
              onClick={openDeployModal}
              className={cn("w-full sm:w-auto justify-center", isSubmittedView && "shadow-lg shadow-violet-500/15")}
            >
              <Rocket size={14} />
              <span>{isSubmittedView ? "Redeploy" : "Deploy"}</span>
            </Button>
            {!isSubmittedView && canSubmit ? (
              <Button variant="success" size="md" onClick={handleSubmit} isLoading={isSubmitting} className="w-full sm:w-auto justify-center">
                <Send size={14} />
                <span>{submitLabel}</span>
              </Button>
            ) : null}
          </div>

          <p className="text-[11px] text-zinc-500 px-1 sm:hidden">Run for preview, Deploy to publish, Submit when ready.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {user ? (
            <Link
              href="/workspace/settings"
              className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-cyan-300 hover:bg-white/5 transition-colors"
              title="Settings"
            >
              <Settings size={14} />
              <span className="hidden sm:inline">Settings</span>
            </Link>
          ) : null}
        </div>
      </header>

      {workspaceMode !== "submitted" ? (
        <LiveDeployStrip onRedeploy={openDeployModal} />
      ) : null}

      {showSaveToast ? (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 px-3 py-2 rounded-2xl border border-white/10 bg-black/90 text-sm text-zinc-100 shadow-2xl shadow-black/40 backdrop-blur-md sm:hidden">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "font-medium",
                saveStatus === "saving"
                  ? "text-cyan-300"
                  : saveStatus === "failed"
                  ? "text-rose-300"
                  : "text-emerald-300"
              )}
            >
              {saveStatus === "saving"
                ? "Saving…"
                : saveStatus === "failed"
                ? saveError || "Save failed"
                : "Saved"}
            </span>
            <span className="text-xs text-zinc-400">
              {saveStatus === "saved" && lastSaved ? formatRelativeTime(lastSaved) : ""}
            </span>
          </div>
        </div>
      ) : null}

      <DeployModal open={isDeployModalOpen} onClose={closeDeployModal} />
      {user ? (
        <SubmissionSealedToast
          show={!!sealedToast}
          matric={user.matricNumber}
          hash={sealedToast?.hash ?? ""}
          onClose={() => setSealedToast(null)}
        />
      ) : null}
    </>
  );
}
