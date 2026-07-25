"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Rocket,
  Play,
  Send,
  PanelLeft,
  Terminal,
  Bot,
  Circle,
  LogOut,
  Lock,
  CheckCircle2,
  Settings,
} from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
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

export function IdeTopBar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const projectName = useIdeStore((s) => s.projectName);
  const files = useIdeStore((s) => s.files);
  const isDirty = useIdeStore((s) => s.isDirty);
  const lastSaved = useIdeStore((s) => s.lastSaved);
  const viewMode = useIdeStore((s) => s.viewMode);
  const workspaceMode = useIdeStore((s) => s.workspaceMode);
  const activeAssignmentId = useIdeStore((s) => s.activeAssignmentId);
  const projectId = useIdeStore((s) => s.projectId);
  const markSaved = useIdeStore((s) => s.markSaved);
  const toggleExplorer = useIdeStore((s) => s.toggleExplorer);
  const toggleAiPanel = useIdeStore((s) => s.toggleAiPanel);
  const toggleTerminal = useIdeStore((s) => s.toggleTerminal);
  const openPreview = useIdeStore((s) => s.openPreview);
  const refreshPreview = useIdeStore((s) => s.refreshPreview);
  const addTerminalLog = useIdeStore((s) => s.addTerminalLog);
  const loadProject = useIdeStore((s) => s.loadProject);
  const submitAssignment = useAssignmentStore((s) => s.submitAssignment);
  const saveSnapshot = useProjectStore((s) => s.saveSnapshot);
  const getStudentAssignments = useAssignmentStore((s) => s.getStudentAssignments);
  const isDeployModalOpen = useIdeStore((s) => s.isDeployModalOpen);
  const openDeployModal = useIdeStore((s) => s.openDeployModal);
  const closeDeployModal = useIdeStore((s) => s.closeDeployModal);
  const createFromSubmission = usePortfolioStore((s) => s.createFromSubmission);
  const activeClassId = useAssignmentStore((s) => s.activeClassId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sealedToast, setSealedToast] = useState<{ hash: string } | null>(null);

  const isSubmittedView = workspaceMode === "submitted";
  const assignment = user && activeAssignmentId
    ? getStudentAssignments(user.matricNumber).find((a) => a.id === activeAssignmentId)
    : null;
  const alreadySubmitted =
    assignment?.enrollment?.status === "SUBMITTED" ||
    assignment?.enrollment?.status === "GRADED";

  const handleSave = () => {
    if (isSubmittedView) return;
    markSaved();
    if (user && activeAssignmentId) {
      saveSnapshot(user.matricNumber, activeAssignmentId, projectName, files);
    }
    addTerminalLog("Project saved successfully.");
  };

  const handleRun = () => {
    if (viewMode === "preview") {
      refreshPreview();
      addTerminalLog("Preview refreshed.");
    } else {
      openPreview();
      addTerminalLog("Launching full preview…");
    }
  };

  const handleSubmit = async () => {
    if (!user || !activeAssignmentId || isSubmittedView || alreadySubmitted) return;

    setIsSubmitting(true);
    addTerminalLog("Saving submission snapshot...");
    saveSnapshot(user.matricNumber, activeAssignmentId, projectName, files, {
      submitted: true,
    });

    addTerminalLog("Submitting for AI grading...");
    await new Promise((r) => setTimeout(r, 1200));

    let score: number | undefined;
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

    const snapshot = saveSnapshot(user.matricNumber, activeAssignmentId, projectName, files, {
      submitted: true,
      score,
      deployUrl: useIdeStore.getState().deployment.url,
    });

    submitAssignment(
      activeAssignmentId,
      user.matricNumber,
      score,
      snapshot.deployUrl
    );

    const artifact = await createFromSubmission({
      studentMatric: user.matricNumber,
      assignmentId: activeAssignmentId,
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

    loadProject(projectName, files, activeAssignmentId, {
      mode: "submitted",
      submission: {
        submittedAt: snapshot.submittedAt ?? new Date().toISOString(),
        score,
        deployUrl: snapshot.deployUrl,
        assignmentTitle: assignment?.title,
      },
    });

    addTerminalLog(
      score != null ? `Submitted! Score: ${score}/100` : "Submitted! Awaiting lecturer review."
    );
    setIsSubmitting(false);
  };

  return (
    <>
      <header className="flex flex-col gap-3 px-4 py-3 border-b border-white/6 bg-[#0a0a0f] shrink-0 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3 min-w-0">
          <Logo size="sm" showText={false} />
          <div className="min-w-0">
            <span className="text-sm font-medium text-zinc-200 truncate max-w-[220px] block">
              {projectName}
            </span>
            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
              {isSubmittedView ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/25 flex items-center gap-1 shrink-0">
                  <Lock size={10} /> Submitted · View only
                </span>
              ) : activeAssignmentId ? (
                <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 shrink-0">
                  Assignment
                </span>
              ) : null}
              {!isSubmittedView ? (
                <>
                  <Circle
                    size={6}
                    className={cn("fill-current shrink-0", isDirty ? "text-amber-400" : "text-emerald-400")}
                  />
                  <span className="text-xs text-zinc-600 hidden sm:inline">
                    {lastSaved ? `Saved ${formatRelativeTime(lastSaved)}` : "Unsaved"}
                  </span>
                </>
              ) : (
                <span className="text-xs text-emerald-500/80 hidden sm:inline-flex items-center gap-1">
                  <CheckCircle2 size={12} /> Locked snapshot
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:items-center sm:gap-1 sm:w-auto">
          {!isSubmittedView && viewMode === "code" ? (
            <>
              <Button variant="secondary" size="md" onClick={toggleExplorer} className="flex-1 min-w-[110px] justify-center">
                <PanelLeft size={16} />
                <span className="text-[11px]">Explorer</span>
              </Button>
              <Button variant="secondary" size="md" onClick={toggleTerminal} className="flex-1 min-w-[110px] justify-center">
                <Terminal size={16} />
                <span className="text-[11px]">Terminal</span>
              </Button>
              <Button variant="secondary" size="md" onClick={toggleAiPanel} className="flex-1 min-w-[110px] justify-center">
                <Bot size={16} />
                <span className="text-[11px]">AI Mentor</span>
              </Button>
            </>
          ) : null}
          <div className="w-full border-t border-white/10 my-2 sm:hidden" />
          <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start w-full sm:w-auto">
            {!isSubmittedView ? (
              <Button variant="secondary" size="md" onClick={handleSave} className="flex-1 min-w-[100px] justify-center sm:flex-none">
                Save
              </Button>
            ) : null}
            <Button
              variant="primary"
              size="md"
              onClick={handleRun}
              className={cn("flex-1 min-w-[100px] justify-center sm:flex-none", viewMode === "preview" && "shadow-lg shadow-cyan-500/20")}
            >
              <Play size={14} />
              <span>{viewMode === "preview" ? "Refresh" : "Run"}</span>
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={openDeployModal}
              className={cn("flex-1 min-w-[100px] justify-center sm:flex-none", isSubmittedView && "shadow-lg shadow-violet-500/15")}
            >
              <Rocket size={14} />
              <span>{isSubmittedView ? "Redeploy" : "Deploy"}</span>
            </Button>
            {!isSubmittedView && !alreadySubmitted && activeAssignmentId ? (
              <Button variant="success" size="md" onClick={handleSubmit} isLoading={isSubmitting} className="flex-1 min-w-[100px] justify-center sm:flex-none">
                <Send size={14} />
                <span>Submit</span>
              </Button>
            ) : null}
          </div>
          <p className="text-[11px] text-zinc-500 px-1 sm:hidden">Run for preview, Deploy to publish, Submit when ready.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {user ? (
            <Link
              href="/workspace/settings"
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-white/5 transition-colors"
              title="Settings"
            >
              <UserAvatar
                name={`${user.firstName} ${user.lastName}`}
                initials={`${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`}
                avatarUrl={user.avatarUrl}
                size="sm"
              />
              <span className="hidden sm:inline text-sm text-zinc-400">
                {user.firstName}
              </span>
            </Link>
          ) : null}
        </div>
      </header>

      {workspaceMode !== "submitted" ? (
        <LiveDeployStrip onRedeploy={openDeployModal} />
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
