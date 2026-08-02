"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { FileExplorer } from "@/components/ide/file-explorer";
import { CodeEditor } from "@/components/ide/code-editor";
import { PreviewStage } from "@/components/ide/preview-stage";
import { ViewModeTabs } from "@/components/ide/view-mode-tabs";
import { AiPanel } from "@/components/ide/ai-panel";
import { TerminalPanel } from "@/components/ide/terminal-panel";
import { IdeTopBar } from "@/components/ide/ide-top-bar";
import { SubmittedBanner } from "@/components/student/submitted-banner";
import { AssignmentsPanel } from "@/components/student/assignments-panel";
import { StudentReviewPanel, type ReviewRecord } from "@/components/student/student-review-panel";
import { PortfolioIdentityStrip } from "@/components/portfolio/portfolio-identity-strip";
import { useAuthStore } from "@/store/auth-store";
import { useIdeStore } from "@/store/ide-store";
import { usePortfolioStore } from "@/store/portfolio-store";
import { useAssignmentStore } from "@/store/assignment-store";
import { useProjectStore } from "@/store/project-store";

export default function WorkspacePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const viewMode = useIdeStore((s) => s.viewMode);
  const files = useIdeStore((s) => s.files);
  const refreshPreview = useIdeStore((s) => s.refreshPreview);
  const activeAssignmentId = useIdeStore((s) => s.activeAssignmentId);
  const workspaceMode = useIdeStore((s) => s.workspaceMode);

  const [studentReviews, setStudentReviews] = useState<ReviewRecord[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const loadReviews = useCallback(async () => {
    if (!user || user.role !== "STUDENT") {
      setStudentReviews([]);
      setReviewLoading(false);
      return;
    }

    setReviewLoading(true);
    setReviewError(null);

    try {
      const res = await fetch("/api/reviews/mine");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load reviews");
      }
      const payload = await res.json();
      setStudentReviews(Array.isArray(payload.reviews) ? payload.reviews : []);
    } catch (error) {
      setReviewError((error as Error).message);
      setStudentReviews([]);
    } finally {
      setReviewLoading(false);
    }
  }, [user]);

  const openAssignmentWorkspace = useCallback(
    async (assignmentId: string, title: string) => {
      const state = useIdeStore.getState();
      const matric = user?.matricNumber;
      if (!matric) return;

      let snapshot = useProjectStore.getState().getSnapshot(matric, assignmentId);
      if (!snapshot?.files?.length) {
        try {
          const res = await fetch(
            `/api/project-snapshots?matricNumber=${encodeURIComponent(matric)}&assignmentId=${encodeURIComponent(assignmentId)}`
          );
          if (res.ok) {
            const data = await res.json();
            snapshot = data?.snapshot ?? null;
          }
        } catch {
          // ignore snapshot load failures and fall back to the current editor state
        }
      }

      const fallbackFiles = state.files?.length ? state.files : [];
      const files = snapshot?.files?.length ? snapshot.files : fallbackFiles;
      const resolvedName = snapshot?.projectName ?? title;

      state.loadProject(resolvedName, files, assignmentId, {
        mode: "edit",
        submission: {
          submittedAt: snapshot?.submittedAt ?? state.submissionMeta?.submittedAt ?? new Date().toISOString(),
          score: snapshot?.score ?? state.submissionMeta?.score,
          deployUrl: snapshot?.deployUrl ?? state.submissionMeta?.deployUrl,
          assignmentTitle: title,
        },
      });

      if (!state.isExplorerOpen) state.toggleExplorer();
      if (state.viewMode !== "code") state.setViewMode("code");
      if (files?.length && files[0]?.path) state.setActiveFile(files[0].path);
      state.setDirty(false);
    },
    [user?.matricNumber]
  );

  useEffect(() => {
    // Poll for updates so students see lecturer actions (requests for changes) promptly
    if (!user || user.role !== "STUDENT") return;

    const interval = setInterval(() => {
      void loadReviews();
    }, 10000);

    const onFocus = () => void loadReviews();
    const onVisibility = () => {
      if (document.visibilityState === "visible") void loadReviews();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user, loadReviews]);

  const currentReview = useMemo(
    () => studentReviews.find((review) => review.assignmentId === activeAssignmentId) ?? null,
    [studentReviews, activeAssignmentId]
  );

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    if (currentReview?.status !== "CHANGES_REQUESTED" || !activeAssignmentId) return;

    if (workspaceMode !== "edit" || files.length === 0) {
      void openAssignmentWorkspace(activeAssignmentId, currentReview.title);
    }
  }, [currentReview, activeAssignmentId, workspaceMode, files.length, openAssignmentWorkspace]);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== "STUDENT") {
      router.replace("/");
      return;
    }
    if (user.mustChangePassword) {
      router.replace("/workspace/change-password");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (user?.role !== "STUDENT") return;
    usePortfolioStore.getState().loadStudentArtifacts(user.matricNumber);
    useAssignmentStore.getState().loadStudentAssignments(user.matricNumber);
  }, [user?.role, user?.matricNumber]);

  useEffect(() => {
    const interval = setInterval(() => {
      const state = useIdeStore.getState();
      if (state.isDirty && state.workspaceMode === "edit") {
        state.markSaved();
        const u = useAuthStore.getState().user;
        if (u && state.activeAssignmentId) {
          useProjectStore
            .getState()
            .saveSnapshot(
              u.matricNumber,
              state.activeAssignmentId,
              state.projectName,
              state.files
            );
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync preview while in preview mode
  useEffect(() => {
    if (viewMode !== "preview") return;
    const t = setTimeout(() => refreshPreview(), 500);
    return () => clearTimeout(t);
  }, [files, viewMode, refreshPreview]);

  if (!isAuthenticated || user?.role !== "STUDENT") return null;

  return (
    <div className="h-[100dvh] min-h-screen flex flex-col bg-[#050508] overflow-auto">
      <IdeTopBar currentReview={currentReview} onReviewUpdated={loadReviews} />
      <PortfolioIdentityStrip />
      <SubmittedBanner />
      {currentReview ? <StudentReviewPanel review={currentReview} /> : null}
      <AssignmentsPanel studentReviews={studentReviews} />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 flex flex-col min-h-0 overflow-hidden"
      >
        <div className="flex-1 flex flex-col min-h-0 lg:flex-row">
          {viewMode === "code" ? <FileExplorer /> : null}

          <main className="flex flex-col min-w-0 flex-1 min-h-0">
            <ViewModeTabs />

            <div className="flex-1 flex flex-col min-h-0 relative">
              <AnimatePresence mode="wait">
                {viewMode === "code" ? (
                  <motion.div
                    key="code"
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.25 }}
                    className="flex-1 min-h-0 flex flex-col"
                  >
                    <CodeEditor />
                  </motion.div>
                ) : (
                  <PreviewStage key="preview" />
                )}
              </AnimatePresence>
            </div>

            {viewMode === "code" ? <TerminalPanel /> : null}
          </main>

          {viewMode === "code" ? <AiPanel /> : null}
        </div>
      </motion.div>
    </div>
  );
}
