"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
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
  const isExplorerOpen = useIdeStore((s) => s.isExplorerOpen);
  const projectName = useIdeStore((s) => s.projectName);

  const [studentReviews, setStudentReviews] = useState<ReviewRecord[]>([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [ideHydrated, setIdeHydrated] = useState(false);

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
      console.log("[Workspace] loadReviews response status", res.status);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Failed to load reviews");
      }
      const payload = await res.json();
      const reviews = Array.isArray(payload.reviews) ? payload.reviews : [];
      console.log("[Workspace] loadReviews payload", reviews);
      setStudentReviews(reviews);
    } catch (error) {
      console.error("[Workspace] loadReviews failed", error);
      setReviewError((error as Error).message);
      setStudentReviews([]);
    } finally {
      setReviewLoading(false);
    }
  }, [user]);

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

  const latestReviewByAssignment = useMemo(() => {
    return studentReviews.reduce<Record<string, ReviewRecord>>((map, review) => {
      const existing = map[review.assignmentId];
      const incomingTimestamp = review.updatedAt ? new Date(review.updatedAt).getTime() : 0;
      const existingTimestamp = existing?.updatedAt ? new Date(existing.updatedAt).getTime() : 0;
      if (!existing || incomingTimestamp >= existingTimestamp) {
        map[review.assignmentId] = review;
      }
      return map;
    }, {});
  }, [studentReviews]);

  const currentReview = useMemo(() => {
    if (!activeAssignmentId) {
      console.log("[Workspace] currentReview computed", { activeAssignmentId, review: null });
      return null;
    }

    const review = latestReviewByAssignment[activeAssignmentId] ?? null;
    const revisionWorkspaceActive =
      workspaceMode === "edit" &&
      useIdeStore.getState().revisionEditUnlocked &&
      useIdeStore.getState().revisionSessionAssignmentId === activeAssignmentId;

    if (revisionWorkspaceActive) {
      console.log("[Workspace] currentReview suppressed while revision workspace is active", {
        activeAssignmentId,
        workspaceMode,
        revisionSessionAssignmentId: useIdeStore.getState().revisionSessionAssignmentId,
      });
      return null;
    }

    console.log("[Workspace] currentReview computed", {
      activeAssignmentId,
      review: review ?? null,
      studentReviewCount: studentReviews.length,
    });
    return review;
  }, [latestReviewByAssignment, activeAssignmentId, workspaceMode, studentReviews.length]);

  const activeChangesRequestedReview = useMemo(() => {
    if (!activeAssignmentId) return null;

    const review = studentReviews.find(
      (item) => item.assignmentId === activeAssignmentId && item.status === "CHANGES_REQUESTED"
    );
    console.log("[Workspace] active changes-requested review", {
      activeAssignmentId,
      review: review ?? null,
    });
    return review ?? null;
  }, [studentReviews, activeAssignmentId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (useIdeStore.persist.hasHydrated()) {
      setIdeHydrated(true);
      return;
    }
    return useIdeStore.persist.onFinishHydration(() => {
      console.log("[Workspace] IDE store hydration finished — resetting auto-unlock guard");
      lastAutoUnlockedAssignment.current = null;
      setIdeHydrated(true);
    });
  }, []);

  const lastAutoUnlockedAssignment = useRef<string | null>(null);

  useEffect(() => {
    if (!ideHydrated || !activeChangesRequestedReview || !user?.matricNumber) return;

    const assignmentId = activeChangesRequestedReview.assignmentId;
    const revisionSessionId = useIdeStore.getState().revisionSessionAssignmentId;
    const needsRestore =
      revisionSessionId !== assignmentId &&
      (activeAssignmentId !== assignmentId ||
        workspaceMode !== "edit" ||
        files.length === 0 ||
        useIdeStore.getState().isReadOnly());

    if (!needsRestore) {
      lastAutoUnlockedAssignment.current = assignmentId;
      return;
    }

    if (lastAutoUnlockedAssignment.current === assignmentId) return;

    console.log("[Workspace] auto-restore revision session for active assignment", {
      ideHydrated,
      assignmentId,
      activeAssignmentId,
      workspaceMode,
      filesCount: files.length,
      readOnly: useIdeStore.getState().isReadOnly(),
    });

    void (async () => {
      try {
        await useProjectStore
          .getState()
          .restoreSnapshot(user.matricNumber, assignmentId, activeChangesRequestedReview.title);
        lastAutoUnlockedAssignment.current = assignmentId;
      } catch (error) {
        console.error("[Workspace] auto-restore failed", error);
        lastAutoUnlockedAssignment.current = null;
      }
    })();
  }, [
    ideHydrated,
    activeChangesRequestedReview,
    user?.matricNumber,
    activeAssignmentId,
    workspaceMode,
    files.length,
  ]);

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
        id="workspace-ide"
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
