"use client";

import { useEffect, Component, ErrorInfo, ReactNode } from "react";
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
import { PortfolioIdentityStrip } from "@/components/portfolio/portfolio-identity-strip";
import { useAuthStore } from "@/store/auth-store";
import { useIdeStore, getWorkspaceSnapshotHash } from "@/store/ide-store";
import { useProjectStore } from "@/store/project-store";
import { normalizeMatric } from "@/lib/matric";

class WorkspaceErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error | null }
> {
  state: { hasError: boolean; error?: Error | null } = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Workspace] runtime error", { error, info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#050508] text-white">
          <div className="max-w-xl rounded-3xl border border-red-400/20 bg-black/80 p-8 text-center shadow-xl shadow-red-500/10">
            <h1 className="text-2xl font-semibold text-red-300 mb-3">Workspace failed to load</h1>
            <p className="text-sm text-zinc-300 mb-4">
              An unexpected error occurred while loading your workspace. Please reload the page or contact support if the issue persists.
            </p>
            <pre className="text-xs text-zinc-400 bg-white/5 p-3 rounded-xl overflow-x-auto text-left">
              {this.state.error?.message}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function WorkspacePage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const viewMode = useIdeStore((s) => s.viewMode);
  const files = useIdeStore((s) => s.files);
  const folders = useIdeStore((s) => s.folders);
  const activeFilePath = useIdeStore((s) => s.activeFilePath);
  const previewDevice = useIdeStore((s) => s.previewDevice);
  const projectName = useIdeStore((s) => s.projectName);
  const workspaceMode = useIdeStore((s) => s.workspaceMode);
  const isDirty = useIdeStore((s) => s.isDirty);
  const activeAssignmentId = useIdeStore((s) => s.activeAssignmentId);
  const refreshPreview = useIdeStore((s) => s.refreshPreview);

  useEffect(() => {
    console.info("[Workspace] load", {
      isAuthenticated,
      role: user?.role,
      matric: user?.matricNumber,
      mustChangePassword: user?.mustChangePassword,
    });

    if (!isAuthenticated || user?.role !== "STUDENT") {
      router.replace("/");
      return;
    }
    if (user.mustChangePassword) {
      router.replace("/workspace/change-password");
    }
  }, [isAuthenticated, user, router]);

  const getRecoveryKey = (matric: string, assignmentId: string) =>
    `ula-workspace-recovery:${normalizeMatric(matric)}:${assignmentId}`;

  const saveRecoveryToStorage = () => {
    if (typeof window === "undefined") return;
    if (!user?.matricNumber || !activeAssignmentId) return;
    const recoveryKey = getRecoveryKey(user.matricNumber, activeAssignmentId);
    const hash = getWorkspaceSnapshotHash(projectName, files, activeAssignmentId);
    const recovery = {
      projectName,
      files,
      folders,
      activeFilePath,
      viewMode,
      previewDevice,
      assignmentId: activeAssignmentId,
      hash,
      savedAt: new Date().toISOString(),
    };

    try {
      if (!isDirty) {
        window.localStorage.removeItem(recoveryKey);
        return;
      }
      window.localStorage.setItem(recoveryKey, JSON.stringify(recovery));
    } catch (error) {
      console.warn("[Workspace] failed to persist recovery snapshot", error);
    }
  };

  useEffect(() => {
    saveRecoveryToStorage();
  }, [projectName, files, folders, activeFilePath, viewMode, previewDevice, activeAssignmentId, isDirty, user?.matricNumber]);

  useEffect(() => {
    if (typeof window === "undefined" || !user?.matricNumber || !activeAssignmentId) return;
    const recoveryKey = getRecoveryKey(user.matricNumber, activeAssignmentId);
    try {
      const raw = window.localStorage.getItem(recoveryKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        projectName: string;
        files: typeof files;
        folders: string[];
        activeFilePath: string;
        viewMode: "code" | "preview";
        previewDevice: "desktop" | "tablet" | "mobile";
        assignmentId: string;
        hash: string;
      };
      if (parsed.assignmentId !== activeAssignmentId) return;
      const state = useIdeStore.getState();
      const currentHash = getWorkspaceSnapshotHash(state.projectName, state.files, state.activeAssignmentId);
      if (parsed.hash === state.lastSavedHash || parsed.hash === currentHash) {
        window.localStorage.removeItem(recoveryKey);
        return;
      }
      useIdeStore.getState().restoreWorkspace(parsed);
      console.info("[Workspace] restored unsaved workspace from localStorage", recoveryKey);
    } catch (error) {
      console.warn("[Workspace] failed to restore local recovery", error);
    }
  }, [activeAssignmentId, user?.matricNumber]);

  useEffect(() => {
    const saveWorkspaceSnapshot = () => {
      const state = useIdeStore.getState();
      if (state.workspaceMode !== "edit" || !state.isDirty) return;
      const currentHash = getWorkspaceSnapshotHash(state.projectName, state.files, state.activeAssignmentId);
      if (currentHash === state.lastSavedHash) {
        state.markSaved();
        return;
      }
      const u = useAuthStore.getState().user;
      state.setSaveStatus("saving");

      try {
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
        state.markSaved();
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[Workspace] autosave failed", message);
        state.setSaveStatus("failed", message);
      }
    };

    if (workspaceMode !== "edit" || !isDirty) return;

    const timer = window.setTimeout(saveWorkspaceSnapshot, 1500);
    return () => window.clearTimeout(timer);
  }, [files, folders, projectName, activeAssignmentId, isDirty, workspaceMode, user?.matricNumber]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      const state = useIdeStore.getState();
      if (state.workspaceMode !== "edit" || !state.isDirty) return;
      const u = useAuthStore.getState().user;
      if (typeof window !== "undefined" && u && state.activeAssignmentId) {
        const recoveryKey = getRecoveryKey(u.matricNumber, state.activeAssignmentId);
        try {
          const hash = getWorkspaceSnapshotHash(state.projectName, state.files, state.activeAssignmentId);
          const recovery = {
            projectName: state.projectName,
            files: state.files,
            folders: state.folders,
            activeFilePath: state.activeFilePath,
            viewMode: state.viewMode,
            previewDevice: state.previewDevice,
            assignmentId: state.activeAssignmentId,
            hash,
            savedAt: new Date().toISOString(),
          };
          window.localStorage.setItem(recoveryKey, JSON.stringify(recovery));
        } catch (error) {
          console.warn("[Workspace] failed to persist recovery on unload", error);
        }
      }

      try {
        if (u && state.activeAssignmentId) {
          const currentHash = getWorkspaceSnapshotHash(state.projectName, state.files, state.activeAssignmentId);
          if (currentHash !== state.lastSavedHash) {
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
      } catch (error) {
        console.error("[Workspace] autosave failed on unload", error);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Auto-sync preview while in preview mode
  useEffect(() => {
    if (viewMode !== "preview") return;
    const t = setTimeout(() => refreshPreview(), 500);
    return () => clearTimeout(t);
  }, [files, viewMode, refreshPreview]);

  if (!isAuthenticated || user?.role !== "STUDENT") return null;

  return (
    <WorkspaceErrorBoundary>
      <div className="h-[100dvh] min-h-screen flex flex-col bg-[#050508] overflow-hidden">
      <IdeTopBar />
      <PortfolioIdentityStrip />
      <SubmittedBanner />
      <AssignmentsPanel />

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
    </WorkspaceErrorBoundary>
  );
}
